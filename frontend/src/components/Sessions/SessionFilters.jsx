import Card from '../UI/Card';

const SessionFilters = ({
  selectedDays,
  selectedTimes,
  selectedTitles,
  selectedTargetGroups = [],
  selectedAgeGroups = [],
  getUniqueTimes,
  getUniqueTitles,
  toggleFilter,
  clearAllFilters,
  hasActiveFilters,
  // Reservation props
  showReservation = false,
  user = null,
  children = [],
  defaultSelectedClimberIds = [],
  setDefaultSelectedClimberIds = () => {},
  getUserDisplayName = () => '',
  onAddChild = () => {},
}) => {
  return (
    <Card className="mb-4 bg-white/80 border border-slate-200 rounded-[16px] [&>div]:p-0">
      <div className="overflow-hidden">
        <div className="flex flex-col gap-[12px] pb-[12px] pt-[12px] px-[16px]">
          {/* Row 1: Подходящо за и Години - Desktop: на един ред, Mobile: отделни редове */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[#94a3b8] text-xs leading-4 whitespace-nowrap">Подходящо за:</label>
              <div className="flex gap-[6px] flex-wrap">
                {[
                  { value: 'beginner', label: 'Начинаещи', color: '#4ade80' },
                  { value: 'experienced', label: 'Деца с опит', color: '#60a5fa' },
                  { value: 'advanced', label: 'Напреднали', color: '#f87171' },
                ].map((group) => {
                  const isSelected = selectedTargetGroups?.includes(group.value) || false;
                  return (
                    <button
                      key={group.value}
                      type="button"
                      onClick={() => toggleFilter('targetGroup', group.value)}
                      className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 relative ${
                        isSelected
                          ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
                          : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
                      }`}
                      style={!isSelected ? { borderBottom: `3px solid ${group.color}` } : {}}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="hidden md:inline text-[#cad5e2] text-xs mx-2">|</span>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[#94a3b8] text-xs leading-4 whitespace-nowrap">Години:</label>
              <div className="flex gap-[6px] flex-wrap">
                {[
                  { value: '4-6', label: '4-6' },
                  { value: '7-12', label: '7-12' },
                  { value: '13+', label: '13+' },
                ].map((ageGroup) => {
                  const isSelected = selectedAgeGroups?.includes(ageGroup.value) || false;
                  return (
                    <button
                      key={ageGroup.value}
                      type="button"
                      onClick={() => toggleFilter('ageGroup', ageGroup.value)}
                      className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
                          : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
                      }`}
                    >
                      {ageGroup.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Ден и Час - Desktop: на един ред, Mobile: отделни редове */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[#94a3b8] text-xs leading-4 whitespace-nowrap">Ден:</label>
              <div className="flex gap-[6px] flex-wrap">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
                  const dayIndex = day === 0 ? 6 : day - 1;
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleFilter('day', day)}
                      className={`h-[32px] px-[10px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
                          : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
                      }`}
                    >
                      {dayNamesShort[dayIndex]}
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="hidden md:inline text-[#cad5e2] text-xs mx-2">|</span>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[#94a3b8] text-xs leading-4 whitespace-nowrap">Час:</label>
              <div className="flex gap-[6px] flex-wrap">
                {getUniqueTimes().map((time) => {
                  const isSelected = selectedTimes.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => toggleFilter('time', time)}
                      className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
                          : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3: Тренировка */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[#94a3b8] text-xs leading-4 whitespace-nowrap">Тренировка:</label>
            <div className="flex gap-[6px] flex-wrap">
              {getUniqueTitles().map((title) => {
                const isSelected = selectedTitles.includes(title);
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => toggleFilter('title', title)}
                    className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] truncate max-w-[200px] font-normal transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
                        : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
                    }`}
                    title={title}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Премахни всички филтри */}
          {hasActiveFilters() && (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={clearAllFilters}
                className="h-[20px] text-xs leading-4 text-[#ff6900] hover:text-[#f54900] transition-all duration-200 hover:underline"
              >
                Премахни всички филтри
              </button>
            </div>
          )}

          {/* Reservation Section */}
          {showReservation && (
            <>
              {/* Divider */}
              <div className="border-t border-slate-200 my-[12px]"></div>
              
              {/* Reservation Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-[#94a3b8] text-xs leading-4 whitespace-nowrap">
                  <span className="hidden sm:inline">Резервирай за:</span>
                  <span className="sm:hidden">За:</span>
                </label>
                {/* Self profile option for climbers */}
                {user?.roles?.includes('climber') && (
                  <button
                    key="self"
                    type="button"
                    onClick={() => {
                      const selfId = 'self';
                      const selectedIds = (defaultSelectedClimberIds || []).map(id =>
                        typeof id === 'object' && id?.toString ? id.toString() : String(id)
                      );
                      const isSelected = selectedIds.includes(selfId);
                      if (isSelected) {
                        setDefaultSelectedClimberIds(prev => prev.filter(id => {
                          const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                          return idStr !== selfId;
                        }));
                      } else {
                        setDefaultSelectedClimberIds(prev => [...prev, selfId]);
                      }
                    }}
                    className={`h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 rounded-[8px] transition-all shrink-0 ${
                      (defaultSelectedClimberIds || []).some(id => {
                        const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                        return idStr === 'self';
                      })
                        ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-6 h-6 rounded-full bg-[#ff6900] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-normal">
                        {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'А'}
                      </span>
                    </div>
                    {/* Name */}
                    <div className="text-left min-w-0">
                      <div className="text-xs leading-4 font-normal text-[#0f172b] truncate">
                        {getUserDisplayName(user) || user?.email || 'Аз'}
                      </div>
                    </div>
                  </button>
                )}
                {/* Children options */}
                {children.map((climber) => {
                  const climberIdStr = typeof climber._id === 'object' && climber._id?.toString ? climber._id.toString() : String(climber._id);
                  const selectedIds = (defaultSelectedClimberIds || []).map(id =>
                    typeof id === 'object' && id?.toString ? id.toString() : String(id)
                  );
                  const isSelected = selectedIds.includes(climberIdStr);
                  
                  // Get first letter from first name for avatar
                  const firstLetter = climber.firstName?.[0]?.toUpperCase() || climber.lastName?.[0]?.toUpperCase() || '?';
                  
                  // Avatar color based on index
                  const avatarColors = ['bg-[#ff6900]', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                  const avatarColor = avatarColors[children.indexOf(climber) % avatarColors.length];
                  
                  return (
                    <button
                      key={climberIdStr}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setDefaultSelectedClimberIds(prev => prev.filter(id => {
                            const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                            return idStr !== climberIdStr;
                          }));
                        } else {
                          setDefaultSelectedClimberIds(prev => [...prev, climber._id]);
                        }
                      }}
                      className={`h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 rounded-[8px] transition-all shrink-0 ${
                        isSelected
                          ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center shrink-0`}>
                        <span className="text-white text-xs font-normal">
                          {firstLetter}
                        </span>
                      </div>
                      {/* Name */}
                      <div className="text-left min-w-0">
                        <div className="text-xs leading-4 font-normal text-[#0f172b] truncate">
                          {climber.firstName} {climber.lastName}
                        </div>
                      </div>
                    </button>
                  );
                })}
                
                {/* Add Child Button */}
                {(user?.roles?.includes('climber') || user?.roles?.includes('admin')) && (
                  <button
                    type="button"
                    onClick={onAddChild}
                    className="h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 border-dashed border-gray-300 rounded-[8px] hover:border-[#ff6900] hover:bg-orange-50 transition-all text-[#64748b] hover:text-[#ff6900] shrink-0"
                  >
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="text-xs leading-4 font-normal whitespace-nowrap">
                      Добави дете
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SessionFilters;
