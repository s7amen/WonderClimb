# WonderClimb Local Setup Script
# This script helps set up MongoDB and the backend

Write-Host "=== WonderClimb Local Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is installed
Write-Host "Checking MongoDB installation..." -ForegroundColor Yellow
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue

if ($mongoService) {
    Write-Host "✓ MongoDB service found!" -ForegroundColor Green
    
    if ($mongoService.Status -eq 'Running') {
        Write-Host "✓ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠ MongoDB service exists but is not running" -ForegroundColor Yellow
        Write-Host "  Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service MongoDB
        Write-Host "✓ MongoDB started" -ForegroundColor Green
    }
} else {
    Write-Host "✗ MongoDB is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install MongoDB using one of these options:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.mongodb.com/try/download/community" -ForegroundColor White
    Write-Host "  2. Or use Chocolatey: choco install mongodb -y" -ForegroundColor White
    Write-Host ""
    Write-Host "See MONGODB_SETUP_WINDOWS.md for detailed instructions" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Check if MongoDB is listening on port 27017
Write-Host ""
Write-Host "Checking MongoDB connection..." -ForegroundColor Yellow
$mongoPort = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($mongoPort) {
    Write-Host "✓ MongoDB is listening on port 27017" -ForegroundColor Green
} else {
    Write-Host "⚠ MongoDB service is running but port 27017 is not accessible" -ForegroundColor Yellow
    Write-Host "  This might be a firewall issue or MongoDB is configured differently" -ForegroundColor Yellow
}

# Check Node.js
Write-Host ""
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✓ Node.js $nodeVersion is installed" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js is not installed" -ForegroundColor Red
    Write-Host "  Please install Node.js 20.x or higher from: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check if backend dependencies are installed
Write-Host ""
Write-Host "Checking backend dependencies..." -ForegroundColor Yellow
if (Test-Path "backend\node_modules") {
    Write-Host "✓ Backend dependencies are installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Backend dependencies not found" -ForegroundColor Yellow
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
}

# Check .env file
Write-Host ""
Write-Host "Checking .env file..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    Write-Host "  Creating .env file..." -ForegroundColor Yellow
    # Create .env file
    @"
# Server Configuration
PORT=3000
NODE_ENV=development

# Database - Local MongoDB
MONGODB_URI=mongodb://localhost:27017/wonderclimb

# Authentication
JWT_SECRET=uL+rwo6b/xr/OthUaEUOLk/5L04aqEu957UpoUmezkU=
JWT_EXPIRES_IN=7d

# Booking Configuration
BOOKING_HORIZON_DAYS=30
CANCELLATION_WINDOW_HOURS=4

# Logging
LOG_LEVEL=info
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
    Write-Host "✓ .env file created" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "  2. Test the API: curl http://localhost:3000/health" -ForegroundColor White
Write-Host "  3. View API docs: http://localhost:3000/api/v1/docs" -ForegroundColor White
Write-Host ""

