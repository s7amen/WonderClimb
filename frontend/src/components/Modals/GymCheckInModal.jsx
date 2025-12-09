import { useState, useEffect } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useToast } from '../UI/Toast';
import { gymAPI, adminUsersAPI, pricingAPI } from '../../services/api';
import { getUserFullName } from '../../utils/userUtils';

const GymCheckInModal = ({ isOpen, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('single'); // 'single', 'pass', 'multisport'

    // Data states
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSearch, setUserSearch] = useState('');
    const [pricings, setPricings] = useState([]);
    const [selectedPricing, setSelectedPricing] = useState(null);
    const [userPasses, setUserPasses] = useState([]);
    const [selectedPass, setSelectedPass] = useState(null);

    // Quantity / Bulk
    const [quantity, setQuantity] = useState(1);

    // Multisport
    const [multisportAmount, setMultisportAmount] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchPricing();
            // Reset states
            setSelectedUser(null);
            setUserSearch('');
            setSelectedPricing(null);
            setSelectedPass(null);
            setMultisportAmount('');
            setQuantity(1);
            setLoading(false);
            setUsers([]);
        }
    }, [isOpen]);

    // Search users
    useEffect(() => {
        const searchUsers = async () => {
            if (!userSearch || userSearch.length < 2) {
                setUsers([]);
                return;
            }
            try {
                const response = await adminUsersAPI.getAll({ search: userSearch, limit: 10 });
                setUsers(response.data.users || []);
            } catch (error) {
                console.error("Error searching users", error);
            }
        };

        const timeoutId = setTimeout(searchUsers, 500);
        return () => clearTimeout(timeoutId);
    }, [userSearch]);

    // Fetch user passes when user is selected (for Pass tab)
    useEffect(() => {
        if (selectedUser && activeTab === 'pass') {
            fetchUserPasses(selectedUser.id);
        }
    }, [selectedUser, activeTab]);

    const fetchPricing = async () => {
        try {
            // Fetch by category
            const categoryPromise = pricingAPI.getActive('gym_single_visit');
            // Also try to fetch specific code GYM_SINGLE_VISIT in case category is wrong/different
            const codePromise = pricingAPI.getActiveSingle('GYM_SINGLE_VISIT').catch(() => ({ data: { data: null } }));

            const [categoryResponse, codeResponse] = await Promise.all([categoryPromise, codePromise]);

            const categoryPricings = categoryResponse.data.pricing || [];
            const codePricing = codeResponse.data?.data;

            // Merge and deduplicate
            let combined = [...categoryPricings];
            if (codePricing) {
                const exists = combined.some(p => p._id === codePricing._id);
                if (!exists) {
                    combined.push(codePricing);
                }
            }

            setPricings(combined);

            // Auto-select if only one
            if (combined.length === 1) {
                setSelectedPricing(combined[0]);
            }
        } catch (error) {
            console.error('Error fetching pricing:', error);
        }
    };

    const fetchUserPasses = async (userId) => {
        try {
            const response = await gymAPI.getAllPasses({
                userId,
                isActive: true, // Only active passes
            });
            setUserPasses(response.data.passes || []);
        } catch (error) {
            console.error('Error fetching user passes:', error);
            showToast('Грешка при зареждане на картите', 'error');
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const data = {
                type: activeTab,
                userId: selectedUser?.id,
            };

            if (activeTab === 'single') {
                if (!selectedPricing) {
                    showToast('Моля изберете ценова опция', 'error');
                    setLoading(false);
                    return;
                }
                data.pricingId = selectedPricing._id;
                data.amount = selectedPricing.amount;
                data.quantity = quantity;
            } else if (activeTab === 'pass') {
                if (!selectedPass) {
                    showToast('Моля изберете карта', 'error');
                    setLoading(false);
                    return;
                }
                data.gymPassId = selectedPass._id;
            } else if (activeTab === 'multisport') {
                data.quantity = quantity;
            }

            await gymAPI.checkIn(data);
            showToast('Посещението е записано успешно', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Check-in error:', error);
            showToast(error.response?.data?.error?.message || 'Грешка при записване', 'error');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'single', label: 'Единично' },
        { id: 'pass', label: 'С карта' },
        { id: 'multisport', label: 'MultiSport' },
    ];

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Ново посещение"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Отказ
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
                        Запиши вход {activeTab !== 'pass' && quantity > 1 ? `(${quantity})` : ''}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.id
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* User Search (Optional for Single/Multisport, Required for Pass) */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Клиент {activeTab === 'pass' && <span className="text-red-500">*</span>}
                    </label>
                    {selectedUser ? (
                        <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div>
                                <div className="font-medium text-gray-900">{getUserFullName(selectedUser)}</div>
                                <div className="text-sm text-gray-500">{selectedUser.email}</div>
                            </div>
                            <button
                                onClick={() => { setSelectedUser(null); setSelectedPass(null); setUserPasses([]); }}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                placeholder="Търсене по име или имейл..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                            />
                            {users.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {users.map(user => (
                                        <div
                                            key={user.id}
                                            className="px-4 py-2 cursor-pointer hover:bg-gray-50"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setUsers([]);
                                                setUserSearch('');
                                            }}
                                        >
                                            <div className="font-medium text-gray-900">{getUserFullName(user)}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'pass' && !selectedUser && (
                        <p className="text-xs text-gray-500">За посещение с карта трябва първо да изберете клиент.</p>
                    )}
                </div>

                {/* Specific Content per Tab */}
                {activeTab === 'single' && (
                    <>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Ценова опция <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {pricings.map(pricing => (
                                    <div
                                        key={pricing._id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPricing?._id === pricing._id
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-orange-300'
                                            }`}
                                        onClick={() => setSelectedPricing(pricing)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-900">{pricing.labelBg}</span>
                                            <span className="font-bold text-gray-900">&euro;{pricing.amount}</span>
                                        </div>
                                    </div>
                                ))}
                                {pricings.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">Няма активни цени за единични посещения.</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Брой хора <span className="text-gray-400 text-xs">(групово посещение)</span>
                            </label>
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                        </div>
                        {selectedPricing && quantity > 1 && (
                            <div className="bg-gray-50 p-2 rounded text-right">
                                <span className="text-sm text-gray-500">Общо:</span> <span className="font-bold text-lg">&euro;{selectedPricing.amount * quantity}</span>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'pass' && selectedUser && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Изберете карта <span className="text-red-500">*</span>
                        </label>
                        {userPasses.length > 0 ? (
                            <div className="space-y-2">
                                {userPasses.map(pass => (
                                    <div
                                        key={pass._id}
                                        className={`p-3 border rounded-lg cursor-pointer ${selectedPass?._id === pass._id
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-orange-300'
                                            }`}
                                        onClick={() => setSelectedPass(pass)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-900">{pass.pricingId?.labelBg || 'Gym Pass'}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${pass.remainingEntries !== null && pass.remainingEntries < 3
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {pass.remainingEntries !== null
                                                    ? `${pass.remainingEntries} оставащи`
                                                    : 'Неограничена'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Валидна до: {new Date(pass.validUntil).toLocaleDateString('bg-BG')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-red-500">Клиентът няма активни карти.</p>
                        )}
                    </div>
                )}

                {activeTab === 'multisport' && (
                    <>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                                Отбелязване на посещение с MultiSport карта.
                                {selectedUser ? ' Посещението ще бъде свързано с избрания клиент.' : ' Посещението ще бъде записано като анонимно.'}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Брой хора <span className="text-gray-400 text-xs">(групово посещение)</span>
                            </label>
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </>
                )}
            </div>
        </BaseModal>
    );
};

export default GymCheckInModal;
