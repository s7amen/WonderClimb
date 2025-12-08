
import { useState } from 'react';
import { gymAPI } from '../../services/api';
import { useToast } from '../../components/UI/Toast';

const Cards = () => {
    const [days, setDays] = useState('');
    const [selectedTypes, setSelectedTypes] = useState({
        gym: true,
        training: true
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { showToast } = useToast();

    const handleTypeChange = (type) => {
        setSelectedTypes(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const handleExtendClick = () => {
        if (!days || isNaN(days) || parseInt(days) <= 0) {
            showToast('Моля въведете валиден брой дни', 'error');
            return;
        }

        if (!selectedTypes.gym && !selectedTypes.training) {
            showToast('Моля изберете поне един вид карта', 'error');
            return;
        }

        setShowConfirm(true);
    };

    const handleConfirmExtend = async () => {
        setIsLoading(true);
        setShowConfirm(false);

        try {
            const types = [];
            if (selectedTypes.gym) types.push('gym');
            if (selectedTypes.training) types.push('training');

            const response = await gymAPI.extendAllPasses({
                days: parseInt(days),
                types
            });

            const { results } = response.data;
            let message = 'Успешно удължаване на карти:\n';
            if (results.gymPasses !== undefined) message += `- Карти за залата: ${results.gymPasses}\n`;
            if (results.trainingPasses !== undefined) message += `- Карти за тренировки: ${results.trainingPasses}`;

            showToast(message, 'success');
            setDays('');
        } catch (error) {
            console.error('Error extending passes:', error);
            showToast('Грешка при удължаване на картите', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl animate-fade-in space-y-8">{/* Extension Section */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
                <h2 className="text-lg font-medium text-neutral-950 mb-4">Удължаване на валидност на карти</h2>
                <div className="space-y-6">
                    <p className="text-sm text-neutral-500">
                        Използвайте тази опция, за да удължите срока на валидност на всички активни карти.
                        Това е полезно при компенсиране на официални празници или периоди, в които залата не работи.
                    </p>

                    <div className="space-y-4">
                        {/* Card Types Selection */}
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedTypes.gym}
                                    onChange={() => handleTypeChange('gym')}
                                    className="rounded border-gray-300 text-[#ea7a24] focus:ring-[#ea7a24]"
                                />
                                <span className="text-sm font-medium text-neutral-700">Карти за залата (Gym Passes)</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedTypes.training}
                                    onChange={() => handleTypeChange('training')}
                                    className="rounded border-gray-300 text-[#ea7a24] focus:ring-[#ea7a24]"
                                />
                                <span className="text-sm font-medium text-neutral-700">Карти за тренировки (Training Passes)</span>
                            </label>
                        </div>

                        {/* Days Input */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Брой дни за удължаване
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                placeholder="Напр. 5"
                                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#ea7a24] focus:border-[#ea7a24] sm:text-sm"
                            />
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleExtendClick}
                            disabled={isLoading}
                            className={`
                flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                bg-[#ea7a24] hover:bg-[#d56a1b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ea7a24]
                ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
              `}
                        >
                            {isLoading ? 'Обработване...' : 'Удължи картите'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-up">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            {/* AlertCircle Icon */}
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <h3 className="text-lg font-medium">Потвърждение</h3>
                        </div>

                        <p className="text-neutral-600 mb-6">
                            Сигурни ли сте, че искате да удължите валидността на
                            <span className="font-semibold text-neutral-900"> всички активни </span>
                            {selectedTypes.gym && selectedTypes.training ? 'карти за залата и за тренировки' :
                                selectedTypes.gym ? 'карти за залата' : 'карти за тренировки'}
                            с <span className="font-semibold text-neutral-900">{days} дни</span>?
                            <br /><br />
                            Това действие ще засегне всички текущо активни карти.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-gray-300 rounded-md hover:bg-neutral-50"
                            >
                                Отказ
                            </button>
                            <button
                                onClick={handleConfirmExtend}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#ea7a24] rounded-md hover:bg-[#d56a1b]"
                            >
                                Потвърди и Удължи
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cards;
