<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0
- Modified principles: none
- Added sections:
  - Standard Resource Structure (Sessions, Climbers, Competitions) - specific routing pattern for core resources
  - Current State Analysis - documentation of which routes follow the standard and which need migration
- Removed sections: none
- Templates requiring updates (status):
  - .specify/templates/plan-template.md ✅ aligned (no changes required)
  - .specify/templates/spec-template.md ✅ aligned (no changes required)
  - .specify/templates/tasks-template.md ✅ aligned (no changes required)
  - .specify/templates/checklist-template.md ✅ aligned (no changes required)
  - .specify/templates/agent-file-template.md ✅ aligned (no changes required)
- Deferred TODOs: none
-->

# WonderClimb Constitution

## Core Principles

### I. Code Quality & Domain Safety

WonderClimb code MUST be readable, maintainable, and safe-by-design, especially where it
handles children’s identities, attendance, and emergency information.

- Code MUST favor clarity over cleverness: small focused functions, clear module
  boundaries, and descriptive naming for domain concepts such as climbers, parents,
  coaches, sessions, routes, grades, and payments.
- Domain rules (age categories, group capacity, eligibility, safety constraints, and
  progression criteria) MUST live in well-structured, test-covered domain services, not
  scattered across UI components or incidental helpers.
- Strong typing or explicit schemas MUST be used for all core data structures and API
  contracts, avoiding loosely shaped “any”-style payloads in critical logic.
- All changes that touch children’s data, payments, or safety-related flows MUST be
  reviewed by at least one other contributor.

Rationale: clean, explicit domain modeling and review reduce the risk of logic mistakes
that could affect child safety, schedule integrity, or billing accuracy.

### II. Testing Discipline for Critical Flows

Testing for WonderClimb MUST prioritize safety, correctness, and financial integrity for
the climbing club and families.

- Unit tests MUST cover domain rules such as age grouping, capacity limits, waitlist
  promotion, and progression logic for kids’ training levels.
- Integration tests MUST cover core system interactions: booking and canceling sessions,
  attendance recording, payment or invoicing flows, and parental notifications.
- At least one end-to-end (E2E) test MUST exist for each primary user journey:
  - Parent registering a child and booking them into a class.
  - Coach managing today’s sessions and marking attendance.
  - Admin configuring seasons, groups, and capacities.
- Any bug in safety, schedule integrity, or billing MUST result in a regression test
  before the fix is merged.
- The test suite SHOULD remain fast enough to run routinely during development and MUST
  pass in continuous integration before deployment.

Rationale: the system is trusted by parents, children, and coaches; breaking core
workflows or mis-handling payments is unacceptable.

### III. Consistent Role-Based User Experience

WonderClimb UX MUST be simple, predictable, and role-aware so that parents, coaches, and
admins can operate confidently—even on a busy gym floor.

- The application MUST provide role-specific views and actions:
  - Parents see their children, upcoming sessions, bookings, and relevant notifications.
  - Coaches see today’s groups, rosters, and tools for attendance and notes.
  - Admins see season setup, capacities, billing overviews, and high-level reports.
- A shared design system (typography, colors, spacing, buttons, forms, feedback
  states) MUST be used across screens to ensure consistency.
- All user-visible actions (booking, canceling, editing groups, marking attendance)
  MUST provide clear success, failure, and loading feedback.
- Mobile-first behavior is REQUIRED: key flows MUST be fully usable on typical
  smartphone screen sizes with properly sized tap targets and readable text.
- Accessibility SHOULD be respected where feasible: adequate contrast, clear focus
  states, and keyboard-accessible primary flows.

Rationale: consistent, role-tuned UX reduces errors, support load, and training time for
staff and families.

### IV. Performance & Reliability at the Gym

WonderClimb MUST remain responsive and reliable during real-world usage peaks (e.g.,
before sessions start or when new seasons open).

- Core interactions (navigation, opening a session, loading a child profile, marking
  attendance) SHOULD have perceived latency under 100 ms and MUST keep p95 latency under
  300 ms under expected load.
- Data-heavy screens (session lists, attendance history, rosters, leaderboards) MUST use
  pagination, filtering, or other techniques to avoid loading unnecessary data.
- Offline or flaky connectivity scenarios (e.g., coach’s phone at the wall) SHOULD be
  handled gracefully, with queued actions or clear messaging when immediate sync fails.
- For safe operations such as marking attendance, optimistic UI MAY be used, but errors
  MUST be surfaced clearly and reconciled with server truth.
- Backend services MUST define sensible timeouts and retries for critical dependencies,
  and failures MUST degrade gracefully with clear user-facing messages.

Rationale: the app is often used right before or during sessions; slow or unreliable
behavior directly disrupts classes and parent trust.

### V. Observability & Continuous Improvement

