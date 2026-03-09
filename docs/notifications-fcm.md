# Notifications and FCM (Firebase Cloud Messaging)

This document describes the backend design for announcements as notifications, push token storage, audience resolution (including **hostel-specific** behaviour for students), use of **enums** (no raw strings), and how to **configure FCM** to obtain and use Firebase tokens. It also covers the **frontend publish flow** (how clients register tokens and how the backend sends push when an announcement is created).

---

## 1. Overview

- **Announcements** are stored in the `Announcement` table (source of truth). When an admin (or staff) creates an announcement, the backend optionally sends a **push notification** via **Firebase Cloud Messaging (FCM)** to the selected audience so users see a notification on their devices.
- **Target audience** is expressed with an **enum** (`AnnouncementTargetAudience`). No magic strings in code or API.
- **Students** are **hostel-specific**: a student sees and receives push only for announcements that target **their own hostel(s)**. Staff/parents are org-scoped; students are scoped by `hostelId` + `UserHostelRoleMapping`.

---

## 2. Enums (no raw strings)

Define and use the following in backend (and optionally share with frontend):

### AnnouncementTargetAudience

Use a single enum for who receives an announcement (in-app list and FCM push):

| Enum value       | Stored in DB (e.g.) | Who receives (in-app + FCM)                    |
|------------------|---------------------|-------------------------------------------------|
| `ALL`            | `all`               | Students + Staff + Parents in the org          |
| `STUDENTS`       | `students`          | Students in the org (hostel-specific when applicable) |
| `STAFF`          | `staff`             | Staff (and optionally admin) in the org         |
| `PARENTS`        | `parents`           | Parents in the org                              |
| `STUDENTS_STAFF` | `students_staff`    | Students + Staff                                |
| `STUDENTS_PARENTS` | `students_parents` | Students + Parents                            |
| `STAFF_PARENTS`  | `staff_parents`     | Staff + Parents                                 |

- In code, use only the enum (e.g. `AnnouncementTargetAudience.STUDENTS`). Persist to DB using the lowercase string value if desired; validate incoming API payloads against the enum.
- Do **not** use raw strings in business logic or when resolving audience for FCM.

---

## 3. Student announcements: hostel-specific only

- **In-app list (student)**: When a user with role **student** fetches "my announcements," the backend must return only announcements that:
  - Belong to the student's **organization** (`organizationId`).
  - Have a **targetAudience** that includes students (e.g. `STUDENTS`, `STUDENTS_STAFF`, `STUDENTS_PARENTS`, `ALL`).
  - Are **hostel-specific**: the announcement's `hostelId` must match one of the **student's hostels**. The student's hostel(s) come from `UserHostelRoleMapping` (where `userId = current user` and role = student). If an announcement has `hostelId = null` (org-wide), define product policy (e.g. show to all students in org, or hide from student list).
- **FCM push (students)**: When resolving user IDs for an announcement whose audience includes students, use **hostel-specific** resolution: include only users with role `student` who are **in the announcement's hostel** (via `UserHostelRoleMapping` where `hostelId = announcement.hostelId`). If `announcement.hostelId` is null, include all students in the org (or none, per policy).

This ensures students only see and receive notifications for **their own hostel(s)**.

---

## 4. Push token storage

- **Table**: e.g. `push_tokens` with columns: `id`, `userId` (UUID), `token` (text, unique), `platform` (enum: `android` | `ios` | `web`), `organizationId` (optional), `createdAt`, `updatedAt`. One user can have multiple rows (multiple devices).
- **API**:
  - `POST /api/users/me/push-token`: body `{ token, platform }`. Upsert token for the authenticated user (`req.user._id`). Used by frontend after login or app start.
  - `DELETE /api/users/me/push-token`: body `{ token }`. Remove token (e.g. on logout or when user disables notifications).

---

## 5. FCM send flow (backend publish)

When an announcement is **created** (after saving to DB):

1. **Resolve user IDs** from `targetAudience` (enum) + `organizationId` + `hostelId` (from the new announcement):
   - `ALL` → all users in org (students, staff, parents, admin as defined).
   - `STUDENTS` → **hostel-specific**: users with role student in org and in `announcement.hostelId` (from `UserHostelRoleMapping`). If `hostelId` is null, all students in org (or per policy).
   - `STAFF` → users in org with role staff (and optionally admin).
   - `PARENTS` → users in org with role parent.
   - `STUDENTS_STAFF` → union of students (hostel-scoped if `hostelId` set) and staff in org.
   - `STUDENTS_PARENTS` → union of students (hostel-scoped if `hostelId` set) and parents in org.
   - `STAFF_PARENTS` → union of staff and parents in org.

2. **Load push tokens**: From `push_tokens`, all tokens for those `userId`s (optionally filter by `platform`).

3. **Send via FCM**: Call the FCM send service (Firebase Admin SDK or FCM HTTP v1) with: list of tokens, `title` (e.g. announcement title), `body` (short snippet or "New announcement"), `data: { announcementId }`. Batch tokens (e.g. 500 per request).

