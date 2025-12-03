import PropTypes from 'prop-types';

/**
 * FormField - Unified form field with label, input, and error display
 * 
 * Features:
 * - Label with optional required indicator
 * - Input wrapper (supports any input component)
 * - Error message display
 * - Help text support
 * - Consistent spacing and styling
 */
const FormField = ({
    label,
    name,
    error,
    required = false,
    helpText,
    children,
    className = '',
}) => {
    return (
        <div className={`mb-4 ${className}`}>
            {/* Label */}
            {label && (
                <label
                    htmlFor={name}
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    {label}
                    {required && (
                        <span className="text-red-500 ml-1" aria-label="задължително">
                            *
                        </span>
                    )}
                </label>
            )}

            {/* Input wrapper */}
            <div className="relative">
                {children}
            </div>

            {/* Help text */}
            {helpText && !error && (
                <p className="mt-2 text-sm text-gray-500">
                    {helpText}
                </p>
            )}

            {/* Error message */}
            {error && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

FormField.propTypes = {
    label: PropTypes.string,
    name: PropTypes.string.isRequired,
    error: PropTypes.string,
    required: PropTypes.bool,
    helpText: PropTypes.string,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default FormField;
