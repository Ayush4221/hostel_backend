# Models Currently in Use vs DAOs

**Goal:** Remove all Mongoose models and use DAOs (Prisma) instead.

---

## Models still in use (must migrate before deleting)

| Model file | Used by |
|------------|---------|
| **user.model.ts** | `Announcment.controller.ts`, `student.controller.ts`, `parent.controller.ts`, `staff.controller.ts`, `CSV.controller.ts`, `ForgetPassword.service.ts` |
| **leave.model.ts** | `student.controller.ts`, `parent.controller.ts`, `staff.controller.ts`, `leave.middleware.ts` |
| **mess.model.ts** | `mess.controller.ts` |
| **studentAnnouncment.model.ts** | `Announcment.controller.ts` |
| **GeneralAnnouncment.model.ts** | `Announcment.controller.ts` |

---

## Models not imported anywhere (safe to delete now)

| Model file | Status |
|------------|--------|
| organization.model.ts | Not imported in `src/` |
| organizationMembership.model.ts | Not imported in `src/` |
| hostel.model.ts | Not imported in `src/` |

---

## DAO / Service replacement map

| Old model | Use instead |
|-----------|-------------|
| User | **UserDAO** (`src/dao/UserDAO.ts`) |
| Leave | **LeaveDAO** (`src/dao/LeaveDAO.ts`) – add `create`, `findMany(where?)` if needed |
| MessPhoto | **MessDAO** (`src/dao/MessDAO.ts`) – mess photo on Hostel |
| StudentAnnouncement + GeneralAnnouncement | **AnnouncementDAO** (`src/dao/AnnouncementDAO.ts`) – single `Announcement` table with `targetAudience` |
| (password reset) | **UserDAO** + Redis for reset tokens (ForgetPassword.service) |

---

## Migration checklist

1. **Announcment.controller** → AnnouncementDAO, UserDAO; optional AnnouncementService.
2. **mess.controller** → MessDAO (need `hostelId` from query/auth or first hostel).
3. **student.controller** → UserDAO, LeaveDAO; RoomService/UserHostelRoleMappingDAO for roommates; User.service already uses UserDAO.
4. **staff.controller** → UserDAO, LeaveDAO.
5. **parent.controller** → UserDAO, LeaveDAO, ParentStudentMappingDAO (for “children”).
6. **CSV.controller** → UserDAO (upsert by email).
7. **leave.middleware** → LeaveDAO (findById, check status).
8. **ForgetPassword.service** → UserDAO + Redis (or keep token in Redis only, no DB column).
9. Delete all files in `src/models/`.
