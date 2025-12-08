import React from 'react';
import Card from '../UI/Card';
import { format } from 'date-fns';

const ActiveCardsWidget = ({ cards, onAddCard, filter, onFilterChange }) => {
    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-medium text-neutral-950">Карти</h3>
                <div className="flex items-center gap-2">
                    <select
                        value={filter}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="bg-[#f3f3f5] border-none text-xs rounded-[6px] py-1.5 px-2 text-[#4a5565] focus:ring-0"
                    >
                        <option value="last_created">Последни карти</option>
                        <option value="expiring">Изтичащи</option>
                        <option value="expired">Изтекли</option>
                    </select>
                    <button
                        onClick={onAddCard}
                        className="bg-[#ea7a24] hover:bg-[#d96a1a] text-white text-xs font-medium py-1.5 px-3 rounded-[6px] transition-colors flex items-center gap-1"
                    >
                        <span>+</span> Нова
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {cards.map((card) => (
                    <div key={card.id} className="flex justify-between items-start border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                        <div>
                            <p className="text-sm font-medium text-neutral-950">{card.climberName}</p>
                            <p className="text-xs text-[#9ca3af]">
                                {card.type}
                                {card.remainingVisits !== null && card.remainingVisits !== undefined && ` • ${card.remainingVisits} остават`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-[#4a5565]">{format(new Date(card.expiryDate), 'dd.MM.yyyy')}</p>
                            <p className="text-[10px] text-[#9ca3af]">
                                {filter === 'last_created' && card.createdAt && `Създ: ${format(new Date(card.createdAt), 'dd.MM.yyyy')}`}
                            </p>
                        </div>

                    </div>
                ))}
                {cards.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Няма намерени карти</p>
                )}
            </div>
        </Card>
    );
};

export default ActiveCardsWidget;
