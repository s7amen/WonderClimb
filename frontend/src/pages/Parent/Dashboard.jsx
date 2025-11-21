import { useEffect, useState } from 'react';
import { bookingsAPI, parentClimbersAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';

const ParentDashboard = () => {
  const [stats, setStats] = useState({
    totalChildren: 0,
    activeBookings: 0,
    upcomingBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bookingsRes, childrenRes] = await Promise.all([
          bookingsAPI.getMyBookings(),
          parentClimbersAPI.getAll(),
        ]);

        const bookings = bookingsRes.data.bookings || [];
        const children = childrenRes.data.climbers || [];
        const now = new Date();

        const activeBookings = bookings.filter(b => b.status === 'booked').length;
        const upcomingBookings = bookings.filter(
          b => b.status === 'booked' && new Date(b.session.date) > now
        ).length;

        setStats({
          totalChildren: children.filter(c => c.status === 'active').length,
          activeBookings,
          upcomingBookings,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <Loading text="Зареждане на табло..." />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-base font-medium text-neutral-950">Табло за родители</h1>
        <p className="text-sm text-[#4a5565]">Управление на профили и резервации</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-[#4a5565] mb-2">Моите деца</p>
            <p className="text-base font-medium text-neutral-950">{stats.totalChildren}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-[#4a5565] mb-2">Активни резервации</p>
            <p className="text-base font-medium text-neutral-950">{stats.activeBookings}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-[#4a5565] mb-2">Предстоящи сесии</p>
            <p className="text-base font-medium text-neutral-950">{stats.upcomingBookings}</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-medium text-neutral-950 mb-4">Бързи действия</h2>
        <div className="space-y-2">
          <p className="text-sm text-[#4a5565]">• Управлявайте профилите на децата си</p>
          <p className="text-sm text-[#4a5565]">• Резервирайте тренировъчни сесии</p>
          <p className="text-sm text-[#4a5565]">• Преглеждайте и отменяйте резервации</p>
        </div>
      </Card>
    </div>
  );
};

export default ParentDashboard;

