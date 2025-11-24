import { format } from 'date-fns';
import Card from '../UI/Card';
import TrainingScheduleCard from './TrainingScheduleCard';
import { CalendarIcon } from './TrainingScheduleIcons';

const TrainingScheduleList = ({
  sessions,
  getFilteredSessions,
  hasActiveFilters,
  clearAllFilters,
  getBookedCount,
  getBulgarianDayName,
  formatTime,
  getEndTime,
  // Card props
  mode = 'public',
  onReserve,
  onSelect,
  selectedSessionIds = [],
  // Parent/child selection props
  user = null,
  children = [],
  selectedClimberForSession = null,
  defaultSelectedClimberIds = null,
  // Admin mode props
  coaches = [],
  allClimbers = [],
  onClimberSelect,
  viewingRoster = null,
  roster = [],
  onViewRoster,
  onEdit,
  onDelete,
  showToast,
  // Booking props
  userBookings = [],
  onCancelBooking,
  // Show reservations info
  showReservationsInfo = false,
}) => {
  const filteredSessions = getFilteredSessions();

  if (hasActiveFilters() && filteredSessions.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-2">Няма намерени тренировки с избраните филтри</p>
          <p className="text-gray-500 text-sm mb-4">Моля, опитайте с други филтри или премахнете филтрите</p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-4 py-2 text-sm text-white bg-[#ea7038] hover:opacity-90 rounded-lg font-medium transition-colors"
          >
            Премахни всички филтри
          </button>
        </div>
      </Card>
    );
  }

  // Group sessions by day
  const groupedSessions = {};
  filteredSessions.forEach((session) => {
    const sessionDate = new Date(session.date);
    const dayKey = format(sessionDate, 'yyyy-MM-dd');
    if (!groupedSessions[dayKey]) {
      groupedSessions[dayKey] = {
        date: sessionDate,
        sessions: [],
      };
    }
    groupedSessions[dayKey].sessions.push(session);
  });

  // Sort days
  const sortedDays = Object.keys(groupedSessions).sort();

  // Helper function to get all reservations for a session
  const getReservationsForSession = (sessionId) => {
    if (!userBookings || userBookings.length === 0) return [];
    
    // Normalize sessionId for comparison
    const normalizedSessionId = typeof sessionId === 'object' && sessionId?.toString 
      ? sessionId.toString() 
      : String(sessionId);
    
    return userBookings.filter(b => {
      if (!b || b.status !== 'booked') return false;
      
      // Check sessionId field (could be string or object)
      const bookingSessionId = b.sessionId 
        ? (typeof b.sessionId === 'object' && b.sessionId._id 
            ? String(b.sessionId._id) 
            : String(b.sessionId))
        : null;
      
      // Check session object (populated)
      const sessionObjId = b.session 
        ? (b.session._id ? String(b.session._id) : String(b.session))
        : null;
      
      return bookingSessionId === normalizedSessionId || sessionObjId === normalizedSessionId;
    }).map(booking => {
      const climber = booking.climber || booking.climberId;
      let climberName = 'Неизвестен';
      let climberId = null;
      
      if (climber) {
        if (typeof climber === 'object' && climber.firstName && climber.lastName) {
          // Climber е populated обект с firstName и lastName
          climberName = `${climber.firstName} ${climber.lastName}`;
          climberId = climber._id || climber.id || climber;
        } else if (typeof climber === 'object' && climber.name) {
          // Climber е обект с name поле
          climberName = climber.name;
          climberId = climber._id || climber.id || climber;
        } else {
          // Climber е само ID - опитай да го намериш в children масива
          const climberIdStr = typeof climber === 'object' && climber?.toString 
            ? climber.toString() 
            : String(climber);
          
          const foundClimber = children.find(child => {
            const childIdStr = typeof child._id === 'object' && child._id?.toString 
              ? child._id.toString() 
              : String(child._id);
            return childIdStr === climberIdStr;
          });
          
          if (foundClimber && foundClimber.firstName && foundClimber.lastName) {
            climberName = `${foundClimber.firstName} ${foundClimber.lastName}`;
            climberId = foundClimber._id || climber;
          } else {
            climberId = climber;
          }
        }
      }
      
      return {
        climberName,
        bookingId: booking._id || booking.id,
        climberId: climberId || (typeof climber === 'object' && climber._id ? climber._id : climber),
      };
    });
  };

  // Helper function to get reservation info for a session (first one for display)
  const getReservationInfo = (sessionId) => {
    const reservations = getReservationsForSession(sessionId);
    if (reservations.length === 0) return null;
    
    // Ако има само една резервация, показва я
    if (reservations.length === 1) {
      return reservations[0];
    }
    
    // Ако има повече от една, показва първата с броя
    return {
      ...reservations[0],
      climberName: `${reservations[0].climberName} и още ${reservations.length - 1}`,
      allReservations: reservations,
    };
  };

  return (
    <div className="space-y-6">
      {sortedDays.map((dayKey) => {
        const dayData = groupedSessions[dayKey];
        const dayName = getBulgarianDayName ? getBulgarianDayName(dayData.date) : '';
        const formattedDate = format(dayData.date, 'dd/MM/yyyy');
        const fullDayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
        const fullDayName = fullDayNames[dayData.date.getDay()];

        return (
          <div key={dayKey} className="space-y-3">
            {/* Day Header */}
            <div className="flex items-center gap-2 px-2">
              <div className="w-4 h-4 shrink-0">
                <CalendarIcon />
              </div>
              <h3 className="text-base font-normal text-[#0f172b] leading-6">
                {fullDayName}, {formattedDate}
              </h3>
              {/* Хоризонтална линия след датата - центрирана вертикално */}
              <div className="flex-1 h-px bg-[rgba(0,0,0,0.1)] ml-2"></div>
            </div>

            {/* Sessions for this day */}
            <div className="space-y-3">
              {dayData.sessions.map((session) => {
                const bookedCount = getBookedCount ? getBookedCount(session._id) : (session.bookedCount || 0);
                const isFull = bookedCount >= session.capacity;
                // Normalize session ID for comparison
                const sessionId = session._id || session.id;
                const normalizedSessionId = typeof sessionId === 'object' && sessionId?.toString 
                  ? sessionId.toString() 
                  : String(sessionId);
                const isSelected = selectedSessionIds.some(id => {
                  const normalizedId = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                  return normalizedId === normalizedSessionId;
                });
                
                // Get selected climber ID - use session._id directly as key
                const selectedClimberId = mode === 'admin' ? ((selectedClimberForSession && selectedClimberForSession[session._id]) || '') : null;
                
                // Normalize viewingRoster comparison
                let isViewingRoster = false;
                if (viewingRoster && session._id) {
                  const normalizedViewingRoster = typeof viewingRoster === 'object' && viewingRoster?.toString 
                    ? viewingRoster.toString() 
                    : String(viewingRoster);
                  const normalizedSessionId = typeof session._id === 'object' && session._id?.toString 
                    ? session._id.toString() 
                    : String(session._id);
                  isViewingRoster = normalizedViewingRoster === normalizedSessionId;
                }
                
                const sessionRoster = mode === 'admin' && isViewingRoster ? roster : null;
                const reservationInfo = getReservationInfo(session._id);

                return (
                  <TrainingScheduleCard
                    key={session._id}
                    session={session}
                    bookedCount={bookedCount}
                    mode={mode}
                    onReserve={onReserve}
                    onSelect={onSelect}
                    isSelected={isSelected}
                    isFull={isFull}
                    user={user}
                    children={children}
                    selectedClimberForSession={mode === 'public' ? ((selectedClimberForSession && selectedClimberForSession[session._id]) || null) : null}
                    selectedClimberId={selectedClimberId}
                    defaultSelectedClimberIds={mode === 'public' ? defaultSelectedClimberIds : null}
                    onClimberSelect={onClimberSelect}
                    coaches={coaches}
                    allClimbers={allClimbers}
                    onViewRoster={onViewRoster}
                    viewingRoster={isViewingRoster}
                    roster={sessionRoster}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    showToast={showToast}
                    getBulgarianDayName={getBulgarianDayName}
                    formatTime={formatTime}
                    getEndTime={getEndTime}
                    reservationInfo={reservationInfo}
                    onCancelBooking={onCancelBooking}
                    allReservations={getReservationsForSession(session._id)}
                    showReservationsInfo={showReservationsInfo}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrainingScheduleList;

