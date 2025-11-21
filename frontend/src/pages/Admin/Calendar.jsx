import { useState, useEffect } from 'react';
import { sessionsAPI } from '../../services/api';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, [currentDate, view]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let startDate, endDate;

      if (view === 'month') {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (view === 'week') {
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
      } else {
        startDate = startOfDay(currentDate);
        endDate = startOfDay(currentDate);
        endDate.setHours(23, 59, 59);
      }

      const response = await sessionsAPI.getCalendar({
        view,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionsForDate = (date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return isSameDay(sessionDate, date);
    });
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center font-semibold text-gray-700">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const daySessions = getSessionsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`
                min-h-24 p-1 border border-[rgba(0,0,0,0.1)] rounded-[10px]
                ${isCurrentMonth ? 'bg-white' : 'bg-[#f3f3f5]'}
                ${isToday ? 'ring-2 ring-[#ea7a24]' : ''}
              `}
            >
              <div className={`text-sm font-medium ${isCurrentMonth ? 'text-neutral-950' : 'text-[#99a1af]'}`}>
                {format(day, 'd')}
              </div>
              <div className="mt-1 space-y-1">
                {daySessions.slice(0, 3).map((session) => (
                  <div
                    key={session._id}
                    onClick={() => setSelectedSession(session)}
                    className={`
                      text-xs p-1 rounded-[10px] cursor-pointer truncate
                      ${session.status === 'active' ? 'bg-[#ea7a24] text-white' : 'bg-[#99a1af] text-white'}
                    `}
                    title={session.title}
                  >
                    {format(new Date(session.date), 'HH:mm')} {session.title}
                  </div>
                ))}
                {daySessions.length > 3 && (
                  <div className="text-xs text-[#4a5565]">+{daySessions.length - 3} още</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-4">
        {days.map((day) => {
          const daySessions = getSessionsForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-2 ${isToday ? 'ring-2 ring-[#ea7a24]' : ''}`}
            >
              <div className="font-medium text-center mb-2 text-neutral-950">
                {format(day, 'EEE d')}
              </div>
              <div className="space-y-2">
                {daySessions.map((session) => (
                  <div
                    key={session._id}
                    onClick={() => setSelectedSession(session)}
                    className={`
                      p-2 rounded-[10px] cursor-pointer text-sm
                      ${session.status === 'active' ? 'bg-[#ea7a24] text-white' : 'bg-[#99a1af] text-white'}
                    `}
                  >
                    <div className="font-medium">{format(new Date(session.date), 'HH:mm')}</div>
                    <div className="text-xs">{session.title}</div>
                  </div>
                ))}
                {daySessions.length === 0 && (
                  <div className="text-sm text-[#99a1af] text-center py-4">Няма сесии</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const daySessions = getSessionsForDate(currentDate);

    return (
      <div className="space-y-4">
        <div className="text-center text-2xl font-bold mb-4">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </div>
        {daySessions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No sessions scheduled</div>
        ) : (
          <div className="space-y-3">
            {daySessions
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((session) => (
                <Card key={session._id}>
                  <div
                    onClick={() => setSelectedSession(session)}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{session.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(session.date), 'h:mm a')} -{' '}
                          {format(
                            new Date(new Date(session.date).getTime() + session.durationMinutes * 60000),
                            'h:mm a'
                          )}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Capacity: {session.capacity} | Duration: {session.durationMinutes} min
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    );
  };

  const navigateDate = (direction) => {
    if (view === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (view === 'week') {
      const days = direction === 'next' ? 7 : -7;
      setCurrentDate(new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000));
    } else {
      const days = direction === 'next' ? 1 : -1;
      setCurrentDate(new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000));
    }
  };

  if (loading) {
    return <Loading text="Loading calendar..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-base font-medium text-neutral-950 mb-1">Календар</h1>
          <p className="text-sm text-[#4a5565]">Преглед на всички сесии</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'month' ? 'primary' : 'secondary'}
            onClick={() => setView('month')}
            className={view === 'month' ? 'bg-[#35383d] hover:bg-[#2d3035] text-white rounded-[10px]' : 'bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]'}
          >
            Месец
          </Button>
          <Button
            variant={view === 'week' ? 'primary' : 'secondary'}
            onClick={() => setView('week')}
            className={view === 'week' ? 'bg-[#35383d] hover:bg-[#2d3035] text-white rounded-[10px]' : 'bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]'}
          >
            Седмица
          </Button>
          <Button
            variant={view === 'day' ? 'primary' : 'secondary'}
            onClick={() => setView('day')}
            className={view === 'day' ? 'bg-[#35383d] hover:bg-[#2d3035] text-white rounded-[10px]' : 'bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]'}
          >
            Ден
          </Button>
        </div>
      </div>

      <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px]">
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="secondary" 
            onClick={() => navigateDate('prev')}
            className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
          >
            ← Предишен
          </Button>
          <h2 className="text-base font-medium text-neutral-950">
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && `Седмица от ${format(startOfWeek(currentDate), 'MMM d')}`}
            {view === 'day' && format(currentDate, 'MMMM d, yyyy')}
          </h2>
          <Button 
            variant="secondary" 
            onClick={() => navigateDate('next')}
            className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
          >
            Следващ →
          </Button>
        </div>

        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </Card>

      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 border border-[rgba(0,0,0,0.1)] rounded-[10px]">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-base font-medium text-neutral-950">{selectedSession.title}</h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-[#4a5565] hover:text-[#35383d] text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm text-[#4a5565]">
              <p><strong className="text-neutral-950">Дата:</strong> {format(new Date(selectedSession.date), 'PPpp')}</p>
              <p><strong className="text-neutral-950">Продължителност:</strong> {selectedSession.durationMinutes} минути</p>
              <p><strong className="text-neutral-950">Капацитет:</strong> {selectedSession.capacity}</p>
              <p><strong className="text-neutral-950">Статус:</strong> {selectedSession.status === 'active' ? 'Активна' : 'Отменена'}</p>
              {selectedSession.description && (
                <p><strong className="text-neutral-950">Описание:</strong> {selectedSession.description}</p>
              )}
              {selectedSession.coachIds && selectedSession.coachIds.length > 0 && (
                <p>
                  <strong className="text-neutral-950">Треньори:</strong>{' '}
                  {selectedSession.coachIds.map(c => 
                    c.firstName && c.lastName 
                      ? `${c.firstName} ${c.middleName || ''} ${c.lastName}`.trim()
                      : c.name || c.email || 'Неизвестен'
                  ).join(', ')}
                </p>
              )}
            </div>
            <div className="mt-4">
              <Button 
                variant="secondary" 
                onClick={() => setSelectedSession(null)}
                className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
              >
                Затвори
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Calendar;

