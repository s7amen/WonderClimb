import { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import ErrorModal from './ErrorModal';

const PWAInstallButton = ({ 
  variant = 'button', // 'button' or 'sticky'
  className = '',
  hideWhenBulkBooking = false, // Hide when bulk booking button is visible
}) => {
  const [errorModalData, setErrorModalData] = useState(null);

  const handleErrorModalOpen = (message, debugInfo) => {
    setErrorModalData({ message, debugInfo });
  };

  const { 
    install, 
    openInstalledApp,
    isInstalled, 
    error, 
    showErrorModal, 
    setShowErrorModal,
    debugInfo, 
    deferredPrompt 
  } = usePWAInstall(handleErrorModalOpen);

  const handleClick = () => {
    if (isInstalled) {
      openInstalledApp();
    } else {
      install();
    }
  };

  // Sticky icon variant for mobile
  if (variant === 'sticky') {
    // Check if we're in standalone mode (PWA)
    const isStandalone = debugInfo.isStandalone || debugInfo.isIOSStandalone;
    
    // Hide if in standalone mode (PWA) - no button needed
    if (isStandalone) {
      return (
        <>
          <ErrorModal
            isOpen={showErrorModal || !!errorModalData}
            onClose={() => {
              setShowErrorModal(false);
              setErrorModalData(null);
            }}
            message={errorModalData?.message || error}
            debugInfo={errorModalData?.debugInfo || debugInfo}
          />
        </>
      );
    }

    // Hide if bulk booking button is visible
    if (hideWhenBulkBooking) {
      return (
        <>
          <ErrorModal
            isOpen={showErrorModal || !!errorModalData}
            onClose={() => {
              setShowErrorModal(false);
              setErrorModalData(null);
            }}
            message={errorModalData?.message || error}
            debugInfo={errorModalData?.debugInfo || debugInfo}
          />
        </>
      );
    }

    // At this point we're not in standalone mode
    // Show button if:
    // - PWA is not installed (show Install)
    // - PWA is installed but we're in browser (show Отвори)

    return (
      <>
        <button
          onClick={handleClick}
          className={`fixed bottom-3 right-4 z-[9998] md:hidden w-14 h-14 ${
            isInstalled 
              ? 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800' 
              : 'bg-[#adb933] hover:bg-[#9aa82e] active:bg-[#889728]'
          } text-white rounded-full shadow-xl flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 ${className}`}
          aria-label={isInstalled ? "Отвори приложението" : "Инсталирай приложението"}
          style={{ 
            touchAction: 'manipulation',
          }}
        >
          {isInstalled ? (
            <>
              <svg
                className="w-5 h-5 mb-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              <span className="text-[8px] leading-tight font-medium">Отвори</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5 mb-0.5"
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
              <span className="text-[8px] leading-tight font-medium">Install</span>
            </>
          )}
        </button>
        
        <ErrorModal
          isOpen={showErrorModal || !!errorModalData}
          onClose={() => {
            setShowErrorModal(false);
            setErrorModalData(null);
          }}
          message={errorModalData?.message || error}
          debugInfo={errorModalData?.debugInfo || debugInfo}
        />
      </>
    );
  }

  // Regular button variant (for footer)
  // Check if we're in standalone mode (PWA)
  const isStandalone = debugInfo.isStandalone || debugInfo.isIOSStandalone;
  
  // Hide if in standalone mode (PWA) - no button needed in PWA
  // Show only on mobile (md:hidden) and when not in standalone mode
  if (isStandalone) {
    return (
      <>
        <ErrorModal
          isOpen={showErrorModal || !!errorModalData}
          onClose={() => {
            setShowErrorModal(false);
            setErrorModalData(null);
          }}
          message={errorModalData?.message || error}
          debugInfo={errorModalData?.debugInfo || debugInfo}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`md:hidden flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${
          isInstalled 
            ? 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800' 
            : 'bg-[#EA7A24] hover:bg-[#d8691a] active:bg-[#c5580f]'
        } ${className}`}
        aria-label={isInstalled ? "Отвори приложението" : "Инсталирай приложението"}
        style={{ 
          touchAction: 'manipulation',
        }}
      >
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isInstalled ? "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" : "M12 4v16m8-8H4"}
          />
        </svg>
        <span className="whitespace-nowrap">
          {isInstalled ? 'Отвори приложението' : 'Инсталирай приложението'}
        </span>
      </button>
      
      <ErrorModal
        isOpen={showErrorModal || !!errorModalData}
        onClose={() => {
          setShowErrorModal(false);
          setErrorModalData(null);
        }}
        message={errorModalData?.message || error}
        debugInfo={errorModalData?.debugInfo || debugInfo}
      />
    </>
  );
};

export default PWAInstallButton;

