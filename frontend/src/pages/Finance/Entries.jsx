import React, { useState, useEffect } from 'react';
import Button from '../../components/UI/Button';
import financeAPI from '../../services/financeService';
import { useToast } from '../../components/UI/Toast';

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('bg-BG', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
};

// Helper for date
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const TransactionDetailsModal = ({ transaction, onClose }) => {
    const [expandedEntryId, setExpandedEntryId] = useState(null);

    if (!transaction) return null;

    const toggleEntry = (id) => {
        setExpandedEntryId(expandedEntryId === id ? null : id);
    };

    const renderValue = (value) => {
        if (value === null || value === undefined) return <span className="text-gray-400 italic">null</span>;
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value); // Fallback for objects
        if (Array.isArray(value)) return value.length === 0 ? <span className="text-gray-400 italic">Empty Array</span> : value.join(', ');
        return String(value);
    };

    const DetailRow = ({ label, value }) => (
        <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-gray-100 last:border-0">
            <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">{label}</span>
            <span className="text-gray-900 font-mono text-sm break-all text-right sm:pl-4">{renderValue(value)}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                                    Детайли за транзакция <span className="text-gray-500 text-sm">#{transaction._id}</span>
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                                    <DetailRow label="Дата" value={formatDate(transaction.paidAt)} />
                                    <DetailRow label="Обща сума" value={formatCurrency(transaction.totalAmount)} />
                                    <DetailRow label="Обработил" value={transaction.handledById ? `${transaction.handledById.firstName} ${transaction.handledById.lastName} (${transaction.handledById._id})` : 'System'} />
                                    <DetailRow label="Създадена на" value={formatDate(transaction.createdAt)} />
                                </div>

                                <div className="mt-6 border-t border-gray-100 pt-4">
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Включени записи (Entries)</h4>
                                    <div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Продукт/Услуга</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">К-во</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ед. цена</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Общо</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Инфо</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {transaction.entries && transaction.entries.map((entry) => (
                                                    <React.Fragment key={entry._id}>
                                                        <tr
                                                            onClick={() => toggleEntry(entry._id)}
                                                            className={`cursor-pointer transition-colors ${expandedEntryId === entry._id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <td className="px-4 py-2 text-sm text-gray-900">{entry.description}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-500">{entry.itemType}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{entry.quantity}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(entry.unitAmount)}</td>
                                                            <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(entry.totalAmount)}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-500 text-center">
                                                                <span className="text-xs text-blue-600 underline">
                                                                    {expandedEntryId === entry._id ? 'Скрий' : 'Виж'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        {expandedEntryId === entry._id && (
                                                            <tr>
                                                                <td colSpan="6" className="px-0 py-0 bg-gray-50">
                                                                    <div className="p-4 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                                                        <div className="space-y-1">
                                                                            <strong className="block text-gray-900 border-b border-gray-200 pb-1 mb-2">Основна Информация</strong>
                                                                            <DetailRow label="_id" value={entry._id} />
                                                                            <DetailRow label="transactionId" value={entry.transactionId} />
                                                                            <DetailRow label="area" value={entry.area} />
                                                                            <DetailRow label="type" value={entry.type} />
                                                                            <DetailRow label="itemType" value={entry.itemType} />
                                                                            <DetailRow label="pricingCode" value={entry.pricingCode} />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <strong className="block text-gray-900 border-b border-gray-200 pb-1 mb-2">Финанси & К-во</strong>
                                                                            <DetailRow label="quantity" value={entry.quantity} />
                                                                            <DetailRow label="unitAmount" value={entry.unitAmount} />
                                                                            <DetailRow label="totalAmount" value={entry.totalAmount} />
                                                                            <DetailRow label="amount" value={entry.amount} />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <strong className="block text-gray-900 border-b border-gray-200 pb-1 mb-2">Връзки (IDs)</strong>
                                                                            <DetailRow label="climberId" value={entry.climberId} />
                                                                            <DetailRow label="gymPassId" value={entry.gymPassId} />
                                                                            <DetailRow label="gymVisitId" value={entry.gymVisitId} />
                                                                            <DetailRow label="trainingPassId" value={entry.trainingPassId} />
                                                                            <DetailRow label="productId" value={entry.productId} />
                                                                            <DetailRow label="createdById" value={entry.createdById} />
                                                                        </div>
                                                                        <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-1 mt-2">
                                                                            <strong className="block text-gray-900 border-b border-gray-200 pb-1 mb-2">Системни & Други</strong>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                <DetailRow label="description" value={entry.description} />
                                                                                <DetailRow label="sessionIds" value={entry.sessionIds} />
                                                                                <DetailRow label="date" value={entry.date} />
                                                                                <DetailRow label="createdAt" value={entry.createdAt} />
                                                                                <DetailRow label="updatedAt" value={entry.updatedAt} />
                                                                                <DetailRow label="__v" value={entry.__v} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50">
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-2 text-right font-medium text-gray-900">Общо:</td>
                                                    <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCurrency(transaction.totalAmount)}</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <Button variant="secondary" onClick={onClose}>
                            Затвори
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FinanceEntries = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
    });
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const { showToast } = useToast();

    // Mapping for content summary
    const getContentSummary = (transaction) => {
        if (!transaction.entries || transaction.entries.length === 0) return "Няма информация";

        // Simple heuristic
        if (transaction.entries.length === 1) {
            return transaction.entries[0].description;
        }

        const first = transaction.entries[0];
        const count = transaction.entries.length - 1;
        return `${first.description} + още ${count}`;
    };

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            // Use getTransactions API
            const response = await financeAPI.getTransactions(filters, { page, limit: 50 });
            setTransactions(response.data.transactions);
            setTotalPages(response.data.pagination.pages);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            showToast('Грешка при зареждане на транзакциите', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [page, filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    return (
        <div className="space-y-6"><TransactionDetailsModal transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-medium text-neutral-950">Финансови транзакции</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">История</h2>
                    <div className="flex gap-2 items-center flex-wrap">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                placeholder="От дата"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="date"
                                placeholder="До дата"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                            />
                        </div>
                        {(filters.startDate || filters.endDate) && (
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Изчисти дати
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Съдържание</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Сума</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                        Зареждане...
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                        Няма намерени транзакции
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr
                                        key={tx._id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setSelectedTransaction(tx)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                            #{tx._id.slice(-6).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(tx.paidAt)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate hover:text-orange-600 hover:underline">
                                            {getContentSummary(tx)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {tx.payerClimberId ? `${tx.payerClimberId.firstName} ${tx.payerClimberId.lastName}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                            {formatCurrency(tx.totalAmount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <Button
                            variant="secondary"
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            Предишна
                        </Button>
                        <span className="text-sm text-gray-700">
                            Страница {page} от {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            Следваща
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinanceEntries;
