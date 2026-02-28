# MongoDB to PostgreSQL Migration Plan (Multi-Organization Hostel SaaS)

## 1) Goals and constraints

This plan is designed for your current situation:

- Production currently has **no critical data**, so you can do a clean migration without legacy backfill risk.
- You want to move from MongoDB to PostgreSQL using **migration files only**.
- You want a **future-proof multi-organization schema**:
  - One organization can have many hostels.
  - Organization admin can access all hostels in that organization.
  - Hostel staff can access only their own hostel.
  - Students and parents can access only authorized hostel data.
  - A parent can have children across multiple hostels.
- You want a clean onboarding flow with one signup link, plus the ability to add hostels later.

---

## 2) Current model gaps (what must change)

Your current model is single-tenant and global-role oriented:

- `User` has global role (`admin|student|staff|parent`) and no org/hostel tenancy keys.
- Parent/student linkage is embedded on `User` (`parentId`, `children`) which does not scale well for multi-hostel relationships.
- Domain entities (`leave`, `complaints`, announcements, mess photos) do not include `organization_id` / `hostel_id` for tenant isolation.
- JWT payload currently includes only `userId` and role; it should include organization context and selected hostel context.

---

## 3) Target tenancy architecture

Use **hierarchical multi-tenancy** with explicit memberships:

- `organizations` (tenant root)
- `hostels` (child of organization)
- `users` (global identity)
- `organization_memberships` (org-scoped roles)
- `hostel_memberships` (hostel-scoped roles)
- `parent_student_links` (many-to-many relationship)

### 3.1 Role strategy

Prefer scoped roles over one global role:

- Organization-level role examples:
  - `org_owner`
  - `org_admin`
- Hostel-level role examples:
  - `hostel_admin`
  - `staff`
  - `student`
  - `parent`

This avoids role ambiguity and supports one user playing different roles across hostels.

---

## 4) PostgreSQL schema blueprint

> Note: Names are recommendations; adjust naming style as needed.

### 4.1 Core identity & tenancy tables

1. `organizations`
   - `id (uuid pk)`
   - `name`
   - `slug (unique)`
   - `status`
   - timestamps

2. `hostels`
   - `id (uuid pk)`
   - `organization_id (fk -> organizations.id)`
   - `name`
   - `code (unique per org)`
   - `address`, `city`, etc.
   - `is_active`
   - timestamps

3. `users`
   - `id (uuid pk)`
   - `email (unique globally)`
   - `password_hash`
   - `first_name`, `last_name`
   - `phone` (optional)
   - `is_active`
   - timestamps

4. `organization_memberships`
   - `id (uuid pk)`
   - `organization_id (fk)`
   - `user_id (fk)`
   - `role` (enum/text with check)
   - `status` (active/invited/suspended)
   - timestamps
   - unique index: `(organization_id, user_id, role)`

5. `hostel_memberships`
   - `id (uuid pk)`
   - `hostel_id (fk)`
   - `organization_id (fk)` (denormalized for query speed + policy)
   - `user_id (fk)`
   - `role` (`staff|student|parent|hostel_admin`)
   - `status`
   - timestamps
   - unique index: `(hostel_id, user_id, role)`

6. `parent_student_links`
   - `id (uuid pk)`
   - `parent_user_id (fk -> users.id)`
   - `student_user_id (fk -> users.id)`
   - `relationship_type` (mother/father/guardian)
   - timestamps
   - unique index: `(parent_user_id, student_user_id)`

### 4.2 Domain tables (tenant-safe)

Every operational table should carry tenancy keys:

- `organization_id` is mandatory for all business tables.
- `hostel_id` is mandatory for hostel-scoped records.

Examples:

- `complaints`
  - `organization_id`, `hostel_id`, `student_user_id`, `created_by_user_id`, `assigned_to_user_id`
- `leaves`
  - `organization_id`, `hostel_id`, `student_user_id`, review columns
- `announcements`
  - `organization_id`, optional `hostel_id` (null for org-wide), `created_by_user_id`, audience
- `mess_photos`
  - `organization_id`, `hostel_id`, `uploaded_by_user_id`

Use foreign keys and indexes on `(organization_id, hostel_id)` and actor columns.

---

## 5) Migration system design (how future migrations append safely)

Pick one migration framework and enforce it (Prisma/Knex/TypeORM/Drizzle/Flyway).

### 5.1 Folder & naming

Use ordered file naming, e.g.:

