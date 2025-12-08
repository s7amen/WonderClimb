import { useState, useEffect } from 'react';
import { gymAPI } from '../../services/api';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import GymCheckInModal from '../../components/Modals/GymCheckInModal';
import { formatDate } from '../../utils/dateUtils';
import { getUserFullName } from '../../utils/userUtils';

const GymVisits = () => {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

    // Filter by date (optional now)
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        fetchVisits(1);
    }, [selectedDate]);

    const fetchVisits = async (page = 1) => {
        try {
            setLoading(true);
            const params = {
                limit: 20,
                page
            };

            if (selectedDate) {
                params.startDate = selectedDate;
                params.endDate = selectedDate;
            }

            const response = await gymAPI.getVisits(params);
            setVisits(response.data.visits || []);

            if (response.data.pagination) {
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching visits:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchVisits(newPage);
        }
    };

    const handleCheckInSuccess = () => {
        fetchVisits(pagination.page);
    };

    const getVisitTypeLabel = (type) => {
        switch (type) {
            case 'pass': return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">Карта</span>;
            case 'single': return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">Единично</span>;
            case 'multisport': return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">MultiSport</span>;
            default: return type;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-medium text-neutral-950">История на посещенията</h1>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                        placeholder="Филтър по дата"
                    />
                    {selectedDate && (
                        <Button variant="secondary" onClick={() => setSelectedDate('')}>
                            Изчисти
                        </Button>
                    )}
                    <Button variant="primary" onClick={() => setShowCheckInModal(true)}>
                        + Ново посещение
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8"><Loading /></div>
                ) : (
                    <div className="p-0">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Час</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Детайли</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {visits.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500 italic">
                                            Няма записани посещения.
                                        </td>
                                    </tr>
                                ) : (
                                    visits.map(visit => {
                                        const visitDate = new Date(visit.date);
                                        // Amount is already in EUR, no conversion needed
                                        const priceInEur = visit.amount ? visit.amount.toFixed(2) : '0.00';

                                        return (
                                            <tr key={visit._id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {visitDate.toLocaleDateString('bg-BG')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {visitDate.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {visit.userId ? getUserFullName(visit.userId) : (
                                                        visit.familyId ? (
                                                            <span className="text-orange-600">{visit.familyId.name}</span>
                                                        ) : (
                                                            <span className="text-gray-400 italic">Гост</span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {getVisitTypeLabel(visit.type)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                    &euro;{priceInEur}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {visit.type === 'pass' && visit.gymPassId && (
                                                        <span className="text-xs text-gray-400">Card: ...{visit.gymPassId.toString().slice(-4)}</span>
                                                    )}
                                                    {visit.notes && <span className="block text-xs text-gray-400 italic">{visit.notes}</span>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <Button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Предишна
                                </Button>
                                <Button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Следваща
                                </Button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Показване на <span className="font-medium">{visits.length > 0 ? (pagination.page - 1) * 20 + 1 : 0}</span> до <span className="font-medium">{Math.min(pagination.page * 20, pagination.total)}</span> от <span className="font-medium">{pagination.total}</span> резултата
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page <= 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>

                                        {/* Simple page indicator for now */}
                                        <div className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                            Страница {pagination.page} от {pagination.pages}
                                        </div>

                                        <button
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page >= pagination.pages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <GymCheckInModal
                isOpen={showCheckInModal}
                onClose={() => setShowCheckInModal(false)}
                onSuccess={handleCheckInSuccess}
            />
        </div>
    );
};

export default GymVisits;
