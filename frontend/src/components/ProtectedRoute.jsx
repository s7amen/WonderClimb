import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ClimbingLoader from './UI/ClimbingLoader';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClimbingLoader text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role(s)
  // Admin can access all routes
  if (requiredRoles.length > 0) {
    const isAdmin = hasRole('admin');
    const hasRequiredRole = isAdmin || requiredRoles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      // Redirect to home, which will redirect authenticated users to their dashboard
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

