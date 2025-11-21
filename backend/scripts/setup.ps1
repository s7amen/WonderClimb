# WonderClimb Backend Setup Script

Write-Host "=== WonderClimb Backend Setup ===" -ForegroundColor Cyan

# Check Node.js
Write-Host "`nChecking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Please install Node.js 20.x or higher" -ForegroundColor Red
    exit 1
}

# Check MongoDB connection
Write-Host "`nChecking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongodbRunning = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($mongodbRunning) {
        Write-Host "✓ MongoDB is running on localhost:27017" -ForegroundColor Green
    } else {
        Write-Host "✗ MongoDB is not running on localhost:27017" -ForegroundColor Red
        Write-Host "`nPlease install and start MongoDB:" -ForegroundColor Yellow
        Write-Host "  1. Download from: https://www.mongodb.com/try/download/community" -ForegroundColor White
        Write-Host "  2. Install MongoDB Community Edition" -ForegroundColor White
        Write-Host "  3. Start MongoDB service: Start-Service MongoDB" -ForegroundColor White
        Write-Host "`nOr use Docker: docker-compose up -d mongodb" -ForegroundColor White
        Write-Host "`n⚠ Continuing anyway - you can start MongoDB later" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not check MongoDB connection" -ForegroundColor Yellow
}

# Check .env file
Write-Host "`nChecking .env configuration..." -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content .env -Raw
    if ($envContent -match "MONGODB_URI=mongodb://localhost:27017") {
        Write-Host "✓ MongoDB URI configured for local" -ForegroundColor Green
    } else {
        Write-Host "⚠ MongoDB URI may not be configured correctly" -ForegroundColor Yellow
    }
    
    if ($envContent -match "JWT_SECRET=.+") {
        Write-Host "✓ JWT_SECRET is set" -ForegroundColor Green
    } else {
        Write-Host "⚠ JWT_SECRET may be missing" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "✓ .env file created. Please update JWT_SECRET" -ForegroundColor Green
    } else {
        Write-Host "✗ .env.example not found" -ForegroundColor Red
        exit 1
    }
}

# Check dependencies
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    Write-Host "✓ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "⚠ Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Start backend: npm run dev" -ForegroundColor White
Write-Host "  2. Test health: curl http://localhost:3000/health" -ForegroundColor White
Write-Host "  3. View API docs: http://localhost:3000/api/v1/docs" -ForegroundColor White

