import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import { format, addDays, startOfDay, isBefore } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import SessionList from '../../components/Sessions/SessionList';

const MySessions = () => {
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysToShow] = useState(30);
  const { showToast, ToastComponent } = useToast();

  // Cancel booking modal state
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [cancelBookingSessionId, setCancelBookingSessionId] = useState(null);
  const [cancelBookingBookings, setCancelBookingBookings] = useState([]);
  const [selectedCancelBookingIds, setSelectedCancelBookingIds] = useState([]);
  const [isCancelling, setIsCancelling] = useState(false);


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
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform bookings to sessions format
  const getSessionsFromBookings = () => {
    const bookedSessions = myBookings.filter(b => b.status === 'booked' && b.session);
    const upcomingBookings = bookedSessions.filter(b => 
      b.session?.date && new Date(b.session.date) >= startOfDay(new Date())
    );

    // Group bookings by session to get unique sessions
    const sessionsMap = new Map();
    upcomingBookings.forEach(booking => {
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

  const sessions = getSessionsFromBookings();

  const getFilteredSessions = () => {
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);
    
    return sessions.filter(session => {
      const sessionDate = new Date(session.date);

      // Only show sessions within the date range
      if (isBefore(sessionDate, today) || isBefore(viewEndDate, sessionDate)) {
        return false;
      }

      return true;
    });
  };

  const hasActiveFilters = () => {
    return false;
  };

  const clearAllFilters = () => {
    // No filters to clear
  };

  const getBulgarianDayName = (date) => {
    const dayNames = ['Нед', 'Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб'];
    return dayNames[date.getDay()];
  };

  const formatTime = (date) => {
    return format(new Date(date), 'HH:mm');
  };

  const getEndTime = (startDate, durationMinutes) => {
    const end = new Date(new Date(startDate).getTime() + durationMinutes * 60000);
    return format(end, 'HH:mm');
  };

  const getBookedCount = (sessionId) => {
    const session = sessions.find(s => s._id === sessionId);
    if (session?.bookedCount !== undefined) {
      return session.bookedCount;
    }
    // Count bookings for this session
    const sessionBookings = myBookings.filter(b => {
      const bSessionId = b.session?._id || b.sessionId;
      return bSessionId === sessionId && b.status === 'booked';
    });
    return sessionBookings.length;
  };

  if (loading) {
    return <Loading text="Зареждане на моят график..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">Моят график</h1>
      </div>

      <ToastComponent />

      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Sessions List */}
        <SessionList
          sessions={sessions}
          getFilteredSessions={getFilteredSessions}
          hasActiveFilters={hasActiveFilters}
          clearAllFilters={clearAllFilters}
          getBookedCount={getBookedCount}
          getBulgarianDayName={getBulgarianDayName}
          formatTime={formatTime}
          getEndTime={getEndTime}
          mode="public"
          userBookings={myBookings}
          showReservationsInfo={true}
          onCancelBooking={(sessionId, reservations) => {
            // Показва popup за потвърждение
            setCancelBookingSessionId(sessionId);
            setCancelBookingBookings(reservations);
            setSelectedCancelBookingIds(reservations.map(r => r.bookingId));
            setShowCancelBookingModal(true);
          }}
        />

        {getFilteredSessions().length === 0 && !loading && sessions.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-2">Няма предстоящи резервации</p>
              <p className="text-gray-500 text-sm">Вашите резервации ще се появят тук</p>
            </div>
          </Card>
        )}
        

        {/* Cancel Booking Confirmation Modal - Модерен дизайн */}
        {showCancelBookingModal && cancelBookingSessionId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-[#0f172b]">Отмени резервация</h2>
                  <button
                    onClick={() => {
                      setShowCancelBookingModal(false);
                      setCancelBookingSessionId(null);
                      setCancelBookingBookings([]);
                      setSelectedCancelBookingIds([]);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    disabled={isCancelling}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Session Info */}
                {(() => {
                  const session = sessions.find(s => s._id === cancelBookingSessionId);
                  if (!session) return null;
                  return (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                      <div className="font-semibold text-[#0f172b] mb-1">{session.title || 'Тренировка'}</div>
                      <div className="text-sm text-[#64748b]">
                        {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                      </div>
                    </div>
                  );
                })()}

                {/* Reservations List */}
                {cancelBookingBookings.length > 0 ? (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-[#64748b] mb-3">
                        {cancelBookingBookings.length === 1 
                          ? 'Избери резервация за отменяне:' 
                          : 'Избери резервации за отменяне:'}
                      </p>
                      <div className="space-y-2">
                        {cancelBookingBookings.map((reservation) => {
                          const isSelected = selectedCancelBookingIds.includes(reservation.bookingId);
                          return (
                            <label
                              key={reservation.bookingId}
                              className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-red-500 bg-red-50 shadow-sm'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedCancelBookingIds(prev => 
                                      prev.includes(reservation.bookingId)
                                        ? prev.filter(id => id !== reservation.bookingId)
                                        : [...prev, reservation.bookingId]
                                    );
                                  }}
                                  className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
                                  disabled={isCancelling}
                                />
                              </div>
                              <span className="ml-3 text-base font-medium text-[#0f172b]">
                                {reservation.climberName}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#64748b] mb-6 text-center py-4">
                    Няма налични резервации за отменяне.
                  </p>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCancelBookingModal(false);
                      setCancelBookingSessionId(null);
                      setCancelBookingBookings([]);
                      setSelectedCancelBookingIds([]);
                    }}
                    disabled={isCancelling}
                    className="flex-1"
                  >
                    Отказ
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (selectedCancelBookingIds.length === 0) {
                        showToast('Моля, изберете поне една резервация за отменяне', 'error');
                        return;
                      }

                      setIsCancelling(true);
                      try {
                        // Отменя всички избрани резервации
                        for (const bookingId of selectedCancelBookingIds) {
                          await bookingsAPI.cancel(bookingId);
                        }
                        
                        // Optimistically update sessions booked counts
                        const cancelledBookings = cancelBookingBookings.filter(b => 
                          selectedCancelBookingIds.includes(b.bookingId)
                        );
                        cancelledBookings.forEach(booking => {
                          setSessions(prev => prev.map(s => {
                            if (s._id === cancelBookingSessionId) {
                              return {
                                ...s,
                                bookedCount: Math.max(0, (s.bookedCount || 0) - 1)
                              };
                            }
                            return s;
                          }));
                        });
                        
                        // Refresh bookings to update UI
                        await fetchBookings();
                        
                        showToast(
                          selectedCancelBookingIds.length === 1
                            ? 'Резервацията е отменена успешно'
                            : `${selectedCancelBookingIds.length} резервации са отменени успешно`,
                          'success'
                        );
                        
                        setShowCancelBookingModal(false);
                        setCancelBookingSessionId(null);
                        setCancelBookingBookings([]);
                        setSelectedCancelBookingIds([]);
                      } catch (error) {
                        showToast(
                          error.response?.data?.error?.message || 'Грешка при отменяне на резервация',
                          'error'
                        );
                      } finally {
                        setIsCancelling(false);
                      }
                    }}
                    disabled={isCancelling || selectedCancelBookingIds.length === 0}
                    variant="danger"
                    className="flex-1"
                  >
                    {isCancelling ? 'Отменяне...' : 'Отмени'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default MySessions;