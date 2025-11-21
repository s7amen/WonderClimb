import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const AdminLayout = () => {
  const navigation = [
    { name: 'Табло', href: '/admin/dashboard' },
    { name: 'Сесии', href: '/sessions' },
    { name: 'Календар', href: '/calendar' },
    { name: 'Катерачи', href: '/climbers' },
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

export default AdminLayout;

