# MongoDB to PostgreSQL Migration Plan (Multi-Organization Hostel SaaS)

This document is the implementation source of truth for moving from MongoDB to PostgreSQL and supporting multi-organization, multi-hostel tenancy.

---

## 1) Goals and constraints

- Production currently has no critical data, so we can do a clean migration-first cutover.
- All schema changes must be managed via migrations (no manual DB edits).
- Multi-tenant requirements:
  - One organization has many hostels.
  - Org admin can view all hostels in org.
  - Staff can manage only their hostel.
  - Student/parent can access authorized hostel data only.
  - Parent can have children across multiple hostels.
- Single signup flow should bootstrap tenant setup.
- Support smart room allocation and real-time attendance management.

---

## 2) Current model gaps to resolve

- Existing user role model is global, not org/hostel scoped.
- Parent-child linkage on user document is not ideal for many-to-many cross-hostel cases.
- Domain records need explicit `organization_id` / `hostel_id`.
- Room assignment should use a `rooms` table and FK relation from student membership.
- Geo-fenced attendance check-ins should live in `attendance_logs`, not `leaves`.
- Complaints should support image evidence through `attachment_url`.
- Password reset tokens should be moved out of main user table into Redis TTL keys.

---

## 3) Tenancy model (target)

- `organizations` → tenant root
- `hostels` → child of organization
- `users` → global identity
- `organization_memberships` → org-scoped role
- `hostel_memberships` → hostel-scoped role
- `parent_student_links` → global parent ↔ student link
- `rooms` → hostel room inventory and occupancy source of truth
- `attendance_logs` → daily anti-proxy attendance records

Role examples:

- Org roles: `org_owner`, `org_admin`
- Hostel roles: `hostel_admin`, `staff`, `student`, `parent`

---

## 4) Full table schemas (SQL)

> Use this section as source of truth for migrations (Prisma or raw SQL).

### 4.1 Prerequisites

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

### 4.2 organizations

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4.3 hostels

One replaceable mess photo per hostel is stored on this table; new upload replaces existing photo columns.

```sql
CREATE TABLE hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  mess_photo_url TEXT,
  mess_photo_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
```

---

### 4.4 users

Password reset tokens are not stored here. Use Redis TTL keys:

- key: `password_reset:{token}`
- value: `<user_id>`
- expire: 1 hour
- delete key after successful reset (one-time use)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  profile_pic_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4.5 organization_memberships

```sql
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- org_owner, org_admin
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, invited, suspended
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
  -- If one user can have multiple org roles, use UNIQUE (organization_id, user_id, role)
);
```

---

### 4.6 rooms

This is the mathematical source of truth for smart room allocation.

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  current_occupancy INTEGER NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, maintenance, blocked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, room_number),
  CHECK (current_occupancy <= capacity)
);
```

---

### 4.7 hostel_memberships

`room_number` is removed and replaced with `room_id` for student assignment.

```sql
CREATE TABLE hostel_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- hostel_admin, staff, student, parent
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, user_id),
  CHECK ((role = 'student' AND room_id IS NOT NULL) OR (role <> 'student'))
  -- If one user can have multiple hostel roles, use UNIQUE (hostel_id, user_id, role)
);
```

---

### 4.8 parent_student_links

```sql
CREATE TABLE parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50), -- mother, father, guardian
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, student_user_id),
  CHECK (parent_user_id <> student_user_id)
);
```

---

### 4.9 complaints

```sql
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  attachment_url TEXT,
  type VARCHAR(50) NOT NULL, -- Maintenance, Disciplinary, Other
  status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Resolved
  created_by_user_id UUID REFERENCES users(id),
  assigned_to_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4.10 leaves

Geo-fencing is intentionally removed from leave requests.

