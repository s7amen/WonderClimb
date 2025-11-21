# WonderClimb Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js 20.x or higher installed
- [ ] MongoDB installed and running locally
- [ ] Backend dependencies installed (`npm install`)

---

## Step 1: Install MongoDB (If Not Already Installed)

### Option A: MongoDB Community Edition (Recommended)

1. **Download:**
   - Go to: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI package
   - Download and install

2. **Start MongoDB Service:**
   ```powershell
   Start-Service MongoDB
   ```

3. **Verify:**
   ```powershell
   Get-Service MongoDB
   # Should show Status: Running
   ```

### Option B: Using Docker (If You Have Docker Desktop)

```powershell
docker-compose up -d mongodb
```

---

## Step 2: Configure Backend

The `.env` file should already be configured with:
- `MONGODB_URI=mongodb://localhost:27017/wonderclimb`
- `JWT_SECRET=<generated-secret>`

**If you need to regenerate JWT secret:**
```powershell
cd backend
$jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
Write-Host "JWT_SECRET=$jwtSecret"
# Copy this to your .env file
```

---

## Step 3: Install Dependencies

```powershell
cd backend
npm install
```

---

## Step 4: Run Setup Script (Optional)

```powershell
cd backend
.\scripts\setup.ps1
```

This will verify:
- Node.js is installed
- MongoDB is running
- .env is configured
- Dependencies are installed

---

## Step 5: Start the Backend

```powershell
cd backend
npm run dev
```

You should see:
```
Server running on port 3000 in development mode
MongoDB connected: mongodb://localhost:27017/wonderclimb
```

---

## Step 6: Test the API

**Health Check:**
```powershell
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "environment": "development"
}
```

**API Root:**
```powershell
curl http://localhost:3000/api/v1
```

**API Documentation:**
Open in browser: http://localhost:3000/api/v1/docs

---

## Troubleshooting

### MongoDB Not Running

**Check if MongoDB service is running:**
```powershell
Get-Service MongoDB
```

**Start MongoDB:**
```powershell
Start-Service MongoDB
```

**If service doesn't exist, install MongoDB:**
- Download from: https://www.mongodb.com/try/download/community
- Or use Docker: `docker-compose up -d mongodb`

### Port Already in Use

If port 3000 is already in use:
1. Change `PORT` in `backend/.env` to another port (e.g., `3001`)
2. Restart the backend

### Connection Errors

**Check MongoDB connection:**
```powershell
Test-NetConnection -ComputerName localhost -Port 27017
```

**Test MongoDB directly:**
```powershell
mongosh mongodb://localhost:27017/wonderclimb --eval "db.runCommand({ ping: 1 })"
```

---

## Next Steps

1. **Implement Authentication Routes:**
   - `POST /api/v1/auth/register` - User registration
   - `POST /api/v1/auth/login` - User login

2. **Test API Endpoints:**
   - Use Postman, curl, or your frontend
   - All endpoints require JWT authentication (except `/health`)

3. **Build Frontend:**
   - React admin panel
   - React Native mobile app

---

## Useful Commands

```powershell
# Start backend (development)
npm run dev

# Start backend (production)
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Check MongoDB status
Get-Service MongoDB

# Start MongoDB
Start-Service MongoDB

# Stop MongoDB
Stop-Service MongoDB
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/          # Environment & database config
│   ├── models/          # Mongoose models
│   ├── services/        # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth, logging, validation
│   └── app.js           # Express app
├── tests/              # Test files
├── scripts/            # Setup scripts
├── .env               # Environment variables (not in git)
└── package.json
```

---

## Need Help?

- Check `MONGODB_SETUP.md` for detailed MongoDB installation
- Check `SETUP.md` for comprehensive setup guide
- Check `backend/README.md` for API documentation
