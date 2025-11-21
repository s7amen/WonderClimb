# Quickstart: WonderClimb Core Booking & Attendance MVP (Backend)

## Prerequisites

- Node.js LTS (20.x or higher) installed
- MongoDB instance (local, Docker, or MongoDB Atlas)
- Git and npm (or yarn)

## 1. Clone and install

```bash
git clone <your-repo-url> wonderclimb
cd wonderclimb

# Install backend dependencies
cd backend
npm install
```

## 2. Environment configuration

Create a `.env` file in `backend/` (copy from `backend/.env.example`):

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/wonderclimb
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Booking configuration (defaults)
BOOKING_HORIZON_DAYS=30
CANCELLATION_WINDOW_HOURS=4

# Logging
LOG_LEVEL=info
```

**Important**: Change `JWT_SECRET` to a secure random string in production.

## 3. Run the backend

```bash
cd backend
npm start        # Production mode
# OR
npm run dev      # Development mode with --watch
```

The API will be available at `http://localhost:3000/api/v1`.

**Health check**: `GET http://localhost:3000/health`

**API docs**: `GET http://localhost:3000/api/v1/docs` (OpenAPI YAML, available in development or protected in production)

## 4. Testing

Run all tests:

```bash
cd backend
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:coverage
```

**Test structure**:
- Unit tests: `backend/tests/unit/`
- Integration/E2E tests: `backend/tests/integration/`
- Tests use MongoMemoryServer for isolated test database

## 5. Key API Endpoints

### Authentication
- All endpoints require JWT token in `Authorization: Bearer <token>` header
- Token generation is handled by auth middleware (implement auth routes separately)

### Parent Endpoints
- `GET /api/v1/parents/me/climbers` - List parent's children
- `POST /api/v1/parents/me/climbers` - Add child climber
- `PUT /api/v1/parents/me/climbers/:climberId` - Update child
- `DELETE /api/v1/parents/me/climbers/:climberId` - Deactivate child

### Booking Endpoints
- `GET /api/v1/sessions` - List available sessions
- `POST /api/v1/bookings` - Create single booking
- `POST /api/v1/bookings/recurring` - Create recurring bookings
- `GET /api/v1/parents/me/bookings` - List parent's bookings
- `DELETE /api/v1/bookings/:bookingId` - Cancel booking

### Coach Endpoints
- `GET /api/v1/coaches/me/sessions/today` - Today's sessions
- `GET /api/v1/coaches/me/sessions/:sessionId/roster` - Session roster
- `POST /api/v1/attendance` - Record attendance

### Admin Endpoints
- `POST /api/v1/admin/sessions` - Create session
- `PUT /api/v1/admin/sessions/:sessionId` - Update session
- `GET /api/v1/admin/calendar` - Calendar view
- `PATCH /api/v1/admin/sessions/:sessionId/payout-status` - Update payout status
- `GET /api/v1/admin/finance/payouts/monthly` - Monthly payouts summary

### Self-Managed Climber
- `GET /api/v1/me/climber` - Get own climber profile
- `PUT /api/v1/me/climber` - Update own climber profile

## 6. Architecture Notes

- **Backend structure**: Modular with `src/services/`, `src/routes/`, `src/models/`, `src/middleware/`
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access control (RBAC)
- **Logging**: Structured logging with pino (JSON format)
- **Security**: Helmet, CORS, rate limiting configured
- **Testing**: Jest + Supertest with MongoMemoryServer

## 7. Next Steps

1. **Authentication routes**: Implement `/api/v1/auth/register` and `/api/v1/auth/login` endpoints
2. **Frontend**: Build React admin panel consuming these APIs
3. **Mobile**: Build React Native/Expo app for parents and coaches
4. **Performance**: Run load tests (T051) and tune indexes as needed
5. **Deployment**: Configure production environment variables and MongoDB Atlas connection

## 8. Notes

- This quickstart focuses on the backend for the core booking and attendance MVP.
- React admin panel and React Native mobile apps will consume the `/api/v1` endpoints defined in `contracts/openapi.yaml`.
- PowerShell-based context update scripts (e.g., `.specify/scripts/powershell/update-agent-context.ps1`) are **not required** to run the backend and can be addressed later if needed.
- All sensitive data (passwords, addresses) is excluded from logs per Constitution requirements.


