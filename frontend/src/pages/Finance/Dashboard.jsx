import React from 'react';
import { useNavigate } from 'react-router-dom';

const FinanceDashboard = () => {
    const navigate = useNavigate();

    const stats = [
        { label: 'Приходи този месец', value: '6,365.00 €', change: '+15%', color: 'text-green-600' },
        { label: 'Разходи този месец', value: '2,147.00 €', change: '-5%', color: 'text-red-600' },
        { label: 'Нетна печалба', value: '4,218.00 €', change: '+22%', color: 'text-blue-600' },
        { label: 'Чакащи плащания', value: '3', change: '0', color: 'text-orange-600' },
    ];

    const quickActions = [
        { name: 'Нов запис', path: '/finance/entries', color: 'bg-blue-500' },
        { name: 'Отчети', path: '/finance/reports', color: 'bg-purple-500' },
        { name: 'Хонорари', path: '/finance/reports/coach-fees', color: 'bg-orange-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-medium text-neutral-950">Финанси - Табло</h1>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                        <div className="mt-2 flex items-baseline">
                            <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
                            <span className={`ml-2 text-sm font-medium ${stat.color}`}>
                                {stat.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                    <button
                        key={index}
                        onClick={() => navigate(action.path)}
                        className={`${action.color} text-white p-4 rounded-xl shadow-sm hover:opacity-90 transition-opacity text-left`}
                    >
                        <h3 className="font-semibold text-lg">{action.name}</h3>
                        <p className="text-white/80 text-sm mt-1">Бърз достъп</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FinanceDashboard;
