# MongoDB Setup for Windows

## Option 1: Install MongoDB Community Edition (Recommended)

### Step 1: Download MongoDB
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - **Version**: 7.0 (or latest stable)
   - **Platform**: Windows
   - **Package**: MSI
3. Click "Download"

### Step 2: Install MongoDB
1. Run the downloaded `.msi` installer
2. Choose **"Complete"** installation
3. **Important**: Check "Install MongoDB as a Service"
4. Select "Run service as Network Service user"
5. **Important**: Check "Install MongoDB Compass" (GUI tool - very useful!)
6. Click "Install"

### Step 3: Verify Installation
Open PowerShell as Administrator and run:
```powershell
Get-Service MongoDB
```

You should see MongoDB service running.

### Step 4: Test Connection
MongoDB should now be running on `localhost:27017`

You can verify by:
```powershell
# Check if port is listening
Test-NetConnection -ComputerName localhost -Port 27017
```

Or open MongoDB Compass and connect to: `mongodb://localhost:27017`

---

## Option 2: Install via Chocolatey (Faster)

If you have Chocolatey installed:

```powershell
# Install Chocolatey first (if not installed)
# Run PowerShell as Administrator:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install MongoDB
choco install mongodb -y

# Start MongoDB service
net start MongoDB
```

---

## Option 3: Use MongoDB Atlas (Cloud - No Installation Needed)

If you prefer not to install MongoDB locally:

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up for free account
3. Create a free M0 cluster
4. Get connection string and update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wonderclimb
   ```

---

## After Installation

Once MongoDB is installed and running:

1. **Update `.env` file** (already configured for local MongoDB)
2. **Start the backend:**
   ```powershell
   cd backend
   npm run dev
   ```

3. **Test the connection:**
   ```powershell
   curl http://localhost:3000/health
   ```

---

## Troubleshooting

### MongoDB Service Not Starting
```powershell
# Check service status
Get-Service MongoDB

# Start service manually
net start MongoDB

# Check logs
# Logs are usually in: C:\Program Files\MongoDB\Server\7.0\log\mongod.log
```

### Port 27017 Already in Use
```powershell
# Find what's using the port
netstat -ano | findstr :27017

# Stop MongoDB service
net stop MongoDB

# Or change MongoDB port in config file
# (Located at: C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg)
```

### Can't Connect to MongoDB
- Make sure MongoDB service is running: `Get-Service MongoDB`
- Check firewall isn't blocking port 27017
- Verify connection string in `.env` is correct: `mongodb://localhost:27017/wonderclimb`

---

## Quick Start (After MongoDB is Installed)

```powershell
# 1. Verify MongoDB is running
Get-Service MongoDB

# 2. Navigate to backend
cd backend

# 3. Start the server
npm run dev

# 4. In another terminal, test it
curl http://localhost:3000/health
```