```sql
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  leave_type VARCHAR(50) DEFAULT 'regular',
  contact_number VARCHAR(50),
  parent_contact VARCHAR(50),
  address TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  parent_review_status VARCHAR(50),
  parent_review_remarks TEXT,
  parent_reviewed_by UUID REFERENCES users(id),
  parent_reviewed_at TIMESTAMPTZ,
  staff_review_status VARCHAR(50),
  staff_review_remarks TEXT,
  staff_reviewed_by UUID REFERENCES users(id),
  staff_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4.11 attendance_logs

This table powers anti-proxy protocol and real-time attendance management.

```sql
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL, -- present, absent, late, excused
  captured_lat DOUBLE PRECISION,
  captured_lng DOUBLE PRECISION,
  selfie_url TEXT,
  liveness_score DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_user_id, hostel_id, date)
);
```

---

### 4.12 announcements (general/org-wide or hostel-wide)

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE, -- NULL = org-wide
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_audience VARCHAR(50) NOT NULL, -- students, staff, all
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 4.13 Suggested indexes (beyond PK/FK defaults)

```sql
-- hostels
CREATE INDEX idx_hostels_organization_id ON hostels(organization_id);

-- organization_memberships
CREATE INDEX idx_org_memberships_user_id ON organization_memberships(user_id);

-- rooms
CREATE INDEX idx_rooms_hostel_id ON rooms(hostel_id);
CREATE INDEX idx_rooms_hostel_status ON rooms(hostel_id, status);

-- hostel_memberships
CREATE INDEX idx_hostel_memberships_user_id ON hostel_memberships(user_id);
CREATE INDEX idx_hostel_memberships_organization_id ON hostel_memberships(organization_id);
CREATE INDEX idx_hostel_memberships_room_id ON hostel_memberships(room_id);

-- parent_student_links
CREATE INDEX idx_parent_student_links_parent_user_id ON parent_student_links(parent_user_id);
CREATE INDEX idx_parent_student_links_student_user_id ON parent_student_links(student_user_id);

-- complaints
CREATE INDEX idx_complaints_org_hostel ON complaints(organization_id, hostel_id);
CREATE INDEX idx_complaints_student_user_id ON complaints(student_user_id);
CREATE INDEX idx_complaints_hostel_id ON complaints(hostel_id);

-- leaves
CREATE INDEX idx_leaves_org_hostel ON leaves(organization_id, hostel_id);
CREATE INDEX idx_leaves_student_user_id ON leaves(student_user_id);
CREATE INDEX idx_leaves_hostel_id ON leaves(hostel_id);
CREATE INDEX idx_leaves_status ON leaves(status);

-- attendance_logs
CREATE INDEX idx_attendance_logs_hostel_date ON attendance_logs(hostel_id, date);
CREATE INDEX idx_attendance_logs_student_date ON attendance_logs(student_user_id, date);
CREATE INDEX idx_attendance_logs_status ON attendance_logs(status);

-- announcements
CREATE INDEX idx_announcements_organization_id ON announcements(organization_id);
CREATE INDEX idx_announcements_org_hostel ON announcements(organization_id, hostel_id);
```

---

## 5) Parent with children in multiple hostels (authorization logic)

Design rules:

1. `parent_student_links` is global (parent ↔ student), not per-hostel.
2. Student-hostel membership is tracked in `hostel_memberships` (role = `student`).
3. Parent can access a leave/complaint/attendance record for student `S` only if:
   - `(parent_user_id, S)` exists in `parent_student_links`, and
   - record belongs to a hostel where `S` is a student member.

Typical query flow:

`parent -> parent_student_links -> student_user_id -> hostel_memberships (student role) -> filter leaves/complaints/attendance_logs by (student_user_id, hostel_id)`.

---

## 6) Real-time attendance management (required design)

For your promise of real-time attendance management, this schema is required and sufficient:

- `attendance_logs` stores immutable daily check-ins (with GPS, selfie URL, liveness score).
- App server emits real-time events after inserts/updates via WebSocket/SSE channels scoped by `organization_id` + `hostel_id`.
- Suggested event topics:
  - `attendance.updated.{hostel_id}`
  - `attendance.alerts.{hostel_id}`
- Recommended validations:
  - enforce geofence radius in application layer,
  - enforce liveness score threshold before marking present,
  - lock duplicate attendance per student/day via `UNIQUE (student_user_id, hostel_id, date)`.

---

## 7) dbdiagram.io schema

Paste this into https://dbdiagram.io:

```dbml
Table organizations {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(255) [not null]
  slug varchar(255) [not null, unique]
  status varchar(50) [not null, default: 'active']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table hostels {
  id uuid [pk, default: `gen_random_uuid()`]
  organization_id uuid [not null]
  name varchar(255) [not null]
  code varchar(50) [not null]
  address text
  city varchar(100)
  is_active boolean [not null, default: true]
  mess_photo_url text
  mess_photo_updated_at timestamptz
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (organization_id)
    (organization_id, code) [unique]
  }
}

