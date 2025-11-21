<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles: none (initial definition for this project)
- Added sections:
  - Core Principles (5 WonderClimb-specific principles)
  - Performance, Security, and Data Protection Standards
  - Development Workflow, Review Process, and Quality Gates
  - Governance
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

Rationale: the club is a trusted custodian of children’s data; poor security or
performance directly harms trust and can create legal risk.

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

**Version**: 1.0.0 | **Ratified**: 2025-11-18 | **Last Amended**: 2025-11-18

