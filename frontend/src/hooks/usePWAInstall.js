import { useState, useEffect } from 'react';

export const usePWAInstall = (onErrorModalOpen = null) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Comprehensive PWA diagnostics
    const checkPWARequirements = async () => {
      const diagnostics = {
        // Basic checks
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isIOSStandalone: 'standalone' in window.navigator && window.navigator.standalone === true,
        localStorageInstalled: localStorage.getItem('pwa-installed') === 'true',
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        origin: window.location.origin,
        
        // Browser support
        hasServiceWorker: 'serviceWorker' in navigator,
        hasBeforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
        hasDeferredPrompt: !!deferredPrompt,
        
        // Manifest checks
        manifestExists: false,
        manifestValid: false,
        manifestErrors: [],
        
        // Icon checks
        iconsExist: {
          icon192: false,
          icon512: false,
        },
        iconErrors: [],
        
        // Service worker checks
        serviceWorkerRegistered: false,
        serviceWorkerErrors: [],
      };

      // Check if installed - only trust actual standalone mode, not localStorage
      // If localStorage says installed but we're not in standalone mode, reset it
      if (diagnostics.isStandalone || diagnostics.isIOSStandalone) {
        setIsInstalled(true);
        // Make sure localStorage is set
        if (!diagnostics.localStorageInstalled) {
          localStorage.setItem('pwa-installed', 'true');
        }
      } else {
        // Not in standalone mode - reset installed status
        setIsInstalled(false);
        // Clear localStorage if it says installed but we're not actually installed
        if (diagnostics.localStorageInstalled) {
          console.log('[PWA Install] App was uninstalled, clearing localStorage');
          localStorage.removeItem('pwa-installed');
        }
      }

      // Check manifest
      try {
        const manifestResponse = await fetch('/manifest.json');
        diagnostics.manifestExists = manifestResponse.ok;
        
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json();
          diagnostics.manifestValid = true;
          
          // Validate required fields
          const requiredFields = ['name', 'short_name', 'icons', 'start_url', 'display'];
          const missingFields = requiredFields.filter(field => !manifest[field]);
          
          if (missingFields.length > 0) {
            diagnostics.manifestValid = false;
            diagnostics.manifestErrors.push(`Missing required fields: ${missingFields.join(', ')}`);
          }
          
          // Check icons in manifest
          if (manifest.icons && Array.isArray(manifest.icons)) {
            const icon192 = manifest.icons.find(icon => icon.sizes === '192x192');
            const icon512 = manifest.icons.find(icon => icon.sizes === '512x512');
            
            if (icon192) {
              try {
                const iconResponse = await fetch(icon192.src);
                diagnostics.iconsExist.icon192 = iconResponse.ok;
                if (!iconResponse.ok) {
                  diagnostics.iconErrors.push(`Icon 192x192 not found: ${icon192.src}`);
                }
              } catch (e) {
                diagnostics.iconErrors.push(`Error checking icon 192x192: ${e.message}`);
              }
            } else {
              diagnostics.iconErrors.push('Icon 192x192 missing in manifest');
            }
            
            if (icon512) {
              try {
                const iconResponse = await fetch(icon512.src);
                diagnostics.iconsExist.icon512 = iconResponse.ok;
                if (!iconResponse.ok) {
                  diagnostics.iconErrors.push(`Icon 512x512 not found: ${icon512.src}`);
                }
              } catch (e) {
                diagnostics.iconErrors.push(`Error checking icon 512x512: ${e.message}`);
              }
            } else {
              diagnostics.iconErrors.push('Icon 512x512 missing in manifest');
            }
          } else {
            diagnostics.manifestErrors.push('Icons array missing or invalid in manifest');
          }
        } else {
          diagnostics.manifestErrors.push(`Manifest not found (${manifestResponse.status})`);
        }
      } catch (e) {
        diagnostics.manifestErrors.push(`Error fetching manifest: ${e.message}`);
      }

      // Check service worker
      if (diagnostics.hasServiceWorker) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          diagnostics.serviceWorkerRegistered = registrations.length > 0;
          
          if (registrations.length === 0) {
            diagnostics.serviceWorkerErrors.push('No service worker registered');
          } else {
            diagnostics.serviceWorkerErrors.push(`Service worker registered: ${registrations[0].scope}`);
          }
        } catch (e) {
          diagnostics.serviceWorkerErrors.push(`Error checking service worker: ${e.message}`);
        }
      } else {
        diagnostics.serviceWorkerErrors.push('Service Worker API not supported');
      }

      // HTTPS/localhost check
      const isSecure = diagnostics.protocol === 'https:' || 
                       diagnostics.hostname === 'localhost' || 
                       diagnostics.hostname === '127.0.0.1';
      
      if (!isSecure) {
        diagnostics.manifestErrors.push(`PWA requires HTTPS or localhost. Current: ${diagnostics.protocol}//${diagnostics.hostname}`);
      }

      // Browser support check
      const isIOS = /iphone|ipad|ipod/i.test(diagnostics.userAgent);
      const isAndroid = /android/i.test(diagnostics.userAgent);
      const isChrome = /chrome/i.test(diagnostics.userAgent) && !/edge/i.test(diagnostics.userAgent);
      const isSafari = /safari/i.test(diagnostics.userAgent) && !/chrome/i.test(diagnostics.userAgent);
      const isEdge = /edge/i.test(diagnostics.userAgent);
      const isFirefox = /firefox/i.test(diagnostics.userAgent);
      
      diagnostics.browserInfo = {
        isIOS,
        isAndroid,
        isChrome,
        isSafari,
        isEdge,
        isFirefox,
        supportsPWA: isIOS || isAndroid || isChrome || isEdge,
      };

      setDebugInfo(diagnostics);
      
      // Log all issues
      const allIssues = [
        ...diagnostics.manifestErrors,
        ...diagnostics.iconErrors,
        ...diagnostics.serviceWorkerErrors,
      ];
      
      if (allIssues.length > 0) {
        console.warn('[PWA Install] Issues found:', allIssues);
      } else {
        console.log('[PWA Install] All checks passed');
      }
      
      console.log('[PWA Install] Full diagnostics:', diagnostics);
    };

    checkPWARequirements();

    // Check if iOS device
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const hasBeforeInstallPrompt = 'BeforeInstallPromptEvent' in window;
    setIsSupported(isIOS || hasBeforeInstallPrompt);

    // Listen for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA Install] beforeinstallprompt event received', e);
      e.preventDefault();
      setDeferredPrompt(e);
      setError(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA Install] App installed event received');
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
      setError(null);
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Also listen for when app is uninstalled (when we detect we're no longer in standalone)
    // This happens when user uninstalls the app
    const checkIfUninstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = 'standalone' in window.navigator && window.navigator.standalone === true;
      
      if (!isStandalone && !isIOSStandalone && localStorage.getItem('pwa-installed') === 'true') {
        console.log('[PWA Install] Detected app was uninstalled, resetting status');
        setIsInstalled(false);
        localStorage.removeItem('pwa-installed');
      }
    };
    
    // Check periodically if app was uninstalled
    const uninstallCheckInterval = setInterval(checkIfUninstalled, 1000);

    // Update debug info periodically
    const interval = setInterval(() => {
      checkPWARequirements();
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
      clearInterval(uninstallCheckInterval);
    };
  }, [deferredPrompt]);

  const openInstalledApp = () => {
    // If app is installed, try to open it
    if (isInstalled) {
      // Try to navigate to the app's start URL
      // In standalone mode, this will open the installed app
      window.location.href = '/';
    } else {
      // If not installed, show message
      const message = 'Приложението не е инсталирано. Моля, инсталирайте го първо.';
      if (onErrorModalOpen) {
        setError(message);
        setShowErrorModal(true);
        onErrorModalOpen(message, {
          protocol: debugInfo.protocol,
          hostname: debugInfo.hostname,
          hasBeforeInstallPrompt: debugInfo.hasBeforeInstallPrompt,
          deferredPrompt: !!deferredPrompt,
          userAgent: debugInfo.userAgent,
          browserInfo: debugInfo.browserInfo,
        });
      } else {
        alert(message);
      }
    }
  };

  const install = async () => {
    // If already installed, open the app instead
    if (isInstalled) {
      openInstalledApp();
      return;
    }

    setError(null);
    setShowErrorModal(false);
    console.log('[PWA Install] Install button clicked', {
      deferredPrompt: !!deferredPrompt,
      isInstalled,
      debugInfo,
    });

    if (!deferredPrompt) {
      // For iOS, show instructions
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        const message = 'За да инсталирате приложението:\n\n' +
          '1. Натиснете бутона "Share" (Сподели) в долния ред\n' +
          '2. Изберете "Add to Home Screen" (Добави в началния екран)\n' +
          '3. Натиснете "Add" (Добави)';
        if (onErrorModalOpen) {
          setError(message);
          setShowErrorModal(true);
          onErrorModalOpen(message, {
            protocol: debugInfo.protocol,
            hostname: debugInfo.hostname,
            browserInfo: debugInfo.browserInfo,
          });
        } else {
          alert(message);
        }
        return;
      }
      
      // No deferred prompt and not iOS - show error in modal
      const errorMsg = 'PWA инсталацията не е налична.\n\nPWA изисква HTTPS или localhost.';
      
      setError(errorMsg);
      console.error('[PWA Install] No deferred prompt available', {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent,
        hasBeforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
      });
      
      if (onErrorModalOpen) {
        setShowErrorModal(true);
        onErrorModalOpen(errorMsg, {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          hasBeforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
          deferredPrompt: false,
          userAgent: navigator.userAgent,
          browserInfo: debugInfo.browserInfo,
        });
      } else {
        alert(errorMsg);
      }
      return;
    }

    try {
      console.log('[PWA Install] Calling deferredPrompt.prompt()');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice();
      console.log('[PWA Install] User choice:', outcome);

      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem('pwa-installed', 'true');
        setError(null);
        setShowErrorModal(false);
      } else {
        const errorMsg = `Потребителят отказа инсталацията.`;
        setError(errorMsg);
        if (onErrorModalOpen) {
          setShowErrorModal(true);
          onErrorModalOpen(errorMsg, debugInfo);
        }
      }

      setDeferredPrompt(null);
    } catch (error) {
      const errorMsg = `Грешка при инсталиране на PWA: ${error.message || error}`;
      console.error('[PWA Install] Error showing install prompt:', error);
      setError(errorMsg);
      
      if (onErrorModalOpen) {
        setShowErrorModal(true);
        onErrorModalOpen(errorMsg, {
          ...debugInfo,
          error: error.message || error,
        });
      } else {
        alert(errorMsg);
      }
      setDeferredPrompt(null);
    }
  };

  return {
    install,
    openInstalledApp,
    isInstalled,
    isSupported,
    canInstall: !!deferredPrompt || /iphone|ipad|ipod/i.test(navigator.userAgent),
    error,
    showErrorModal,
    setShowErrorModal,
    debugInfo,
    deferredPrompt: !!deferredPrompt,
  };
};

