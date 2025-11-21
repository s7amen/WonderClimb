import { useEffect, useState } from 'react';
import { coachSessionsAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import { Link } from 'react-router-dom';
import Button from '../../components/UI/Button';

const CoachDashboard = () => {
  const [todaysSessions, setTodaysSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysSessions();
  }, []);

  const fetchTodaysSessions = async () => {
    try {
      const response = await coachSessionsAPI.getTodaysSessions();
      setTodaysSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Зареждане на табло..." />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-medium text-neutral-950 leading-8 mb-1">Табло за треньор</h1>
        <p className="text-base leading-6" style={{ color: '#4a5565' }}>Преглед на днешните сесии и задачи</p>
      </div>

      <Card>
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-medium text-neutral-950 mb-1">Днешни сесии</h2>
              <p className="text-sm" style={{ color: '#4a5565' }}>Преглед на планираните сесии за днес</p>
            </div>
            <Link to="/coach/todays-sessions">
              <Button variant="secondary" className="bg-gray-100 hover:bg-gray-200 text-neutral-950 rounded-lg">Виж всички</Button>
            </Link>
          </div>
        </div>
        <div className="px-6 py-6">
        {todaysSessions.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: '#4a5565' }}>Няма планирани сесии за днес</p>
        ) : (
          <div className="space-y-3">
            {todaysSessions.slice(0, 3).map((session) => (
              <div key={session._id} className="p-4 border border-gray-200 rounded-lg bg-white">
                <h3 className="text-sm font-medium text-neutral-950 mb-2">{session.title}</h3>
                <p className="text-sm mb-3" style={{ color: '#4a5565' }}>
                  {new Date(session.date).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })} - {session.durationMinutes} мин
                </p>
                <Link to={`/coach/attendance/${session._id}`}>
                  <Button variant="primary" className="mt-2 text-white rounded-lg" style={{ backgroundColor: '#ea7a24' }}>
                    Отбележи присъствие
                  </Button>
                </Link>
              </div>
            ))}
            {todaysSessions.length > 3 && (
              <p className="text-sm text-center" style={{ color: '#4a5565' }}>
                +{todaysSessions.length - 3} още сесии
              </p>
            )}
          </div>
        )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-gray-200 px-6 py-6">
          <h2 className="text-base font-medium text-neutral-950 mb-1">Бързи действия</h2>
          <p className="text-sm" style={{ color: '#4a5565' }}>Често използвани действия</p>
        </div>
        <div className="px-6 py-6">
          <div className="space-y-2">
            <p className="text-sm" style={{ color: '#4a5565' }}>• Преглеждайте днешните сесии</p>
            <p className="text-sm" style={{ color: '#4a5565' }}>• Отбелязвайте присъствие на катерачи</p>
            <p className="text-sm" style={{ color: '#4a5565' }}>• Следете списъците на сесиите</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CoachDashboard;

