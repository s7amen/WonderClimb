import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

// Mock matchMedia
beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

describe('App Component', () => {
    it('renders without crashing', async () => {
        render(<App />);
        // App starts with a loading state or the home page
        // We can check for a common element like the loading spinner or header
        // Since it uses Suspense, we might see "Зареждане..." initially

        // Wait for something to appear
        await waitFor(() => {
            // Check if either loading or home page content is present
            const loadingElements = screen.queryAllByText(/Зареждане/i);
            const homeElement = screen.queryByText(/WonderClimb/i);
            expect(loadingElements.length > 0 || homeElement).toBeTruthy();
        });
    });
});