Table users {
  id uuid [pk, default: `gen_random_uuid()`]
  email varchar(255) [not null, unique]
  password_hash varchar(255) [not null]
  first_name varchar(100) [not null]
  last_name varchar(100) [not null]
  phone varchar(50)
  profile_pic_url text
  is_active boolean [not null, default: true]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table organization_memberships {
  id uuid [pk, default: `gen_random_uuid()`]
  organization_id uuid [not null]
  user_id uuid [not null]
  role varchar(50) [not null]
  status varchar(50) [not null, default: 'active']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (user_id)
    (organization_id, user_id) [unique]
  }
}

Table rooms {
  id uuid [pk, default: `gen_random_uuid()`]
  hostel_id uuid [not null]
  room_number varchar(20) [not null]
  capacity int [not null]
  current_occupancy int [not null, default: 0]
  status varchar(50) [not null, default: 'active']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (hostel_id)
    (hostel_id, room_number) [unique]
    (hostel_id, status)
  }
}

Table hostel_memberships {
  id uuid [pk, default: `gen_random_uuid()`]
  hostel_id uuid [not null]
  organization_id uuid [not null]
  user_id uuid [not null]
  role varchar(50) [not null]
  room_id uuid
  status varchar(50) [not null, default: 'active']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (user_id)
    (organization_id)
    (room_id)
    (hostel_id, user_id) [unique]
  }
}

Table parent_student_links {
  id uuid [pk, default: `gen_random_uuid()`]
  parent_user_id uuid [not null]
  student_user_id uuid [not null]
  relationship_type varchar(50)
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (parent_user_id)
    (student_user_id)
    (parent_user_id, student_user_id) [unique]
  }
}

Table complaints {
  id uuid [pk, default: `gen_random_uuid()`]
  organization_id uuid [not null]
  hostel_id uuid [not null]
  student_user_id uuid [not null]
  description text [not null]
  attachment_url text
  type varchar(50) [not null]
  status varchar(50) [not null, default: 'Pending']
  created_by_user_id uuid
  assigned_to_user_id uuid
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (organization_id, hostel_id)
    (student_user_id)
    (hostel_id)
  }
}

Table leaves {
  id uuid [pk, default: `gen_random_uuid()`]
  organization_id uuid [not null]
  hostel_id uuid [not null]
  student_user_id uuid [not null]
  start_date date [not null]
  end_date date [not null]
  reason text [not null]
  leave_type varchar(50) [default: 'regular']
  contact_number varchar(50)
  parent_contact varchar(50)
  address text
  status varchar(50) [not null, default: 'pending']
  parent_review_status varchar(50)
  parent_review_remarks text
  parent_reviewed_by uuid
  parent_reviewed_at timestamptz
  staff_review_status varchar(50)
  staff_review_remarks text
  staff_reviewed_by uuid
  staff_reviewed_at timestamptz
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (organization_id, hostel_id)
    (student_user_id)
    (hostel_id)
    (status)
  }
}

Table attendance_logs {
  id uuid [pk, default: `gen_random_uuid()`]
  student_user_id uuid [not null]
  hostel_id uuid [not null]
  date date [not null]
  status varchar(50) [not null]
  captured_lat double
  captured_lng double
  selfie_url text
  liveness_score double
  created_at timestamptz [not null, default: `now()`]

  indexes {
    (hostel_id, date)
    (student_user_id, date)
    (status)
    (student_user_id, hostel_id, date) [unique]
  }
}

Table announcements {
  id uuid [pk, default: `gen_random_uuid()`]
  organization_id uuid [not null]
  hostel_id uuid
  created_by_user_id uuid
  title varchar(255) [not null]
  content text [not null]
  target_audience varchar(50) [not null]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (organization_id)
    (organization_id, hostel_id)
  }
}

