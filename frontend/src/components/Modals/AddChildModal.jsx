import React, { useState, useEffect } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import { useToast } from '../UI/Toast';
import { parentClimbersAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

const AddChildModal = ({ isOpen, onClose, onSuccess, initialData = null, zIndex = 10000 }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        email: '',
    });
    const [foundExistingProfile, setFoundExistingProfile] = useState(null);

    // Initialize form with data when initialData changes or modal opens
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                firstName: initialData.firstName || '',
                lastName: initialData.lastName || '',
                dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : '',
                email: initialData.email || '',
            });
        } else if (isOpen) {
            setFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
        }
        setFoundExistingProfile(null);
    }, [isOpen, initialData]);

    const resetForm = () => {
        setFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
        setFoundExistingProfile(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName) {
            showToast('Моля, попълнете поне име и фамилия', 'error');
            return;
        }

        setLoading(true);
        try {
            const childData = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                dateOfBirth: formData.dateOfBirth || undefined,
            };

            if (initialData) {
                // Update existing child
                await parentClimbersAPI.update(initialData._id, {
                    ...childData,
                    notes: initialData.notes // Preserve notes if they exist, though not editable here yet
                });
                showToast('Детето е обновено успешно', 'success');
            } else {
                // Create new child
                const response = await parentClimbersAPI.create(childData);

                // Check if duplicate found (only relevant for creation)
                if (response.data.duplicate && response.data.existingProfile) {
                    setFoundExistingProfile(response.data.existingProfile);
                    setLoading(false);
                    return;
                }
                showToast('Детето е добавено успешно', 'success');
            }

            onSuccess?.();
            handleClose();
        } catch (error) {
            if (!initialData && error.response?.data?.error?.existingProfile) {
                setFoundExistingProfile(error.response.data.error.existingProfile);
            } else {
                showToast(
                    error.response?.data?.error?.message ||
                    (initialData ? 'Грешка при обновяване на дете' : 'Грешка при добавяне на дете'),
                    'error'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLinkExistingChild = async () => {
        if (!foundExistingProfile?._id) return;

        setLoading(true);
        try {
            await parentClimbersAPI.linkExisting(foundExistingProfile._id);
            showToast('Профилът е свързан успешно', 'success');
            onSuccess?.();
            handleClose();
        } catch (error) {
            showToast(
                error.response?.data?.error?.message || 'Грешка при свързване на профил',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={foundExistingProfile ? 'Свържи съществуващ профил' : (initialData ? 'Редактирай дете' : 'Добави дете')}
            size="md"
            zIndex={zIndex}
        >
            <div className="p-1">
                {foundExistingProfile ? (
                    <div>
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800 mb-2">
                                Намерен е съществуващ профил с тези данни:
                            </p>
                            <div className="text-sm text-gray-700">
                                <p><strong>Име:</strong> {foundExistingProfile.firstName} {foundExistingProfile.lastName}</p>
                                {foundExistingProfile.dateOfBirth && (
                                    <p><strong>Дата на раждане:</strong> {formatDate(foundExistingProfile.dateOfBirth)}</p>
                                )}
                                {foundExistingProfile.email && (
                                    <p><strong>Имейл:</strong> {foundExistingProfile.email}</p>
                                )}
                            </div>
                        </div>

                        <div className="mb-4 p-3 bg-blue-50 rounded-md">
                            <p className="text-sm text-gray-700">
                                Искате ли да свържете този профил към вашия акаунт?
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setFoundExistingProfile(null)}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Отказ
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleLinkExistingChild}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    'Свързване...'
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        Свържи профил
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Име <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6900] focus:border-[#ff6900] outline-none"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Фамилия <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6900] focus:border-[#ff6900] outline-none"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Дата на раждане (dd/mm/yyyy)
                                </label>
                                <input
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6900] focus:border-[#ff6900] outline-none"
                                    disabled={loading}
                                    placeholder="dd/mm/yyyy"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Отказ
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    initialData ? 'Запазване...' : 'Добавяне...'
                                ) : (
                                    initialData ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Запази
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Добави дете
                                        </>
                                    )
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </BaseModal>
    );
};

export default AddChildModal;
