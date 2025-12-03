import BaseModal from './BaseModal';
import Button from './Button';

const ErrorModal = ({
  isOpen,
  onClose,
  title = 'Грешка',
  message = '',
  debugInfo = null,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
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
          <span>{title}</span>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Затвори
          </Button>
        </div>
      }
    >
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
    </BaseModal>
  );
};

export default ErrorModal;

