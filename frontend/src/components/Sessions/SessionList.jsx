import { format } from 'date-fns';
import Card from '../UI/Card';
import SessionCard from './SessionCard';
import { CalendarIcon } from './SessionIcons';
import { useSynchronizedWidths } from '../../hooks/useSynchronizedWidths';

const SessionList = ({
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

  // Helper function to calculate label rows needed for a session
  // Returns 1, 2, or 3 based on estimated space needed
  // Target: Use 1 row if labels don't overlap, otherwise use 2 or 3 rows
  const calculateLabelRows = (session) => {
    // Estimate label widths (in pixels, approximate)
    // Each label has padding (px-2 = 8px each side = 16px) + text width
    // Using realistic estimates - labels are compact with text-xs font
    const labelWidths = {
      'Начинаещи': 75,    // ~59px text + 16px padding (text-xs is smaller)
      'Деца с опит': 95,  // ~79px text + 16px padding  
      'Напреднали': 85,   // ~69px text + 16px padding
    };
    
    // Calculate width for target groups
    let totalTargetGroupWidth = 0;
    if (session.targetGroups && session.targetGroups.length > 0) {
      session.targetGroups.forEach(group => {
        const groupConfig = {
          beginner: 'Начинаещи',
          experienced: 'Деца с опит',
          advanced: 'Напреднали',
        }[group] || group;
        totalTargetGroupWidth += labelWidths[groupConfig] || 85;
      });
      // Add gap between labels (gap-2 = 8px per gap)
      totalTargetGroupWidth += (session.targetGroups.length - 1) * 8;
    }
    
    // Calculate width for reservations if they are shown
    // Reservations are shown when showReservationsInfo is true
    let totalReservationWidth = 0;
    if (showReservationsInfo) {
      const reservations = getReservationsForSession(session._id);
      if (reservations.length > 0) {
        // "За:" label is ~25px
        totalReservationWidth += 25;
        // Each reservation badge: estimate ~80-120px depending on name length
        // Using average of ~100px per reservation
        reservations.forEach(() => {
          totalReservationWidth += 100; // Average width per reservation badge
        });
        // Add gaps between reservations (gap-2 = 8px per gap)
        totalReservationWidth += (reservations.length - 1) * 8;
        // Gap between reservations section and target groups (if both exist)
        if (totalTargetGroupWidth > 0) {
          totalReservationWidth += 16; // gap-4 = 16px
        }
      }
    }
    
    // Total width for all labels (reservations + target groups)
    const totalLabelWidth = totalReservationWidth + totalTargetGroupWidth;
    
    // Capacity section width - conservative estimate
    // Icon: 16px, Text (e.g., "10/10"): ~45px, Progress bar: 80px, Gaps: ~21px
    const capacityWidth = 170;
    const gapBetween = 16; // gap-4 = 16px
    
    // Estimate available width - use very generous estimate for wide screens
    // Desktop cards: max-w-[1600px] container, minus padding
    // For wide screens (1900px+), cards can be up to 1600px wide
    // Card internal padding: px-4 = 16px each side = 32px
    // The labels section is in a flex container that can use most of this width
    const availableWidth = 1400; // Generous estimate for wide screens (1900px+)
    
    // If no labels at all, only capacity - fits on one row
    if (totalLabelWidth === 0) {
      return 1;
    }
    
    // Check if all labels + capacity fit on one row WITHOUT overlap
    const totalNeeded = totalLabelWidth + capacityWidth + gapBetween;
    if (totalNeeded <= availableWidth) {
      return 1; // Everything fits on one row without overlap
    }
    
    // Labels + capacity don't fit on one row, check if labels alone fit
    if (totalLabelWidth <= availableWidth) {
      return 2; // Labels on row 1, capacity on row 2
    }
    
    // Labels themselves need to wrap to multiple rows
    // This should be rare - only with many reservations + target groups
    return 3; // Labels wrap to 2 rows, capacity on row 3
  };

  // Helper function to get max label rows for all sessions in a day
  const getMaxLabelRowsForDay = (sessions) => {
    if (!sessions || sessions.length === 0) return 1;
    
    let maxRows = 1;
    sessions.forEach(session => {
      const rows = calculateLabelRows(session);
      if (rows > maxRows) {
        maxRows = rows;
      }
    });
    
    return maxRows;
  };

  // Synchronized widths for card elements
  const { widths, handleMeasurement } = useSynchronizedWidths(filteredSessions);

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
              {(() => {
                // Calculate max label rows for all sessions in this day
                const maxLabelRows = getMaxLabelRowsForDay(dayData.sessions);
                
                return dayData.sessions.map((session, index) => {
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

                  // Create unique key for this session
                  const sessionKey = `${dayKey}-${session._id}-${index}`;

                  return (
                    <SessionCard
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
                      labelRows={maxLabelRows}
                      synchronizedWidths={widths}
                      onMeasure={handleMeasurement}
                    />
                  );
                });
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SessionList;

