# NIVAS — Frontend Web Plan (Cursor Guide)

This document is the **single authoritative plan** for building the **web frontend** of NIVAS. It defines scope, roles, flows, and feature breakdown for Cursor and developers. **Web only** first; mobile/app flows later.

---

## Table of Contents

1. [Scope & Platform](#1-scope--platform)
2. [Current Roles (Backend)](#2-current-roles-backend)
3. [Roles & Who Can Sign Up / Log In](#3-roles--who-can-sign-up--log-in)
4. [Auth Flows (Signup & Login)](#4-auth-flows-signup--login)
5. [Post-Login: Role-Based Dashboards](#5-post-login-role-based-dashboards)
6. [Org Admin — Features & Flows](#6-org-admin--features--flows)
7. [Hostel Admin — Features & Flows](#7-hostel-admin--features--flows)
8. [Staff — Features & Flows](#8-staff--features--flows)
9. [Business Rules & Constraints](#9-business-rules--constraints)
10. [Backend API Alignment](#10-backend-api-alignment)
11. [Implementation Order & Checklist](#11-implementation-order--checklist)

---

## 1. Scope & Platform

- **Platform:** Web only (responsive web app).
- **Later:** Mobile/app flows (student, parent, etc.) are out of scope for this plan.
- **Roles in scope for web:** Org Admin (backend role `admin`), Hostel Admin (backend role `admin` with hostel context), Staff (backend role `staff`). **Only `admin` and `staff` can log in on the web** (see [Current Roles](#2-current-roles-backend)).

---

## 2. Current Roles (Backend)

The backend `roles` table (see migration `add_roles_table`) has **exactly these five roles**:

| id | code          | name        |
|----|---------------|-------------|
| 0  | `super_admin` | Super Admin |
| 1  | `admin`       | Admin       |
| 2  | `staff`       | Staff       |
| 3  | `student`     | Student     |
| 4  | `parent`      | Parent      |

**Web login:** For this web app, **only users with role `admin` (id 1) or `staff` (id 2) are allowed to log in.**  
- `super_admin` is created via script (e.g. `npm run create-admin`), not via web signup/login.  
- `student` and `parent` do **not** use the web login; they will use a different flow (e.g. mobile/app) later.  
- Frontend must reject or redirect login for `student` and `parent` if they hit the web login (e.g. show “Access denied” or “Use the student/parent app”).

---

## 3. Roles & Who Can Sign Up / Log In

| Role           | Backend role | Description                          | Signup | Login (web) | Dashboard |
|----------------|--------------|--------------------------------------|--------|-------------|-----------|
| **Org Admin**  | `admin`      | Organization owner; creates hostels and assigns hostel admins | Yes (org signup) | Yes | Org Admin Dashboard |
| **Hostel Admin** | `admin`    | Admin of a specific hostel; full hostel management       | No (created by Org Admin) | Yes | Hostel Admin Dashboard |
| **Staff**      | `staff`      | Staff member of a hostel; limited management (students, leaves, announcements, complaints) | No (created by Admin) | Yes | Staff Dashboard |

- **Only `admin` and `staff` can log in on the web.** Student and parent roles cannot use web login (see [Current Roles](#2-current-roles-backend)).
- **Org Admin** is the only role that **signs up** (via org signup: creates organization + first org admin user).
- **Hostel Admin** and **Staff** are **created by Org Admin / Hostel Admin** and only **log in** (no public signup for them on web).

---

## 4. Auth Flows (Signup & Login)

### 4.1 Signup (Org Admin only)

- **Route:** e.g. `/signup` (or `/register`).
- **Who:** New organization + first user (Org Admin).
- **Fields (example):**
  - Organization name
  - Admin: email, password, first name, last name (and any required by backend).
- **Action:** Call backend `POST /api/auth/org-signup` with `{ orgName, email, password, firstName, lastName }`.
- **On success:** Store tokens and user (and optionally `organization`), redirect to **Org Admin Dashboard**.
- **Validation:** Frontend validation (e.g. email format, password strength); display backend errors (e.g. “Organization name already exists”, “Email already exists”).

### 4.2 Login

- **Route:** e.g. `/login`.
- **Who:** Only **admin** and **staff** (Org Admin, Hostel Admin, Staff). Same login form for both.
- **Fields:** Email, password.
- **Action:** Call backend `POST /api/auth/login` with `{ email, password }`.
- **On success:** Check `user.role`. **If role is `student` or `parent`, do not allow web access** — show a message like “This account cannot log in here. Use the student/parent app.” and do not store session. For `admin` and `staff` only: store `accessToken`, `refreshToken`, `user` (and optionally `organizationId`). Redirect by role:
  - `admin` + org context → **Org Admin Dashboard** (or Hostel Admin Dashboard if backend distinguishes by hostel assignment; see [Backend API Alignment](#10-backend-api-alignment)).
  - `staff` → **Staff Dashboard**.
- **Refresh token:** Use `POST /api/auth/refreshtoken` when access token expires; implement in axios interceptor or auth context.
- **Logout:** Call `POST /api/auth/signout` (if available), clear tokens and user, redirect to `/login`.

### 4.3 Protected Routes

- **Auth guard:** If not logged in → redirect to `/login`.
- **Role guard:** Restrict routes by role (e.g. `/org-admin/*` only for org admin, `/hostel-admin/*` for hostel admin, `/staff/*` for staff). 404 or “Access denied” for wrong role.

---

## 5. Post-Login: Role-Based Dashboards

- **Single entry after login:** e.g. `/dashboard` or `/`.
- **Redirect by role:**
  - Org Admin → `/org-admin` (or `/dashboard/org-admin`).
  - Hostel Admin → `/hostel-admin` (or `/dashboard/hostel-admin`).
  - Staff → `/staff` (or `/dashboard/staff`).
- Each role has its **own layout/sidebar** and **menu options** as below.

---

## 6. Org Admin — Features & Flows

Org Admin can:

1. **Create hostel**
   - Form: hostel name, code, address, city (and any required by backend).
   - Call e.g. `POST /api/admin/hostels` with `organizationId` (from auth context).
   - List hostels: `GET /api/admin/hostels`.

2. **Add hostel admins**
   - Select a **hostel** (from list of hostels in the org).
   - “Add hostel admin”: pick or create user (e.g. by email), assign as admin of **that hostel only**.
   - **Constraint (enforce in UI + backend):** **No same user as admin of more than one hostel.** When assigning:
     - If user is already admin of Hostel A, do not show Hostel A again for that user, or show a message “This user is already admin of [Hostel X]. Choose another user or another hostel.”
     - Backend should reject if same user is assigned as admin to a second hostel (frontend should prevent it and show clear error).
   - Later you may allow one admin for multiple hostels; for now, **one admin per hostel, one hostel per admin** (no overlap).

3. **Dashboard home**
   - Summary: number of hostels, list of hostels, quick links to “Create hostel” and “Add hostel admin.”

**Routes (suggestion):**

- `/org-admin` — dashboard home
- `/org-admin/hostels` — list hostels, create hostel
- `/org-admin/hostels/:id` — hostel detail (optional)
- `/org-admin/hostels/:id/admins` — add/view hostel admins for that hostel

---

## 7. Hostel Admin — Features & Flows

Hostel Admin can **manage everything in their hostel(s)**. After login, they must have a **selected hostel** (or default if only one).

1. **Dashboard home**
   - Summary: students count, pending leaves, recent complaints, etc. (use admin stats endpoints).

2. **Add students**
   - Form to add a single student (or link to CSV import if backend supports it for admin).
   - Call e.g. `POST` student creation endpoint (or CSV import under admin).

3. **Manage students**
   - List students: `GET /api/admin/students` (or equivalent with hostel filter).
   - View student detail, edit, deactivate/delete as per backend.

4. **Leaves**
   - List all leaves: `GET /api/admin/getallleaves` (or equivalent).
   - Filter by status (pending/approved/rejected).
   - Approve/reject: `POST /api/admin/leaves/:leaveId/review` with action and remarks.

5. **Parents**
   - List parents: `GET /api/admin/parents`.
   - Create parent: `POST /api/admin/parent`.
   - Update/delete parent.
   - Assign parent to student: `POST /api/admin/assign-parent`; remove: `DELETE /api/admin/remove-parent/:studentId`.

6. **Complaints**
   - List complaints: `GET /api/admin/complaints`.
   - View, resolve, delete as per backend.

7. **Announcements**
   - List: `GET /api/admin/getadminannouncment`.
   - Create: `POST /api/admin/createadminannouncment`.
   - Update: `PUT /api/admin/update-announcment/:type/:id`.
   - Delete: `DELETE /api/admin/delete-announcment/:type/:id`.

8. **Rooms**
   - List roommates: `GET /api/admin/get-All-Roomamtes`.
   - Assign/update room: `POST /api/admin/assign-room`, `POST /api/admin/update-room`.

9. **Mess**
   - Upload mess menu photo: `POST /api/admin/upload-mess-menu`.
   - View/delete menu: `GET /api/admin/mess-menu`, `DELETE /api/admin/delete-menu`.

10. **Staff management (optional for Hostel Admin)**
    - List staff: `GET /api/admin/getallstaffs`.
    - Create staff: `POST /api/admin/staff-create`.
    - Edit/delete staff: `PUT /api/admin/staff/edit/:id`, `DELETE /api/admin/delete-staff/:id`.

11. **CSV import**
    - Import students (and optionally others): `POST /api/admin/import-csv` with CSV file.

**Routes (suggestion):**

- `/hostel-admin` — dashboard home
- `/hostel-admin/students` — list, add, edit students
- `/hostel-admin/leaves` — list, approve/reject leaves
- `/hostel-admin/parents` — list, add, assign parents
- `/hostel-admin/complaints` — list, manage complaints
- `/hostel-admin/announcements` — list, create, edit, delete announcements
- `/hostel-admin/rooms` — room assignment
- `/hostel-admin/mess` — mess menu
- `/hostel-admin/staff` — staff list, create, edit (if in scope)
- `/hostel-admin/import` — CSV import

---

## 8. Staff — Features & Flows

Staff has a **reduced set** of actions compared to Hostel Admin.

1. **Dashboard home**
   - Use `GET /api/staff/dashboard` for stats and recent leaves (or equivalent).

2. **Add students**
   - **From dashboard only:** e.g. “Add student” form or CSV import.
   - CSV: `POST /api/staff/import-csv` (backend allows staff to add students via CSV).

3. **Leaves**
   - List leaves: `GET /api/staff/leaves`, pending: `GET /api/staff/leaves/pending`.
   - Approve/reject: `POST /api/staff/leaves/:leaveId/review` with action and remarks.

4. **Announcements**
   - List: `GET /api/staff/getstaffAnnouncments`.
   - Create: `POST /api/staff/create-staffAanouncments`.

5. **Complaints**
   - List: `GET /api/staff/complaints` (and any update/resolve endpoints if backend exposes for staff).

6. **Mess (view/upload if allowed)**
   - View menu: `GET /api/staff/mess-menu`.
   - Upload menu: `POST /api/staff/upload-mess-menu` (if backend allows).

7. **Profile & password**
   - Profile: `GET /api/staff/profile`.
   - Change password: `PUT /api/staff/change-password`.

**Routes (suggestion):**

- `/staff` — dashboard home
- `/staff/students` — add student (form or CSV)
- `/staff/leaves` — list, approve/reject leaves
- `/staff/announcements` — list, create announcements
- `/staff/complaints` — list, view (and resolve if API allows)
- `/staff/mess` — view/upload mess menu
- `/staff/profile` — profile and change password

---

## 9. Business Rules & Constraints

- **One hostel admin per hostel (no overlap):** A user who is admin of Hostel A cannot be assigned as admin of Hostel B. Enforce in UI when “Add hostel admin” and in backend. (You will relax this later; for now keep this rule.)
- **Org Admin** is the only role that signs up; Hostel Admin and Staff are created by admins and only log in.
- **Hostel context:** For Hostel Admin (and Staff if they are hostel-scoped), always send the correct `hostelId` or rely on backend from `organizationId` + user’s hostel assignment; ensure backend returns only data for that hostel where applicable.
- **Tokens:** Use short-lived access token + refresh token; store securely (e.g. httpOnly cookie or secure storage); clear on logout.

---

## 9. Backend API Alignment

Current backend (for reference):

- **Auth:** `POST /api/auth/org-signup`, `POST /api/auth/login`, `POST /api/auth/refreshtoken`, `POST /api/auth/signout`.
- **Roles in JWT:** `user.role` can be `"admin"` or `"staff"` (and `"super_admin"` for system admin). Org Admin is the user created by org-signup (role `admin` + `UserOrgRoleMapping.role = "org_admin"`). Hostel Admin may be the same `admin` role with a hostel assignment in `UserHostelRoleMapping`; confirm with backend whether response includes `hostelId` or role label so frontend can show “Org Admin” vs “Hostel Admin” and switch context.
- **Admin routes:** Under `/api/admin/*` (hostels, students, parents, leaves, complaints, announcements, rooms, mess, staff, CSV import). Require `admin` or `super_admin`.
- **Staff routes:** Under `/api/staff/*` (profile, dashboard, leaves, leave review, complaints, announcements, mess, CSV import). Require `staff` (and some `admin` for leave review).

Frontend should:

- Use `user.role` and any `organizationId` / `hostelId` from login response to decide dashboard and available actions.
- If backend adds a distinct `hostel_admin` role or `scope` field, use it to show Org Admin vs Hostel Admin flows and to enforce “no same admin for two hostels” in the add-hostel-admin UI.

---

## 11. Implementation Order & Checklist

Use this order for implementation (web only).

### Phase 1 — Auth & Shell

- [ ] **1.1** Project setup (e.g. React + Vite, router, axios, auth context).
- [ ] **1.2** Signup page (org signup): form → `POST /api/auth/org-signup` → store user + tokens → redirect to org admin dashboard.
- [ ] **1.3** Login page: form → `POST /api/auth/login` → allow only `admin` and `staff`; reject `student`/`parent` with message; redirect by role (org admin / hostel admin / staff).
- [ ] **1.4** Auth guard and role guard for routes; logout (call signout, clear state, redirect to login).
- [ ] **1.5** Refresh token flow (interceptor or auth provider).
- [ ] **1.6** Placeholder dashboards: Org Admin, Hostel Admin, Staff (empty or with “Welcome” only).

### Phase 2 — Org Admin

- [ ] **2.1** Org Admin dashboard home (summary + links).
- [ ] **2.2** List hostels + Create hostel (form + `GET/POST /api/admin/hostels`).
- [ ] **2.3** Add hostel admin: select hostel, add/select user, assign; enforce “no same admin for two hostels” in UI and show backend error if any.

### Phase 3 — Hostel Admin

- [ ] **3.1** Hostel Admin dashboard home (with hostel context if multiple).
- [ ] **3.2** Students: list, add, edit (and CSV import if under admin).
- [ ] **3.3** Leaves: list, filters, approve/reject.
- [ ] **3.4** Parents: list, add, edit, assign/remove from student.
- [ ] **3.5** Complaints: list, view, resolve/delete.
- [ ] **3.6** Announcements: list, create, update, delete.
- [ ] **3.7** Rooms: list roommates, assign/update room.
- [ ] **3.8** Mess: upload/view/delete menu.
- [ ] **3.9** Staff: list, create, edit, delete (if in scope).
- [ ] **3.10** CSV import for students.

### Phase 4 — Staff

- [ ] **4.1** Staff dashboard home (stats, recent leaves).
- [ ] **4.2** Add students (form or CSV via `POST /api/staff/import-csv`).
- [ ] **4.3** Leaves: list, pending, approve/reject.
- [ ] **4.4** Announcements: list, create.
- [ ] **4.5** Complaints: list, view (and resolve if API allows).
- [ ] **4.6** Mess: view (and upload if allowed).
- [ ] **4.7** Profile and change password.

### Phase 5 — Polish

- [ ] **5.1** Error handling and toasts/notifications.
- [ ] **5.2** Loading states and empty states.
- [ ] **5.3** Responsive layout and accessibility (a11y).
- [ ] **5.4** Any remaining RBAC checks and edge cases (e.g. “already admin of another hostel”).

---

## Summary

**Current backend roles (from `roles` table):** `super_admin` (0), `admin` (1), `staff` (2), `student` (3), `parent` (4).  
**Web login:** Only **`admin`** and **`staff`** can log in on the web. Reject `student` and `parent` with an appropriate message.

| Role         | Backend role | Signup | Login (web) | Main actions (web) |
|--------------|--------------|--------|-------------|--------------------|
| **Org Admin** | `admin` | Yes (org signup) | Yes | Create hostel; add hostel admins (one admin per hostel, no overlap). |
| **Hostel Admin** | `admin` | No | Yes | Full hostel: students, leaves, parents, complaints, announcements, rooms, mess, staff, CSV. |
| **Staff**    | `staff` | No | Yes | Add students (dashboard), leaves (view/approve), announcements, complaints, mess view/upload, profile. |

Use this document as the **Cursor guide** for the frontend: implement in the order of Phase 1 → 5, and align all flows with the backend API and the constraints above.
