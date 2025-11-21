# Open WonderClimb API Test Page

$testPagePath = Join-Path $PSScriptRoot "frontend\public\test-api.html"

if (Test-Path $testPagePath) {
    Write-Host "Opening API test page..." -ForegroundColor Green
    Write-Host "Path: $testPagePath" -ForegroundColor Gray
    Start-Process $testPagePath
} else {
    Write-Host "Test page not found at: $testPagePath" -ForegroundColor Red
    Write-Host "Please make sure the file exists." -ForegroundColor Yellow
}

