import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getActiveRole } from '../../utils/userUtils';
import { NAVIGATION_CONFIG } from '../../config/navigation';
import SidebarLayout from './SidebarLayout';
import ClimberLayout from './ClimberLayout';

const UniversalLayout = () => {
    const { user } = useAuth();
    const location = useLocation();

    // Determine active role
    const activeRole = user ? getActiveRole(user, location.pathname) : null;

    // Check if this role has a sidebar configuration
    const config = activeRole ? NAVIGATION_CONFIG[activeRole] : [];
    const hasSidebar = config && config.length > 0;

    // Render appropriate layout
    if (hasSidebar) {
        return <SidebarLayout />;
    }

    return <ClimberLayout />;
};

export default UniversalLayout;
