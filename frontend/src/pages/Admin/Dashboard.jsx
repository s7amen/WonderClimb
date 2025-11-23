import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sessionsAPI, adminAPI } from '../../services/api';
import Loading from '../../components/UI/Loading';
import { format, startOfDay } from 'date-fns';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeClimbers: 0,
    plannedSessions: 0,
    thisMonth: 0,
    totalBookings: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [sessionsWithBookings, setSessionsWithBookings] = useState([]);
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
      const today = startOfDay(now);
      
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Filter upcoming sessions (next 7 days)
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      const upcoming = sessions.filter(
        (s) => {
          const sessionDate = startOfDay(new Date(s.date));
          return sessionDate >= today && sessionDate <= sevenDaysLater && s.status === 'active';
        }
      ).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const thisMonthSessions = sessions.filter(
        (s) => {
          const sessionDate = new Date(s.date);
          return sessionDate >= thisMonthStart && sessionDate <= thisMonthEnd && s.status === 'active';
        }
      );

      // Get sessions with booking counts and children
      const sessionsWithData = await Promise.all(
        upcoming.map(async (session) => {
          try {
            const rosterResponse = await sessionsAPI.getRoster(session._id);
            const roster = rosterResponse.data.roster || [];
            return {
              ...session,
              bookedCount: roster.length,
              children: roster.map(r => r.climber).filter(Boolean),
            };
          } catch (error) {
            console.error(`Error fetching roster for session ${session._id}:`, error);
            return {
              ...session,
              bookedCount: 0,
              children: [],
            };
          }
        })
      );

      const totalBookings = sessionsWithData.reduce((sum, s) => sum + s.bookedCount, 0);

      setStats({
        activeClimbers: climbersCount,
        plannedSessions: upcoming.length,
        thisMonth: thisMonthSessions.length,
        totalBookings,
      });

      setUpcomingSessions(upcoming);
      setSessionsWithBookings(sessionsWithData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBulgarianDayName = (date) => {
    const dayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
    return dayNames[date.getDay()];
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} ч ${mins} м`;
    } else if (hours > 0) {
      return `${hours} ч`;
    } else {
      return `${mins} м`;
    }
  };

  const getCoaches = (session) => {
    if (!session?.coachIds) return [];
    return session.coachIds.map(coach => {
      if (typeof coach === 'object' && coach.firstName) {
        return `${coach.firstName} ${coach.lastName || ''}`.trim();
      }
      return null;
    }).filter(Boolean);
  };

  // Group sessions by date
  const groupByDate = () => {
    const grouped = {};
    sessionsWithBookings.forEach(session => {
      const date = startOfDay(new Date(session.date));
      const dateKey = format(date, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date,
          sessions: []
        };
      }
      grouped[dateKey].sessions.push(session);
    });
    return Object.values(grouped).sort((a, b) => a.date - b.date);
  };

  const groupedSessions = groupByDate();

  if (loading) {
    return <Loading text="Зареждане на табло..." />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-950">
              Статистика и график
            </h1>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4 sm:p-6">
              <div className="bg-[#ea7a24] rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm text-[#4a5565] mb-2">Активни катерачи</p>
              <p className="text-2xl font-medium text-neutral-950">{stats.activeClimbers}</p>
            </div>

            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4 sm:p-6">
              <div className="bg-[#adb933] rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-[#4a5565] mb-2">Предстоящи сесии</p>
              <p className="text-2xl font-medium text-neutral-950">{stats.plannedSessions}</p>
            </div>

            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4 sm:p-6">
              <div className="bg-[#35383d] rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm text-[#4a5565] mb-2">Този месец</p>
              <p className="text-2xl font-medium text-neutral-950">{stats.thisMonth}</p>
            </div>

            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4 sm:p-6">
              <div className="bg-[#ea7a24] rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-[#4a5565] mb-2">Общо резервации</p>
              <p className="text-2xl font-medium text-neutral-950">{stats.totalBookings}</p>
            </div>
          </div>

          {/* Upcoming Sessions with Children */}
          {sessionsWithBookings.length === 0 ? (
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 sm:p-8 text-center">
              <p className="text-[#4a5565]">Няма предстоящи сесии</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedSessions.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* Group Header */}
                  <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] px-4 sm:px-6 py-4 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#ea7a24] rounded-[10px] w-9 h-9 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base font-normal text-neutral-950">
                          {`${getBulgarianDayName(group.date)}, ${format(group.date, 'dd.MM.yyyy')}`}
                        </h2>
                        <p className="text-sm text-[#4a5565]">
                          {group.sessions.length} {group.sessions.length === 1 ? 'сесия' : 'сесии'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Session Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {group.sessions.map((session) => {
                      const sessionDate = new Date(session.date);
                      const coaches = getCoaches(session);
                      
                      return (
                        <div
                          key={session._id}
                          className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4 sm:p-5 flex flex-col"
                        >
                          {/* Time and Duration */}
                          <div className="flex items-center gap-2 mb-4">
                            <svg className="w-4 h-4 text-[#ea7a24]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM7.5 4V8.25L11 10L10.25 11.25L6.5 9V4H7.5Z" fill="currentColor"/>
                            </svg>
                            <span className="text-sm font-normal text-[#ea7a24]">
                              {format(sessionDate, 'HH:mm')}
                            </span>
                            <span className="text-sm font-normal text-[#4a5565]">
                              {formatDuration(session.durationMinutes)}
                            </span>
                          </div>

                          {/* Session Title */}
                          <h3 className="text-base font-normal text-neutral-950 mb-4">
                            {session.title}
                          </h3>

                          {/* Trainers */}
                          {coaches.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-[#4a5565] mb-1">Треньори:</p>
                              <div className="flex flex-wrap gap-2">
                                {coaches.map((coach, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-[#eddcca] text-[#35383d] text-xs font-normal px-2 py-1 rounded-[4px]"
                                  >
                                    {coach}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Booked Children */}
                          <div className="border-t border-gray-100 pt-3 mb-4">
                            <p className="text-xs text-[#4a5565] mb-2">
                              Записани деца ({session.bookedCount}/{session.capacity})
                            </p>
                            {session.children.length > 0 ? (
                              <div className="space-y-1">
                                {session.children.slice(0, 3).map((child, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className="bg-[#adb933] rounded-full w-1.5 h-1.5"></div>
                                    <span className="text-xs text-[#4a5565]">
                                      {child.firstName} {child.lastName || ''}
                                    </span>
                                  </div>
                                ))}
                                {session.children.length > 3 && (
                                  <p className="text-xs text-[#4a5565] pl-3.5">
                                    +{session.children.length - 3} още
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-[#4a5565]">Няма записани деца</p>
                            )}
                          </div>

                          {/* View Details Button */}
                          <button
                            onClick={() => navigate(`/admin/sessions`)}
                            className="w-full bg-[#ea7a24] text-white text-sm font-normal py-2 px-4 rounded-[10px] hover:bg-[#d96a1a] transition-colors"
                          >
                            Преглед
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block w-80 bg-white border-l border-[rgba(0,0,0,0.1)] flex-shrink-0 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="bg-[#eddcca] rounded-full w-9 h-9 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#35383d]" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10ZM10 12.5C6.66 12.5 0 14.175 0 17.5V20H20V17.5C20 14.175 13.34 12.5 10 12.5Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <p className="text-base font-normal text-neutral-950">
                {user?.firstName} {user?.lastName || ''}
              </p>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-[#f3f3f5] rounded-[10px] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-950" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM7.5 4V8.25L11 10L10.25 11.25L6.5 9V4H7.5Z" fill="currentColor"/>
              </svg>
              <p className="text-sm font-normal text-neutral-950">Общо сесии</p>
            </div>
            <p className="text-base font-normal text-neutral-950">
              {stats.thisMonth} този месец
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admin/sessions')}
              className="w-full bg-[#adb933] text-white text-base font-normal py-3 px-4 rounded-[10px] hover:bg-[#9db02a] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2V6M14 2V6M3 10H17M5 4H15C16.1046 4 17 4.89543 17 6V18C17 19.1046 16.1046 20 15 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Планирай сесия
            </button>
            <button
              onClick={() => navigate('/admin/climbers')}
              className="w-full bg-[#ea7a24] text-white text-base font-normal py-3 px-4 rounded-[10px] hover:bg-[#d96a1a] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Добави катерач
            </button>
            <button
              onClick={() => navigate('/admin/calendar')}
              className="w-full bg-[#35383d] text-white text-base font-normal py-3 px-4 rounded-[10px] hover:bg-[#2a2d32] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2V6M12 2V6M3 10H17M5 4H15C16.1046 4 17 4.89543 17 6V18C17 19.1046 16.1046 20 15 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Календар
            </button>
          </div>

          {/* Footer Links */}
          <div className="border-t border-gray-200 pt-6 space-y-2">
            <button
              onClick={() => navigate('/admin/climbers')}
              className="w-full text-sm text-[#4a5565] text-center py-2 hover:text-neutral-950 transition-colors"
            >
              Управление на катерачи
            </button>
            <button
              onClick={() => navigate('/admin/sessions')}
              className="w-full text-sm text-[#4a5565] text-center py-2 hover:text-neutral-950 transition-colors"
            >
              Управление на сесии
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
