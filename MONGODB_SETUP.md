# MongoDB Local Setup Guide

## Option 1: Install MongoDB Community Edition (Recommended)

### Windows Installation

1. **Download MongoDB:**
   - Go to: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI package
   - Download and run the installer

2. **Installation Steps:**
   - Choose "Complete" installation
   - Install as Windows Service (recommended)
   - Install MongoDB Compass (GUI tool - optional but helpful)
   - Complete installation

3. **Verify Installation:**
   ```powershell
   # Check if MongoDB service is running
   Get-Service -Name MongoDB
   
   # Start MongoDB if not running
   Start-Service MongoDB
   ```

4. **MongoDB will run on:** `mongodb://localhost:27017`

### Alternative: Using Chocolatey (if you have it)

```powershell
choco install mongodb
```

---

## Option 2: Install Docker Desktop (Then use docker-compose)

1. **Download Docker Desktop:**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Download Docker Desktop for Windows
   - Install and restart

2. **Start MongoDB:**
   ```powershell
   docker-compose up -d mongodb
   ```

---

## Quick Setup Script

After MongoDB is installed, run this to configure your backend:

```powershell
cd backend

# Generate JWT secret
$jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Update .env file (if it exists)
if (Test-Path .env) {
    (Get-Content .env) -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" | Set-Content .env
    Write-Host "JWT_SECRET updated in .env"
} else {
    Copy-Item .env.example .env
    (Get-Content .env) -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" | Set-Content .env
    Write-Host ".env file created with JWT_SECRET"
}

Write-Host "MongoDB URI should be: mongodb://localhost:27017/wonderclimb"
```

---

## Verify MongoDB is Running

```powershell
# Test MongoDB connection
mongosh mongodb://localhost:27017/wonderclimb --eval "db.runCommand({ ping: 1 })"
```

Or use MongoDB Compass GUI:
- Connect to: `mongodb://localhost:27017`

---

## Next Steps

Once MongoDB is running:

1. **Update backend/.env:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/wonderclimb
   JWT_SECRET=<generated-secret>
   NODE_ENV=development
   ```

2. **Start backend:**
   ```powershell
   cd backend
   npm run dev
   ```

3. **Test:**
   ```powershell
   curl http://localhost:3000/health
   ```
