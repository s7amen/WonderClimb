import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/UI/Card';
import { getUserDisplayName } from '../../utils/userUtils';

const HomePage = () => {
  const { user, hasRole } = useAuth();

  const getQuickLinks = () => {
    const links = [];

    if (hasRole('admin')) {
      links.push(
        { name: 'Табло', href: '/admin/dashboard', description: 'Преглед на системата' },
        { name: 'График', href: '/admin/sessions', description: 'Управление на сесии' },
        { name: 'Календар', href: '/calendar', description: 'Календарен изглед' },
        { name: 'Катерачи', href: '/admin/climbers', description: 'Управление на катерачи' },
        { name: 'Състезания', href: '/admin/competitions', description: 'Управление на състезания' }
      );
    } else if (hasRole('coach')) {
      links.push(
        { name: 'Табло', href: '/coach/dashboard', description: 'Преглед на тренировките' },
        { name: 'График', href: '/admin/sessions', description: 'Преглед на сесии' },
        { name: 'Моят график', href: '/my-sessions', description: 'Моите резервации' },
        { name: 'Катерачи', href: '/admin/climbers', description: 'Списък с катерачи' }
      );
    } else if (hasRole('climber')) {
      links.push(
        { name: 'Табло', href: '/climber/dashboard', description: 'Моят дашборд' },
        { name: 'Моят график', href: '/my-sessions', description: 'Моите резервации' },
        { name: 'График', href: '/sessions', description: 'Достъпни сесии' },
        { name: 'Профил', href: '/profile', description: 'Моят профил' }
      );
    }

    return links;
  };

  const quickLinks = getQuickLinks();
  const displayName = getUserDisplayName(user) || user?.email || 'Потребител';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-medium text-neutral-950 mb-4">
          Добре дошли, {displayName}!
        </h1>
        <p className="text-lg text-[#4a5565]">
          Добре дошли в WonderClimb
        </p>
      </div>

      {/* Quick Links */}
      {quickLinks.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Бързи линкове</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block"
              >
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {link.name}
                  </h3>
                  <p className="text-gray-600">
                    {link.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-2xl font-medium text-neutral-950 mb-4">За WonderClimb</h2>
          <p className="text-[#4a5565]">
            Професионална система за управление на катерачни зали и тренировки. 
            Следете сесии, управлявайте катерачи и треньори, и организирайте вашата зала.
          </p>
        </Card>

        <Card>
          <h2 className="text-2xl font-medium text-neutral-950 mb-4">Полезни линкове</h2>
          <div className="space-y-2">
            <Link to="/competitions" className="block text-[#ea7a24] hover:underline">
              Състезания
            </Link>
            <Link to="/profile" className="block text-[#ea7a24] hover:underline">
              Моят профил
            </Link>
            {hasRole('admin') || hasRole('coach') ? (
              <Link to="/admin/climbers" className="block text-[#ea7a24] hover:underline">
                Катерачи
              </Link>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;

