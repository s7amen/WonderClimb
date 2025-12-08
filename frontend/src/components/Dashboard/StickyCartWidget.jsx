import React from 'react';
import Card from '../UI/Card';

const StickyCartWidget = ({ items = [], total = 0, onFinalize, onRemoveItem }) => {
    return (
        <div className="sticky-cart-container">
            <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-neutral-950 flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#ea7a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Текуща продажба
                    </h3>
                    {items.length > 0 && (
                        <span className="bg-[#ea7a24] text-white text-xs font-medium px-2 py-0.5 rounded-full">
                            {items.length}
                        </span>
                    )}
                </div>

                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between pb-3 border-b border-gray-100 last:border-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-950 mb-1">{item.climberName}</p>
                                <p className="text-xs text-[#9ca3af]">{item.productName}</p>
                                <p className="text-xs text-[#9ca3af]">{item.quantity} × {item.price.toFixed(2)} €</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <p className="text-sm font-medium text-[#ea7a24] whitespace-nowrap">
                                    {(item.quantity * item.price).toFixed(2)} €
                                </p>
                                <button
                                    onClick={() => onRemoveItem(item.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-center py-8">
                            <svg className="w-16 h-16 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <p className="text-sm text-gray-400">Няма добавени артикули</p>
                            <p className="text-xs text-gray-300 mt-1">Използвайте бутоните отляво</p>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-[#9ca3af]">Артикули:</p>
                        <p className="text-sm font-medium text-neutral-950">{items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <p className="text-sm font-medium text-neutral-950">Обща сума:</p>
                        <p className="text-xl font-bold text-[#ea7a24]">{total.toFixed(2)} €</p>
                    </div>
                    <button
                        onClick={onFinalize}
                        disabled={items.length === 0}
                        className="w-full bg-[#ea7a24] hover:bg-[#d96a1a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-4 rounded-[10px] transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Финализирай продажбата
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default StickyCartWidget;
