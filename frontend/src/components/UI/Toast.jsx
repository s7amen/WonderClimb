import { useState, useEffect } from 'react';

export const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, 300); // Match animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const types = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  return (
    <div 
      className={`
        fixed z-40
        bottom-0 left-0 sm:bottom-4 sm:left-1/2
        border-l-4 rounded-t-lg sm:rounded shadow-lg
        transition-all duration-300 ease-in-out
        ${isExiting 
          ? 'opacity-0 translate-y-full sm:translate-y-[calc(100%+1rem)] sm:translate-x-[-50%]' 
          : 'opacity-100 translate-y-0 sm:translate-y-0 sm:translate-x-[-50%]'}
        ${types[type]}
        px-4 py-3 sm:px-4 sm:py-3 md:px-6 md:py-4
        w-screen sm:w-auto sm:max-w-md md:max-w-lg lg:max-w-xl
      `}
    >
      <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
        <p className={`
          font-medium text-center
          text-sm sm:text-sm md:text-base lg:text-lg
          break-words
          flex-1 min-w-0
        `}>
          {message}
        </p>
        <button
          onClick={handleClose}
          className="
            flex-shrink-0
            text-base sm:text-lg md:text-xl lg:text-2xl
            font-bold hover:opacity-70 transition-opacity
            leading-none
          "
          aria-label="Затвори"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type, duration });
  };

  const ToastComponent = () => {
    if (!toast) return null;
    return (
      <Toast
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onClose={() => setToast(null)}
      />
    );
  };

  return { showToast, ToastComponent };
};

