# Data Model: WonderClimb Core Booking & Attendance MVP

This document outlines the MongoDB/Mongoose data model for the core MVP.

## User

Represents anyone in the system - adults (parents, coaches, admins) and children (climbers). Uses a unified model where all climbers are Users.

- **Collection**: `users`

| Field            | Type              | Required | Notes                                                |
|------------------|-------------------|----------|------------------------------------------------------|
| _id              | ObjectId          | yes      | Primary key                                          |
| email            | string            | no       | Unique when set, lowercased, sparse index. Can be null for inactive child accounts. |
| passwordHash     | string            | no       | bcrypt hash. Can be null for inactive child accounts. |
| firstName        | string            | yes      | First name                                           |
| middleName       | string            | no       | Middle name (optional)                               |
| lastName          | string            | yes      | Last name                                            |
| phone             | string            | no       | Phone number                                         |
| roles             | [string]          | yes      | Values: `admin`, `coach`, `climber`, `instructor`. Every new user automatically receives `climber` role upon registration. No `parent` role - parents are Users with linked children via ParentClimberLink. |
| accountStatus     | string            | yes      | `active` / `inactive`. Default: `active` for registered users, `inactive` for child accounts created by parents. |
| isTrainee         | boolean           | no       | Indicates if user is a trainee. Default: `false`, set to `true` for child accounts created by parents. |
| dateOfBirth       | Date              | no       | Date of birth, used for age-based group rules       |
| notes             | string            | no       | Coach/parent notes (non-sensitive)                  |
| photo             | string            | no       | URL/path to user photo                               |
| photoHistory      | [string]          | no       | Array of previous photo URLs                         |
| clubMembership    | object            | no       | Membership information: `isCurrentMember` (boolean), `membershipHistory` (array of {year, wasMember}) |
| createdAt         | Date              | yes      | Auto-set                                             |
| updatedAt         | Date              | yes      | Auto-set                                             |

Constraints:

- `email` MUST be unique when set (sparse unique index allows multiple null values).
- At least one role MUST be present.
- Users with `email` and `passwordHash` can log in; child accounts without these fields are inactive until activated by a parent.
- Compound index on `(firstName, lastName, dateOfBirth)` for duplicate detection.

Indexes:

- Sparse unique index on `email` (allows multiple null values).
- Index on `accountStatus`.
- Index on `roles`.
- Index on `dateOfBirth`.
- Compound index on `firstName, lastName, dateOfBirth` for duplicate checking.

## Parent–Climber Link

Represents the relationship between parent Users and child Users (climbers). Both parent and child are Users in the unified model.

- **Collection**: `parent_climber_links`

| Field     | Type     | Required | Notes                          |
|-----------|----------|----------|--------------------------------|
| _id       | ObjectId | yes      | Primary key                    |
| parentId  | ObjectId | yes      | References `users._id` (parent User) |
| climberId | ObjectId | yes      | References `users._id` (child/climber User) |
| createdAt | Date     | yes      | Auto-set                       |
| updatedAt | Date     | yes      | Auto-set                       |

Constraints:

- A parent may link to multiple climbers.
- A climber may link to multiple parents if needed (e.g., two parents).
- Both `parentId` and `climberId` reference the `users` collection.

Indexes:

- Compound index on `parentId, climberId` for efficient parent→climber queries.
- Index on `climberId` for reverse lookups.

## CoachProfile

Coach-specific data for users with `coach` role.

- **Collection**: `coach_profiles`

| Field        | Type     | Required | Notes                                  |
|--------------|----------|----------|----------------------------------------|
| _id          | ObjectId | yes      | Primary key                            |
| userId       | ObjectId | yes      | References `users._id`                 |
| defaultRate  | number   | no       | Default payout amount per session      |
| currency     | string   | no       | Currency code (e.g., `EUR`, `BGN`)     |
| notes        | string   | no       | Internal notes                         |

Constraints:

- `userId` MUST reference a User with role `coach`.

## Session

Represents a training session that can be booked.

- **Collection**: `sessions`

