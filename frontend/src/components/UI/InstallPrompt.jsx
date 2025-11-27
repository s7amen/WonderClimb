import { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const InstallPrompt = () => {
  const { install, isInstalled, canInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      const isSmallScreen = window.innerWidth < 768; // md breakpoint
      const mobile = isMobileDevice || isSmallScreen;
      setIsMobile(mobile);
      
      // Debug logging
      console.log('[PWA Install] Mobile check:', {
        userAgent: userAgent,
        isMobileDevice,
        isSmallScreen,
        isMobile: mobile,
        windowWidth: window.innerWidth
      });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check if iOS device
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    
    // For iOS or if canInstall, show prompt after a delay
    if ((isIOS || canInstall) && !isInstalled) {
      console.log('[PWA Install] Will show prompt after delay');
      const timer = setTimeout(() => {
        // Check if not dismissed
        const dismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
        
        if (!dismissed) {
          console.log('[PWA Install] Showing prompt');
          setShowPrompt(true);
        }
      }, 2000); // Show after 2 seconds
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkMobile);
      };
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [canInstall, isInstalled]);

  const handleInstallClick = async () => {
    install();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if:
  // - Not mobile
  // - Already installed
  // - Can't install
  // - Dismissed in this session
  // - showPrompt is false
  if (!isMobile || isInstalled || !canInstall) {
    return null;
  }

  const dismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
  if (dismissed || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-neutral-950 mb-1">
              Инсталирай WonderClimb
            </h3>
            <p className="text-xs text-[#4a5565]">
              Добави приложението на началния екран за по-бърз достъп
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-[#EA7A24] hover:bg-[#d8691a] text-white text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Инсталирай
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            По-късно
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;