Ref: hostels.organization_id > organizations.id [delete: cascade]
Ref: organization_memberships.organization_id > organizations.id [delete: cascade]
Ref: organization_memberships.user_id > users.id [delete: cascade]
Ref: rooms.hostel_id > hostels.id [delete: cascade]
Ref: hostel_memberships.hostel_id > hostels.id [delete: cascade]
Ref: hostel_memberships.organization_id > organizations.id [delete: cascade]
Ref: hostel_memberships.user_id > users.id [delete: cascade]
Ref: hostel_memberships.room_id > rooms.id [delete: set null]
Ref: parent_student_links.parent_user_id > users.id [delete: cascade]
Ref: parent_student_links.student_user_id > users.id [delete: cascade]
Ref: complaints.organization_id > organizations.id [delete: cascade]
Ref: complaints.hostel_id > hostels.id [delete: cascade]
Ref: complaints.student_user_id > users.id [delete: cascade]
Ref: complaints.created_by_user_id > users.id
Ref: complaints.assigned_to_user_id > users.id
Ref: leaves.organization_id > organizations.id [delete: cascade]
Ref: leaves.hostel_id > hostels.id [delete: cascade]
Ref: leaves.student_user_id > users.id [delete: cascade]
Ref: leaves.parent_reviewed_by > users.id
Ref: leaves.staff_reviewed_by > users.id
Ref: attendance_logs.student_user_id > users.id [delete: cascade]
Ref: attendance_logs.hostel_id > hostels.id [delete: cascade]
Ref: announcements.organization_id > organizations.id [delete: cascade]
Ref: announcements.hostel_id > hostels.id [delete: cascade]
Ref: announcements.created_by_user_id > users.id
```

---

## 8) Existing table alterations (for migration sequencing)

If converting an earlier version of this schema, use these changes in a migration:

```sql
-- 1) Add rooms
-- (create rooms table first, see section 4.6)

-- 2) hostel_memberships: drop room_number, add room_id FK
ALTER TABLE hostel_memberships DROP COLUMN IF EXISTS room_number;
ALTER TABLE hostel_memberships ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- 3) leaves: remove static geo columns
ALTER TABLE leaves DROP COLUMN IF EXISTS leave_location_lat;
ALTER TABLE leaves DROP COLUMN IF EXISTS leave_location_lon;

-- 4) complaints: add maintenance evidence field
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 5) attendance_logs table for real-time attendance and anti-proxy
-- (create attendance_logs table as defined in section 4.11)
```

---

## 9) Migration discipline (future migrations)

- Open pull requests against the `master` branch (not `main`).
- Never modify old migration files.
- Always append new migration files.
- Include verification SQL in each migration PR.
- Add CI job to:
  1. create fresh DB,
  2. apply all migrations,
  3. run tests,
  4. optionally rollback/re-apply recent migration.

Naming example:

- `migrations/20260110_0001_extensions.sql`
- `migrations/20260110_0002_core_tenancy.sql`
- `migrations/20260110_0003_memberships_rooms.sql`
- `migrations/20260110_0004_domain_tables.sql`
- `migrations/20260110_0005_attendance_indexes.sql`

---

## 10) Signup bootstrap flow (single signup link)

In a single DB transaction:

1. Create `users` row for founder.
2. Create `organizations` row.
3. Create first `hostels` row (optional depending on onboarding wizard).
4. Create `organization_memberships` as `org_owner`.
5. Optionally create `hostel_memberships` as `hostel_admin` for first hostel.

Then org admin can:

- add more hostels,
- create rooms,
- invite staff/students/parents,
- assign students to `room_id`,
- link parents to students via `parent_student_links`.

---

## 11) Acceptance checklist

- Org admin can access all hostels in own org.
- Staff cannot access another hostel’s records.
- Student sees only own data and own hostel records.
- Parent with children in multiple hostels can access both children records only.
- Room capacity constraints prevent over-allocation.
- Attendance duplicate prevention works for per-day check-ins.
- Complaints support image evidence URLs.
- Cross-organization access is denied in API and DB policy layers.
- New environment can be built from migrations only.

