# Role Implementation (Schema Part A)

This document describes the role system using a **roles** table with numeric IDs and the **super-admin** user with access to all organizations' data.

---

## Overview

- Roles are stored in a **roles** table with **numeric IDs** (no hardcoded role strings in business logic).
- **Super-admin** (role_id = 0) has access to all orgs' data and can perform admin actions without organization membership.
- The user created by `npm run create-admin` is a super-admin with **role_id 0** and no `organization_memberships`.

---

## Schema

### Roles table

| Column | Type     | Description                    |
|--------|----------|--------------------------------|
| `id`   | Int (PK) | Numeric role ID (fixed values) |
| `code` | String   | Unique code (e.g. `super_admin`) |
| `name` | String?  | Display name                   |

### User.roleId

- **User** has `role_id` (Int, nullable, FK to `roles.id`).
- Legacy `role` (String) is kept during migration; app code uses `roleId` and `roleRelation.code` (or falls back to `role`).

### Role ID convention

| id | code        |
|----|-------------|
| 0  | super_admin |
| 1  | admin       |
| 2  | staff       |
| 3  | student     |
| 4  | parent      |

Optional later: 5 = org_admin, 6 = org_owner for `organization_memberships`.

---

## Constants

Defined in **`src/config/roles.ts`**:

- `ROLE_ID_SUPER_ADMIN = 0`
- `ROLE_ID_ADMIN = 1`, `ROLE_ID_STAFF = 2`, `ROLE_ID_STUDENT = 3`, `ROLE_ID_PARENT = 4`
- `ROLE_CODES` — map id → code
- `ROLE_CODE_TO_ID` — map code → id (for legacy `user.role` string)
- `REGISTERABLE_ROLE_CODES` — `["admin", "staff", "student", "parent"]` (super_admin cannot sign up)

Use these constants instead of magic numbers in controllers, services, and scripts.

---

## Auth and JWT

- User is loaded with `include: { roleRelation: true }` where role is needed (login, refresh, middleware).
- **JWT payload** includes:
  - `userId`, `role` (role code, e.g. `"super_admin"`), and optionally `roleId`.
- **req.user** (after `authenticateToken`): `_id`, `role`, and optionally `roleId`.
- **authorizeRoles** checks `req.user.role` against allowed role codes (e.g. `["admin", "super_admin"]`).

---

## Super-admin behavior

1. **createAdmin script** (`npm run create-admin`)  
   Creates a user with `roleId: ROLE_ID_SUPER_ADMIN` (0). No `organization_memberships` are created.

2. **Admin routes**  
   Protected with `authorizeRoles(["admin", "super_admin"])`, so both org admins and super-admin can access.

3. **addHostel**  
   If `req.user.roleId === ROLE_ID_SUPER_ADMIN` or `req.user.role === "super_admin"`, the organization membership check is **skipped** and a hostel can be created for any valid `organizationId`. Otherwise, user must have `org_admin` or `org_owner` in that org.

4. **Mess photo**  
   Upload: allowed for `admin`, `staff`, `super_admin`. Delete: allowed for `admin`, `super_admin`.

5. **Room management**  
   `getAllRoommates` and `AssignOrUpdateRoom`: allowed for `admin` and `super_admin`.

---

## Register and signup

- **Register (legacy):** Only roles in `REGISTERABLE_ROLE_CODES` are allowed. Resolve code to `roleId` and set `user.roleId`; `roleId: 0` (super_admin) cannot be created via signup.
- **Org signup:** Creates an org and an admin user with `roleId: ROLE_ID_ADMIN` (1) and an `organization_membership` with role `org_admin`.

---

## Seed and migrations

- **Prisma migration** `add_roles_table`: creates `roles` table, adds `users.role_id`, and inserts seed rows for ids 0–4.
- **Prisma seed** (`prisma/seed.ts`): idempotent upsert of the same five roles. Run with `npm run db:seed` or `npx prisma db seed`.

---

## Files involved

| File / area                    | Purpose |
|--------------------------------|--------|
| `prisma/schema.prisma`         | Role model; User.roleId, User.roleRelation |
| `prisma/seed.ts`               | Seed roles 0–4 |
| `src/config/roles.ts`          | Role ID constants and maps |
| `src/scripts/createAdmin.ts`   | Create super-admin with roleId 0 |
| `src/services/AuthService.ts` | Load roleRelation; put role/roleId in JWT and DTOs; register uses REGISTERABLE_ROLE_CODES |
| `src/middleware/auth.middleware.ts` | Set req.user.role and req.user.roleId from token |
| `src/routes/admin.routes.ts`   | authorizeRoles(["admin", "super_admin"]) |
| `src/controllers/admin.controller.ts` | addHostel: super-admin bypass; createAdmin (API): roleId ROLE_ID_ADMIN |
| `src/controllers/mess.controller.ts` | super_admin allowed for upload and delete |
| `src/controllers/RoomManagment.controller.ts` | super_admin treated like admin |
| `src/dto/auth.dto.ts`          | UserResponseDto.roleId optional; role unions include super_admin where needed |

---

## Data migration (existing users)

If `users.role` already has data:

1. Apply migration that creates `roles` and adds `users.role_id`.
2. Backfill: `UPDATE users SET role_id = (SELECT id FROM roles WHERE code = users.role) WHERE role IS NOT NULL`.
3. Switch app code to use `roleId` and `roleRelation.code`; optionally drop `users.role` in a later migration.
