import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/UI/Toast';
import RequireMinRole from './components/RequireMinRole';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/UI/Loading';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

// Lazy load layouts
import AdminLayout from './components/Layout/AdminLayout';
import CoachLayout from './components/Layout/CoachLayout';
import ClimberLayout from './components/Layout/ClimberLayout';
import UniversalLayout from './components/Layout/UniversalLayout';

// Lazy load pages - NEW STRUCTURE
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const TermsOfService = lazy(() => import('./pages/Public/TermsOfService'));
// Use the restored Home page
const Landing = lazy(() => import('./pages/Home/Home'));

// Dashboards
const AdminDashboard = lazy(() => import('./pages/Dashboard/AdminDashboard'));
const CoachDashboard = lazy(() => import('./pages/Dashboard/CoachDashboard'));
const InstructorDashboard = lazy(() => import('./pages/Dashboard/InstructorDashboard'));
const ClimberDashboard = lazy(() => import('./pages/Dashboard/ClimberDashboard'));
const ClimberSchedule = lazy(() => import('./pages/Dashboard/ClimberSchedule'));
const CoachAttendance = lazy(() => import('./pages/Dashboard/CoachAttendance'));

// Sessions
const SessionsBrowse = lazy(() => import('./pages/Sessions/Browse'));
const SessionsManage = lazy(() => import('./pages/Sessions/Manage'));

// Competitions
const CompetitionsBrowse = lazy(() => import('./pages/Competitions/Browse'));
const CompetitionsPublicDetail = lazy(() => import('./pages/Competitions/PublicDetail'));
const CompetitionsManage = lazy(() => import('./pages/Competitions/Manage'));
const CompetitionsManageDetail = lazy(() => import('./pages/Competitions/ManageDetail'));

// Climbers
const ClimbersList = lazy(() => import('./pages/Climbers/List'));
const ClimberProfile = lazy(() => import('./pages/Climbers/Profile'));
const FamilyList = lazy(() => import('./pages/Families/FamilyList'));
const FamilyProfile = lazy(() => import('./pages/Families/Profile'));


// Gym
const GymDashboard = lazy(() => import('./pages/Gym/Dashboard'));
const GymCheckIn = lazy(() => import('./pages/Gym/CheckIn'));
const GymPasses = lazy(() => import('./pages/Gym/Passes'));
const GymVisits = lazy(() => import('./pages/Gym/Visits'));
const GymPrices = lazy(() => import('./pages/Gym/Prices'));

// Training
const TrainingDashboard = lazy(() => import('./pages/Training/Dashboard'));
const TrainingBookings = lazy(() => import('./pages/Training/Bookings'));
const TrainingSessions = lazy(() => import('./pages/Training/Sessions'));
const TrainingPasses = lazy(() => import('./pages/Training/Passes'));
const TrainingAttendance = lazy(() => import('./pages/Training/Attendance'));

// Finance
const FinanceDashboard = lazy(() => import('./pages/Finance/Dashboard'));
const FinanceEntries = lazy(() => import('./pages/Finance/Entries'));
const FinanceReports = lazy(() => import('./pages/Finance/Reports'));
const GymReport = lazy(() => import('./pages/Finance/GymReport'));
const TrainingReport = lazy(() => import('./pages/Finance/TrainingReport'));
const CoachFeesReport = lazy(() => import('./pages/Finance/CoachFees'));

// Products
const ProductsList = lazy(() => import('./pages/Products/List'));
const ProductDetail = lazy(() => import('./pages/Products/Detail'));

// Calendar
const Calendar = lazy(() => import('./pages/Calendar/Calendar'));

// Settings
const Settings = lazy(() => import('./pages/Settings/index')); // Imports index.jsx

// User
const Profile = lazy(() => import('./pages/Profile/Profile'));
const MyBookings = lazy(() => import('./pages/MyBookings/MyBookings'));
const Subscriptions = lazy(() => import('./pages/Climber/Subscriptions'));

// Admin
const AdminPricing = lazy(() => import('./pages/Admin/Pricing'));


