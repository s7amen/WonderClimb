import { useEffect } from 'react';
import Button from './Button';

const ErrorModal = ({ 
  isOpen, 
  onClose, 
  title = 'Грешка',
  message = '',
  debugInfo = null,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    // Close only if clicking the overlay itself, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn"
      onClick={handleOverlayClick}
    >
      {/* Dialog */}
      <div 
        className="relative bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] shadow-xl max-w-md w-full p-6 animate-slideUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#4a5565] hover:text-neutral-950 transition-colors"
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

        {/* Title */}
        <div className="flex items-center gap-3 mb-4 pr-8">
          <svg
            className="w-6 h-6 text-red-600 flex-shrink-0"
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
          <h3 className="text-lg sm:text-[20px] font-medium text-neutral-950 leading-tight sm:leading-[30px]">
            {title}
          </h3>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4">
            <p className="text-sm sm:text-[16px] text-[#4a5565] leading-tight sm:leading-[24px] whitespace-pre-wrap">
              {message}
            </p>
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-[10px]">
            <div className="text-xs font-semibold text-gray-700 mb-2">Debug информация:</div>
            <div className="space-y-1 text-xs text-gray-600 font-mono">
              {debugInfo.protocol && (
                <div>Protocol: {debugInfo.protocol}</div>
              )}
              {debugInfo.hostname && (
                <div>Hostname: {debugInfo.hostname}</div>
              )}
              {debugInfo.hasBeforeInstallPrompt !== undefined && (
                <div>Has beforeinstallprompt: {debugInfo.hasBeforeInstallPrompt ? 'true' : 'false'}</div>
              )}
              {debugInfo.deferredPrompt !== undefined && (
                <div>Deferred prompt: {debugInfo.deferredPrompt ? 'true' : 'false'}</div>
              )}
              {debugInfo.userAgent && (
                <div className="break-all">User Agent: {debugInfo.userAgent}</div>
              )}
              {debugInfo.browserInfo && (
                <div>
                  Browser: {debugInfo.browserInfo.isIOS ? 'iOS' : debugInfo.browserInfo.isAndroid ? 'Android' : 'Other'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
          <Button 
            variant="primary" 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Затвори
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;

