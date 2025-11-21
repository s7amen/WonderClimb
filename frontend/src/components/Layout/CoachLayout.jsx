import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const CoachLayout = () => {
  const navigation = [
    { name: 'Табло', href: '/coach/dashboard' },
    { name: 'Сесии', href: '/sessions' },
    { name: 'Календар', href: '/calendar' },
    { name: 'Днешни сесии', href: '/coach/todays-sessions' },
    { name: 'Присъствие', href: '/coach/attendance' },
  ];

  return (
    <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
      <Header navigation={navigation} />
      
      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
      <Footer />
    </div>
  );
};

export default CoachLayout;

