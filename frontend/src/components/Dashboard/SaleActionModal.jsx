import React, { useState, useEffect } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import { adminUsersAPI } from '../../services/api';

const SaleActionModal = ({
    isOpen,
    onClose,
    onDirectSale,
    onAddToCart,
    item,
    type = 'visit', // 'visit' or 'product'
    preSelectedClimberId = ''
}) => {
    const [quantity, setQuantity] = useState(1);
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');

    // Fetch climbers when modal opens (only for visits)
    useEffect(() => {
        if (isOpen && type === 'visit') {
            fetchUsers();
        }
        if (isOpen) {
            setQuantity(1);
            // Initialize from pre-selected climber
            setSelectedUserId(preSelectedClimberId || '');
        }
    }, [isOpen, item, preSelectedClimberId, type]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await adminUsersAPI.getAll({ role: 'climber', limit: 100, sort: 'firstName' });
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const titles = {
        visit: 'Добави посещение',
        product: 'Продукт'
    };

    const getItemName = () => {
        if (type === 'visit') return 'Еднократно посещение';
        if (type === 'product') return item?.name || 'Продукт';
        return 'Артикул';
    };

    const getPrice = () => {
        return (item?.price || 0) * quantity;
    };

    const handleIncrement = () => setQuantity(q => q + 1);
    const handleDecrement = () => setQuantity(q => Math.max(1, q - 1));
    const handleQuantityChange = (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val > 0) setQuantity(val);
    };

    const getSelectedClimberName = () => {
        if (!selectedUserId) return null;
        const user = users.find(u => (u.id || u._id) === selectedUserId);
        return user ? `${user.firstName} ${user.lastName}` : null;
    };

    const handleDirectSaleClick = () => {
        const climberName = getSelectedClimberName();
        if (type === 'visit') {
            onDirectSale(item, quantity, { userId: selectedUserId || null, climberName: climberName || 'Гост' });
        } else {
            onDirectSale(item, quantity);
        }
        onClose();
    };

    const handleAddToCartClick = () => {
        console.log('Add to cart clicked', item, quantity);
        const climberName = getSelectedClimberName();
        if (type === 'visit') {
            onAddToCart(item, quantity, { userId: selectedUserId || null, climberName: climberName || 'Гост' });
        } else {
            onAddToCart(item, quantity);
        }
        onClose();
    };

    const handleAddAndContinue = () => {
        console.log('Add and continue clicked', item, quantity);
        const climberName = getSelectedClimberName();
        if (type === 'visit') {
            onAddToCart(item, quantity, { userId: selectedUserId || null, climberName: climberName || 'Гост' });
        } else {
            onAddToCart(item, quantity);
        }
        // Reset to pre-selected climber or guest
        setQuantity(1);
        setSelectedUserId(preSelectedClimberId || '');
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={titles[type] || 'Продажба'}
        >
            <div className="space-y-4">
                {/* Climber Selector - Only for visits */}
                {type === 'visit' && (
                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-2">
                            Катерач
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            disabled={isLoadingUsers}
                            className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                        >
                            <option value="">Гост</option>
                            {users.map((user) => (
                                <option key={user.id || user._id} value={user.id || user._id}>
                                    {user.firstName} {user.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Item info */}
                <div className="bg-gray-50 border border-gray-200 rounded-[10px] p-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <p className="font-medium text-neutral-950">{getItemName()}</p>
                            {type === 'product' && item?.description && (
                                <p className="text-sm text-[#9ca3af] mt-1">{item.description}</p>
                            )}
                        </div>
                        <p className="text-lg font-bold text-[#ea7a24]">
                            {getPrice().toFixed(2)} €
                        </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-2">
                        <span className="text-sm text-[#4a5565] font-medium ml-2">Количество:</span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDecrement}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={handleQuantityChange}
                                className="w-12 text-center border-none p-0 text-neutral-950 font-medium focus:ring-0"
                            />
                            <button
                                onClick={handleIncrement}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={handleAddToCartClick}
                        className="flex-1 justify-center border-2 border-[#ea7a24] text-[#ea7a24] hover:bg-orange-50 flex items-center whitespace-nowrap"
                    >
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Добави в продажба
                    </Button>

                    <Button
                        variant="primary"
                        onClick={handleDirectSaleClick}
                        className="flex-1 justify-center flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {type === 'product' ? 'Продай' : 'Добави посещение'}
                    </Button>
                </div>

                {/* Add & Continue button - Only for visits */}
                {type === 'visit' && (
                    <Button
                        variant="secondary"
                        onClick={handleAddAndContinue}
                        className="w-full justify-center border-2 border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Добави и продължи
                    </Button>
                )}
            </div>
        </BaseModal>
    );
};

export default SaleActionModal;
