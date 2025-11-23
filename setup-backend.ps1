# WonderClimb Backend Setup Script
# This script helps configure the backend environment

Write-Host "=== WonderClimb Backend Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
$envPath = "backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" $envPath -ErrorAction SilentlyContinue
    if (Test-Path $envPath) {
        Write-Host "✓ .env file created" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create .env file. Please create it manually." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

# Generate JWT secret
Write-Host ""
Write-Host "Generating JWT secret..." -ForegroundColor Yellow
$jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
Write-Host "Generated JWT Secret: $jwtSecret" -ForegroundColor Cyan
Write-Host ""

# Check MongoDB
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
$mongoService = Get-Service -Name MongoDB* -ErrorAction SilentlyContinue
if ($mongoService) {
    Write-Host "✓ MongoDB service found: $($mongoService.Name)" -ForegroundColor Green
    if ($mongoService.Status -eq 'Running') {
        Write-Host "✓ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠ MongoDB service exists but is not running" -ForegroundColor Yellow
        Write-Host "  Start it with: Start-Service MongoDB" -ForegroundColor Cyan
    }
} else {
    Write-Host "✗ MongoDB service not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install MongoDB:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    Write-Host "  2. Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas" -ForegroundColor Cyan
    Write-Host "  3. See MONGODB_SETUP.md for detailed instructions" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update backend\.env file:" -ForegroundColor Yellow
Write-Host "   - Set MONGODB_URI (mongodb://localhost:27017/wonderclimb for local)" -ForegroundColor White
Write-Host "   - Set JWT_SECRET to: $jwtSecret" -ForegroundColor White
Write-Host ""
Write-Host "2. Start MongoDB (if using local):" -ForegroundColor Yellow
Write-Host "   Start-Service MongoDB" -ForegroundColor White
Write-Host ""
Write-Host "3. Start the backend:" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Test the API:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:3000/health" -ForegroundColor White
Write-Host ""

