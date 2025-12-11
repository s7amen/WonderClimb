import { useState, useEffect, useMemo } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import ErrorModal from './ErrorModal';
import PWADebugPanel from './PWADebugPanel';

const PWAInstallButton = ({
  variant = 'button', // 'button' or 'sticky'
  className = '',
  hideWhenBulkBooking = false, // Hide when bulk booking button is visible
}) => {
  const [errorModalData, setErrorModalData] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const handleErrorModalOpen = (message, debugInfo) => {
    setErrorModalData({ message, debugInfo });
    // Show debug panel when error modal opens
    setShowDebugPanel(true);
  };

  const {
    install,
    openInstalledApp,
    isInstalled,
    error,
    showErrorModal,
    setShowErrorModal,
    debugInfo,
    deferredPrompt,
    isRunningInPWA
  } = usePWAInstall(handleErrorModalOpen);

  // Determine if we should show debug panel - check if we have valid debug info
  const debugInfoToShow = useMemo(() => {
    return errorModalData?.debugInfo || debugInfo || {};
  }, [errorModalData?.debugInfo, debugInfo]);
  
  const shouldShowDebug = useMemo(() => {
    return showDebugPanel && debugInfoToShow && Object.keys(debugInfoToShow).length > 0;
  }, [showDebugPanel, debugInfoToShow]);

  // Show debug panel when there's an error or error modal data
  useEffect(() => {
    if (error || errorModalData) {
      setShowDebugPanel(true);
    } else {
      setShowDebugPanel(false);
    }
  }, [error, errorModalData]);

  const handleClick = () => {
    if (isInstalled) {
      openInstalledApp();
    } else {
      install();
    }
  };

  // Check if the error message indicates that the prompt was already used
  const shouldShowReloadButton = (message) => {
    return message?.includes('Prompt за инсталация вече е бил използван');
  };

  // Sticky icon variant for mobile
  if (variant === 'sticky') {
    // Hide if in standalone mode (PWA) - no button needed
    if (isRunningInPWA) {
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
            showReloadButton={shouldShowReloadButton(errorModalData?.message || error)}
          />
          {showDebugPanel && (errorModalData?.debugInfo || debugInfo) && (
            <PWADebugPanel
              debugInfo={errorModalData?.debugInfo || debugInfo}
              onClose={() => setShowDebugPanel(false)}
            />
          )}
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
            showReloadButton={shouldShowReloadButton(errorModalData?.message || error)}
          />
          {showDebugPanel && (errorModalData?.debugInfo || debugInfo) && (
            <PWADebugPanel
              debugInfo={errorModalData?.debugInfo || debugInfo}
              onClose={() => setShowDebugPanel(false)}
            />
          )}
        </>
      );
    }

    // At this point we're not in standalone mode
    // Show button with appropriate label:
    // - If installed: show "Open" button
    // - If not installed: show "Install" button
    return (
      <>
        <button
          onClick={handleClick}
          className={`fixed bottom-20 right-4 z-[9998] lg:bottom-3 lg:hidden w-14 h-14 ${isInstalled
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
          showReloadButton={shouldShowReloadButton(errorModalData?.message || error)}
        />
      </>
    );
  }

  // Regular button variant (for footer)
  // Hide only if in standalone mode (PWA) - no button needed in PWA
  // Show button if not in PWA mode (even if installed, show "Open" button)
  if (isRunningInPWA) {
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
          showReloadButton={shouldShowReloadButton(errorModalData?.message || error)}
        />
        {shouldShowDebug && (
          <PWADebugPanel
            debugInfo={debugInfoToShow}
            onClose={() => setShowDebugPanel(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`lg:hidden flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md transition-colors ${isInstalled
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
        showReloadButton={shouldShowReloadButton(errorModalData?.message || error)}
      />
      {shouldShowDebug && (
        <PWADebugPanel
          debugInfo={debugInfoToShow}
          onClose={() => setShowDebugPanel(false)}
        />
      )}
    </>
  );
};

export default PWAInstallButton;