4. **Token cleanup**: If FCM returns invalid or expired tokens, remove those from `push_tokens`.

---

## 6. Frontend publish flow (how clients and backend interact)

- **Frontend (mobile / web)** does **not** "publish" notifications. It only:
  1. **Registers** the FCM device token with the backend via `POST /api/users/me/push-token` (after login or when the token is obtained/refreshed).
  2. Optionally **unregisters** via `DELETE /api/users/me/push-token` on logout.

- **Backend** is the one that **publishes** (sends) push notifications:
  1. When an admin/staff **creates an announcement** (e.g. `POST /api/admin/announcements` or `POST /api/staff/announcements`), the backend saves the announcement, then runs the FCM send flow (resolve audience → get tokens → send via FCM).
  2. No separate "publish" endpoint is required; creation of the announcement triggers the send.

So: **frontend** = register/unregister token; **backend** = send (publish) when an announcement is created.

---

## 7. Steps to configure FCM for Firebase token

Follow these steps to get FCM working so the app can receive a **Firebase token** and the backend can send push notifications.

### 7.1 Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com).
2. Click **Add project** (or use an existing project). Name it (e.g. "NIVAS").
3. Complete the wizard (Google Analytics optional). Finish.

### 7.2 Add Android app and get FCM token (Android)

1. In the project, click **Add app** → **Android**.
2. **Android package name**: use your React Native app package (e.g. `com.yourapp.hms`). Must match `applicationId` in `android/app/build.gradle`.
3. Register the app. Download **`google-services.json`**.
4. Place `google-services.json` in your RN Android project: e.g. `android/app/google-services.json`.
5. In `android/build.gradle` (project level), add the Google services classpath if not present:
   ```gradle
   dependencies {
     classpath 'com.google.gms:google-services:4.4.0'
   }
   ```
6. In `android/app/build.gradle` (app level), at the bottom, add:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
7. Rebuild the app. FCM is enabled by default for Android. Your app can now call `messaging().getToken()` to get the **FCM token** (after installing React Native Firebase and requesting permission).

### 7.3 Add iOS app and get FCM token (iOS)

1. In Firebase Console, **Add app** → **iOS**.
2. **iOS bundle ID**: use your app bundle ID (e.g. `com.yourapp.hms`). Must match the Xcode project.
3. Register the app. Download **`GoogleService-Info.plist`**.
4. Add `GoogleService-Info.plist` to the iOS project in Xcode (e.g. under the app target).
5. In Firebase Console → Project Settings → **Cloud Messaging**:
   - Under **Apple app configuration**, upload your **APNs Authentication Key** (recommended) or APNs certificate:
     - Create a key in [Apple Developer](https://developer.apple.com/account/resources/authkeys/list) (Key ID, Team ID, Bundle ID, .p8 file). Upload the .p8 and enter Key ID, Team ID, Bundle ID in Firebase.
6. In Xcode: enable **Push Notifications** capability for the app target.
7. Rebuild. Your app can now get the FCM token on iOS (FCM uses APNs under the hood).

### 7.4 Backend: get Firebase service account key (for sending)

1. In Firebase Console → **Project Settings** (gear icon) → **Service accounts**.
2. Click **Generate new private key** (for the Firebase Admin SDK). A JSON file is downloaded.
3. Store this JSON securely (e.g. env variable `FIREBASE_SERVICE_ACCOUNT_JSON` as stringified JSON, or a file path in a secret manager). **Do not commit** the file to the repo.
4. In the backend, use this key to initialize Firebase Admin (e.g. `firebase-admin` with `credential.cert(serviceAccountJson)`). The backend then calls the FCM API to **send** messages to tokens that the frontend registered.

### 7.5 Summary: who gets the token and who sends

- **Frontend (React Native)**: Uses `@react-native-firebase/messaging` to get the **device FCM token** via `messaging().getToken()`. Sends this token to your backend with `POST /api/users/me/push-token`.
- **Backend**: Stores the token in `push_tokens`. When an announcement is created, backend resolves audience (using enums and hostel-specific for students), loads tokens from `push_tokens`, and calls **Firebase Admin SDK** (or FCM HTTP v1) to send the notification to those tokens.

Configuration checklist:

- [ ] Firebase project created.
- [ ] Android app added; `google-services.json` in `android/app/`.
- [ ] Android build.gradle: Google services plugin applied.
- [ ] iOS app added; `GoogleService-Info.plist` in Xcode project.
- [ ] iOS: APNs key (or cert) uploaded in Firebase Cloud Messaging.
- [ ] iOS: Push Notifications capability enabled in Xcode.
- [ ] Backend: Service account key downloaded and stored securely; Firebase Admin initialized with it.
- [ ] Frontend: Token obtained and sent to backend; backend stores it and uses it when sending after announcement create.
