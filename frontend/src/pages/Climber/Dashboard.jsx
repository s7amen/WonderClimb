import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { format, startOfDay, addDays, isBefore, addMonths, subMonths, eachDayOfInterval } from 'date-fns';
import { bg } from 'date-fns/locale';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { parentClimbersAPI, bookingsAPI, sessionsAPI } from '../../services/api';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { CalendarIcon as CalendarSvgIcon, ClockIcon, PersonIcon, ListIcon } from '../../components/Sessions/SessionIcons';
import { useSynchronizedWidths } from '../../hooks/useSynchronizedWidths';
import SessionCalendar from '../../components/Calendar/SessionCalendar';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [groupBy, setGroupBy] = useState('date'); // 'date' or 'climber'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingsToCancel, setBookingsToCancel] = useState([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const [dateToCancel, setDateToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const { showToast, ToastComponent } = useToast();

  const hasFetchedRef = useRef(false);
  const userIdRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    
    const currentUserId = user?._id || user?.id;
    if (userIdRef.current !== currentUserId) {
      hasFetchedRef.current = false;
      userIdRef.current = currentUserId;
    }
    
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    let isMounted = true;

    const loadData = async () => {
      try {
        await fetchData();
      } catch (error) {
        if (isMounted) {
          console.error('Error in loadData:', error);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = startOfDay(new Date());
      const endDate = addDays(today, 365); // Load sessions for next year for calendar view
      
      const [sessionsRes, childrenRes, bookingsRes] = await Promise.all([
        sessionsAPI.getAvailable({
          startDate: today.toISOString(),
          endDate: endDate.toISOString(),
        }).catch(() => ({ data: { sessions: [] } })),
        parentClimbersAPI.getAll().catch(() => ({ data: { climbers: [] } })),
        bookingsAPI.getMyBookings().catch(() => ({ data: { bookings: [] } })),
      ]);

      setChildren(childrenRes.data.climbers || []);
      
      // Get all upcoming bookings (for calendar view - all future bookings)
      // For list view, we'll filter to 7 days in the rendering
      const now = startOfDay(new Date());
      const allBookings = bookingsRes.data.bookings || [];
      const upcomingBookings = allBookings.filter(booking => {
        if (booking.status !== 'booked' || !booking.session?.date) return false;
        const sessionDate = startOfDay(new Date(booking.session.date));
        return sessionDate >= now;
      });
      
      // Sort by date
      upcomingBookings.sort((a, b) => 
        new Date(a.session.date) - new Date(b.session.date)
      );
      
      setBookings(upcomingBookings);
    } catch (error) {
      if (error.response?.status === 429) {
        showToast('Твърде много заявки. Моля, изчакайте малко преди да опитате отново.', 'error');
      } else {
        showToast('Грешка при зареждане на данни', 'error');
      }
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (dateGroup) => {
    setDateToCancel(dateGroup.date);
    setBookingsToCancel(dateGroup.bookings);
    setSelectedBookingIds(dateGroup.bookings.map(b => b._id));
    setShowCancelDialog(true);
  };

  const confirmCancelBooking = async () => {
    if (selectedBookingIds.length === 0) return;

    try {
      setIsCancelling(true);
      setCancelError(null); // Clear previous error
      
      // Cancel each booking individually to handle errors separately
      const results = {
        successful: [],
        failed: []
      };

      for (const bookingId of selectedBookingIds) {
        try {
          await bookingsAPI.cancel(bookingId);
          results.successful.push(bookingId);
        } catch (error) {
          results.failed.push({
            bookingId,
            reason: error.response?.data?.error?.message || 'Грешка при отмяна'
          });
        }
      }

      // Update local state for successful cancellations
      if (results.successful.length > 0) {
        await fetchData();
        showToast('Резервациите са отменени успешно', 'success');
      }

      // Handle failed cancellations
      if (results.failed.length > 0) {
        // Show error details in dialog
        const errorDetails = results.failed.map(f => {
          const booking = bookingsToCancel.find(b => b._id === f.bookingId);
          if (booking && booking.climber) {
            const climber = booking.climber;
            const climberName = climber ? `${climber.firstName} ${climber.lastName || ''}`.trim() : 'Катерач';
            return `${climberName}: ${f.reason || 'Грешка'}`;
          }
          return f.reason || 'Грешка';
        }).join('\n');
        
        // Show error in dialog - keep dialog open, no toast
        setCancelError(errorDetails);
        // Don't close dialog, don't show toast - keep dialog open to show error
      } else {
        // All successful, close dialog
        setShowCancelDialog(false);
        setBookingsToCancel([]);
        setSelectedBookingIds([]);
        setDateToCancel(null);
        setCancelError(null);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при отменяне на резервации';
      
      // Show all errors in dialog, no toast - keep dialog open
      setCancelError(errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  const cancelCancelBooking = () => {
    setShowCancelDialog(false);
    setBookingsToCancel([]);
    setSelectedBookingIds([]);
    setDateToCancel(null);
    setCancelError(null);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
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

  const getBulgarianDayName = (date) => {
    const dayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
    return dayNames[date.getDay()];
  };

  const formatTime = (date) => {
    return format(new Date(date), 'HH:mm');
  };

  const getEndTime = (startDate, durationMinutes) => {
    const end = new Date(new Date(startDate).getTime() + durationMinutes * 60000);
    return formatTime(end);
  };

  // Get filtered bookings for list view (next 7 days only)
  const getFilteredBookingsForList = () => {
    const now = startOfDay(new Date());
    const sevenDaysFromNow = addDays(now, 7);
    return bookings.filter(booking => {
      if (!booking.session?.date) return false;
      const sessionDate = startOfDay(new Date(booking.session.date));
      return sessionDate >= now && sessionDate <= sevenDaysFromNow;
    });
  };

  // Get sessions from bookings (for calendar view - shows all future bookings)
  const getSessionsFromBookings = () => {
    const bookedSessions = bookings.filter(b => b.status === 'booked' && b.session);
    
    // Group bookings by session to get unique sessions
    const sessionsMap = new Map();
    bookedSessions.forEach(booking => {
      const sessionId = booking.session?._id || booking.sessionId;
      if (!sessionId) return;

      if (!sessionsMap.has(sessionId)) {
        sessionsMap.set(sessionId, {
          ...booking.session,
          _id: sessionId,
        });
      }
    });

    return Array.from(sessionsMap.values());
  };

  // Group bookings by day and session for list view (like SessionList)
  const groupBookingsByDayAndSession = () => {
    const filteredBookings = getFilteredBookingsForList();
    const now = startOfDay(new Date());
    const sevenDaysFromNow = addDays(now, 7);
    const days = eachDayOfInterval({ start: now, end: sevenDaysFromNow });
    
    const grouped = {};
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = {
        date: day,
        sessions: []
      };
    });

    // Group bookings by session
    const sessionsMap = new Map();
    filteredBookings.forEach(booking => {
      const sessionId = booking.session?._id;
      if (!sessionId) return;
      
      if (!sessionsMap.has(sessionId)) {
        sessionsMap.set(sessionId, {
          session: booking.session,
          bookings: []
        });
      }
      sessionsMap.get(sessionId).bookings.push(booking);
    });

    // Add sessions to their respective days
    sessionsMap.forEach(({ session, bookings }) => {
      const sessionDate = new Date(session.date);
      const dayKey = format(sessionDate, 'yyyy-MM-dd');
      
      if (grouped[dayKey]) {
        grouped[dayKey].sessions.push({
          session,
          bookings
        });
      }
    });

    // Sort sessions within each day by time
    Object.keys(grouped).forEach(dayKey => {
      grouped[dayKey].sessions.sort((a, b) => 
        new Date(a.session.date) - new Date(b.session.date)
      );
    });

    return grouped;
  };

  // Group bookings by climber (for "по катерачи" mode)
  const groupBookingsByClimber = () => {
    const filteredBookings = getFilteredBookingsForList();
    const grouped = {};
    
    filteredBookings.forEach(booking => {
      const climber = booking.climber || booking.climberId;
      if (!climber) return;
      
      const climberId = typeof climber === 'object' && climber._id ? climber._id : climber;
      const climberKey = String(climberId);
      
      if (!grouped[climberKey]) {
        grouped[climberKey] = {
          climber: typeof climber === 'object' ? climber : null,
          sessions: []
        };
      }
      
      // Group by session
      const sessionId = booking.session?._id;
      if (!sessionId) return;
      
      const existingSession = grouped[climberKey].sessions.find(s => s.session._id === sessionId);
      if (existingSession) {
        existingSession.bookings.push(booking);
      } else {
        grouped[climberKey].sessions.push({
          session: booking.session,
          bookings: [booking]
        });
      }
    });
    
    // Sort sessions within each group by date
    return Object.values(grouped).map(group => ({
      ...group,
      sessions: group.sessions.sort((a, b) => 
        new Date(a.session.date) - new Date(b.session.date)
      )
    }));
  };

  const totalBookings = bookings.length;

  // Get reservations for a session
  const getReservationsForSessionInList = (sessionId, sessionBookings) => {
    return sessionBookings.map(booking => {
      const climber = booking.climber || booking.climberId;
      let climberName = 'Неизвестен';
      
      if (climber) {
        if (typeof climber === 'object' && climber.firstName && climber.lastName) {
          climberName = `${climber.firstName} ${climber.lastName}`;
        } else if (typeof climber === 'object' && climber.name) {
          climberName = climber.name;
        }
      }
      
      return {
        climberName,
        bookingId: booking._id || booking.id,
        climberId: typeof climber === 'object' && climber._id ? climber._id : climber,
      };
    });
  };

  const sessions = getSessionsFromBookings();

  // Synchronized widths for card elements
  const allSessionsForWidths = sessions.length > 0 ? sessions : [];
  const { widths, handleMeasurement } = useSynchronizedWidths(allSessionsForWidths);

  // Callback refs for measuring element widths
  const createMeasurementCallback = (type) => (element) => {
    if (element && handleMeasurement) {
      requestAnimationFrame(() => {
        const width = element.offsetWidth;
        if (width > 0) {
          handleMeasurement(type, width);
        }
      });
    }
  };


  // Get session color based on targetGroups (same as MySessions)
  const getSessionColor = (session) => {
    if (session.status !== 'active') {
      return { bg: '#99a1af', border: '#99a1af', backgroundColor: '#99a1af', color: 'white' };
    }
    
    const targetGroups = session.targetGroups || [];
    
    const groupColors = {
      beginner: '#DCFCE7',      // green-100
      experienced: '#FFEDD5',   // orange-100
      advanced: '#FEE2E2',      // red-100
    };
    
    const textColors = {
      beginner: '#15803D',    // green-700
      experienced: '#C2410C', // orange-700
      advanced: '#B91C1C',    // red-700
    };
    
    let primaryGroup = null;
    if (targetGroups.includes('beginner')) {
      primaryGroup = 'beginner';
    } else if (targetGroups.includes('experienced')) {
      primaryGroup = 'experienced';
    } else if (targetGroups.includes('advanced')) {
      primaryGroup = 'advanced';
    }
    
    if (!primaryGroup) {
      const bg = '#FFEDD5';
      const border = '#C2410C';
      return { bg, border, backgroundColor: bg, color: '#C2410C' };
    }
    
    const bg = groupColors[primaryGroup];
    const border = textColors[primaryGroup];
    return { bg, border, backgroundColor: bg, color: textColors[primaryGroup] };
  };

  // Get reservations for a session
  const getReservationsForSession = (sessionId) => {
    if (!bookings || bookings.length === 0) return [];
    
    const normalizedSessionId = typeof sessionId === 'object' && sessionId?.toString 
      ? sessionId.toString() 
      : String(sessionId);
    
    return bookings.filter(b => {
      if (!b || b.status !== 'booked') return false;
      
      const bookingSessionId = b.sessionId 
        ? (typeof b.sessionId === 'object' && b.sessionId._id 
            ? String(b.sessionId._id) 
            : String(b.sessionId))
        : null;
      
      const sessionObjId = b.session 
        ? (b.session._id ? String(b.session._id) : String(b.session))
        : null;
      
      return bookingSessionId === normalizedSessionId || sessionObjId === normalizedSessionId;
    }).map(booking => {
      const climber = booking.climber || booking.climberId;
      let climberName = 'Неизвестен';
      
      if (climber) {
        if (typeof climber === 'object' && climber.firstName && climber.lastName) {
          climberName = `${climber.firstName} ${climber.lastName}`;
        } else if (typeof climber === 'object' && climber.name) {
          climberName = climber.name;
        }
      }
      
      return {
        climberName,
        bookingId: booking._id || booking.id,
        climberId: typeof climber === 'object' && climber._id ? climber._id : climber,
      };
    });
  };


  const navigateDate = (direction) => {
    if (direction === 'prev') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  if (loading) {
    return <Loading text="Зареждане..." />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <ToastComponent />
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={cancelCancelBooking}
        onConfirm={confirmCancelBooking}
        title="Отмяна на резервация"
        message={bookingsToCancel.length === 1 ? 'Сигурни ли сте, че искате да отмените резервацията?' : null}
        confirmText={isCancelling ? 'Отмяна...' : 'Потвърди отмяна'}
        cancelText="Отказ"
        variant="danger"
        errorMessage={cancelError}
        disabled={isCancelling || selectedBookingIds.length === 0}
      >
        {dateToCancel && bookingsToCancel.length > 0 && (() => {
          const firstBooking = bookingsToCancel[0];
          const sessionDate = new Date(firstBooking.session.date);
          const sessionDateObj = startOfDay(sessionDate);

          return (
            <div className="mb-4">
              <h3 className="text-sm sm:text-[16px] font-medium text-neutral-950 mb-2">Тренировка:</h3>
              <div className="p-3 bg-[#f3f3f5] rounded-[10px] border border-[rgba(0,0,0,0.1)]">
                <div className="text-sm sm:text-[16px] font-medium text-neutral-950">{firstBooking.session.title}</div>
                <div className="text-sm text-[#4a5565] mt-1">
                  {`${getBulgarianDayName(sessionDateObj)}, ${format(sessionDateObj, 'dd.MM.yyyy')} - ${formatTime(sessionDate)} - ${getEndTime(sessionDate, firstBooking.session.durationMinutes)}`}
                </div>
              </div>
            </div>
          );
        })()}

        {bookingsToCancel.length > 1 && (
          <div className="mb-4">
            <h3 className="text-sm sm:text-[16px] font-medium text-neutral-950 mb-3">Изберете за кои катерачи да се отмени резервацията:</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {bookingsToCancel.map((booking) => {
                const climber = booking.climber;
                const climberName = climber ? `${climber.firstName} ${climber.lastName || ''}`.trim() : 'Катерач';
                const isSelected = selectedBookingIds.includes(booking._id);
                return (
                  <label
                    key={booking._id}
                    className="flex items-center gap-3 p-3 bg-[#f3f3f5] rounded-[10px] border border-[rgba(0,0,0,0.1)] cursor-pointer hover:bg-[#e8e8ea] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBookingIds([...selectedBookingIds, booking._id]);
                        } else {
                          setSelectedBookingIds(selectedBookingIds.filter(id => id !== booking._id));
                        }
                      }}
                      className="w-4 h-4 text-orange-brand border-gray-300 rounded focus:ring-orange-brand"
                    />
                    <span className="text-sm sm:text-[16px] text-neutral-950">{climberName}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {bookingsToCancel.length === 1 && bookingsToCancel[0]?.climber && (
          <div className="mb-4">
            <h3 className="text-sm sm:text-[16px] font-medium text-neutral-950 mb-2">Катерач:</h3>
            <div className="text-sm sm:text-[16px] text-[#4a5565]">
              {bookingsToCancel[0].climber.firstName} {bookingsToCancel[0].climber.lastName || ''}
            </div>
          </div>
        )}
      </ConfirmDialog>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-950">
              Табло
            </h1>
          </div>

          {/* Запазени часове Section */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              {/* View Toggle: Calendar/List - positioned to the right */}
              <div className="flex justify-end mr-0 sm:mr-2">
                <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-1 flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-[8px] text-sm font-normal flex items-center justify-center gap-2 transition-colors ${
                      viewMode === 'calendar'
                        ? 'bg-[#ea7a24] text-white'
                        : 'text-[#4a5565] hover:bg-gray-50'
                    }`}
                  >
                    <CalendarSvgIcon />
                    Календар
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-[8px] text-sm font-normal flex items-center justify-center gap-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-[#ea7a24] text-white'
                        : 'text-[#4a5565] hover:bg-gray-50'
                    }`}
                  >
                    <ListIcon />
                    Списък
                  </button>
                </div>
              </div>

              {/* Group By Toggle (only in list mode) */}
              {viewMode === 'list' && (
                <>
                  <div className="flex justify-end mr-0 sm:mr-2">
                    <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-1 flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setGroupBy('date')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-[8px] text-sm font-normal flex items-center justify-center gap-2 transition-colors ${
                          groupBy === 'date'
                            ? 'bg-[#ea7a24] text-white'
                            : 'text-[#4a5565] hover:bg-gray-50'
                        }`}
                      >
                        <CalendarSvgIcon />
                        По дата
                      </button>
                      <button
                        onClick={() => setGroupBy('climber')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-[8px] text-sm font-normal flex items-center justify-center gap-2 transition-colors ${
                          groupBy === 'climber'
                            ? 'bg-[#ea7a24] text-white'
                            : 'text-[#4a5565] hover:bg-gray-50'
                        }`}
                      >
                        <PersonIcon />
                        По катерачи
                      </button>
                    </div>
                  </div>
                  {/* Heading text - only visible in list mode, not bold, larger and centered on mobile */}
                  <h2 className="text-base sm:text-xl md:text-2xl font-normal text-neutral-950 text-center sm:text-left">
                    Запазени часове за следващите 7 дни
                  </h2>
                </>
              )}
            </div>

            {/* Reservations List */}
            {viewMode === 'calendar' ? (
              <>
                {/* Calendar View */}
                {sessions.length > 0 ? (
                  <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px] overflow-hidden">
                    {/* Mobile Calendar Header */}
                    <div className="md:hidden">
                      <div className="flex flex-col justify-between items-center gap-2 mb-4 px-4 pt-2">
                        {/* Month title on top row */}
                        <h2 className="text-base font-medium text-neutral-950 text-center w-full">
                          {format(currentDate, 'MMMM yyyy', { locale: bg })}
                        </h2>
                        {/* Buttons next to each other */}
                        <div className="flex items-center gap-2 w-full justify-center">
                          <button
                            onClick={() => navigateDate('prev')}
                            className="bg-white hover:bg-gray-50 !text-black border-[0.5px] border-black rounded-[10px] text-base font-normal px-3 py-1 h-[32px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                          >
                            ←
                          </button>
                          <Button
                            variant="secondary"
                            onClick={goToToday}
                            className="rounded-[10px] text-sm px-3 py-1 h-[32px]"
                          >
                            Днес
                          </Button>
                          <button
                            onClick={() => navigateDate('next')}
                            className="bg-white hover:bg-gray-50 !text-black border-[0.5px] border-black rounded-[10px] text-base font-normal px-3 py-1 h-[32px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                          >
                            →
                          </button>
                        </div>
                      </div>
                      <div className="w-screen relative left-1/2 -ml-[50vw] px-4 pb-4">
                        <SessionCalendar
                          sessions={sessions}
                          currentDate={currentDate}
                          onSessionClick={handleSessionClick}
                          getSessionColor={getSessionColor}
                        />
                      </div>
                    </div>

                    {/* Desktop Calendar Header */}
                    <div className="hidden md:block">
                      <div className="flex flex-col justify-between items-center gap-2 mb-4 px-6 pt-2">
                        {/* Month title on top row */}
                        <h2 className="text-base font-medium text-neutral-950 text-center w-full">
                          {format(currentDate, 'MMMM yyyy', { locale: bg })}
                        </h2>
                        {/* Buttons next to each other */}
                        <div className="flex flex-row items-center gap-2 justify-center w-full">
                          <button
                            onClick={() => navigateDate('prev')}
                            className="bg-white hover:bg-gray-50 !text-black border-[0.5px] border-black rounded-[10px] text-sm font-normal px-3 py-1 h-[32px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                          >
                            Предишен
                          </button>
                          <Button
                            variant="secondary"
                            onClick={goToToday}
                            className="rounded-[10px] text-sm px-3 py-1 h-[32px]"
                          >
                            Днес
                          </Button>
                          <button
                            onClick={() => navigateDate('next')}
                            className="bg-white hover:bg-gray-50 !text-black border-[0.5px] border-black rounded-[10px] text-sm font-normal px-3 py-1 h-[32px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                          >
                            Следващ
                          </button>
                        </div>
                      </div>
                      <div className="px-6 pb-6">
                        <SessionCalendar
                          sessions={sessions}
                          currentDate={currentDate}
                          onSessionClick={handleSessionClick}
                          getSessionColor={getSessionColor}
                        />
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 sm:p-8 text-center">
                    <p className="text-[#4a5565]">Няма запазени часове</p>
                  </div>
                )}
              </>
            ) : getFilteredBookingsForList().length === 0 ? (
              <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 sm:p-8 text-center">
                <p className="text-[#4a5565]">Няма запазени часове</p>
              </div>
            ) : (
              <>
                {/* List View */}
                {viewMode === 'list' && (() => {
                  if (groupBy === 'climber') {
                    // Group by climber
                    const groupedByClimber = groupBookingsByClimber();
                    const sortedClimbers = Object.keys(groupedByClimber).sort((a, b) => {
                      const nameA = groupedByClimber[a].climber ? `${groupedByClimber[a].climber.firstName} ${groupedByClimber[a].climber.lastName}` : '';
                      const nameB = groupedByClimber[b].climber ? `${groupedByClimber[b].climber.firstName} ${groupedByClimber[b].climber.lastName}` : '';
                      return nameA.localeCompare(nameB);
                    });

                    return (
                      <div className="space-y-6">
                        {sortedClimbers.map((climberKey) => {
                          const climberData = groupedByClimber[climberKey];
                          if (!climberData || climberData.sessions.length === 0) return null;

                          const climberName = climberData.climber ? `${climberData.climber.firstName} ${climberData.climber.lastName || ''}`.trim() : 'Неизвестен';

                          return (
                            <div key={climberKey} className="space-y-3">
                              {/* Climber Header */}
                              <div className="flex items-center gap-2 px-2">
                                <div className="w-4 h-4 shrink-0">
                                  <PersonIcon />
                                </div>
                                <h3 className="text-base font-normal text-[#0f172b] leading-6">
                                  {climberName}
                                </h3>
                                <div className="flex-1 h-px bg-[rgba(0,0,0,0.1)] ml-2"></div>
                              </div>

                              {/* Sessions for this climber */}
                              <div className="space-y-3">
                                {climberData.sessions.map(({ session, bookings }) => {
                                  const reservations = getReservationsForSessionInList(session._id, bookings);
                                  const sessionDate = new Date(session.date);
                                  const timeStr = formatTime(session.date);
                                  const endTimeStr = getEndTime(session.date, session.durationMinutes);
                                  const borderColor = getSessionColor(session).border;

                                  return (
                                    <div
                                      key={session._id}
                                      className="rounded-lg overflow-hidden relative transition-all duration-200 hover:shadow-md hover:border-gray-200 group border-l-4 bg-orange-50"
                                      style={{ borderLeftColor: borderColor }}
                                    >
                                      <div className="px-4 py-3">
                                        {/* Desktop Layout */}
                                        <div className="hidden md:flex flex-col gap-2">
                                          {/* Time Row with Title, Target Groups and Cancel Button */}
                                          <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap">
                                            <div className="flex items-center gap-2 transition-colors duration-200 group-hover:text-[#ff6900] flex-1 min-w-0 flex-wrap">
                                              {/* Час и заглавие - могат да wrap-ват на два реда */}
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <div className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                  <ClockIcon />
                                                </div>
                                                <span 
                                                  ref={createMeasurementCallback('time')}
                                                  className="text-sm md:text-base leading-6 text-[#0f172b] font-normal"
                                                  style={widths.time && widths.time > 0 ? { minWidth: `${widths.time}px` } : {}}
                                                >
                                                  {timeStr} - {endTimeStr}
                                                </span>
                                                {/* Разделител между часът и заглавието */}
                                                {session.title && (
                                                  <>
                                                    <span className="text-[#cad5e2] shrink-0">|</span>
                                                    <span 
                                                      ref={createMeasurementCallback('title')}
                                                      className="text-sm md:text-base leading-6 text-[#0f172b] font-normal"
                                                      style={widths.title && widths.title > 0 ? { minWidth: `${widths.title}px` } : {}}
                                                    >
                                                      {session.title}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                              {/* Target Groups - групирани с разделителя, могат да wrap-ват заедно */}
                                              {session.targetGroups && session.targetGroups.length > 0 && (
                                                <div 
                                                  ref={createMeasurementCallback('targetGroups')}
                                                  className="flex items-center gap-2 shrink-0"
                                                  style={widths.targetGroups && widths.targetGroups > 0 ? { minWidth: `${widths.targetGroups}px` } : {}}
                                                >
                                                  <span className="text-[#cad5e2]">|</span>
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    {session.targetGroups.map((group) => {
                                                      const groupLabels = {
                                                        beginner: 'Начинаещи',
                                                        experienced: 'Деца с опит',
                                                        advanced: 'Напреднали',
                                                      };
                                                      const groupColors = {
                                                        beginner: 'bg-green-100 text-green-700',
                                                        experienced: 'bg-blue-100 text-blue-700',
                                                        advanced: 'bg-red-100 text-red-700',
                                                      };
                                                      return (
                                                        <span
                                                          key={group}
                                                          className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${groupColors[group] || 'bg-gray-100 text-gray-700'}`}
                                                        >
                                                          {groupLabels[group] || group}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Cancel Button */}
                                            {reservations.length > 0 && (
                                              <div 
                                                ref={createMeasurementCallback('buttons')}
                                                className="flex flex-row items-center justify-end gap-2 shrink-0 self-center"
                                                style={widths.buttons && widths.buttons > 0 ? { minWidth: `${widths.buttons}px` } : {}}
                                              >
                                                <button
                                                  onClick={() => {
                                                    const singleDateGroup = {
                                                      date: startOfDay(sessionDate),
                                                      bookings: bookings
                                                    };
                                                    handleCancelBooking(singleDateGroup);
                                                  }}
                                                  className="h-9 px-4 py-2 rounded-lg text-xs md:text-sm leading-5 font-normal border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 transition-all duration-200 whitespace-nowrap w-[80px] flex items-center justify-center"
                                                >
                                                  Отмени
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Reservations Info */}
                                        {reservations.length > 0 && (
                                          <div className="mb-2 flex items-center gap-2 flex-wrap">
                                            <div className="flex items-center flex-wrap gap-2">
                                              {reservations.map((reservation, index) => {
                                                const colorClasses = [
                                                  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
                                                  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
                                                  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
                                                  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
                                                  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
                                                  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
                                                  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
                                                  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
                                                ];
                                                const colorIndex = index % colorClasses.length;
                                                const colors = colorClasses[colorIndex];

                                                return (
                                                  <span
                                                    key={reservation.bookingId || index}
                                                    className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 ${colors.bg} ${colors.text} ${colors.border}`}
                                                  >
                                                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                      <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
                                                    </svg>
                                                    {reservation.climberName}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                        {/* Mobile Layout */}
                                        <div className="md:hidden flex gap-4">
                                          {/* Left side - Content */}
                                          <div className="flex-1 min-w-0">
                                            {/* 2. Часът и заглавието - могат да wrap-ват на два реда */}
                                            <div className="mb-2">
                                              <div className="flex items-center gap-2 mb-1 transition-colors duration-200 group-hover:text-[#ff6900] flex-wrap">
                                                <div className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                  <ClockIcon />
                                                </div>
                                                <span className="text-sm leading-6 text-[#0f172b] font-normal">
                                                  {timeStr} - {endTimeStr}
                                                </span>
                                                {/* Заглавието - може да wrap-ва на нов ред */}
                                                {session.title && (
                                                  <>
                                                    <span className="text-[#cad5e2] shrink-0">|</span>
                                                    <span className="text-sm leading-6 text-[#0f172b] font-normal">
                                                      {session.title}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                            </div>

                                            {/* Target Groups и Capacity - на втори ред за mobile, могат да wrap-ват */}
                                            {session.targetGroups && session.targetGroups.length > 0 && (
                                              <div className="mb-2 flex items-center gap-2 flex-wrap">
                                                {/* Target Groups - групирани с разделителя, могат да wrap-ват заедно */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <span className="text-[#cad5e2]">|</span>
                                                  <div className="flex items-center gap-1 flex-wrap">
                                                    {session.targetGroups.map((group) => {
                                                      const groupLabels = {
                                                        beginner: 'Начинаещи',
                                                        experienced: 'Деца с опит',
                                                        advanced: 'Напреднали',
                                                      };
                                                      const groupColors = {
                                                        beginner: 'bg-green-100 text-green-700',
                                                        experienced: 'bg-blue-100 text-blue-700',
                                                        advanced: 'bg-red-100 text-red-700',
                                                      };
                                                      return (
                                                        <span
                                                          key={group}
                                                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shrink-0 ${groupColors[group] || 'bg-gray-100 text-gray-700'}`}
                                                        >
                                                          {groupLabels[group] || group}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                          {/* Reservations */}
                                          {reservations.length > 0 && (
                                            <div className="mb-2 flex items-center flex-wrap gap-2">
                                              <div className="flex items-center flex-wrap gap-2">
                                                {reservations.map((reservation, index) => {
                                                  // Различни цветове за всяко дете (без blue, green, red за да не съвпадат с target groups)
                                                  const colorClasses = [
                                                    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
                                                    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
                                                    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
                                                    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
                                                    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
                                                    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
                                                    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
                                                    { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
                                                  ];
                                                  const colorIndex = index % colorClasses.length;
                                                  const colors = colorClasses[colorIndex];

                                                  return (
                                                    <span
                                                      key={reservation.bookingId || index}
                                                      className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 ${colors.bg} ${colors.text} ${colors.border}`}
                                                    >
                                                      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
                                                      </svg>
                                                      {reservation.climberName}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Right side - Cancel Button */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                          {reservations.length > 0 && (
                                            <button
                                              onClick={() => {
                                                const singleDateGroup = {
                                                  date: startOfDay(sessionDate),
                                                  bookings: bookings
                                                };
                                                handleCancelBooking(singleDateGroup);
                                              }}
                                              className="h-9 px-4 py-2 rounded-lg text-xs leading-5 font-normal border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 transition-all duration-200 whitespace-nowrap w-[80px] flex items-center justify-center"
                                            >
                                              Отмени
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    // Group by date (default)
                    const groupedByDay = groupBookingsByDayAndSession();
                    const sortedDays = Object.keys(groupedByDay).sort();

                    return (
                      <div className="space-y-6">
                        {sortedDays.map((dayKey) => {
                          const dayData = groupedByDay[dayKey];
                          if (!dayData || dayData.sessions.length === 0) return null;

                          const fullDayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
                          const fullDayName = fullDayNames[dayData.date.getDay()];
                          const formattedDate = format(dayData.date, 'dd/MM/yyyy');

                          return (
                            <div key={dayKey} className="space-y-3">
                              {/* Day Header */}
                              <div className="flex items-center gap-2 px-2">
                                <div className="w-4 h-4 shrink-0">
                                  <CalendarSvgIcon />
                                </div>
                                <h3 className="text-base font-normal text-[#0f172b] leading-6">
                                  {fullDayName}, {formattedDate}
                                </h3>
                                <div className="flex-1 h-px bg-[rgba(0,0,0,0.1)] ml-2"></div>
                              </div>

                              {/* Sessions for this day */}
                              <div className="space-y-3">
                                {dayData.sessions.map(({ session, bookings }) => {
                                  const reservations = getReservationsForSessionInList(session._id, bookings);
                                  const sessionDate = new Date(session.date);
                                  const timeStr = formatTime(session.date);
                                  const endTimeStr = getEndTime(session.date, session.durationMinutes);
                                  const borderColor = getSessionColor(session).border;

                                  return (
                                    <div
                                      key={session._id}
                                      className="rounded-lg overflow-hidden relative transition-all duration-200 hover:shadow-md hover:border-gray-200 group border-l-4 bg-orange-50"
                                      style={{ borderLeftColor: borderColor }}
                                    >
                                      <div className="px-4 py-3">
                                        {/* Desktop Layout */}
                                        <div className="hidden md:flex flex-col gap-2">
                                          {/* Time Row with Title, Target Groups and Cancel Button */}
                                          <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap">
                                            <div className="flex items-center gap-2 transition-colors duration-200 group-hover:text-[#ff6900] flex-1 min-w-0 flex-wrap">
                                              {/* Час и заглавие - могат да wrap-ват на два реда */}
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <div className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                  <ClockIcon />
                                                </div>
                                                <span 
                                                  ref={createMeasurementCallback('time')}
                                                  className="text-sm md:text-base leading-6 text-[#0f172b] font-normal"
                                                  style={widths.time && widths.time > 0 ? { minWidth: `${widths.time}px` } : {}}
                                                >
                                                  {timeStr} - {endTimeStr}
                                                </span>
                                                {/* Разделител между часът и заглавието */}
                                                {session.title && (
                                                  <>
                                                    <span className="text-[#cad5e2] shrink-0">|</span>
                                                    <span 
                                                      ref={createMeasurementCallback('title')}
                                                      className="text-sm md:text-base leading-6 text-[#0f172b] font-normal"
                                                      style={widths.title && widths.title > 0 ? { minWidth: `${widths.title}px` } : {}}
                                                    >
                                                      {session.title}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                              {/* Target Groups - групирани с разделителя, могат да wrap-ват заедно */}
                                              {session.targetGroups && session.targetGroups.length > 0 && (
                                                <div 
                                                  ref={createMeasurementCallback('targetGroups')}
                                                  className="flex items-center gap-2 shrink-0"
                                                  style={widths.targetGroups && widths.targetGroups > 0 ? { minWidth: `${widths.targetGroups}px` } : {}}
                                                >
                                                  <span className="text-[#cad5e2]">|</span>
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    {session.targetGroups.map((group) => {
                                                      const groupLabels = {
                                                        beginner: 'Начинаещи',
                                                        experienced: 'Деца с опит',
                                                        advanced: 'Напреднали',
                                                      };
                                                      const groupColors = {
                                                        beginner: 'bg-green-100 text-green-700',
                                                        experienced: 'bg-blue-100 text-blue-700',
                                                        advanced: 'bg-red-100 text-red-700',
                                                      };
                                                      return (
                                                        <span
                                                          key={group}
                                                          className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${groupColors[group] || 'bg-gray-100 text-gray-700'}`}
                                                        >
                                                          {groupLabels[group] || group}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Cancel Button */}
                                            {reservations.length > 0 && (
                                              <div 
                                                ref={createMeasurementCallback('buttons')}
                                                className="flex flex-row items-center justify-end gap-2 shrink-0 self-center"
                                                style={widths.buttons && widths.buttons > 0 ? { minWidth: `${widths.buttons}px` } : {}}
                                              >
                                                <button
                                                  onClick={() => {
                                                    const singleDateGroup = {
                                                      date: startOfDay(sessionDate),
                                                      bookings: bookings
                                                    };
                                                    handleCancelBooking(singleDateGroup);
                                                  }}
                                                  className="h-9 px-4 py-2 rounded-lg text-xs md:text-sm leading-5 font-normal border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 transition-all duration-200 whitespace-nowrap w-[80px] flex items-center justify-center"
                                                >
                                                  Отмени
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* Reservations Info */}
                                          {reservations.length > 0 && (
                                            <div className="mb-2 flex items-center gap-2 flex-wrap">
                                              <div className="flex items-center flex-wrap gap-2">
                                                {reservations.map((reservation, index) => {
                                                  // Различни цветове за всяко дете (без blue, green, red за да не съвпадат с target groups)
                                                  const colorClasses = [
                                                    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
                                                    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
                                                    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
                                                    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
                                                    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
                                                    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
                                                    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
                                                    { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
                                                  ];
                                                  const colorIndex = index % colorClasses.length;
                                                  const colors = colorClasses[colorIndex];

                                                  return (
                                                    <span
                                                      key={reservation.bookingId || index}
                                                      className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 ${colors.bg} ${colors.text} ${colors.border}`}
                                                    >
                                                      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
                                                      </svg>
                                                      {reservation.climberName}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Mobile Layout */}
                                        <div className="md:hidden flex gap-4">
                                          {/* Left side - Content */}
                                          <div className="flex-1 min-w-0">
                                            {/* 2. Часът и заглавието - могат да wrap-ват на два реда */}
                                            <div className="mb-2">
                                              <div className="flex items-center gap-2 mb-1 transition-colors duration-200 group-hover:text-[#ff6900] flex-wrap">
                                                <div className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110">
                                                  <ClockIcon />
                                                </div>
                                                <span className="text-sm leading-6 text-[#0f172b] font-normal">
                                                  {timeStr} - {endTimeStr}
                                                </span>
                                                {/* Заглавието - може да wrap-ва на нов ред */}
                                                {session.title && (
                                                  <>
                                                    <span className="text-[#cad5e2] shrink-0">|</span>
                                                    <span className="text-sm leading-6 text-[#0f172b] font-normal">
                                                      {session.title}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                            </div>

                                            {/* Target Groups и Capacity - на втори ред за mobile, могат да wrap-ват */}
                                            {session.targetGroups && session.targetGroups.length > 0 && (
                                              <div className="mb-2 flex items-center gap-2 flex-wrap">
                                                {/* Target Groups - групирани с разделителя, могат да wrap-ват заедно */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <span className="text-[#cad5e2]">|</span>
                                                  <div className="flex items-center gap-1 flex-wrap">
                                                    {session.targetGroups.map((group) => {
                                                      const groupLabels = {
                                                        beginner: 'Начинаещи',
                                                        experienced: 'Деца с опит',
                                                        advanced: 'Напреднали',
                                                      };
                                                      const groupColors = {
                                                        beginner: 'bg-green-100 text-green-700',
                                                        experienced: 'bg-blue-100 text-blue-700',
                                                        advanced: 'bg-red-100 text-red-700',
                                                      };
                                                      return (
                                                        <span
                                                          key={group}
                                                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shrink-0 ${groupColors[group] || 'bg-gray-100 text-gray-700'}`}
                                                        >
                                                          {groupLabels[group] || group}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {/* Reservations */}
                                            {reservations.length > 0 && (
                                              <div className="mb-2 flex items-center flex-wrap gap-2">
                                                <div className="flex items-center flex-wrap gap-2">
                                                  {reservations.map((reservation, index) => {
                                                    const colorClasses = [
                                                      { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
                                                      { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
                                                      { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
                                                      { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
                                                      { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
                                                      { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
                                                      { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
                                                      { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
                                                    ];
                                                    const colorIndex = index % colorClasses.length;
                                                    const colors = colorClasses[colorIndex];

                                                    return (
                                                      <span
                                                        key={reservation.bookingId || index}
                                                        className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 ${colors.bg} ${colors.text} ${colors.border}`}
                                                      >
                                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                          <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
                                                        </svg>
                                                        {reservation.climberName}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {/* Right side - Cancel Button */}
                                          <div className="flex flex-col items-end gap-2 shrink-0">
                                            {reservations.length > 0 && (
                                              <button
                                                onClick={() => {
                                                  const singleDateGroup = {
                                                    date: startOfDay(sessionDate),
                                                    bookings: bookings
                                                  };
                                                  handleCancelBooking(singleDateGroup);
                                                }}
                                                className="h-9 px-4 py-2 rounded-lg text-xs leading-5 font-normal border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 transition-all duration-200 whitespace-nowrap w-[80px] flex items-center justify-center"
                                              >
                                                Отмени
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                })()}
              </>
            )}
          </div>

          {/* All Reserved Hours Button */}
          <div className="flex justify-center">
            <Link
              to="/parent/saved-sessions"
              className="inline-flex items-center gap-2 bg-[#ea7a24] text-white text-sm font-normal py-2 px-4 rounded-[10px] hover:bg-[#d96a1a] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 2H5V4H3V2ZM7 2H9V4H7V2ZM11 2H13V4H11V2ZM3 6H5V8H3V6ZM7 6H9V8H7V6ZM11 6H13V8H11V6ZM3 10H5V12H3V10ZM7 10H9V12H7V10ZM11 10H13V12H11V10Z" fill="currentColor"/>
              </svg>
              Всички запазени часове
            </Link>
          </div>

          {/* Активни абонаменти Section */}
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-950">
              Активни абонаменти
            </h2>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-6 sm:p-8 text-center">
              <p className="text-[#4a5565]">В процес на разработка</p>
            </div>
          </div>
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

          {/* My Children */}
          <div className="bg-[#f3f3f5] rounded-[10px] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-950" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
              </svg>
              <p className="text-sm font-normal text-neutral-950">Моите деца</p>
            </div>
            <div className="space-y-2">
              {children.length === 0 ? (
                <p className="text-sm text-[#4a5565]">Няма добавени деца</p>
              ) : (
                children.map((child) => {
                  const age = calculateAge(child.dateOfBirth);
                  return (
                    <div key={child._id} className="flex items-center gap-2">
                      <div className="bg-[#adb933] rounded-full w-1.5 h-1.5"></div>
                      <p className="text-sm text-[#4a5565]">
                        {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}
                        {age !== null && ` (${age} г.)`}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Total Reservations */}
          <div className="bg-[#f3f3f5] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-neutral-950" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM7.5 4V8.25L11 10L10.25 11.25L6.5 9V4H7.5Z" fill="currentColor"/>
              </svg>
              <p className="text-sm font-normal text-neutral-950">Общо резервации</p>
            </div>
            <p className="text-base font-normal text-neutral-950">
              {totalBookings} {totalBookings === 1 ? 'тренировка' : 'тренировки'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/sessions')}
              className="w-full bg-[#adb933] text-white text-base font-normal py-3 px-4 rounded-[10px] hover:bg-[#9db02a] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2V6M14 2V6M3 10H17M5 4H15C16.1046 4 17 4.89543 17 6V18C17 19.1046 16.1046 20 15 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Запази час
            </button>
            <button
              onClick={() => navigate('/parent/profile')}
              className="w-full bg-[#ea7a24] text-white text-base font-normal py-3 px-4 rounded-[10px] hover:bg-[#d96a1a] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Добави дете
            </button>
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      {showSessionModal && selectedSession && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSessionModal(false);
              setSelectedSession(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#0f172b]">Детайли за тренировка</h2>
                <button
                  onClick={() => {
                    setShowSessionModal(false);
                    setSelectedSession(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Session Info */}
              <div className="mb-6 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#0f172b] mb-2">{selectedSession.title || 'Тренировка'}</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  {selectedSession.targetGroups && selectedSession.targetGroups.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedSession.targetGroups.map((group) => {
                        const groupLabels = {
                          beginner: 'Начинаещи',
                          experienced: 'Деца с опит',
                          advanced: 'Напреднали',
                        };
                        const groupColors = {
                          beginner: 'bg-green-100 text-green-700',
                          experienced: 'bg-blue-100 text-blue-700',
                          advanced: 'bg-red-100 text-red-700',
                        };
                        return (
                          <span
                            key={group}
                            className={`px-2 py-1 rounded-md text-xs font-medium ${groupColors[group] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {groupLabels[group] || group}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#64748b]">Дата и час:</span>
                    <span className="text-[#0f172b]">
                      {format(new Date(selectedSession.date), 'EEEE, d MMMM yyyy', { locale: bg })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#64748b]">Час:</span>
                    <span className="text-[#0f172b]">
                      {formatTime(selectedSession.date)} - {getEndTime(selectedSession.date, selectedSession.durationMinutes)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#64748b]">Продължителност:</span>
                    <span className="text-[#0f172b]">{selectedSession.durationMinutes} минути</span>
                  </div>

                  {selectedSession.description && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-[#64748b] shrink-0">Описание:</span>
                      <span className="text-[#0f172b]">{selectedSession.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reservations Info */}
              {(() => {
                const reservations = getReservationsForSession(selectedSession._id);
                return (
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="font-semibold text-[#0f172b] mb-3">
                      Резервирани деца ({reservations.length})
                    </h4>
                    {reservations.length > 0 ? (
                      <div className="space-y-2">
                        {reservations.map((reservation) => (
                          <div
                            key={reservation.bookingId}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-[#0f172b]">
                                {reservation.climberName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#64748b] text-center py-4">
                        Няма резервации за тази тренировка
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              {(() => {
                const reservations = getReservationsForSession(selectedSession._id);
                const hasReservations = reservations.length > 0;
                
                // Get bookings for this session
                const sessionBookings = bookings.filter(b => {
                  if (!b || b.status !== 'booked' || !b.session) return false;
                  const bookingSessionId = b.session._id || b.sessionId;
                  const sessionId = selectedSession._id;
                  return String(bookingSessionId) === String(sessionId);
                });
                
                return (
                  <>
                    {hasReservations && sessionBookings.length > 0 && (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => {
                          setShowSessionModal(false);
                          setSelectedSession(null);
                          // Trigger cancel booking flow
                          const sessionDate = new Date(selectedSession.date);
                          const dateGroup = {
                            date: startOfDay(sessionDate),
                            bookings: sessionBookings
                          };
                          handleCancelBooking(dateGroup);
                        }}
                        className="flex-1"
                      >
                        Отмени
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => {
                        setShowSessionModal(false);
                        setSelectedSession(null);
                      }}
                      className={hasReservations && sessionBookings.length > 0 ? "flex-1" : "w-full"}
                    >
                      Затвори
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
