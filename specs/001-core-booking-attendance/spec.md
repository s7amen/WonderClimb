# Feature Specification: WonderClimb Core Booking & Attendance MVP

**Feature Branch**: `[001-core-booking-attendance]`  
**Created**: 2025-11-18  
**Status**: Draft  
**Input**: Backend-first web app for a climbing gym to manage roles, climbers, training sessions, bookings, memberships, attendance, progress notes, and financials.  
MVP focus: parents book trainings for kids; users may also be climbers and manage their own trainings; coaches check attendance. Future: richer memberships, payments, cash desk, coach payouts, and gym management.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parent manages children and basic profile (Priority: P1)

A parent can manage their own account and add one or more children (climbers) to their profile so that they can book those children into training sessions.

**Why this priority**: Without linking children to the parent, booking is impossible or unsafe. This is foundational for all kid-focused functionality.

**Independent Test**:  
Create a parent account, add one or more climber profiles under that parent, edit child details, and verify that the parent can only see and manage their own children.

**Acceptance Scenarios**:

1. **Given** a parent is authenticated, **When** they open "My climbers" and add a new child with basic details (firstName, lastName, dateOfBirth, optional notes), **Then** the system MUST create an inactive User profile (climber) linked to that parent via ParentClimberLink.

2. **Given** a parent has one or more child profiles, **When** they view their children list, **Then** they MUST only see their own children and be able to edit or deactivate a child profile (within club rules).

3. **Given** another parent exists in the system, **When** the first parent is logged in, **Then** they MUST NOT be able to see or manage the other parent’s child profiles.

---

### User Story 2 - Parent books child into one or multiple training sessions (Priority: P1)

A parent logs in, selects one of their children, and books them into training sessions—either as a single booking or as multiple recurring bookings (e.g., every Monday and Thursday), respecting capacity and a configured booking horizon.

**Why this priority**: This is the core value for parents and a central business process for the gym.

**Independent Test**:  
With a test parent and child plus sample sessions, verify that the parent can book single and multi-date sessions within allowed dates, cannot overbook capacity, and cannot book past the maximum allowed days in advance.

**Acceptance Scenarios**:

1. **Given** a parent is authenticated and has at least one child profile, **When** they open “Available sessions”, select a future session, select a child, and confirm, **Then** a booking MUST be created and visible in “My bookings” for that child.

2. **Given** a parent has already booked a specific child into a session, **When** they attempt to book that same child into the same session again, **Then** the system MUST prevent the duplicate and show a clear message.

3. **Given** a session has reached its capacity, **When** a parent attempts to book a child into that session, **Then** the system MUST prevent the booking and show that the session is full (future: may offer waitlist).

4. **Given** a gym configuration for “maximum days in advance bookings” (default 30 days, configurable per gym), **When** a parent attempts to book a session beyond this horizon, **Then** the system MUST block the booking and show an explanation.

5. **Given** a parent sees a weekly calendar of training sessions (calendar view), **When** they select “every Monday and Thursday at 18:00” for a given date range for a child, **Then** the system MUST create bookings for all matching future sessions within the booking horizon and capacity constraints, skipping full or non-existing sessions and clearly summarizing the result.

6. **Given** a parent has an existing booking, **When** they cancel the booking within the allowed cancellation window (default 4 hours before session start, configurable per gym), **Then** the booking status MUST change to “cancelled”, capacity updated, and the change reflected in “My bookings”.

---

### User Story 3 - User as self-managed climber (Priority: P2)

A user may be both a parent and a climber (or just a climber) and can manage their own climber profile, memberships, and training registrations.

**Why this priority**: Some climbers are adults or older youths who manage their own schedules and payments; the system must support combined roles without duplication.

**Independent Test**:  
Create a user who is both parent and climber; verify that they can see their own climber profile, book themselves into sessions, and manage their own data, while still managing children’s bookings if applicable.

**Acceptance Scenarios**:

1. **Given** a user is marked as having a climber profile linked to their account, **When** they log in, **Then** they MUST see “My trainings” and “My profile” views for themselves, in addition to any parent features they have.

2. **Given** a user is only a climber (no children), **When** they log in, **Then** they MUST be able to book sessions for themselves but MUST NOT see parent-specific UI for managing children.

3. **Given** a user is both parent and climber, **When** they book sessions, **Then** they MUST be able to choose whether they’re booking for themselves or for one of their children, with clear labeling.

---

