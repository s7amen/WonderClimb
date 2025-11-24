import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../UI/Logo';
import { getUserDisplayName, getActiveRole, getDashboardPathForRole, getRoleLabel, getAvailableRoleDashboards } from '../../utils/userUtils';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAuthenticated, hasRole } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const availableRoles = user ? getAvailableRoleDashboards(user) : [];

  // Initialize selected role on mount or when user changes
  useEffect(() => {
    if (user && !selectedRole) {
      // Determine initial role based on pathname or highest priority
      const initialRole = getActiveRole(user, location.pathname);
      setSelectedRole(initialRole);
    }
  }, [user, selectedRole]);

  // Use selectedRole as activeRole, fallback to pathname-based detection only on initial load
  const activeRole = selectedRole || (user ? getActiveRole(user, location.pathname) : null);

  // Main menu items (same for everyone, except competitions for climbers)
  const getMainMenuItems = () => {
    const items = [
      { name: 'Начало', href: '/' },
      { name: 'График', href: '/sessions' },
      { name: 'График 1', href: '/training-schedule' },
      { name: 'Календар', href: '/calendar' },
    ];
    
    // Only show competitions for non-climber users or when not logged in
    // If user has climber role but also has admin/coach roles, show competitions
    if (!isAuthenticated || !user) {
      items.push({ name: 'Състезания', href: '/competitions' });
    } else {
      const hasClimberOnly = user.roles?.includes('climber') && !user.roles?.some(r => ['admin', 'coach'].includes(r));
      if (!hasClimberOnly) {
        items.push({ name: 'Състезания', href: '/competitions' });
      }
    }
    
    return items;
  };
  
  const mainMenuItems = getMainMenuItems();

  // Get second menu items based on active role
  const getSecondMenuItems = () => {
    if (!isAuthenticated || !user || !activeRole) return [];

    const items = [];

    // Dashboard based on active role
    const dashboardPath = getDashboardPathForRole(activeRole);
    if (dashboardPath) {
      items.push({ name: 'Табло', href: dashboardPath });
    }

    // My Schedule (for all logged in users)
    items.push({ name: 'Моя график', href: '/my-sessions' });

    // Role-specific items based on active role
    if (activeRole === 'admin') {
      items.push(
        { name: 'График', href: '/admin/sessions' },
        { name: 'Календар', href: '/calendar' },
        { name: 'Състезания', href: '/admin/competitions' },
        { name: 'Катерачи', href: '/admin/climbers' }
      );
    } else if (activeRole === 'coach') {
      items.push(
        { name: 'График', href: '/admin/sessions' },
        { name: 'Профил', href: '/profile' },
        { name: 'Състезания', href: '/admin/competitions' },
        { name: 'Катерачи', href: '/admin/climbers' }
      );
    } else if (activeRole === 'instructor') {
      items.push(
        { name: 'Катерачи', href: '/admin/climbers' }
      );
    } else if (activeRole === 'climber') {
      items.push(
        { name: 'График', href: '/sessions' },
        { name: 'Абонаменти', href: '/climber/subscriptions' },
        { name: 'Профил', href: '/profile' }
      );
    }

    return items;
  };

  // Get role label for second menu based on active role
  const getRoleLabelForMenu = () => {
    if (!activeRole) return '';
    return getRoleLabel(activeRole);
  };

  // Handle role switch
  const handleRoleSwitch = (role) => {
    setSelectedRole(role); // Set the selected role first
    const dashboardPath = getDashboardPathForRole(role);
    setShowDropdown(false);
    if (dashboardPath) {
      navigate(dashboardPath);
    }
  };

  const secondMenuItems = getSecondMenuItems();
  const roleLabel = getRoleLabelForMenu();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };

    if (showDropdown || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showMobileMenu]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMobileMenu]);

  const isActive = (path) => {
    // Handle exact matches and path starts with
    if (path === '/') {
      return location.pathname === '/';
    }
    if (path === '/sessions') {
      return location.pathname === '/sessions' || location.pathname.startsWith('/sessions');
    }
    if (path === '/training-schedule') {
      return location.pathname === '/training-schedule' || location.pathname.startsWith('/training-schedule');
    }
    if (path === '/admin/sessions') {
      return location.pathname === '/admin/sessions' || location.pathname.startsWith('/admin/sessions');
    }
    if (path === '/calendar') {
      return location.pathname === '/calendar' || location.pathname.startsWith('/calendar');
    }
    if (path === '/competitions') {
      return location.pathname === '/competitions' || location.pathname.startsWith('/competitions');
    }
    if (path === '/climbers') {
      return location.pathname === '/climbers' || location.pathname.startsWith('/climbers');
    }
    if (path === '/admin/climbers') {
      return location.pathname === '/admin/climbers' || location.pathname.startsWith('/admin/climbers');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Main Header - Always visible */}
      <header className="bg-[#35383d] border-b border-[rgba(229,231,235,0.2)] relative z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[70px]">
            {/* Logo */}
            <div className="flex items-center">
              <Logo showText={true} size="md" />
            </div>

            {/* Desktop Main Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {mainMenuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="relative"
                >
                  <span
                    className={`
                      text-base font-normal text-white hover:text-gray-200 transition-colors
                      ${isActive(item.href) ? 'text-[#ea7a24]' : ''}
                    `}
                  >
                    {item.name}
                  </span>
                  {isActive(item.href) && (
                    <div className="absolute bg-[#ea7a24] h-[2px] left-0 right-0 top-[38px]" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Desktop User Button */}
            {isAuthenticated ? (
              <div className="hidden lg:block relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 bg-transparent hover:bg-[#3d4146] rounded-[10px] px-4 py-2 transition-colors"
                  aria-label="User menu"
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
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowDropdown(false)}
                    >
                      Профил
                    </Link>
                    
                    {/* Roles section - only show if user has multiple roles */}
                    {availableRoles.length > 1 && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        {availableRoles.map((roleDashboard) => {
                          const isActive = activeRole === roleDashboard.role;
                          return (
                            <button
                              key={roleDashboard.role}
                              onClick={() => handleRoleSwitch(roleDashboard.role)}
                              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                isActive 
                                  ? 'text-[#ea7a24] font-medium' 
                                  : 'text-gray-700'
                              }`}
                            >
                              {roleDashboard.label}
                            </button>
                          );
                        })}
                      </>
                    )}
                    
                    <div className="border-t border-gray-200 my-1"></div>
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
            ) : (
              <div className="hidden lg:flex items-center gap-4">
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
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden flex items-center justify-center w-10 h-10 text-white hover:bg-[#3d4146] rounded-[10px] transition-colors"
              aria-label="Toggle mobile menu"
            >
              {showMobileMenu ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Second Menu - Only for logged in users */}
      {isAuthenticated && roleLabel && activeRole && (
        <div className="bg-[#2a2d31] border-b border-gray-700 sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 h-[44px]">
              {/* Role Label */}
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-[#ea7a24]"
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
                <span
                  className="text-[13px] font-medium text-[#ea7a24]"
                >
                  {roleLabel}
                </span>
              </div>

              {/* Second Menu Navigation - Desktop */}
              <nav className="hidden lg:flex items-center gap-4">
                {(() => {
                  const dashboardPath = getDashboardPathForRole(activeRole);
                  const schedulePath = activeRole === 'admin' || activeRole === 'coach' 
                    ? '/admin/sessions' 
                    : '/sessions';
                  
                  const desktopMenuItems = [];
                  
                  // Always add Табло if dashboard path exists
                  if (dashboardPath && dashboardPath !== '/') {
                    desktopMenuItems.push({ name: 'Табло', href: dashboardPath });
                  }
                  
                  // Always add График
                  desktopMenuItems.push({ name: 'График', href: schedulePath });
                  
                  // Always add Моя график
                  desktopMenuItems.push({ name: 'Моя график', href: '/my-sessions' });
                  
                  // Add other second menu items (excluding Табло, График, and Моя график if already added)
                  secondMenuItems.forEach((item) => {
                    const isDashboard = item.name === 'Табло' && dashboardPath && item.href === dashboardPath;
                    const isSchedule = item.name === 'График' && item.href === schedulePath;
                    const isMySchedule = item.name === 'Моя график' && item.href === '/my-sessions';
                    if (!isDashboard && !isSchedule && !isMySchedule) {
                      desktopMenuItems.push(item);
                    }
                  });
                  
                  return desktopMenuItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        text-sm font-normal transition-colors
                        ${isActive(item.href) 
                          ? 'text-[#ea7a24] font-medium' 
                          : 'text-[#d1d5dc] hover:text-white'
                        }
                      `}
                    >
                      {item.name}
                    </Link>
                  ));
                })()}
              </nav>

              {/* Second Menu Navigation - Mobile */}
              <nav className="lg:hidden flex items-center gap-3 overflow-x-auto flex-1">
                {(() => {
                  const dashboardPath = getDashboardPathForRole(activeRole);
                  const schedulePath = activeRole === 'admin' || activeRole === 'coach' 
                    ? '/admin/sessions' 
                    : '/sessions';
                  
                  const mobileSecondMenuItems = [];
                  
                  // Always add Табло if dashboard path exists
                  if (dashboardPath && dashboardPath !== '/') {
                    mobileSecondMenuItems.push({ name: 'Табло', href: dashboardPath });
                  }
                  
                  // Always add График
                  mobileSecondMenuItems.push({ name: 'График', href: schedulePath });
                  
                  // Always add Моя график
                  mobileSecondMenuItems.push({ name: 'Моя график', href: '/my-sessions' });
                  
                  return mobileSecondMenuItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        text-sm font-normal transition-colors whitespace-nowrap
                        ${isActive(item.href) 
                          ? 'text-[#ea7a24] font-medium' 
                          : 'text-[#d1d5dc] hover:text-white'
                        }
                      `}
                    >
                      {item.name}
                    </Link>
                  ));
                })()}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Mobile Menu Panel */}
          <div
            ref={mobileMenuRef}
            className="fixed top-0 right-0 bottom-0 w-80 bg-[#35383d] shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <Logo showText={true} size="md" />
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-10 h-10 flex items-center justify-center text-white hover:bg-[#3d4146] rounded-[10px] transition-colors"
                  aria-label="Close mobile menu"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* User Info Section */}
              {isAuthenticated && (
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ea7a24] flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
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
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {getUserDisplayName(user) || user?.email || 'Потребител'}
                      </p>
                      {user?.email && getUserDisplayName(user) && (
                        <p className="text-gray-400 text-sm truncate">{user.email}</p>
                      )}
                      {roleLabel && (
                        <p className="text-[#ea7a24] text-xs mt-1">{roleLabel}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Menu Links */}
              <nav className="flex-1 py-4 border-b border-gray-700">
                <div className="px-4 py-2 text-xs uppercase text-gray-400 tracking-wider">
                  Главно меню
                </div>
                {mainMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`
                      block px-4 py-3 text-base font-normal text-white hover:bg-[#3d4146] transition-colors
                      ${isActive(item.href) ? 'bg-[#3d4146] text-[#ea7a24] font-medium border-r-2 border-[#ea7a24]' : ''}
                    `}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Second Menu Links */}
              {isAuthenticated && activeRole && (
                <nav className="flex-1 py-4 border-b border-gray-700">
                  <div className="px-4 py-2 text-xs uppercase text-gray-400 tracking-wider">
                    {roleLabel}
                  </div>
                  {/* Always show Табло and График for mobile */}
                  {(() => {
                    const dashboardPath = getDashboardPathForRole(activeRole);
                    const schedulePath = activeRole === 'admin' || activeRole === 'coach' 
                      ? '/admin/sessions' 
                      : '/sessions';
                    
                    const mobileMenuItems = [];
                    
                    // Always add Табло if dashboard path exists
                    if (dashboardPath && dashboardPath !== '/') {
                      mobileMenuItems.push({ name: 'Табло', href: dashboardPath });
                    }
                    
                    // Always add График
                    mobileMenuItems.push({ name: 'График', href: schedulePath });
                    
                    // Add other second menu items (excluding Табло and График if already added)
                    secondMenuItems.forEach((item) => {
                      const isDashboard = item.name === 'Табло' && dashboardPath && item.href === dashboardPath;
                      const isSchedule = item.name === 'График' && item.href === schedulePath;
                      if (!isDashboard && !isSchedule) {
                        mobileMenuItems.push(item);
                      }
                    });
                    
                    return mobileMenuItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setShowMobileMenu(false)}
                        className={`
                          block px-4 py-3 text-sm font-normal transition-colors
                          ${isActive(item.href) 
                            ? 'bg-[#3d4146] text-[#ea7a24] font-medium border-r-2 border-[#ea7a24]' 
                            : 'text-[#d1d5dc] hover:bg-[#3d4146] hover:text-white'
                          }
                        `}
                      >
                        {item.name}
                      </Link>
                    ));
                  })()}
                </nav>
              )}

              {/* Auth Buttons for non-authenticated */}
              {!isAuthenticated && (
                <div className="flex-1 flex flex-col justify-center p-4 gap-4">
                  <Link
                    to="/login"
                    onClick={() => setShowMobileMenu(false)}
                    className="w-full text-center text-white hover:bg-[#3d4146] px-4 py-3 rounded-[10px] transition-colors"
                  >
                    Влез
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setShowMobileMenu(false)}
                    className="w-full bg-[#ea7a24] hover:bg-[#d86a1a] text-white px-4 py-3 rounded-[10px] text-center transition-colors"
                  >
                    Регистрирай се
                  </Link>
                </div>
              )}

              {/* Roles Section - only show if user has multiple roles */}
              {isAuthenticated && availableRoles.length > 1 && (
                <div className="border-t border-gray-700 py-4">
                  <div className="px-4 py-2 text-xs uppercase text-gray-400 tracking-wider">
                    Роли
                  </div>
                  {availableRoles.map((roleDashboard) => {
                    const isActive = activeRole === roleDashboard.role;
                    return (
                      <button
                        key={roleDashboard.role}
                        onClick={() => {
                          setShowMobileMenu(false);
                          handleRoleSwitch(roleDashboard.role);
                        }}
                        className={`block w-full text-left px-4 py-3 text-sm transition-colors ${
                          isActive 
                            ? 'bg-[#3d4146] text-[#ea7a24] font-medium border-r-2 border-[#ea7a24]' 
                            : 'text-[#d1d5dc] hover:bg-[#3d4146] hover:text-white'
                        }`}
                      >
                        {roleDashboard.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Logout Button */}
              {isAuthenticated && (
                <div className="border-t border-gray-700 p-4">
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      logout();
                    }}
                    className="w-full bg-[#ea7a24] hover:bg-[#d86a1a] text-white px-4 py-3 rounded-[10px] font-medium transition-colors"
                  >
                    Изход
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
