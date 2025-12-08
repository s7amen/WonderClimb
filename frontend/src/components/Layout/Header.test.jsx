import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import * as AuthContext from '../../context/AuthContext';
import * as userUtils from '../../utils/userUtils';

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock userUtils
vi.mock('../../utils/userUtils', () => ({
    getUserDisplayName: () => 'Test User',
    getActiveRole: vi.fn(),
    getDashboardPathForRole: () => '/dashboard/climber',
    getRoleLabel: (role) => role,
    getAvailableRoleDashboards: () => [],
}));

describe('Header Menu Visibility', () => {
    const mockUseAuth = AuthContext.useAuth;
    const mockGetActiveRole = userUtils.getActiveRole;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderHeader = () => {
        render(
            <MemoryRouter>
                <Header />
            </MemoryRouter>
        );
    };

    it('shows Main Menu and hides Secondary Menu for Guest (not logged in)', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            user: null,
            logout: vi.fn(),
            hasRole: () => false,
        });
        mockGetActiveRole.mockReturnValue(null);

        renderHeader();

        // Main Menu items should be visible
        expect(screen.getByText('Начало')).toBeInTheDocument();

        // Secondary Menu items should NOT be visible
        expect(screen.queryByText('Табло')).not.toBeInTheDocument();
        expect(screen.queryByText('Моя график')).not.toBeInTheDocument();
    });

    it('shows Main Menu and Secondary Menu for Climber', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            user: { roles: ['climber'] },
            logout: vi.fn(),
            hasRole: (role) => role === 'climber',
        });
        mockGetActiveRole.mockReturnValue('climber');

        renderHeader();

        // Main Menu items should be visible
        expect(screen.getByText('Начало')).toBeInTheDocument();

        // Secondary Menu items should be visible
        expect(screen.getByText('Табло')).toBeInTheDocument();
        expect(screen.getByText('Моя график')).toBeInTheDocument();
    });

    it('hides Main Menu and Secondary Menu for Instructor (no climber role)', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            user: { roles: ['instructor'] },
            logout: vi.fn(),
            hasRole: (role) => role === 'instructor',
        });
        mockGetActiveRole.mockReturnValue('instructor');

        renderHeader();

        // Main Menu items should NOT be visible
        expect(screen.queryByText('Начало')).not.toBeInTheDocument();

        // Secondary Menu items should NOT be visible
        expect(screen.queryByText('Табло')).not.toBeInTheDocument();
        expect(screen.queryByText('Моя график')).not.toBeInTheDocument();
    });

    it('shows Main Menu and Secondary Menu for User with both Climber and Instructor roles', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            user: { roles: ['climber', 'instructor'] },
            logout: vi.fn(),
            hasRole: (role) => ['climber', 'instructor'].includes(role),
        });
        // Even if active role is instructor, if they have climber role, main menu might be visible?
        // Wait, requirement: "Main horizontal menu accessible for all - not logged in and all users with role climber"
        // "Users with role instructor don't see it"
        // "Users with role climber instructor - see the menu"
        // My code: (!isAuthenticated || (user?.roles?.includes('climber')))
        // So if they have climber role, they see it.

        mockGetActiveRole.mockReturnValue('instructor'); // Simulate they are currently acting as instructor

        renderHeader();

        // Main Menu items should be visible because they HAVE the climber role
        expect(screen.getByText('Начало')).toBeInTheDocument();

        // Secondary Menu items should be visible because they HAVE the climber role
        // Code: activeRole === 'climber' || (user.roles && user.roles.includes('climber'))
        expect(screen.getByText('Табло')).toBeInTheDocument();
        expect(screen.getByText('Моя график')).toBeInTheDocument();
    });
});
