import React from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';

const PhysicalCardConflictModal = ({ 
    isOpen, 
    onClose, 
    cardCode, 
    clientName, 
    validUntil,
    canQueue, // КЛЮЧОВ PROP!
    onContinueWithoutCard,
    onAddToQueue 
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'Неизвестна';
        try {
            return new Date(dateString).toLocaleDateString('bg-BG', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <BaseModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Физическата карта е заета"
        >
            <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-gray-800 mb-2">
                        Картата <strong className="font-mono">{cardCode}</strong> в момента е свързана с:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                            <span>👤</span>
                            <span>Клиент: <strong>{clientName || 'Неизвестен'}</strong></span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span>📅</span>
                            <span>Валидна до: <strong>{formatDate(validUntil)}</strong></span>
                        </li>
                    </ul>
                </div>
                
                {canQueue ? (
                    // СЪЩИЯ ПОТРЕБИТЕЛ - Позволи queue
                    <>
                        <p className="text-sm text-gray-700">Какво искате да направите?</p>
                        <div className="flex flex-col gap-2">
                            <Button 
                                variant="primary" 
                                onClick={onAddToQueue}
                                className="w-full justify-center"
                            >
                                ➕ Добави в опашка за автоматично активиране
                            </Button>
                            <Button 
                                variant="secondary" 
                                onClick={onContinueWithoutCard}
                                className="w-full justify-center"
                            >
                                📝 Продължи без физическа карта
                            </Button>
                        </div>
                    </>
                ) : (
                    // ДРУГ ПОТРЕБИТЕЛ - БЕЗ queue опция
                    <>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-700">
                                ⚠️ Картата е заета от друг клиент. Не може да се добави в опашка за друго лице.
                            </p>
                        </div>
                        <Button 
                            variant="secondary" 
                            onClick={onContinueWithoutCard} 
                            className="w-full justify-center"
                        >
                            📝 Продължи без физическа карта
                        </Button>
                    </>
                )}
                
                <Button 
                    variant="outline" 
                    onClick={onClose} 
                    className="w-full justify-center"
                >
                    Отказ
                </Button>
            </div>
        </BaseModal>
    );
};

export default PhysicalCardConflictModal;