WonderClimb MUST be observable so that issues affecting kids, parents, or coaches can be
detected and resolved quickly.

- Structured logging MUST capture key lifecycle events: bookings and cancellations,
  attendance changes, payment attempts and outcomes, and configuration changes to
  seasons, groups, and capacities.
- Metrics SHOULD track error rates, latency, and usage for critical flows such as
  booking, attendance, and payments.
- Sensitive personal data (addresses, contact details, payment identifiers) MUST NOT be
  logged; identifiers MUST be pseudonymous where possible.
- Dashboards or reports SHOULD be maintained so that admins can monitor health and
  detect anomalies in usage or failures.
- When incidents occur that impact safety, schedule integrity, or billing, a brief
  retrospective MUST be recorded and used to improve tests, monitoring, or processes.

Rationale: observability ensures that problems do not stay hidden and that the system
improves with each incident.

## Performance, Security, and Data Protection Standards

WonderClimb is responsible for managing data about children, parents, and financial
transactions for the climbing club; performance and security requirements are therefore
non-negotiable.

- Personal data MUST be stored and transmitted using industry-standard encryption
  mechanisms appropriate for the chosen technology stack.
- Access to sensitive data (children’s profiles, emergency contacts, payment details)
  MUST be protected via authentication and role-based authorization.
- Features MUST be designed with the principle of least privilege; users see only the
  data and actions needed for their role.
- Data retention and deletion policies SHOULD be defined in line with local regulations
  and club policy, and implemented in a way that is auditable.
- Performance budgets (e.g., p95 latency, memory use, response size) SHOULD be defined
  for core endpoints and tracked over time.
- Any third-party services used for messaging, analytics, or payments MUST be evaluated
  for compliance and security posture before integration.

Rationale: the club is a trusted custodian of children's data; poor security or
performance directly harms trust and can create legal risk.

## Routing Conventions

WonderClimb MUST follow consistent routing patterns for both frontend routes and backend API endpoints to ensure clarity, maintainability, and predictable behavior across the application.

### Frontend Routes

- **Resource naming**: Routes MUST use **plural form** (e.g., `/competitions`, `/sessions`) for collections, following standard REST conventions:
  - Example: `/competitions` for public competition listing (collection of competitions)
  - Example: `/competitions/:id` for public competition details (single competition from collection)
- **Public routes**: Publicly accessible pages (no authentication required) MUST use the base resource path without prefix:
  - Example: `/competitions` for public competition listing
  - Example: `/competitions/:id` for public competition details
- **Admin routes**: Administrative pages (protected for admin/coach roles) MUST use `/admin/` prefix:
  - Example: `/admin/competitions` for admin competition management
  - Example: `/admin/competitions/:id` for admin competition details
- **Coach routes**: Coach-specific pages MUST use `/coach/` prefix:
  - Example: `/coach/sessions` for coach session management
  - Example: `/coach/attendance` for coach attendance tracking
- **Route migration**: When restructuring routes, old routes MUST NOT use redirects. All links, navigation, and references MUST be updated directly to the new routes. This ensures clean URLs and avoids legacy redirect chains.

### Backend API Routes

- **Resource naming**: API endpoints MUST use **plural form** matching frontend routes and standard REST conventions:
  - Example: `/api/v1/competitions` (not `/api/v1/competition`)
  - Example: `/api/v1/sessions` (not `/api/v1/session`)
- **Public API endpoints**: Publicly accessible endpoints (no authentication required) MUST use the base resource path:
  - Example: `GET /api/v1/competitions` for public competition listing
  - Example: `GET /api/v1/competitions/:id` for public competition details
- **Admin API endpoints**: Administrative endpoints (protected for admin/coach roles) MUST use `/admin/` prefix:
  - Example: `GET /api/v1/admin/competitions` for admin competition listing
  - Example: `POST /api/v1/admin/competitions/import` for importing competitions
  - Example: `PUT /api/v1/admin/competitions/:id` for updating competitions
- **Coach API endpoints**: Coach-specific endpoints MUST use `/coaches/` prefix:
  - Example: `GET /api/v1/coaches/me/sessions/today` for coach's today sessions
  - Example: `GET /api/v1/coaches/me/sessions/:id/roster` for session roster

### Standard Resource Structure (Sessions, Climbers, Competitions)

For core resources that have both public and administrative views (sessions, climbers, competitions), the following structure MUST be followed:

1. **Public routes** (no authentication required):
   - `/sessions` - публичен списък със сесии
   - `/climbers` - публичен списък с катерачи (ако е приложимо)
   - `/competitions` - публичен списък със състезания

2. **Admin routes** (protected for admin role, sometimes also coach):
   - `/admin/sessions` - админ управление на сесии (достъпно за admin и coach)
   - `/admin/climbers` - админ управление на катерачи (достъпно за admin и coach)
   - `/admin/competitions` - админ управление на състезания (достъпно за admin и coach)

