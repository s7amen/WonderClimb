import { Outlet, useLocation } from 'react-router-dom';
import MessageSettings from './Messages.jsx';
import Cards from './Cards.jsx';
import TrainingSettings from './Training.jsx';
import NotificationSettings from './Notification.jsx';
import Logs from './Logs.jsx';

const Settings = () => {
  const location = useLocation();

  // Determine which component to show based on path
  const getContent = () => {
    if (location.pathname.startsWith('/settings/messages')) {
      return { component: <MessageSettings />, title: 'Настройки на съобщения' };
    }
    if (location.pathname.startsWith('/settings/notifications')) {
      return { component: <NotificationSettings />, title: 'Activation email' };
    }
    if (location.pathname.startsWith('/settings/cards')) {
      return { component: <Cards />, title: 'Карти' };
    }
    if (location.pathname.startsWith('/settings/training')) {
      return { component: <TrainingSettings />, title: 'Тренировки' };
    }
    if (location.pathname.startsWith('/settings/logs')) {
      return { component: <Logs />, title: 'Логове' };
    }
    // Default fallback
    return { component: <MessageSettings />, title: 'Настройки на съобщения' };
  };

  const { component, title } = getContent();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-neutral-950">{title}</h1>
      </div>

      {/* Content */}
      <div>
        {component}
        <Outlet />
      </div>
    </div>
  );
};

export default Settings;
