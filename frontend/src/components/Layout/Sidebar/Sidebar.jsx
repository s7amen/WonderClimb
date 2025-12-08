import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { NAVIGATION_CONFIG } from '../../../config/navigation';
import { getActiveRole } from '../../../utils/userUtils';
import PrimarySidebar from './PrimarySidebar';
import SecondarySidebar from './SecondarySidebar';

const Sidebar = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [activeCategory, setActiveCategory] = useState(null);

    // Determine active role and config
    const activeRole = user ? getActiveRole(user, location.pathname) : null;
    const config = activeRole ? NAVIGATION_CONFIG[activeRole] : [];

    // Determine active category based on current path
    useEffect(() => {
        if (config && config.length > 0) {
            // Find category that contains the current path
            const foundCategory = config.find(cat =>
                cat.items.some(item =>
                    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                )
            );

            if (foundCategory) {
                setActiveCategory(foundCategory.id);
            } else if (config.length > 0) {
                // Default to first category if no match
                setActiveCategory(config[0].id);
            }
        }
    }, [location.pathname, config]);

    if (!config || config.length === 0) return null;

    const currentCategory = config.find(c => c.id === activeCategory);

    return (
        <div className="flex h-screen sticky top-0">
            <PrimarySidebar
                categories={config}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />
            <SecondarySidebar category={currentCategory} />
        </div>
    );
};

export default Sidebar;
