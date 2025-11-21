import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import AdminLayout from './components/Layout/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminSessions from './pages/Admin/Sessions';
import AdminCalendar from './pages/Admin/Calendar';
import AdminClimbers from './pages/Admin/Climbers';
import ClimberProfile from './pages/Admin/ClimberProfile';
import CoachLayout from './components/Layout/CoachLayout';
import CoachDashboard from './pages/Coach/Dashboard';
import CoachTodaysSessions from './pages/Coach/TodaysSessions';
import CoachAttendance from './pages/Coach/Attendance';
import ClimberLayout from './components/Layout/ClimberLayout';
import ClimberDashboard from './pages/Climber/Dashboard';
import ClimberSchedule from './pages/Climber/Schedule';
import ClimberBookings from './pages/Climber/Bookings';
import ParentLayout from './components/Layout/ParentLayout';
import ParentDashboard from './pages/Parent/Dashboard';
import ParentProfile from './pages/Parent/Profile';
import ParentSchedule from './pages/Parent/Schedule';
import ParentBookings from './pages/Parent/Bookings';
import ParentSavedSessions from './pages/Parent/SavedSessions';
import ParentSubscriptions from './pages/Parent/Subscriptions';
import Loading from './components/UI/Loading';
import Logo from './components/UI/Logo';
import Footer from './components/Layout/Footer';
import { getHighestPriorityRole } from './utils/userUtils';

// Home component that redirects authenticated users to their dashboard
const Home = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f3f5]">
        <Loading text="Зареждане..." />
      </div>
    );
  }

  if (isAuthenticated && user) {
    // Redirect authenticated users to their highest priority role dashboard
    const highestRole = getHighestPriorityRole(user);
    
    if (highestRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (highestRole === 'coach') {
      return <Navigate to="/coach/dashboard" replace />;
    } else if (highestRole === 'climber') {
      return <Navigate to="/climber/dashboard" replace />;
    }
  }

  // Show welcome page for non-authenticated users with Figma design
  return (
    <div className="min-h-screen bg-[#f3f3f5]">
      {/* Header */}
      <header className="bg-[#35383d] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[74px] py-4">
            <Logo showText={true} size="md" />
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-white hover:text-gray-200 transition-colors"
              >
                Влез
              </Link>
              <Link
                to="/register"
                className="bg-[#ea7a24] hover:bg-[#d86a1a] text-white px-4 py-2 rounded-[10px] transition-colors"
              >
                Регистрирай се
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-medium text-neutral-950 mb-4">
            Добре дошли в WonderClimb
          </h1>
          <p className="text-lg text-[#4a5565]">
            Управлявайте вашата катерачна зала ефективно
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-8">
            <h2 className="text-2xl font-medium text-neutral-950 mb-4">За WonderClimb</h2>
            <p className="text-[#4a5565] mb-6">
              Професионална система за управление на катерачни зали и тренировки. 
              Следете сесии, управлявайте катерачи и треньори, и организирайте вашата зала.
            </p>
          </div>
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-8">
            <h2 className="text-2xl font-medium text-neutral-950 mb-4">Започнете сега</h2>
            <p className="text-[#4a5565] mb-6">
              Регистрирайте се или влезте в системата, за да започнете да управлявате 
              вашата катерачна зала.
            </p>
            <div className="flex gap-4">
              <Link
                to="/login"
                className="flex-1 bg-[#35383d] hover:bg-[#2d3035] text-white px-6 py-3 rounded-[10px] text-center transition-colors"
              >
                Влез
              </Link>
              <Link
                to="/register"
                className="flex-1 bg-[#ea7a24] hover:bg-[#d86a1a] text-white px-6 py-3 rounded-[10px] text-center transition-colors"
              >
                Регистрирай се
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />

          {/* Protected routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={['admin', 'coach', 'instructor']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Root-level sessions route - accessible by admin and coach */}
          <Route
            path="/sessions"
            element={
              <ProtectedRoute requiredRoles={['admin', 'coach']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminSessions />} />
          </Route>

          {/* Root-level calendar route - accessible by admin and coach */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute requiredRoles={['admin', 'coach']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminCalendar />} />
          </Route>

          {/* Redirect old admin routes to new root-level routes */}
          <Route
            path="/admin/sessions"
            element={<Navigate to="/sessions" replace />}
          />
          <Route
            path="/admin/calendar"
            element={<Navigate to="/calendar" replace />}
          />

          {/* Climbers route - accessible from main site */}
          <Route
            path="/climbers"
            element={
              <ProtectedRoute requiredRoles={['admin', 'coach', 'instructor']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminClimbers />} />
            <Route path=":id" element={<ClimberProfile />} />
          </Route>

          {/* Redirect old admin/climbers route to new climbers route */}
          <Route
            path="/admin/climbers"
            element={<Navigate to="/climbers" replace />}
          />

          <Route
            path="/coach"
            element={
              <ProtectedRoute requiredRoles={['coach', 'admin']}>
                <CoachLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<CoachDashboard />} />
            <Route path="todays-sessions" element={<CoachTodaysSessions />} />
            <Route path="attendance" element={<CoachAttendance />} />
            <Route path="attendance/:sessionId" element={<CoachAttendance />} />
            <Route path="*" element={<Navigate to="/coach/dashboard" replace />} />
          </Route>

          <Route
            path="/climber"
            element={
              <ProtectedRoute requiredRoles={['climber', 'admin', 'coach']}>
                <ClimberLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ClimberDashboard />} />
            <Route path="schedule" element={<ClimberSchedule />} />
            <Route path="bookings" element={<ClimberBookings />} />
            <Route path="*" element={<Navigate to="/climber/dashboard" replace />} />
          </Route>

          <Route
            path="/parent"
            element={
              <ProtectedRoute requiredRoles={['climber', 'parent', 'admin', 'coach']}>
                <ParentLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="profile" element={<ParentProfile />} />
            <Route path="schedule" element={<ParentSchedule />} />
            <Route path="bookings" element={<ParentBookings />} />
            <Route path="saved-sessions" element={<ParentSavedSessions />} />
            <Route path="subscriptions" element={<ParentSubscriptions />} />
            <Route path="*" element={<Navigate to="/parent/profile" replace />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
