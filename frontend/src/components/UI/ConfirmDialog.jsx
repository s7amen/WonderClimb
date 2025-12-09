import BaseModal from './BaseModal';
import Button from './Button';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Потвърждение',
  message = 'Сигурни ли сте, че искате да продължите?',
  confirmText = 'Потвърди',
  cancelText = 'Отказ',
  variant = 'danger',
  warningMessage = null,
  errorMessage = null,
  hasBookedSessions = false,
  bookedSessionsCount = 0,
  children = null,
  disabled = false,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      {/* Message */}
      {message && (
        <p className="text-sm sm:text-[16px] text-[#4a5565] leading-tight sm:leading-[24px] mb-4">
          {message}
        </p>
      )}

      {/* Custom content */}
      {children && (
        <div className="mb-4">
          {children}
        </div>
      )}

      {/* Warning message about booked sessions */}
      {hasBookedSessions && bookedSessionsCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-[10px] p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm sm:text-[16px] font-medium text-orange-900 leading-tight sm:leading-[24px] mb-1">
                Внимание: Резервации ще бъдат изтрити
              </p>
              <p className="text-sm sm:text-[16px] text-orange-800 leading-tight sm:leading-[24px]">
                {bookedSessionsCount === 1
                  ? 'Този профил има 1 бъдеща резервация, която ще бъде изтрита при изтриване на профила.'
                  : `Този профил има ${bookedSessionsCount} бъдещи резервации, които ще бъдат изтрити при изтриване на профила.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message if provided */}
      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-300 rounded-[10px] p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-[16px] font-medium text-red-900 leading-tight sm:leading-[24px] whitespace-pre-line break-words">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional warning message if provided */}
      {warningMessage && !hasBookedSessions && !errorMessage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-[10px] p-4 mb-6">
          <p className="text-sm sm:text-[16px] text-yellow-800 leading-tight sm:leading-[24px]">
            {warningMessage}
          </p>
        </div>
      )}
    </BaseModal>
  );
};

export default ConfirmDialog;

