# Implementation Plan: WonderClimb Core Booking & Attendance MVP

**Branch**: `001-core-booking-attendance` | **Date**: 2025-11-18 | **Spec**: `specs/001-core-booking-attendance/spec.md`
**Input**: Feature specification from `/specs/001-core-booking-attendance/spec.md`

**Note**: This plan is aligned with the WonderClimb Constitution (code quality, testing, UX, performance, observability, and data protection) and the chosen stack: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt.

## Summary

Backend-first MVP for WonderClimb that enables:

- Parents to manage child climber profiles and book single or recurring training sessions within a configurable booking horizon (default 30 days).
- Users to also act as climbers and book/manage their own trainings.
- Coaches to see “Today’s sessions” and record attendance on mobile-friendly views.
- Admins to configure training sessions, calendar views, and per-session coach payout amounts (with paid/unpaid status).

Technical approach:

- API-first Node.js + Express REST service under `/api/v1/...`, using MongoDB via Mongoose for persistence.
- JWT-based authentication with bcrypt password hashing and role-based access control (admin, coach, parent, climber).
- Modular backend structure separating Training Manager and Gym Manager domains while sharing core entities (User, Climber, Session, Booking, Attendance).
- Design APIs and data model to be reusable for a future React admin panel and React Native/Expo mobile apps.

## Technical Context

**Language/Version**: Node.js (LTS, e.g., 20.x)  
**Primary Dependencies**: Express, Mongoose, jsonwebtoken, bcrypt, dotenv, pino (structured logging)  
**Storage**: MongoDB hosted on MongoDB Atlas with automated daily backups  
**Testing**: Jest + Supertest for unit and integration tests, using MongoMemoryServer or a dedicated test database  
**Target Platform**: Backend on Linux server or containerized environment; future React admin panel and React Native clients consume the API  
**Project Type**: Web backend API with future web/mobile clients  
**Performance Goals**: Core booking, calendar, and attendance endpoints maintain p95 latency under 300 ms under expected gym load (aligned with spec SC-003 and Constitution performance principle)  
**Constraints**: Protect children’s personal data (GDPR-friendly), role-based access control, mobile-first usage patterns for coaches, booking horizon (default 30 days) and cancellation window (default 4 hours before session start), no logging of sensitive data  
**Scale/Scope**: Single gym initially (single-tenant), with support for hundreds to low thousands of users and sessions; architecture should not block multi-gym support later

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality & Domain Safety**  
  - Gate: Core entities (User, Climber, Session, Booking, Attendance, CoachProfile) MUST be explicitly modeled with clear validation rules and state transitions.  
  - Gate: Business rules (booking horizon, cancellation window, capacity, role checks) MUST live in dedicated domain/service layers, not scattered through controllers.

- **Testing Discipline for Critical Flows**  
  - Gate: Unit tests for domain rules (capacity enforcement, duplicate booking prevention, booking horizon, cancellation window).  
  - Gate: Integration tests for key flows: parent booking/cancel, coach attendance update, admin session management.  
  - Gate: At least one end-to-end-style integration test per primary user story (parent booking, coach attendance, admin session config).

- **Consistent Role-Based User Experience (API-level)**  
  - Gate: APIs MUST enforce role-based access so parents see only their children, climbers see their own data, coaches see only assigned sessions, and admins see/manage all.  
  - Gate: API responses MUST provide clear status and error messages suitable for mobile and web clients (no ambiguous errors).

- **Performance & Reliability at the Gym**  
  - Gate: API design and data access patterns MUST avoid N+1-style query patterns and SHOULD use indexes on key fields (user, session date/time, role relations).  
  - Gate: Timeouts and basic error handling MUST be in place for MongoDB operations; failures MUST return clear error responses.

- **Observability & Continuous Improvement**  
  - Gate: Structured logging MUST capture key events (auth attempts, session creation, bookings, cancellations, attendance updates, payout status changes) without logging sensitive data.  
  - Gate: Basic metrics (error rates, request latency per endpoint) SHOULD be designed for, even if full monitoring stack is added later.

- **Performance, Security, and Data Protection**  
  - Gate: Passwords MUST be hashed with bcrypt; JWT secrets MUST come from environment config.  
  - Gate: All APIs MUST be designed for HTTPS termination; no personal or payment data in logs.  
  - Gate: Booking and attendance endpoints MUST enforce role-based authorization and input validation to avoid unsafe states.

Assumption: No gates are intentionally violated for this feature; if a deviation is needed, it must be recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-booking-attendance/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/          # env, database connection, app config (booking horizon, cancellation window, roles)
│   ├── models/          # Mongoose models (User, Climber, Session, Booking, Attendance, CoachProfile, etc.)
│   ├── services/        # Domain/services (booking service, attendance service, session management, auth)
│   ├── modules/
│   │   ├── training/    # Training Manager domain (sessions, bookings, attendance, coach payouts)
│   │   └── gym/         # Gym Manager domain (price lists, future cash desk, configuration)
│   ├── routes/          # Express route definitions (REST endpoints under /api/v1/...)
│   ├── middleware/      # Auth, role-based access control, validation, error handling
│   └── app.ts/js        # Express app bootstrap
└── tests/
    ├── unit/            # Unit tests for domain logic and services
    ├── integration/     # API-level tests using Supertest and in-memory/test MongoDB
    └── contract/        # Optional contract tests aligned with OpenAPI contracts
```

**Structure Decision**:  
Single backend project (`backend/`) exposing a REST API for all clients. Logical separation between Training Manager and Gym Manager is implemented via `modules/` and service boundaries, not separate services. Tests are grouped by type (unit, integration, contract) and aligned with the WonderClimb Constitution testing principles.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
|           |            |                                       |


