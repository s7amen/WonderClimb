import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '../../utils/constants';
import Card from '../UI/Card';

const SessionFilters = ({
  selectedDays,
  selectedTimes,
  selectedTitles,
  selectedTargetGroups = [],
  getUniqueTimes,
  getUniqueTitles,
  toggleFilter,
  clearAllFilters,
  hasActiveFilters,
  compact = false,
  sticky = false,
  onCollapseChange,
}) => {
  const [showMoreFilters, setShowMoreFilters] = useState(compact); // In compact mode, show all filters on desktop by default
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < BREAKPOINTS.MOBILE;
    }
    return false;
  });
  
  // Initialize collapsed state based on screen size (mobile = true, desktop = false)
  // In compact mode, never collapse on desktop
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      if (compact) {
        // In compact mode, only collapse on mobile
        return window.innerWidth < 768;
      }
      return window.innerWidth < BREAKPOINTS.MOBILE;
    }
    return false;
  });

  // Notify parent when collapse state changes
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  // Handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < BREAKPOINTS.MOBILE;
      setIsMobile(mobile);
      
      if (compact) {
        // In compact mode, always show filters on desktop
        if (!mobile && isCollapsed) {
          setIsCollapsed(false);
          setShowMoreFilters(true); // Show all filters including titles on desktop
        } else if (mobile && !isCollapsed) {
          // On mobile, allow collapsing
          // Keep current state
        }
      } else {
        // Original behavior for non-compact mode
        if (mobile && !isCollapsed) {
          // Keep current state
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed, compact]);
  
  // In compact mode on desktop, always show all filters
  // On mobile, always show all filters when expanded
  const shouldShowAllFilters = compact && !isMobile;
  const showTitleFilter = shouldShowAllFilters || showMoreFilters || (isMobile && !isCollapsed);

  return (
    <>
      <Card className={`${compact ? (isMobile ? 'mb-2' : 'mb-4') : (isMobile ? 'mb-2' : 'mb-6')} bg-white/80 border border-slate-200 rounded-[16px] ${sticky ? 'sticky top-0 z-10 shadow-sm' : ''} ${isMobile ? 'w-full' : ''} [&>div]:p-0`}>
        <div className="overflow-hidden">
          {/* Title - Hide on mobile */}
          {!isMobile && (
            <div className={`${compact ? 'pt-[12px] px-[16px] pb-0' : 'pt-[16px] px-[24px] pb-0'}`}>
              <h2 className={`text-[#cbd5e1] ${compact ? 'text-sm leading-5' : 'text-lg leading-7'} font-semibold uppercase`}>ФИЛТРИ</h2>
            </div>
          )}

          {/* Header with divider - Hide on mobile */}
          {!isMobile && (
            <div className={`flex justify-end items-center pb-px ${compact ? 'pt-[12px] px-[16px]' : 'pt-[16px] px-[24px]'} border-b border-slate-200`}>
            </div>
          )}

          {/* Filter content - показва се само ако не са скрити всички филтри */}
          {!isCollapsed && (
          <div className={`flex flex-col ${compact ? 'gap-[12px] pb-0 pt-[12px] px-[16px]' : 'gap-[24px] pb-0 pt-[24px] px-[24px]'}`}>
            {/* Target Groups filter - FIRST */}
            <div className={`flex ${compact ? 'flex-col items-start gap-2' : 'items-center gap-[16px]'} flex-wrap`}>
              <label className={`text-[#94a3b8] ${compact ? 'text-xs leading-4 w-full' : 'text-base leading-6 whitespace-nowrap hidden md:block w-[140px] shrink-0 text-right'}`}>{compact ? 'Подходящо за:' : ''}</label>
              <label className={`text-[#94a3b8] ${compact ? 'hidden' : 'text-base leading-6 whitespace-nowrap md:hidden shrink-0'}`}>Подходящо за:</label>
              <div className="flex gap-[6px] flex-wrap">
                {[
                  { value: 'beginner', label: 'Начинаещи' },
                  { value: 'experienced', label: 'Деца с опит' },
                  { value: 'advanced', label: 'Напреднали' },
                ].map((group) => {
                  const isSelected = selectedTargetGroups?.includes(group.value) || false;
                  return (
                    <button
                      key={group.value}
                      type="button"
                      onClick={() => toggleFilter('targetGroup', group.value)}
                      className={`${compact ? 'h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px]' : 'h-[42px] px-[17px] py-[7px] text-base leading-6 rounded-[10px]'} font-normal transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
                          : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
                      }`}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Days filter - SECOND */}
            <div className={`flex ${compact ? 'flex-col items-start gap-2' : 'items-center gap-[16px]'} flex-wrap`}>
              <label className={`text-[#94a3b8] ${compact ? 'text-xs leading-4 w-full' : 'text-base leading-6 whitespace-nowrap hidden md:block w-[140px] shrink-0 text-right'}`}>{compact ? 'Ден:' : ''}</label>
              <label className={`text-[#94a3b8] ${compact ? 'hidden' : 'text-base leading-6 whitespace-nowrap md:hidden shrink-0'}`}>Ден:</label>
              <div className="flex gap-[6px] flex-wrap">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
                  const dayNamesFull = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];
                  const dayIndex = day === 0 ? 6 : day - 1;
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleFilter('day', day)}
                      className={`${compact ? 'h-[32px] px-[10px] py-[6px] text-xs leading-4 rounded-[8px]' : 'h-[42px] px-[17px] py-[7px] text-base leading-6 rounded-[10px]'} font-normal transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#ff6900] border border-[#ff6900] text-white hover:bg-[#f54900]'
                          : 'bg-white border border-[#cad5e2] text-[#314158] hover:bg-gray-50 hover:border-[#ff6900] hover:text-[#ff6900]'
                      }`}
                    >
                      <span className="md:hidden">{dayNamesShort[dayIndex]}</span>
                      <span className="hidden md:inline">{compact ? dayNamesShort[dayIndex] : dayNamesFull[dayIndex]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time filter - THIRD */}
            <div className={`flex ${compact ? 'flex-col items-start gap-2' : 'items-center gap-[16px]'} flex-wrap`}>
              <label className={`text-[#94a3b8] ${compact ? 'text-xs leading-4 w-full' : 'text-base leading-6 whitespace-nowrap hidden md:block w-[140px] shrink-0 text-right'}`}>{compact ? 'Час:' : ''}</label>
              <label className={`text-[#94a3b8] ${compact ? 'hidden' : 'text-base leading-6 whitespace-nowrap md:hidden shrink-0'}`}>Час:</label>
              <div className="flex gap-[6px] flex-wrap">
                {getUniqueTimes().map((time) => {
                  const isSelected = selectedTimes.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => toggleFilter('time', time)}
                      className={`${compact ? 'h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px]' : 'h-[42px] px-[17px] py-[7px] text-base leading-6 rounded-[10px]'} font-normal transition-all duration-200 ${
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

            {/* Title filter - FOURTH - Always show on desktop in compact mode, otherwise show when showMoreFilters is true */}
            {showTitleFilter && (
              <div className={`flex ${compact ? 'flex-col items-start gap-2' : 'items-center gap-[16px]'} flex-wrap`}>
                <label className={`text-[#94a3b8] ${compact ? 'text-xs leading-4 w-full' : 'text-base leading-6 whitespace-nowrap hidden md:block w-[140px] shrink-0 text-right'}`}>{compact ? 'Тренировка:' : ''}</label>
                <label className={`text-[#94a3b8] ${compact ? 'hidden' : 'text-base leading-6 whitespace-nowrap md:hidden shrink-0'}`}>Тренировка:</label>
                <div className="flex gap-[6px] flex-wrap">
                  {getUniqueTitles().map((title) => {
                    const isSelected = selectedTitles.includes(title);
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => toggleFilter('title', title)}
                        className={`${compact ? 'h-[32px] px-[12px] py-[6px] text-xs leading-4 rounded-[8px] truncate max-w-[200px]' : 'h-[42px] px-[17px] py-[7px] text-base leading-6 rounded-[10px] truncate max-w-[300px]'} font-normal transition-all duration-200 ${
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
            )}

            {/* Премахни всички филтри и Скрий филтри бутони - под филтрите */}
            <div className="flex flex-col gap-2">
              {/* Премахни всички филтри */}
              {hasActiveFilters() && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className={`${compact ? 'h-[20px] text-xs leading-4' : 'h-[24px] text-base leading-6'} text-[#ff6900] hover:text-[#f54900] transition-all duration-200 hover:underline`}
                  >
                    Премахни всички филтри
                  </button>
                </div>
              )}
              
              {/* Скрий филтри бутон - Hide on desktop in compact mode */}
              {(!compact || isMobile) && !isMobile && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (showMoreFilters) {
                        // Ако допълнителните филтри са показани, скрий всички филтри
                        setIsCollapsed(true);
                        setShowMoreFilters(false);
                      } else {
                        // Покажи допълнителните филтри
                        setShowMoreFilters(true);
                      }
                    }}
                    className={`${compact ? 'h-[20px] text-xs leading-4' : 'h-[24px] text-base leading-6'} text-[#ff6900] hover:text-[#f54900] transition-all duration-200 hover:underline`}
                  >
                    {showMoreFilters ? 'Скрий филтри' : 'Покажи още филтри'}
                  </button>
                </div>
              )}
              
              {/* Скрий филтри бутон за мобилно */}
              {isMobile && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCollapsed(true);
                      setShowMoreFilters(false);
                    }}
                    className="h-[20px] text-xs leading-4 text-[#ff6900] hover:text-[#f54900] transition-all duration-200 hover:underline"
                  >
                    Скрий филтри
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
          
          {/* Show All Filters Button - показва се само когато всички филтри са скрити - Hide on desktop in compact mode */}
          {isCollapsed && (!compact || isMobile) && (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(false);
                  if (compact || isMobile) {
                    setShowMoreFilters(true); // Show all filters when expanding in compact mode or on mobile
                  }
                }}
                className={`${compact ? 'text-xs leading-4' : 'text-base leading-6'} text-[#ff6900] hover:text-[#f54900] transition-all duration-200 hover:underline`}
              >
                Покажи филтри
              </button>
            </div>
          )}
        </div>
      </Card>

    </>
  );
};

export default SessionFilters;

