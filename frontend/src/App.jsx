import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import React from 'react';
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
import Competitions from './pages/Admin/Competitions';
import CompetitionDetail from './pages/Admin/CompetitionDetail';
import PublicCompetition from './pages/Public/Competition';
import PublicCompetitionDetail from './pages/Public/CompetitionDetail';
import PublicSessions from './pages/Public/Sessions';
import PublicSessions1 from './pages/Public/Sessions1';
import CoachLayout from './components/Layout/CoachLayout';
import CoachDashboard from './pages/Coach/Dashboard';
import CoachAttendance from './pages/Coach/Attendance';
import InstructorDashboard from './pages/Instructor/Dashboard';
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
import Profile from './pages/Profile/Profile';
import MySessions from './pages/MySessions/MySessions';
import HomePage from './pages/Home/HomePage';
import PublicLandingPage from './pages/Home/Home';
import Loading from './components/UI/Loading';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

// Home component - always shows public landing page
const Home = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f3f5]">
        <Loading text="Зареждане..." />
      </div>
    );
  }

  return <PublicLandingPage />;
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

          {/* Root-level calendar route - accessible by all users */}
          <Route
            path="/calendar"
            element={<AdminLayout />}
          >
            <Route index element={<AdminCalendar />} />
          </Route>

          {/* Public routes - accessible without authentication */}
          <Route path="/sessions" element={<PublicSessions />} />
          <Route path="/sessions-1" element={<PublicSessions1 />} />
          <Route path="/competitions" element={<PublicCompetition />} />
          <Route path="/competitions/:id" element={<PublicCompetitionDetail />} />

          {/* Admin competition routes - accessible by admin and coach */}
          <Route
            path="/admin/competitions"
            element={
              <ProtectedRoute requiredRoles={['admin', 'coach']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Competitions />} />
            <Route path=":id" element={<CompetitionDetail />} />
          </Route>

          {/* Admin sessions route - accessible by admin and coach */}
          <Route
            path="/admin/sessions"
            element={
              <ProtectedRoute requiredRoles={['admin', 'coach']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminSessions />} />
          </Route>

          {/* Admin climbers route - accessible by admin, coach, and instructor */}
          <Route
            path="/admin/climbers"
            element={
              <ProtectedRoute requiredRoles={['admin', 'coach', 'instructor']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminClimbers />} />
            <Route path=":id" element={<ClimberProfile />} />
          </Route>

          {/* Universal routes - accessible by all authenticated users */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
                  <Header />
                  <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                    <Profile />
                  </main>
                  <Footer />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-sessions"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
                  <Header />
                  <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                    <MySessions />
                  </main>
                  <Footer />
                </div>
              </ProtectedRoute>
            }
          />

          {/* Redirect old admin/calendar route */}
          <Route
            path="/admin/calendar"
            element={<Navigate to="/calendar" replace />}
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
            <Route path="attendance" element={<CoachAttendance />} />
            <Route path="attendance/:sessionId" element={<CoachAttendance />} />
            <Route path="*" element={<Navigate to="/coach/dashboard" replace />} />
          </Route>

          <Route
            path="/instructor"
            element={
              <ProtectedRoute requiredRoles={['instructor', 'admin']}>
                <CoachLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<InstructorDashboard />} />
            <Route path="*" element={<Navigate to="/instructor/dashboard" replace />} />
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
              <ProtectedRoute requiredRoles={['climber', 'admin', 'coach']}>
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