- `migrations/20260110_0001_extensions.sql`
- `migrations/20260110_0002_core_tenancy.sql`
- `migrations/20260110_0003_memberships.sql`
- `migrations/20260110_0004_domain_tables.sql`
- `migrations/20260110_0005_indexes_policies.sql`

### 5.2 Rules for all future migrations

1. Never edit old migration files.
2. Every schema change is a **new** migration file.
3. Include `up` and (where possible) `down` scripts.
4. If data transform is required, include deterministic backfill script.
5. Add verification SQL for each migration (counts, null checks, FK checks).
6. CI must fail if pending migrations exist.

### 5.3 Validation pipeline

For each PR:

1. Create fresh DB.
2. Run full migration chain from zero.
3. Run tests.
4. (Optional) rollback one step and re-apply to test safety.

Because prod has no data right now, this gives a robust baseline.

---

## 6) Authorization and data isolation model

Implement two layers:

1. **Application-level authorization**
   - Resolve current user memberships.
   - Resolve active organization and hostel context.
   - Apply scoped query filters everywhere.

2. **Database-level protection (recommended with RLS)**
   - Enable PostgreSQL Row-Level Security on tenant tables.
   - Set session variables per request (e.g. `app.user_id`, `app.organization_id`, `app.hostel_id`).
   - Add policies so rows are only visible if membership permits.

This prevents accidental cross-tenant leakage even if app code misses a filter.

---

## 7) Signup and onboarding flow (single signup link)

### 7.1 First signup (new customer)

Transactionally:

1. Create `user` (founder).
2. Create `organization` from org name.
3. Create first `hostel` (or allow skip and add later).
4. Create `organization_membership` with `org_owner`.
5. Optionally create `hostel_membership` with `hostel_admin` for first hostel.

### 7.2 Subsequent management

- Org admin adds hostels from admin panel.
- Org admin invites staff/parents/students to specific hostels.
- Parent can be linked to multiple students across hostels via `parent_student_links`.

---

## 8) Refactor plan from current codebase

### Step A: Introduce Postgres data layer

- Add DB config, pooling, and migration runner.
- Add new repository/service layer (avoid direct model calls from controllers).

### Step B: Build new schema via migrations

- Create all core tenancy and user/membership tables first.
- Add domain tables with tenancy columns and FKs.

### Step C: Update auth

- JWT/session should include user id and active tenant context.
- On each request, resolve memberships and enforce scope.

### Step D: Rewrite domain logic

- Complaints, leaves, announcements, mess operations become hostel-scoped.
- Replace derived name storage with FK joins where practical.

### Step E: Disable Mongo paths

- Once all endpoints are switched and tested, remove Mongo model usage.

---

## 9) Minimum acceptance test matrix

### 9.1 Multi-tenant access tests

1. Org admin can view all hostels in same org.
2. Staff of Hostel A cannot read Hostel B records.
3. Student can read only own hostel + own profile data.
4. Parent with child in Hostel A and child in Hostel B can read both children records, and nothing else.
5. Cross-organization reads always denied.

### 9.2 Migration integrity tests

1. Full schema builds from zero using migrations.
2. Constraints enforce integrity (FK, unique, checks).
3. Seed data script creates valid org + hostels + users + memberships.

### 9.3 Operational tests

1. Signup bootstrap transaction is atomic.
2. Invite and role assignment flows work.
3. Soft-delete or deactivation does not break historical records.

---

## 10) Rollout plan (no-data production)

1. Freeze feature development briefly.
2. Merge Postgres schema + app refactor.
3. Deploy to staging and run complete matrix.
4. Deploy to production.
5. Run migrations on production.
6. Execute smoke tests.
7. Open system for customer onboarding.

Since there is no production data dependency, rollback is simple: redeploy previous app/database state if needed.

---

## 11) Recommended implementation sequence (practical)

1. Finalize ERD and role matrix.
2. Implement migrations for core tenancy tables.
3. Implement auth and membership checks.
4. Refactor one module at a time (leave, complaints, announcements, mess).
5. Add RLS policies.
6. Run security and integration tests.
7. Deploy.

---

## 12) Nice-to-have improvements

- Invitation system with expiring tokens.
- Audit logs (`actor_user_id`, `entity`, `action`, `before/after`).
- Feature flags per organization.
- Billing hooks at organization level.
- Data export per organization.

---

## 13) Summary

This plan gives you:

- Clean PostgreSQL migration with strict migration discipline.
- Correct multi-org and multi-hostel tenancy boundaries.
- Support for complex parent-child cross-hostel cases.
- Scalable authorization model for future growth.
- A safe structure for appending future schema migrations.
