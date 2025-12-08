import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import { format, addDays, startOfDay, isBefore, addMonths, subMonths } from 'date-fns';
import { bg } from 'date-fns/locale';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import SessionList from '../../components/Sessions/SessionList';
import SessionCalendar from '../../components/Calendar/SessionCalendar';
import useCancelBooking from '../../hooks/useCancelBooking';
import CancellationModal from '../../components/Booking/CancellationModal';

const MySessions = () => {
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysToShow] = useState(30);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { showToast } = useToast();

  // Cancel booking modal state
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [cancelBookingSessionId, setCancelBookingSessionId] = useState(null);
  const [cancelBookingBookings, setCancelBookingBookings] = useState([]);

  // Use shared cancellation hook
  const { cancelError, isCancelling, cancelBookings, resetError } = useCancelBooking({
    showToast,
    onSuccess: (results) => {
      // Update local state
      setMyBookings(prev => prev.map(booking =>
        results.successful.includes(booking._id)
          ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
          : booking
      ));

      // Close modal
      setShowCancelBookingModal(false);
      setCancelBookingSessionId(null);
      setCancelBookingBookings([]);
    },
    onPartialSuccess: (results) => {
      // Update for successful ones
      setMyBookings(prev => prev.map(booking =>
        results.successful.includes(booking._id)
          ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
          : booking
      ));

      // Remove successful from modal list
      setCancelBookingBookings(prev => prev.filter(b =>
        !results.successful.includes(b.bookingId || b._id)
      ));

      // Keep modal open to show errors
    },
  });

  // Session details modal state
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);


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


  // Get reservations for a specific session
  const getReservationsForSession = (sessionId) => {
    if (!myBookings || myBookings.length === 0) return [];

    const normalizedSessionId = typeof sessionId === 'object' && sessionId?.toString
      ? sessionId.toString()
      : String(sessionId);

    // Filter bookings for this session
    const sessionBookings = myBookings.filter(b => {
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
    });

    // Deduplicate by climberId - keep only the most recent booking per climber
    const climberMap = new Map();
    sessionBookings.forEach(booking => {
      const climber = booking.climber || booking.climberId;
      const climberId = typeof climber === 'object' && climber._id ? String(climber._id) : String(climber);

      const existing = climberMap.get(climberId);
      const bookingDate = booking.createdAt ? new Date(booking.createdAt) : new Date(0);
      const existingDate = existing?.createdAt ? new Date(existing.createdAt) : new Date(0);

      // Keep the most recent booking for each climber
      if (!existing || bookingDate > existingDate) {
        climberMap.set(climberId, booking);
      }
    });

    // Convert to reservation format
    return Array.from(climberMap.values()).map(booking => {
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

  // Handle session click
  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  // Get session color based on targetGroups (similar to Calendar component)
  const getSessionColor = (session) => {
    if (session.status !== 'active') {
      return { backgroundColor: '#99a1af', color: 'white' };
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
      return { backgroundColor: '#FFEDD5', color: '#C2410C' };
    }

    return { backgroundColor: groupColors[primaryGroup], color: textColors[primaryGroup] };
  };


  const navigateDate = (direction) => {
    setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return <Loading text="Зареждане на моят график..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">Моят график</h1>
      </div><div className="bg-gray-50 min-h-screen">
        {/* Mobile Calendar Section - Full Width (100vw) */}
        {sessions.length > 0 && (
          <div className="md:hidden mb-6">
            <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px] overflow-hidden">
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
            </Card>
          </div>
        )}

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-8">

          {/* Desktop Calendar Section */}
          {sessions.length > 0 && (
            <div className="hidden md:block mb-6">
              <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px]">
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
              </Card>
            </div>
          )}

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


          {/* Cancel Booking Modal - Using Shared Component */}
          <CancellationModal
            isOpen={showCancelBookingModal}
            onClose={() => {
              setShowCancelBookingModal(false);
              setCancelBookingSessionId(null);
              setCancelBookingBookings([]);
              resetError();
            }}
            session={sessions.find(s => s._id === cancelBookingSessionId)}
            bookings={cancelBookingBookings}
            onConfirm={async (selectedIds) => {
              await cancelBookings(selectedIds, cancelBookingBookings);
            }}
            error={cancelError}
            isLoading={isCancelling}
          />


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
                        ) : null}
                      </div>
                    );
                  })()}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                  {(() => {
                    const reservations = getReservationsForSession(selectedSession._id);
                    const hasReservations = reservations.length > 0;

                    return (
                      <>
                        {hasReservations && (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => {
                              setShowSessionModal(false);
                              setSelectedSession(null);
                              // Trigger cancel booking flow
                              setCancelBookingSessionId(selectedSession._id);
                              setCancelBookingBookings(reservations);
                              setShowCancelBookingModal(true);
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
                          className={hasReservations ? "flex-1" : "w-full"}
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
      </div>
    </div>
  );
};

export default MySessions;
