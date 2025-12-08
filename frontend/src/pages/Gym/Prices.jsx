import React, { useState, useEffect } from 'react';
import { pricingAPI } from '../../services/api';
import { getCategoryLabel } from '../../constants/pricing';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';

const GymPrices = () => {
    const { showToast } = useToast();
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('');

    useEffect(() => {
        fetchPrices();
    }, []);

    const fetchPrices = async () => {
        try {
            setLoading(true);
            // Fetch ALL active prices
            const response = await pricingAPI.getActive();
            const allPrices = response.data.data || [];

            // Filter for gym-related categories on frontend
            const gymPrices = allPrices.filter(price =>
                price.category === 'gym_pass' ||
                price.category === 'gym_single_visit'
            );

            setPrices(gymPrices);
        } catch (error) {
            console.error('Error fetching prices:', error);
            showToast('Грешка при зареждане на цените', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredPrices = filterCategory
        ? prices.filter(price => price.category === filterCategory)
        : prices;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading text="Зареждане на ценоразпис..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">{/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-medium text-neutral-950">Ценоразпис на залата</h1>
                </div>

                {/* Filter */}
                <div className="w-64">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm text-gray-900"
                    >
                        <option value="">Всички категории</option>
                        <option value="gym_single_visit">Единично посещение</option>
                        <option value="gym_pass">Карти</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Заглавие</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сума</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Валидност</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Макс. посещения</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPrices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                        Няма намерени цени
                                    </td>
                                </tr>
                            ) : (
                                filteredPrices.map((price) => (
                                    <tr key={price._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {price.labelBg}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {getCategoryLabel(price.category)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-600">
                                            {price.amount.toFixed(2)} €
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {price.validityDays ? `${price.validityDays} дни` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {price.maxEntries || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GymPrices;
