import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionsAPI, bookingsAPI, competitionsAPI } from '../../services/api';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay } from 'date-fns';
import { bg } from 'date-fns/locale';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/UI/Toast';
import BaseModal from '../../components/UI/BaseModal';
import BookingModal from '../../components/UI/BookingModal';
import LoginModal from '../../components/UI/LoginModal';

const Calendar = () => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedSession, setSelectedSession] = useState(null); // For details view
  const [bookingSession, setBookingSession] = useState(null); // For booking modal
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [userBookings, setUserBookings] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState(() => {
    // Initialize with all base filters
    const defaultFilters = ['beginner', 'experienced', 'advanced', 'competition'];
    // Check if user is authenticated from localStorage to include 'reserved' from start
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user?.roles?.includes('climber') || user?.roles?.includes('admin')) {
          defaultFilters.push('reserved');
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return new Set(defaultFilters);
  });

  useEffect(() => {
    fetchSessions();
  }, [currentDate, view]);

  useEffect(() => {
    if (isAuthenticated && user && (user.roles?.includes('climber') || user.roles?.includes('admin'))) {
      fetchUserBookings();
      // Ensure 'reserved' is in filters
      setSelectedFilters(prev => {
        if (!prev.has('reserved')) {
          const newFilters = new Set(prev);
          newFilters.add('reserved');
          return newFilters;
        }
        return prev;
      });
    } else {
      setUserBookings([]);
      // Remove 'reserved' from filters when logged out
      setSelectedFilters(prev => {
        const newFilters = new Set(prev);
        newFilters.delete('reserved');
        return newFilters.size > 0 ? newFilters : new Set(['beginner', 'experienced', 'advanced', 'competition']);
      });
    }
  }, [user, isAuthenticated]);

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

  const fetchUserBookings = async () => {
    try {
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

      const bookingsRes = await bookingsAPI.getMyBookings().catch(() => ({ data: { bookings: [] } }));
      const allBookings = bookingsRes.data.bookings || [];

      // Filter bookings to only include those in the current view date range
      const filteredBookings = allBookings.filter(booking => {
        if (!booking.session || !booking.session.date) return false;
        const bookingDate = new Date(booking.session.date);
        return bookingDate >= startDate && bookingDate <= endDate && booking.status === 'booked';
      });

      setUserBookings(filteredBookings);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      setUserBookings([]);
    }
  };

  const getSessionsForDate = (date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      if (!isSameDay(sessionDate, date)) {
        return false;
      }

      // Apply filters
      if (selectedFilters.size === 0) {
        return false; // If no filters selected, show nothing
      }

      // Check if session matches any selected filter
      let matchesOtherFilters = false;
      let matchesReservedFilter = false;

      // Check competition filter
      if (session.type === 'competition') {
        matchesOtherFilters = selectedFilters.has('competition');
      } else {
        // For regular sessions, check targetGroups
        if (session.status === 'active') {
          const targetGroups = session.targetGroups || [];
          if (targetGroups.includes('beginner') && selectedFilters.has('beginner')) {
            matchesOtherFilters = true;
          }
          if (targetGroups.includes('experienced') && selectedFilters.has('experienced')) {
            matchesOtherFilters = true;
          }
          if (targetGroups.includes('advanced') && selectedFilters.has('advanced')) {
            matchesOtherFilters = true;
          }
        }
      }

      // Check if "reserved" filter is selected and session has a booking
      if (selectedFilters.has('reserved')) {
        matchesReservedFilter = hasBooking(session._id);
      }

      // Show session if it matches any selected filter (OR logic)
      // If only "reserved" is selected, show all reserved sessions
      if (selectedFilters.size === 1 && selectedFilters.has('reserved')) {
        return matchesReservedFilter;
      }

      // If "reserved" is selected along with other filters, show sessions that match:
      // - Other filters (beginner/experienced/advanced/competition) OR
      // - Reserved filter
      if (selectedFilters.has('reserved')) {
        return matchesOtherFilters || matchesReservedFilter;
      }

      // If "reserved" is not selected, show sessions based on other filters only
      return matchesOtherFilters;
    });
  };

  const toggleFilter = (filterType) => {
    setSelectedFilters(prev => {
      // Get available filter types based on authentication
      const baseFilterTypes = ['beginner', 'experienced', 'advanced', 'competition'];
      const allFilterTypes = isAuthenticated
        ? [...baseFilterTypes, 'reserved']
        : baseFilterTypes;

      // Check if all available filters are selected
      const allSelected = allFilterTypes.every(type => prev.has(type));

      // If all filters are active and we click one, deactivate all others and activate only the clicked one
      if (allSelected) {
        return new Set([filterType]);
      }

      // Otherwise, normal toggle behavior
      const newFilters = new Set(prev);
      if (newFilters.has(filterType)) {
        newFilters.delete(filterType);
        // If no filters remain, reactivate all available filters
        if (newFilters.size === 0) {
          return new Set(allFilterTypes);
        }
      } else {
        newFilters.add(filterType);
      }
      return newFilters;
    });
  };

  // Check if a session has a booking for the current user
  const hasBooking = (sessionId) => {
    return userBookings.some(booking => {
      const bookingSessionId = booking.session?._id || booking.sessionId;
      return bookingSessionId === sessionId || bookingSessionId?.toString() === sessionId?.toString();
    });
  };

  // Get legend items - always shows all possible types regardless of current view
  // Returns items in specific order: beginner, experienced, advanced, reserved, competition
  const getLegendItems = () => {
    const items = [];

    // Always show all training session types
    items.push({
      type: 'beginner',
      label: 'Начинаещи',
      backgroundColor: '#DCFCE7',
      color: '#15803D',
    });

    items.push({
      type: 'experienced',
      label: 'Деца с опит',
      backgroundColor: '#FFEDD5',
      color: '#C2410C',
    });

    items.push({
      type: 'advanced',
      label: 'Напреднали',
      backgroundColor: '#FEE2E2',
      color: '#B91C1C',
    });

    // Add reserved indicator if user is authenticated
    if (isAuthenticated) {
      items.push({
        type: 'reserved',
        label: 'Резервирано',
        backgroundColor: 'transparent',
        color: '#000000',
        isReserved: true,
      });
    }

    // Always show competition type
    items.push({
      type: 'competition',
      label: 'Състезания',
      backgroundColor: '#3b82f6',
      color: 'white',
    });

    return items;
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

  const handleBookingSuccess = async () => {
    // Refresh sessions to update booked counts
    await fetchSessions();
    // Refresh user bookings to show the new booking
    await fetchUserBookings();
    setBookingSession(null);
  };

  const renderMonthViewMobile = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-0 w-full">
        {['П', 'В', 'С', 'Ч', 'П', 'С', 'Н'].map((day, index) => (
          <div key={`mobile-day-${index}`} className="p-1.5 text-center text-xs font-semibold text-gray-700 border-r border-[rgba(0,0,0,0.05)] last:border-r-0">
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
                min-h-[80px] p-1.5 border-r border-b border-[rgba(0,0,0,0.1)] last:border-r-0
                ${isCurrentMonth ? 'bg-white' : 'bg-[#f3f3f5]'}
                ${isToday ? 'ring-2 ring-[#ea7a24] ring-inset' : ''}
              `}
            >
              <div className={`text-sm font-medium mb-1.5 text-center ${isCurrentMonth ? 'text-neutral-950' : 'text-[#99a1af]'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {daySessions.slice(0, 2).map((event) => {
                  const colorStyle = getSessionColor(event);
                  const isBooked = hasBooking(event._id);
                  return (
                    <div
                      key={event._id}
                      onClick={() => setSelectedSession(event)}
                      className={`text-[10px] px-1 py-1 rounded-[4px] truncate text-white text-center font-medium cursor-pointer hover:opacity-80 transition-opacity ${isBooked ? 'ring-1 ring-black' : ''}`}
                      style={colorStyle}
                      title={`${format(new Date(event.date), 'HH:mm')} - ${event.title || (event.type === 'competition' ? 'Състезание' : 'Тренировка')}`}
                    >
                      {isBooked && '✓ '}
                      {event.type === 'competition' && '🏆 '}
                      {format(new Date(event.date), 'HH:mm')}
                    </div>
                  );
                })}
                {daySessions.length > 2 && (
                  <div className="text-[10px] text-[#4a5565] text-center font-medium">+{daySessions.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
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
      <div className="grid grid-cols-7 gap-1">
          {['Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб', 'Нед'].map((day) => (
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
                    const isBooked = hasBooking(event._id);
                    return (
                      <div
                        key={event._id}
                        onClick={() => setSelectedSession(event)}
                        className={`text-xs p-1 rounded-[10px] cursor-pointer truncate text-white relative ${isBooked ? 'ring-2 ring-black' : ''}`}
                        style={colorStyle}
                        title={event.title}
                      >
                        {isBooked && '✓ '}
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
                {format(day, 'EEEE, d MMMM', { locale: bg })}
              </div>
              <div className="space-y-2">
                {daySessions.length === 0 ? (
                  <div className="text-sm text-[#99a1af] text-center py-4">Няма сесии</div>
                ) : (
                  daySessions.map((event) => {
                    const colorStyle = getSessionColor(event);
                    const isBooked = hasBooking(event._id);
                    return (
                      <div
                        key={event._id}
                        onClick={() => setSelectedSession(event)}
                        className={`p-3 rounded-[10px] cursor-pointer text-white relative ${isBooked ? 'ring-2 ring-black ring-offset-1' : ''}`}
                        style={colorStyle}
                      >
                        <div className="font-medium text-sm">
                          {isBooked && '✓ '}
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
                  {format(day, 'EEE d', { locale: bg })}
                </div>
                <div className="space-y-2">
                  {daySessions.map((event) => {
                    const colorStyle = getSessionColor(event);
                    const isBooked = hasBooking(event._id);
                    return (
                      <div
                        key={event._id}
                        onClick={() => setSelectedSession(event)}
                        className={`p-2 rounded-[10px] cursor-pointer text-sm text-white relative ${isBooked ? 'ring-2 ring-black' : ''}`}
                        style={colorStyle}
                      >
                        <div className="font-medium">
                          {isBooked && '✓ '}
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
          {format(currentDate, 'EEEE, MMMM d, yyyy', { locale: bg })}
        </div>
        {daySessions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No sessions scheduled</div>
        ) : (
          <div className="space-y-3">
            {daySessions
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((session) => {
                const isBooked = hasBooking(session._id);
                return (
                  <Card key={session._id} className={isBooked ? 'ring-2 ring-black' : ''}>
                    <div
                      onClick={() => setSelectedSession(session)}
                      className="cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">
                              {isBooked && '✓ '}
                              {session.title}
                            </h3>
                          </div>
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
                          className={`px-2 py-1 text-xs rounded ${session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {session.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                )
              })}
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-950">Календар</h1>
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

      <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px] overflow-hidden">
        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col gap-3 mb-4 px-4 pt-4">
          <h2 className="text-base font-medium text-neutral-950 text-center">
            {view === 'month' && format(currentDate, 'MMMM yyyy', { locale: bg })}
            {view === 'week' && `Седмица от ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d', { locale: bg })}`}
            {view === 'day' && format(currentDate, 'MMMM d, yyyy', { locale: bg })}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px] text-xs px-2 py-1.5 transition-colors"
            >
              ←
            </button>
            <Button
              variant="secondary"
              onClick={goToToday}
              className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px] text-xs px-3 py-1.5"
            >
              Днес
            </Button>
            <button
              onClick={() => navigateDate('next')}
              className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px] text-xs px-2 py-1.5 transition-colors"
            >
              →
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex flex-row justify-between items-center gap-4 mb-4 px-6 pt-6">
          <Button
            variant="secondary"
            onClick={() => navigateDate('prev')}
            className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
          >
            ← Предишен
          </Button>
          <div className="flex flex-row items-center gap-2">
            <h2 className="text-base font-medium text-neutral-950 text-center">
              {view === 'month' && format(currentDate, 'MMMM yyyy', { locale: bg })}
              {view === 'week' && `Седмица от ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d', { locale: bg })}`}
              {view === 'day' && format(currentDate, 'MMMM d, yyyy', { locale: bg })}
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
            className="bg-[#f3f3f5] hover:bg-[#e8e8ea] text-[#35383d] rounded-[10px]"
          >
            Следващ →
          </Button>
        </div>

        {view === 'month' && (
          <>
            {/* Mobile Calendar - Full Width */}
            <div className="md:hidden w-screen relative left-1/2 -ml-[50vw] px-2 pb-4">
              {renderMonthViewMobile()}
            </div>
            {/* Desktop Calendar */}
            <div className="hidden md:block px-6 pb-6">
              {renderMonthView()}
            </div>
          </>
        )}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}

        {/* Legend - inside the same Card container */}
        <div className="mt-0 pt-4 border-t border-[rgba(0,0,0,0.1)]">
          <div className="flex flex-wrap gap-4">
            {getLegendItems().map((item) => {
              const isFilterable = item.isFilterable !== false;
              const isSelected = selectedFilters.has(item.type);
              const isClickable = isFilterable;

              return (
                <div
                  key={item.type}
                  className={`flex items-center gap-2 ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => isClickable && toggleFilter(item.type)}
                  title={isClickable ? (isSelected ? 'Кликнете за премахване от филтъра' : 'Кликнете за добавяне към филтъра') : ''}
                >
                  {item.isReserved ? (
                    <div
                      className={`w-6 h-6 rounded-[6px] border-2 bg-white flex items-center justify-center transition-all ${isFilterable && !isSelected ? 'opacity-40 border-gray-400' : 'border-black'
                        }`}
                    >
                      <span className={`text-xs ${isFilterable && !isSelected ? 'text-gray-400' : 'text-black'}`}>✓</span>
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-[6px] flex items-center justify-center text-xs font-medium transition-all ${isFilterable && !isSelected ? 'opacity-40' : ''
                        }`}
                      style={{ backgroundColor: item.backgroundColor, color: item.color }}
                    >
                      {item.type === 'competition' && '🏆'}
                    </div>
                  )}
                  <span
                    className={`text-sm text-neutral-950 ${isFilterable && !isSelected ? 'opacity-40' : ''
                      }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Session Details Modal */}
      <BaseModal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={selectedSession?.title}
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row gap-2 justify-end w-full">
            <Button
              variant="outline"
              onClick={() => setSelectedSession(null)}
              className="w-full sm:w-auto"
            >
              Затвори
            </Button>
            {selectedSession?.type !== 'competition' && selectedSession?.status === 'active' && (
              <Button
                variant="primary"
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginModal(true);
                  } else {
                    setBookingSession(selectedSession);
                    setSelectedSession(null);
                  }
                }}
                className="w-full sm:w-auto"
              >
                {!isAuthenticated ? 'Влез за да запазиш' : 'Запази час'}
              </Button>
            )}
          </div>
        }
      >
        {selectedSession && (
          <div className="space-y-4 text-sm text-[#4a5565]">
            <p><strong className="text-neutral-950">Дата:</strong> {format(new Date(selectedSession.date), 'PPpp', { locale: bg })}</p>
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
        )}
      </BaseModal>

      {/* Booking Modal */}
      <BookingModal
        isOpen={!!bookingSession}
        onClose={() => setBookingSession(null)}
        sessions={bookingSession ? [bookingSession] : []}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          fetchUserBookings();
        }}
      /></div>
  );
};

export default Calendar;

