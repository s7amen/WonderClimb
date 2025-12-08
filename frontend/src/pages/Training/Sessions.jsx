import React from 'react';
import Button from '../../components/UI/Button';

const TrainingSessions = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-medium text-neutral-950">График Тренировки</h1>
                <Button variant="primary">Нова тренировка</Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-gray-500 text-center py-8">Няма планирани тренировки</p>
            </div>
        </div>
    );
};

export default TrainingSessions;
