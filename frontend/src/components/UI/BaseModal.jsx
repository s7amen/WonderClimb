import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * BaseModal - Standardized modal wrapper for all modal dialogs
 * 
 * Features:
 * - Backdrop with click-to-close
 * - ESC key to close
 * - Header with title and close button
 * - Body content area
 * - Footer with action buttons
 * - Consistent animations
 * - Accessibility (focus trap, ARIA labels)
 */
const BaseModal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnBackdrop = true,
    closeOnEsc = true,
    className = '',
}) => {
    const modalRef = useRef(null);
    const previousActiveElement = useRef(null);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEsc, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement;
            document.body.style.overflow = 'hidden';

            // Focus the modal for accessibility
            if (modalRef.current) {
                modalRef.current.focus();
            }
        } else {
            document.body.style.overflow = '';

            // Restore focus to previous element
            if (previousActiveElement.current) {
                previousActiveElement.current.focus();
            }
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Focus trap
    useEffect(() => {
        if (!isOpen) return;

        const handleTabKey = (e) => {
            if (e.key !== 'Tab') return;

            const focusableElements = modalRef.current?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (!focusableElements || focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };

        document.addEventListener('keydown', handleTabKey);
        return () => document.removeEventListener('keydown', handleTabKey);
    }, [isOpen]);

    const handleOverlayClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    // Size classes
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            <div
                ref={modalRef}
                className={`relative bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden animate-slideUp ${className}`}
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-[#4a5565] hover:text-neutral-950 transition-colors"
                    aria-label="Затвори"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                {title && (
                    <div className="px-6 py-5 border-b border-gray-100">
                        <h2
                            id="modal-title"
                            className="text-lg sm:text-[20px] font-medium text-neutral-950 leading-tight sm:leading-[30px] pr-8"
                        >
                            {title}
                        </h2>
                    </div>
                )}

                {/* Body */}
                <div className={`p-6 overflow-y-auto ${title ? 'max-h-[calc(90vh-200px)]' : 'max-h-[calc(90vh-120px)]'}`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-5 border-t border-gray-100">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

BaseModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.node, // Accept both string and React nodes
    children: PropTypes.node,
    footer: PropTypes.node,
    size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl']),
    closeOnBackdrop: PropTypes.bool,
    closeOnEsc: PropTypes.bool,
    className: PropTypes.string,
};

export default BaseModal;
