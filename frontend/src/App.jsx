import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/UI/Toast';
import RequireMinRole from './components/RequireMinRole';
import ProtectedRoute from './components/ProtectedRoute';
import ClimbingLoader from './components/UI/ClimbingLoader';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import lazyWithRetry from './utils/lazyWithRetry';

// Lazy load layouts
import AdminLayout from './components/Layout/AdminLayout';
import CoachLayout from './components/Layout/CoachLayout';
import ClimberLayout from './components/Layout/ClimberLayout';
import UniversalLayout from './components/Layout/UniversalLayout';

// Lazy load pages - NEW STRUCTURE
const Login = lazyWithRetry(() => import('./pages/Auth/Login'), { fallback: 'Login' });
const Register = lazyWithRetry(() => import('./pages/Auth/Register'), { fallback: 'Register' });
const Activate = lazyWithRetry(() => import('./pages/Auth/Activate'), { fallback: 'Activate' });
const CheckEmail = lazyWithRetry(() => import('./pages/Auth/CheckEmail'), { fallback: 'CheckEmail' });
const Callback = lazyWithRetry(() => import('./pages/Auth/Callback'), { fallback: 'Callback' });
const TermsOfService = lazyWithRetry(() => import('./pages/Public/TermsOfService'), { fallback: 'TermsOfService' });
// Use the restored Home page
const Landing = lazyWithRetry(() => import('./pages/Home/Home'), { fallback: 'Landing' });

// Dashboards
const AdminDashboard = lazyWithRetry(() => import('./pages/Dashboard/AdminDashboard'), { fallback: 'AdminDashboard' });
const CoachDashboard = lazyWithRetry(() => import('./pages/Dashboard/CoachDashboard'), { fallback: 'CoachDashboard' });
const InstructorDashboard = lazyWithRetry(() => import('./pages/Dashboard/InstructorDashboard'), { fallback: 'InstructorDashboard' });
const ClimberDashboard = lazyWithRetry(() => import('./pages/Dashboard/ClimberDashboard'), { fallback: 'ClimberDashboard' });
const ClimberSchedule = lazyWithRetry(() => import('./pages/Dashboard/ClimberSchedule'), { fallback: 'ClimberSchedule' });
const CoachAttendance = lazyWithRetry(() => import('./pages/Dashboard/CoachAttendance'), { fallback: 'CoachAttendance' });

// Sessions
const SessionsBrowse = lazyWithRetry(() => import('./pages/Sessions/Browse'), { fallback: 'SessionsBrowse' });
const SessionsManage = lazyWithRetry(() => import('./pages/Sessions/Manage'), { fallback: 'SessionsManage' });

// Competitions
const CompetitionsBrowse = lazyWithRetry(() => import('./pages/Competitions/Browse'), { fallback: 'CompetitionsBrowse' });
const CompetitionsPublicDetail = lazyWithRetry(() => import('./pages/Competitions/PublicDetail'), { fallback: 'CompetitionsPublicDetail' });
const CompetitionsManage = lazyWithRetry(() => import('./pages/Competitions/Manage'), { fallback: 'CompetitionsManage' });
const CompetitionsManageDetail = lazyWithRetry(() => import('./pages/Competitions/ManageDetail'), { fallback: 'CompetitionsManageDetail' });

// Climbers
const ClimbersList = lazyWithRetry(() => import('./pages/Climbers/List'), { fallback: 'ClimbersList' });
const ClimberProfile = lazyWithRetry(() => import('./pages/Climbers/Profile'), { fallback: 'ClimberProfile' });
const FamilyList = lazyWithRetry(() => import('./pages/Families/FamilyList'), { fallback: 'FamilyList' });
const FamilyProfile = lazyWithRetry(() => import('./pages/Families/Profile'), { fallback: 'FamilyProfile' });


