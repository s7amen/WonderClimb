import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coachSessionsAPI, attendanceAPI } from '../../services/api';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';

const Attendance = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    } else {
      // If no sessionId, show list of today's sessions
      fetchTodaysSessions();
    }
  }, [sessionId]);

  const fetchTodaysSessions = async () => {
    try {
      setLoading(true);
      const response = await coachSessionsAPI.getTodaysSessions();
      setRoster(response.data.sessions || []);
    } catch (error) {
      showToast('Error loading sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const [sessionRes, rosterRes, attendanceRes] = await Promise.all([
        coachSessionsAPI.getTodaysSessions(),
        coachSessionsAPI.getRoster(sessionId),
        attendanceAPI.getForSession(sessionId),
      ]);

      const sessions = sessionRes.data.sessions || [];
      const currentSession = sessions.find(s => s._id === sessionId);
      setSession(currentSession);

      const climbers = rosterRes.data.roster || [];
      setRoster(climbers);

      // Initialize attendance state
      const attendanceMap = {};
      climbers.forEach((climber) => {
        const record = attendanceRes.data.records?.find(
          r => r.climber._id === climber._id || r.climber._id === climber.climber?._id
        );
        attendanceMap[climber._id || climber.climber?._id] = record?.status || null;
      });
      setAttendance(attendanceMap);
    } catch (error) {
      showToast('Error loading session data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (climberId, status) => {
    setAttendance({
      ...attendance,
      [climberId]: status,
    });
  };

  const handleSave = async () => {
    if (!sessionId) {
      showToast('Please select a session first', 'error');
      return;
    }

    try {
      setSaving(true);
      const promises = Object.entries(attendance).map(([climberId, status]) => {
        if (status) {
          return attendanceAPI.record({
            sessionId,
            climberId,
            status,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises.filter(p => p));
      showToast('Attendance saved successfully', 'success');
    } catch (error) {
      showToast('Error saving attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickMark = async (climberId, status) => {
    if (!sessionId) return;

    try {
      await attendanceAPI.record({
        sessionId,
        climberId,
        status,
      });
      setAttendance({
        ...attendance,
        [climberId]: status,
      });
      showToast('Attendance marked', 'success');
    } catch (error) {
      showToast('Error marking attendance', 'error');
    }
  };

  if (loading) {
    return <Loading text="Loading..." />;
  }

  // If no sessionId, show list of today's sessions
  if (!sessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-950">Избери сесия</h1>
        </div>{roster.length === 0 ? (
          <Card>
            <div className="px-6 py-8 text-center">
              <p className="text-sm" style={{ color: '#4a5565' }}>Няма планирани сесии за днес</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {roster.map((s) => (
              <Card key={s._id}>
                <div className="px-6 py-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-neutral-950 mb-1">{s.title}</h3>
                      <p className="text-sm" style={{ color: '#4a5565' }}>
                        {format(new Date(s.date), 'PPpp')}
                      </p>
                    </div>
                    <Button variant="primary" onClick={() => navigate(`/coach/attendance/${s._id}`)} className="w-full sm:w-auto">
                      Отбележи присъствие
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show attendance marking interface
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-neutral-950">Отбележи присъствие</h1>
        </div>
        <Button variant="secondary" onClick={() => navigate('/coach/attendance')} className="w-full sm:w-auto">
          Назад към сесиите
        </Button>
      </div>{roster.length === 0 ? (
        <Card>
          <div className="px-6 py-8 text-center">
            <p className="text-sm" style={{ color: '#4a5565' }}>Няма резервирани катерачи за тази сесия</p>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="border-b border-gray-200 px-6 py-6">
              <h2 className="text-base font-medium text-neutral-950 mb-1">Списък с катерачи</h2>
              <p className="text-sm" style={{ color: '#4a5565' }}>Отбележете присъствие за всеки катерач</p>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-4">
                {roster.map((item) => {
                  const climber = item.climber || item;
                  const climberId = climber._id;
                  const currentStatus = attendance[climberId];

                  return (
                    <div
                      key={climberId}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 rounded-lg gap-3 bg-white"
                    >
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-neutral-950 mb-1">
                          {climber.firstName} {climber.lastName}
                        </h3>
                        {climber.dateOfBirth && (
                          <p className="text-sm" style={{ color: '#4a5565' }}>
                            Възраст: {new Date().getFullYear() - new Date(climber.dateOfBirth).getFullYear()} години
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant={currentStatus === 'present' ? 'success' : 'secondary'}
                          onClick={() => handleQuickMark(climberId, 'present')}
                          className="w-full sm:flex-none sm:min-w-[100px]"
                        >
                          ✓ Присъства
                        </Button>
                        <Button
                          variant={currentStatus === 'absent' ? 'danger' : 'secondary'}
                          onClick={() => handleQuickMark(climberId, 'absent')}
                          className="w-full sm:flex-none sm:min-w-[100px]"
                        >
                          ✗ Отсъства
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-8"
            >
              {saving ? 'Запазване...' : 'Запази всички'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance;

