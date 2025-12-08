import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

// Icons
const Icons = {
    Gym: (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
    ),
    Training: (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Finance: (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Users: (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    Settings: (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    User: (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    Logout: (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    )
};

const PrimarySidebar = ({ categories, activeCategory, onCategoryChange }) => {
    const { logout } = useAuth();

    return (
        <div className="w-[80px] bg-[#35383d] flex flex-col items-center py-6 h-full flex-shrink-0 z-20">
            {/* Logo */}
            <Link to="/" className="mb-8 w-10 h-10 bg-[#ea7a24] rounded-[10px] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </Link>

            {/* Navigation Categories */}
            <nav className="flex-1 w-full flex flex-col items-center gap-4">
                {categories.map((category) => {
                    const Icon = Icons[category.icon] || Icons.Gym;
                    const isActive = activeCategory === category.id;

                    return (
                        <button
                            key={category.id}
                            onClick={() => onCategoryChange(category.id)}
                            className={`
                w-12 h-12 rounded-[10px] flex flex-col items-center justify-center gap-1 transition-all
                ${isActive ? 'bg-[#ea7a24] text-white' : 'text-[#9ca3af] hover:bg-[#3d4146] hover:text-white'}
              `}
                            title={category.label}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-[10px] font-medium">{category.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto flex flex-col items-center gap-4">
                <button
                    onClick={logout}
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[#9ca3af] hover:bg-[#3d4146] hover:text-white transition-colors"
                    title="Изход"
                >
                    <Icons.Logout className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-[#ea7a24] flex items-center justify-center text-white font-bold text-sm">
                    CT
                </div>
            </div>
        </div>
    );
};

export default PrimarySidebar;
