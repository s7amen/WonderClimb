import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { bg } from 'date-fns/locale';
import { trainingService } from '../../services/trainingService';
import BookingDetailsModal from '../../components/Training/BookingDetailsModal';
import Loading from '../../components/UI/Loading';
import EmptyState from '../../components/UI/EmptyState';

// Inline SVG Icons
const FilterIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const CalendarIcon = ({ className = "w-12 h-12" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const MoreVerticalIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
);

const CreditCardIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const UserIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const TrainingBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        dateRange: 'upcoming' // upcoming, past, all
    });

    // Modal state
    const [selectedBooking, setSelectedBooking] = useState(null);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const data = await trainingService.getAllBookings({
                status: filters.status === 'all' ? '' : filters.status,
            });
            setBookings(data.bookings || []);
        } catch (error) {
            console.error('Failed to fetch bookings', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [filters]);

    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Сигурни ли сте, че искате да откажете тази резервация?')) return;

        try {
            await trainingService.cancelBooking(bookingId);
            // Refresh list and close modal
            fetchBookings();
            setSelectedBooking(null);
        } catch (error) {
            alert('Грешка при отказване на резервацията');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'booked':
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Активна</span>;
            case 'cancelled':
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Отказана</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const getTypeLabel = (booking) => {
        if (booking.trainingPassId) return 'Карта';
        if (booking.pricingId) return 'Еднократно';
        return '-';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-medium text-neutral-950">Резервации</h1>

                {/* Filters */}
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                        <FilterIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Филтри:</span>
                    </div>

                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="text-sm border-none bg-transparent focus:ring-0 text-gray-700 font-medium cursor-pointer hover:bg-gray-50 rounded-lg py-1 pl-2 pr-8"
                    >
                        <option value="">Всички статуси</option>
                        <option value="booked">Активни</option>
                        <option value="cancelled">Отказани</option>
                    </select>

                    <div className="w-px h-4 bg-gray-200"></div>

                    <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                        className="text-sm border-none bg-transparent focus:ring-0 text-gray-700 font-medium cursor-pointer hover:bg-gray-50 rounded-lg py-1 pl-2 pr-8"
                    >
                        <option value="upcoming">Предстоящи</option>
                        <option value="past">Минали</option>
                        <option value="all">Всички</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loading />
                </div>
            ) : bookings.length === 0 ? (
                <EmptyState
                    title="Няма намерени резервации"
                    description="Няма резервации, отговарящи на избраните критерии."
                    icon={<CalendarIcon className="w-12 h-12" />}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Резервирана</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Тренировка (Дата)</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Тренировка</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">От</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Резервация За</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bookings.map((booking) => (
                                    <tr key={booking._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900">
                                                {format(new Date(booking.createdAt), 'dd MMM yyyy HH:mm', { locale: bg })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900">
                                                {booking.sessionId?.date && format(new Date(booking.sessionId.date), 'dd MMM yyyy HH:mm', { locale: bg })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900 font-medium">{booking.sessionId?.title || 'Unknown Session'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-700">
                                                {booking.bookedById?.firstName} {booking.bookedById?.lastName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedBooking(booking)}
                                                className="flex items-center gap-2 hover:text-primary-600 transition-colors"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium text-xs">
                                                    {booking.climberId?.firstName?.[0]}{booking.climberId?.lastName?.[0]}
                                                </div>
                                                <span className="text-sm text-gray-900 font-medium">
                                                    {booking.climberId?.firstName} {booking.climberId?.lastName}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                {booking.trainingPassId ? <CreditCardIcon /> : <UserIcon />}
                                                <span className="text-sm">{getTypeLabel(booking)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(booking.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => setSelectedBooking(booking)}
                                                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <MoreVerticalIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {selectedBooking && (
                <BookingDetailsModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onCancel={handleCancelBooking}
                />
            )}
        </div>
    );
};

export default TrainingBookings;
