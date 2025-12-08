import React, { useState } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { adminUsersAPI } from '../../services/api';
import { useToast } from '../UI/Toast';
import useUnsavedChangesWarning from '../../hooks/useUnsavedChangesWarning.jsx';

const AddClimberModal = ({ isOpen, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        notes: '',
        isTrainee: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName) {
            showToast('Моля попълнете задължителните полета (Име и Фамилия)', 'error');
            return;
        }

        try {
            setLoading(true);
            await adminUsersAPI.create(formData);
            showToast('Катерачът е добавен успешно', 'success');
            onSuccess?.();
            onClose();
            // Reset form
            setFormData({
                firstName: '',
                middleName: '',
                lastName: '',
                email: '',
                phone: '',
                dateOfBirth: '',
                notes: '',
                isTrainee: false
            });
        } catch (error) {
            console.error('Error creating climber:', error);
            showToast(
                error.response?.data?.error?.message || 'Грешка при създаване на катерач',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const hasUnsavedChanges = () => {
        return formData.firstName !== '' ||
            formData.middleName !== '' ||
            formData.lastName !== '' ||
            formData.email !== '' ||
            formData.phone !== '' ||
            formData.dateOfBirth !== '' ||
            formData.notes !== '' ||
            formData.isTrainee !== false;
    };

    const { confirmClose, UnsavedChangesModal } = useUnsavedChangesWarning({
        hasChanges: hasUnsavedChanges
    });

    const handleClose = () => {
        confirmClose(onClose);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Добавяне на катерач"
            size="2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Име *"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        placeholder="Иван"
                    />
                    <Input
                        label="Презиме"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleChange}
                        placeholder="Иванов"
                    />
                    <Input
                        label="Фамилия *"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        placeholder="Петров"
                    />
                    <Input
                        label="Телефон"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="0888123456"
                    />
                    <Input
                        label="Имейл"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="ivan@example.com"
                    />
                    <Input
                        label="Дата на раждане"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Бележки
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2"
                        placeholder="Допълнителна информация..."
                    />
                </div>

                <div className="flex items-center">
                    <input
                        id="isTrainee"
                        name="isTrainee"
                        type="checkbox"
                        checked={formData.isTrainee}
                        onChange={handleChange}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isTrainee" className="ml-2 block text-sm text-gray-900">
                        Трениращ (Trainee)
                    </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Отказ
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        loading={loading}
                    >
                        Създай катерач
                    </Button>
                </div>
            </form>
            <UnsavedChangesModal />
        </BaseModal >
    );
};

export default AddClimberModal;
