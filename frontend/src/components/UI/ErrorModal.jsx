import BaseModal from './BaseModal';
import Button from './Button';

const ErrorModal = ({
  isOpen,
  onClose,
  title = 'Как да инсталирате',
  message = '',
  showReloadButton = false,
}) => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <svg
            className="w-7 h-7 text-[#EA7A24] flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span className="text-lg font-semibold">{title}</span>
        </div>
      }
      footer={
        <div className="flex justify-center w-full">
          <Button
            variant="primary"
            onClick={onClose}
            className="w-full sm:w-auto px-8"
          >
            Разбрах
          </Button>
        </div>
      }
    >
      {/* Message with better styling for instructions */}
      {message && (
        <div className="py-2">
          <p className="text-base sm:text-lg text-[#1f2937] leading-relaxed whitespace-pre-wrap font-medium">
            {message}
          </p>
        </div>
      )}
    </BaseModal>
  );
};

export default ErrorModal;