3. **Coach routes** (protected for coach role):
   - `/coaches/sessions` - треньорски преглед на сесии (или `/coach/sessions` ако е под `/coach` layout)
   - `/coaches/climbers` - треньорски преглед на катерачи (ако е приложимо)
   - `/coaches/competitions` - треньорски преглед на състезания (ако е приложимо)

**Note**: Some admin routes (`/admin/sessions`, `/admin/climbers`, `/admin/competitions`) MAY be accessible to both admin and coach roles when the functionality is shared. Coach-specific views SHOULD use `/coaches/` prefix for consistency, but MAY use `/coach/` prefix when nested under a coach layout (e.g., `/coach/dashboard`, `/coach/sessions`).

### Current State Analysis

**Routes following the standard structure:**
- ✅ `/competitions` - публично (без автентикация)
- ✅ `/admin/competitions` - админ управление (admin + coach)

**Routes NOT following the standard structure (need migration):**
- ❌ `/sessions` - текущо защитено за admin+coach, трябва да бъде публично
- ❌ `/admin/sessions` - текущо redirect към `/sessions`, трябва да бъде самостоятелен route
- ❌ `/coach/todays-sessions` - текущо използва `/coach/todays-sessions`, трябва да бъде `/coaches/sessions` или `/coach/sessions`
- ❌ `/climbers` - текущо защитено за admin+coach+instructor, трябва да се определи дали трябва да бъде публично или да се премести на `/admin/climbers`
- ❌ `/admin/climbers` - текущо redirect към `/climbers`, трябва да бъде самостоятелен route

**Migration required:**
1. Sessions: `/sessions` → публично, `/admin/sessions` → админ управление, `/coaches/sessions` → треньорски преглед
2. Climbers: Определи дали `/climbers` трябва да бъде публично или да се премести на `/admin/climbers`
3. Competitions: Вече следва стандарта ✅

### Examples

**Competitions:**
- Public: `/competitions` → `GET /api/v1/competitions`
- Admin: `/admin/competitions` → `GET /api/v1/admin/competitions`

**Sessions:**
- Public: `/sessions` → `GET /api/v1/sessions`
- Admin: `/admin/sessions` → `GET /api/v1/admin/sessions`
- Coach: `/coaches/sessions` (or `/coach/sessions`) → `GET /api/v1/coaches/me/sessions/today`

**Climbers:**
- Admin: `/admin/climbers` → `GET /api/v1/admin/climbers`
- Coach: `/coaches/climbers` (if applicable) → `GET /api/v1/coaches/me/climbers`

Rationale: consistent routing patterns make the codebase easier to navigate, reduce cognitive load for developers, and ensure that both frontend and backend follow the same logical structure. Plural form follows standard REST conventions where collections are represented as plural nouns (e.g., `/users`, `/posts`, `/competitions`), making the API more intuitive and consistent with industry best practices.

## Development Workflow, Review Process, and Quality Gates

Development for WonderClimb MUST align with the principles above through clear,
repeatable workflow and quality checks.

- Every feature MUST start from a written specification (using the project spec and plan
  templates) that identifies primary user journeys and testability.
- Pull requests MUST document which principles are most relevant (e.g., safety, testing,
  UX, performance) and how they are addressed in the change.
- Code touching core workflows (bookings, attendance, payments, role-based access)
  MUST undergo at least one peer review that explicitly considers tests, UX clarity, and
  performance impact.
- Automated checks (linting, tests, type checks) MUST pass before merging into main
  branches.
- When a feature cannot fully meet a principle (e.g., temporary performance compromise),
  the deviation MUST be documented along with a clear remediation plan and timeline.

Rationale: a disciplined workflow and explicit gates keep the product aligned with its
principles as the system grows.

## Governance

- This Constitution defines non-negotiable standards for WonderClimb’s architecture,
  implementation, and operations; it supersedes ad-hoc practices or preferences.
- Any contributor proposing changes that materially affect principles, workflow, or
  governance MUST describe the impact and required version bump in their proposal.
- Constitution changes that add or materially expand principles MUST trigger at least a
  MINOR version bump; breaking or removing principles MUST trigger a MAJOR bump;
  clarifications or small wording fixes MAY use a PATCH bump.
- When the Constitution is amended, all dependent templates (plan, spec, tasks,
  checklists, agent guidance) MUST be reviewed for alignment and updated if required.
- Feature plans and specifications MUST reference the relevant principles in their
  “Constitution Check” or equivalent sections to make compliance explicit.
- At regular intervals (e.g., each release cycle), the team SHOULD review whether the
  Constitution still reflects real practice and adjust it through the amendment process
  if needed.

**Version**: 1.2.0 | **Ratified**: 2025-11-18 | **Last Amended**: 2025-01-27

