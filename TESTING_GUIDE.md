# 🧪 WonderClimb MVP Testing Guide

## Quick Start - Testing the Application

### Step 1: Start MongoDB

Make sure MongoDB is running:

```powershell
# Check if MongoDB is running
Get-Service MongoDB

# If not running, start it
Start-Service MongoDB
```

### Step 2: Start the Backend API

Open a terminal and run:

```powershell
cd backend
npm run dev
```

You should see:
```
Server running on port 3000 in development mode
MongoDB connected: mongodb://localhost:27017/wonderclimb
```

**Backend URL**: http://localhost:3000

### Step 3: Start the Frontend

Open a **new terminal** and run:

```powershell
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Frontend URL**: http://localhost:5173

---

## 🎯 Testing User Flows

### 1. Test Admin Flow

**Create Admin Account:**
1. Go to http://localhost:5173/register
2. Fill in:
   - Name: `Admin User`
   - Email: `admin@test.com`
   - Password: `password123`
   - **Check**: `admin` role (and optionally `parent`, `coach`)
3. Click "Create account"
4. You'll be redirected to `/admin/dashboard`

**Admin Features to Test:**
- ✅ **Dashboard**: View session statistics
- ✅ **Sessions**: 
  - Create new session (date, time, capacity, coaches)
  - Edit existing session
  - Cancel session
- ✅ **Calendar**: 
  - View sessions in month/week/day views
  - Click on sessions to see details
  - Navigate between dates

**Test Steps:**
1. Create at least 2-3 sessions with different dates/times
2. Assign coaches to sessions
3. View calendar in different views
4. Edit a session
5. Cancel a session

---

### 2. Test Parent Flow

**Create Parent Account:**
1. Go to http://localhost:5173/register
2. Fill in:
   - Name: `Parent User`
   - Email: `parent@test.com`
   - Password: `password123`
   - **Check**: `parent` role
3. Click "Create account"
4. You'll be redirected to `/parent/dashboard`

**Parent Features to Test:**
- ✅ **Dashboard**: View children and booking stats
- ✅ **My Children**:
  - Add a child (first name, last name, date of birth, notes)
  - Edit child information
  - Deactivate a child
- ✅ **Bookings**:
  - View available sessions
  - Book a single session for a child
  - Create recurring bookings (e.g., every Monday at 6pm)
  - View my bookings
  - Cancel a booking

**Test Steps:**
1. Add 2-3 children
2. Book sessions for your children
3. Try booking the same session twice (should fail)
4. Create recurring bookings
5. View your bookings list
6. Cancel a booking

---

### 3. Test Coach Flow

**Create Coach Account:**
1. Go to http://localhost:5173/register
2. Fill in:
   - Name: `Coach User`
   - Email: `coach@test.com`
   - Password: `password123`
   - **Check**: `coach` role
3. Click "Create account"
4. You'll be redirected to `/coach/dashboard`

**Coach Features to Test:**
- ✅ **Dashboard**: View today's sessions overview
- ✅ **Today's Sessions**: 
  - View all sessions assigned to you for today
  - See session details (time, capacity, booked climbers)
- ✅ **Attendance**:
  - Select a session
  - View roster of booked climbers
  - Mark attendance (Present/Absent) for each climber
  - Save attendance
  - **Mobile-friendly**: Test on mobile device or resize browser

**Test Steps:**
1. As admin, create a session and assign the coach
2. As parent, book children into that session
3. As coach, view today's sessions
4. Mark attendance for all climbers
5. Test on mobile device (responsive design)

---

## 🔄 Complete End-to-End Test Scenario

### Scenario: Full Booking and Attendance Flow

1. **Admin Setup:**
   - Register as admin
   - Create a session: "Monday Climbing Class" for next Monday at 6:00 PM
   - Assign coach (coach@test.com)
   - Set capacity to 10

2. **Parent Booking:**
   - Register as parent
   - Add child: "John Doe", age 8
   - Book "John Doe" into "Monday Climbing Class"
   - View booking confirmation

3. **Coach Attendance:**
   - Login as coach
   - View today's sessions (on the day of the session)
   - Open attendance for "Monday Climbing Class"
   - Mark "John Doe" as Present
   - Save attendance

4. **Verify:**
   - Admin can see session with booking count
   - Parent can see their booking
   - Coach can see attendance records

---

## 🌐 Application URLs

### Frontend (React App)
- **Main App**: http://localhost:5173
- **Login**: http://localhost:5173/login
- **Register**: http://localhost:5173/register
- **Admin Dashboard**: http://localhost:5173/admin/dashboard
- **Parent Dashboard**: http://localhost:5173/parent/dashboard
- **Coach Dashboard**: http://localhost:5173/coach/dashboard

### Backend API
- **Health Check**: http://localhost:3000/health
- **API Root**: http://localhost:3000/api/v1
- **API Docs**: http://localhost:3000/api/v1/docs

---

## 🐛 Troubleshooting

### Frontend won't start
```powershell
cd frontend
npm install
npm run dev
```

### Backend won't start
```powershell
cd backend
npm install
# Check MongoDB is running
Get-Service MongoDB
npm run dev
```

### Can't login / Authentication errors
- Make sure backend is running on port 3000
- Check browser console for errors
- Verify MongoDB is connected (check backend logs)

### CORS errors
- Make sure backend is running
- Frontend proxy is configured in `vite.config.js` to forward `/api` to `http://localhost:3000`

### Sessions not showing
- Make sure you created sessions as admin
- Check session dates are in the future
- Verify sessions have `active` status

### Can't book sessions
- Make sure you added children as parent
- Verify session has available capacity
- Check session date is within booking horizon (default 30 days)

---

## 📱 Mobile Testing

The coach attendance page is optimized for mobile devices. To test:

1. **Chrome DevTools:**
   - Open Chrome DevTools (F12)
   - Click device toolbar icon (Ctrl+Shift+M)
   - Select a mobile device (e.g., iPhone 12)
   - Navigate to coach attendance page

2. **Real Device:**
   - Find your computer's IP address: `ipconfig` (Windows)
   - On mobile device, navigate to: `http://YOUR_IP:5173`
   - Make sure mobile device is on same network

---

## ✅ MVP Success Criteria Checklist

- [ ] Admin can create/edit sessions via UI
- [ ] Parents can add children and book sessions via UI
- [ ] Coaches can mark attendance via UI (mobile-friendly)
- [ ] All core flows work end-to-end without errors
- [ ] UI is usable and responsive
- [ ] Role-based access control enforced (parents can't access admin, etc.)

---

## 🎉 Ready to Test!

Start both servers and begin testing. If you encounter any issues, check the browser console (F12) and backend terminal for error messages.
