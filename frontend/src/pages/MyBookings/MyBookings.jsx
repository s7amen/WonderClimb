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
  const [activeTab, setActiveTab] = useState('upcoming');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { showToast } = useToast();

  // Training labels configuration
  const trainingLabels = {
    targetGroups: [
      { slug: 'beginner', label: 'Начинаещи', color: '#15803D' },
      { slug: 'experienced', label: 'Деца с опит', color: '#C2410C' },
      { slug: 'advanced', label: 'Напреднали', color: '#B91C1C' },
    ],
    ageGroups: [],
  };

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

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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
  const getSessionsFromBookings = (statusFilter = null, dateFilter = null) => {
    let filteredBookings = myBookings;

    // Filter by status
    if (statusFilter === 'booked') {
      filteredBookings = filteredBookings.filter(b => b.status === 'booked' && b.session);
    } else if (statusFilter === 'cancelled') {
      filteredBookings = filteredBookings.filter(b => b.status === 'cancelled' && b.session);
    } else if (statusFilter === 'attended' || statusFilter === 'history') {
      // For history, we want past sessions that were booked (attended)
      filteredBookings = filteredBookings.filter(b => 
        (b.status === 'booked' || b.status === 'attended') && b.session
      );
    } else {
      // Default: all booked sessions
      filteredBookings = filteredBookings.filter(b => b.status === 'booked' && b.session);
    }

    // Filter by date
    if (dateFilter === 'upcoming') {
      filteredBookings = filteredBookings.filter(b =>
        b.session?.date && new Date(b.session.date) >= startOfDay(new Date())
      );
    } else if (dateFilter === 'past') {
      filteredBookings = filteredBookings.filter(b =>
        b.session?.date && new Date(b.session.date) < startOfDay(new Date())
      );
    }

    // Group bookings by session to get unique sessions
    const sessionsMap = new Map();
    filteredBookings.forEach(booking => {
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

  // Get sessions for each tab
  const upcomingSessions = getSessionsFromBookings('booked', 'upcoming');
  const historySessions = getSessionsFromBookings('booked', 'past');
  const cancelledSessions = getSessionsFromBookings('cancelled', null);

  // Get sessions for active tab
  const getSessionsForActiveTab = () => {
    if (activeTab === 'history') {
      return historySessions;
    }
    if (activeTab === 'cancelled') {
      return cancelledSessions;
    }
    return upcomingSessions;
  };

  const sessions = getSessionsForActiveTab();

  const getFilteredSessions = () => {
    const tabSessions = getSessionsForActiveTab();

    let filtered = tabSessions;

    if (activeTab === 'upcoming') {
      const today = startOfDay(new Date());
      const viewEndDate = addDays(today, daysToShow);

      filtered = tabSessions.filter(session => {
        const sessionDate = new Date(session.date);

        // Only show sessions within the date range
        if (isBefore(sessionDate, today) || isBefore(viewEndDate, sessionDate)) {
          return false;
        }

        return true;
      });
    }

    // For history and cancelled, show all sessions
    return filtered;
  };

  // Pagination logic
  const allFilteredSessions = getFilteredSessions();
  const totalPages = Math.ceil(allFilteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = allFilteredSessions.slice(startIndex, endIndex);

  // Handle tab change without scrolling
  const handleTabChange = (tabId, e) => {
    e?.preventDefault();
    setActiveTab(tabId);
    // Page will be reset by useEffect
  };

  const tabs = [
    { id: 'upcoming', label: 'Запазени', count: upcomingSessions.length },
    { id: 'history', label: 'Отминали', count: historySessions.length },
    { id: 'cancelled', label: 'Отменени', count: cancelledSessions.length },
  ];

  const emptyTabMessages = {
    upcoming: {
      title: 'Няма предстоящи резервации',
      subtitle: 'Вашите резервации ще се появят тук',
    },
    history: {
      title: 'Няма минали резервации',
      subtitle: 'Миналите часове ще се покажат тук',
    },
    cancelled: {
      title: 'Няма отменени резервации',
      subtitle: 'Отменените резервации ще се покажат тук',
    },
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
    const session = getSessionsForActiveTab().find(s => s._id === sessionId);
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

  const getSessionById = (sessionId) => {
    if (!sessionId) return null;
    return getSessionsForActiveTab().find(s => s._id === sessionId) || 
           upcomingSessions.find(s => s._id === sessionId) ||
           historySessions.find(s => s._id === sessionId) ||
           cancelledSessions.find(s => s._id === sessionId);
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
      </div>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-8">

          {/* Desktop Calendar Section */}
          {upcomingSessions.length > 0 && (
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
                    sessions={upcomingSessions}
                    currentDate={currentDate}
                    onSessionClick={handleSessionClick}
                    getSessionColor={getSessionColor}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Mobile Calendar Section */}
          {upcomingSessions.length > 0 && (
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
                    sessions={upcomingSessions}
                    currentDate={currentDate}
                    onSessionClick={handleSessionClick}
                    getSessionColor={getSessionColor}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-3 border-b border-gray-200 pb-4">
              {tabs.map(tab => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={(e) => handleTabChange(tab.id, e)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      isActive
                        ? 'bg-[#ea7038] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sessions List */}
          <SessionList
            sessions={allFilteredSessions}
            getFilteredSessions={() => paginatedSessions}
            hasActiveFilters={hasActiveFilters}
            clearAllFilters={clearAllFilters}
            getBookedCount={getBookedCount}
            getBulgarianDayName={getBulgarianDayName}
            formatTime={formatTime}
            getEndTime={getEndTime}
            mode="public"
            userBookings={myBookings}
            showReservationsInfo={true}
            trainingLabels={trainingLabels}
            onCancelBooking={(sessionId, reservations) => {
              // Показва popup за потвърждение
              setCancelBookingSessionId(sessionId);
              setCancelBookingBookings(reservations);
              setShowCancelBookingModal(true);
            }}
            sortOrder={(activeTab === 'history' || activeTab === 'cancelled') ? 'desc' : 'asc'}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(prev => Math.max(1, prev - 1));
                }}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Предишна
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          currentPage === page
                            ? 'bg-[#ea7038] text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="px-2 text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                }}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Следваща
              </button>
            </div>
          )}

          {allFilteredSessions.length === 0 && !loading && (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-2">
                  {emptyTabMessages[activeTab]?.title}
                </p>
                <p className="text-gray-500 text-sm">
                  {emptyTabMessages[activeTab]?.subtitle}
                </p>
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
            session={getSessionById(cancelBookingSessionId)}
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
                          variant="outline"
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
