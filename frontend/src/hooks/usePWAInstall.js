import { useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';

// Debug logging helper that works in production - moved outside hook to avoid hoisting issues
const debugLog = (location, message, data, hypothesisId) => {
  try {
    const logEntry = {location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId};
    console.log('[PWA DEBUG]', JSON.stringify(logEntry));
    // Only try to send to debug server if available (won't work in production)
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/50136003-5873-48e4-8fca-1c635ebbeda2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logEntry)}).catch(()=>{});
    }
  } catch (e) {
    // Silently ignore debug log errors
  }
};

export const usePWAInstall = (onErrorModalOpen = null) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  // Track if beforeinstallprompt event was ever received in this session
  const promptEverReceived = useRef(false);
  // Use ref to track deferredPrompt for cleanup functions without causing effect re-runs
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    // #region agent log
    debugLog('usePWAInstall.js:16','useEffect hook started',{deferredPrompt:!!deferredPrompt,userAgent:navigator.userAgent.substring(0,50)},'B');
    // #endregion
    // Early device detection - skip all PWA checks on desktop devices
    const isMobileOrTablet = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      // Check for mobile devices
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      // Check for Windows/Mac/Linux desktop (exclude Windows Phone/Mobile)
      const isDesktop = /windows nt|macintosh|mac os x|linux/i.test(userAgent) &&
        !/windows phone|windows mobile/i.test(userAgent);

      // Only run PWA checks on mobile/tablet, not desktop
      return isMobile && !isDesktop;
    };

    // Skip all PWA logic if on desktop
    const isMobile = isMobileOrTablet();
    // #region agent log
    debugLog('usePWAInstall.js:41','Device detection check',{isMobile,userAgent:navigator.userAgent,isDesktop:!isMobile},'B');
    // #endregion
    
    // IMPORTANT: Even if detected as desktop, we should still listen for beforeinstallprompt
    // because user might be testing with mobile emulation or the detection might be wrong
    // We'll only skip some UI checks, but keep the event listener active
    const shouldSkipDetailedChecks = !isMobile;
    if (shouldSkipDetailedChecks) {
      console.log('[PWA Install] Detected desktop device, but will still listen for beforeinstallprompt event');
      setIsSupported(false);
    }

    // Comprehensive PWA diagnostics (skip on desktop to save resources)
    const checkPWARequirements = async () => {
      if (shouldSkipDetailedChecks) {
        // Skip detailed checks on desktop, but still set basic debug info
        setDebugInfo({
          isStandalone: false,
          userAgent: navigator.userAgent,
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          isDesktop: true,
        });
        return;
      }
      const diagnostics = {
        // Basic checks
        // Basic checks
        isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches ||
          window.matchMedia('(display-mode: minimal-ui)').matches,
        isIOSStandalone: 'standalone' in window.navigator && window.navigator.standalone === true,
        // Check for Android TWA/PWA launch via referrer
        isAndroidPWA: document.referrer.includes('android-app://'),
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

      // Check if installed
      // If we're in standalone mode, PWA is definitely installed and open
      if (diagnostics.isStandalone || diagnostics.isIOSStandalone || diagnostics.isAndroidPWA) {
        console.log('[PWA Install] ✅ PWA is INSTALLED and running in standalone mode', {
          isStandalone: diagnostics.isStandalone,
          isIOSStandalone: diagnostics.isIOSStandalone,
          isAndroidPWA: diagnostics.isAndroidPWA,
          referrer: document.referrer,
          displayMode: {
            standalone: window.matchMedia('(display-mode: standalone)').matches,
            fullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
            minimalUi: window.matchMedia('(display-mode: minimal-ui)').matches,
            browser: window.matchMedia('(display-mode: browser)').matches,
          }
        });
        setIsInstalled(true);
        // Make sure localStorage is set
        if (!diagnostics.localStorageInstalled) {
          localStorage.setItem('pwa-installed', 'true');
        }
      } else {
        // Not in standalone mode - check localStorage to see if PWA was previously installed
        console.log('[PWA Install] ⚠️ NOT in standalone mode', {
          isStandalone: diagnostics.isStandalone,
          isIOSStandalone: diagnostics.isIOSStandalone,
          isAndroidPWA: diagnostics.isAndroidPWA,
          referrer: document.referrer,
          displayMode: {
            standalone: window.matchMedia('(display-mode: standalone)').matches,
            fullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
            minimalUi: window.matchMedia('(display-mode: minimal-ui)').matches,
            browser: window.matchMedia('(display-mode: browser)').matches,
          }
        });

        // If localStorage says installed, PWA is installed but user is viewing in browser
        if (diagnostics.localStorageInstalled) {
          setIsInstalled(true);
          console.log('[PWA Install] PWA is installed (from localStorage), but user is in browser mode');
        } else {
          setIsInstalled(false);
        }
        // Don't clear localStorage here - we only clear it when we detect actual uninstallation
      }

      // Check manifest (VitePWA generates manifest.json)
      try {
        // Try manifest.json first, then fallback to manifest.webmanifest
        let manifestResponse = await fetch('/manifest.json');
        if (!manifestResponse.ok) {
          manifestResponse = await fetch('/manifest.webmanifest');
        }
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
            // Check for PNG icons (192x192 and 512x512) or SVG icons
            const icon192 = manifest.icons.find(icon => icon.sizes === '192x192' || icon.sizes === 'any');
            const icon512 = manifest.icons.find(icon => icon.sizes === '512x512' || icon.sizes === 'any');
            const svgIcon = manifest.icons.find(icon => icon.type === 'image/svg+xml' || icon.src?.endsWith('.svg'));

            // If we have an SVG icon, it can serve both sizes
            if (svgIcon) {
              try {
                const iconResponse = await fetch(svgIcon.src);
                diagnostics.iconsExist.icon192 = iconResponse.ok;
                diagnostics.iconsExist.icon512 = iconResponse.ok;
                if (!iconResponse.ok) {
                  diagnostics.iconErrors.push(`SVG icon not found: ${svgIcon.src}`);
                }
              } catch (e) {
                diagnostics.iconErrors.push(`Error checking SVG icon: ${e.message}`);
              }
            } else {
              // Check for PNG icons
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
          }
          // Note: Service worker successfully registered is not an error
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
      // #region agent log
      debugLog('usePWAInstall.js:270','beforeinstallprompt event received',{eventType:e.type,hasPreventDefault:typeof e.preventDefault==='function',currentDeferredPrompt:!!deferredPromptRef.current,eventTime:Date.now()},'A');
      // #endregion
      console.log('[PWA Install] beforeinstallprompt event received', e);
      promptEverReceived.current = true;

      // If beforeinstallprompt fires and we have localStorage saying installed, 
      // it means the app was uninstalled (because beforeinstallprompt only fires when NOT installed)
      const hasLocalStorageInstalled = localStorage.getItem('pwa-installed') === 'true';
      if (hasLocalStorageInstalled) {
        console.log('[PWA Install] beforeinstallprompt fired but localStorage says installed - app was uninstalled');
        setIsInstalled(false);
        localStorage.removeItem('pwa-installed');
      }

      // #region agent log
      debugLog('usePWAInstall.js:283','Calling preventDefault and setting deferredPrompt',{beforePreventDefault:true,eventDefaultPrevented:e.defaultPrevented},'A');
      // #endregion
      e.preventDefault();
      // #region agent log
      debugLog('usePWAInstall.js:285','Setting deferredPrompt state',{eventObject:!!e,hasPrompt:typeof e.prompt==='function'},'A');
      // #endregion
      deferredPromptRef.current = e;
      setDeferredPrompt(e);
      setError(null);
      // #region agent log
      debugLog('usePWAInstall.js:290','deferredPrompt set successfully',{deferredPromptRef:!!deferredPromptRef.current},'A');
      // #endregion
    };

    // Check if event was already captured early (before React mounted)
    if (window.__earlyBeforeInstallPrompt) {
      // #region agent log
      debugLog('usePWAInstall.js:295','Found early captured beforeinstallprompt',{hasEarlyPrompt:!!window.__earlyBeforeInstallPrompt},'B');
      // #endregion
      const earlyEvent = window.__earlyBeforeInstallPrompt;
      handleBeforeInstallPrompt(earlyEvent);
      // Clear it so we don't use it again
      window.__earlyBeforeInstallPrompt = null;
    }

    // #region agent log
    debugLog('usePWAInstall.js:303','Adding beforeinstallprompt event listener',{hasWindow:typeof window!=='undefined',currentDeferredPrompt:!!deferredPromptRef.current,listenerTime:Date.now()},'B');
    // #endregion
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Also listen for early event from main.jsx
    const handleEarlyEvent = (e) => {
      // #region agent log
      debugLog('usePWAInstall.js:309','Received early beforeinstallprompt event',{hasDetail:!!e.detail},'B');
      // #endregion
      if (e.detail) {
        handleBeforeInstallPrompt(e.detail);
      }
    };
    window.addEventListener('early-beforeinstallprompt', handleEarlyEvent);
    
    // #region agent log
    debugLog('usePWAInstall.js:316','Event listeners added, checking if event already fired',{hasBeforeInstallPrompt:'BeforeInstallPromptEvent' in window,hasEarlyPrompt:!!window.__earlyBeforeInstallPrompt},'B');
    // #endregion

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA Install] App installed event received');
      setIsInstalled(true);
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
      setError(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Also listen for when app is uninstalled
    // We can't directly detect uninstallation, but we can check if:
    // 1. We were in standalone mode before but now we're not
    // 2. The beforeinstallprompt event fires again (means app was uninstalled)
    // For now, we rely on the beforeinstallprompt event to detect re-installation capability
    // If beforeinstallprompt fires and localStorage says installed, it means app was uninstalled
    const checkIfUninstalled = () => {
      // Only check if we have localStorage set but no deferred prompt
      // This might indicate uninstallation, but we can't be 100% sure
      // So we'll be conservative and only clear if we're sure
      const hasLocalStorageInstalled = localStorage.getItem('pwa-installed') === 'true';

      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches;

      const isIOSStandalone = 'standalone' in window.navigator && window.navigator.standalone === true;
      const isAndroidPWA = document.referrer.includes('android-app://');

      // If we're not in standalone and we have a deferred prompt, it means app was uninstalled
      // because beforeinstallprompt only fires when app is NOT installed
      if (!isStandalone && !isIOSStandalone && !isAndroidPWA && hasLocalStorageInstalled && deferredPromptRef.current) {
        console.log('[PWA Install] Detected app was uninstalled (beforeinstallprompt fired again), resetting status');
        setIsInstalled(false);
        localStorage.removeItem('pwa-installed');
      }
    };

    // Check periodically if app was uninstalled (less frequently now)
    const uninstallCheckInterval = setInterval(checkIfUninstalled, 5000);

    // Update debug info periodically
    const interval = setInterval(() => {
      checkPWARequirements();
    }, 5000);

    return () => {
      // #region agent log
      debugLog('usePWAInstall.js:337','Cleaning up event listeners',{deferredPrompt:!!deferredPromptRef.current},'B');
      // #endregion
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('early-beforeinstallprompt', handleEarlyEvent);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
      clearInterval(uninstallCheckInterval);
    };
    // Remove deferredPrompt from dependencies - it causes the effect to re-run and potentially miss the event
    // We use deferredPromptRef to track the current value without causing re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openInstalledApp = () => {
    // If app is installed, check if we're already in PWA mode
    if (isInstalled) {
      const isStandalone = debugInfo.isStandalone || debugInfo.isIOSStandalone || debugInfo.isAndroidPWA;

      if (isStandalone) {
        // Already in PWA, just navigate to home
        window.location.href = '/';
      } else {
        // In browser but PWA is installed - show instructions to open from home screen
        const message = 'Приложението е инсталирано!\n\n' +
          'Моля, отворете го от началния екран на вашия телефон.\n\n' +
          'Ако не можете да го намерите, проверете в менюто с приложения.';
        if (onErrorModalOpen) {
          setError(message);
          setShowErrorModal(true);
          onErrorModalOpen(message, {
            protocol: debugInfo.protocol,
            hostname: debugInfo.hostname,
            isInstalled: true,
            isStandalone: false,
            browserInfo: debugInfo.browserInfo,
          });
        } else {
          alert(message);
        }
      }
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
    // #region agent log
    debugLog('usePWAInstall.js:392','Install button clicked',{deferredPrompt:!!deferredPrompt,deferredPromptRef:!!deferredPromptRef.current,isInstalled,promptEverReceived:promptEverReceived.current,stateTime:Date.now()},'C');
    // #endregion
    // If already installed, open the app instead
    if (isInstalled) {
      openInstalledApp();
      return;
    }

    setError(null);
    setShowErrorModal(false);
    console.log('[PWA Install] Install button clicked', {
      deferredPrompt: !!deferredPrompt,
      deferredPromptRef: !!deferredPromptRef.current,
      isInstalled,
      debugInfo,
    });

    // Use ref if state is not available (race condition protection)
    const promptToUse = deferredPrompt || deferredPromptRef.current;
    
    if (!promptToUse) {
      // #region agent log
      debugLog('usePWAInstall.js:407','No deferredPrompt available',{hasBeforeInstallPrompt:'BeforeInstallPromptEvent' in window,promptEverReceived:promptEverReceived.current,deferredPromptState:!!deferredPrompt,deferredPromptRefState:!!deferredPromptRef.current},'C');
      // #endregion
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
      let errorReason = 'PWA инсталацията не е налична в момента.';
      const isSecure = window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (!isSecure) {
        errorReason += '\n\nPWA изисква HTTPS или localhost.';
      } else {
        // Check if beforeinstallprompt was fired but prompt is already consumed
        const hasBeforeInstallPrompt = 'BeforeInstallPromptEvent' in window;

        // Add specific reasons if available from diagnostics
        if (debugInfo.manifestErrors && debugInfo.manifestErrors.length > 0) {
          errorReason += `\n\nПроблем с манифеста: ${debugInfo.manifestErrors[0]}`;
        } else if (debugInfo.serviceWorkerErrors && debugInfo.serviceWorkerErrors.length > 0) {
          errorReason += `\n\nПроблем със Service Worker: ${debugInfo.serviceWorkerErrors[0]}`;
        } else if (hasBeforeInstallPrompt) {
          // Browser supports beforeinstallprompt but we don't have it
          if (promptEverReceived.current) {
            // Event was fired but prompt was already used this session
            errorReason += '\n\n⚠️ Prompt за инсталация вече беше показан в тази сесия.\n\n' +
              '📱 Моля, презаредете страницата и опитайте отново.\n\n' +
              'Алтернативно:\n' +
              '• Използвайте менюто на браузъра (⋮) → "Add to Home Screen"\n' +
              '• Или затворете и отворете приложението отново';
          } else {
            // Event never fired - Chrome is rate-limiting or PWA was recently dismissed
            errorReason += '\n\n⏳ Chrome временно блокира инсталацията.\n\n' +
              'Това се случва когато:\n' +
              '• Инсталацията е била отказана наскоро\n' +
              '• Приложението вече е инсталирано\n\n' +
              '📱 Опитайте:\n' +
              '1. Използвайте менюто на браузъра (⋮) → "Add to Home Screen"\n' +
              '2. Или изчакайте няколко минути и опитайте отново';
          }
        } else {
          errorReason += '\n\nВъзможни причини:\n• Браузърът не е готов (опитайте презареждане)\n• Приложението е било инсталирано наскоро\n• Браузърът не поддържа PWA инсталация';
        }
      }

      setError(errorReason);
      console.error('[PWA Install] No deferred prompt available', {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent,
        hasBeforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
        promptEverReceivedThisSession: promptEverReceived.current,
        debugInfo
      });

      if (onErrorModalOpen) {
        setShowErrorModal(true);
        onErrorModalOpen(errorReason, {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          hasBeforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
          deferredPrompt: false,
          promptEverReceived: promptEverReceived.current,
          userAgent: navigator.userAgent,
          browserInfo: debugInfo.browserInfo,
          manifestErrors: debugInfo.manifestErrors,
          serviceWorkerErrors: debugInfo.serviceWorkerErrors
        });
      } else {
        alert(errorReason);
      }
      return;
    }

    try {
      const promptToUse = deferredPrompt || deferredPromptRef.current;
      // #region agent log
      debugLog('usePWAInstall.js:498','Calling deferredPrompt.prompt()',{hasDeferredPrompt:!!deferredPrompt,hasDeferredPromptRef:!!deferredPromptRef.current,usingPrompt:!!promptToUse,hasUserChoice:promptToUse && typeof promptToUse.userChoice === 'function'},'D');
      // #endregion
      console.log('[PWA Install] Calling deferredPrompt.prompt()');
      if (!promptToUse) {
        throw new Error('Deferred prompt is null');
      }
      
      // Check if userChoice is available before calling prompt
      if (typeof promptToUse.userChoice !== 'function') {
        console.warn('[PWA Install] userChoice is not a function, calling prompt() anyway');
        promptToUse.prompt();
        // If userChoice is not available, assume accepted (user clicked install)
        setIsInstalled(true);
        localStorage.setItem('pwa-installed', 'true');
        setError(null);
        setShowErrorModal(false);
        deferredPromptRef.current = null;
        setDeferredPrompt(null);
        return;
      }
      
      promptToUse.prompt();
      
      // Try to get user choice, but handle case where userChoice is not available
      let outcome = 'accepted'; // Default to accepted
      try {
        if (typeof promptToUse.userChoice === 'function') {
          const choiceResult = await promptToUse.userChoice();
          outcome = choiceResult.outcome || 'accepted';
          // #region agent log
          debugLog('usePWAInstall.js:612','User choice received',{outcome},'D');
          // #endregion
          console.log('[PWA Install] User choice:', outcome);
        } else {
          console.warn('[PWA Install] userChoice is not a function after prompt(), assuming accepted');
          // #region agent log
          debugLog('usePWAInstall.js:618','userChoice not available after prompt, assuming accepted',{assumedAccepted:true},'D');
          // #endregion
        }
      } catch (userChoiceError) {
        console.warn('[PWA Install] Error getting user choice, assuming accepted:', userChoiceError);
        // If userChoice fails, assume user accepted (they clicked install)
        outcome = 'accepted';
        // #region agent log
        debugLog('usePWAInstall.js:624','userChoice error, assuming accepted',{error:userChoiceError.message},'D');
        // #endregion
      }

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

      deferredPromptRef.current = null;
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
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
    }
  };

  // Check if currently running in PWA mode (standalone)
  const isRunningInPWA = debugInfo.isStandalone || debugInfo.isIOSStandalone || debugInfo.isAndroidPWA || false;

  // Report usage/installation to backend
  useEffect(() => {
    const reportStatus = async () => {
      // If running in PWA or we know it's installed
      if (isRunningInPWA || isInstalled) {
        try {
          // This will only succeed if user is authenticated (handled by interceptor)
          // We don't check auth state here explicitly to avoid coupling with AuthContext
          // If unauthorized, it just fails silently which is fine
          await authAPI.updatePWAStatus(true);
          console.log('[PWA Status] Reported installed status to backend');
        } catch (error) {
          // Ignore errors (user might not be logged in)
          // console.debug('[PWA Status] Failed to report status (likely unauthenticated)', error);
        }
      }
    };

    // Report on mount if condition met, and whenever state changes
    reportStatus();
  }, [isInstalled, isRunningInPWA]);

  // Enhanced check using native API
  useEffect(() => {
    const checkNativeAPI = async () => {
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await navigator.getInstalledRelatedApps();
          console.log('[PWA Install] Related apps:', relatedApps);
          if (relatedApps.length > 0) {
            setIsInstalled(true);
            localStorage.setItem('pwa-installed', 'true');
          }
        } catch (e) {
          console.error('[PWA Install] Error checking native API:', e);
        }
      }
    };
    checkNativeAPI();
  }, []);

  return {
    install,
    openInstalledApp,
    isInstalled,
    isSupported,
    canInstall: !!deferredPrompt || /iphone|ipad|ipod/i.test(navigator.userAgent),
    error,
    showErrorModal,
    setShowErrorModal,
    debugInfo: {
      ...debugInfo,
      deferredPrompt: !!deferredPrompt,
      deferredPromptRef: !!deferredPromptRef.current,
      promptEverReceived: promptEverReceived.current,
      hasEarlyPrompt: !!window.__earlyBeforeInstallPrompt,
    },
    deferredPrompt: !!deferredPrompt,
    isRunningInPWA, // Explicitly indicate if app is running in PWA mode
  };
};