| Field              | Type       | Required | Notes                                                   |
|--------------------|------------|----------|---------------------------------------------------------|
| _id                | ObjectId   | yes      | Primary key                                             |
| title              | string     | yes      | Human-friendly name (e.g., “Kids Level 1 Mon 18:00”)    |
| description        | string     | no       | Optional description                                    |
| date               | Date       | yes      | Start date-time in UTC                                  |
| durationMinutes    | number     | yes      | Duration in minutes                                     |
| capacity           | number     | yes      | Max number of climbers                                  |
| status             | string     | yes      | `active`, `cancelled`                                  |
| coachIds           | [ObjectId] | yes      | References `users._id` (coaches)                        |
| coachPayoutAmount  | number     | no       | Payout per session (total)                              |
| coachPayoutStatus  | string     | no       | `unpaid`, `paid`                                        |
| location           | string     | no       | Optional location/area in gym                           |
| createdAt          | Date       | yes      | Auto-set                                               |
| updatedAt          | Date       | yes      | Auto-set                                               |

Constraints:

- `capacity` MUST be >= 0.
- `coachPayoutStatus` MUST be consistent with financial reporting.

Indexes:

- Compound index on `date, status` (for calendar and "today" queries).
- Index on `status`.
- Index on `coachIds` (for coach queries).

## Booking

Represents a reservation of a User (climber) for a Session.

- **Collection**: `bookings`

| Field       | Type     | Required | Notes                                               |
|-------------|----------|----------|-----------------------------------------------------|
| _id         | ObjectId | yes      | Primary key                                         |
| sessionId   | ObjectId | yes      | References `sessions._id`                           |
| climberId   | ObjectId | yes      | References `users._id` (climber User)               |
| bookedById  | ObjectId | yes      | References `users._id` (who created the booking)    |
| status      | string   | yes      | `booked`, `cancelled`. Default: `booked`            |
| cancelledAt | Date     | no       | Set when status becomes `cancelled`                 |
| createdAt   | Date     | yes      | Auto-set                                            |
| updatedAt   | Date     | yes      | Auto-set                                            |

Constraints:

- Unique compound partial index on `(sessionId, climberId)` for active bookings (`status: 'booked'`) to prevent duplicates.
- Booking creation MUST respect session capacity and booking horizon.
- Booking cancellation MUST respect configured cancellation window.

Indexes:

- Compound partial unique index on `sessionId, climberId` (only for `status: 'booked'`).
- Index on `climberId` (for parent queries).
- Index on `bookedById` (for user booking history).

## AttendanceRecord

Represents attendance for a specific User (climber) in a Session.

- **Collection**: `attendance_records`

| Field      | Type     | Required | Notes                                    |
|------------|----------|----------|------------------------------------------|
| _id        | ObjectId | yes      | Primary key                              |
| sessionId  | ObjectId | yes      | References `sessions._id`                |
| climberId  | ObjectId | yes      | References `users._id` (climber User)    |
| status     | string   | yes      | `present`, `absent`                      |
| markedById | ObjectId | yes      | References `users._id` (coach)           |
| markedAt   | Date     | yes      | Timestamp when attendance was recorded. Default: Date.now |
| createdAt  | Date     | yes      | Auto-set                                 |
| updatedAt  | Date     | yes      | Auto-set                                 |

Constraints:

- Unique compound index on `(sessionId, climberId)` ensures one attendance record per session/climber.

Indexes:

- Compound unique index on `sessionId, climberId`.
- Index on `markedById` (for coach queries).

## PriceListItem (Future)

Price configuration for trainings, passes/cards, and individual sessions.

- **Collection**: `price_list_items`

| Field     | Type     | Required | Notes                                  |
|-----------|----------|----------|----------------------------------------|
| _id       | ObjectId | yes      | Primary key                            |
| name      | string   | yes      | Name (e.g., “Monthly pass”)           |
| type      | string   | yes      | `training`, `card`, `individual`      |
| price     | number   | yes      | Amount                                 |
| currency  | string   | yes      | Currency code                          |
| active    | boolean  | yes      | Whether currently offered              |

## CashRecord (Future)

Represents income or expense related to sessions, memberships, or coach payouts.

- **Collection**: `cash_records`

| Field          | Type     | Required | Notes                                             |
|----------------|----------|----------|---------------------------------------------------|
| _id            | ObjectId | yes      | Primary key                                       |
| type           | string   | yes      | `income` or `expense`                             |
| sourceType     | string   | yes      | `session`, `membership`, `coach_payout`, etc.     |
| sourceRefId    | ObjectId | no       | Reference to related entity (session, payout)     |
| amount         | number   | yes      | Amount                                            |
| currency       | string   | yes      | Currency code                                     |
| occurredAt     | Date     | yes      | Date/time of transaction                          |
| description    | string   | no       | Optional description                              |


