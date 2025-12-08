import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import MessageSettings from './Messages.jsx';
import Cards from './Cards.jsx';

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'messages', name: 'Настройки на съобщения', path: '/settings/messages' },
    { id: 'cards', name: 'Карти', path: '/settings/cards' },
  ];

  const getActiveTab = () => {
    return tabs.find(tab => location.pathname.startsWith(tab.path))?.id || 'messages';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tabPath) => {
    navigate(tabPath);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-neutral-950">Настройки на съобщения</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-[#ea7a24] text-[#ea7a24]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'messages' && <MessageSettings />}
        {activeTab === 'cards' && <Cards />}
        <Outlet />
      </div>
    </div>
  );
};

export default Settings;
