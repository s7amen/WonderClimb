import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UniversalLayout from './UniversalLayout';
import * as AuthContext from '../../context/AuthContext';
import * as userUtils from '../../utils/userUtils';

// Mock dependencies
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../utils/userUtils', () => ({
    getActiveRole: vi.fn(),
    getUserDisplayName: () => 'Test User',
}));

// Mock child layouts to verify which one renders
vi.mock('./SidebarLayout', () => ({
    default: () => <div data-testid="sidebar-layout">Sidebar Layout</div>,
}));

vi.mock('./ClimberLayout', () => ({
    default: () => <div data-testid="climber-layout">Climber Layout</div>,
}));

// Mock navigation config
vi.mock('../../config/navigation', () => ({
    NAVIGATION_CONFIG: {
        admin: [{ id: 'gym', items: [] }], // Has sidebar
        climber: [], // No sidebar
    },
}));

describe('UniversalLayout', () => {
    const mockUseAuth = AuthContext.useAuth;
    const mockGetActiveRole = userUtils.getActiveRole;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderLayout = () => {
        render(
            <MemoryRouter>
                <UniversalLayout />
            </MemoryRouter>
        );
    };

    it('renders SidebarLayout for Admin (role with sidebar config)', () => {
        mockUseAuth.mockReturnValue({ user: { roles: ['admin'] } });
        mockGetActiveRole.mockReturnValue('admin');

        renderLayout();

        expect(screen.getByTestId('sidebar-layout')).toBeInTheDocument();
        expect(screen.queryByTestId('climber-layout')).not.toBeInTheDocument();
    });

    it('renders ClimberLayout for Climber (role without sidebar config)', () => {
        mockUseAuth.mockReturnValue({ user: { roles: ['climber'] } });
        mockGetActiveRole.mockReturnValue('climber');

        renderLayout();

        expect(screen.getByTestId('climber-layout')).toBeInTheDocument();
        expect(screen.queryByTestId('sidebar-layout')).not.toBeInTheDocument();
    });

    it('renders ClimberLayout when no user (fallback)', () => {
        mockUseAuth.mockReturnValue({ user: null });
        mockGetActiveRole.mockReturnValue(null);

        renderLayout();

        expect(screen.getByTestId('climber-layout')).toBeInTheDocument();
    });
});