### User Story 4 - Coach manages today’s sessions and attendance (Priority: P1)

A coach logs in, sees a “Today’s sessions” view with rosters for each assigned session, and can mark each climber as present/absent quickly (mobile-friendly).

**Why this priority**: Reliable attendance is critical for safety, reporting, and membership usage. Coaches must be able to operate during busy gym times with minimal friction.

**Independent Test**:  
Can be tested by creating a coach account assigned to one or more sessions, verifying that they see only their sessions for the day, can open a roster, and mark attendance for each enrolled child, with the data persisted and visible later in reports or parent views.

**Acceptance Scenarios**:

1. **Given** a coach is authenticated and assigned to at least one session today, **When** they open the “Today’s sessions” view, **Then** they MUST see a list of today’s sessions with basic details (time, group name, number of booked climbers).

2. **Given** a coach opens a specific session, **When** they view the roster, **Then** they MUST see all booked climbers with clear controls to mark each as present or absent.

3. **Given** a coach marks a climber as present, **When** they save attendance, **Then** the attendance status MUST be persisted and reflected in the system, and MUST not be silently lost on refresh.

4. **Given** a coach has no assigned sessions today, **When** they open “Today’s sessions”, **Then** the system SHOULD clearly show that there are no sessions instead of an error.

---

### User Story 5 - Admin configures sessions and calendar (Priority: P2)

An admin creates and manages training sessions, which appear in a global calendar (for admins, and in filtered form for parents/coaches), and assigns coaches with per-session pay.

**Why this priority**: Session configuration feeds the calendar, booking, attendance, and later financial reporting. Coach assignment and payout info are captured at the session level.

**Independent Test**:  
Create/edit sessions, verify they appear in the calendar view, that parents/coaches see only relevant subsets, and that coach rate and payout status are recorded for each session.

**Acceptance Scenarios**:

1. **Given** an admin is authenticated, **When** they create a new session with date, time, duration, capacity, status, assigned coach(es), and a coach payout amount, **Then** the session MUST appear in the admin calendar and relevant user views.

2. **Given** an admin has many sessions scheduled, **When** they open the training calendar (month/week/day views), **Then** they MUST see all sessions with basic meta data and be able to filter (by coach, group, location, etc. in future).

3. **Given** a session has associated coach payout info (amount per session and status “unpaid/paid”), **When** the admin or cash desk marks the payout as paid at month end, **Then** the payout status MUST update and be visible in coach financial summaries.

---

### User Story 6 - Cash Desk / Financial overview for trainings *(Future, Priority: P3)*

A staff member at the "Cash Desk" (касата) or admin can see income and expenses related to training sessions: revenue from trainings/cards/individual sessions and payout obligations to coaches.

**Why this priority**: Important for business management, but can be introduced after core booking/attendance works well.

**Independent Test**:  
With sample data for sessions, prices, and coach payouts, verify that the cash desk view shows totals for a period (e.g., month) and that changing session attendance or payout status affects the numbers correctly.

**Acceptance Scenarios** (future):

1. View monthly summary of revenue from trainings, memberships/cards, and individual sessions.
2. View monthly summary of amounts owed to each coach, based on per-session rates and attendance (eventually).
3. Mark coach payouts as paid and see updated balances.

---

### User Story 7 - Admin manages users and roles (Priority: P2)

An admin can view all registered users, edit user data, and manage user roles. The "Climbers" page is accessible to Admin, Coach, and Instructor roles for viewing all registered users. Only admins can edit user data and manage roles. Every registered user automatically receives the "Climber" role upon registration, and users cannot select roles during registration.

**Why this priority**: User management is essential for administrative control and proper role assignment. Automatic assignment of the Climber role simplifies registration while ensuring all users have a base role.

**Independent Test**:  
Create multiple test users, verify that each automatically receives the Climber role, then as an admin, coach, or instructor, verify access to the "Climbers" page. As an admin, verify ability to edit user data and change roles. As a coach or instructor, verify that editing and role management are blocked.

**Acceptance Scenarios**:

1. **Given** a user registers with email, password, firstName, lastName (and optionally middleName), **When** the registration completes, **Then** the system MUST automatically assign the "Climber" role to the new user, and the user MUST NOT be able to select roles during registration.

2. **Given** a user with Admin, Coach, or Instructor role is authenticated, **When** they navigate to the "Climbers" page, **Then** they MUST see a list of all registered users with their basic information (firstName, middleName, lastName, email, roles, phone, accountStatus, isTrainee, dateOfBirth, notes).

