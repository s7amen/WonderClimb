# Research: WonderClimb Core Booking & Attendance MVP

## Context

Backend-first MVP using Node.js, Express, MongoDB (Mongoose), JWT, and bcrypt to support:

- Parent/child management and booking (single and recurring) with booking horizon and cancellation window.
- Coach attendance tracking and admin session configuration with calendar and coach payouts.

This document captures key technical decisions, rationale, and alternatives considered.

## 1. Backend Framework & API Style

**Decision**: Use Node.js (LTS, e.g., 20.x) with Express to build a REST API under `/api/v1/...`.  
**Rationale**:

- Express is widely used, lightweight, and fits well with MongoDB and Mongoose.
- Easy integration with middleware for auth (JWT), validation, logging, and error handling.
- Good ecosystem support (Jest, Supertest, logging libraries, validation libraries like Joi/Zod).

**Alternatives considered**:

- NestJS: more structure and built-in patterns, but heavier and potentially overkill for the initial MVP.
- Fastify: higher performance but less familiar to many developers; Express is sufficient given the expected scale.

## 2. Database & ODM

**Decision**: Use MongoDB with Mongoose ODM.  
**Rationale**:

- Document-oriented model maps well to entities like User, Climber, Session, Booking, and Attendance.
- Mongoose provides schemas, validation hooks, and middleware for enforcing business rules and relationships.
- Fits the initial scale for a single gym, and can be extended for multi-gym later.

**Alternatives considered**:

- PostgreSQL with an ORM: strong relational modeling but more setup and migrations overhead for this MVP, while the domain can be comfortably modeled as documents with references.
- Plain MongoDB driver: more control but lower-level and more boilerplate compared to Mongoose.

**Clarifications**:

- MongoDB will be hosted on MongoDB Atlas (managed cluster) with automated daily backups.
- Initial indexes will include: unique `users.email`, `sessions.date`, compound `(sessionId, climberId)` on `bookings`, and compound `(sessionId, climberId)` on `attendance_records`. Additional indexes can be added based on observed queries.

## 3. Authentication & Authorization

**Decision**: JWT-based auth with bcrypt for password hashing and explicit role-based access control.  
**Rationale**:

- JWTs allow stateless auth suitable for web and mobile clients.
- bcrypt is a standard choice for securely hashing passwords.
- Role-based access (admin, coach, parent, climber) maps directly to the domain and Constitution’s security requirements.

**Alternatives considered**:

- Session-based auth: simpler for server-rendered apps but less convenient for mobile clients and distributed deployments.
- OAuth/social login: valuable later, but out of scope for the first MVP.

## 4. Testing Strategy

**Decision**: Use Jest for unit tests and integration tests (with Supertest for HTTP tests).  
**Rationale**:

- Jest is the de facto testing framework in Node.js with good ecosystem support.
- Supertest simplifies testing Express endpoints end-to-end against an in-memory or test MongoDB.
- Aligns with Constitution requirements for unit, integration, and end-to-end tests for critical flows.

**Alternatives considered**:

- Mocha/Chai: flexible but less batteries-included than Jest.
- Cypress/Playwright: useful for full browser E2E tests but not required for the initial backend-focused MVP.

## 5. Time, Dates, and Booking/Cancellation Rules

**Decision**:

- Store all session times and bookings in UTC in MongoDB.
- Application logic will use a consistent gym time zone when presenting times; user-facing formatting will be handled by clients (React/React Native) later.
- Booking horizon: default 30 days in advance, configurable per gym.
- Cancellation window: default 4 hours before session start, configurable per gym.

**Rationale**:

- UTC storage avoids time zone drift and DST complications.
- Configurable horizons and windows support different gym policies without code changes.

**Alternatives considered**:

- Storing local times: simpler at first but error-prone with DST and future multi-gym support.

## 6. Concurrency & Capacity Enforcement

**Decision**: Use MongoDB atomic operations (e.g., findOneAndUpdate with capacity checks) or transactions (where supported) to enforce capacity and avoid overbooking in race conditions.  
**Rationale**:

- Booking must be correct even with concurrent parent requests for the last spot.
- Mongoose + MongoDB can support safe updates with conditions on remaining capacity.

**Alternatives considered**:

- Simple “read capacity then write” logic: vulnerable to race conditions and unacceptable for capacity-critical bookings.

## 7. Logging & Observability

**Decision**: Use pino as a structured logging library with log levels and JSON output format.  
**Rationale**:

- Structured logs fit observability needs and future log aggregation.
- Constitution requires visibility into key events but forbids logging sensitive data.

**Alternatives considered**:

- `console.log` only: too weak for production observability and harder to filter.

**Clarifications**:

- pino is chosen for performance and JSON output.
- For MVP, logs will be written to local/container output in JSON format, with the option to integrate ELK/Loki or a similar central log system later when the deployment environment is defined.

## 8. Configuration Management

**Decision**: Use environment variables (via dotenv in development) for secrets and environment-specific configuration (Mongo connection string, JWT secret, booking horizon and cancellation defaults).  
**Rationale**:

- Simple, standard pattern for Node.js apps.
- Aligns with 12-factor app principles.

**Alternatives considered**:

- Dedicated config service: unnecessary for the first single-service deployment.


