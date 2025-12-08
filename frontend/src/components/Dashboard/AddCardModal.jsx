import React, { useState, useEffect } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import { adminUsersAPI } from '../../services/api';

const AddCardModal = ({ isOpen, onClose, onSubmit, prices = [] }) => {
    const [selectedClimber, setSelectedClimber] = useState(null);
    const [selectedCardType, setSelectedCardType] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [climbers, setClimbers] = useState([]);
    const [allClimbers, setAllClimbers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter card prices (gym passes)
    const cardPrices = prices.filter(p => p.type === 'gym_pass');

    // Fetch climbers when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchClimbers = async () => {
                try {
                    const response = await adminUsersAPI.getAll({ role: 'climber' });
                    setAllClimbers(response.data.users || []);
                } catch (error) {
                    console.error('Error fetching climbers:', error);
                }
            };
            fetchClimbers();
        }
    }, [isOpen]);

    // Search climbers
    useEffect(() => {
        if (searchQuery.length > 1) {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = allClimbers.filter(c =>
                `${c.firstName} ${c.lastName}`.toLowerCase().includes(lowerQuery) ||
                (c.phone && c.phone.includes(searchQuery)) ||
                (c.email && c.email.toLowerCase().includes(lowerQuery))
            );
            setClimbers(filtered);
            setShowSuggestions(true);
        } else {
            setClimbers([]);
            setShowSuggestions(false);
        }
    }, [searchQuery, allClimbers]);

    // Select climber
    const handleSelectClimber = (climber) => {
        setSelectedClimber(climber);
        setSearchQuery(`${climber.firstName} ${climber.lastName}`);
        setShowSuggestions(false);
    };

    // Generate card number (mock)
    const generateCardNumber = () => {
        return `WC${Date.now().toString().slice(-8)}`;
    };

    // Calculate expiry date
    const getExpiryDate = () => {
        if (!selectedCardType) return null;

        const today = new Date();
        if (selectedCardType.durationUnits === 'months') {
            today.setMonth(today.getMonth() + selectedCardType.duration);
        } else if (selectedCardType.durationUnits === 'days') {
            today.setDate(today.getDate() + selectedCardType.duration);
        }
        return today;
    };

    const cardNumber = selectedClimber && selectedCardType ? generateCardNumber() : null;
    const expiryDate = getExpiryDate();

    const handleSubmit = async (actionType) => {
        if (!selectedClimber || !selectedCardType) return;

        setLoading(true);
        try {
            await onSubmit({
                climberId: selectedClimber.id,
                pricingId: selectedCardType.id,
                cardNumber,
                expiryDate,
                type: selectedCardType.name,
                price: selectedCardType.price
            }, actionType); // Pass action type: 'direct' or 'cart'
            handleClose();
        } catch (error) {
            console.error('Error creating card:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedClimber(null);
        setSelectedCardType(null);
        setSearchQuery('');
        setShowSuggestions(false);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Добави нова карта"
            footer={
                <div className="flex flex-col sm:flex-row gap-2 justify-end w-full">
                    <Button variant="secondary" onClick={handleClose} className="sm:w-auto w-full">
                        Отказ
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-2 sm:w-auto w-full">
                        <Button
                            variant="secondary"
                            onClick={() => handleSubmit('cart')}
                            disabled={!selectedClimber || !selectedCardType || loading}
                            className="sm:w-auto w-full border-2 border-[#ea7a24] text-[#ea7a24] hover:bg-orange-50"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            Добави в продажба
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => handleSubmit('direct')}
                            disabled={!selectedClimber || !selectedCardType || loading}
                            className="sm:w-auto w-full"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Продай директно
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Climber Search */}
                <div className="relative">
                    <label className="block text-sm font-medium text-neutral-950 mb-2">
                        Катерач
                    </label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                        placeholder="Търси по име или телефон..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-[10px] focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                    />

                    {/* Suggestions dropdown */}
                    {showSuggestions && climbers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-[10px] shadow-lg max-h-48 overflow-y-auto">
                            {climbers.map(climber => (
                                <button
                                    key={climber.id}
                                    onClick={() => handleSelectClimber(climber)}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <div className="font-medium text-neutral-950">
                                        {climber.firstName} {climber.lastName}
                                    </div>
                                    <div className="text-sm text-[#9ca3af]">{climber.phone}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Card Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-neutral-950 mb-2">
                        Тип карта
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {cardPrices.map(price => (
                            <button
                                key={price.id}
                                onClick={() => setSelectedCardType(price)}
                                className={`p-3 border-2 rounded-[10px] text-left transition-all ${selectedCardType?.id === price.id
                                    ? 'border-[#ea7a24] bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-medium text-neutral-950">{price.name}</div>
                                <div className="text-sm text-[#ea7a24] font-medium mt-1">
                                    {price.price.toFixed(2)} лв
                                </div>
                                {price.description && (
                                    <div className="text-xs text-[#9ca3af] mt-1">{price.description}</div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card Details Preview */}
                {selectedClimber && selectedCardType && (
                    <div className="bg-gray-50 border border-gray-200 rounded-[10px] p-4 space-y-2">
                        <h4 className="font-medium text-neutral-950 mb-3">Детайли на карта:</h4>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#9ca3af]">Номер:</span>
                            <span className="font-medium text-neutral-950">{cardNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#9ca3af]">Валидност до:</span>
                            <span className="font-medium text-neutral-950">
                                {expiryDate?.toLocaleDateString('bg-BG')}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#9ca3af]">Катерач:</span>
                            <span className="font-medium text-neutral-950">
                                {selectedClimber.firstName} {selectedClimber.lastName}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default AddCardModal;
