import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ClimberMobileBottomNav from './ClimberMobileBottomNav';

const ClimberLayout = () => {
  return (
    <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
      <Header />

      {/* Main content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-20 lg:pb-8">
        <Outlet />
      </main>

      <Footer />

      {/* Mobile Bottom Navigation - Only for climbers */}
      <ClimberMobileBottomNav />
    </div>
  );
};

export default ClimberLayout;

