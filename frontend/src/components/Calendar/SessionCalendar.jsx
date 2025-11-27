import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { bg } from 'date-fns/locale';

const SessionCalendar = ({ 
  sessions = [], 
  currentDate = new Date(),
  onSessionClick,
  getSessionColor
}) => {
  // Default getSessionColor function if not provided
  const defaultGetSessionColor = (session) => {
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
    
    return { 
      backgroundColor: groupColors[primaryGroup], 
      color: textColors[primaryGroup] 
    };
  };

  const colorFunction = getSessionColor || defaultGetSessionColor;

  // Get sessions for a specific date
  const getSessionsForDate = (date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return isSameDay(sessionDate, date);
    });
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleSessionClick = (session, e) => {
    if (e) {
      e.stopPropagation();
    }
    if (onSessionClick) {
      onSessionClick(session);
    }
  };

  return (
    <>
      {/* Mobile Calendar Grid View - Full Width */}
      <div className="md:hidden grid grid-cols-7 gap-0.5 w-full">
        {['П', 'В', 'С', 'Ч', 'П', 'С', 'Н'].map((day, index) => (
          <div key={`mobile-day-${index}`} className="p-1 text-center text-[11px] font-semibold text-gray-700">
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
                min-h-[60px] p-1 border border-[rgba(0,0,0,0.1)] rounded-[6px]
                ${isCurrentMonth ? 'bg-white' : 'bg-[#f3f3f5]'}
                ${isToday ? 'ring-2 ring-[#ea7a24]' : ''}
              `}
            >
              <div className={`text-xs font-medium mb-1 text-center ${isCurrentMonth ? 'text-neutral-950' : 'text-[#99a1af]'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {daySessions.slice(0, 1).map((session) => {
                  const colorStyle = colorFunction(session);
                  return (
                    <div
                      key={session._id}
                      onClick={(e) => handleSessionClick(session, e)}
                      className="text-[9px] px-0.5 py-0.5 rounded-[4px] truncate text-white text-center font-medium cursor-pointer hover:opacity-80 transition-opacity"
                      style={colorStyle}
                      title={`${format(new Date(session.date), 'HH:mm')} - ${session.title || 'Тренировка'}`}
                    >
                      {format(new Date(session.date), 'HH:mm')}
                    </div>
                  );
                })}
                {daySessions.length > 1 && (
                  <div className="text-[9px] text-[#4a5565] text-center font-medium">+{daySessions.length - 1}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Desktop Grid View - Smaller/Compact */}
      <div className="hidden md:grid md:grid-cols-7 gap-1">
        {['Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб', 'Нед'].map((day, index) => (
          <div key={`desktop-day-${index}`} className="p-1.5 text-center text-xs font-semibold text-gray-700">
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
                min-h-[60px] p-1 border border-[rgba(0,0,0,0.1)] rounded-[8px]
                ${isCurrentMonth ? 'bg-white' : 'bg-[#f3f3f5]'}
                ${isToday ? 'ring-2 ring-[#ea7a24]' : ''}
              `}
            >
              <div className={`text-xs font-medium mb-1 ${isCurrentMonth ? 'text-neutral-950' : 'text-[#99a1af]'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {daySessions.slice(0, 2).map((session) => {
                  const colorStyle = colorFunction(session);
                  return (
                    <div
                      key={session._id}
                      onClick={(e) => handleSessionClick(session, e)}
                      className="text-[10px] p-0.5 rounded-[6px] truncate text-white cursor-pointer hover:opacity-80 transition-opacity"
                      style={colorStyle}
                      title={session.title || 'Тренировка'}
                    >
                      {format(new Date(session.date), 'HH:mm')}
                    </div>
                  );
                })}
                {daySessions.length > 2 && (
                  <div className="text-[10px] text-[#4a5565]">+{daySessions.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default SessionCalendar;

