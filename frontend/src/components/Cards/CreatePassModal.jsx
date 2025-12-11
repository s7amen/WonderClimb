import React, { useState, useEffect, useRef, useMemo } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import api from '../../services/api';
import { getUserFullName } from '../../utils/userUtils';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';
import SmartSelector from '../Climbers/SmartSelector';

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

    // Fetch next sequential pass ID when modal opens (only for gym passes)
    const fetchNextPassId = async () => {
        if (mode === 'training') {
            // For training passes, numbers are random, show placeholder
            return 'T-XXXX (произволен)';
        }
        
        try {
            // Fetch all gym passes to calculate next ID
            const response = await api.get('/gym/passes?limit=1000');
            const passes = response.data.passes || [];
            
            // Filter to only numeric passIds and convert to numbers
            const numericPassIds = passes
                .map(p => p.passId)
                .filter(id => /^\d+$/.test(id)) // Only pure numbers
                .map(id => parseInt(id, 10))
                .filter(num => !isNaN(num));
            
            if (numericPassIds.length === 0) {
                // No numeric passes exist, start from 1
                return '1';
            }
            
            // Find the largest number from existing passes
            const maxNumber = Math.max(...numericPassIds);
            
            // Return next number
            return (maxNumber + 1).toString();
        } catch (error) {
            console.error('Error fetching next pass ID:', error);
            // Fallback to simple sequential number
            return '1';
        }
    };

    // Fetch users when modal opens
    useEffect(() => {
        if (isOpen) {

            // Generate card number for new pass
            if (!editingPass) {
                // Fetch and set next sequential pass ID
                fetchNextPassId().then(nextId => {
                    setGeneratedCardNumber(nextId);
                });

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
                    remainingEntries: '',
                    amount: '',
                    isActive: true,
                    physicalCardCode: '',
                };
                setFormData(initialData);
                setInitialFormState(JSON.stringify(initialData));
            } else {
                // Edit mode - populate form
                console.log('Edit mode - editingPass:', editingPass);
                console.log('Edit mode - physicalCardId:', editingPass.physicalCardId);
                setGeneratedCardNumber(editingPass.passId || '');
                const validFromFormatted = editingPass.validFrom ? formatDateForInput(editingPass.validFrom) : '';
                const validUntilFormatted = editingPass.validUntil ? formatDateForInput(editingPass.validUntil) : '';

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

    // Compute selected pricing and derived type
    const selectedPricing = useMemo(() => {
        if (!formData.pricingId) return null;
        return pricing.find(p => p._id === formData.pricingId) || null;
    }, [formData.pricingId, pricing]);

    // Derive type label based on pricing.maxEntries
    const derivedTypeLabel = useMemo(() => {
        if (!selectedPricing) return '';
        // If maxEntries is null or 0 → time_based, if > 0 → prepaid_entries
        if (selectedPricing.maxEntries == null || selectedPricing.maxEntries === 0) {
            return 'За време';
        } else if (selectedPricing.maxEntries > 0) {
            return 'За брой посещения';
        }
        return '';
    }, [selectedPricing]);

    // Determine if entries field should be editable (only for prepaid_entries type)
    const isEntriesEditable = useMemo(() => {
        if (!selectedPricing) return false;
        // Editable only if maxEntries > 0 (prepaid_entries type)
        return selectedPricing.maxEntries != null && selectedPricing.maxEntries > 0;
    }, [selectedPricing]);

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
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
        const value = e.target.value;
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
                    const months = selectedPricing.validityDays || 1;
                    const validFrom = prev.validFrom || new Date().toISOString().split('T')[0];

                    const validUntilIso = addDuration(validFrom, months, 'months');

                    // Calculate amount with discount
                    const baseAmount = selectedPricing.amount || 0;
                    const discount = parseFloat(prev.discountPercent) || 0;
                    const finalAmount = baseAmount * (1 - discount / 100);

                    updates.validFrom = validFrom;
                    updates.validUntil = validUntilIso;
                    updates.amount = finalAmount.toFixed(2);
                    // Set remainingEntries based on pricing.maxEntries (read-only, user cannot edit)
                    updates.remainingEntries = (selectedPricing.maxEntries != null && selectedPricing.maxEntries > 0) 
                        ? selectedPricing.maxEntries.toString() 
                        : '';
                }
            }

            // Allow editing of remainingEntries only for prepaid_entries type
            // For time_based type, it remains read-only
            if (field === 'remainingEntries') {
                const currentPricing = pricing.find(p => p._id === prev.pricingId);
                const isEditable = currentPricing && currentPricing.maxEntries != null && currentPricing.maxEntries > 0;
                if (!isEditable) {
                    // Don't allow changes for time_based type - this field is read-only
                    return prev;
                }
                // Allow changes for prepaid_entries type
            }

            // Recalculate validUntil when validFrom changes
            if (field === 'validFrom' && value && prev.pricingId) {
                const selectedPricing = pricing.find(p => p._id === prev.pricingId);
                if (selectedPricing) {
                    const months = selectedPricing.validityDays || 1;
                    const validUntilIso = addDuration(value, months, 'months');
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
            // Get selected pricing to ensure consistent totalEntries
            const currentPricing = pricing.find(p => p._id === formData.pricingId);
            // Determine totalEntries based on pricing.maxEntries (null/0 → null, >0 → use edited value or maxEntries)
            let totalEntriesValue = null;
            if (currentPricing && currentPricing.maxEntries != null && currentPricing.maxEntries > 0) {
                // For prepaid_entries type, use edited remainingEntries if provided, otherwise use pricing.maxEntries
                if (formData.remainingEntries && formData.remainingEntries !== '') {
                    totalEntriesValue = parseInt(formData.remainingEntries);
                } else {
                    totalEntriesValue = currentPricing.maxEntries;
                }
            }

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
                totalEntries: totalEntriesValue,
                remainingEntries: totalEntriesValue,
                isActive: formData.isActive,
                physicalCardCode: formData.physicalCardCode && formData.physicalCardCode.trim() ? formData.physicalCardCode.trim() : null,
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
                            <SmartSelector
                                value={formData.familyId ? `family_${formData.familyId}` : formData.userId}
                                onChange={(item) => {
                                    if (item.type === 'family') {
                                        handleInputChange('familyId', item.id);
                                        handleInputChange('userId', '');
                                        setFormData(prev => ({ ...prev, isFamilyPass: true }));
                                        // Clear user error if present
                                        if (formErrors.userId) {
                                            setFormErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.userId;
                                                return newErrors;
                                            });
                                        }
                                    } else {
                                        handleInputChange('userId', item.id);
                                        handleInputChange('familyId', '');
                                        setFormData(prev => ({ ...prev, isFamilyPass: false }));
                                    }
                                }}
                                mode="pass"
                                allowFamilies={true}
                                placeholder="Изберете потребител или семейство"
                                disabled={!!editingPass}
                                className={formErrors.userId ? 'border-red-500' : ''}
                            />
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

                    {/* Physical Card Code - moved after User field */}
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

                    {/* Row 3: Dates (From, Validity, Until) */}
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
                                Валидност (месеци)
                            </label>
                            <input
                                type="text"
                                value={selectedPricing ? `${selectedPricing.validityDays || '-'} ${selectedPricing.validityDays === 1 ? 'месец' : selectedPricing.validityDays > 1 ? 'месеца' : ''}` : '-'}
                                readOnly
                                className="w-full px-3 py-2 bg-gray-100 border border-[#d1d5dc] rounded-[10px] text-sm text-gray-500 cursor-not-allowed"
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

                    {/* Row 4: Card Number, Type, and Entries - 3 columns */}
                    {formData.pricingId && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Card Number */}
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

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-950 mb-1">
                                    Тип
                                </label>
                                <input
                                    type="text"
                                    value={derivedTypeLabel}
                                    readOnly
                                    className="w-full px-3 py-2 bg-gray-100 border border-[#d1d5dc] rounded-[10px] text-sm text-gray-500 cursor-not-allowed"
                                />
                            </div>

                            {/* Entries - Editable for prepaid_entries, read-only for time_based */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-950 mb-1">
                                    Брой посещения
                                </label>
                                {isEntriesEditable ? (
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.remainingEntries}
                                        onChange={(e) => handleInputChange('remainingEntries', e.target.value)}
                                        placeholder="Въведете брой посещения"
                                        className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={formData.remainingEntries || (selectedPricing && (selectedPricing.maxEntries == null || selectedPricing.maxEntries === 0) ? 'Неограничен' : '')}
                                        readOnly
                                        className="w-full px-3 py-2 bg-gray-100 border border-[#d1d5dc] rounded-[10px] text-sm text-gray-500 cursor-not-allowed"
                                    />
                                )}
                            </div>
                        </div>
                    )}

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

                    {/* Row 8: Payment Status & Amount on one line */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-950 mb-1">
                                    Статус на плащане
                                </label>
                                <select
                                    value={formData.paymentStatus}
                                    onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                                    className="px-3 py-2 bg-white border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                                >
                                    {Object.entries(paymentStatusLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-neutral-950 mb-1">
                                    Крайна сума (EUR)
                                </label>
                                <div className="text-3xl font-bold text-neutral-950 text-right">
                                    {formData.amount ? `${parseFloat(formData.amount).toFixed(2)} €` : '-'}
                                </div>
                            </div>
                        </div>
                        {editingPass && (
                            <div className="flex items-center">
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
