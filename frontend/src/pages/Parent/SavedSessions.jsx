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

  const handleCancelBooking = (bookingId) => {
    setCancelSingleBookingId(bookingId);
    setShowCancelSingleDialog(true);
  };

  const confirmCancelSingleBooking = async () => {
    if (!cancelSingleBookingId) return;

    try {
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
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при отменяне на резервация', 'error');
      setShowCancelSingleDialog(false);
      setCancelSingleBookingId(null);
    }
  };

  const cancelCancelSingleBooking = () => {
    setShowCancelSingleDialog(false);
    setCancelSingleBookingId(null);
  };

  const handleBulkCancel = () => {
    if (selectedBookingIds.length === 0) {
      showToast('Моля, изберете поне една резервация за отмяна', 'error');
      return;
    }
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
        showToast(
          `Неуспешна отмяна на ${results.failed.length} резервации`,
          'error'
        );
      }
    } catch (error) {
      showToast('Грешка при отмяна на резервации', 'error');
      console.error('Cancel booking error:', error);
    } finally {
      // Always close modal and clear selection
      setShowCancelModal(false);
      setSelectedBookingIds([]);
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
      />

      {/* Bulk Actions */}
      {upcomingBookings.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-4 border-t-2 border-gray-300">
          <div className="flex flex-row gap-2 items-center">
            <button
              type="button"
              onClick={selectAllBookings}
              className="text-xs md:text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
            >
              Маркирай всички
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
        }}
        onConfirm={confirmBulkCancel}
        title="Отмяна на резервации"
        message={`Сигурни ли сте, че искате да отмените всички избрани резервации (${selectedBookingIds.length})?`}
        confirmText={isCancelling ? 'Отмяна...' : 'Потвърди отмяна'}
        cancelText="Отказ"
        variant="danger"
      />

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
                          className={`px-4 py-3 bg-green-50 border-b border-gray-100 last:border-b-0`}
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
