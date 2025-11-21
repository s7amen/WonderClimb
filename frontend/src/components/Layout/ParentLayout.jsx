import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const ParentLayout = () => {
  const navigation = [
    { name: 'График', href: '/parent/schedule' },
    { name: 'Моят график', href: '/parent/saved-sessions' },
    { name: 'Абонаменти', href: '/parent/subscriptions' },
    { name: 'Профил', href: '/parent/profile' },
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

export default ParentLayout;

