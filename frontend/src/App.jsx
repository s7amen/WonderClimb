import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/UI/Loading';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

// Lazy load layouts (smaller, can be loaded immediately)
import AdminLayout from './components/Layout/AdminLayout';
import CoachLayout from './components/Layout/CoachLayout';
import ClimberLayout from './components/Layout/ClimberLayout';
import ParentLayout from './components/Layout/ParentLayout';

// Lazy load pages for better code splitting
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AdminSessions = lazy(() => import('./pages/Admin/Sessions'));
const AdminCalendar = lazy(() => import('./pages/Admin/Calendar'));
const AdminClimbers = lazy(() => import('./pages/Admin/Climbers'));
const AdminSettings = lazy(() => import('./pages/Admin/Settings'));
const ClimberProfile = lazy(() => import('./pages/Admin/ClimberProfile'));
const Competitions = lazy(() => import('./pages/Admin/Competitions'));
const CompetitionDetail = lazy(() => import('./pages/Admin/CompetitionDetail'));
const PublicCompetition = lazy(() => import('./pages/Public/Competition'));
const PublicCompetitionDetail = lazy(() => import('./pages/Public/CompetitionDetail'));
const PublicSessions = lazy(() => import('./pages/Public/Sessions'));
const TermsOfService = lazy(() => import('./pages/Public/TermsOfService'));
const CoachDashboard = lazy(() => import('./pages/Coach/Dashboard'));
const CoachAttendance = lazy(() => import('./pages/Coach/Attendance'));
const InstructorDashboard = lazy(() => import('./pages/Instructor/Dashboard'));
const ClimberDashboard = lazy(() => import('./pages/Climber/Dashboard'));
const ClimberSchedule = lazy(() => import('./pages/Climber/Schedule'));
const ParentDashboard = lazy(() => import('./pages/Parent/Dashboard'));
const ParentProfile = lazy(() => import('./pages/Parent/Profile'));
const ParentSchedule = lazy(() => import('./pages/Parent/Schedule'));
const ParentBookings = lazy(() => import('./pages/Parent/Bookings'));
const ParentSavedSessions = lazy(() => import('./pages/Parent/SavedSessions'));
const ParentSubscriptions = lazy(() => import('./pages/Parent/Subscriptions'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const MySessions = lazy(() => import('./pages/MySessions/MySessions'));
const PublicLandingPage = lazy(() => import('./pages/Home/Home'));

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

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f3f3f5]">
    <Loading text="Зареждане..." />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
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

          {/* Admin settings route - accessible by admin only */}
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/settings/messages" replace />} />
            <Route path="messages" element={<AdminSettings />} />
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
          <Route
            path="/climber/subscriptions"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
                  <Header />
                  <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                    <ParentSubscriptions />
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
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
