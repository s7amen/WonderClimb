import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Logo from '../UI/Logo';
import PWAInstallButton from '../UI/PWAInstallButton';

const Footer = () => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <footer
      className="relative border-t border-[#364153] mt-auto overflow-hidden"
      style={{
        backgroundImage: 'url(/images/clibming-wall-for-footer.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // Add padding bottom on mobile to account for sticky bottom menu (h-16 = 64px + safe area)
        paddingBottom: isMobile ? `calc(4rem + env(safe-area-inset-bottom, 0px))` : undefined,
      }}
    >
      {/* Dark overlay for readability while keeping background visible */}
      <div className="absolute inset-0 bg-black/70"></div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8 items-center">
          {/* Logo - Centered on mobile, left aligned on desktop */}
          <div className="flex items-center justify-center md:justify-start gap-4">
            <Logo showText={true} showSubtitle={true} size="md" logoHeight="auto" />
          </div>

          {/* Links - Stacked on mobile, centered row on desktop */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-[#99a1af]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0 hidden md:block"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
            <nav className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <Link
                to="/faq"
                className="text-[#99a1af] text-sm md:text-base hover:text-white transition-colors font-normal whitespace-nowrap"
              >
                Често задавани въпроси
              </Link>
              <Link
                to="/competitions"
                className="text-[#99a1af] text-sm md:text-base hover:text-white transition-colors font-normal"
              >
                Състезания
              </Link>
              <a
                href="https://chudniteskali.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#99a1af] text-sm md:text-base hover:text-white transition-colors font-normal"
              >
                Клубен сайт
              </a>
            </nav>
          </div>

          {/* Contacts - Centered on mobile, right aligned on desktop */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex items-center gap-2 text-[#99a1af]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
              <a
                href="tel:0878120046"
                className="text-[#99a1af] text-sm md:text-base hover:text-white transition-colors font-normal"
              >
                0878120046
              </a>
            </div>
          </div>
        </div>

        {/* Copyright and Install Button */}
        <div className="border-t border-[#4a5565] pt-4 pb-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="text-[#99a1af] text-sm md:text-base text-center font-normal">
              © СК „Чудните скали" Варна®
            </p>

            {/* PWA Install Button */}
            <PWAInstallButton
              variant="button"
              className="w-full md:w-auto min-w-[200px]"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

