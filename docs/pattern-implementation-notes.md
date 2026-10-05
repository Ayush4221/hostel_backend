# Implemented Pattern Notes

This document explains the concrete pattern implementations introduced after the design recommendation pass, and why they were implemented now.

## 1) Facade Pattern: `AnnouncementCreationFacade`

**What was implemented**
- Added `src/services/announcement/AnnouncementCreationFacade.ts`.
- Moved the multi-step announcement publish workflow into a single facade method:
  1. Create announcement record.
  2. Create hostel mappings (optional).
  3. Create push-job record.
  4. Enqueue queue job (if queue is available).
  5. Ensure worker lifecycle is initialized.

**Why this was implemented**
- `AnnouncementService.createAnnouncement()` previously mixed orchestration concerns with business validation and target-audience resolution.
- This workflow touches multiple collaborators (DAOs + queue + worker lifecycle), which is a textbook facade use-case.

**Resulting benefits**
- Cleaner `AnnouncementService` (input normalization + delegation).
- Better cohesion and a single integration boundary for announcement publishing side-effects.
- Easier to test publish workflow independently from the rest of announcement read/query logic.

## 2) Template-like Reuse for Controller Pagination

**What was implemented**
- Added reusable pagination parser utility: `src/utils/http/pagination.ts`.
- Updated announcement controller paginated endpoints to use the same parser.

**Why this was implemented**
- Announcement controller repeated the same pagination parsing logic in multiple handlers.
- Consolidating parsing reduces copy/paste drift and standardizes behavior.

**Resulting benefits**
- Single source of truth for page number/page size normalization.
- Consistent pagination behavior across endpoints.
- Lower controller complexity and easier maintenance.

## Scope of this change

This change intentionally focused on low-risk, high-value refactors in the announcement domain while preserving existing API behavior.

Larger pattern adoption (Strategy, Command Bus, Specification, Unit of Work across all modules) remains possible and can be rolled out incrementally in follow-up changes.
