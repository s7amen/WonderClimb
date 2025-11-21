# ✅ Session Creation Fix - Coach IDs Required

## Problem Fixed

The session creation endpoint was failing because `coachIds` is required but wasn't being provided in the test page.

## What Was Fixed

### 1. New Endpoint: Get Coaches List
- **Endpoint**: `GET /api/v1/admin/users/coaches`
- **Purpose**: Get list of all coaches to select when creating sessions
- **Returns**: List of coaches with their IDs, names, and emails

### 2. Updated Test Page
- Added "Get Coaches List" button
- Added coach IDs input field
- Added visual coach list with "Add" buttons
- Updated session creation to include `coachIds` array

### 3. Session Creation Now Requires
- `title` - Session title
- `date` - Date and time
- `durationMinutes` - Duration in minutes
- `capacity` - Maximum participants
- **`coachIds`** - Array of coach user IDs (REQUIRED - at least one)

---

## How to Use

### Step 1: Create a Coach User (if you don't have one)

**Register a coach:**
```powershell
$body = '{"email":"coach@wonderclimb.com","password":"coach123","name":"Coach User","roles":["coach"]}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
```

### Step 2: Login as Admin

```powershell
$body = '{"email":"admin@wonderclimb.com","password":"admin123"}'
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
```

### Step 3: Get Coaches List

**Using the test page:**
1. Click "Get Coaches List" button
2. See list of available coaches
3. Click "Add" button next to coach(s) you want
4. Coach IDs will be added to the input field

**Or using PowerShell:**
```powershell
$headers = @{Authorization = "Bearer $token"}
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/users/coaches" -Method Get -Headers $headers
```

### Step 4: Create Session

**Using the test page:**
1. Fill in session details (title, date, duration, capacity)
2. Coach IDs field should be populated (from Step 3)
3. Click "Create Session"

**Or using PowerShell:**
```powershell
$coachId = "<coach-user-id>" # From Step 3
$futureDate = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
$body = @{
    title = "Kids Climbing Session"
    date = $futureDate
    durationMinutes = 60
    capacity = 10
    coachIds = @($coachId)
    status = "active"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/sessions" -Method Post -Body $body -ContentType "application/json" -Headers $headers
```

---

## Example Flow

1. **Register Coach:**
   ```
   Email: coach@wonderclimb.com
   Password: coach123
   Name: Coach User
   Roles: coach
   ```

2. **Login as Admin:**
   ```
   Email: admin@wonderclimb.com
   Password: admin123
   ```

3. **Get Coaches:**
   - Click "Get Coaches List"
   - See: "Coach User (coach@wonderclimb.com)"
   - Click "Add" button
   - Coach ID appears in input field

4. **Create Session:**
   ```
   Title: Kids Climbing Session
   Date: [Select future date/time]
   Duration: 60 minutes
   Capacity: 10
   Coach IDs: [Already filled from step 3]
   ```

5. **Success!** Session created with coach assigned.

---

## Files Updated

- ✅ `backend/src/routes/adminUsers.js` - New endpoint to get coaches
- ✅ `backend/src/routes/index.js` - Added admin users routes
- ✅ `frontend/public/test-api.html` - Updated with coach selection UI

---

## Testing

The test page now includes:
- ✅ "Get Coaches List" button
- ✅ Coach IDs input field
- ✅ Visual coach list with "Add" buttons
- ✅ Validation to ensure at least one coach ID

**Try it now in the test page!** 🚀

