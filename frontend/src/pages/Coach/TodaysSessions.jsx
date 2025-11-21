import { useState, useEffect } from 'react';
import { coachSessionsAPI } from '../../services/api';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { Link } from 'react-router-dom';

const TodaysSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await coachSessionsAPI.getTodaysSessions();
      setSessions(response.data.sessions || []);
    } catch (error) {
      showToast('Грешка при зареждане на сесии', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Зареждане на днешните сесии..." />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-medium text-neutral-950 leading-8 mb-1">Днешни сесии</h1>
        <p className="text-base leading-6" style={{ color: '#4a5565' }}>Преглед на всички сесии за днес</p>
      </div>

      <ToastComponent />

      {sessions.length === 0 ? (
        <Card>
          <div className="px-6 py-8 text-center">
            <p className="text-sm" style={{ color: '#4a5565' }}>Няма планирани сесии за днес</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const sessionDate = new Date(session.date);
            const bookedCount = session.bookings?.length || 0;
            
            return (
              <Card key={session._id}>
                <div className="px-6 py-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-neutral-950 mb-2">{session.title}</h3>
                      <div className="space-y-1 text-sm" style={{ color: '#4a5565' }}>
                        <p>📅 {format(sessionDate, 'PPpp')}</p>
                        <p>⏱️ Продължителност: {session.durationMinutes} минути</p>
                        <p>👥 Резервирани: {bookedCount} / {session.capacity}</p>
                      </div>
                      {session.description && (
                        <p className="mt-2 text-sm" style={{ color: '#4a5565' }}>{session.description}</p>
                      )}
                    </div>
                    <div className="ml-4">
                      <Link to={`/coach/attendance/${session._id}`}>
                        <Button variant="primary" className="text-white rounded-lg" style={{ backgroundColor: '#ea7a24' }}>
                          Отбележи присъствие
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodaysSessions;

