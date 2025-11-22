import { Link } from 'react-router-dom';
import Logo from '../UI/Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#35383d] border-t border-[#364153] mt-auto">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo */}
          <div className="flex flex-col gap-4">
            <Logo showText={true} showSubtitle={true} size="md" />
          </div>

          {/* Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-base font-rubik font-medium">Връзки</h3>
            <nav className="flex flex-col gap-2">
              <Link
                to="/sessions"
                className="text-[#99a1af] text-base hover:text-white transition-colors font-rubik font-normal"
              >
                График
              </Link>
              <Link
                to="/competitions"
                className="text-[#99a1af] text-base hover:text-white transition-colors font-rubik font-normal"
              >
                Състезания
              </Link>
              <Link
                to="/"
                className="text-[#99a1af] text-base hover:text-white transition-colors font-rubik font-normal"
              >
                За нас
              </Link>
            </nav>
          </div>

          {/* Contacts */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-base font-rubik font-medium">Контакти</h3>
            <div className="flex flex-col gap-2">
              <a
                href="tel:+359888123456"
                className="text-[#99a1af] text-base hover:text-white transition-colors font-rubik font-normal"
              >
                +359 888 123 456
              </a>
              <a
                href="mailto:info@climbtracker.bg"
                className="text-[#99a1af] text-base hover:text-white transition-colors font-rubik font-normal"
              >
                info@climbtracker.bg
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[#4a5565] pt-6">
          <p className="text-[#99a1af] text-base text-center font-rubik font-normal">
            © {currentYear} ClimbTracker
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

