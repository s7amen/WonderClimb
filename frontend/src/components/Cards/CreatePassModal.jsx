import React, { useState, useEffect, useRef } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { adminUsersAPI } from '../../services/api';
import api from '../../services/api';
import { getUserFullName } from '../../utils/userUtils';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';

/**
 * CreatePassModal - Unified modal for creating gym and training passes
 * Used in both Gym Dashboard and Training Passes pages
 * 
 * @param {boolean} isOpen - Modal open state
 * @param {function} onClose - Close handler
 * @param {string} mode - 'gym' or 'training'
 * @param {string} actionType - 'sale' (gym) or 'create' (passes)
 * @param {array} pricing - Available pricing options
 * @param {function} onDirectSale - Direct sale handler (gym only)
 * @param {function} onAddToCart - Add to cart handler (gym only)
 * @param {function} onCreate - Create pass handler (passes only)
 * @param {object} editingPass - Pass being edited (passes only)
 */
const CreatePassModal = ({
    isOpen,
    onClose,
    mode = 'gym', // 'gym' or 'training'
    actionType = 'sale', // 'sale' or 'create'
    pricing = [],
    onDirectSale = null,
    onAddToCart = null,
    onCreate = null,
    editingPass = null,
    preSelectedClimberId = ''
}) => {
    const [users, setUsers] = useState([]);
    const [families, setFamilies] = useState([]);
    const [isLoadingFamilies, setIsLoadingFamilies] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [generatedCardNumber, setGeneratedCardNumber] = useState('');
    const [initialFormState, setInitialFormState] = useState(null);
    const physicalCardInputRef = useRef(null);

    const [formData, setFormData] = useState({
        userId: '',
        pricingId: '',
        isFamilyPass: false,
        familyId: '',
        hasDiscount: false,
        discountPercent: '',
        discountReason: '',
        paymentStatus: 'paid',
        notes: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        validityDays: '',
        validityType: 'days', // Add default
        remainingEntries: '',
        amount: '',
        isActive: true,
        physicalCardCode: '',
    });

    // Unsaved changes warning
    const { confirmClose, UnsavedChangesModal } = useUnsavedChangesWarning({
        hasChanges: () => initialFormState && JSON.stringify(formData) !== initialFormState,
        message: "Имате незапазени промени. Сигурни ли сте, че искате да излезете без да ги запазите?"
    });

    // Fetch users when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchUsers();

            // Generate card number for new pass
            if (!editingPass) {
                const cardNum = `WC${Date.now().toString().slice(-8)}`;
                setGeneratedCardNumber(cardNum);

                // Check if preSelected ID is a family
                const isPreSelectedFamily = families.some(f => f._id === preSelectedClimberId);

                // Reset form
                const initialData = {
                    userId: isPreSelectedFamily ? '' : (preSelectedClimberId || ''),
                    pricingId: '',
                    isFamilyPass: isPreSelectedFamily,
                    familyId: isPreSelectedFamily ? preSelectedClimberId : '',
                    hasDiscount: false,
                    discountPercent: '',
                    discountReason: '',
                    paymentStatus: 'paid',
                    notes: '',
                    validFrom: new Date().toISOString().split('T')[0],
                    validUntil: '',
                    validityDays: '',
                    validityType: 'days',
                    remainingEntries: '',
                    amount: '',
                    isActive: true,
                    physicalCardCode: '',
                };
                setFormData(initialData);
                setInitialFormState(JSON.stringify(initialData));
            } else {
                // Edit mode - populate form
                setGeneratedCardNumber(editingPass.passId || '');
                const validFromFormatted = editingPass.validFrom ? formatDateForInput(editingPass.validFrom) : '';
                const validUntilFormatted = editingPass.validUntil ? formatDateForInput(editingPass.validUntil) : '';
                const calculatedValidityDays = calculateDaysBetweenDates(validFromFormatted, validUntilFormatted);

                const editData = {
                    userId: editingPass.userId?._id?.toString() || editingPass.userId?.toString() || '',
                    pricingId: editingPass.pricingId?._id?.toString() || editingPass.pricingId?.toString() || '',
                    isFamilyPass: editingPass.isFamilyPass || false,
                    familyId: editingPass.familyId?.toString() || '',
                    hasDiscount: !!(editingPass.discountPercent && editingPass.discountPercent > 0),
                    discountPercent: editingPass.discountPercent?.toString() || '',
                    discountReason: editingPass.discountReason || '',
                    paymentStatus: editingPass.paymentStatus || 'paid',
                    notes: editingPass.notes || '',
                    validFrom: validFromFormatted,
                    validUntil: validUntilFormatted,
                    validityDays: calculatedValidityDays,
                    validityType: 'days', // Default for legacy/existing passes where we don't know the original type easily without fetching pricing again. 
                    // However, if we just use dates, it's fine.
                    remainingEntries: editingPass.remainingEntries?.toString() || '',
                    amount: editingPass.amount?.toString() || '',
                    isActive: editingPass.isActive !== undefined ? editingPass.isActive : true,
                    physicalCardCode: '', // Don't allow editing physical card code
                };
                setFormData(editData);
                setInitialFormState(JSON.stringify(editData));
            }

            setFormErrors({});
        }
    }, [isOpen, editingPass]);

    // Auto-focus physical card input when modal opens (only for new cards)
    useEffect(() => {
        if (isOpen && !editingPass && physicalCardInputRef.current) {
            // Small delay to ensure modal is fully rendered
            setTimeout(() => {
                physicalCardInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, editingPass]);

    // Global keyboard listener for scanner input (works even without focus)
    useEffect(() => {
        if (!isOpen || editingPass) return;

        let buffer = '';
        let timeoutId = null;
        let lastKeyTime = Date.now();

        const handleKeyPress = (e) => {
            const target = e.target;
            const now = Date.now();
            
            // If user is typing in any input/textarea, let it handle normally
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                // If it's our physical card input, let it handle normally
                if (target === physicalCardInputRef.current) {
                    return;
                }
                // Clear buffer if user is typing elsewhere
                buffer = '';
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                return;
            }

            // Check if it's a digit
            if (e.key >= '0' && e.key <= '9') {
                // If too much time passed since last key, reset buffer (scanner sends fast)
                if (now - lastKeyTime > 200) {
                    buffer = '';
                }
                
                buffer += e.key;
                lastKeyTime = now;
                
                // Clear previous timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                // If buffer reaches 6 digits, update the field immediately
                if (buffer.length === 6) {
                    e.preventDefault();
                    handleInputChange('physicalCardCode', buffer);
                    // Focus the input to show the value
                    if (physicalCardInputRef.current) {
                        physicalCardInputRef.current.focus();
                        // Move cursor to end
                        setTimeout(() => {
                            if (physicalCardInputRef.current) {
                                physicalCardInputRef.current.setSelectionRange(6, 6);
                            }
                        }, 0);
                    }
                    buffer = '';
                } else {
                    // Set timeout to clear buffer if no more input (user typing slowly)
                    timeoutId = setTimeout(() => {
                        buffer = '';
                    }, 300);
                }
            } else if (e.key === 'Enter' && buffer.length > 0) {
                // Scanner might send Enter after the code
                e.preventDefault();
                if (buffer.length === 6) {
                    handleInputChange('physicalCardCode', buffer);
                    if (physicalCardInputRef.current) {
                        physicalCardInputRef.current.focus();
                    }
                }
                buffer = '';
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            }
        };

        document.addEventListener('keypress', handleKeyPress);

        return () => {
            document.removeEventListener('keypress', handleKeyPress);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [isOpen, editingPass]);

    const fetchUsers = async () => {
        try {
            const response = await adminUsersAPI.getAll({ role: 'climber' });
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchFamilies = async () => {
        try {
            setIsLoadingFamilies(true);
            const response = await api.get('/families');
            setFamilies(response.data || []);
        } catch (error) {
            console.error('Error fetching families:', error);
        } finally {
            setIsLoadingFamilies(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchFamilies();
        }
    }, [isOpen]);

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Calculate number of days between two dates
    const calculateDaysBetweenDates = (startDate, endDate) => {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays.toString();
    };

    // Helper to add duration to date
    const addDuration = (dateStr, amount, type = 'days') => {
        if (!dateStr || !amount) return '';
        const date = new Date(dateStr);

        if (type === 'months') {
            const originalDay = date.getDate();
            date.setMonth(date.getMonth() + amount);
            if (date.getDate() !== originalDay) {
                date.setDate(0);
            }
        } else {
            date.setDate(date.getDate() + amount);
        }

        return date.toISOString().split('T')[0];
    };

    // Handle close with unsaved changes check
    const handleClose = () => {
        confirmClose(onClose);
    };

    const handlePhysicalCardCodeChange = (e) => {
        const value = e.target.value.trim();
        // Only allow digits
        const digitsOnly = value.replace(/\D/g, '');
        // Limit to 6 digits
        const limited = digitsOnly.slice(0, 6);
        handleInputChange('physicalCardCode', limited);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const updates = { [field]: value };

            // Auto-calculate when pricing is selected
            if (field === 'pricingId' && value) {
                const selectedPricing = pricing.find(p => p._id === value);
                if (selectedPricing) {
                    const days = selectedPricing.validityDays || 30;
                    const validityType = selectedPricing.validityType || 'days';
                    const validFrom = prev.validFrom || new Date().toISOString().split('T')[0];

                    const validUntilIso = addDuration(validFrom, days, validityType);

                    // Calculate amount with discount
                    const baseAmount = selectedPricing.amount || 0;
                    const discount = parseFloat(prev.discountPercent) || 0;
                    const finalAmount = baseAmount * (1 - discount / 100);

                    updates.validityDays = days.toString();
                    updates.validityType = validityType;
                    updates.validFrom = validFrom;
                    updates.validUntil = validUntilIso;
                    updates.amount = finalAmount.toFixed(2);
                    updates.remainingEntries = (selectedPricing.maxEntries || '').toString();
                }
            }

            // Recalculate validUntil when validFrom or validityDays changes
            if (field === 'validFrom' || field === 'validityDays') {
                const validFrom = field === 'validFrom' ? value : prev.validFrom;
                const days = field === 'validityDays' ? parseInt(value) : parseInt(prev.validityDays);
                const type = prev.validityType || 'days';

                if (validFrom && !isNaN(days)) {
                    const validUntilIso = addDuration(validFrom, days, type);
                    updates.validUntil = validUntilIso;
                }
            }

            // Recalculate amount when discount changes
            if (field === 'discountPercent' && prev.pricingId) {
                const selectedPricing = pricing.find(p => p._id === prev.pricingId);
                if (selectedPricing) {
                    const baseAmount = selectedPricing.amount || 0;
                    const discount = parseFloat(value) || 0;
                    const finalAmount = baseAmount * (1 - discount / 100);
                    updates.amount = finalAmount.toFixed(2);
                }
            }

            return { ...prev, ...updates };
        });

        // Clear error for this field
        if (formErrors[field]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.userId && !formData.familyId) {
            errors.userId = 'Изберете потребител или семейство';
        }

        if (!formData.pricingId) {
            errors.pricingId = 'Картата е задължителна';
        }

        if (formData.discountPercent !== '' && formData.discountPercent !== null) {
            const discount = parseFloat(formData.discountPercent);
            if (isNaN(discount) || discount < 0 || discount > 100) {
                errors.discountPercent = 'Отстъпката трябва да е между 0 и 100';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (submitActionType) => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                userId: formData.userId,
                pricingId: formData.pricingId,
                isFamilyPass: formData.isFamilyPass,
                familyId: formData.familyId || null,
                discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
                discountReason: formData.discountReason.trim() || null,
                paymentStatus: formData.paymentStatus,
                notes: formData.notes.trim() || null,
                validFrom: formData.validFrom || null,
                validUntil: formData.validUntil || null,
                amount: formData.amount ? parseFloat(formData.amount) : null,
                totalEntries: formData.remainingEntries ? parseInt(formData.remainingEntries) : null,
                remainingEntries: formData.remainingEntries ? parseInt(formData.remainingEntries) : null,
                isActive: formData.isActive,
                physicalCardCode: formData.physicalCardCode.trim() || null,
            };

            if (submitActionType === 'direct' && onDirectSale) {
                await onDirectSale(submitData);
            } else if (submitActionType === 'cart' && onAddToCart) {
                await onAddToCart(submitData);
            } else if (submitActionType === 'create' && onCreate) {
                if (editingPass) {
                    await onCreate(editingPass._id, submitData);
                } else {
                    await onCreate(submitData);
                }
            }

            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
            // Error handling is done in parent component
        } finally {
            setLoading(false);
        }
    };

    const paymentStatusLabels = {
        paid: 'Платено',
        unpaid: 'Неплатено',
    };

    // Configure footer buttons based on mode
    const renderFooter = () => {
        if (actionType === 'sale') {
            // Gym Dashboard mode
            return (
                <div className="flex gap-3 justify-center w-full">
                    <Button
                        variant="secondary"
                        onClick={() => handleSubmit('cart')}
                        disabled={(!formData.userId && !formData.familyId) || !formData.pricingId || loading}
                        className="flex items-center justify-center border-2 border-[#ea7a24] text-[#ea7a24] hover:bg-orange-50"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Добави в продажба
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => handleSubmit('direct')}
                        disabled={(!formData.userId && !formData.familyId) || !formData.pricingId || loading}
                        className="flex items-center justify-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Добави карта
                    </Button>
                </div>
            );
        } else {
            // Training Passes mode
            return (
                <div className="flex gap-3 justify-end">
                    <Button
                        variant="primary"
                        onClick={() => handleSubmit('create')}
                        disabled={loading}
                    >
                        {loading ? 'Запазване...' : 'Запази'}
                    </Button>
                </div>
            );
        }
    };

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={handleClose}
                title={editingPass ? 'Редактиране на карта' : 'Добавяне на нова карта'}
                size="xl"
                footer={renderFooter()}
            >
                <div className="space-y-4">
                    {/* Row 1: User and Family Checkbox */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-9">
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Потребител *
                            </label>
                            <select
                                value={formData.familyId ? `family_${formData.familyId}` : formData.userId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Check if it's a family or user
                                    if (val.startsWith('family_')) {
                                        const famId = val.replace('family_', '');
                                        setFormData(prev => ({
                                            ...prev,
                                            userId: '',
                                            isFamilyPass: true,
                                            familyId: famId,
                                            // Reset any user specific stuff if needed
                                        }));
                                        // Clear user error if present
                                        if (formErrors.userId) {
                                            setFormErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.userId;
                                                return newErrors;
                                            });
                                        }
                                    } else {
                                        // It's a user
                                        handleInputChange('userId', val);
                                        setFormData(prev => ({
                                            ...prev,
                                            isFamilyPass: false,
                                            familyId: ''
                                        }));
                                    }
                                }}
                                disabled={!!editingPass}
                                className={`w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 ${formErrors.userId ? 'border-red-500' : ''
                                    } ${editingPass ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value="">Изберете потребител или семейство</option>
                                <optgroup label="Семейства">
                                    {families.map(f => (
                                        <option key={`family_${f._id}`} value={`family_${f._id}`}>
                                            {f.name} ({f.memberIds.length} членове)
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Катерачи">
                                    {users.map((u) => (
                                        <option key={u.id || u._id} value={u.id || u._id}>
                                            {getUserFullName(u) || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '-'}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                            {formErrors.userId && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.userId}</p>
                            )}
                        </div>
                        {mode === 'training' && (
                            <div className="md:col-span-3 pb-2">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isFamilyPass}
                                        onChange={(e) => handleInputChange('isFamilyPass', e.target.checked)}
                                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                    />
                                    <span className="ml-2 text-sm font-medium text-neutral-950">
                                        Семейна карта
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Row 2: Card Type (Pricing) */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">
                            Карта *
                        </label>
                        <select
                            value={formData.pricingId}
                            onChange={(e) => handleInputChange('pricingId', e.target.value)}
                            disabled={!!editingPass}
                            className={`w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 ${formErrors.pricingId ? 'border-red-500' : ''
                                } ${editingPass ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="">Изберете карта</option>
                            {pricing
                                .filter(p => {
                                    const isFamilyPricing = p.labelBg.toLowerCase().includes('семейн');
                                    return formData.isFamilyPass ? isFamilyPricing : !isFamilyPricing;
                                })
                                .map((p) => (
                                    <option key={p._id} value={p._id}>
                                        {p.labelBg} - {p.amount?.toFixed(2)} EUR
                                    </option>
                                ))}
                        </select>
                        {formErrors.pricingId && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.pricingId}</p>
                        )}
                    </div>

                    {/* Row 3: Dates (From, Days, Until) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Валидна от
                            </label>
                            <input
                                type="date"
                                value={formData.validFrom}
                                onChange={(e) => handleInputChange('validFrom', e.target.value)}
                                className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Валидност (дни)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.validityDays}
                                onChange={(e) => handleInputChange('validityDays', e.target.value)}
                                className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Валидна до
                            </label>
                            <input
                                type="date"
                                value={formData.validUntil}
                                onChange={(e) => handleInputChange('validUntil', e.target.value)}
                                className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                            />
                        </div>
                    </div>

                    {/* Row 4: Physical Card Code */}
                    {!editingPass ? (
                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Физическа карта (6 цифри)
                            </label>
                            <div className="relative">
                                <input
                                    ref={physicalCardInputRef}
                                    type="text"
                                    value={formData.physicalCardCode}
                                    onChange={handlePhysicalCardCodeChange}
                                    onKeyDown={(e) => {
                                        // Allow Enter key to submit if scanner sends it
                                        if (e.key === 'Enter' && formData.physicalCardCode.length === 6) {
                                            e.preventDefault();
                                        }
                                    }}
                                    placeholder="Сканирай или въведи код..."
                                    maxLength={6}
                                    className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 font-mono"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Оставете празно ако картата е виртуална</p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Физическа карта
                            </label>
                            <input
                                type="text"
                                value={
                                    editingPass.physicalCardId?.physicalCardCode || 
                                    (editingPass.physicalCardId ? 'Зареждане...' : 'Няма физическа карта')
                                }
                                readOnly
                                className="w-full px-3 py-2 bg-gray-100 border border-[#d1d5dc] rounded-[10px] text-sm text-gray-500 cursor-not-allowed font-mono"
                            />
                        </div>
                    )}

                    {/* Row 4.5: Card Number */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">
                            Номер на карта
                        </label>
                        <input
                            type="text"
                            value={generatedCardNumber}
                            readOnly
                            className="w-full px-3 py-2 bg-gray-100 border border-[#d1d5dc] rounded-[10px] text-sm text-gray-500 cursor-not-allowed font-mono"
                        />
                    </div>

                    {/* Row 5: Entries */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">
                            Брой посещения
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={formData.remainingEntries}
                            onChange={(e) => handleInputChange('remainingEntries', e.target.value)}
                            placeholder={formData.remainingEntries === '' ? 'Неограничен' : ''}
                            className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                        />
                        <p className="mt-1 text-xs text-gray-500">Оставете празно за неограничен достъп</p>
                    </div>

                    {/* Row 6: Discount Checkbox */}
                    <div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.hasDiscount}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    handleInputChange('hasDiscount', checked);
                                    if (!checked) {
                                        handleInputChange('discountPercent', '');
                                        handleInputChange('discountReason', '');
                                    }
                                }}
                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm font-medium text-neutral-950">Отстъпка</span>
                        </label>
                    </div>

                    {/* Row 7: Discount Fields (Conditional) */}
                    {formData.hasDiscount && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Отстъпка (%)"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.discountPercent}
                                onChange={(e) => handleInputChange('discountPercent', e.target.value)}
                                error={formErrors.discountPercent}
                                placeholder="0-100"
                            />
                            <Input
                                label="Описание"
                                value={formData.discountReason}
                                onChange={(e) => handleInputChange('discountReason', e.target.value)}
                                placeholder="Опционално"
                            />
                        </div>
                    )}

                    {/* Row 8: Payment Status & Amount & Active Toggle */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Статус на плащане
                            </label>
                            <select
                                value={formData.paymentStatus}
                                onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                                className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                            >
                                {Object.entries(paymentStatusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Крайна сума (EUR)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => handleInputChange('amount', e.target.value)}
                                className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 font-bold text-lg"
                            />
                        </div>
                        {editingPass && (
                            <div className="flex items-center pt-6">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                    />
                                    <span className={`text-sm font-medium ${formData.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                                        {formData.isActive ? 'Активна карта' : 'Деактивирана ръчно'}
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Row 9: Notes */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">
                            Бележки
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 resize-none"
                        />
                    </div>
                </div>
            </BaseModal>

            {/* Unsaved Changes Warning */}
            <UnsavedChangesModal />
        </>
    );
};

export default CreatePassModal;
