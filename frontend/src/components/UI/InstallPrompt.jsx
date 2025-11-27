import { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      const isSmallScreen = window.innerWidth < 768; // md breakpoint
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running as standalone (installed)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check if running in standalone mode on iOS
      if ('standalone' in window.navigator && window.navigator.standalone === true) {
        setIsInstalled(true);
        return;
      }

      // Check localStorage for installation status
      const installed = localStorage.getItem('pwa-installed');
      if (installed === 'true') {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // Listen for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS, show instructions
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        alert(
          'За да инсталирате приложението:\n\n' +
          '1. Натиснете бутона "Share" (Сподели) в долния ред\n' +
          '2. Изберете "Add to Home Screen" (Добави в началния екран)\n' +
          '3. Натиснете "Add" (Добави)'
        );
        setShowPrompt(false);
        return;
      }
      return;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice();

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
        localStorage.setItem('pwa-installed', 'true');
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if:
  // - Not mobile
  // - Already installed
  // - No deferred prompt and not iOS
  // - Dismissed in this session
  if (!isMobile || isInstalled || (!deferredPrompt && !/iphone|ipad|ipod/i.test(navigator.userAgent))) {
    return null;
  }

  if (sessionStorage.getItem('pwa-prompt-dismissed') === 'true' && !deferredPrompt) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
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

