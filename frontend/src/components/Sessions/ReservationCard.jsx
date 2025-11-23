import { forwardRef } from 'react';
import Card from '../UI/Card';
import { getUserDisplayName } from '../../utils/userUtils';
import { normalizeId, compareIds } from '../../utils/idUtils';

const ReservationCard = forwardRef(({
  user,
  children,
  defaultSelectedClimberIds,
  setDefaultSelectedClimberIds,
  onAddChildClick,
}, ref) => {
  if (!user || (!user?.roles?.includes('climber') && !user?.roles?.includes('admin'))) {
    return null;
  }

  if (children.length === 0 && !user?.roles?.includes('climber')) {
    return null;
  }

  const handleToggleSelf = () => {
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
  };

  const handleToggleClimber = (climberId) => {
    const climberIdStr = normalizeId(climberId);
    const selectedIds = (defaultSelectedClimberIds || []).map(id =>
      typeof id === 'object' && id?.toString ? id.toString() : String(id)
    );
    const isSelected = selectedIds.includes(climberIdStr);
    
    if (isSelected) {
      setDefaultSelectedClimberIds(prev => prev.filter(id => {
        const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
        return idStr !== climberIdStr;
      }));
    } else {
      setDefaultSelectedClimberIds(prev => [...prev, climberId]);
    }
  };

  const isSelfSelected = (defaultSelectedClimberIds || []).some(id => {
    const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
    return idStr === 'self';
  });

  const avatarColors = ['bg-[#ff6900]', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];

  return (
    <Card ref={ref} className="bg-white/80 border border-slate-200 rounded-[16px]">
      <div className="overflow-hidden">
        {/* Title */}
        <div className="pt-[12px] px-[16px] pb-0">
          <h2 className="text-[#cbd5e1] text-sm leading-5 font-semibold uppercase">РЕЗЕРВАЦИЯ ЗА:</h2>
        </div>

        {/* Header with divider */}
        <div className="flex justify-end items-center pb-px pt-[12px] px-[16px] border-b border-slate-200">
        </div>

        {/* Content */}
        <div className="px-[16px] pt-[12px] pb-[12px]">
          <div className="flex flex-col gap-2">
            {/* Self profile option for climbers */}
            {user?.roles?.includes('climber') && (
              <button
                key="self"
                type="button"
                onClick={handleToggleSelf}
                className={`h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 rounded-[8px] transition-all ${
                  isSelfSelected
                    ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full bg-[#ff6900] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-medium">
                    {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'А'}
                  </span>
                </div>
                {/* Name */}
                <div className="text-left flex-1 min-w-0">
                  <div className="text-xs leading-4 font-normal text-[#0f172b] truncate">
                    {getUserDisplayName(user) || user?.email || 'Аз'}
                  </div>
                </div>
              </button>
            )}
            
            {/* Children options */}
            {children.map((climber, index) => {
              const climberIdStr = normalizeId(climber._id);
              const selectedIds = (defaultSelectedClimberIds || []).map(id =>
                typeof id === 'object' && id?.toString ? id.toString() : String(id)
              );
              const isSelected = selectedIds.includes(climberIdStr);
              
              const firstLetter = climber.firstName?.[0]?.toUpperCase() || climber.lastName?.[0]?.toUpperCase() || '?';
              const avatarColor = avatarColors[index % avatarColors.length];
              
              return (
                <button
                  key={climberIdStr}
                  type="button"
                  onClick={() => handleToggleClimber(climber._id)}
                  className={`h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 rounded-[8px] transition-all ${
                    isSelected
                      ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-xs font-medium">
                      {firstLetter}
                    </span>
                  </div>
                  {/* Name */}
                  <div className="text-left flex-1 min-w-0">
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
                onClick={onAddChildClick}
                className="h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 border-dashed border-gray-300 rounded-[8px] hover:border-[#ff6900] hover:bg-orange-50 transition-all text-[#64748b] hover:text-[#ff6900]"
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
          {(!defaultSelectedClimberIds || defaultSelectedClimberIds.length === 0) && (
            <p className="text-[10px] text-blue-600 font-medium mt-2">
              Моля, изберете поне един катерач преди резервиране на тренировки
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});

ReservationCard.displayName = 'ReservationCard';

export default ReservationCard;