3. **Given** an admin views a user on the "Climbers" page, **When** they edit the user's data (firstName, middleName, lastName, email, phone), **Then** the system MUST update the user's information and reflect the changes immediately.

4. **Given** a Coach or Instructor views a user on the "Climbers" page, **When** they attempt to edit the user's data, **Then** the system MUST prevent this action and show that only admins can edit user data.

5. **Given** an admin is viewing a user, **When** they change the user's roles to include multiple roles (e.g., Admin, Coach, Climber, Instructor), **Then** the system MUST update the user's roles and the user MUST have access to all features associated with their assigned roles. Note: There is no separate "parent" role - parents are Users with linked children via ParentClimberLink.

6. **Given** a Coach or Instructor attempts to change a user's roles, **When** they try to save, **Then** the system MUST prevent this action and show that only admins can manage user roles.

7. **Given** an admin attempts to remove all roles from a user, **When** they try to save, **Then** the system MUST prevent this action and show an error message, as a user MUST have at least one role.

---

### Edge Cases

- Booking a session in the past MUST be blocked with a clear message.
- If two parents attempt to book the last available spot simultaneously, only one booking MUST succeed; the other MUST receive a "session full" message.
- If connectivity is flaky on a coach device while marking attendance, the system MUST avoid silently losing already-saved data; errors MUST be shown and retries or rollbacks SHOULD be handled explicitly.
- If a coach has no sessions today, the "Today's sessions" view SHOULD show an informative empty state rather than an error.
- If an admin attempts to delete or deactivate a session with existing bookings, deletion SHOULD be blocked or require explicit confirmation; data consistency MUST be preserved.
- When a user registers, the system MUST automatically assign the "Climber" role regardless of any input data; users cannot select or influence their initial role assignment.
- If an admin attempts to remove all roles from a user, the system MUST prevent this action and require at least one role to remain assigned.
- If an admin attempts to edit a user's email to an email that already exists in the system, the system MUST prevent this and show a clear error message.

## Requirements *(mandatory)*

### Functional Requirements

**Core roles and profiles**

- **FR-001**: System MUST support user authentication with secure password storage and token-based sessions (e.g., JWT), with roles: admin, coach, climber, instructor (roles can be combined). Note: There is no separate "parent" role - parents are Users (typically with climber role) who have children linked via ParentClimberLink.
- **FR-002**: System MUST allow parents to create and manage child User profiles (climbers) linked to their account (add/edit/deactivate). Child accounts are created as inactive Users without email/password and can be activated later.
- **FR-003**: System MUST use a unified User model where all climbers are Users. A user can be both a parent (with linked children) and a climber (for themselves) where applicable.
- **FR-060**: System MUST automatically assign the "Climber" role to every newly registered user. Users MUST NOT be able to select roles during registration; the registration form MUST NOT include role selection checkboxes or fields.
- **FR-061**: System MUST provide a "Climbers" page accessible to Admin, Coach, and Instructor roles that displays all registered users with their basic information (name, email, roles, phone if available). Only admins can edit user data and manage roles.
- **FR-062**: System MUST allow admins to edit user data (name, email, phone) for any registered user.
- **FR-063**: System MUST allow admins to change user roles. A user can have multiple roles simultaneously (Admin, Coach, Climber, Instructor). The system MUST ensure that a user always has at least one role assigned.

**Sessions, calendar, and booking**

- **FR-010**: System MUST allow admins to create, edit, and list training sessions with fields: date, start time, duration, capacity, status, assigned coaches, and per-session coach payout amount.
- **FR-011**: System MUST provide a calendar view of sessions for admins (full view) and tailored views for parents/coaches (only relevant sessions).
- **FR-012**: System MUST allow parents and self-managed climbers to book sessions for themselves or their children, enforcing capacity and preventing duplicate bookings per climber/session.
- **FR-013**: System MUST support multi-session/recurring bookings (e.g., every Monday and Thursday) within a configured booking horizon, skipping sessions that are full or do not exist and summarizing successes/failures. The default maximum booking horizon is 30 days and MUST be configurable per gym.
- **FR-014**: System MUST allow bookings to be cancelled (subject to club rules) only within a configurable cancellation window (default 4 hours before session start), updating status and capacity.

**Attendance and roles**

