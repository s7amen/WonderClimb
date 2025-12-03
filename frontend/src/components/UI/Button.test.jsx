import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button Component', () => {
    it('renders children correctly', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('handles onClick events', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);

        fireEvent.click(screen.getByText('Click Me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('can be disabled', () => {
        const handleClick = vi.fn();
        render(<Button disabled onClick={handleClick}>Disabled</Button>);

        const button = screen.getByText('Disabled');
        expect(button).toBeDisabled();

        fireEvent.click(button);
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies variant classes', () => {
        const { rerender } = render(<Button variant="primary">Primary</Button>);
        expect(screen.getByText('Primary')).toHaveClass('bg-orange-brand');

        rerender(<Button variant="secondary">Secondary</Button>);
        expect(screen.getByText('Secondary')).toHaveClass('bg-green-brand');

        rerender(<Button variant="danger">Danger</Button>);
        expect(screen.getByText('Danger')).toHaveClass('bg-red-600');
    });
});
