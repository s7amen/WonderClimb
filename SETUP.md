# WonderClimb Setup Guide

## MongoDB Setup Decision

### Recommendation: **Start with Local MongoDB for Development**

**Why?**
- ✅ Faster development (no network latency)
- ✅ Free and unlimited
- ✅ Works offline
- ✅ Easy to reset/clear data during testing
- ✅ No account setup needed

**When to switch to Atlas:**
- When deploying to production
- When you need backups/restore
- When you need to share data across team members
- When you need monitoring/alerting

---

## Option 1: Local MongoDB Setup (Recommended for Development)

### Quick Start with Docker (Easiest)

1. **Start MongoDB container:**
   ```bash
   docker-compose up -d mongodb
   ```
   This starts MongoDB on `localhost:27017`

2. **Verify it's running:**
   ```bash
   docker ps
   # Should see wonderclimb-mongodb container
   ```

3. **Stop MongoDB:**
   ```bash
   docker-compose down
   ```

### Alternative: Install MongoDB Locally

**Windows:**
```powershell
# Using Chocolatey
choco install mongodb

# Or download installer from mongodb.com
# Start MongoDB service:
net start MongoDB
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

---

## Option 2: MongoDB Atlas Setup (For Production)

1. **Sign up:** Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. **Create Free Cluster:**
   - Click "Build a Database"
   - Choose **M0 Free** tier
   - Select cloud provider and region (closest to you)
   - Name your cluster (e.g., "WonderClimb")

3. **Create Database User:**
   - Username: `wonderclimb-admin` (or your choice)
   - Password: Generate strong password (save it!)
   - Database User Privileges: "Atlas admin"

4. **Network Access:**
   - Add IP Address: `0.0.0.0/0` (for development - allows all IPs)
   - **For production:** Add only your server's IP addresses

5. **Get Connection String:**
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<database>` with `wonderclimb`

   Example:
   ```
   mongodb+srv://wonderclimb-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/wonderclimb?retryWrites=true&w=majority
   ```

---

## Backend Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

**Copy the example file:**
```bash
cp .env.example .env
```

**Edit `.env` file:**

**For Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/wonderclimb
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NODE_ENV=development
```

**For MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wonderclimb
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NODE_ENV=development
```

**Generate a secure JWT secret:**
```bash
# On Linux/macOS:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. Start MongoDB (if using local)

**With Docker:**
```bash
docker-compose up -d mongodb
```

**Or start MongoDB service** (if installed locally)

### 4. Run the Backend

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
Server running on port 3000 in development mode
MongoDB connected: ...
```

### 5. Test the API

**Health check:**
```bash
curl http://localhost:3000/health
```

**API root:**
```bash
curl http://localhost:3000/api/v1
```

---

## Next Steps

1. **Create authentication endpoints** (`/api/v1/auth/register` and `/api/v1/auth/login`)
2. **Test the API** using Postman, curl, or your frontend
3. **Run tests:** `npm test`
4. **Build frontend** (React admin panel) that consumes these APIs

---

## Troubleshooting

### MongoDB Connection Issues

**Local MongoDB not starting:**
- Check if MongoDB service is running: `docker ps` or `systemctl status mongodb`
- Check if port 27017 is available: `netstat -an | grep 27017`
- Check MongoDB logs: `docker logs wonderclimb-mongodb`

**Atlas Connection Issues:**
- Verify IP address is whitelisted in Atlas Network Access
- Check username/password in connection string
- Ensure cluster is running (not paused)

### Backend Issues

**"Missing required environment variable":**
- Make sure `.env` file exists in `backend/` directory
- Check all required variables are set (see `.env.example`)

**Port already in use:**
- Change `PORT` in `.env` to another port (e.g., 3001)
- Or stop the process using port 3000

---

## My Recommendation

**For MVP Development:** Use **Local MongoDB with Docker** (`docker-compose up -d mongodb`)

**Why?**
- Fastest setup (one command)
- No external dependencies
- Easy to reset data
- Free and unlimited

**When you're ready for production:** Switch to **MongoDB Atlas** (free M0 tier is perfect for MVP)

