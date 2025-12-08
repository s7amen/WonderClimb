import React, { useState, useEffect } from 'react';
import financeAPI from '../../services/financeService';
import { useToast } from '../../components/UI/Toast';

const GymReport = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dates, setDates] = useState({
        startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
        endDate: new Date().toISOString().split('T')[0] // Today
    });
    const { showToast } = useToast();

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await financeAPI.getGymReport(dates.startDate, dates.endDate);
            setReport(response.data.report);
        } catch (error) {
            console.error('Error fetching gym report:', error);
            showToast('Грешка при зареждане на отчета', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (dates.startDate && dates.endDate) {
            fetchReport();
        }
    }, [dates]);

    const handleDateChange = (key, value) => {
        setDates(prev => ({ ...prev, [key]: value }));
    };

    const setQuickDate = (range) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (range) {
            case 'today':
                break; // start and end are already today
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                end.setDate(today.getDate() - 1);
                break;
            case 'week':
                start.setDate(today.getDate() - 6); // Last 7 days
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            default:
                break;
        }

        setDates({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('bg-BG', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('bg-BG', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">{/* Header & Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h1 className="text-2xl font-medium text-neutral-950">Отчет: Приходи от зала</h1>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setQuickDate('today')}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            Днес
                        </button>
                        <button
                            onClick={() => setQuickDate('week')}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            Седмица
                        </button>
                        <button
                            onClick={() => setQuickDate('month')}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            Месец
                        </button>
                        <button
                            onClick={() => setQuickDate('lastMonth')}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            Предходен месец
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 border-t pt-4">
                    <span className="text-sm text-gray-500">Период:</span>
                    <input
                        type="date"
                        value={dates.startDate}
                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm p-1.5 border"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={dates.endDate}
                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm p-1.5 border"
                    />
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex justify-center">
                    <div className="text-gray-500">Зареждане на данни...</div>
                </div>
            ) : report ? (
                <>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <span className="text-sm text-gray-500 block mb-1">Приходи общо</span>
                            <span className="text-2xl font-bold text-green-600 block">{formatCurrency(report.income?.total)}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <span className="text-sm text-gray-500 block mb-1">Разходи общо</span>
                            <span className="text-2xl font-bold text-red-500 block">{formatCurrency(report.expenses?.total)}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <span className="text-sm text-gray-500 block mb-1">Нетен резултат</span>
                            <span className={`text-2xl font-bold block ${report.netRevenue >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                                {formatCurrency(report.netRevenue)}
                            </span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <span className="text-sm text-gray-500 block mb-1">От Карти</span>
                            <span className="text-xl font-bold text-blue-600 block">{formatCurrency(report.income?.cards)}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <span className="text-sm text-gray-500 block mb-1">От Посещения</span>
                            <span className="text-xl font-bold text-teal-600 block">{formatCurrency(report.income?.visits)}</span>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Движения за периода</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Дата</th>
                                        <th className="px-6 py-3">Тип</th>
                                        <th className="px-6 py-3">Вид</th>
                                        <th className="px-6 py-3">Описание</th>
                                        <th className="px-6 py-3 text-right">Сума</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(report.transactions || []).length > 0 ? (
                                        report.transactions.map((tx) => (
                                            <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                    {formatDate(tx.date)}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${tx.type === 'income'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {tx.type === 'income' ? 'Приход' : 'Разход'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap capitalize">
                                                    {tx.category === 'subscription' ? 'Карта' :
                                                        tx.category === 'visit' ? 'Посещение' :
                                                            tx.category === 'expense' ? 'Разход' : tx.category}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900">
                                                    <div className="font-medium">{tx.description}</div>
                                                    {tx.details && <div className="text-xs text-gray-500">{tx.details}</div>}
                                                </td>
                                                <td className={`px-6 py-3 text-sm font-bold text-right whitespace-nowrap ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'
                                                    }`}>
                                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                                Няма намерени записи за този период
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-500 p-12">
                    Изберете период за преглед на отчета
                </div>
            )}
        </div>
    );
};

export default GymReport;


