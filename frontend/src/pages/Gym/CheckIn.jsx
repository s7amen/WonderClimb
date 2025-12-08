import React, { useState } from 'react';
import Button from '../../components/UI/Button';

const GymCheckIn = () => {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-medium text-neutral-950">Чекиране в зала</h1>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="max-w-xl mx-auto space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Търсене на клиент
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Име, телефон или номер на карта..."
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm p-2 border"
                        />
                        <Button variant="primary">Търси</Button>
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                        Сканирайте карта или въведете данни за търсене
                    </p>
                </div>
            </div>

            {/* Recent Check-ins */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Последни чекирания</h2>
                </div>
                <div className="p-6">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Час</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип достъп</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {/* Placeholder rows */}
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">10:45</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Иван Петров</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Месечна карта</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        OK
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GymCheckIn;
