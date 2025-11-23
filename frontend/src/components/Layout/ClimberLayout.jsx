import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const ClimberLayout = () => {
  return (
    <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
      <Header />
      
      {/* Main content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      <Footer />
    </div>
  );
};

export default ClimberLayout;

