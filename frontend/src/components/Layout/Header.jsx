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
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const availableRoles = user ? getAvailableRoleDashboards(user) : [];

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Main menu items (same for everyone)
  const getMainMenuItems = () => {
    return [
      { name: 'Начало', href: '/' },
      { name: 'График', href: '/sessions' },
      { name: 'Календар', href: '/calendar' },
    ];
  };

  const mainMenuItems = getMainMenuItems();

  // Get second menu items - only for climbers
  const getSecondMenuItems = () => {
    if (!isAuthenticated || !user) return [];

    // Only show secondary menu for climbers
    // If user has other roles, they should use the sidebar in their dashboard
    // But if they are on the home page, maybe they want to act as a climber?
    // The request specifically says "Secondary menu ... for logged in users with role climbers"

    // Check if user has climber role or is in climber mode
    const isClimber = activeRole === 'climber' || (user.roles && user.roles.includes('climber'));

    if (isClimber) {
      return [
        { name: 'Табло', href: '/dashboard/climber' },
        { name: 'Моят график', href: '/my-sessions' },
        { name: 'График', href: '/sessions' },
        { name: 'Абонаменти', href: '/climber/subscriptions' },
        { name: 'Профил', href: '/profile' },
      ];
    }

    return [];
  };

  // Get mobile second menu items - for climbers, hide this menu (they have bottom nav instead)
  const getMobileSecondMenuItems = () => {
    const allItems = getSecondMenuItems();

    // For climbers, don't show the horizontal menu on mobile - they have bottom nav
    if (activeRole === 'climber') {
      return [];
    }

    return allItems;
  };

  // Get role label for second menu based on active role
  const getRoleLabelForMenu = () => {
    if (!activeRole) return '';
    // Don't show label for climbers
    if (activeRole === 'climber') return '';
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
  const mobileSecondMenuItems = getMobileSecondMenuItems();
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
    if (path === '/sessions/manage') {
      return location.pathname === '/sessions/manage' || location.pathname.startsWith('/sessions/manage');
    }
    if (path === '/calendar') {
      return location.pathname === '/calendar' || location.pathname.startsWith('/calendar');
    }
    if (path === '/competitions') {
      return location.pathname === '/competitions' || location.pathname.startsWith('/competitions');
    }
    if (path === '/competitions/manage') {
      return location.pathname === '/competitions/manage' || location.pathname.startsWith('/competitions/manage');
    }
    if (path === '/climbers') {
      return location.pathname === '/climbers' || location.pathname.startsWith('/climbers');
    }
    if (path === '/gym') {
      return location.pathname === '/gym' || location.pathname.startsWith('/gym');
    }
    if (path === '/training') {
      return location.pathname === '/training' || location.pathname.startsWith('/training');
    }
    if (path === '/finance') {
      return location.pathname === '/finance' || location.pathname.startsWith('/finance');
    }
    if (path === '/products') {
      return location.pathname === '/products' || location.pathname.startsWith('/products');
    }
    if (path === '/settings') {
      return location.pathname === '/settings' || location.pathname.startsWith('/settings');
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
            <Link to="/" className="flex items-center gap-4">
              {/* Logo Icon - full height of header with 2px padding top and bottom */}
              <div className="relative h-[70px] w-auto shrink-0 flex items-center py-[2px]">
                <img
                  alt="WonderClimb Logo"
                  src="/white_logo_chudnite_skali.png"
                  className="h-full w-auto object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.nextSibling;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                {/* Fallback SVG */}
                <svg
                  className="h-full w-auto hidden"
                  viewBox="0 0 128 128"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <rect x="0" y="0" width="128" height="128" rx="16" fill="#EA7A24" />
                  <path d="M20 100 L40 80 L60 90 L80 60 L100 70 L110 40" stroke="#35383d" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                  <path d="M40 80 L45 75 L50 80 L45 85 Z" fill="#ADB933" />
                  <path d="M60 90 L65 85 L70 90 L65 95 Z" fill="#ADB933" />
                  <path d="M80 60 L85 55 L90 60 L85 65 Z" fill="#ADB933" />
                  <circle cx="20" cy="100" r="4" fill="#ADB933" />
                  <circle cx="100" cy="70" r="4" fill="#ADB933" />
                  <path d="M20 100 L25 95 L30 100 L25 105 Z" fill="#35383d" />
                  <path d="M80 60 L85 55 L90 60 L85 65 Z" fill="#35383d" />
                  <circle cx="110" cy="40" r="8" fill="#35383d" />
                  <circle cx="110" cy="40" r="4" fill="white" />
                </svg>
              </div>
              {/* Text container with equal width for both texts */}
              <div className="flex flex-col items-start min-w-[200px]">
                <div className="font-bold text-[1.5rem] leading-tight w-full" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <span style={{ color: '#ea7a24' }}>Wonder</span>
                  <span style={{ color: '#adb933' }}>Climb</span>
                </div>
                <span className="text-white text-[0.75rem] mt-1 w-full">
                  СК „Чудните скали" Варна
                </span>
              </div>
            </Link>

            {/* Desktop Main Navigation */}
            {(!isAuthenticated || (user?.roles?.includes('climber'))) && (
              <nav className="hidden lg:flex items-center gap-6">
                {mainMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="relative"
                  >
                    <span
                      className={`
                        text-[1.125rem] font-normal text-white hover:text-gray-200 transition-colors
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
            )}

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
                              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${isActive
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
      {isAuthenticated && secondMenuItems.length > 0 && (!isMobile || mobileSecondMenuItems.length > 0) && (
        <div className="bg-[#2a2d31] border-b border-gray-700 sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 h-[44px]">
              {/* Role Label - only show if not empty */}
              {roleLabel && (
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
              )}

              {/* Second Menu Navigation - Desktop */}
              <nav className="hidden lg:flex items-center gap-4">
                {secondMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      text-[1rem] font-normal transition-colors
                      ${isActive(item.href)
                        ? 'text-[#ea7a24] font-medium'
                        : 'text-[#d1d5dc] hover:text-white'
                      }
                    `}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Second Menu Navigation - Mobile (outside hamburger menu) */}
              {mobileSecondMenuItems.length > 0 && (
                <nav className="lg:hidden flex items-center gap-3 overflow-x-auto">
                  {mobileSecondMenuItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        text-[1rem] font-normal transition-colors whitespace-nowrap
                        ${isActive(item.href)
                          ? 'text-[#ea7a24] font-medium'
                          : 'text-[#d1d5dc] hover:text-white'
                        }
                      `}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              )}
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
                <Link
                  to="/profile"
                  onClick={() => setShowMobileMenu(false)}
                  className="block p-4 border-b border-gray-700 hover:bg-[#3d4146] transition-colors"
                >
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
                </Link>
              )}

              {/* Main Menu Links */}
              {(!isAuthenticated || (user?.roles?.includes('climber'))) && (
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
                        block px-4 py-3 text-[1.125rem] font-normal text-white hover:bg-[#3d4146] transition-colors
                        ${isActive(item.href) ? 'bg-[#3d4146] text-[#ea7a24] font-medium border-r-2 border-[#ea7a24]' : ''}
                      `}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              )}

              {/* Second Menu Links - Full menu in hamburger */}
              {isAuthenticated && secondMenuItems.length > 0 && (
                <nav className="flex-1 py-4 border-b border-gray-700">
                  {roleLabel && (
                    <div className="px-4 py-2 text-xs uppercase text-gray-400 tracking-wider">
                      {roleLabel}
                    </div>
                  )}
                  {secondMenuItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className={`
                        block px-4 py-3 text-[1rem] font-normal transition-colors
                        ${isActive(item.href)
                          ? 'bg-[#3d4146] text-[#ea7a24] font-medium border-r-2 border-[#ea7a24]'
                          : 'text-[#d1d5dc] hover:bg-[#3d4146] hover:text-white'
                        }
                      `}
                    >
                      {item.name}
                    </Link>
                  ))}
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
                        className={`block w-full text-left px-4 py-3 text-sm transition-colors ${isActive
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
