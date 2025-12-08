import React from 'react';
import { useNavigate } from 'react-router-dom';

const FinanceReports = () => {
    const navigate = useNavigate();

    const reports = [
        { name: 'Приходи от зала', path: '/finance/reports/gym', description: 'Детайлен отчет за приходи от карти и посещения' },
        { name: 'Приходи от тренировки', path: '/finance/reports/training', description: 'Отчет за групови и индивидуални тренировки' },
        { name: 'Хонорари на треньори', path: '/finance/reports/coach-fees', description: 'Справка за дължими хонорари' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Финансови отчети</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report, index) => (
                    <div
                        key={index}
                        onClick={() => navigate(report.path)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                    >
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.name}</h3>
                        <p className="text-gray-500 text-sm">{report.description}</p>
                        <div className="mt-4 text-orange-600 text-sm font-medium">Преглед &rarr;</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FinanceReports;
