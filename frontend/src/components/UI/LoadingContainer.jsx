import PropTypes from 'prop-types';
import Loading from './Loading';
import EmptyState from './EmptyState';
import Button from './Button';

/**
 * LoadingContainer - Wrapper that handles loading, error, and empty states
 * 
 * Features:
 * - Loading spinner display
 * - Error state with retry button
 * - Empty state integration
 * - Success content rendering
 * - Consistent transitions
 */
const LoadingContainer = ({
    loading,
    error,
    empty,
    emptyState,
    onRetry,
    loadingText = 'Зареждане...',
    children,
    className = '',
}) => {
    // Loading state
    if (loading) {
        return (
            <div className={`flex items-center justify-center py-12 ${className}`}>
                <Loading text={loadingText} />
            </div>
        );
    }

    // Error state
    if (error) {
        const errorMessage = typeof error === 'string' ? error : error.message || 'Възникна грешка';

        return (
            <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
                <div className="text-center max-w-md">
                    {/* Error icon */}
                    <div className="mb-4 flex justify-center">
                        <svg
                            className="w-16 h-16 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>

                    {/* Error message */}
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Грешка при зареждане
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                        {errorMessage}
                    </p>

                    {/* Retry button */}
                    {onRetry && (
                        <Button variant="primary" onClick={onRetry}>
                            Опитай отново
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Empty state
    if (empty) {
        if (emptyState) {
            return <div className={className}>{emptyState}</div>;
        }

        return (
            <div className={className}>
                <EmptyState
                    icon={
                        <svg
                            className="w-16 h-16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                    }
                    title="Няма данни"
                    description="Няма налична информация за показване."
                />
            </div>
        );
    }

    // Success - render children
    return <div className={className}>{children}</div>;
};

LoadingContainer.propTypes = {
    loading: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    empty: PropTypes.bool,
    emptyState: PropTypes.node,
    onRetry: PropTypes.func,
    loadingText: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string,
};

export default LoadingContainer;
