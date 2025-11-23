# 🚀 Quick Test Links for WonderClimb

## 🌐 Web-Based API Tester

**Open this file in your browser:**
```
file:///D:/Projects/WonderClimb/frontend/public/test-api.html
```

**Or serve it:**
```powershell
cd frontend/public
python -m http.server 8080
# Visit: http://localhost:8080/test-api.html
```

---

## 🔗 Direct API Endpoints

### Public Endpoints (No Auth Required)

- **Health Check**: http://localhost:3000/health
- **API Root**: http://localhost:3000/api/v1
- **API Docs**: http://localhost:3000/api/v1/docs
- **Register**: `POST http://localhost:3000/api/v1/auth/register`
- **Login**: `POST http://localhost:3000/api/v1/auth/login`
- **Sessions List**: `GET http://localhost:3000/api/v1/sessions`

### Protected Endpoints (Require JWT Token)

**Parent:**
- `GET http://localhost:3000/api/v1/parents/me/climbers`
- `POST http://localhost:3000/api/v1/parents/me/climbers`
- `GET http://localhost:3000/api/v1/parents/me/bookings`

**Coach:**
- `GET http://localhost:3000/api/v1/coaches/me/sessions/today`
- `POST http://localhost:3000/api/v1/attendance`

**Admin:**
- `POST http://localhost:3000/api/v1/admin/sessions`
- `GET http://localhost:3000/api/v1/admin/calendar`

---

## 📋 Quick Test Flow

### 1. Register & Login

**Register:**
```powershell
$body = '{"email":"test@example.com","password":"password123","name":"Test User","roles":["parent"]}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
```

**Login:**
```powershell
$body = '{"email":"test@example.com","password":"password123"}'
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
```

### 2. Use Token

```powershell
$headers = @{Authorization = "Bearer $token"}
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/parents/me/climbers" -Method Get -Headers $headers
```

---

## 🎯 Recommended Testing Method

**Use the HTML test page** (`frontend/public/test-api.html`) - it's the easiest way to test all endpoints with a visual interface!

---

## 📚 Full Documentation

- **Testing Guide**: `TESTING_GUIDE.md`
- **Backend README**: `backend/README.md`
- **API Spec**: `specs/001-core-booking-attendance/contracts/openapi.yaml`

