# Test Authentication Endpoints

Write-Host "=== Testing Authentication Endpoints ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api/v1/auth"
$testUser = @{
    email = "test@example.com"
    password = "password123"
    name = "Test User"
    roles = @("parent")
}

# Test Register
Write-Host "`n1. Testing Registration..." -ForegroundColor Yellow
try {
    $registerBody = $testUser | ConvertTo-Json
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✓ Registration successful!" -ForegroundColor Green
    Write-Host "User ID: $($registerResponse.user._id)" -ForegroundColor Gray
    Write-Host "Email: $($registerResponse.user.email)" -ForegroundColor Gray
    Write-Host "Roles: $($registerResponse.user.roles -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "✗ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Test Login
Write-Host "`n2. Testing Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $testUser.email
        password = $testUser.password
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "Token: $($loginResponse.token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host "User: $($loginResponse.user.name)" -ForegroundColor Gray
    
    # Test protected endpoint with token
    Write-Host "`n3. Testing Protected Endpoint with Token..." -ForegroundColor Yellow
    $headers = @{
        Authorization = "Bearer $($loginResponse.token)"
    }
    $protectedResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/parents/me/climbers" -Method Get -Headers $headers
    Write-Host "✓ Protected endpoint accessible!" -ForegroundColor Green
    Write-Host "Climbers: $($protectedResponse.climbers.Count)" -ForegroundColor Gray
    
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan

