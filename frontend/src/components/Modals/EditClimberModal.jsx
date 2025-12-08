import React, { useState, useEffect, useRef } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import { useToast } from '../UI/Toast';
import { adminUsersAPI } from '../../services/api';
import useUnsavedChangesWarning from '../../hooks/useUnsavedChangesWarning.jsx';

const EditClimberModal = ({ isOpen, onClose, user, onSuccess }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form state

    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        notes: '',
        accountStatus: 'active',
        isTrainee: false
    });
    const [roles, setRoles] = useState([]);
    const [originalRoles, setOriginalRoles] = useState([]);

    const availableRoles = [
        { value: 'admin', label: 'Администратор' },
        { value: 'coach', label: 'Треньор' },
        { value: 'climber', label: 'Катерач' },
        { value: 'instructor', label: 'Инструктор' },
    ];

    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                firstName: user.firstName || '',
                middleName: user.middleName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || '',
                dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
                notes: user.notes || '',
                accountStatus: user.accountStatus || 'active',
                isTrainee: user.isTrainee || false
            });
            setRoles(user.roles || []);
            setOriginalRoles(user.roles || []);
        }
    }, [user, isOpen]);

    const hasUnsavedChanges = () => {
        if (!user) return false;

        const formChanged =
            formData.firstName !== (user.firstName || '') ||
            formData.middleName !== (user.middleName || '') ||
            formData.lastName !== (user.lastName || '') ||
            formData.email !== (user.email || '') ||
            formData.phone !== (user.phone || '') ||
            formData.dateOfBirth !== (user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '') ||
            formData.notes !== (user.notes || '') ||
            formData.accountStatus !== (user.accountStatus || 'active') ||
            formData.isTrainee !== (user.isTrainee || false);

        const rolesChanged = JSON.stringify(roles.sort()) !== JSON.stringify(originalRoles.sort());

        return formChanged || rolesChanged;
    };

    const handleRoleToggle = (roleValue) => {
        setRoles(prev => {
            if (prev.includes(roleValue)) {
                return prev.filter(r => r !== roleValue);
            }
            return [...prev, roleValue];
        });
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // Validate required fields
            if (!formData.firstName || !formData.lastName) {
                showToast('Моля попълнете задължителните полета (Име и Фамилия)', 'error');
                return;
            }

            if (roles.length === 0) {
                showToast('Моля изберете поне една роля', 'error');
                return;
            }

            // Update details
            await adminUsersAPI.update(user.id, formData);

            // Update roles if changed
            if (JSON.stringify(roles.sort()) !== JSON.stringify(originalRoles.sort())) {
                await adminUsersAPI.updateRoles(user.id, { roles });
            }

            showToast('Промените са запазени успешно', 'success');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating user:', error);
            showToast(
                error.response?.data?.error?.message || 'Грешка при обновяване на потребител',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    // Initialize unsaved changes warning hook
    const { confirmClose, UnsavedChangesModal } = useUnsavedChangesWarning({
        hasChanges: hasUnsavedChanges
    });

    const handleClose = () => {
        confirmClose(onClose);
    };

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={handleClose}
                title="Редактиране на катерач"
                size="2xl"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Име *</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Презиме</label>
                            <input
                                type="text"
                                value={formData.middleName}
                                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Фамилия *</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Имейл</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Телефон</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Дата на раждане</label>
                            <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Акаунт статус</label>
                            <select
                                value={formData.accountStatus}
                                onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                            >
                                <option value="active">Активен</option>
                                <option value="inactive">Неактивен</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Трениращ</label>
                            <select
                                value={formData.isTrainee ? 'true' : 'false'}
                                onChange={(e) => setFormData({ ...formData, isTrainee: e.target.value === 'true' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                            >
                                <option value="true">Да</option>
                                <option value="false">Не</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Роли *</label>
                            <div className="space-y-2 border border-gray-200 rounded-md p-3">
                                {availableRoles.map((role) => (
                                    <label key={role.value} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={roles.includes(role.value)}
                                            onChange={() => handleRoleToggle(role.value)}
                                            className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-700">{role.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Бележки</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 mt-6 border-t gap-3">
                    <Button variant="secondary" onClick={handleClose}>Отказ</Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Запазване...' : 'Запази'}
                    </Button>
                </div>
            </BaseModal>

            {/* Unsaved changes warning modal */}
            <UnsavedChangesModal />
        </>
    );
};

export default EditClimberModal;
