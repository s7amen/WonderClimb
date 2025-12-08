import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

// Navigation Icons
const DashboardIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const ClockIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CalendarIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const UserIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const ClimberMobileBottomNav = () => {
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);

    // Handle window resize for mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Only show for authenticated users on mobile devices
    if (!isAuthenticated || !isMobile) {
        return null;
    }

    const navItems = [
        {
            name: 'Табло',
            href: '/dashboard/climber',
            icon: DashboardIcon,
        },
        {
            name: 'Моят график',
            href: '/my-sessions',
            icon: ClockIcon,
        },
        {
            name: 'График',
            href: '/sessions',
            icon: CalendarIcon,
        },
        {
            name: 'Профил',
            href: '/profile',
            icon: UserIcon,
        },
    ];

    const isActive = (path) => {
        if (path === '/sessions') {
            return location.pathname === '/sessions' || location.pathname.startsWith('/sessions');
        }
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#35383d] border-t border-gray-700"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="grid grid-cols-4 h-16">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`
                flex flex-col items-center justify-center gap-1 transition-colors
                ${active
                                    ? 'text-[#ea7a24]'
                                    : 'text-[#9ca3af] hover:text-white'
                                }
              `}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default ClimberMobileBottomNav;
