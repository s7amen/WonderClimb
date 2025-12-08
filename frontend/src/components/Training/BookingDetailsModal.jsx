import React from 'react';
import { format } from 'date-fns';
import { bg } from 'date-fns/locale';

// Inline SVG Icons
const XIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CalendarIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const UserIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const ClockIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CreditCardIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const BanIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
);

const BookingDetailsModal = ({ booking, onClose, onCancel }) => {
    if (!booking) return null;

    const {
        sessionId,
        climberId: climber,
        status,
        pricingId,
        trainingPassId,
        bookedById,
        createdAt
    } = booking;

    const session = sessionId; // populated
    const isCancelled = status === 'cancelled';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-semibold text-gray-900">Детайли за резервация</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1: Climber Info & Status */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Клиент</h3>
                            <div className="flex items-start gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl">
                                    <UserIcon className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-gray-900">
                                        {climber ? `${climber.firstName} ${climber.lastName}` : 'Unknown'}
                                    </p>
                                    <p className="text-gray-500 text-sm">{climber?.email}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Статус</h3>
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${isCancelled
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-green-50 text-green-700 border border-green-200'
                                }`}>
                                {isCancelled ? 'Отказана' : 'Активна'}
                            </div>

                            <div className="mt-4 space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Резервирана от:</span>
                                    <span className="font-medium text-gray-900">{bookedById?.firstName} {bookedById?.lastName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Дата на създаване:</span>
                                    <span className="font-medium text-gray-900">
                                        {format(new Date(createdAt), 'dd MMMM yyyy HH:mm', { locale: bg })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Session Info & Payment */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Тренировка</h3>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="font-semibold text-gray-900 mb-1">{session?.title || 'Unknown Session'}</p>

                                <div className="space-y-2 mt-3 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <CalendarIcon className="w-4 h-4" />
                                        <span>
                                            {session?.date && format(new Date(session.date), 'dd MMMM yyyy (EEEE)', { locale: bg })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>
                                            {session?.date && format(new Date(session.date), 'HH:mm')}
                                            {session?.durationMinutes && ` (${session.durationMinutes} мин)`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Тип</h3>
                            <div className="flex items-center gap-3 text-gray-700">
                                <CreditCardIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="font-medium">
                                        {trainingPassId ? 'Карта за тренировки' : (pricingId ? 'Еднократно посещение' : 'Няма информация')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {trainingPassId ? 'С абонаментна карта' : 'Еднократна резервация'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                        Затвори
                    </button>
                    {!isCancelled && (
                        <button
                            onClick={() => onCancel(booking._id)}
                            className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors flex items-center gap-2"
                        >
                            <BanIcon className="w-4 h-4" />
                            Откажи резервация
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingDetailsModal;