// Home component - redirects authenticated users to their dashboard
const Home = () => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f3f5]">
        <Loading text="Зареждане..." />
      </div>
    );
  }

  // Redirect authenticated users to their appropriate dashboard
  // if (user) {
  //   if (hasRole('admin')) return <Navigate to="/dashboard/admin" replace />;
  //   if (hasRole('coach')) return <Navigate to="/dashboard/coach" replace />;
  //   if (hasRole('instructor')) return <Navigate to="/dashboard/instructor" replace />;
  //   if (hasRole('climber')) return <Navigate to="/dashboard/climber" replace />;
  // }

  return <Landing />;
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
      <ToastProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/" element={<Home />} />

              {/* Public Browsing */}
              <Route path="/sessions" element={<UniversalLayout />}>
                <Route index element={<SessionsBrowse />} />
              </Route>
              <Route path="/competitions" element={<UniversalLayout />}>
                <Route index element={<CompetitionsBrowse />} />
                <Route path=":id" element={<CompetitionsPublicDetail />} />
              </Route>

              {/* Unified Dashboard Routes */}
              <Route path="/dashboard">
                {/* Admin Dashboard */}
                <Route
                  path="admin"
                  element={
                    <RequireMinRole minRole="admin">
                      <AdminLayout />
                    </RequireMinRole>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                </Route>

                {/* Coach Dashboard */}
                <Route
                  path="coach"
                  element={
                    <RequireMinRole minRole="coach">
                      <CoachLayout />
                    </RequireMinRole>
                  }
                >
                  <Route index element={<CoachDashboard />} />
                  <Route path="attendance" element={<CoachAttendance />} />
                  <Route path="attendance/:sessionId" element={<CoachAttendance />} />
                </Route>

                {/* Instructor Dashboard */}
                <Route
                  path="instructor"
                  element={
                    <RequireMinRole minRole="instructor">
                      <CoachLayout />
                    </RequireMinRole>
                  }
                >
                  <Route index element={<InstructorDashboard />} />
                </Route>

                {/* Climber Dashboard */}
                <Route
                  path="climber"
                  element={
                    <RequireMinRole minRole="climber">
                      <ClimberLayout />
                    </RequireMinRole>
                  }
                >
                  <Route index element={<ClimberDashboard />} />
                  <Route path="schedule" element={<ClimberSchedule />} />
                </Route>
              </Route>

              {/* Feature Routes - Staff Management */}

              {/* Sessions Management - Coach, Admin */}
              <Route
                path="/sessions/manage"
                element={
                  <RequireMinRole minRole="coach">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<SessionsManage />} />
              </Route>

              {/* Climbers Management - Instructor, Coach, Admin */}
              <Route
                path="/climbers"
                element={
                  <RequireMinRole minRole="instructor">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<ClimbersList />} />
                <Route path=":id" element={<ClimberProfile />} />
              </Route>

              {/* Family Management - Instructor, Coach, Admin */}
              <Route
                path="/families"
                element={
                  <RequireMinRole minRole="instructor">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<FamilyList />} />
                <Route path=":id" element={<FamilyProfile />} />
              </Route>

              {/* Gym Management - Instructor+ */}
              <Route
                path="/gym"
                element={
                  <RequireMinRole minRole="instructor">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<GymDashboard />} />
                <Route path="check-in" element={<GymCheckIn />} />
                <Route path="passes" element={<GymPasses />} />
                <Route path="visits" element={<GymVisits />} />
                <Route path="prices" element={<GymPrices />} />
              </Route>

              {/* Training Management - Coach+ */}
              <Route
                path="/training"
                element={
                  <RequireMinRole minRole="coach">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<TrainingDashboard />} />
                <Route path="bookings" element={<TrainingBookings />} />
                <Route path="climbers" element={<ClimbersList type="training" />} />
                <Route path="sessions" element={<TrainingSessions />} />
                <Route path="passes" element={<TrainingPasses />} />
                <Route path="attendance" element={<TrainingAttendance />} />
              </Route>

              {/* Competition Management - Coach, Admin */}
              <Route
                path="/competitions/manage"
                element={
                  <RequireMinRole minRole="coach">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<CompetitionsManage />} />
                <Route path=":id" element={<CompetitionsManageDetail />} />
              </Route>

              {/* Finance Management - Admin only */}
              <Route
                path="/finance"
                element={
                  <RequireMinRole minRole="admin">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<FinanceDashboard />} />
                <Route path="entries" element={<FinanceEntries />} />
                <Route path="reports" element={<FinanceReports />} />
                <Route path="reports/gym" element={<GymReport />} />
                <Route path="reports/training" element={<TrainingReport />} />
                <Route path="reports/coach-fees" element={<CoachFeesReport />} />
              </Route>

              {/* Product Management - Admin only */}
              <Route
                path="/products"
                element={
                  <RequireMinRole minRole="admin">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<ProductsList />} />
                <Route path=":id" element={<ProductDetail />} />
              </Route>

              {/* Settings - Admin only */}
              <Route
                path="/settings"
                element={
                  <RequireMinRole minRole="admin">
                    <AdminLayout />
                  </RequireMinRole>
                }
              >
                <Route index element={<Navigate to="/settings/messages" replace />} />
                <Route path="messages" element={<Settings />} />
                <Route path="cards" element={<Settings />} />
                <Route path="pricing" element={<AdminPricing />} />
              </Route>

              {/* Calendar - All authenticated users */}
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <UniversalLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Calendar />} />
              </Route>

              {/* Universal routes - All authenticated users */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UniversalLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Profile />} />
              </Route>

              <Route
                path="/my-sessions"
                element={
                  <ProtectedRoute>
                    <UniversalLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MyBookings />} />
              </Route>

              <Route
                path="/climber/subscriptions"
                element={
                  <ProtectedRoute>
                    <ClimberLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Subscriptions />} />
              </Route>

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
