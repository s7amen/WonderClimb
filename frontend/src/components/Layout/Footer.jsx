import { Link } from 'react-router-dom';
import Logo from '../UI/Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#35383d] border-t border-[#364153] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo */}
          <div className="flex flex-col gap-4">
            <Logo showText={true} showSubtitle={true} size="md" />
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-base font-medium">Бързи връзки</h3>
            <nav className="flex flex-col gap-2">
              <Link
                to="/admin/dashboard"
                className="text-[#d1d5dc] text-sm hover:text-white transition-colors"
              >
                Табло
              </Link>
              <Link
                to="/sessions"
                className="text-[#d1d5dc] text-sm hover:text-white transition-colors"
              >
                Сесии
              </Link>
              <Link
                to="/calendar"
                className="text-[#d1d5dc] text-sm hover:text-white transition-colors"
              >
                Календар
              </Link>
              <Link
                to="/climbers"
                className="text-[#d1d5dc] text-sm hover:text-white transition-colors"
              >
                Катерачи
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-base font-medium">Контакт</h3>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:stamen.todorov@gmail.com"
                className="text-[#d1d5dc] text-sm hover:text-white transition-colors"
              >
                stamen.todorov@gmail.com
              </a>
              <a
                href="tel:0878120046"
                className="text-[#d1d5dc] text-sm hover:text-white transition-colors"
              >
                0878120046
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[#364153] pt-6">
          <p className="text-[#d1d5dc] text-xs text-center">
            © {currentYear} WonderClimb. Всички права запазени.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

