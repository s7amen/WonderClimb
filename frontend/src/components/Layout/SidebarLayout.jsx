import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar/Sidebar';
import Header from './Header';

const SidebarLayout = () => {
    return (
        <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto h-[calc(100vh-70px)]">
                    <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SidebarLayout;
