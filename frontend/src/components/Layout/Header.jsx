import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../UI/Logo';
import { getUserDisplayName, getAvailableRoleDashboards } from '../../utils/userUtils';

const Header = ({ navigation = [] }) => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const isActive = (path) => {
    // Handle both old and new route paths
    if (path === '/climbers') {
      return location.pathname === '/climbers' || location.pathname === '/admin/climbers';
    }
    if (path === '/sessions') {
      return location.pathname === '/sessions' || location.pathname === '/admin/sessions';
    }
    if (path === '/calendar') {
      return location.pathname === '/calendar' || location.pathname === '/admin/calendar';
    }
    return location.pathname === path;
  };

  const availableDashboards = getAvailableRoleDashboards(user);
  const otherDashboards = availableDashboards.filter(d => {
    // Filter out current dashboard based on navigation
    const currentPath = location.pathname;
    if (currentPath.startsWith('/admin')) return d.role !== 'admin';
    if (currentPath.startsWith('/coach')) return d.role !== 'coach';
    if (currentPath.startsWith('/climber')) return d.role !== 'climber';
    if (currentPath.startsWith('/parent')) return d.role !== 'parent';
    return true;
  });

  return (
    <header className="bg-[#35383d] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[74px] py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Logo showText={true} size="md" />
          </div>

          {/* Navigation */}
          {navigation.length > 0 && (
            <nav className="flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    text-base font-normal text-white hover:text-gray-200 transition-colors
                    ${isActive(item.href) ? 'text-white font-medium' : ''}
                  `}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          )}

          {/* User Profile Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-transparent hover:bg-[#3d4146] rounded-[10px] px-4 py-2 transition-colors"
            >
              {/* User Icon */}
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              
              {/* User Name */}
              <span className="text-base font-normal text-white">
                {getUserDisplayName(user) || user?.email || 'Потребител'}
              </span>
              
              {/* Dropdown Icon */}
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                {otherDashboards.length > 0 && (
                  <>
                    {otherDashboards.map((dashboard) => (
                      <Link
                        key={dashboard.role}
                        to={dashboard.path}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowDropdown(false)}
                      >
                        {dashboard.label}
                      </Link>
                    ))}
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Изход
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

