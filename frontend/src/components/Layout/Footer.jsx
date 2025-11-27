import { Link } from 'react-router-dom';
import Logo from '../UI/Logo';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { install, isInstalled, error, debugInfo, deferredPrompt } = usePWAInstall();
  
  const handleResetInstallStatus = () => {
    localStorage.removeItem('pwa-installed');
    window.location.reload();
  };

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
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[#99a1af] text-base text-center font-normal">
              © СК „Чудните скали" Варна®
            </p>
            
            {/* PWA Install Button - Always visible for debugging */}
            {!isInstalled ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={install}
                  className="flex items-center gap-2 px-4 py-2 bg-[#EA7A24] hover:bg-[#d8691a] text-white text-sm font-medium rounded-md transition-colors"
                  aria-label="Инсталирай приложението"
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
                  <span>Инсталирай приложението</span>
                </button>
                
                {/* Debug Info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-[#99a1af] text-center max-w-md space-y-1">
                    <div className="font-semibold mb-2">PWA Diagnostics:</div>
                    <div>Deferred: {deferredPrompt ? '✅ Yes' : '❌ No'}</div>
                    <div>Protocol: {debugInfo.protocol || 'N/A'}</div>
                    <div>Hostname: {debugInfo.hostname || 'N/A'}</div>
                    <div>Service Worker: {debugInfo.hasServiceWorker ? '✅' : '❌'}</div>
                    <div>SW Registered: {debugInfo.serviceWorkerRegistered ? '✅' : '❌'}</div>
                    <div>Manifest: {debugInfo.manifestExists ? '✅' : '❌'}</div>
                    <div>Manifest Valid: {debugInfo.manifestValid ? '✅' : '❌'}</div>
                    <div>Icon 192: {debugInfo.iconsExist?.icon192 ? '✅' : '❌'}</div>
                    <div>Icon 512: {debugInfo.iconsExist?.icon512 ? '✅' : '❌'}</div>
                    
                    {/* Show all issues */}
                    {((debugInfo.manifestErrors && debugInfo.manifestErrors.length > 0) ||
                      (debugInfo.iconErrors && debugInfo.iconErrors.length > 0) ||
                      (debugInfo.serviceWorkerErrors && debugInfo.serviceWorkerErrors.length > 0)) && (
                      <div className="mt-2 p-2 bg-yellow-900/50 border border-yellow-500 rounded text-left">
                        <div className="font-semibold mb-1">Issues:</div>
                        {debugInfo.manifestErrors?.map((err, i) => (
                          <div key={`manifest-${i}`} className="text-yellow-200">• {err}</div>
                        ))}
                        {debugInfo.iconErrors?.map((err, i) => (
                          <div key={`icon-${i}`} className="text-yellow-200">• {err}</div>
                        ))}
                        {debugInfo.serviceWorkerErrors?.map((err, i) => (
                          <div key={`sw-${i}`} className="text-yellow-200">• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Show reset button if installed but user wants to reinstall
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs text-[#99a1af] text-center">
                  Приложението е инсталирано
                </div>
                <button
                  onClick={handleResetInstallStatus}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-md transition-colors"
                  aria-label="Reset install status"
                  title="Ако сте изтрили приложението, натиснете за да покажете бутона отново"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Reset статус</span>
                </button>
              </div>
            )}
            
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

