import React from 'react';
import Card from '../UI/Card';

const CurrentSaleItemsList = ({ items = [], title = "Добавени в текуща продажба" }) => {
    return (
        <Card className="p-4">
            <h4 className="text-sm font-medium text-[#4a5565] mb-3">{title}</h4>

            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-xs border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                        <div className="flex-1 min-w-0">
                            <p className="text-neutral-950 font-medium truncate">{item.climberName || item.productName}</p>
                            <p className="text-[#9ca3af]">{item.quantity} × {item.price.toFixed(2)} лв</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                            <button
                                className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                                title="Премахни"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">Няма добавени артикули</p>
                )}
            </div>
        </Card>
    );
};

export default CurrentSaleItemsList;
