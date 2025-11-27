import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
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

    // Check if iOS device
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsSupported(isIOS || 'BeforeInstallPromptEvent' in window);

    // Listen for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      // For iOS, show instructions
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        alert(
          'За да инсталирате приложението:\n\n' +
          '1. Натиснете бутона "Share" (Сподели) в долния ред\n' +
          '2. Изберете "Add to Home Screen" (Добави в началния екран)\n' +
          '3. Натиснете "Add" (Добави)'
        );
        return;
      }
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice();

      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem('pwa-installed', 'true');
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
      setDeferredPrompt(null);
    }
  };

  return {
    install,
    isInstalled,
    isSupported,
    canInstall: !!deferredPrompt || /iphone|ipad|ipod/i.test(navigator.userAgent),
  };
};

