import React from 'react';
import Card from '../UI/Card';
import { format } from 'date-fns';

const RecentVisitsWidget = ({ visits, onAddVisit, onAddSingleVisit }) => {
    return (
        <Card className="p-6 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-medium text-neutral-950">Последни посещения</h3>
                <div className="flex gap-2">
                    <button
                        onClick={onAddVisit}
                        className="bg-[#ea7a24] hover:bg-[#d96a1a] text-white text-xs font-medium py-1.5 px-3 rounded-[6px] transition-colors flex items-center gap-1"
                    >
                        <span>+</span> С карта
                    </button>
                    <button
                        onClick={onAddSingleVisit}
                        className="bg-[#adb933] hover:bg-[#9db02a] text-white text-xs font-medium py-1.5 px-3 rounded-[6px] transition-colors flex items-center gap-1"
                    >
                        <span>+</span> Единично
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {visits.map((visit) => (
                    <div key={visit.id} className="flex justify-between items-start border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                        <div>
                            <p className="text-sm font-medium text-neutral-950">{visit.climberName}</p>
                            <p className="text-xs text-[#9ca3af]">{format(new Date(visit.date), 'HH:mm')}</p>
                        </div>
                        <span className={`
              text-xs px-2 py-1 rounded-[4px]
              ${visit.type === 'subscription' ? 'bg-[#fff7ed] text-[#ea7a24]' : 'bg-[#fefce8] text-[#adb933]'}
            `}>
                            {visit.typeLabel}
                        </span>
                    </div>
                ))}
                {visits.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Няма скорошни посещения</p>
                )}
            </div>
        </Card>
    );
};

export default RecentVisitsWidget;
