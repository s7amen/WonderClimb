import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Card from '../UI/Card';

// MultiSelect Dropdown Component for climbers/children
const MultiSelectDropdown = ({ label, options, selectedValues, onToggle, getUserDisplayName, onAddChild, user, placeholder = 'Избери...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedButton = buttonRef.current && buttonRef.current.contains(event.target);
      const clickedDropdown = event.target.closest('[data-multiselect-dropdown]');

      if (!clickedButton && !clickedDropdown) {
        setIsOpen(false);
      }
    };

    const updatePosition = () => {
      if (buttonRef.current && isOpen) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside, true);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handleToggle = (value) => {
    onToggle(value);
    // Don't close dropdown on selection for multi-select
  };

  const displayText = selectedValues.length === 0
    ? placeholder
    : selectedValues.length === 1
      ? (() => {
        const selected = options.find(opt => {
          const optId = typeof opt.id === 'object' && opt.id?.toString ? opt.id.toString() : String(opt.id);
          const selectedId = typeof selectedValues[0] === 'object' && selectedValues[0]?.toString ? selectedValues[0].toString() : String(selectedValues[0]);
          return optId === selectedId;
        });
        return selected?.name || 'Избрано';
      })()
      : `Избрани ${selectedValues.length}`;

  const hasSelection = selectedValues.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap min-[480px]:flex-nowrap justify-start min-[480px]:overflow-x-auto">
      <label className="hidden min-[480px]:block text-[#94a3b8] text-xs leading-4 whitespace-nowrap text-left min-w-[120px]">{label}</label>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 flex items-center gap-2 min-w-[180px] justify-between ${hasSelection
            ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
            : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
            }`}
        >
          <span className="truncate flex-1 text-left">{displayText}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && createPortal(
          <div
            data-multiselect-dropdown
            className="fixed bg-white border border-[#cad5e2] rounded-[8px] shadow-lg z-[9999] min-w-[200px] max-w-[300px] max-h-[300px] overflow-y-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${Math.max(dropdownPosition.width, 200)}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.length === 0 ? (
              <div className="px-[12px] py-[8px] text-xs text-[#94a3b8]">
                Няма налични опции
              </div>
            ) : (
              <>
                {options.map((option, index) => {
                  const optionId = typeof option.id === 'object' && option.id?.toString ? option.id.toString() : String(option.id);
                  const isSelected = selectedValues.some(val => {
                    const valId = typeof val === 'object' && val?.toString ? val.toString() : String(val);
                    return valId === optionId;
                  });
                  const isFirst = index === 0;
                  const isLast = index === options.length - 1;

                  return (
                    <button
                      key={optionId}
                      type="button"
                      onClick={() => handleToggle(option.id)}
                      className={`w-full text-left px-[12px] py-[8px] text-xs leading-4 transition-all duration-200 flex items-center gap-2 ${isFirst ? 'rounded-t-[8px]' : ''
                        } ${isLast ? 'rounded-b-[8px]' : ''
                        } ${isSelected
                          ? 'bg-[#fff5f0] text-[#ff6900] font-medium'
                          : 'text-[#314158] hover:bg-gray-50'
                        }`}
                    >
                      {option.avatar && (
                        <div className={`w-6 h-6 rounded-full ${option.avatarColor || 'bg-[#ff6900]'} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-normal">
                            {option.avatar}
                          </span>
                        </div>
                      )}
                      <div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${isSelected
                        ? 'border-[#ff6900] bg-[#ff6900]'
                        : 'border-[#cad5e2]'
                        }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="truncate flex-1">{option.name}</span>
                    </button>
                  );
                })}
                {/* Add Child Button */}
                {onAddChild && (
                  <>
                    <div className="border-t border-[#cad5e2] my-1"></div>
                    <button
                      type="button"
                      onClick={() => {
                        onAddChild();
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-[12px] py-[8px] text-xs leading-4 transition-all duration-200 flex items-center gap-2 text-[#64748b] hover:text-[#ff6900] hover:bg-gray-50 rounded-b-[8px]"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="truncate">Добави дете</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

// Training Dropdown Component
const TrainingDropdown = ({ label, options, selectedValues, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both button and dropdown
      const clickedButton = buttonRef.current && buttonRef.current.contains(event.target);
      const clickedDropdown = event.target.closest('[data-dropdown-menu]');

      if (!clickedButton && !clickedDropdown) {
        setIsOpen(false);
      }
    };

    const updatePosition = () => {
      if (buttonRef.current && isOpen) {
        const rect = buttonRef.current.getBoundingClientRect();
        // Use getBoundingClientRect() which gives position relative to viewport
        // For fixed positioning, we use viewport coordinates directly
        setDropdownPosition({
          top: rect.bottom + 4, // 4px gap below button
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      // Calculate position when opening
      updatePosition();

      // Use capture phase for click outside
      document.addEventListener('mousedown', handleClickOutside, true);
      // Update position on scroll (keep dropdown in place)
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handleSelect = (value) => {
    // Single select - toggle the value (will be handled by parent component)
    // If "all" is selected, clear the selection by toggling current selection if any
    if (value === 'all') {
      // Clear all selections by toggling each selected value
      if (selectedValues.length > 0) {
        selectedValues.forEach(v => onToggle(v));
      }
    } else {
      // If another value is already selected, first clear it, then select new one
      if (selectedValues.length > 0 && !selectedValues.includes(value)) {
        selectedValues.forEach(v => onToggle(v));
      }
      onToggle(value);
    }
    setIsOpen(false); // Close dropdown after selection
  };

  const displayText = selectedValues.length === 0
    ? 'Всички тренировки'
    : selectedValues[0];

  const hasSelection = selectedValues.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap min-[480px]:flex-nowrap justify-start min-[480px]:overflow-x-auto">
      <label className="hidden min-[480px]:block text-[#94a3b8] text-xs leading-4 whitespace-nowrap text-left min-w-[120px]">{label}</label>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 flex items-center gap-2 min-w-[180px] justify-between ${hasSelection
            ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
            : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
            }`}
        >
          <span className="truncate flex-1 text-left">{displayText}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && createPortal(
          <div
            data-dropdown-menu
            className="fixed bg-white border border-[#cad5e2] rounded-[8px] shadow-lg z-[9999] min-w-[200px] max-w-[300px] max-h-[300px] overflow-y-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${Math.max(dropdownPosition.width, 200)}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.length === 0 ? (
              <div className="px-[12px] py-[8px] text-xs text-[#94a3b8]">
                Няма налични тренировки
              </div>
            ) : (
              <>
                {/* "Всички тренировки" option */}
                <button
                  key="all"
                  type="button"
                  onClick={() => handleSelect('all')}
                  className={`w-full text-left px-[12px] py-[8px] text-xs leading-4 transition-all duration-200 flex items-center gap-2 rounded-t-[8px] ${!hasSelection
                    ? 'bg-[#fff5f0] text-[#ff6900] font-medium'
                    : 'text-[#314158] hover:bg-gray-50'
                    }`}
                >
                  <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center flex-shrink-0 ${!hasSelection
                    ? 'border-[#ff6900] bg-[#ff6900]'
                    : 'border-[#cad5e2]'
                    }`}>
                    {!hasSelection && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="truncate">Всички тренировки</span>
                </button>
                {/* Training options */}
                {options.map((option, index) => {
                  const isSelected = selectedValues.includes(option);
                  const isLast = index === options.length - 1;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`w-full text-left px-[12px] py-[8px] text-xs leading-4 transition-all duration-200 flex items-center gap-2 ${isLast ? 'rounded-b-[8px]' : ''
                        } ${isSelected
                          ? 'bg-[#fff5f0] text-[#ff6900] font-medium'
                          : 'text-[#314158] hover:bg-gray-50'
                        }`}
                    >
                      <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected
                        ? 'border-[#ff6900] bg-[#ff6900]'
                        : 'border-[#cad5e2]'
                        }`}>
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="truncate">{option}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

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
  setDefaultSelectedClimberIds = () => { },
  getUserDisplayName = () => '',
  onAddChild = () => { },
  // Save filter props
  onSaveFilters = () => { },
  trainingLabels = { targetGroups: [], ageGroups: [], visibility: {} },
}) => {
  const visibility = {
    targetGroups: trainingLabels?.visibility?.targetGroups ?? true,
    ageGroups: trainingLabels?.visibility?.ageGroups ?? true,
    days: trainingLabels?.visibility?.days ?? true,
    times: trainingLabels?.visibility?.times ?? true,
    titles: trainingLabels?.visibility?.titles ?? true,
    reservations: trainingLabels?.visibility?.reservations ?? true,
  };

  // Check if any filter section is visible
  const hasVisibleTargetGroups = visibility.targetGroups && trainingLabels.targetGroups.length > 0;
  const hasVisibleAgeGroups = visibility.ageGroups && trainingLabels.ageGroups.length > 0;
  const hasVisibleDays = visibility.days;
  const hasVisibleTimes = visibility.times;
  const hasVisibleTitles = visibility.titles;
  const hasVisibleReservations = visibility.reservations && showReservation;

  // If no filters are visible, don't render the component
  const hasAnyVisibleFilter = hasVisibleTargetGroups || hasVisibleAgeGroups || hasVisibleDays || hasVisibleTimes || hasVisibleTitles || hasVisibleReservations;
  
  if (!hasAnyVisibleFilter) {
    return null;
  }

  return (
    <Card className="mb-4 bg-white/80 border border-slate-200 rounded-[16px] [&>div]:p-0 -mx-4 min-[900px]:mx-0">
      <div className="overflow-x-auto min-[900px]:overflow-visible" style={{ width: '100vw', maxWidth: '100%' }}>
        {/* Filter Icon - показва се само на мобилни устройства (под 900px), над филтрите */}
        <div className="flex items-center justify-end px-[16px] pt-[12px] min-[900px]:hidden">
          <svg
            className="w-5 h-5 text-[#94a3b8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div className="flex flex-col gap-[12px] pb-[12px] pt-[12px] px-[16px] min-[900px]:pt-[12px]">
          {/* Row 1: Подходящо за и Години - Desktop: на един ред, Mobile: отделни редове */}
          {/* Row 1: Подходящо за и Години */}
          {(visibility.targetGroups || visibility.ageGroups) && (
            <div className="flex flex-col min-[900px]:flex-row min-[900px]:items-center gap-2 min-[900px]:gap-2">
              {trainingLabels.targetGroups.length > 0 && visibility.targetGroups && (
                <div className="flex items-center gap-2 flex-wrap min-[480px]:flex-nowrap justify-start min-[480px]:overflow-x-auto">
                  <label className="hidden min-[480px]:block text-[#94a3b8] text-xs leading-4 whitespace-nowrap text-left min-w-[120px]">Подходящо за:</label>
                  <div className="flex gap-[6px] flex-wrap min-[480px]:flex-nowrap justify-start">
                    {trainingLabels.targetGroups.map((group) => {
                      const isSelected = selectedTargetGroups?.includes(group.slug) || false;
                      return (
                        <button
                          key={group.slug}
                          type="button"
                          onClick={() => toggleFilter('targetGroup', group.slug)}
                          className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 relative ${isSelected
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
              )}
              {trainingLabels.targetGroups.length > 0 && visibility.targetGroups && trainingLabels.ageGroups.length > 0 && visibility.ageGroups && (
                <span className="hidden min-[900px]:inline text-[#cad5e2] text-xs mx-2">|</span>
              )}
              {trainingLabels.ageGroups.length > 0 && visibility.ageGroups && (
                <div className="flex items-center gap-2 flex-wrap min-[480px]:flex-nowrap justify-start min-[480px]:overflow-x-auto">
                  <label className="hidden min-[480px]:block text-[#94a3b8] text-xs leading-4 whitespace-nowrap text-left min-w-[120px] min-[900px]:min-w-[60px]">Години:</label>
                  <div className="flex gap-[6px] flex-wrap min-[480px]:flex-nowrap justify-start">
                    {trainingLabels.ageGroups.map((ageGroup) => {
                      const isSelected = selectedAgeGroups?.includes(ageGroup.label) || false;
                      return (
                        <button
                          key={ageGroup.id}
                          type="button"
                          onClick={() => toggleFilter('ageGroup', ageGroup.label)}
                          className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 ${isSelected
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
              )}
            </div>
          )}

          {/* Row 2: Ден и Час - Desktop: на един ред, Mobile: отделни редове */}
          {(visibility.days || visibility.times) && (
            <div className="flex flex-col min-[900px]:flex-row min-[900px]:items-center gap-2 min-[900px]:gap-2">
              {visibility.days && (
                <div className="flex items-center gap-2 flex-wrap min-[480px]:flex-nowrap justify-start min-[480px]:overflow-x-auto">
                  <label className="hidden min-[480px]:block text-[#94a3b8] text-xs leading-4 whitespace-nowrap text-left min-w-[120px]">Ден:</label>
                  <div className="flex gap-[6px] flex-wrap min-[480px]:flex-nowrap justify-start">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                      const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
                      const dayIndex = day === 0 ? 6 : day - 1;
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleFilter('day', day)}
                          className={`h-[32px] px-[10px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 ${isSelected
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
              )}
              {visibility.days && visibility.times && (
                <span className="hidden min-[900px]:inline text-[#cad5e2] text-xs mx-2">|</span>
              )}
              {visibility.times && (
                <div className="flex items-center gap-2 flex-wrap min-[480px]:flex-nowrap justify-start min-[480px]:overflow-x-auto">
                  <label className="hidden min-[480px]:block text-[#94a3b8] text-xs leading-4 whitespace-nowrap text-left min-w-[120px] min-[900px]:min-w-[60px]">Час:</label>
                  <div className="flex gap-[6px] flex-wrap min-[480px]:flex-nowrap justify-start">
                    {getUniqueTimes().map((time) => {
                      const isSelected = selectedTimes.includes(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => toggleFilter('time', time)}
                          className={`h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] font-normal transition-all duration-200 ${isSelected
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
              )}
            </div>
          )}

          {/* Row 3: Тренировка */}
          {visibility.titles && (
            <TrainingDropdown
              label="Тренировка:"
              options={getUniqueTitles()}
              selectedValues={selectedTitles}
              onToggle={(value) => toggleFilter('title', value)}
            />
          )}

          {/* Reservation Section - moved under Тренировка */}
          {showReservation && visibility.reservations && (
            <MultiSelectDropdown
              label="Тренировка за:"
              options={[
                // Self option for climbers
                ...(user?.roles?.includes('climber') ? [{
                  id: 'self',
                  name: getUserDisplayName(user) || user?.email || 'Аз',
                  avatar: user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'А',
                  avatarColor: 'bg-[#ff6900]'
                }] : []),
                // Children options
                ...children.map((climber, index) => {
                  const climberId = climber._id;
                  const firstLetter = climber.firstName?.[0]?.toUpperCase() || climber.lastName?.[0]?.toUpperCase() || '?';
                  const avatarColors = ['bg-[#ff6900]', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                  return {
                    id: climberId,
                    name: `${climber.firstName} ${climber.lastName}`,
                    avatar: firstLetter,
                    avatarColor: avatarColors[index % avatarColors.length]
                  };
                })
              ]}
              selectedValues={defaultSelectedClimberIds}
              onToggle={(value) => {
                const valueId = typeof value === 'object' && value?.toString ? value.toString() : String(value);
                const selectedIds = (defaultSelectedClimberIds || []).map(id =>
                  typeof id === 'object' && id?.toString ? id.toString() : String(id)
                );
                const isSelected = selectedIds.includes(valueId);

                if (isSelected) {
                  setDefaultSelectedClimberIds(prev => prev.filter(id => {
                    const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                    return idStr !== valueId;
                  }));
                } else {
                  setDefaultSelectedClimberIds(prev => [...prev, value]);
                }
              }}
              getUserDisplayName={getUserDisplayName}
              onAddChild={(user?.roles?.includes('climber') || user?.roles?.includes('admin')) ? onAddChild : null}
              user={user}
            />
          )}

          {/* Премахни всички филтри и Запази филтър - с запазено място */}
          <div className="h-[20px] flex justify-center min-[900px]:justify-start items-center gap-2">
            {/* Filter Icon - в началото на реда */}
            <svg
              className="w-4 h-4 text-[#64748b] flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters()}
              className={`h-[20px] text-xs leading-4 transition-all duration-200 ${hasActiveFilters()
                ? 'text-[#ff6900] hover:text-[#f54900] hover:underline cursor-pointer'
                : 'text-[#94a3b8] cursor-not-allowed opacity-50'
                }`}
            >
              Премахни филтрите
            </button>
            {user && onSaveFilters && (
              <>
                <span className="text-[#cad5e2] text-xs">|</span>
                <button
                  type="button"
                  onClick={() => onSaveFilters()}
                  className="h-[20px] text-xs leading-4 text-[#ff6900] hover:text-[#f54900] transition-all duration-200 hover:underline"
                >
                  Запази филтрите
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SessionFilters;
