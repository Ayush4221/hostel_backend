# FCM (Firebase Cloud Messaging) – Complete Documentation

This document is the single reference for push notifications in NIVAS: architecture, data model, APIs, backend and frontend flows, configuration steps, and **what will be added** (implementation checklist).

---

## Table of contents

1. [Overview](#1-overview)
2. [Current implementation vs planned changes](#2-current-implementation-vs-planned-changes)
3. [Architecture](#3-architecture)
4. [Announcement and push schema (current and new)](#4-announcement-and-push-schema-current-and-new)
5. [Enums and constants](#5-enums-and-constants)
6. [Student announcements: hostel-specific](#6-student-announcements-hostel-specific)
7. [Push token storage (data model)](#7-push-token-storage-data-model)
8. [Token API (what to add)](#8-token-api-what-to-add)
9. [FCM send service (what to add)](#9-fcm-send-service-what-to-add)
10. [Bull queue implementation](#10-bull-queue-implementation)
11. [Announcement → FCM flow (with Bull)](#11-announcement--fcm-flow-with-bull)
12. [Edge cases and handling](#12-edge-cases-and-handling)
13. [Idempotency and job IDs](#13-idempotency-and-job-ids)
14. [Frontend / mobile: token registration](#14-frontend--mobile-token-registration)
15. [Backend: who sends (publish)](#15-backend-who-sends-publish)
16. [Steps to configure FCM](#16-steps-to-configure-fcm)
17. [Implementation checklist](#17-implementation-checklist)

---

## 1. Overview

- **Announcements** live in the `Announcement` table. When an admin or staff creates an announcement, the backend can send a **push notification** via **Firebase Cloud Messaging (FCM)** to the chosen audience.
- **Target audience** is an enum (`AnnouncementTargetAudience`). No raw strings.
- **Students** are **hostel-specific**: they only see and get push for announcements that target **their hostel(s)**. Staff/parents are org-scoped.
- **Frontend/mobile** only register and unregister FCM tokens. The **backend** sends (publishes) notifications when an announcement is created.
- **No extra API:** The client does **not** call a separate “send push” or “trigger FCM” endpoint. As soon as an announcement is successfully created (e.g. `POST /api/admin/announcements` or staff/student create), the backend **internally** enqueues a push job; a worker processes it. The create response is returned immediately; FCM is sent asynchronously via the queue.

---

## 2. Current implementation vs planned changes

### 2.1 Current implementation (as of now)

**Schema (current):**

- **`announcements`** table: `id`, `organization_id`, **`hostel_id` (nullable)**, `created_by_user_id`, `title`, `content`, `target_audience`, `created_at`, `updated_at`. `hostel_id = NULL` = org-wide; `hostel_id = 1` (etc.) = that hostel only.
- No `hostel_announcement_mapping` table.
- No `announcement_push_jobs` table; no push job status tracking.
- No `PushToken` table yet (to be added).

**Flow (current):** Create announcement: API saves to DB and returns. No queue; no FCM send implemented yet. Student list uses `AnnouncementDAO.findManyForStudentPaginated(organizationId, hostelIds, ...)` with `hostelId` null or in student's hostel list.

**What exists in code:** `Announcement` model with `hostelId` optional; `AnnouncementDAO`, `AnnouncementService`, admin/staff/student routes and controllers. No Bull queue, no worker, no PushService, no PushToken storage.

### 2.2 Planned changes (to be implemented)

**Schema:** Remove `hostel_id` from `announcements`. Add `hostel_announcement_mapping` with composite PK `(announcement_id, hostel_id)` (0 rows = org-wide; 1+ rows = those hostels). Add `AnnouncementPushJobStatus` enum (PENDING | IN_PROGRESS | SUCCESS | FAILED | CANCELLED). Add `announcement_push_jobs` (announcement_id, bull_job_id, status, started_at, completed_at, last_error, created_at). Add `push_tokens`.

**Flow:** After create: save announcement → insert into `hostel_announcement_mapping` if hostel-specific → enqueue Bull job `jobId: announcement-push-{id}` → insert `announcement_push_jobs` with PENDING → return 201. Worker: load announcement (abort if deleted) → set IN_PROGRESS → resolve audience from mapping table → load tokens → send FCM → set SUCCESS or let Bull retry; on Bull "failed" set FAILED. Student list: filter by mapping (no rows = org-wide; else hostel in student's hostels).

**New components:** Bull queue (Redis), push worker, PushService, PushTokenDAO, audience resolver using mapping table, Bull "failed" listener.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  React Native (mobile)          │          Next.js (web, optional later)     │
│  – Get FCM token               │          – Get FCM token (optional)        │
│  – POST /api/users/me/push-token                                            │
│  – Handle foreground/background/opened                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Express)                               │
│  • POST/DELETE /api/users/me/push-token  →  store/remove token in DB         │
│  • POST /api/admin/announcements (or staff)  →  save announcement           │
│      →  enqueue job (Bull)  →  return 201                                   │
│  • Worker: pick job  →  resolve audience  →  load tokens  →  FCM send       │
│  • PushToken table, PushTokenDAO, PushService (FCMService)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FIREBASE / FCM                                       │
│  • FCM HTTP v1 API (or Admin SDK)  →  Android devices, APNs (iOS)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

- One backend API for web and mobile. No separate “mobile API.”
- Backend uses **Bull (Redis)** for the push job queue and **Firebase Admin SDK** (or FCM HTTP v1) in the worker to send; no Expo in backend.

---

## 4. Announcement and push schema (current and new)

### 4.1 Current schema (as implemented today)

**Table: `announcements`**

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | Int | No | PK, auto-increment |
| organization_id | UUID | No | FK to organizations |
| hostel_id | Int | **Yes** | FK to hostels; NULL = org-wide, non-null = that hostel only |
| created_by_user_id | UUID | Yes | FK to users |
| title | VarChar(255) | No | |
| content | Text | No | |
| target_audience | VarChar(50) | No | |
| created_at | Timestamp | No | |
| updated_at | Timestamp | No | |

No other announcement-related tables. No push job table.

### 4.2 New schema (to be implemented)

**Table: `announcements` (changes):** Remove `hostel_id`. Keep: id, organization_id, created_by_user_id, title, content, target_audience, created_at, updated_at.

**Enum: `AnnouncementPushJobStatus`:** PENDING | IN_PROGRESS | SUCCESS | FAILED | CANCELLED.

**Table: `hostel_announcement_mapping`:** Composite PK `(announcement_id, hostel_id)`; columns: announcement_id, hostel_id, created_at. 0 rows = org-wide; 1+ rows = those hostels only.

**Table: `announcement_push_jobs`:** id, announcement_id, bull_job_id, status, started_at, completed_at, last_error, created_at. Indexes on announcement_id and bull_job_id. One row per Bull push job for logging and debugging.

**Hostel model:** Remove direct announcements relation; add hostelAnnouncementMappings.

---

## 5. Enums and constants

### AnnouncementTargetAudience (backend)

Use an enum; persist as lowercase string in DB. Do not use raw strings in logic.

| Enum value       | DB value         | Who receives (in-app + push)                          |
|------------------|------------------|-------------------------------------------------------|
| `ALL`            | `all`            | Students + Staff + Parents in the org                 |
| `STUDENTS`       | `students`       | Students (hostel-specific when announcement has hostelId) |
| `STAFF`          | `staff`          | Staff (and optionally admin) in the org               |
| `PARENTS`        | `parents`        | Parents in the org                                    |
| `STUDENTS_STAFF` | `students_staff` | Students + Staff                                      |
| `STUDENTS_PARENTS` | `students_parents` | Students + Parents                                 |
| `STAFF_PARENTS`  | `staff_parents` | Staff + Parents                                       |

- **File to add/use:** e.g. `src/utils/constants/announcements.ts` with `AnnouncementTargetAudience` enum and helpers like `isValidTargetAudience`, `normalizeTargetAudience`.
- **Audience sets for filtering:** e.g. `STUDENT_VISIBLE_AUDIENCES`, `STAFF_VISIBLE_AUDIENCES`, `PARENT_VISIBLE_AUDIENCES` (arrays of enum values) for “who can see this announcement.”

---

## 6. Student announcements: hostel-specific

- **In-app list (student):**  
  Return only announcements where:
  - `organizationId` = student’s org (from `UserHostelRoleMapping` or org mapping).
  - `targetAudience` is in student-visible set (e.g. `STUDENTS`, `STUDENTS_STAFF`, `STUDENTS_PARENTS`, `ALL`).
  - **Hostel:** either `hostelId` is null (org-wide) or `hostelId` is in the student’s hostel list from `UserHostelRoleMapping`.

- **FCM push (students):**  
  When resolving user IDs for an announcement that includes students:
  - **Current:** If announcement has `hostelId`, only students in that hostel; if null, all students in org. **After new schema:** If `hostel_announcement_mapping` has rows for this announcement, only students in those hostels; if no rows, all students in org.

---

## 7. Push token storage (data model)

### What to add: Prisma model

```prisma
model PushToken {
  id             Int      @id @default(autoincrement())
  userId         String   @map("user_id") @db.Uuid
  token          String   @unique @db.Text
  platform       String   @db.VarChar(20)   // 'android' | 'ios' | 'web'
  organizationId String?  @map("organization_id") @db.Uuid
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@map("push_tokens")
}
```

- One user can have multiple rows (multiple devices).
- Run migration after adding the model.

---

## 8. Token API (what to add)

### Endpoints

| Method | Path                          | Auth   | Body                    | Description                    |
|--------|-------------------------------|--------|-------------------------|--------------------------------|
| POST   | `/api/users/me/push-token`    | Yes    | `{ token, platform }`   | Upsert token for `req.user._id` |
| DELETE | `/api/users/me/push-token`    | Yes    | `{ token }`             | Remove this token              |

- **Platform:** `android` | `ios` | `web`. Validate and store as-is.
- **Upsert:** if the same `token` exists for another user, either replace userId or reject (product choice). Typical: one token per device, so upsert by token (update userId) or by (userId + platform) and replace token.

### Files to add

- **DAO:** `src/dao/PushTokenDAO.ts`  
  - `upsert(userId, token, platform)`  
  - `deleteByToken(token)`  
  - `findByUserIds(userIds: string[]): Promise<{ userId, token }[]>` (for FCM send)
- **Controller:** `src/controllers/pushToken.controller.ts`  
  - `registerToken(req, res)` → body `{ token, platform }`, call DAO upsert with `req.user._id`  
  - `unregisterToken(req, res)` → body `{ token }`, call DAO delete
- **Routes:**  
  - Mount under a route that uses `authenticateToken` (e.g. user or auth router).  
  - `POST /api/users/me/push-token`, `DELETE /api/users/me/push-token`

---

## 9. FCM send service (what to add)

### Responsibility

- Accept a list of FCM tokens and send one notification (title, body, optional data).
- Use **Firebase Admin SDK** (`firebase-admin`) or **FCM HTTP v1**.
- Batch tokens (e.g. 500 per request for HTTP v1).
- Handle errors (invalid/expired tokens) and optionally return bad tokens so the caller can remove them from DB.

### File to add

- **Service:** `src/services/PushService.ts` (or `FCMService.ts`)

  - **Initialize:**  
    Read `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`; call `firebase-admin.initializeApp({ credential: cert(...) })` once (e.g. in a getter or at app start).
  - **Method:**  
    `sendToTokens(tokens: string[], title: string, body: string, data?: { announcementId?: string }): Promise<{ success: number; failedTokens: string[] }>`  
    - Loop over token batches.  
    - For each batch, call FCM (multicast or sendEach).  
    - Collect failed/invalid tokens from the response.  
    - Return count of successful sends and list of failed tokens.

- **Dependency:**  
  `npm install firebase-admin` in `hostel_backend`.

- **Env:**  
  - `FIREBASE_SERVICE_ACCOUNT_PATH`: path to service account JSON file, or  
  - `FIREBASE_SERVICE_ACCOUNT_JSON`: full JSON string.  
  Do not commit the key; document in `.env.example` with placeholder.

---

## 10. Bull queue implementation

### 10.1 Why Bull (Redis)

- No RabbitMQ: Redis + Bull (or BullMQ) is sufficient for "enqueue push job after create" with retries. You already have Redis.
- One queue (e.g. `announcement-push`); one or more worker processes; job payload: `{ announcementId }`.

### 10.2 Job ID

- When enqueueing after create: use **jobId: `announcement-push-${announcementId}`** so Bull does not enqueue a duplicate for the same announcement. For admin "re-send", use a new jobId (e.g. `announcement-push-${id}-${Date.now()}`).

### 10.3 Status flow (announcement_push_jobs)

1. **On enqueue:** Insert row in `announcement_push_jobs` with `announcement_id`, `bull_job_id` = same as Bull jobId, `status = PENDING`, `created_at`.
2. **When worker starts:** Load announcement; if deleted or already SUCCESS, complete job (no send). Else update row to `status = IN_PROGRESS`, `started_at = now()`.
3. **When all FCM batches succeed:** Update row to `status = SUCCESS`, `completed_at = now()`. Complete job.
4. **When worker skips (e.g. announcement deleted):** Update to `status = CANCELLED`, `completed_at = now()`. Complete job.
5. **When job throws:** Do not set SUCCESS; Bull retries. On **Bull "failed" event** (all retries exhausted): update row to `status = FAILED`, `completed_at = now()`, `last_error = failedReason`.

### 10.4 Worker process

- Consumes from the same queue (e.g. `announcement-push`).
- For each job: load announcement by id; if not found or push_job status already SUCCESS, exit. Set push_job IN_PROGRESS. Resolve audience (using hostel_announcement_mapping when applicable). Load tokens. Call PushService in batches. On full success set SUCCESS; on exception throw so Bull retries. Remove invalid tokens from DB when FCM returns them.

### 10.5 Bull "failed" listener

- Register a global listener for job failure (after all retries). In handler: find `announcement_push_jobs` by `bull_job_id` (from job.id) and set `status = FAILED`, `completed_at = now()`, `last_error = job.failedReason` (or equivalent).

---

## 11. Announcement → FCM flow (with Bull)

After saving a new announcement and (when new schema is in place) inserting into `hostel_announcement_mapping` if hostel-specific:

1. **Enqueue:** Add Bull job with `jobId: announcement-push-{id}`, payload `{ announcementId }`. Insert row in `announcement_push_jobs` with PENDING. Return 201.

**Worker** (when it runs the job):

2. **Resolve user IDs** from: `targetAudience`, `organizationId`, and **hostel(s)** from `hostel_announcement_mapping` (0 rows = org-wide; else only those hostel IDs). Use UserHostelRoleMapping, UserOrgRoleMapping, User role. For students, only include users in the announcement's hostels (or all org students if org-wide).

2. **Load tokens:**  
   Call `PushTokenDAO.findByUserIds(userIds)` (or equivalent) to get all tokens for those users. Optionally filter by `platform`.

3. **Send:**  
   Call `PushService.sendToTokens(tokens, title, body, { announcementId: id })`.  
   Title/body: e.g. announcement title and a short snippet or “New announcement.”

4. **Cleanup (optional):**  
   If `sendToTokens` returns `failedTokens`, delete those from `push_tokens` so they are not used again.

### Internal trigger (no extra API)

- **The client never calls a separate “send push” or “trigger FCM” endpoint.** As soon as an announcement is successfully created, the backend **internally** enqueues the push job and returns 201. The worker processes the job asynchronously.
- Wire enqueue in one place: in `AnnouncementService` after create (createAnnouncement, postGeneralAnnouncement, postStudentAnnouncement). Same queue and worker for all paths.
- Worker uses `PushService` and an “audience resolver” (or reuse existing user/role/hostel logic) so the controller stays thin.

### Audience resolver (what to add)

- **Input:** `targetAudience`, `organizationId`, and **hostel IDs** (from `hostel_announcement_mapping` for this announcement: empty = org-wide; non-empty = only those hostels).  
- **Output:** `userId[]`.  
- Per-audience logic: ALL → all org users (or in given hostels only); STUDENTS → students in org and in those hostels; etc. Use DAOs and enums only.

---

## 12. Edge cases and handling

| Edge case | Handling |
|-----------|----------|
| **Announcement deleted before job runs** | Worker loads announcement by id; if not found, set push_job status CANCELLED (or skip update if row hard-deleted), complete job without sending. |
| **Announcement modified before job runs** | Worker loads **current** announcement from DB at start; use current title/content for FCM. Already-sent batches cannot be changed. |
| **Announcement deleted while job is running** | Optional: before each batch, re-check announcement exists; if deleted, stop sending further batches. Minimum: check once at start. |
| **Worker crashes mid-job** | Bull retries the job. On retry, worker may see IN_PROGRESS from previous run; proceed to send (idempotency: if status SUCCESS, skip). Some users may get duplicate notification on retry unless per-recipient log is added. |
| **FCM returns partial failure (invalid tokens)** | Parse FCM response; remove failed/invalid tokens from `push_tokens`. Continue with remaining batches. Do not fail the job. |
| **FCM rate limit / 429** | Throw so Bull retries with backoff. Throttle batches if needed. |
| **DB down when worker runs** | Throw; Bull retries. |
| **Redis down when create is called** | Cannot enqueue; fail create or degrade (save announcement but no push; optional cron to enqueue later). Prefer failing create and alerting. |
| **Empty audience (no tokens)** | After resolving audience and loading tokens, if token list empty: set push_job SUCCESS and complete job (nothing to send). |
| **Re-send from admin** | Enqueue new job with **new** jobId (e.g. announcement-push-123-{timestamp}). Insert new row in announcement_push_jobs. Worker runs as usual. |
| **Job runs twice (Bull at-least-once)** | If push_job status already SUCCESS at job start, skip send and complete (idempotent). Else run and set SUCCESS when done. |

---

## 13. Idempotency and job IDs

- **Job ID:** Use `jobId: announcement-push-${announcementId}` so only one job per announcement is queued at a time. Re-send uses a different jobId so a new job is created.
- **Idempotency:** At worker start, load the **announcement_push_jobs** row for this job (by bull_job_id). If status is already **SUCCESS**, skip send and complete the job. So a duplicate run (e.g. after crash) does not send again. Optionally for stricter guarantee: per-recipient log (announcement_id, user_id) and skip users already sent; then no duplicate notifications on retry.
- **Failure:** Do not set SUCCESS until all batches succeed. On exception, throw so Bull retries; status remains IN_PROGRESS. Only set FAILED in the Bull "failed" listener after all retries exhausted.

---

## 14. Frontend / mobile: token registration

### Mobile (React Native)

- **Libraries:** `@react-native-firebase/app`, `@react-native-firebase/messaging`.
- **On app start / after login:**  
  - Request notification permission.  
  - Get token: `messaging().getToken()`.  
  - Call `POST /api/users/me/push-token` with `{ token, platform: 'android' | 'ios' }` (use same base URL as rest of app).
- **On logout (or disable notifications):**  
  - Call `DELETE /api/users/me/push-token` with `{ token }`.
- **Token refresh:**  
  - Subscribe to `messaging().onTokenRefresh()` and re-register with backend.
- **Foreground:**  
  - `messaging().onMessage()` – show in-app banner or navigate to announcements.
- **Background / quit:**  
  - `messaging().setBackgroundMessageHandler()` for data handling if needed.  
  - `messaging().onNotificationOpenedApp()` and `getInitialNotification()` to open announcements (and optionally announcement detail using `data.announcementId`).

No Expo dependency; same backend API as web.

### Web (optional, later)

- Use Firebase JS SDK; request permission; get token; `POST /api/users/me/push-token` with `platform: 'web'`.  
- Backend and FCM send flow stay the same; web tokens are just stored and included when sending.

---

## 15. Backend: who sends (publish)

- **Frontend/mobile** do not send notifications. They only register/unregister tokens. They also **do not** call any extra API to “trigger” or “send” push—only the normal create-announcement API (e.g. `POST /api/admin/announcements`, `POST /api/staff/announcements`, or student create).
- **Backend** “publishes” **internally**: when an announcement is successfully created, the backend enqueues a push job (Bull) and returns 201; a worker runs the flow (resolve audience → load tokens → send via FCM). The client receives the create response; no second request is needed.
- There is **no separate “publish notification” or “trigger FCM” endpoint**; **creating the announcement** is the only trigger.

---

## 16. Steps to configure FCM

### 16.1 Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com).
2. Add project (e.g. “NIVAS”); finish wizard.

### 16.2 Android app

1. In project: Add app → Android.  
2. Package name: same as React Native `applicationId` (e.g. `android/app/build.gradle`).  
3. Download `google-services.json` → place in `android/app/google-services.json`.  
4. In `android/build.gradle` (project):  
   `classpath 'com.google.gms:google-services:4.4.0'`  
5. In `android/app/build.gradle` (app), bottom:  
   `apply plugin: 'com.google.gms.google-services'`  
6. Rebuild. FCM is on by default for Android.

### 16.3 iOS app

1. Add app → iOS. Bundle ID = Xcode bundle ID.  
2. Download `GoogleService-Info.plist` → add to Xcode app target.  
3. Firebase Console → Project Settings → Cloud Messaging → Apple: upload **APNs Authentication Key** (.p8 from Apple Developer) and set Key ID, Team ID, Bundle ID.  
4. Xcode: enable **Push Notifications** capability.  
5. Rebuild.

### 16.4 Backend: service account

1. Firebase Console → Project Settings → Service accounts.  
2. Generate new private key (JSON).  
3. Store securely: env `FIREBASE_SERVICE_ACCOUNT_PATH` (file path) or `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON string). Do not commit.  
4. Backend initializes `firebase-admin` with this credential.

### 16.5 Summary

- **Mobile:** Gets FCM token → `POST /api/users/me/push-token`.  
- **Backend:** Saves token; on announcement create, enqueues push job; worker resolves audience, loads tokens, calls Firebase Admin to send.

---

## 17. Implementation checklist

### Backend

- [ ] **Schema:** Add `PushToken`; add `AnnouncementPushJobStatus` enum, `hostel_announcement_mapping` (composite PK), `announcement_push_jobs`; remove `hostel_id` from `announcements`; run migration.
- [ ] Add `PushTokenDAO` (upsert, deleteByToken, findByUserIds).
- [ ] Add `PushService` (or `FCMService`): init Firebase Admin, `sendToTokens`, batching, return failed tokens.
- [ ] Add push token controller and routes: `POST/DELETE /api/users/me/push-token`.
- [ ] Add Bull queue (e.g. `announcement-push`), worker process, and Bull "failed" listener to set `announcement_push_jobs.status = FAILED`.
- [ ] After announcement create: save announcement → write `hostel_announcement_mapping` if hostel-specific → enqueue job with `jobId: announcement-push-{id}` → insert `announcement_push_jobs` PENDING → return 201.
- [ ] Worker: load announcement (abort if deleted); load push_job row, skip if SUCCESS; set IN_PROGRESS; resolve audience from mapping table; load tokens; send FCM; set SUCCESS or throw for retry; cleanup invalid tokens from FCM response.
- [ ] Add audience resolver: `targetAudience` + `organizationId` + hostel IDs from `hostel_announcement_mapping` → `userId[]`.
- [ ] Env: `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`, `REDIS_URL` (already used) in `.env.example`.

### Mobile

- [ ] Add `@react-native-firebase/app`, `@react-native-firebase/messaging`.
- [ ] Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS); configure FCM.
- [ ] On start/login: get token, `POST /api/users/me/push-token`.
- [ ] On logout: `DELETE /api/users/me/push-token`.
- [ ] Handle foreground (`onMessage`), background/opened (`onNotificationOpenedApp`, `getInitialNotification`), token refresh.

### Web (optional)

- [ ] Firebase JS SDK; get token; `POST /api/users/me/push-token` with `platform: 'web'`.

### Documentation

- [ ] Keep this doc as the single FCM reference (architecture, APIs, config, checklist).
- [ ] Point from `notifications-fcm.md` or `firebase-fcm-setup.md` to this doc if you keep those as short pointers.

---

**End of FCM complete documentation.**
