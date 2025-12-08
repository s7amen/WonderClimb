import React from 'react';

const StatsCard = ({ title, value, action, actionLabel, variant = 'default' }) => {
    const getButtonColor = () => {
        switch (variant) {
            case 'green': return 'bg-[#adb933] hover:bg-[#9db02a]';
            case 'orange': return 'bg-[#ea7a24] hover:bg-[#d96a1a]';
            default: return 'bg-[#ea7a24] hover:bg-[#d96a1a]';
        }
    };

    return (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-4">
            <div className="flex flex-row flex-nowrap items-center justify-center gap-3">
                <div className="flex flex-row flex-nowrap items-baseline gap-2">
                    <h3 className="text-sm text-[#4a5565] font-medium whitespace-nowrap">{title}</h3>
                    <span className="text-lg font-bold text-neutral-950 whitespace-nowrap">{value}</span>
                </div>
                {action && (
                    <button
                        onClick={action}
                        className={`${getButtonColor()} text-white text-xs font-medium py-1.5 px-3 rounded-[6px] transition-colors whitespace-nowrap`}
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
