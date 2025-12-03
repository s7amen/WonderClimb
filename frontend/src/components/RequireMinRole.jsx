import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role hierarchy: climber(1) < instructor(2) < coach(3) < admin(4)
const ROLE_LEVELS = {
    climber: 1,
    instructor: 2,
    coach: 3,
    admin: 4,
};

/**
 * Component to protect routes based on minimum required role
 * 
 * Usage:
 * <Route path="/admin" element={
 *   <RequireMinRole minRole="admin">
 *     <AdminDashboard />
 *   </RequireMinRole>
 * } />
 * 
 * @param {string} minRole - Minimum required role ('climber', 'instructor', 'coach', or 'admin')
 * @param {ReactNode} children - Component to render if user has sufficient role
 * @param {string} redirectTo - Path to redirect to if access denied (default: '/')
 */
const RequireMinRole = ({ minRole, children, redirectTo = '/' }) => {
    const { user, loading } = useAuth();

    // Still loading auth state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Зареждане...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has minimum required role
    const userRoles = user.roles || [];
    const minRoleLevel = ROLE_LEVELS[minRole] || 0;

    // Get user's highest role level
    const userMaxLevel = Math.max(
        ...userRoles.map(role => ROLE_LEVELS[role] || 0),
        0
    );

    // User doesn't have sufficient role - redirect or show error
    if (userMaxLevel < minRoleLevel) {
        console.warn(`Access denied: User has roles ${userRoles.join(', ')} but needs at least ${minRole}`);
        return <Navigate to={redirectTo} replace />;
    }

    // User has sufficient role - render children
    return children;
};

export default RequireMinRole;
