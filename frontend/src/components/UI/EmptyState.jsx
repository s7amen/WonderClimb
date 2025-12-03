import PropTypes from 'prop-types';
import Button from './Button';

/**
 * EmptyState - Consistent empty state display across the application
 * 
 * Features:
 * - Icon/illustration support
 * - Primary message
 * - Secondary description
 * - Call-to-action button (optional)
 * - Consistent styling
 */
const EmptyState = ({
    icon,
    title,
    description,
    action,
    className = '',
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            {/* Icon */}
            {icon && (
                <div className="mb-4 text-gray-400">
                    {icon}
                </div>
            )}

            {/* Title */}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="text-sm text-gray-500 max-w-md mb-6">
                    {description}
                </p>
            )}

            {/* Action button */}
            {action && (
                <Button
                    variant={action.variant || 'primary'}
                    onClick={action.onClick}
                    className={action.className}
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
};

EmptyState.propTypes = {
    icon: PropTypes.node,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    action: PropTypes.shape({
        label: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired,
        variant: PropTypes.string,
        className: PropTypes.string,
    }),
    className: PropTypes.string,
};

export default EmptyState;
