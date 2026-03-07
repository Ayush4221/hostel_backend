# DAO and Service Layer

## Architecture

**Controller → Service (or Handler) → DAO → Prisma**

- **Controller** — HTTP only: parses request, calls **service** (or handler), sends response. Controllers do **not** call DAOs directly.
- **Service / Handler** — Business logic: validation, orchestration, calls **DAOs**.
- **DAO** — Data access only: all Prisma queries live here. No business logic.

## Implemented

### DAOs (`src/dao/`)

- **UserDAO** — User CRUD, findByEmail, findByRole, findManyByRole, updatePassword.
- **LeaveDAO** — findMany, findById, findManyByStudentId, findManyByStudentUserIds, findOverlapping, create, updateReview, delete.
- **ComplaintDAO** — findMany (paginated), findById, findByIdAndStudent, findManyByStudentUserId, create, update, delete.
- **ParentStudentMappingDAO** — create, deleteByStudentAndParent, findParentByStudentId, findStudentsByParentId, exists.
- **HostelDAO** — findById, findByOrgAndCode, findFirst, create.
- **OrganizationDAO** — findById, findActiveMembership, findFirstByUserId.
- **UserHostelRoleMappingDAO** — findFirstByUserId, findManyByHostelId, findManyByHostelIdAndRoomId, updateRoomId, findByHostelAndUser.
- **RoomDAO** — findByHostelAndNumber, create, findOrCreate.
- **AnnouncementDAO** — findMany, findManyByTargetAudience, findById, create, update, delete.
- **MessDAO** — getByHostelId, getFirstWithPhoto, updatePhoto, clearPhoto.

### Services (`src/services/`)

- **AdminService** — Admin CRUD, hostels, parent-student, leaves, complaints. Uses UserDAO, LeaveDAO, ComplaintDAO, ParentStudentMappingDAO, HostelDAO, OrganizationDAO, UserHostelRoleMappingDAO.
- **AuthService** — Login, register, org signup, refresh, logout. Uses Prisma.
- **ForgetPassword.service** — Reset token (Redis), send email, reset password. Uses UserDAO, Redis.
- **ComplaintsService** — Complaints CRUD, student/parent views. Uses ComplaintDAO, UserDAO, UserHostelRoleMappingDAO, ParentStudentMappingDAO.
- **RoomService** — getAllRoommates, assignOrUpdateRoom. Uses RoomDAO, UserHostelRoleMappingDAO.
- **AnnouncementService** — Student/general announcements, CRUD. Uses AnnouncementDAO, UserDAO, OrganizationDAO.
- **MessService** — getMessPhoto, uploadPhoto, clearPhoto, resolveHostelId. Uses MessDAO, HostelDAO.
- **StudentService** — Profile, leaves, submit leave, dashboard, roommates, password, profile pic. Uses UserDAO, LeaveDAO, UserHostelRoleMappingDAO, RoomDAO, User.service.
- **StaffService** — Profile, leave stats, all/pending leaves, review leave, dashboard, password. Uses UserDAO, LeaveDAO.
- **ParentService** — Child stats/info/leaves, parent profile, dashboard, update profile, review leave. Uses UserDAO, LeaveDAO, ParentStudentMappingDAO, UserHostelRoleMappingDAO.
- **CSVImportService** — importUsers (upsert by email). Uses UserDAO.
- **LeaveService** — validateForReview (for middleware). Uses LeaveDAO.
- **User.service** — updateProfilePic. Uses UserDAO.

### Controllers (all call Service layer only; no DAO imports)

| Controller | Service |
|------------|---------|
| admin.controller | AdminService |
| auth.controller | AuthService, ForgetPassword.service |
| Announcment.controller | AnnouncementService |
| mess.controller | MessService |
| student.controller | StudentService |
| staff.controller | StaffService |
| parent.controller | ParentService |
| CSV.controller | CSVImportService |
| Complaints.controller | ComplaintsService |
| RoomManagment.controller | RoomService |

### Middleware

- **leave.middleware** — validateLeaveReview uses **LeaveService** (not Leave DAO directly).

## Rule

**Controllers and middleware must not import or call DAOs.** They call the service (or handler) layer; the service layer calls DAOs.
