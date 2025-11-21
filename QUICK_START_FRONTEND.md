# 🚀 Quick Start: React Frontend Development

## ✅ Current Status

- ✅ Backend API: Running on http://localhost:3000
- ✅ Test Page: Available at `frontend/public/test-api.html`
- ✅ React Setup: Ready to start

---

## 🎯 Immediate Next Steps

### Step 1: Install Dependencies

```powershell
cd frontend
npm install
```

### Step 2: Start Development Server

```powershell
npm run dev
```

**Open**: http://localhost:5173

You should see: "🧗 WonderClimb - React app is ready!"

### Step 3: Start Building

**Recommended first steps**:

1. **Set up project structure**:
   ```
   src/
   ├── components/
   ├── pages/
   ├── services/
   ├── context/
   └── utils/
   ```

2. **Create authentication**:
   - Login page
   - Register page
   - Auth context
   - Protected routes

3. **Build admin dashboard**:
   - Session management
   - Calendar view
   - Coach management

---

## 📁 Project Structure (Recommended)

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Layout.jsx
│   │   ├── Forms/
│   │   │   ├── LoginForm.jsx
│   │   │   └── SessionForm.jsx
│   │   └── UI/
│   │       ├── Button.jsx
│   │       └── Card.jsx
│   ├── pages/              # Page components
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── Admin/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Sessions.jsx
│   │   │   └── Calendar.jsx
│   │   ├── Parent/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Children.jsx
│   │   │   └── Bookings.jsx
│   │   └── Coach/
│   │       ├── Dashboard.jsx
│   │       └── Attendance.jsx
│   ├── services/           # API services
│   │   ├── api.js          # Axios instance
│   │   ├── auth.js         # Auth API calls
│   │   ├── sessions.js     # Session API calls
│   │   └── bookings.js     # Booking API calls
│   ├── context/            # React context
│   │   └── AuthContext.jsx
│   ├── hooks/              # Custom hooks
│   │   └── useAuth.js
│   ├── utils/              # Utilities
│   │   └── constants.js
│   ├── App.jsx             # Main app
│   └── main.jsx            # Entry point
├── public/
│   └── test-api.html       # API test page
└── package.json
```

---

## 🛠️ Recommended Libraries

### Install These:

```powershell
npm install react-router-dom axios
npm install -D tailwindcss postcss autoprefixer
```

### Optional (but recommended):

```powershell
npm install react-hook-form date-fns
npm install @headlessui/react @heroicons/react  # If using Tailwind
```

---

## 📝 First Component: API Service

Create `src/services/api.js`:

```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## 📝 First Page: Login

Create `src/pages/Auth/Login.jsx`:

```javascript
import { useState } from 'react';
import api from '../../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('authToken', response.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
```

---

## 🎯 Development Workflow

1. **Start backend**: `cd backend && npm run dev`
2. **Start frontend**: `cd frontend && npm run dev`
3. **Test API**: Use `frontend/public/test-api.html` for quick API testing
4. **Build features**: Create components and pages
5. **Test flows**: Use browser to test user flows

---

## 📚 Next Steps Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Set up project structure
- [ ] Create API service layer
- [ ] Create authentication pages
- [ ] Set up routing
- [ ] Create admin dashboard
- [ ] Create parent portal
- [ ] Create coach portal
- [ ] Add styling (Tailwind CSS)
- [ ] Test all flows
- [ ] Deploy

---

## 🚀 Ready to Start?

```powershell
# 1. Install dependencies
cd frontend
npm install

# 2. Start dev server
npm run dev

# 3. Open browser
# http://localhost:5173
```

**Start building your admin panel!** 🎨

