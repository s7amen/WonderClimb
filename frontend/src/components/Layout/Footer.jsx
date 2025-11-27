import { Link } from 'react-router-dom';
import Logo from '../UI/Logo';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { install, isInstalled, canInstall } = usePWAInstall();

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
            
            {/* PWA Install Button */}
            {canInstall && !isInstalled && (
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
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

