import { format } from 'date-fns';
import { ClockIcon, PersonIcon } from './SessionIcons';
import { getReservationColor, getTargetGroupConfig, COLORS } from '../../utils/constants';

const SessionCard = ({
  session,
  bookedCount,
  mode = 'public', // 'public' | 'admin'
  // Public mode props
  onReserve,
  onSelect,
  isSelected = false,
  isFull = false,
  // Parent/child selection props
  user = null,
  children = [],
  selectedClimberForSession = null,
  defaultSelectedClimberIds = null,
  // Admin mode props
  selectedClimberId,
  onClimberSelect,
  coaches = [],
  allClimbers = [],
  onViewRoster,
  viewingRoster = false,
  roster = [],
  onEdit,
  onDelete,
  showToast,
  getBulgarianDayName,
  formatTime,
  getEndTime,
  // Reservation props
  reservationInfo = null,
  onCancelBooking,
  allReservations = [],
  showReservationsInfo = false,
}) => {
  const isActive = session.status === 'active';
  const progressPercentage = (bookedCount / session.capacity) * 100;
  const sessionDate = new Date(session.date);
  const timeStr = formatTime ? formatTime(session.date) : format(sessionDate, 'HH:mm');
  const endTimeStr = getEndTime ? getEndTime(session.date, session.durationMinutes) : format(new Date(sessionDate.getTime() + session.durationMinutes * 60000), 'HH:mm');
  
  // Determine border color based on target groups (lowest priority) or selection
  const getBorderColor = () => {
    // If selected, use orange
    if (isSelected) {
      return COLORS.PRIMARY;
    }
    
    // If no target groups, use default green
    if (!session.targetGroups || session.targetGroups.length === 0) {
      return COLORS.SUCCESS;
    }
    
    // Priority order: beginner < experienced < advanced
    // Find the lowest priority group
    const hasBeginner = session.targetGroups.includes('beginner');
    const hasExperienced = session.targetGroups.includes('experienced');
    const hasAdvanced = session.targetGroups.includes('advanced');
    
    // Return color based on lowest priority group
    if (hasBeginner) {
      return COLORS.SUCCESS; // Green for beginner
    } else if (hasExperienced) {
      return COLORS.PRIMARY; // Orange for experienced
    } else if (hasAdvanced) {
      return COLORS.ERROR; // Darker red for advanced (better contrast with orange)
    }
    
    // Default green
    return COLORS.SUCCESS;
  };
  
  const borderColor = getBorderColor();

  // Handle row click for selection (both mobile and desktop)
  const handleRowClick = (e) => {
    // Don't trigger if clicking on buttons, links, or checkbox
    const target = e.target;
    const isClickable = target.closest('button') || 
                       target.closest('a') || 
                       target.closest('input[type="checkbox"]') ||
                       target.closest('select');
    
    if (!isClickable && onSelect) {
      onSelect(session._id);
    }
  };

  // Determine background color based on selection and reservation status
  const getBackgroundColor = () => {
    if (isSelected) {
      return 'bg-[#ffe5d4]'; // Selected: orange tint
    }
    if (reservationInfo) {
      return 'bg-orange-50'; // Has reservation: light orange background
    }
    return 'bg-white'; // Default: white
  };

  return (
    <div 
      id={`session-${session._id}`}
      className={`rounded-lg overflow-hidden relative transition-all duration-200 hover:shadow-md hover:border-gray-200 group border-l-4 ${getBackgroundColor()} ${onSelect ? 'cursor-pointer' : ''}`}
      style={{ borderLeftColor: borderColor }}
      onClick={handleRowClick}
    >
      <div className="px-4 py-3">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-col gap-2">
          {/* Time Row with Title, Checkbox and Buttons */}
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 transition-colors duration-200 group-hover:text-[#ff6900] flex-1 min-w-0">
              {/* Checkbox - на същия ред с часът и заглавието */}
              {((mode === 'admin') || (mode === 'public' && onSelect)) ? (
                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation(); // Prevent row click when clicking checkbox
                      onSelect && onSelect(session._id);
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent row click
                    className={`w-5 h-5 border-2 rounded cursor-pointer transition-all duration-200 appearance-none ${
                      isSelected
                        ? 'bg-[#ff6900] border-[#ff6900] checked:bg-[#ff6900]'
                        : 'bg-white border-[#cad5e2] hover:border-[#ff6900]'
                    } focus:ring-2 focus:ring-[#ff6900] focus:ring-offset-1`}
                    style={{
                      backgroundImage: isSelected ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'white\'%3E%3Cpath fill-rule=\'evenodd\' d=\'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\' clip-rule=\'evenodd\'/%3E%3C/svg%3E")' : 'none',
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                </div>
              ) : null}
              <div className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110">
                <ClockIcon />
              </div>
              <span className="text-sm md:text-base leading-6 text-[#0f172b] font-normal">
                {timeStr} - {endTimeStr}
              </span>
              {/* Разделител между часът и заглавието */}
              {session.title && (
                <>
                  <span className="text-[#cad5e2]">|</span>
                  <span className="text-sm md:text-base leading-6 text-[#0f172b] font-normal">
                    {session.title}
                  </span>
                </>
              )}
            </div>

              {/* Buttons - горе в дясно */}
              {isActive && mode === 'public' && (
                <div className="flex flex-row items-center gap-2 shrink-0 self-center">
                  {/* Показва "Отмени" само когато има резервация */}
                  {reservationInfo && onCancelBooking && (
                    <button
                      onClick={() => {
                        // Показва popup за потвърждение с избор на резервации
                        if (allReservations && allReservations.length > 0) {
                          onCancelBooking(session._id, allReservations);
                        } else if (reservationInfo.bookingId) {
                          onCancelBooking(session._id, [reservationInfo]);
                        }
                      }}
                      className="h-9 px-4 py-2 rounded-lg text-xs md:text-sm leading-5 font-normal border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 transition-all duration-200 whitespace-nowrap w-[80px] flex items-center justify-center"
                    >
                      Отмени
                    </button>
                  )}
                  {/* Винаги показва бутон "Запази" */}
                  {onReserve && (
                    <button
                      onClick={() => onReserve(session._id)}
                      disabled={isFull}
                      className={`h-9 px-4 py-2 rounded-lg text-xs md:text-sm leading-5 font-normal transition-all duration-200 shadow-sm whitespace-nowrap w-[80px] ${
                        isFull
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white hover:from-[#f54900] hover:to-[#ff6900] hover:shadow-md'
                      }`}
                    >
                      {isFull ? 'Няма места' : 'Запази'}
                    </button>
                  )}
                </div>
              )}

              {/* Admin Reserve Button */}
              {mode === 'admin' && onReserve && (
                <button
                  onClick={() => {
                    const climberId = selectedClimberId || '';
                    if (!climberId) {
                      showToast && showToast('Моля, изберете катерач от списъка по-долу', 'error');
                      return;
                    }
                    onReserve(session._id);
                  }}
                  className="h-9 px-4 py-2 rounded-lg text-xs md:text-sm leading-5 font-normal bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white transition-all duration-200 shadow-sm whitespace-nowrap hover:from-[#f54900] hover:to-[#ff6900] hover:shadow-md shrink-0"
                >
                  Запази
                </button>
              )}
            </div>

            {/* Reservations Info - Резервации за деца */}
            {showReservationsInfo && allReservations && allReservations.length > 0 && (
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#64748b]">За:</span>
                <div className="flex items-center flex-wrap gap-2">
                  {allReservations.map((reservation, index) => {
                    const colors = getReservationColor(index);
                    
                    return (
                      <span
                        key={reservation.bookingId || index}
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {reservation.climberName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Target Groups Labels with Capacity and Progress Bar - на един ред */}
            <div className="mb-2 flex items-center flex-wrap gap-4">
              {/* Target Groups */}
              {session.targetGroups && session.targetGroups.length > 0 && (
                <div className="flex items-center flex-wrap gap-2">
                  {session.targetGroups.map((group) => {
                    const groupConfig = getTargetGroupConfig(group);
                    
                    return (
                      <span
                        key={group}
                        className={`px-2 py-1 rounded text-xs font-normal ${groupConfig.bgColor} ${groupConfig.textColor}`}
                      >
                        {groupConfig.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Capacity with Progress Bar - на същия ред */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110">
                  <PersonIcon />
                </div>
                <span className="text-sm md:text-base leading-6 text-[#0f172b] font-normal whitespace-nowrap">
                  {bookedCount}/{session.capacity}
                </span>
                <div className="bg-slate-200 h-2 rounded-full overflow-hidden w-[80px] transition-all duration-200 group-hover:bg-slate-300">
                  <div 
                    className="h-full bg-[#00c950] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex gap-4">
          {/* Left side - Content */}
          <div className="flex-1 min-w-0">
            {/* 1. Заглавието на тренировката */}
            {session.title && (
              <div className="mb-2">
                <span className="text-base leading-6 text-[#0f172b] font-normal">
                  {session.title}
                </span>
              </div>
            )}

            {/* 2. Часът */}
            <div className="flex items-center gap-2 mb-2 transition-colors duration-200 group-hover:text-[#ff6900]">
              <div className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110">
                <ClockIcon />
              </div>
              <span className="text-sm leading-6 text-[#0f172b] font-normal">
                {timeStr} - {endTimeStr}
              </span>
            </div>

            {/* 3. Резервации за деца */}
            {showReservationsInfo && allReservations && allReservations.length > 0 && (
              <div className="mb-2 flex items-center flex-wrap gap-2">
                <span className="text-xs text-[#64748b]">За:</span>
                <div className="flex items-center flex-wrap gap-2">
                  {allReservations.map((reservation, index) => {
                    const colors = getReservationColor(index);
                    
                    return (
                      <span
                        key={reservation.bookingId || index}
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {reservation.climberName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Подходящо за */}
            {session.targetGroups && session.targetGroups.length > 0 && (
              <div className="mb-2 flex items-center flex-wrap gap-2">
                {session.targetGroups.map((group) => {
                  const groupConfig = getTargetGroupConfig(group);
                  
                  return (
                    <span
                      key={group}
                      className={`px-2 py-1 rounded text-xs font-normal ${groupConfig.bgColor} ${groupConfig.textColor}`}
                    >
                      {groupConfig.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* 5. Свободните места */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110">
                <PersonIcon />
              </div>
              <span className="text-sm leading-6 text-[#0f172b] font-normal whitespace-nowrap">
                {bookedCount}/{session.capacity}
              </span>
              <div className="bg-slate-200 h-2 rounded-full overflow-hidden w-[80px] transition-all duration-200 group-hover:bg-slate-300">
                <div 
                  className="h-full bg-[#00c950] rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right side - Buttons and Checkbox */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Buttons */}
            {isActive && mode === 'public' && (
              <div className="flex flex-col gap-2 items-end">
                {/* Винаги показва бутон "Запази" */}
                {onReserve && (
                  <button
                    onClick={() => onReserve(session._id)}
                    disabled={isFull}
                    className={`h-9 px-4 py-2 rounded-lg text-xs leading-5 font-normal transition-all duration-200 shadow-sm whitespace-nowrap w-[80px] flex items-center justify-center ${
                      isFull
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white hover:from-[#f54900] hover:to-[#ff6900] hover:shadow-md'
                    }`}
                  >
                    {isFull ? 'Няма места' : 'Запази'}
                  </button>
                )}
                {/* Показва "Отмени" само когато има резервация */}
                {reservationInfo && onCancelBooking && (
                  <button
                    onClick={() => {
                      // Показва popup за потвърждение с избор на резервации
                      if (allReservations && allReservations.length > 0) {
                        onCancelBooking(session._id, allReservations);
                      } else if (reservationInfo.bookingId) {
                        onCancelBooking(session._id, [reservationInfo]);
                      }
                    }}
                    className="h-9 px-4 py-2 rounded-lg text-xs leading-5 font-normal border-2 border-red-500 text-red-500 bg-white hover:bg-red-50 transition-all duration-200 whitespace-nowrap w-[80px] flex items-center justify-center"
                  >
                    Отмени
                  </button>
                )}
              </div>
            )}

            {/* Admin Reserve Button */}
            {mode === 'admin' && onReserve && (
              <button
                onClick={() => {
                  const climberId = selectedClimberId || '';
                  if (!climberId) {
                    showToast && showToast('Моля, изберете катерач от списъка по-долу', 'error');
                    return;
                  }
                  onReserve(session._id);
                }}
                className="h-9 px-4 py-2 rounded-lg text-xs leading-5 font-normal bg-gradient-to-r from-[#ff6900] to-[#f54900] text-white transition-all duration-200 shadow-sm whitespace-nowrap w-[80px] flex items-center justify-center hover:from-[#f54900] hover:to-[#ff6900] hover:shadow-md"
              >
                Запази
              </button>
            )}

            {/* Checkbox - под бутоните */}
            {((mode === 'admin') || (mode === 'public' && onSelect)) ? (
              <div className="flex items-center justify-center mt-1 w-[80px]">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect && onSelect(session._id)}
                  className={`w-5 h-5 border-2 rounded cursor-pointer transition-all duration-200 appearance-none ${
                    isSelected
                      ? 'bg-[#ff6900] border-[#ff6900] checked:bg-[#ff6900]'
                      : 'bg-white border-[#cad5e2] hover:border-[#ff6900]'
                  } focus:ring-2 focus:ring-[#ff6900] focus:ring-offset-1`}
                  style={{
                    backgroundImage: isSelected ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'white\'%3E%3Cpath fill-rule=\'evenodd\' d=\'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\' clip-rule=\'evenodd\'/%3E%3C/svg%3E")' : 'none',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Admin Controls */}
        {mode === 'admin' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-2 items-stretch sm:items-center">
              {onClimberSelect && (
                <select
                  value={selectedClimberId || ''}
                  onChange={(e) => onClimberSelect(session._id, e.target.value)}
                  className="px-3 py-2 sm:py-1.5 text-sm border border-gray-300 rounded-md w-full sm:w-auto min-w-[200px] sm:min-w-0"
                >
                  <option value="">Избери катерач...</option>
                  {allClimbers.map((climber) => (
                    <option key={climber._id} value={climber._id}>
                      {climber.firstName} {climber.lastName}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:flex-initial">
                {onViewRoster && (
                  <button
                    onClick={() => onViewRoster(session._id)}
                    className="px-3 py-2 sm:py-1.5 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md transition-colors w-full sm:w-auto"
                  >
                    {viewingRoster ? 'Скрий списъка' : 'Виж списъка'}
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(session)}
                    className="px-3 py-2 sm:py-1.5 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md transition-colors w-full sm:w-auto"
                  >
                    Редактирай
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(session._id)}
                    className="px-3 py-2 sm:py-1.5 text-sm text-red-600 hover:text-red-700 border border-red-600 rounded-md transition-colors w-full sm:w-auto"
                  >
                    Изтрий
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Roster View - Admin only */}
        {viewingRoster && mode === 'admin' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold mb-3 text-base sm:text-lg">Регистрирани катерачи ({roster.length})</h4>
            {roster.length === 0 ? (
              <p className="text-gray-500 text-sm">Все още няма регистрирани катерачи</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {roster.map((item) => {
                  const climber = item.climber || item;
                  const bookedBy = item.bookedBy;
                  return (
                    <div key={item.bookingId || climber._id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 sm:p-3 bg-gray-50 rounded">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-medium text-sm sm:text-base">{climber.firstName} {climber.lastName}</span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-wrap">
                          {climber.dateOfBirth && (
                            <span className="text-xs sm:text-sm text-gray-500">
                              (Възраст: {new Date().getFullYear() - new Date(climber.dateOfBirth).getFullYear()})
                            </span>
                          )}
                          {bookedBy && (
                            <span className="text-xs text-gray-400 break-words">
                              Резервирано от: {
                                bookedBy.firstName && bookedBy.lastName
                                  ? `${bookedBy.firstName} ${bookedBy.middleName || ''} ${bookedBy.lastName}`.trim()
                                  : bookedBy.name || bookedBy.email
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionCard;

