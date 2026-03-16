# Design Pattern Recommendations (Project-wide)

This document lists patterns that would provide the highest architecture payoff across the current codebase.

## 1) Strategy Pattern (High Priority)

**Why here**
- Business logic branches heavily by role/audience (student/staff/parent/admin), especially in announcement and admin flows.
- The same operation shape is repeated with role-specific behavior.

**Current signals**
- `AnnouncementService` has separate methods for student/staff/parent/admin retrieval and audience filtering.
- `AdminService` repeatedly validates and executes role-specific user operations.

**Implementation direction**
- Introduce interfaces like `AnnouncementVisibilityStrategy` / `RoleOperationStrategy` and map role/audience to strategy classes.
- Keep controller/service entrypoints stable; resolve strategy internally.

**Benefits**
- Reduces `if/else` and duplicate methods.
- Easier onboarding of new audiences/roles.
- Better unit-test scope per strategy.

## 2) Facade Pattern (High Priority)

**Why here**
- Cross-cutting workflows require orchestration across multiple DAOs/services (auth + org resolution + role mapping + token handling).
- Controllers are thin, but service-level orchestration is still spread across several modules.

**Current signals**
- Auth flow combines Prisma, role mapping, org resolution, JWT creation, and refresh token rotation.
- Announcement creation combines DAO writes plus queue job setup.

**Implementation direction**
- Add facades such as `AuthFacade`, `AnnouncementFacade`, `UserProvisioningFacade` to encapsulate multi-step use-cases.
- Facades call existing services/DAOs; avoid breaking external API contracts.

**Benefits**
- Single integration boundary for complex use-cases.
- Better transactional and error handling consistency.
- Cleaner future API versioning.

## 3) Command Pattern (High Priority)

**Why here**
- Important write workflows include side effects (DB write + queue enqueue + worker lifecycle), which should be explicit and auditable.
- Async actions are currently coupled to service methods.

**Current signals**
- `AnnouncementService.createAnnouncement()` performs create + mapping + push job creation + queue enqueue + worker boot.

**Implementation direction**
- Model operations like `CreateAnnouncementCommand`, `AssignParentToStudentCommand`, `ReviewLeaveCommand`.
- Add command handler layer; optional command bus for sync/async execution and retries.

**Benefits**
- Clear separation of intent vs execution.
- Better retry/idempotency hooks.
- Easier audit/event logging.

## 4) Factory Pattern (Medium-High Priority)

**Why here**
- DAOs/services are manually instantiated in many modules and singleton lifecycle is implicit.
- Environment-dependent object creation (queue enabled/disabled, redis availability) can be centralized.

**Current signals**
- Repeated `new SomeDAO()` at module scope in services.
- Worker is manually lazily initialized.

**Implementation direction**
- Add factories: `DAOFactory`, `ServiceFactory`, `WorkerFactory`.
- Use factory + composition root to construct dependencies once.

**Benefits**
- Predictable lifecycle management.
- Easier mocking for tests.
- Cleaner migration path to full DI container later.

## 5) Template Method Pattern (Medium Priority)

**Why here**
- Controllers repeat same request choreography: parse page/query params, call service, handle status/errors.

**Current signals**
- Announcement controller has repeated pagination parsing and similar try/catch blocks across role-specific endpoints.

**Implementation direction**
- Base helper for paginated endpoints with hooks for role-specific service calls.

**Benefits**
- Consistent response shape/error handling.
- Reduced controller duplication.

## 6) Specification Pattern (Medium Priority)

**Why here**
- Filter logic is expanding (organization, audience, hostel, unread, date sorting, pagination).

**Current signals**
- DAOs expose multiple filter-specific query methods and conditional query-building.

**Implementation direction**
- Build composable specs (`OrganizationSpec`, `AudienceSpec`, `HostelScopeSpec`, etc.) and translate to Prisma `where` clauses.

**Benefits**
- Reusable query logic.
- Less method explosion in DAOs.

## 7) Adapter Pattern (Medium Priority)

**Why here**
- External systems exist (Redis, queue/bull, S3, mail providers) and should be isolated from domain services.

**Current signals**
- Services import infra modules directly.

**Implementation direction**
- Add `CacheAdapter`, `QueueAdapter`, `StorageAdapter`, `MailAdapter` interfaces + concrete adapters.

**Benefits**
- Swappable infrastructure.
- Cleaner tests with fake adapters.

## 8) Unit of Work / Transaction Script (Medium Priority)

**Why here**
- Multi-write operations can partially fail without coordinated transaction boundaries.

**Current signals**
- Complex flows perform several DAO operations in sequence.

**Implementation direction**
- Introduce explicit transaction boundary per use-case (Prisma transaction wrapper).
- Wrap command/facade operations in Unit of Work where consistency is required.

**Benefits**
- Better data consistency.
- Simpler rollback semantics.

## Recommended rollout order

1. Strategy + Facade (reduce branching and orchestration spread).
2. Command + Unit of Work (reliability/idempotency of writes).
3. Factory + Adapter (inversion of control and testability).
4. Template Method + Specification (remove repetition and query drift).
