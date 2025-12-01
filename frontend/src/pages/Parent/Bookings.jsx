import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionsAPI, bookingsAPI, parentClimbersAPI } from '../../services/api';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

const Bookings = () => {
  const [availableSessions, setAvailableSessions] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { showToast, ToastComponent } = useToast();
  const [isFetching, setIsFetching] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  const [bookingData, setBookingData] = useState({
    climberId: '',
    sessionId: '',
  });

  const [recurringData, setRecurringData] = useState({
    climberId: '',
    daysOfWeek: [],
    startDate: '',
    endDate: '',
    time: '',
    durationMinutes: 60,
  });

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();
    
    const loadData = async () => {
      if (isFetching) return; // Prevent duplicate requests
      setIsFetching(true);
      try {
        await fetchData();
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error in loadData:', error);
        }
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, bookingsRes, childrenRes] = await Promise.all([
        sessionsAPI.getAvailable({
          startDate: new Date().toISOString(),
          endDate: addDays(new Date(), 30).toISOString(),
        }),
        bookingsAPI.getMyBookings(),
        parentClimbersAPI.getAll(),
      ]);

      setAvailableSessions(sessionsRes.data.sessions || []);
      setMyBookings(bookingsRes.data.bookings || []);
      // Filter by accountStatus - show active children or children without accountStatus (treat as active)
      const allClimbers = childrenRes.data.climbers || [];
      const activeClimbers = allClimbers.filter(c => 
        c.accountStatus === 'active' || c.accountStatus === null || c.accountStatus === undefined
      );
      if (allClimbers.length > 0 && activeClimbers.length === 0) {
        console.warn('All children have inactive accountStatus:', allClimbers);
        // Show warning to user if all children are inactive
        showToast('Всички деца са неактивни. Моля, активирайте ги от профила.', 'warning');
      }
      if (allClimbers.length > activeClimbers.length) {
        console.info(`Filtered out ${allClimbers.length - activeClimbers.length} inactive children`);
      }
      setChildren(activeClimbers);
    } catch (error) {
      if (error.response?.status === 429) {
        showToast('Твърде много заявки. Моля, изчакайте малко преди да опитате отново.', 'error');
      } else {
        showToast(error.response?.data?.error?.message || 'Грешка при зареждане на данни', 'error');
      }
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async (e) => {
    e.preventDefault();
    try {
      setBookingError(null); // Clear previous error
      const sessionIdToUse = selectedSession || bookingData.sessionId;
      if (!sessionIdToUse) {
        showToast('Моля, изберете сесия', 'error');
        return;
      }
      if (!bookingData.climberId) {
        showToast('Моля, изберете дете', 'error');
        return;
      }
      
      const response = await bookingsAPI.create({
        sessionId: sessionIdToUse,
        climberIds: [bookingData.climberId], // Use climberIds array for consistency
      });
      
      // Handle response with summary (multiple bookings)
      if (response.data?.summary) {
        const { successful, failed } = response.data.summary;
        
        if (successful && successful.length > 0) {
          // Optimistically update bookings list
          await fetchData(); // Refresh to get latest data
          showToast('Резервацията е успешна', 'success');
          setShowBookingForm(false);
          setSelectedSession(null);
          setBookingData({ climberId: '', sessionId: '' });
        }
        
        if (failed && failed.length > 0) {
          // Show errors in form
          const errorDetails = failed.map(item => {
            const climber = children.find(c => c._id === item.climberId);
            const climberName = climber ? `${climber.firstName} ${climber.lastName || ''}`.trim() : 'Катерач';
            return `${climberName}: ${item.reason || 'Грешка'}`;
          }).join('\n');
          setBookingError(errorDetails);
          // Don't close form if there are errors
        }
      } else if (response.data?.booking) {
        // Fallback for single booking response
        await fetchData(); // Refresh to get latest data
        showToast('Резервацията е успешна', 'success');
        setShowBookingForm(false);
        setSelectedSession(null);
        setBookingData({ climberId: '', sessionId: '' });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при резервиране на сесия';
      
      // Check if it's the "already registered" error
      if (errorMessage.includes('Вече е регистриран') || errorMessage.includes('регистриран за тази тренировка')) {
        setBookingError(errorMessage);
      } else {
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleBookRecurring = async (e) => {
    e.preventDefault();
    try {
      const response = await bookingsAPI.createRecurring({
        climberId: recurringData.climberId,
        daysOfWeek: recurringData.daysOfWeek,
        startDate: new Date(recurringData.startDate).toISOString(),
        endDate: new Date(recurringData.endDate).toISOString(),
        time: recurringData.time,
        durationMinutes: parseInt(recurringData.durationMinutes),
      });
      
      // Optimistically update bookings list instead of full reload
      if (response.data?.bookings && Array.isArray(response.data.bookings)) {
        setMyBookings(prev => [...prev, ...response.data.bookings]);
      } else if (response.data?.booking) {
        setMyBookings(prev => [...prev, response.data.booking]);
      }
      
      // Optimistically update session booked counts
      if (response.data?.bookings && Array.isArray(response.data.bookings)) {
        const sessionUpdates = {};
        response.data.bookings.forEach(booking => {
          const sessionId = booking.sessionId || booking.session?._id;
          if (sessionId) {
            if (!sessionUpdates[sessionId]) {
              sessionUpdates[sessionId] = 0;
            }
            sessionUpdates[sessionId]++;
          }
        });
        
        setAvailableSessions(prev => prev.map(session => {
          const sessionId = typeof session._id === 'object' && session._id?.toString 
            ? session._id.toString() 
            : String(session._id);
          if (sessionUpdates[sessionId]) {
            return {
              ...session,
              bookedCount: (session.bookedCount || 0) + sessionUpdates[sessionId]
            };
          }
          return session;
        }));
      }
      
      setShowRecurringForm(false);
      setRecurringData({
        climberId: '',
        daysOfWeek: [],
        startDate: '',
        endDate: '',
        time: '',
        durationMinutes: 60,
      });
      showToast('Повтарящите се резервации са създадени успешно', 'success');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при създаване на повтарящи се резервации', 'error');
    }
  };

  const handleCancelBooking = (bookingId) => {
    setCancelBookingId(bookingId);
    setShowCancelDialog(true);
  };

  const confirmCancelBooking = async () => {
    if (!cancelBookingId) return;

    try {
      // Find the booking to get session ID before cancelling
      const bookingToCancel = myBookings.find(b => b._id === cancelBookingId);
      const sessionId = bookingToCancel?.sessionId || bookingToCancel?.session?._id;
      
      await bookingsAPI.cancel(cancelBookingId);
      
      // Update local state instead of full page reload
      setMyBookings(prev => prev.map(booking => 
        booking._id === cancelBookingId 
          ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
          : booking
      ));
      
      // Optimistically update session booked count
      if (sessionId) {
        setAvailableSessions(prev => prev.map(session => {
          const sId = typeof session._id === 'object' && session._id?.toString 
            ? session._id.toString() 
            : String(session._id);
          const bSessionId = typeof sessionId === 'object' && sessionId?.toString 
            ? sessionId.toString() 
            : String(sessionId);
          if (sId === bSessionId) {
            return {
              ...session,
              bookedCount: Math.max(0, (session.bookedCount || 0) - 1)
            };
          }
          return session;
        }));
      }
      
      setShowCancelDialog(false);
      setCancelBookingId(null);
      showToast('Резервацията е отменена успешно', 'success');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при отменяне на резервация', 'error');
      setShowCancelDialog(false);
      setCancelBookingId(null);
    }
  };

  const cancelCancelBooking = () => {
    setShowCancelDialog(false);
    setCancelBookingId(null);
  };

  const toggleDayOfWeek = (day) => {
    setRecurringData({
      ...recurringData,
      daysOfWeek: recurringData.daysOfWeek.includes(day)
        ? recurringData.daysOfWeek.filter(d => d !== day)
        : [...recurringData.daysOfWeek, day],
    });
  };

  const getBookedCount = (sessionId) => {
    // Use bookedCount from session data if available, otherwise fallback to counting myBookings
    const session = availableSessions.find(s => s._id === sessionId);
    if (session?.bookedCount !== undefined) {
      return session.bookedCount;
    }
    // Fallback: count from myBookings (for backward compatibility)
    return myBookings.filter(b => b.session?._id === sessionId && b.status === 'booked').length;
  };

  // Group sessions by day
  const groupSessionsByDay = () => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
    
    const grouped = {};
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = {
        date: day,
        sessions: []
      };
    });

    availableSessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const dayKey = format(sessionDate, 'yyyy-MM-dd');
      
      if (grouped[dayKey]) {
        grouped[dayKey].sessions.push(session);
      }
    });

    // Sort sessions within each day by time
    Object.keys(grouped).forEach(dayKey => {
      grouped[dayKey].sessions.sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
    });

    return grouped;
  };

  const handleQuickBook = (sessionId) => {
    setSelectedSession(sessionId);
    setBookingData(prev => ({ ...prev, sessionId }));
    setShowBookingForm(true);
  };

  const navigateWeek = (direction) => {
    if (direction === 'prev') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    } else {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
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
    return format(end, 'HH:mm');
  };

  if (loading) {
    return <Loading text="Зареждане на резервации..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-neutral-950">Резервации</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="primary" onClick={() => setShowBookingForm(!showBookingForm)} className="w-full sm:w-auto">
            Резервирай сесия
          </Button>
          <Button variant="secondary" onClick={() => setShowRecurringForm(!showRecurringForm)} className="w-full sm:w-auto">
            Повтаряща се резервация
          </Button>
        </div>
      </div>

      <ToastComponent />
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={cancelCancelBooking}
        onConfirm={confirmCancelBooking}
        title="Отмяна на резервация"
        message="Сигурни ли сте, че искате да отмените тази резервация?"
        confirmText="Отмени"
        cancelText="Отказ"
        variant="danger"
      />

      {showBookingForm && (
        <Card title="Резервирай сесия">
          <form onSubmit={handleBookSession}>
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Избери дете
                </label>
                <Link
                  to="/parent/profile"
                  className="text-sm text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добави дете
                </Link>
              </div>
              {children.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">
                    Няма добавени деца. Моля, добавете дете преди да направите резервация.
                  </p>
                  <Link to="/parent/profile">
                    <Button variant="primary" className="w-full sm:w-auto flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Добави дете
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  value={bookingData.climberId}
                  onChange={(e) => setBookingData({ ...bookingData, climberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Избери дете...</option>
                  {children.map((child) => (
                    <option key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedSession ? (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-gray-700 font-medium">
                  Избрана сесия: {availableSessions.find(s => s._id === selectedSession)?.title}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {format(new Date(availableSessions.find(s => s._id === selectedSession)?.date || new Date()), 'PPpp')}
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Избери сесия
                </label>
                <select
                  value={bookingData.sessionId}
                  onChange={(e) => {
                    setBookingData({ ...bookingData, sessionId: e.target.value });
                    setSelectedSession(e.target.value || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Избери сесия...</option>
                  {availableSessions.map((session) => {
                    const bookedCount = getBookedCount(session._id);
                    const isFull = bookedCount >= session.capacity;
                    return (
                      <option key={session._id} value={session._id} disabled={isFull}>
                        {format(new Date(session.date), 'PPpp')} - {session.title}
                        {isFull ? ' (ПЪЛНА)' : ` (${session.capacity - bookedCount} свободни места)`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Error message */}
            {bookingError && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-[10px]">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium text-red-900 whitespace-pre-line break-words">
                      {bookingError}
                    </p>
                  </div>
                  <button
                    onClick={() => setBookingError(null)}
                    className="text-red-600 hover:text-red-800 transition-colors shrink-0"
                    aria-label="Затвори"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" variant="primary" className="w-full sm:w-auto">
                Резервирай сесия
              </Button>
              <Button type="button" variant="secondary" onClick={() => {
                setShowBookingForm(false);
                setSelectedSession(null);
                setBookingData({ climberId: '', sessionId: '' });
                setBookingError(null);
              }} className="w-full sm:w-auto">
                Отказ
              </Button>
            </div>
          </form>
        </Card>
      )}

      {showRecurringForm && (
        <Card title="Създай повтарящи се резервации">
          <form onSubmit={handleBookRecurring}>
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Избери дете
                </label>
                <Link
                  to="/parent/profile"
                  className="text-sm text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добави дете
                </Link>
              </div>
              {children.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">
                    Няма добавени деца. Моля, добавете дете преди да направите резервация.
                  </p>
                  <Link to="/parent/profile">
                    <Button variant="primary" className="w-full sm:w-auto flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Добави дете
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  value={recurringData.climberId}
                  onChange={(e) => setRecurringData({ ...recurringData, climberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Избери дете...</option>
                  {children.map((child) => (
                    <option key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дни от седмицата
              </label>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const dayNames = ['Нед', 'Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб'];
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDayOfWeek(day)}
                      className={`px-3 py-1 rounded ${
                        recurringData.daysOfWeek.includes(day)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {dayNames[day]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Начална дата"
                type="date"
                value={recurringData.startDate}
                onChange={(e) => setRecurringData({ ...recurringData, startDate: e.target.value })}
                required
              />
              <Input
                label="Крайна дата"
                type="date"
                value={recurringData.endDate}
                onChange={(e) => setRecurringData({ ...recurringData, endDate: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Час"
                type="time"
                value={recurringData.time}
                onChange={(e) => setRecurringData({ ...recurringData, time: e.target.value })}
                required
              />
              <Input
                label="Продължителност (минути)"
                type="number"
                value={recurringData.durationMinutes}
                onChange={(e) => setRecurringData({ ...recurringData, durationMinutes: e.target.value })}
                required
                min={1}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" variant="primary" className="w-full sm:w-auto">
                Създай повтарящи се резервации
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowRecurringForm(false)} className="w-full sm:w-auto">
                Отказ
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Weekly Schedule View */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
          <h2 className="text-2xl font-bold">График на тренировки</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <Button variant="secondary" onClick={() => navigateWeek('prev')} className="text-sm">
              ← Предишна
            </Button>
            <Button variant="secondary" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="text-sm">
              Тази седмица
            </Button>
            <Button variant="secondary" onClick={() => navigateWeek('next')} className="text-sm">
              Следваща →
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {(() => {
            const groupedSessions = groupSessionsByDay();
            const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
            
            return days.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayData = groupedSessions[dayKey];
              const dayName = getBulgarianDayName(day);
              const dayDate = format(day, 'dd/MM/yyyy');
              
              return (
                <div key={dayKey} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Day Header */}
                  <div className="bg-blue-600 text-white px-4 py-3">
                    <h3 className="text-lg font-semibold">
                      {dayName} | {dayDate}
                    </h3>
                  </div>

                  {/* Sessions List */}
                  <div>
                    {dayData && dayData.sessions.length > 0 ? (
                      dayData.sessions.map((session, index) => {
                        const bookedCount = getBookedCount(session._id);
                        const availableSpots = session.capacity - bookedCount;
                        const isFull = bookedCount >= session.capacity;
                        const isEvenRow = index % 2 === 0;
                        
                        return (
                          <div
                            key={session._id}
                            className={`px-4 py-3 ${
                              isEvenRow ? 'bg-white' : 'bg-orange-50'
                            } border-b border-gray-100 last:border-b-0`}
                          >
                            {/* Mobile Layout */}
                            <div className="md:hidden space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="font-medium text-gray-900">
                                  {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                                </div>
                                <div className="text-gray-600 text-sm">
                                  {isFull ? '0 места' : `${availableSpots} места`}
                                </div>
                              </div>
                              <div className="text-gray-800 font-medium">
                                {session.title}
                              </div>
                              <div>
                                {isFull ? (
                                  <button
                                    onClick={() => showToast('Сесията е пълна. Моля, използвайте листата на чакащи.', 'info')}
                                    className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium text-sm"
                                  >
                                    <span>Листа на чакащи</span>
                                    <span className="text-lg">+</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleQuickBook(session._id)}
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                                  >
                                    <span>Запази място</span>
                                    <span className="text-lg">+</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Desktop Layout */}
                            <div className="hidden md:grid md:grid-cols-4 gap-4 items-center">
                              {/* Time */}
                              <div className="font-medium text-gray-900">
                                {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                              </div>
                              
                              {/* Activity Name */}
                              <div className="text-gray-800">
                                {session.title}
                              </div>
                              
                              {/* Available Spots */}
                              <div className="text-gray-600">
                                {isFull ? '0 места' : `${availableSpots} места`}
                              </div>
                              
                              {/* Action Button */}
                              <div>
                                {isFull ? (
                                  <button
                                    onClick={() => showToast('Сесията е пълна. Моля, използвайте листата на чакащи.', 'info')}
                                    className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium text-sm"
                                  >
                                    <span>Листа на чакащи</span>
                                    <span className="text-lg">+</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleQuickBook(session._id)}
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                                  >
                                    <span>Запази място</span>
                                    <span className="text-lg">+</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500 bg-gray-50">
                        Няма налични тренировки за този ден
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* My Bookings Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Моите резервации</h2>
        <div className="space-y-4">
          {myBookings.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-center py-8">Все още няма резервации</p>
            </Card>
          ) : (
            myBookings
              .filter(b => b.status === 'booked')
              .sort((a, b) => new Date(a.session.date) - new Date(b.session.date))
              .map((booking) => {
                const sessionDate = new Date(booking.session.date);
                const climber = booking.climber;
                
                return (
                  <Card key={booking._id}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{booking.session.title}</h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p>📅 {format(sessionDate, 'PPpp')}</p>
                          <p>👤 Катерач: {climber?.firstName} {climber?.lastName}</p>
                          <p>⏱️ Продължителност: {booking.session.durationMinutes} минути</p>
                        </div>
                        <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {booking.status === 'booked' ? 'Резервирана' : booking.status}
                        </span>
                      </div>
                      <Button
                        variant="danger"
                        onClick={() => handleCancelBooking(booking._id)}
                        className="w-full sm:w-auto"
                      >
                        Отмени
                      </Button>
                    </div>
                  </Card>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};

export default Bookings;