// Gym
const GymDashboard = lazyWithRetry(() => import('./pages/Gym/Dashboard'), { fallback: 'GymDashboard' });
const GymCheckIn = lazyWithRetry(() => import('./pages/Gym/CheckIn'), { fallback: 'GymCheckIn' });
const GymPasses = lazyWithRetry(() => import('./pages/Gym/Passes'), { fallback: 'GymPasses' });
const GymVisits = lazyWithRetry(() => import('./pages/Gym/Visits'), { fallback: 'GymVisits' });
const GymPrices = lazyWithRetry(() => import('./pages/Gym/Prices'), { fallback: 'GymPrices' });

// Training
const TrainingDashboard = lazyWithRetry(() => import('./pages/Training/Dashboard'), { fallback: 'TrainingDashboard' });
const TrainingBookings = lazyWithRetry(() => import('./pages/Training/Bookings'), { fallback: 'TrainingBookings' });
const TrainingSessions = lazyWithRetry(() => import('./pages/Training/Sessions'), { fallback: 'TrainingSessions' });
const TrainingPasses = lazyWithRetry(() => import('./pages/Training/Passes'), { fallback: 'TrainingPasses' });
const TrainingAttendance = lazyWithRetry(() => import('./pages/Training/Attendance'), { fallback: 'TrainingAttendance' });

// Finance
const FinanceDashboard = lazyWithRetry(() => import('./pages/Finance/Dashboard'), { fallback: 'FinanceDashboard' });
const FinanceEntries = lazyWithRetry(() => import('./pages/Finance/Entries'), { fallback: 'FinanceEntries' });
const FinanceReports = lazyWithRetry(() => import('./pages/Finance/Reports'), { fallback: 'FinanceReports' });
const GymReport = lazyWithRetry(() => import('./pages/Finance/GymReport'), { fallback: 'GymReport' });
const TrainingReport = lazyWithRetry(() => import('./pages/Finance/TrainingReport'), { fallback: 'TrainingReport' });
const CoachFeesReport = lazyWithRetry(() => import('./pages/Finance/CoachFees'), { fallback: 'CoachFeesReport' });

// Products
const ProductsList = lazyWithRetry(() => import('./pages/Products/List'), { fallback: 'ProductsList' });
const ProductDetail = lazyWithRetry(() => import('./pages/Products/Detail'), { fallback: 'ProductDetail' });

// Calendar
const Calendar = lazyWithRetry(() => import('./pages/Calendar/Calendar'), { fallback: 'Calendar' });

// Settings
const Settings = lazyWithRetry(() => import('./pages/Settings/index'), { fallback: 'Settings' }); // Imports index.jsx

// User
const Profile = lazyWithRetry(() => import('./pages/Profile/Profile'), { fallback: 'Profile' });
const MyBookings = lazyWithRetry(() => import('./pages/MyBookings/MyBookings'), { fallback: 'MyBookings' });
const Subscriptions = lazyWithRetry(() => import('./pages/Climber/Subscriptions'), { fallback: 'Subscriptions' });

// Admin
const AdminPricing = lazyWithRetry(() => import('./pages/Admin/Pricing'), { fallback: 'AdminPricing' });
const CronJobs = lazyWithRetry(() => import('./pages/Admin/CronJobs'), { fallback: 'CronJobs' });


// Home component - redirects authenticated users to their dashboard
const Home = () => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f3f5]">
        <ClimbingLoader text="Зареждане..." />
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
    <ClimbingLoader text="Зареждане..." />
  </div>
);

import ErrorBoundary from './components/UI/ErrorBoundary';

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
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/activate" element={<Activate />} />
                <Route path="/check-email" element={<CheckEmail />} />
                <Route path="/auth/callback" element={<Callback />} />
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
                  <Route path="notifications" element={<Settings />} />
                  <Route path="cards" element={<Settings />} />
                  <Route path="training" element={<Settings />} />
                  <Route path="pricing" element={<AdminPricing />} />
                </Route>

                {/* Admin Cron Jobs - Admin only */}
                <Route
                  path="/admin/cron-jobs"
                  element={
                    <RequireMinRole minRole="admin">
                      <AdminLayout />
                    </RequireMinRole>
                  }
                >
                  <Route index element={<CronJobs />} />
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
          </ErrorBoundary>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
