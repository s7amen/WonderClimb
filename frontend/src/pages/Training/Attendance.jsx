import React from 'react';

const TrainingAttendance = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Присъствие</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-gray-500 text-center py-8">Изберете тренировка за отчитане на присъствие</p>
            </div>
        </div>
    );
};

export default TrainingAttendance;
