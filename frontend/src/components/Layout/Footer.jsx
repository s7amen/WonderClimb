import { Link } from 'react-router-dom';
import Logo from '../UI/Logo';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { install, isInstalled, error, debugInfo, deferredPrompt } = usePWAInstall();
  
  // Debug logging
  console.log('[Footer] PWA Install State:', {
    isInstalled,
    deferredPrompt: !!deferredPrompt,
    error,
    debugInfo: {
      protocol: debugInfo.protocol,
      hostname: debugInfo.hostname,
      isStandalone: debugInfo.isStandalone,
      browserInfo: debugInfo.browserInfo,
    }
  });

  return (
    <footer 
      className="relative border-t border-[#364153] mt-auto overflow-hidden"
      style={{
        backgroundImage: 'url(/images/clibming-wall-for-footer.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for readability while keeping background visible */}
      <div className="absolute inset-0 bg-black/70"></div>
      
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo */}
          <div className="flex flex-col gap-4">
            <Logo showText={true} showSubtitle={true} size="md" />
          </div>

          {/* Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-base font-medium">Връзки</h3>
            <nav className="flex flex-col gap-2">
              <Link
                to="/sessions"
                className="text-[#99a1af] text-base hover:text-white transition-colors font-normal"
              >
                График
              </Link>
              <Link
                to="/competitions"
                className="text-[#99a1af] text-base hover:text-white transition-colors font-normal"
              >
                Състезания
              </Link>
            </nav>
          </div>

          {/* Contacts */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-base font-medium">Контакти</h3>
            <div className="flex flex-col gap-2">
              <a
                href="tel:0878120046"
                className="text-[#99a1af] text-base hover:text-white transition-colors font-normal"
              >
                0878120046
              </a>
            </div>
          </div>
        </div>

        {/* Copyright and Install Button */}
        <div className="border-t border-[#4a5565] pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4" style={{ minHeight: '60px' }}>
            <p className="text-[#99a1af] text-base text-center font-normal">
              © СК „Чудните скали" Варна®
            </p>
            
            {/* PWA Install Button - Always visible */}
            <div className="flex flex-col items-center gap-2 w-full md:w-auto">
              {isInstalled && (
                <div className="text-xs text-green-400 mb-1">
                  ✓ Инсталирано
                </div>
              )}
              <button
                onClick={install}
                disabled={isInstalled}
                className={`flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md transition-colors w-full md:w-auto min-w-[200px] ${
                  isInstalled 
                    ? 'bg-gray-600 cursor-not-allowed opacity-60' 
                    : 'bg-[#EA7A24] hover:bg-[#d8691a] active:bg-[#c5580f]'
                }`}
                aria-label={isInstalled ? "Приложението е инсталирано" : "Инсталирай приложението"}
                style={{ 
                  zIndex: 10,
                  position: 'relative',
                  touchAction: 'manipulation' // Better touch handling on mobile
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="whitespace-nowrap">
                  {isInstalled ? 'Инсталирано' : 'Инсталирай приложението'}
                </span>
              </button>
                
                {/* Always show debug info on mobile */}
                <div className="text-xs text-[#99a1af] text-center w-full max-w-md space-y-1">
                  <div className="font-semibold mb-1">Status:</div>
                  <div>Installed: {isInstalled ? '✅ Yes' : '❌ No'}</div>
                  <div>Deferred: {deferredPrompt ? '✅ Yes' : '❌ No'}</div>
                  <div>Protocol: {debugInfo.protocol || 'N/A'}</div>
                  <div>Hostname: {debugInfo.hostname || 'N/A'}</div>
                  {debugInfo.browserInfo && (
                    <div>Browser: {debugInfo.browserInfo.isIOS ? 'iOS' : debugInfo.browserInfo.isAndroid ? 'Android' : 'Other'}</div>
                  )}
                
                  {/* Detailed debug info - development only */}
                  {process.env.NODE_ENV === 'development' && (
                    <>
                      <div className="mt-2 pt-2 border-t border-[#4a5565]">
                        <div className="font-semibold mb-1">Details:</div>
                        <div>Service Worker: {debugInfo.hasServiceWorker ? '✅' : '❌'}</div>
                        <div>SW Registered: {debugInfo.serviceWorkerRegistered ? '✅' : '❌'}</div>
                        <div>Manifest: {debugInfo.manifestExists ? '✅' : '❌'}</div>
                        <div>Manifest Valid: {debugInfo.manifestValid ? '✅' : '❌'}</div>
                        <div>Icon 192: {debugInfo.iconsExist?.icon192 ? '✅' : '❌'}</div>
                        <div>Icon 512: {debugInfo.iconsExist?.icon512 ? '✅' : '❌'}</div>
                      </div>
                      
                      {/* Show all issues */}
                      {((debugInfo.manifestErrors && debugInfo.manifestErrors.length > 0) ||
                        (debugInfo.iconErrors && debugInfo.iconErrors.length > 0) ||
                        (debugInfo.serviceWorkerErrors && debugInfo.serviceWorkerErrors.length > 0)) && (
                        <div className="mt-2 p-2 bg-yellow-900/50 border border-yellow-500 rounded text-left">
                          <div className="font-semibold mb-1">Issues:</div>
                          {debugInfo.manifestErrors?.map((err, i) => (
                            <div key={`manifest-${i}`} className="text-yellow-200 text-[10px]">• {err}</div>
                          ))}
                          {debugInfo.iconErrors?.map((err, i) => (
                            <div key={`icon-${i}`} className="text-yellow-200 text-[10px]">• {err}</div>
                          ))}
                          {debugInfo.serviceWorkerErrors?.map((err, i) => (
                            <div key={`sw-${i}`} className="text-yellow-200 text-[10px]">• {err}</div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            
            {/* Error Display */}
            {error && (
              <div className="mt-2 p-2 bg-red-900/50 border border-red-500 rounded text-xs text-red-200 max-w-md">
                <div className="font-semibold mb-1">Грешка:</div>
                <div className="whitespace-pre-wrap">{error}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

