import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionsAPI } from '../../services/api';
import { adminAPI } from '../../services/api';
import Loading from '../../components/UI/Loading';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    activeClimbers: 0,
    plannedSessions: 0,
    thisMonth: 0,
    growth: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch sessions
      const sessionsResponse = await sessionsAPI.getAll();
      const sessions = sessionsResponse.data.sessions || [];
      
      // Fetch climbers
      let climbersCount = 0;
      try {
        const climbersResponse = await adminAPI.getAllClimbers();
        climbersCount = climbersResponse.data.climbers?.length || 0;
      } catch (error) {
        console.error('Error fetching climbers:', error);
      }

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Calculate stats
      const upcoming = sessions.filter(
        (s) => new Date(s.date) >= today && new Date(s.date) < tomorrow && s.status === 'active'
      );
      
      const thisMonthSessions = sessions.filter(
        (s) => {
          const sessionDate = new Date(s.date);
          return sessionDate >= thisMonthStart && sessionDate <= thisMonthEnd && s.status === 'active';
        }
      );

      // Get today's upcoming sessions
      const todaysSessions = sessions
        .filter((s) => {
          const sessionDate = new Date(s.date);
          return sessionDate >= today && sessionDate < tomorrow && s.status === 'active';
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4);

      setStats({
        activeClimbers: climbersCount,
        plannedSessions: upcoming.length,
        thisMonth: thisMonthSessions.length,
        growth: 12, // Placeholder - would need historical data
      });

      setUpcomingSessions(todaysSessions);
      
      // Mock recent activity (would come from API in real implementation)
      setRecentActivity([
        { name: 'Иван Петров Димитров', action: 'завърши сесия', time: 'преди 5 минути' },
        { name: 'Мария Георгиева', action: 'записа нова сесия', time: 'преди 15 минути' },
        { name: 'Стоян Василев', action: 'обнови профил', time: 'преди 1 час' },
        { name: 'Калина Йорданова', action: 'завърши сесия', time: 'преди 2 часа' },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm');
    } catch {
      return '';
    }
  };

  const formatDate = (date) => {
    try {
      const days = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
      const months = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${dayName}, ${day} ${month} ${year} г.`;
    } catch {
      return '';
    }
  };

  if (loading) {
    return <Loading text="Зареждане на табло..." />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-base font-medium text-neutral-950">
          Добре дошли в WonderClimb
        </h1>
        <p className="text-base text-[#4a5565]">
          Управлявайте вашата катерачна зала ефективно
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Climbers */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 relative">
          <div className="bg-[#ea7a24] rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm text-[#4a5565] mb-2">Активни катерачи</p>
          <p className="text-base font-medium text-neutral-950">{stats.activeClimbers}</p>
        </div>

        {/* Planned Sessions */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 relative">
          <div className="bg-[#adb933] rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-[#4a5565] mb-2">Планирани сесии</p>
          <p className="text-base font-medium text-neutral-950">{stats.plannedSessions}</p>
        </div>

        {/* This Month */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 relative">
          <div className="bg-[#35383d] rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-[#4a5565] mb-2">Този месец</p>
          <p className="text-base font-medium text-neutral-950">{stats.thisMonth}</p>
        </div>

        {/* Growth */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 relative">
          <div className="bg-[#ea7a24] rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-sm text-[#4a5565] mb-2">Растеж</p>
          <p className="text-base font-medium text-neutral-950">+{stats.growth}%</p>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions Today */}
        <div className="lg:col-span-2 bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] overflow-hidden">
          <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-6">
            <h2 className="text-base font-medium text-neutral-950 mb-1">
              Предстоящи сесии днес
            </h2>
            <p className="text-sm text-[#4a5565]">
              {formatDate(new Date())}
            </p>
          </div>
          <div className="divide-y divide-[rgba(0,0,0,0.1)]">
            {upcomingSessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-[#4a5565]">
                Няма предстоящи сесии днес
              </div>
            ) : (
              upcomingSessions.map((session, index) => (
                <div key={session._id || index} className="px-6 py-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 min-w-[64px]">
                      <svg className="w-5 h-5 text-[#ea7a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-[#ea7a24]">
                        {formatTime(session.date)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-neutral-950 mb-1">
                        {session.title || session.name || 'Сесия'}
                      </h3>
                      <p className="text-sm text-[#4a5565]">
                        Треньор: {session.coachIds?.[0]?.firstName || ''} {session.coachIds?.[0]?.lastName || 'Не е зададен'}
                      </p>
                    </div>
                    <div className="bg-[#eddcca] text-[#35383d] px-3 py-1 rounded-[10px] text-sm font-normal">
                      {session.bookedCount || 0}/{session.capacity || 0}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] overflow-hidden">
          <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-6">
            <h2 className="text-base font-medium text-neutral-950">
              Последна активност
            </h2>
          </div>
          <div className="divide-y divide-[rgba(0,0,0,0.1)]">
            {recentActivity.map((activity, index) => (
              <div key={index} className="px-4 py-4">
                <p className="text-sm font-medium text-neutral-950 mb-1">
                  {activity.name}
                </p>
                <p className="text-sm text-[#4a5565] mb-1">
                  {activity.action}
                </p>
                <p className="text-xs text-[#99a1af]">
                  {activity.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/climbers"
          className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="bg-[#ea7a24] rounded-[10px] w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-950 mb-1">
              Добави катерач
            </h3>
            <p className="text-xs text-[#4a5565]">
              Регистрирай нов член
            </p>
          </div>
        </Link>

        <Link
          to="/sessions"
          className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="bg-[#adb933] rounded-[10px] w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-950 mb-1">
              Планирай сесия
            </h3>
            <p className="text-xs text-[#4a5565]">
              Създай нова тренировка
            </p>
          </div>
        </Link>

        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="bg-[#35383d] rounded-[10px] w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-950 mb-1">
              Управление на маршрути
            </h3>
            <p className="text-xs text-[#4a5565]">
              Актуализирай стените
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
