# WonderClimb Local Development Setup Script
# This script prepares everything needed to run the project locally

Write-Host "=== WonderClimb Local Development Setup ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Check Node.js
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Host "  ✓ Node.js $nodeVersion is installed" -ForegroundColor Green
    
    # Check if version is >= 20
    $versionMatch = $nodeVersion -match 'v(\d+)\.'
    if ($versionMatch) {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -lt 20) {
            Write-Host "  ⚠ Warning: Node.js 20.x or higher is recommended" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ✗ Node.js is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js 20.x or higher from: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check MongoDB (Docker or Local)
Write-Host ""
Write-Host "[2/6] Checking MongoDB..." -ForegroundColor Yellow
$mongoAvailable = $false
$useDocker = $false

# Check Docker first
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Docker is installed" -ForegroundColor Green
        $useDocker = $true
        
        # Check if MongoDB container is running
        $mongoContainer = docker ps --filter "name=wonderclimb-mongodb" --format "{{.Names}}" 2>&1
        if ($mongoContainer -eq "wonderclimb-mongodb") {
            Write-Host "  ✓ MongoDB container is already running" -ForegroundColor Green
            $mongoAvailable = $true
        } else {
            Write-Host "  ℹ MongoDB container not running, will start it" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "  ℹ Docker not found, checking for local MongoDB..." -ForegroundColor Cyan
}

# Check local MongoDB service
if (-not $useDocker) {
    try {
        $mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
        if ($mongoService) {
            if ($mongoService.Status -eq 'Running') {
                Write-Host "  ✓ MongoDB service is running" -ForegroundColor Green
                $mongoAvailable = $true
            } else {
                Write-Host "  ⚠ MongoDB service exists but is not running" -ForegroundColor Yellow
                Write-Host "    Starting MongoDB service..." -ForegroundColor Yellow
                Start-Service MongoDB
                Start-Sleep -Seconds 2
                $mongoAvailable = $true
                Write-Host "  ✓ MongoDB service started" -ForegroundColor Green
            }
        } else {
            Write-Host "  ⚠ MongoDB is not installed locally" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Options:" -ForegroundColor Cyan
            Write-Host "  1. Install Docker Desktop and use: docker-compose up -d mongodb" -ForegroundColor White
            Write-Host "  2. Install MongoDB locally from: https://www.mongodb.com/try/download/community" -ForegroundColor White
            Write-Host ""
            $response = Read-Host "Do you want to continue anyway? (y/n)"
            if ($response -ne "y" -and $response -ne "Y") {
                exit 1
            }
        }
    } catch {
        Write-Host "  ⚠ Could not check MongoDB service" -ForegroundColor Yellow
    }
}

# Step 3: Start MongoDB with Docker if available
if ($useDocker -and -not $mongoAvailable) {
    Write-Host ""
    Write-Host "[2.5/6] Starting MongoDB with Docker..." -ForegroundColor Yellow
    try {
        docker-compose up -d mongodb
        Write-Host "  ✓ MongoDB container started" -ForegroundColor Green
        Write-Host "  ℹ Waiting for MongoDB to be ready..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
        $mongoAvailable = $true
    } catch {
        Write-Host "  ✗ Failed to start MongoDB container" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Setup Backend .env file
Write-Host ""
Write-Host "[3/6] Setting up backend configuration..." -ForegroundColor Yellow
$backendEnvPath = "backend\.env"
if (Test-Path $backendEnvPath) {
    Write-Host "  ℹ .env file already exists, skipping creation" -ForegroundColor Cyan
} else {
    Write-Host "  Creating .env file..." -ForegroundColor Cyan
    
    # Generate JWT secret
    $jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
    
    # Determine MongoDB URI
    $mongodbUri = "mongodb://localhost:27017/wonderclimb"
    
    $envContent = @"
# Server Configuration
PORT=3000
NODE_ENV=development

# Database - Local MongoDB
MONGODB_URI=$mongodbUri

# Authentication
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=7d

# Booking Configuration
BOOKING_HORIZON_HOURS=720
CANCELLATION_WINDOW_HOURS=4

# Logging
LOG_LEVEL=info
"@
    
    $envContent | Out-File -FilePath $backendEnvPath -Encoding utf8 -NoNewline
    Write-Host "  ✓ .env file created" -ForegroundColor Green
}

# Step 5: Install Backend Dependencies
Write-Host ""
Write-Host "[4/6] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "node_modules") {
    Write-Host "  ℹ node_modules exists, running npm install to update..." -ForegroundColor Cyan
} else {
    Write-Host "  Installing dependencies (this may take a few minutes)..." -ForegroundColor Cyan
}
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install backend dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green
Set-Location ..

# Step 6: Install Frontend Dependencies
Write-Host ""
Write-Host "[5/6] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
if (Test-Path "node_modules") {
    Write-Host "  ℹ node_modules exists, running npm install to update..." -ForegroundColor Cyan
} else {
    Write-Host "  Installing dependencies (this may take a few minutes)..." -ForegroundColor Cyan
}
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install frontend dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
Set-Location ..

# Step 7: Summary
Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps to start the project:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start MongoDB (if not already running):" -ForegroundColor White
if ($useDocker) {
    Write-Host "   docker-compose up -d mongodb" -ForegroundColor Gray
} else {
    Write-Host "   Start-Service MongoDB" -ForegroundColor Gray
    Write-Host "   (or use Docker: docker-compose up -d mongodb)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "2. Start the backend (in a new terminal):" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the frontend (in another terminal):" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Open your browser:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "   Backend API: http://localhost:3000/api/v1" -ForegroundColor Gray
Write-Host "   Health Check: http://localhost:3000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see: LOCAL_SETUP.md" -ForegroundColor Cyan
Write-Host ""