- **FR-020**: System MUST allow coaches to view “Today’s sessions” and per-session rosters, and to mark attendance (present/absent) for each climber, storing this data persistently.
- **FR-021**: Role-based access control MUST ensure that:
  - Parents (Users with linked children via ParentClimberLink) see only their children's data and bookings.
  - Climbers see only their own data and bookings.
  - Coaches and Instructors can view the "Climbers" page to see all registered users, but see only assigned sessions and their rosters for session-related data (no access to other families' sensitive data beyond what is necessary).
  - Admins can view and manage all relevant data, including editing user data and managing roles.

**Financial and pricing (partial in MVP, extended later)**

- **FR-030** (MVP, partial): System MUST store a per-session coach payout amount and a payout status (“unpaid”/“paid”) for each session and allow updating status.
- **FR-031** (Future): System SHOULD support a price list page for trainings, passes/cards, and individual sessions, configurable by admin.
- **FR-032** (Future): System SHOULD support a cash desk / financial overview module showing incomes and expenses related to trainings and coach payouts for a selected period.

**Architecture and modules**

- **FR-040**: The application architecture MUST distinguish at least two logical modules:
  - **Training Manager**: sessions, bookings, attendance, coach profiles and payouts.
  - **Gym Manager**: broader gym-level configuration, price lists, financial summaries, and other operational data.S
- **FR-041**: Shared data (e.g., users, sessions) MUST be modeled once and reused across both modules, avoiding duplication. Note: The system uses a unified User model - there is no separate climbers collection.

**Extensibility**

- **FR-050**: APIs for sessions, bookings, attendance, and basic financial info MUST be designed so a mobile app or public website can be added later without major backend rewrites.

### Key Entities *(include if feature involves data)*

- **User**: Unified model representing anyone in the system (adults and children). Fields: id, firstName, middleName, lastName, email (optional for inactive child accounts), passwordHash (optional for inactive child accounts), phone, roles (admin/coach/climber/instructor - no separate "parent" role), accountStatus (active/inactive), isTrainee, dateOfBirth, notes, photo, photoHistory, clubMembership. Every new user automatically receives the "Climber" role upon registration, and users cannot select roles during registration. Parents are Users with linked children via ParentClimberLink.
- **Parent–Climber Link**: Relationship between a parent User and one or more child Users (climbers). Both parentId and climberId reference the users collection.
- **CoachProfile**: Extends User for coaches; includes fields like defaultRate, currency, and notes.
- **Session**: Training session with date, time, duration, capacity, status, assigned coaches, and coach payout information (amount per session and payout status).
- **Booking**: Links a User (climber) to a Session with fields: status (booked/cancelled), createdAt, cancelledAt, bookedBy (which user).
- **AttendanceRecord**: Represents attendance for a User (climber) in a Session (present/absent, markedBy, timestamp).
- **PriceListItem** (future): Price configuration item for trainings, passes/cards, and individual sessions.
- **CashRecord** (future): Financial entry representing income or expense associated with sessions, memberships, or coach payouts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of test parents can successfully add a child and book them into at least one session on first attempt.
- **SC-002**: Coaches can load “Today’s sessions” and mark attendance for 10–20 climbers in under 2 minutes on a typical mobile device.
- **SC-003**: Booking, calendar, and attendance API endpoints maintain p95 response time under 300 ms under expected gym load.
- **SC-004**: Zero duplicate bookings per child/session are observed in production after launch.
- **SC-005**: No unauthorized access incidents (parents seeing other families’ data, coaches seeing unrelated sensitive info) are detected in pre-launch testing.

### Safety, Privacy, and Financial Readiness

- **SC-006**: All personal data is accessed only via role-based checks, and automated tests cover at least all critical booking and attendance endpoints.
- **SC-007**: No sensitive information (passwords, payment details, full addresses) is logged in plaintext; logs use pseudonymous identifiers where necessary.
- **SC-008**: Coach payout data for sessions is accurate enough to generate a monthly payout summary with no manual correction needed in at least 90% of test cases (once cash desk features are implemented).
- **SC-009**: API boundaries and entities are documented so that a mobile client or future “Gym Manager” module can integrate without schema-breaking changes for the core Training Manager functionality.

## Clarifications

### Session 2025-11-18

- Q: What is the maximum booking horizon for parents, and is it configurable? → A: Parents can book up to 30 days in advance, configurable per gym.
- Q: What is the cancellation rule for bookings in MVP? → A: Cancellation allowed up to 4 hours before session start, configurable per gym.
