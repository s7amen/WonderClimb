# WonderClimb Backend API

Backend REST API for WonderClimb climbing gym management system.

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- MongoDB (local or Atlas)

### Installation

```bash
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your `.env` file:

**For Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/wonderclimb
```

**For MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wonderclimb?retryWrites=true&w=majority
```

### Running Locally

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The API will be available at `http://localhost:3000`

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## MongoDB Setup Options

### Option 1: Local MongoDB (Recommended for Development)

**Using Docker (Easiest):**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Using MongoDB Community Edition:**
1. Download from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB service
3. MongoDB will run on `mongodb://localhost:27017`

**Using Homebrew (macOS):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Using Chocolatey (Windows):**
```powershell
choco install mongodb
```

### Option 2: MongoDB Atlas (Recommended for Production)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster (512MB, shared)
3. Create a database user
4. Whitelist your IP address (or `0.0.0.0/0` for development)
5. Get connection string and add to `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wonderclimb
   ```

## API Documentation

- **Health Check**: `GET /health`
- **API Docs**: `GET /api/v1/docs` (OpenAPI YAML)
- **API Root**: `GET /api/v1/`

See `specs/001-core-booking-attendance/contracts/openapi.yaml` for full API specification.

## Project Structure

```
backend/
├── src/
│   ├── config/          # Environment and database config
│   ├── models/          # Mongoose models
│   ├── services/        # Business logic services
│   ├── routes/          # Express route handlers
│   ├── middleware/      # Auth, logging, error handling
│   └── app.js           # Express app entry point
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration/E2E tests
│   └── setup.js         # Test configuration
└── package.json
```

## Environment Variables

See `.env.example` for all available configuration options.

## Development Tips

- Use `npm run dev` for auto-reload during development
- Check logs in console (structured JSON logs with pino)
- Use MongoDB Compass or Studio 3T to inspect database
- Run tests before committing: `npm test`

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use MongoDB Atlas connection string
3. Set strong `JWT_SECRET`
4. Configure `CORS_ORIGIN` for your frontend domain
5. Use process manager (PM2, systemd) or container orchestration

