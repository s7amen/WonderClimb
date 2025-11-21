# Tasks: WonderClimb Core Booking & Attendance MVP

**Input**: Design documents from `/specs/001-core-booking-attendance/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create `backend/` project structure per implementation plan
- [X] T002 Initialize Node.js project in `backend/` with Express, Mongoose, jsonwebtoken, bcrypt, dotenv, pino
- [X] T003 [P] Configure plain JavaScript tooling and scripts in `backend/package.json` (dev server, build, test)
- [X] T004 [P] Set up environment configuration loading in `backend/src/config/env.js`
- [X] T005 [P] Set up MongoDB connection helper in `backend/src/config/db.js` using Mongoose
- [X] T006 [P] Initialize base Express app in `backend/src/app.js` with JSON body parsing and basic health check route

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement centralized error handling middleware in `backend/src/middleware/errorHandler.js`
- [X] T008 [P] Implement request logging using pino in `backend/src/middleware/logging.js`
- [X] T009 [P] Implement JWT authentication middleware in `backend/src/middleware/auth.js`
- [X] T010 [P] Implement role-based access control helper in `backend/src/middleware/roles.js`
- [X] T011 Define core Mongoose models for `User` and `Climber` in `backend/src/models/user.js` and `backend/src/models/climber.js`
- [X] T012 [P] Define Mongoose models for `Session`, `Booking`, `AttendanceRecord` in `backend/src/models/session.js`, `backend/src/models/booking.js`, `backend/src/models/attendanceRecord.js`
- [X] T013 [P] Define Mongoose models for `ParentClimberLink` and `CoachProfile` in `backend/src/models/parentClimberLink.js` and `backend/src/models/coachProfile.js`
- [X] T014 Configure core indexes on users, sessions, bookings, and attendance collections via Mongoose schemas
- [X] T015 Wire Express routes root (`/api/v1`) in `backend/src/routes/index.js` and connect to `app.js`
- [X] T016 Configure Jest and Supertest in `backend/jest.config.js` and `backend/tests/setup.js` for unit/integration tests

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Parent manages children and basic profile (Priority: P1) 🎯 MVP

**Goal**: Parents can add and manage child climbers linked to their account.

**Independent Test**: Parent can log in, add child profiles, edit them, and see only their own children.

### Implementation for User Story 1

- [X] T017 [P] [US1] Implement parent–climber link model utilities in `backend/src/services/parentClimberLinkService.js`
- [X] T018 [P] [US1] Implement parent-only routes for managing child climbers in `backend/src/routes/parentClimbers.js`
- [X] T019 [US1] Implement `ParentClimberService` for create/update/deactivate operations in `backend/src/services/parentClimberService.js`
- [X] T020 [US1] Add validation and authorization for parent climber endpoints in `backend/src/middleware/validation/parentClimbersValidation.js`
- [X] T021 [US1] Integrate parent climber routes into API router at `/api/v1/parents/me/climbers` in `backend/src/routes/index.js`
- [X] T053 [P] [US1] Add integration test for parent managing climbers in `backend/tests/integration/parentClimbers.e2e.test.js`

**Checkpoint**: Parent can manage child profiles and see only their own children.

---

## Phase 4: User Story 2 - Parent books child into one or multiple training sessions (Priority: P1)

**Goal**: Parents can book and cancel sessions (single and recurring) for their children within capacity, booking horizon, and cancellation window.

**Independent Test**: Parent can see available sessions, book single and recurring sessions within limits, and cancel bookings within the allowed window.

### Implementation for User Story 2

- [X] T022 [P] [US2] Implement configuration service for booking horizon and cancellation window in `backend/src/services/configService.js`
- [X] T023 [P] [US2] Implement `BookingService` with capacity checks, horizon rules, and cancellation logic in `backend/src/services/bookingService.js`
- [X] T024 [P] [US2] Implement sessions listing endpoint for parents/climbers in `backend/src/routes/sessionsPublic.js` using filters and horizon rules
- [X] T025 [US2] Implement booking creation endpoint in `backend/src/routes/bookings.js` with duplicate prevention and capacity enforcement
- [X] T026 [US2] Implement booking cancellation endpoint in `backend/src/routes/bookings.js` enforcing cancellation window
- [X] T027 [US2] Implement recurring booking logic (days of week + date range) in `backend/src/services/bookingService.js`
- [X] T028 [US2] Add parent-facing bookings list endpoint (`/api/v1/parents/me/bookings`) in `backend/src/routes/bookings.js`
- [X] T029 [US2] Ensure booking endpoints use role-based access control and only allow parents to book for their children or themselves
- [X] T055 [P] [US2] Add structured logging for booking lifecycle events (create, cancel, failure) in `backend/src/services/bookingService.js`
- [X] T054 [P] [US2] Add end-to-end test for parent booking and cancellation flow in `backend/tests/integration/parentBooking.e2e.test.js`

**Checkpoint**: Parents can book and cancel sessions for their children within rules; no duplicates or over-capacity bookings.

---

## Phase 5: User Story 3 - User as self-managed climber (Priority: P2)

**Goal**: Users who are climbers can manage their own profile and bookings.

**Independent Test**: A user marked as climber can view and manage their own profile and trainings, separate from parent features.

### Implementation for User Story 3

- [X] T030 [P] [US3] Extend `Climber` and `User` models/services to support self-managed climber linkage in `backend/src/services/climberService.js`
- [X] T031 [P] [US3] Implement "my climber profile" endpoints for self-managed users in `backend/src/routes/myClimber.js`
- [X] T032 [US3] Extend booking endpoints in `backend/src/routes/bookings.js` to support booking for self-climber vs child climber with clear rules
- [X] T033 [US3] Ensure role and ownership checks prevent access to other users' or families' data in `backend/src/middleware/roles.js`

**Checkpoint**: Self-managed climbers can use the same booking system while respecting data isolation.

---

## Phase 6: User Story 4 - Coach manages today’s sessions and attendance (Priority: P1)

**Goal**: Coaches can view today’s sessions and mark attendance quickly on mobile.

**Independent Test**: Coach sees only assigned sessions for the day and can mark present/absent for each climber.

### Implementation for User Story 4

- [X] T034 [P] [US4] Implement `CoachScheduleService` to fetch today's sessions for a coach in `backend/src/services/coachScheduleService.js`
- [X] T035 [P] [US4] Implement coach "today's sessions" endpoint in `backend/src/routes/coachSessions.js`
- [X] T036 [US4] Implement attendance recording endpoint for a session in `backend/src/routes/attendance.js`
- [X] T037 [US4] Implement `AttendanceService` to upsert attendance records and enforce one record per session/climber in `backend/src/services/attendanceService.js`
- [X] T038 [US4] Ensure coach routes are protected by role checks and only return sessions assigned to the coach
- [X] T056 [P] [US4] Add end-to-end test for coach marking attendance for today's sessions in `backend/tests/integration/coachAttendance.e2e.test.js`
- [X] T057 [P] [US4] Add structured logging when attendance is recorded or updated in `backend/src/services/attendanceService.js`

**Checkpoint**: Coaches can reliably mark attendance for their sessions without data leaks.

---

## Phase 7: User Story 5 - Admin configures sessions and calendar (Priority: P2)

**Goal**: Admins can create and manage training sessions, which populate the calendar and coach payouts.

**Independent Test**: Admin can create/edit sessions that appear in parent/coach views and set payout amounts and status.

### Implementation for User Story 5

- [X] T039 [P] [US5] Implement admin session management endpoints (create/update/list) in `backend/src/routes/adminSessions.js`
- [X] T040 [P] [US5] Implement `SessionService` with calendar-oriented queries in `backend/src/services/sessionService.js`
- [X] T041 [US5] Implement coach payout fields and status transitions for sessions in `backend/src/services/sessionService.js`
- [X] T042 [US5] Implement admin calendar endpoint (month/week/day views) in `backend/src/routes/adminCalendar.js`
- [X] T043 [US5] Ensure admin endpoints respect role checks and do not break existing bookings when updating sessions
- [X] T058 [P] [US5] Add end-to-end test for admin session configuration and payout status updates in `backend/tests/integration/adminSessions.e2e.test.js`
- [X] T059 [P] [US5] Add structured logging for session creation, updates, and payout status changes in `backend/src/services/sessionService.js`

**Checkpoint**: Admin-configured sessions drive the calendar, bookings, and basic coach payout tracking.

---

## Phase 8: User Story 6 - Cash Desk / Financial overview for trainings (Future, Priority: P3)

**Goal**: Provide a basic foundation for financial overviews (income/expense) related to trainings and coach payouts.

**Independent Test**: Admin can query monthly summaries based on existing session and payout data (even if UI is minimal).

### Implementation for User Story 6 (Foundational only)

- [X] T044 [P] [US6] Implement initial `CashRecord` service in `backend/src/services/cashRecordService.js`
- [X] T045 [US6] Implement simple reporting endpoint for monthly coach payouts summary in `backend/src/routes/adminFinance.js`

**Checkpoint**: Minimal backend support for future cash desk UI and detailed reports.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories
- [X] T046 [P] Add OpenAPI/Swagger documentation route in `backend/src/routes/docs.js` using `contracts/openapi.yaml` and ensure it is enabled only in non-production environments or protected behind admin auth
- [X] T047 Implement security hardening (helmet, CORS configuration) in `backend/src/app.js`
- [X] T048 Implement basic rate limiting middleware for auth and booking endpoints in `backend/src/middleware/rateLimit.js`
- [X] T049 [P] Add additional unit tests for core services (booking, attendance, sessions) in `backend/tests/unit/`
- [X] T050 [P] Add API integration tests for key flows (parent booking, coach attendance, admin session config) in `backend/tests/integration/`
- [X] T060 [P] Add RBAC integration tests to verify role separation (parent, climber, coach, admin) in `backend/tests/integration/rbac.test.js`
- [X] T061 [P] Add checks or tests ensuring no sensitive personal data is logged in pino logs (e.g., no passwords, full addresses) in `backend/tests/integration/logging.test.js`
- [ ] T051 Run performance checks for core endpoints (sessions list, booking create/cancel, coach today's sessions) using a simple load tool (e.g., autocannon or k6) and tune indexes or queries as needed (MANUAL TASK - requires running load tests)
- [X] T052 Update documentation in `specs/001-core-booking-attendance/quickstart.md` with any changes discovered during implementation


---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3–8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Uses sessions and climbers but can be developed alongside US1
- **User Story 3 (P2)**: Depends on US1 (parent/climber model) and US2 (booking logic) but should remain independently testable
- **User Story 4 (P1)**: Depends on sessions and bookings; can be developed in parallel with US2 if models are ready
- **User Story 5 (P2)**: Depends on sessions model; affects but does not block US2/US4 if careful with migrations
- **User Story 6 (P3)**: Depends on sessions and coach payout fields; can be added later without breaking earlier stories

### Within Each User Story

- Models and services before endpoints
- Endpoints before integration across modules
- Core implementation before polish and tests
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational is complete, US1, US2, and US4 can proceed in parallel if team capacity allows
- Many service and route implementations marked [P] can be built concurrently as long as shared models are stable


