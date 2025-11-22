import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionsAPI, bookingsAPI, parentClimbersAPI, myClimberAPI, competitionsAPI } from '../../services/api';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/UI/Toast';

const Calendar = () => {
  const { user, login, isAuthenticated } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [children, setChildren] = useState([]);
  const [selfClimber, setSelfClimber] = useState(null);
  const [selectedClimberIds, setSelectedClimberIds] = useState([]);
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [currentDate, view]);

  useEffect(() => {
    if (isAuthenticated && user && (user.roles?.includes('climber') || user.roles?.includes('admin'))) {
      fetchChildren();
    } else {
      // Clear children when logged out
      setChildren([]);
      setSelfClimber(null);
      setSelectedClimberIds([]);
    }
  }, [user, isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await login(loginData.email, loginData.password);
      
      if (result.success) {
        setShowLogin(false);
        setLoginData({ email: '', password: '' });
        showToast('Успешно влизане', 'success');
        // User state will be updated by AuthContext, useEffect will handle fetching children
      } else {
        setLoginError(result.error || 'Влизането неуспешно');
      }
    } catch (error) {
      setLoginError('Грешка при влизане');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let startDate, endDate;

      if (view === 'month') {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (view === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else {
        startDate = startOfDay(currentDate);
        endDate = startOfDay(currentDate);
        endDate.setHours(23, 59, 59);
      }

      // Try admin calendar first (for admin users), fallback to public sessions
      let allEvents = [];
      try {
        if (user?.roles?.includes('admin')) {
          const response = await sessionsAPI.getCalendar({
            view,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
          allEvents = response.data.sessions || [];
        } else {
          // Use public sessions endpoint for non-admin users
          const [sessionsResponse, competitionsResponse] = await Promise.all([
            sessionsAPI.getAvailable({
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            }).catch(() => ({ data: { sessions: [] } })),
            competitionsAPI.getCompetitions({
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            }).catch(() => ({ data: { competitions: [] } })),
          ]);
          
          // Format sessions to match calendar format
          const formattedSessions = (sessionsResponse.data.sessions || []).map(session => ({
            ...session,
            type: 'session',
          }));
          
          // Format competitions to match calendar format
          const formattedCompetitions = (competitionsResponse.data.competitions || []).map(competition => ({
            ...competition,
            type: 'competition',
            date: competition.date || competition.startDate,
          }));
          
          // Merge and sort by date
          allEvents = [...formattedSessions, ...formattedCompetitions].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
        }
        setSessions(allEvents);
      } catch (adminError) {
        // If admin endpoint fails (e.g., user is not admin), use public endpoint
        if (adminError.response?.status === 403 || adminError.response?.status === 401) {
          const [sessionsResponse, competitionsResponse] = await Promise.all([
            sessionsAPI.getAvailable({
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            }).catch(() => ({ data: { sessions: [] } })),
            competitionsAPI.getCompetitions({
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            }).catch(() => ({ data: { competitions: [] } })),
          ]);
          
          const formattedSessions = (sessionsResponse.data.sessions || []).map(session => ({
            ...session,
            type: 'session',
          }));
          
          const formattedCompetitions = (competitionsResponse.data.competitions || []).map(competition => ({
            ...competition,
            type: 'competition',
            date: competition.date || competition.startDate,
          }));
          
          allEvents = [...formattedSessions, ...formattedCompetitions].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          setSessions(allEvents);
        } else {
          throw adminError;
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showToast('Грешка при зареждане на календара', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      // Get current user from localStorage to ensure we have the latest data
      const currentUser = JSON.parse(localStorage.getItem('user')) || user;
      
      const [childrenRes, selfRes] = await Promise.all([
        parentClimbersAPI.getAll().catch(() => ({ data: { climbers: [] } })),
        currentUser?.roles?.includes('climber') 
          ? myClimberAPI.getProfile().catch(() => ({ data: { climber: null } }))
          : Promise.resolve({ data: { climber: null } }),
      ]);

      const filteredChildren = childrenRes.data.climbers?.filter(c => c.accountStatus === 'active') || [];
      setChildren(filteredChildren);
      
      if (selfRes.data?.climber) {
        setSelfClimber(selfRes.data.climber);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const getSessionsForDate = (date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return isSameDay(sessionDate, date);
    });
  };

  // Hash function for consistent color generation
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Darken a color by reducing brightness
  const darkenColor = (hex, amount = 0.2) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const darkerR = Math.max(0, Math.round(rgb.r * (1 - amount)));
    const darkerG = Math.max(0, Math.round(rgb.g * (1 - amount)));
    const darkerB = Math.max(0, Math.round(rgb.b * (1 - amount)));
    
    return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
  };

  // Get session color based on targetGroups - using exact colors from "Подходящо за" labels
  const getSessionColor = (session) => {
    if (session.type === 'competition') {
      return { backgroundColor: '#3b82f6', color: 'white' }; // blue-500
    }
    
    if (session.status !== 'active') {
      return { backgroundColor: '#99a1af', color: 'white' };
    }
    
    // Get base color from targetGroups - using exact Tailwind colors from labels
    const targetGroups = session.targetGroups || [];
    
    // Exact Tailwind colors from "Подходящо за" labels background colors:
    // beginner: bg-green-100 (#DCFCE7)
    // experienced: bg-orange-100 (#FFEDD5)
    // advanced: bg-red-100 (#FEE2E2)
    
    // Using exact background colors from labels for first group
    const groupColors = {
      beginner: '#DCFCE7',      // green-100 (exact from bg-green-100)
      experienced: '#FFEDD5',   // orange-100 (exact from bg-orange-100)
      advanced: '#FEE2E2',      // red-100 (exact from bg-red-100)
    };
    
    // Darker shades for second group of same type
    const darkerGroupColors = {
      beginner: '#86EFAC',      // green-300 (darker than green-100)
      experienced: '#FDBA74',   // orange-300 (darker than orange-100)
      advanced: '#FCA5A5',      // red-300 (darker than red-100)
    };
    
    // Find the primary group (priority: beginner < experienced < advanced)
    let primaryGroup = null;
    if (targetGroups.includes('beginner')) {
      primaryGroup = 'beginner';
    } else if (targetGroups.includes('experienced')) {
      primaryGroup = 'experienced';
    } else if (targetGroups.includes('advanced')) {
      primaryGroup = 'advanced';
    }
    
    if (!primaryGroup) {
      // Default orange if no target groups
      return { backgroundColor: '#FFEDD5', color: '#C2410C' }; // orange-100 with orange-700 text
    }
    
    // Generate darker shade for second group of same type with different title
    // Use title hash to consistently assign colors
    if (session.title) {
      const titleHash = hashString(session.title);
      const isSecondGroup = (titleHash % 2) === 1; // Alternate between two shades
      
      if (isSecondGroup) {
        // Use darker shade for second group with darker text for contrast
        const textColors = {
          beginner: '#15803D',    // green-700
          experienced: '#C2410C', // orange-700
          advanced: '#B91C1C',  // red-700
        };
        return { backgroundColor: darkerGroupColors[primaryGroup], color: textColors[primaryGroup] };
      }
    }
    
    // First group uses light background with darker text for contrast
    const textColors = {
      beginner: '#15803D',    // green-700
      experienced: '#C2410C', // orange-700
      advanced: '#B91C1C',    // red-700
    };
    return { backgroundColor: groupColors[primaryGroup], color: textColors[primaryGroup] };
  };

  const handleBooking = async () => {
    if (!selectedSession || selectedClimberIds.length === 0) {
      showToast('Моля, изберете поне едно дете', 'error');
      return;
    }

    setIsBooking(true);
    try {
      await bookingsAPI.create({
        sessionId: selectedSession._id,
        climberIds: selectedClimberIds,
      });

      showToast('Часът е запазен успешно', 'success');
      setShowBookingConfirmation(false);
      setSelectedSession(null);
      setSelectedClimberIds([]);
      fetchSessions();
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при запазване на час', 'error');
    } finally {
      setIsBooking(false);
    }
  };

  const toggleClimberSelection = (climberId) => {
    setSelectedClimberIds(prev => 
      prev.includes(climberId)
        ? prev.filter(id => id !== climberId)
        : [...prev, climberId]
    );
  };

  const allClimbers = [
    ...(selfClimber ? [{ 
      _id: selfClimber._id, 
      firstName: 'За мен', 
      lastName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(), 
      isSelf: true 
    }] : []),
    ...children.map(c => ({ ...c, isSelf: false })),
  ];

  const renderMonthViewMobile = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div className="space-y-4">
        {days.map((day) => {
          const daySessions = getSessionsForDate(day);
          const isToday = isSameDay(day, new Date());
          
          if (daySessions.length === 0) return null;

          return (
            <div
              key={day.toISOString()}
              className={`bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4 ${isToday ? 'ring-2 ring-[#ea7a24]' : ''}`}
            >
              <div className="font-medium text-base text-neutral-950 mb-3">
                {format(day, 'EEEE, d MMMM yyyy')}
              </div>
              <div className="space-y-2">
                {daySessions.map((event) => {
                  const colorStyle = getSessionColor(event);
                  return (
                  <div
                    key={event._id}
                    onClick={() => setSelectedSession(event)}
                    className="p-3 rounded-[10px] cursor-pointer text-white"
                    style={colorStyle}
                  >
                    <div className="font-medium text-sm">
                      {event.type === 'competition' && '🏆 '}
                      {event.type === 'competition' 
                        ? `${event.location || ''}${event.groups ? ` - ${event.groups}` : ''} - ${event.title}`
                        : `${format(new Date(event.date), 'HH:mm')} - ${event.title}`}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {days.every(day => getSessionsForDate(day).length === 0) && (
          <div className="text-center text-gray-500 py-8">
            Няма сесии за този месец
          </div>
        )}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <>
        {/* Mobile List View */}
        <div className="md:hidden">
          {renderMonthViewMobile()}
        </div>
        
        {/* Desktop Grid View */}
        <div className="hidden md:grid md:grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
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
                  {daySessions.slice(0, 3).map((event) => {
                    const colorStyle = getSessionColor(event);
                    return (
                    <div
                      key={event._id}
                      onClick={() => setSelectedSession(event)}
                      className="text-xs p-1 rounded-[10px] cursor-pointer truncate text-white"
                      style={colorStyle}
                      title={event.title}
                    >
                      {event.type === 'competition' && '🏆 '}
                      {event.type === 'competition' 
                        ? `${event.location || ''}${event.groups ? ` - ${event.groups}` : ''} - ${event.title}`
                        : `${format(new Date(event.date), 'HH:mm')} ${event.title}`}
                    </div>
                    );
                  })}
                  {daySessions.length > 3 && (
                    <div className="text-xs text-[#4a5565]">+{daySessions.length - 3} още</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderWeekViewMobile = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        {days.map((day) => {
          const daySessions = getSessionsForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4 ${isToday ? 'ring-2 ring-[#ea7a24]' : ''}`}
            >
              <div className="font-medium text-base mb-3 text-neutral-950">
                {format(day, 'EEEE, d MMMM')}
              </div>
              <div className="space-y-2">
                {daySessions.length === 0 ? (
                  <div className="text-sm text-[#99a1af] text-center py-4">Няма сесии</div>
                ) : (
                  daySessions.map((event) => {
                    const colorStyle = getSessionColor(event);
                    return (
                    <div
                      key={event._id}
                      onClick={() => setSelectedSession(event)}
                      className="p-3 rounded-[10px] cursor-pointer text-white"
                      style={colorStyle}
                    >
                      <div className="font-medium text-sm">
                        {event.type === 'competition' && '🏆 '}
                        {event.type === 'competition' 
                          ? `${event.location || ''}${event.groups ? ` - ${event.groups}` : ''} - ${event.title}`
                          : `${format(new Date(event.date), 'HH:mm')} - ${event.title}`}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <>
        {/* Mobile Timeline View */}
        <div className="md:hidden">
          {renderWeekViewMobile()}
        </div>
        
        {/* Desktop Grid View */}
        <div className="hidden md:grid md:grid-cols-7 gap-4">
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
                  {daySessions.map((event) => {
                    const colorStyle = getSessionColor(event);
                    return (
                    <div
                      key={event._id}
                      onClick={() => setSelectedSession(event)}
                      className="p-2 rounded-[10px] cursor-pointer text-sm text-white"
                      style={colorStyle}
                    >
                      <div className="font-medium">
                        {event.type === 'competition' && '🏆 '}
                        {event.type === 'competition' 
                          ? `${event.location || ''}${event.groups ? ` - ${event.groups}` : ''}`
                          : format(new Date(event.date), 'HH:mm')}
                      </div>
                      <div className="text-xs">{event.title}</div>
                    </div>
                    );
                  })}
                  {daySessions.length === 0 && (
                    <div className="text-sm text-[#99a1af] text-center py-4">Няма сесии</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
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

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return <Loading text="Loading calendar..." />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-medium text-neutral-950 leading-8 mb-1">Календар</h2>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant={view === 'month' ? 'primary' : 'secondary'}
            onClick={() => setView('month')}
            className={`flex-1 sm:flex-none ${view === 'month' ? 'bg-[#35383d] hover:bg-[#2d3035] text-white rounded-[10px]' : 'bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]'}`}
          >
            Месец
          </Button>
          <Button
            variant={view === 'week' ? 'primary' : 'secondary'}
            onClick={() => setView('week')}
            className={`flex-1 sm:flex-none ${view === 'week' ? 'bg-[#35383d] hover:bg-[#2d3035] text-white rounded-[10px]' : 'bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]'}`}
          >
            Седмица
          </Button>
          <Button
            variant={view === 'day' ? 'primary' : 'secondary'}
            onClick={() => setView('day')}
            className={`flex-1 sm:flex-none ${view === 'day' ? 'bg-[#35383d] hover:bg-[#2d3035] text-white rounded-[10px]' : 'bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]'}`}
          >
            Ден
          </Button>
        </div>
      </div>

      <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px]">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <Button 
            variant="secondary" 
            onClick={() => navigateDate('prev')}
            className="w-full sm:w-auto bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
          >
            ← Предишен
          </Button>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <h2 className="text-base font-medium text-neutral-950 text-center">
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
              {view === 'week' && `Седмица от ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}`}
              {view === 'day' && format(currentDate, 'MMMM d, yyyy')}
            </h2>
            <Button 
              variant="secondary" 
              onClick={goToToday}
              className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px] text-sm px-3 py-1"
            >
              Днес
            </Button>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => navigateDate('next')}
            className="w-full sm:w-auto bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
          >
            Следващ →
          </Button>
        </div>

        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </Card>

      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(0,0,0,0.1)] rounded-[10px]">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-base font-medium text-neutral-950 pr-2">{selectedSession.title}</h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-[#4a5565] hover:text-[#35383d] text-2xl flex-shrink-0 w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm text-[#4a5565]">
              <p><strong className="text-neutral-950">Дата:</strong> {format(new Date(selectedSession.date), 'PPpp')}</p>
              {selectedSession.type === 'competition' ? (
                <>
                  <p><strong className="text-neutral-950">Място:</strong> {selectedSession.location}</p>
                  <p><strong className="text-neutral-950">Спорт:</strong> {selectedSession.sport}</p>
                  {selectedSession.groups && (
                    <p><strong className="text-neutral-950">Групи:</strong> {selectedSession.groups}</p>
                  )}
                  <p><strong className="text-neutral-950">Ранг:</strong> {selectedSession.rank}</p>
                  {selectedSession.sourceUrl && (
                    <p>
                      <strong className="text-neutral-950">Източник:</strong>{' '}
                      <a href={selectedSession.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        БФКА календар
                      </a>
                    </p>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Booking section - only for active sessions (not competitions) */}
            {selectedSession.type !== 'competition' && selectedSession.status === 'active' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                {!isAuthenticated ? (
                  <div>
                    <p className="text-sm text-[#4a5565] mb-4">
                      Моля, влезте в профила си или се{' '}
                      <Link 
                        to="/register" 
                        className="text-[#ff6900] hover:text-[#f54900] underline font-medium"
                        onClick={() => setSelectedSession(null)}
                      >
                        регистрирайте
                      </Link>
                      , за да резервирате час
                    </p>
                    <Button
                      onClick={() => setShowLogin(true)}
                      className="w-full bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white hover:from-[#f54900] hover:to-[#ff6900] rounded-[10px]"
                    >
                      Влез
                    </Button>
                  </div>
                ) : allClimbers.length > 0 ? (
                  <>
                    <h3 className="text-sm font-medium text-neutral-950 mb-3">Избери дете (деца):</h3>
                    <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                      {allClimbers.map((climber) => (
                        <label
                          key={climber._id}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedClimberIds.includes(climber._id)}
                            onChange={() => toggleClimberSelection(climber._id)}
                            className="w-4 h-4 text-[#ff6900] border-gray-300 rounded focus:ring-[#ff6900]"
                          />
                          <span className="ml-2 text-sm text-neutral-950">
                            {climber.firstName} {climber.lastName}
                          </span>
                        </label>
                      ))}
                    </div>
                    <Button
                      onClick={() => {
                        if (selectedClimberIds.length === 0) {
                          showToast('Моля, изберете поне едно дете', 'error');
                          return;
                        }
                        setShowBookingConfirmation(true);
                      }}
                      disabled={selectedClimberIds.length === 0 || isBooking}
                      className="w-full bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white hover:from-[#f54900] hover:to-[#ff6900] rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBooking ? 'Запазване...' : 'Запази час'}
                    </Button>
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-[#4a5565] mb-4">
                      Моля, добавете дете в профила си, за да резервирате час
                    </p>
                    <Button
                      onClick={() => {
                        window.location.href = '/parent/profile';
                      }}
                      className="w-full bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white hover:from-[#f54900] hover:to-[#ff6900] rounded-[10px]"
                    >
                      Добави дете
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setSelectedSession(null);
                  setSelectedClimberIds([]);
                  setShowBookingConfirmation(false);
                }}
                className="px-4 py-2 bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px] font-medium transition-colors"
              >
                Затвори
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <Card className="max-w-md w-full border border-[rgba(0,0,0,0.1)] rounded-[10px]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-neutral-950">Влез в профила си</h3>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setLoginError('');
                  setLoginData({ email: '', password: '' });
                }}
                className="text-[#4a5565] hover:text-[#35383d] text-2xl flex-shrink-0 w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-950 mb-1">
                    Имейл
                  </label>
                  <Input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    className="w-full"
                    placeholder="ваш@имейл.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-950 mb-1">
                    Парола
                  </label>
                  <Input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="w-full"
                    placeholder="••••••••"
                  />
                </div>
                {loginError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {loginError}
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex-1 bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white hover:from-[#f54900] hover:to-[#ff6900] rounded-[10px] disabled:opacity-50"
                >
                  {isLoggingIn ? 'Влизане...' : 'Влез'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogin(false);
                    setLoginError('');
                    setLoginData({ email: '', password: '' });
                  }}
                  disabled={isLoggingIn}
                  className="px-4 py-2 bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px] font-medium transition-colors disabled:opacity-50"
                >
                  Отказ
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {showBookingConfirmation && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <Card className="max-w-md w-full border border-[rgba(0,0,0,0.1)] rounded-[10px]">
            <h3 className="text-lg font-medium text-neutral-950 mb-4">Потвърждение</h3>
            <div className="space-y-2 text-sm text-[#4a5565] mb-6">
              <p>
                <strong className="text-neutral-950">Тренировка:</strong> {selectedSession.title}
              </p>
              <p>
                <strong className="text-neutral-950">Дата и час:</strong> {format(new Date(selectedSession.date), 'PPpp')}
              </p>
              <p>
                <strong className="text-neutral-950">Избрани деца:</strong>
              </p>
              <ul className="list-disc list-inside ml-2">
                {allClimbers
                  .filter(c => selectedClimberIds.includes(c._id))
                  .map(climber => (
                    <li key={climber._id}>{climber.firstName} {climber.lastName}</li>
                  ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBooking}
                disabled={isBooking}
                className="flex-1 bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white hover:from-[#f54900] hover:to-[#ff6900] rounded-[10px] disabled:opacity-50"
              >
                {isBooking ? 'Запазване...' : 'Потвърди'}
              </Button>
              <button
                onClick={() => setShowBookingConfirmation(false)}
                disabled={isBooking}
                className="px-4 py-2 bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px] font-medium transition-colors disabled:opacity-50"
              >
                Отказ
              </button>
            </div>
          </Card>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default Calendar;

