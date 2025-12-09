import React, { useState, useEffect } from 'react';
import { pricingAPI } from '../../services/api';
import { useToast } from '../../components/UI/Toast';
import { PRICING_CATEGORIES, getCategoryLabel, PRICING_CODE_FORMAT_HINT } from '../../constants/pricing';
import BaseModal from '../../components/UI/BaseModal';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';

const AdminPricing = () => {
    const { showToast } = useToast();
    const [pricings, setPricings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filterCategory, setFilterCategory] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [formData, setFormData] = useState({
        pricingCode: '',
        labelBg: '',
        category: '',
        amount: '',
        validityDays: '',
        validityType: 'days',
        maxEntries: '',
        notes: '',
    });

    const [formErrors, setFormErrors] = useState({});
    const [isExistingCodeSelected, setIsExistingCodeSelected] = useState(false);

    useEffect(() => {
        fetchPricings();
    }, [filterCategory, showInactive]);

    const fetchPricings = async () => {
        try {
            setLoading(true);
            const filters = {
                isActive: showInactive ? undefined : 'true',
                category: filterCategory || undefined,
            };
            const response = await pricingAPI.getAll(filters);
            setPricings(response.data.data || response.data.pricings || []);
        } catch (error) {
            console.error('Error fetching pricings:', error);
            showToast('Грешка при зареждане на цените', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        setIsEditing(false);
        setIsExistingCodeSelected(false);
        setFormData({
            pricingCode: '', // Empty means "new code"
            labelBg: '',
            category: '',
            amount: '',
            validityDays: '',
            validityType: 'days',
            maxEntries: '',
            notes: '',
        });
        setFormErrors({});
        setShowModal(true);
    };

    const handlePricingCodeSelect = (pricingCode) => {
        if (!pricingCode || pricingCode === '__NEW__') {
            // Reset form for new pricing code
            setIsExistingCodeSelected(false);
            setFormData({
                pricingCode: '',
                labelBg: '',
                category: '',
                amount: '',
                validityDays: '',
                validityType: 'days',
                maxEntries: '',
                notes: '',
            });
            return;
        }

        // Find the selected pricing and auto-fill
        const selectedPricing = pricings.find(p => p.pricingCode === pricingCode);
        if (selectedPricing) {
            setIsExistingCodeSelected(true);
            setFormData({
                pricingCode: selectedPricing.pricingCode,
                labelBg: selectedPricing.labelBg,
                category: selectedPricing.category,
                amount: selectedPricing.amount.toString(),
                validityDays: selectedPricing.validityDays?.toString() || '',
                validityType: selectedPricing.validityType || 'days',
                maxEntries: selectedPricing.maxEntries?.toString() || '',
                notes: selectedPricing.notes || '',
            });
        }
    };

    const handleEditClick = (pricing) => {
        setIsEditing(true);
        setFormData({
            pricingCode: pricing.pricingCode,
            labelBg: pricing.labelBg,
            category: pricing.category,
            amount: pricing.amount.toString(),
            validityDays: pricing.validityDays?.toString() || '',
            validityType: pricing.validityType || 'days',
            maxEntries: pricing.maxEntries?.toString() || '',
            notes: pricing.notes || '',
        });
        setFormErrors({});
        setShowModal(true);
    };

    const handleViewHistory = async (pricingCode) => {
        try {
            setLoadingHistory(true);
            setShowHistoryModal(true);
            const response = await pricingAPI.getHistory(pricingCode);
            setHistoryData(response.data.data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            showToast('Грешка при зареждане на историята', 'error');
            setShowHistoryModal(false);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDeactivate = async (pricingCode) => {
        if (!confirm('Сигурни ли сте, че искате да деактивирате тази цена?')) return;

        try {
            await pricingAPI.deactivate(pricingCode);
            showToast('Цената е деактивирана успешно', 'success');
            fetchPricings();
        } catch (error) {
            console.error('Error deactivating pricing:', error);
            showToast('Грешка при деактивиране', 'error');
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.pricingCode.trim()) {
            errors.pricingCode = 'Кодът е задължителен';
        } else if (!/^[A-Z0-9_]+$/.test(formData.pricingCode)) {
            errors.pricingCode = 'Кодът трябва да съдържа само главни букви, цифри и долни черти';
        }

        if (!formData.labelBg.trim()) {
            errors.labelBg = 'Заглавието е задължително';
        }

        if (!formData.category) {
            errors.category = 'Категорията е задължителна';
        }

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            errors.amount = 'Сумата трябва да е по-голяма от 0';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setIsSaving(true);

        try {
            const submitData = {
                pricingCode: formData.pricingCode.trim().toUpperCase(),
                labelBg: formData.labelBg.trim(),
                category: formData.category,
                amount: parseFloat(formData.amount),
                validityDays: formData.validityDays ? parseInt(formData.validityDays) : null,
                validityType: formData.validityType,
                maxEntries: formData.maxEntries ? parseInt(formData.maxEntries) : null,
                notes: formData.notes.trim() || undefined,
            };

            if (isEditing) {
                await pricingAPI.update(formData.pricingCode, submitData);
                showToast('Цената е обновена успешно (създадена нова версия)', 'success');
            } else {
                await pricingAPI.create(submitData);
                showToast('Цената е създадена успешно', 'success');
            }

            setShowModal(false);
            fetchPricings();
        } catch (error) {
            console.error('Error saving pricing:', error);
            showToast(
                error.response?.data?.message || 'Грешка при запазване на цената',
                'error'
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('bg-BG');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading text="Зареждане на цени..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">{/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-medium text-neutral-950">Управление на цени</h1>
                </div>
                <Button variant="primary" onClick={handleAddClick}>
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добави цена
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">
                            Категория
                        </label>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                        >
                            <option value="">Всички категории</option>
                            {PRICING_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="ml-2 text-sm font-medium text-neutral-950">
                                Покажи неактивни
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Код</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Заглавие</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сума</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Валидност</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Макс. посещения</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pricings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                                        Няма намерени цени
                                    </td>
                                </tr>
                            ) : (
                                pricings.map((pricing) => (
                                    <tr key={pricing._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                            {pricing.pricingCode}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {pricing.labelBg}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {getCategoryLabel(pricing.category)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {pricing.amount.toFixed(2)} €
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {pricing.validityDays ? `${pricing.validityDays} ${pricing.validityType === 'months' ? (pricing.validityDays === 1 ? 'месец' : 'месеца') : 'дни'}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {pricing.maxEntries || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${pricing.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {pricing.isActive ? 'Активна' : 'Неактивна'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                {pricing.isActive && (
                                                    <button
                                                        onClick={() => handleEditClick(pricing)}
                                                        className="text-orange-600 hover:text-orange-900"
                                                        title="Промени цена (създава нова версия)"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleViewHistory(pricing.pricingCode)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="История"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </button>
                                                {pricing.isActive && (
                                                    <button
                                                        onClick={() => handleDeactivate(pricing.pricingCode)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Деактивирай"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <BaseModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEditing ? 'Промяна на цена' : 'Добавяне на нова цена'}
                size="lg"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSaving}>
                            Отказ
                        </Button>
                        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Запазване...' : 'Запази'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {isEditing && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <p className="text-sm text-yellow-700">
                                ⚠️ Промяната на цената ще създаде <strong>нова версия</strong>. Старата версия ще бъде архивирана.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">
                            Код на цената *
                        </label>
                        {!isEditing ? (
                            <>
                                <select
                                    value={formData.pricingCode || '__NEW__'}
                                    onChange={(e) => handlePricingCodeSelect(e.target.value === '__NEW__' ? '' : e.target.value)}
                                    className={`w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 font-mono ${formErrors.pricingCode ? 'border-red-500' : ''}`}
                                >
                                    <option value="__NEW__">≫ Нов код</option>
                                    {/* Get unique pricingCodes */}
                                    {[...new Set(pricings.map(p => p.pricingCode))].sort().map(code => (
                                        <option key={code} value={code}>{code}</option>
                                    ))}
                                </select>
                                {isExistingCodeSelected && (
                                    <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400">
                                        <p className="text-xs text-blue-700">
                                            ✓ Избрахте съществуващ код. Полетата са попълнени автоматично. Променете каквото искате и запазете.
                                        </p>
                                    </div>
                                )}
                                {!isExistingCodeSelected && (
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            value={formData.pricingCode}
                                            onChange={(e) => handleInputChange('pricingCode', e.target.value.toUpperCase())}
                                            placeholder="GYM_PASS_MONTHLY"
                                            className={`w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 font-mono ${formErrors.pricingCode ? 'border-red-500' : ''}`}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">{PRICING_CODE_FORMAT_HINT}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <input
                                type="text"
                                value={formData.pricingCode}
                                disabled
                                className="w-full px-3 py-2 bg-gray-100 border border-[#d1d5dc] rounded-[10px] text-sm text-neutral-950 font-mono opacity-50 cursor-not-allowed"
                            />
                        )}
                        {formErrors.pricingCode && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.pricingCode}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">
                            Заглавие (BG) *
                        </label>
                        <input
                            type="text"
                            value={formData.labelBg}
                            onChange={(e) => handleInputChange('labelBg', e.target.value)}
                            placeholder="Месечна карта за зала"
                            className={`w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 ${formErrors.labelBg ? 'border-red-500' : ''
                                }`}
                        />
                        {formErrors.labelBg && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.labelBg}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">
                            Категория *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className={`w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 ${formErrors.category ? 'border-red-500' : ''
                                }`}
                        >
                            <option value="">Изберете категория</option>
                            {PRICING_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                        {formErrors.category && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Сума (EUR) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => handleInputChange('amount', e.target.value)}
                                className={`w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 ${formErrors.amount ? 'border-red-500' : ''
                                    }`}
                            />
                            {formErrors.amount && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
                            )}
                        </div>

                        <div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-neutral-950 mb-1">
                                        Валидност
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.validityDays}
                                        onChange={(e) => handleInputChange('validityDays', e.target.value)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                                    />
                                </div>
                                <div className="w-[110px]">
                                    <label className="block text-sm font-medium text-neutral-950 mb-1">
                                        Мярка
                                    </label>
                                    <select
                                        value={formData.validityType}
                                        onChange={(e) => handleInputChange('validityType', e.target.value)}
                                        className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                                    >
                                        <option value="days">Дни</option>
                                        <option value="months">Месеци</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-950 mb-1">
                                Макс. посещения
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.maxEntries}
                                onChange={(e) => handleInputChange('maxEntries', e.target.value)}
                                placeholder="Опционално"
                                className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                            />
                        </div>
                    </div>

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

            {/* History Modal */}
            <BaseModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title="История на цените"
                size="xl"
            >
                {loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                        <Loading text="Зареждане на история..." />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Версия</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сума</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Валидна от</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Валидна до</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {historyData.map((item, index) => (
                                    <tr key={item._id} className={index === 0 ? 'bg-green-50' : ''}>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {index === 0 ? '🟢 Текуща' : `v${historyData.length - index}`}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {item.amount.toFixed(2)} €
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatDate(item.validFrom)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatDate(item.validUntil)}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {item.isActive ? 'Активна' : 'Архивирана'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </BaseModal>
        </div>
    );
};

export default AdminPricing;
