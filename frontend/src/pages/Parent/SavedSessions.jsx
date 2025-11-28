import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import { format, addDays, eachDayOfInterval, startOfDay, isBefore } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

const SavedSessions = () => {
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [bulkCancelError, setBulkCancelError] = useState(null);
  const [daysToShow, setDaysToShow] = useState(30);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getMyBookings();
      setMyBookings(response.data.bookings || []);
    } catch (error) {
      showToast('Грешка при зареждане на резервации', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [cancelSingleBookingId, setCancelSingleBookingId] = useState(null);
  const [showCancelSingleDialog, setShowCancelSingleDialog] = useState(false);
  const [cancelSingleError, setCancelSingleError] = useState(null);

  const handleCancelBooking = (bookingId) => {
    setCancelSingleBookingId(bookingId);
    setCancelSingleError(null); // Clear any previous error
    setShowCancelSingleDialog(true);
  };

  const confirmCancelSingleBooking = async () => {
    if (!cancelSingleBookingId) return;

    try {
      setCancelSingleError(null); // Clear previous error
      await bookingsAPI.cancel(cancelSingleBookingId);
      // Update local state instead of full page reload
      setMyBookings(prev => prev.map(booking => 
        booking._id === cancelSingleBookingId 
          ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
          : booking
      ));
      // Remove from selection if it was selected
      setSelectedBookingIds(prev => prev.filter(id => id !== cancelSingleBookingId));
      setShowCancelSingleDialog(false);
      setCancelSingleBookingId(null);
      setCancelSingleError(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при отменяне на резервация';
      const statusCode = error.response?.status;
      
      // If it's a 400 error (cancellation period expired), show in dialog
      if (statusCode === 400) {
        setCancelSingleError(errorMessage);
      } else {
        showToast(errorMessage, 'error');
        setShowCancelSingleDialog(false);
        setCancelSingleBookingId(null);
      }
    }
  };

  const cancelCancelSingleBooking = () => {
    setShowCancelSingleDialog(false);
    setCancelSingleBookingId(null);
    setCancelSingleError(null);
  };

  const handleBulkCancel = () => {
    if (selectedBookingIds.length === 0) {
      showToast('Моля, изберете поне една резервация за отмяна', 'error');
      return;
    }
    setBulkCancelError(null); // Clear any previous error
    setShowCancelModal(true);
  };

  const confirmBulkCancel = async () => {
    if (selectedBookingIds.length === 0) {
      showToast('Моля, изберете поне една резервация за отмяна', 'error');
      return;
    }

    setIsCancelling(true);
    try {
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

      // Update local state for successful cancellations instead of full page reload
      if (results.successful.length > 0) {
        setMyBookings(prev => prev.map(booking => 
          results.successful.includes(booking._id)
            ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
            : booking
        ));
        
        const cancelledCount = results.successful.length;
        showToast(
          `Успешно отменени ${cancelledCount} резервации`,
          'success'
        );
      }

      if (results.failed.length > 0) {
        // Check if ALL failures are due to cancellation period (400 status)
        // We check the error reason - if it's from cancellation period expired, it will be a 400 error
        // Since we're catching errors in the loop, we need to check the reason text
        // The backend now returns configurable messages, so we check if all errors are cancellation-related
        const cancellationErrors = results.failed.filter(f => f.reason);
        
        // If all failed errors are cancellation errors (they all have the same message pattern from backend)
        // Show them in dialog instead of toast
        if (cancellationErrors.length === results.failed.length && cancellationErrors.length > 0) {
          // Show error in dialog - use the actual error message from backend
          const errorDetails = cancellationErrors.map(f => {
            const booking = myBookings.find(b => b._id === f.bookingId);
            if (booking && booking.climber) {
              const climber = booking.climber;
              const climberName = climber ? `${climber.firstName} ${climber.lastName || ''}`.trim() : 'Катерач';
              return `${climberName}: ${f.reason}`;
            }
            return f.reason;
          }).join('\n');
          setBulkCancelError(errorDetails);
          // Don't show toast, don't close modal - keep it open to show the error
        } else {
          // Mixed errors or other errors - show toast and close modal
          const errorDetails = results.failed.map(f => {
            const booking = myBookings.find(b => b._id === f.bookingId);
            if (booking && booking.climber) {
              const climber = booking.climber;
              const climberName = climber ? `${climber.firstName} ${climber.lastName || ''}`.trim() : 'Катерач';
              return `${climberName}: ${f.reason || 'Грешка'}`;
            }
            return f.reason || 'Грешка';
          }).join(', ');
          showToast(
            `Неуспешна отмяна: ${errorDetails}`,
            'error'
          );
          setShowCancelModal(false);
          setSelectedBookingIds([]);
        }
      } else {
        // All successful, close modal
        setShowCancelModal(false);
        setSelectedBookingIds([]);
        setBulkCancelError(null);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при отмяна на резервации';
      const statusCode = error.response?.status;
      
      // If it's a 400 error (cancellation period expired), show in dialog
      if (statusCode === 400) {
        setBulkCancelError(errorMessage);
      } else {
        showToast(errorMessage, 'error');
        setShowCancelModal(false);
        setSelectedBookingIds([]);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const toggleBookingSelection = (bookingId) => {
    setSelectedBookingIds(prev => 
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const selectAllBookings = () => {
    const upcomingBookings = getUpcomingBookings();
    const allBookingIds = upcomingBookings.map(b => b._id);
    setSelectedBookingIds(allBookingIds);
  };

  const clearAllSelectedBookings = () => {
    setSelectedBookingIds([]);
  };

  const getUpcomingBookings = () => {
    const bookedSessions = myBookings.filter(b => b.status === 'booked' && b.session);
    return bookedSessions.filter(b => b.session?.date && new Date(b.session.date) >= startOfDay(new Date()));
  };

  // Group bookings by session (multiple climbers can be booked for same session)
  const groupBookingsBySession = (bookings) => {
    const grouped = {};
    bookings.forEach(booking => {
      const sessionId = booking.session?._id;
      if (!sessionId) return;
      
      if (!grouped[sessionId]) {
        grouped[sessionId] = {
          session: booking.session,
          bookings: []
        };
      }
      grouped[sessionId].bookings.push(booking);
    });
    return grouped;
  };

  // Group sessions by day
  const groupSessionsByDay = () => {
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);
    const days = eachDayOfInterval({ start: today, end: viewEndDate });
    
    const upcomingBookings = getUpcomingBookings();
    const sessionsGrouped = groupBookingsBySession(upcomingBookings);
    
    const grouped = {};
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = {
        date: day,
        sessions: []
      };
    });

    Object.values(sessionsGrouped).forEach(({ session, bookings }) => {
      const sessionDate = new Date(session.date);
      const dayKey = format(sessionDate, 'yyyy-MM-dd');
      
      if (grouped[dayKey] && !isBefore(sessionDate, today)) {
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
    return <Loading text="Зареждане на моят график..." />;
  }

  const upcomingBookings = getUpcomingBookings();
  const groupedSessions = groupSessionsByDay();
  const today = startOfDay(new Date());
  const viewEndDate = addDays(today, daysToShow);
  const days = eachDayOfInterval({ start: today, end: viewEndDate });

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-neutral-950">Моят график</h1>
      </div>

      <ToastComponent />
      <ConfirmDialog
        isOpen={showCancelSingleDialog}
        onClose={cancelCancelSingleBooking}
        onConfirm={confirmCancelSingleBooking}
        title="Отмяна на резервация"
        message="Сигурни ли сте, че искате да отмените тази резервация?"
        confirmText="Отмени"
        cancelText="Отказ"
        variant="danger"
      >
        {/* Error message - prominently displayed */}
        {cancelSingleError && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-[10px]">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm sm:text-base font-medium text-red-700 text-center">
                {cancelSingleError}
              </p>
            </div>
          </div>
        )}
      </ConfirmDialog>

      {/* Bulk Actions */}
      {upcomingBookings.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-4 border-t-2 border-gray-300">
          <div className="h-[32px] flex flex-row gap-2 items-center">
            <button
              type="button"
              onClick={selectAllBookings}
              className="text-xs md:text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
            >
              Маркирай всички тренировки
            </button>
            {selectedBookingIds.length > 0 && (
              <>
                <span className="text-gray-400 text-xs md:text-sm">|</span>
                <button
                  type="button"
                  onClick={clearAllSelectedBookings}
                  className="text-xs md:text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
                >
                  Изчисти всички
                </button>
                <span className="text-gray-400 text-xs md:text-sm">|</span>
                <Button
                  onClick={handleBulkCancel}
                  variant="danger"
                  className="whitespace-nowrap"
                >
                  Отмени всички ({selectedBookingIds.length})
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk Cancel Booking Modal */}
      <ConfirmDialog
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setBulkCancelError(null);
        }}
        onConfirm={confirmBulkCancel}
        title="Отмяна на резервации"
        message={`Сигурни ли сте, че искате да отмените всички избрани резервации (${selectedBookingIds.length})?`}
        confirmText={isCancelling ? 'Отмяна...' : 'Потвърди отмяна'}
        cancelText="Отказ"
        variant="danger"
      >
        {/* Error message - prominently displayed */}
        {bulkCancelError && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-[10px]">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm sm:text-base font-medium text-red-700 text-center">
                {bulkCancelError}
              </p>
            </div>
          </div>
        )}
      </ConfirmDialog>

      {/* Schedule View */}
      <div>
        <div className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-2">Няма предстоящи резервации</p>
                <p className="text-gray-500 text-sm">Вашите резервации ще се появят тук</p>
              </div>
            </Card>
          ) : (
            days.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayData = groupedSessions[dayKey];
              
              // Skip days without sessions
              if (!dayData || dayData.sessions.length === 0) {
                return null;
              }
              
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
                    {dayData.sessions.map(({ session, bookings }, index) => {
                      const isEvenRow = index % 2 === 0;
                      
                      return (
                        <div
                          key={session._id}
                          className={`px-4 py-3 bg-green-300 border-l-4 border-green-600 border-b border-gray-100 last:border-b-0`}
                        >
                          {/* Mobile Layout */}
                          <div className="md:hidden space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="font-medium text-gray-900">
                                {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                              </div>
                            </div>
                            <div className="text-gray-800 font-medium">
                              {session.title}
                            </div>
                            <div className="space-y-2">
                              {bookings.map((booking) => {
                                const climber = booking.climber;
                                const isSelected = selectedBookingIds.includes(booking._id);
                                return (
                                  <div key={booking._id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleBookingSelection(booking._id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-700">
                                        {climber?.firstName} {climber?.lastName}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleCancelBooking(booking._id)}
                                      className="text-red-600 hover:text-red-700 font-medium text-sm px-2 py-1"
                                    >
                                      Отмени
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Desktop Layout */}
                          <div className="hidden md:grid md:grid-cols-5 gap-4 items-start">
                            {/* Time */}
                            <div className="font-medium text-gray-900">
                              {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                            </div>
                            
                            {/* Activity Name */}
                            <div className="text-gray-800">
                              {session.title}
                            </div>
                            
                            {/* Climbers List */}
                            <div className="col-span-2 space-y-2">
                              {bookings.map((booking) => {
                                const climber = booking.climber;
                                const isSelected = selectedBookingIds.includes(booking._id);
                                return (
                                  <div key={booking._id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleBookingSelection(booking._id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-700">
                                        {climber?.firstName} {climber?.lastName}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleCancelBooking(booking._id)}
                                      className="text-red-600 hover:text-red-700 font-medium text-sm px-2 py-1"
                                    >
                                      Отмени
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Checkbox for bulk selection */}
                            <div className="flex justify-end">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={bookings.every(b => selectedBookingIds.includes(b._id)) && bookings.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const allBookingIds = bookings.map(b => b._id);
                                      setSelectedBookingIds(prev => [...new Set([...prev, ...allBookingIds])]);
                                    } else {
                                      const bookingIds = bookings.map(b => b._id);
                                      setSelectedBookingIds(prev => prev.filter(id => !bookingIds.includes(id)));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedSessions;
