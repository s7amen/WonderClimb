import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../UI/Card';
import { format } from 'date-fns';

const ClimbersTableWidget = ({ climbers, onAddClimber, onEditClimber }) => {
    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-base font-medium text-neutral-950">Катерачи</h3>
                    <Link to="/climbers" className="text-sm font-medium text-[#ea7a24] hover:text-[#d96a1a]">
                        Всички катерачи
                    </Link>
                </div>
                <button
                    onClick={onAddClimber}
                    className="bg-[#ea7a24] hover:bg-[#d96a1a] text-white text-sm font-medium py-1.5 px-4 rounded-[6px] transition-colors flex items-center gap-1"
                >
                    <span>+</span> Добави катерач
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left border-b border-gray-100">
                            <th className="pb-3 text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Име</th>
                            <th className="pb-3 text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Регистрация</th>
                            <th className="pb-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {climbers.map((climber) => (
                            <tr key={climber.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 text-sm font-medium text-neutral-950">{climber.firstName} {climber.lastName}</td>
                                <td className="py-3 text-sm text-[#4a5565]">
                                    {climber.createdAt ? format(new Date(climber.createdAt), 'dd.MM.yyyy') : '-'}
                                </td>
                                <td className="py-3 text-right">
                                    <button
                                        onClick={() => onEditClimber(climber)}
                                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
                                        style={{ color: '#35383d' }}
                                        title="Редактирай"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {climbers.length === 0 && (
                            <tr>
                                <td colSpan="3" className="py-4 text-center text-sm text-gray-500">
                                    Няма намерени катерачи
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default ClimbersTableWidget;
