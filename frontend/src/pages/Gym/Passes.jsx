import React, { useState, useEffect } from 'react';
import { gymAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/UI/Toast';
import BaseModal from '../../components/UI/BaseModal';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { getUserFullName } from '../../utils/userUtils';
import CreatePassModal from '../../components/Cards/CreatePassModal';

const GymPasses = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [passes, setPasses] = useState([]);
    const [pricing, setPricing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPass, setEditingPass] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteMode, setDeleteMode] = useState('soft'); // 'soft' or 'cascade'
    const [checkInPass, setCheckInPass] = useState(null);
    const [checkInLoading, setCheckInLoading] = useState(false);

    const isAdmin = user?.roles?.includes('admin');

    const typeLabels = {
        single: 'Единичен',
        prepaid_entries: 'Предплатени посещения',
        time_based: 'Времева база',
    };

    const paymentStatusLabels = {
        paid: 'Платено',
        unpaid: 'Неплатено',
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [passesRes, pricingRes] = await Promise.all([
                gymAPI.getAllPasses(),
                gymAPI.getAllPricing({ isActive: 'true', category: 'gym_pass,gym_single_visit' }),
            ]);

            setPasses(passesRes.data.passes || []);
            setPricing(pricingRes.data.pricing || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Грешка при зареждане на данни', 'error');
        } finally {
            setLoading(false);
        }
    };



    const handleEditClick = (pass) => {
        setEditingPass(pass);
        setShowModal(true);
    };

    const handleDeleteClick = (id) => {
        setDeletingId(id);
        setDeleteMode('soft'); // Reset to soft delete
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingId) return;

        try {
            if (deleteMode === 'cascade') {
                await gymAPI.deletePassCascade(deletingId);
                showToast('Картата и всички свързани посещения са изтрити успешно', 'success');
            } else {
                await gymAPI.deletePass(deletingId);
                showToast('Картата е изтрита успешно', 'success');
            }
            fetchData();
        } catch (error) {
            console.error('Error deleting pass:', error);
            showToast(
                error.response?.data?.error?.message || 'Грешка при изтриване на карта',
                'error'
            );
        } finally {
            setShowDeleteConfirm(false);
            setDeletingId(null);
            setDeleteMode('soft');
        }
    };

    const handleUpdatePass = async (passId, data) => {
        try {
            await gymAPI.updatePass(passId, data);
            showToast('Картата е обновена успешно', 'success');
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error updating pass:', error);
            showToast(
                error.response?.data?.error?.message || 'Грешка при запазване на карта',
                'error'
            );
            throw error; // Re-throw to let modal handle it
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('bg-BG');
    };

    const handleCheckInClick = (pass) => {
        setCheckInPass(pass);
    };

    const handleCheckInConfirm = async () => {
        if (!checkInPass) return;

        try {
            setCheckInLoading(true);

            const data = {
                type: 'pass',
                gymPassId: checkInPass._id,
            };

            // For family passes, send familyId; for individual passes, send userId
            if (checkInPass.isFamilyPass && checkInPass.familyId) {
                data.familyId = checkInPass.familyId._id || checkInPass.familyId;
            } else {
                data.userId = checkInPass.userId?._id || checkInPass.userId;
            }

            await gymAPI.checkIn(data);

            showToast('Посещението е регистрирано успешно', 'success');
            setCheckInPass(null);
            fetchData();
        } catch (error) {
            console.error('Check-in error:', error);
            showToast(
                error.response?.data?.error?.message || 'Грешка при регистриране на посещение',
                'error'
            );
        } finally {
            setCheckInLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading text="Зареждане на карти..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">{/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-medium text-neutral-950">Карти и Абонаменти</h1>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Потребител
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Тип
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Име
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Посещения
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Валидна до
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Статус
                                </th>
                                {isAdmin && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Действия
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {passes.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={isAdmin ? 7 : 6}
                                        className="px-6 py-4 text-center text-sm text-gray-500"
                                    >
                                        Няма намерени карти
                                    </td>
                                </tr>
                            ) : (
                                passes.map((pass) => {
                                    let userName = '-';

                                    if (pass.isFamilyPass && pass.familyId) {
                                        // Family pass - show family name
                                        userName = `${pass.familyId.name || 'Семейство'}`;
                                    } else if (pass.userId) {
                                        // Individual pass - show user name
                                        const user = pass.userId;
                                        userName = getUserFullName(user) || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-';
                                    }

                                    const getPassStatus = (pass) => {
                                        if (!pass.isActive) return { label: 'Неактивна', color: 'bg-gray-100 text-gray-800' };

                                        const now = new Date();
                                        const startOfToday = new Date(now.setHours(0, 0, 0, 0));

                                        // Reset now for end of day comparison
                                        const endOfToday = new Date();
                                        endOfToday.setHours(23, 59, 59, 999);

                                        if (pass.validUntil && new Date(pass.validUntil) < startOfToday) {
                                            return { label: 'Изтекла', color: 'bg-red-100 text-red-800' };
                                        }

                                        if (pass.validFrom && new Date(pass.validFrom) > endOfToday) {
                                            return { label: 'Бъдеща', color: 'bg-blue-100 text-blue-800' };
                                        }

                                        if (pass.remainingEntries === 0) {
                                            return { label: 'Изчерпана', color: 'bg-orange-100 text-orange-800' };
                                        }

                                        return { label: 'Активна', color: 'bg-green-100 text-green-800' };
                                    };

                                    const status = getPassStatus(pass);

                                    return (
                                        <tr key={pass._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {userName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {typeLabels[pass.type] || pass.type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {pass.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {pass.remainingEntries !== null && pass.totalEntries !== null
                                                    ? `${pass.remainingEntries} / ${pass.totalEntries}`
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(pass.validUntil)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                                                >
                                                    {status.label}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2">
                                                        {pass.isActive && (
                                                            <button
                                                                onClick={() => handleCheckInClick(pass)}
                                                                className="text-green-600 hover:text-green-900"
                                                                title="Регистрирай посещение"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleEditClick(pass)}
                                                            className="text-orange-600 hover:text-orange-900"
                                                            title="Редактирай"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(pass._id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Изтрий"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal - Using CreatePassModal */}
            <CreatePassModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                editingPass={editingPass}
                pricing={pricing}
                actionType="create"
                mode="gym"
                onCreate={handleUpdatePass}
            />

            {/* Check-In Confirmation Modal */}
            <BaseModal
                isOpen={!!checkInPass}
                onClose={() => setCheckInPass(null)}
                title="Потвърждение за регистрация"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => setCheckInPass(null)}
                            disabled={checkInLoading}
                        >
                            Отказ
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleCheckInConfirm}
                            disabled={checkInLoading}
                        >
                            {checkInLoading ? 'Регистриране...' : 'Потвърди'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {checkInPass && (
                        <>
                            <p className="text-sm text-gray-700">
                                Сигурни ли сте, че искате да регистрирате посещение за:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-500">Клиент:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {checkInPass.isFamilyPass && checkInPass.familyId
                                            ? checkInPass.familyId.name || 'Семейство'
                                            : getUserFullName(checkInPass.userId) || '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-500">Карта:</span>
                                    <span className="text-sm font-semibold text-gray-900">{checkInPass.name}</span>
                                </div>
                                {checkInPass.remainingEntries !== null && (
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-500">Оставащи посещения:</span>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {checkInPass.remainingEntries} / {checkInPass.totalEntries}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </BaseModal>

            {/* Delete Confirmation Modal */}
            <BaseModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeletingId(null);
                    setDeleteMode('soft');
                }}
                title="Потвърждение за изтриване"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeletingId(null);
                                setDeleteMode('soft');
                            }}
                        >
                            Отказ
                        </Button>
                        <Button variant="danger" onClick={handleDeleteConfirm}>
                            Изтрий
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-700 mb-3">
                        Моля, изберете как искате да изтриете картата:
                    </p>

                    <div className="space-y-2">
                        <label className="flex items-start p-3 border border-gray-200 rounded-[10px] cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                                type="radio"
                                name="deleteMode"
                                value="soft"
                                checked={deleteMode === 'soft'}
                                onChange={(e) => setDeleteMode(e.target.value)}
                                className="mt-1 w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                            />
                            <div className="ml-3 flex-1">
                                <span className="block text-sm font-medium text-gray-900">Изтрий само картата</span>
                                <span className="block text-xs text-gray-500 mt-1">Картата ще бъде деактивирана, но посещенията ще останат в историята</span>
                            </div>
                        </label>

                        <label className="flex items-start p-3 border-2 border-red-200 rounded-[10px] cursor-pointer hover:bg-red-50 transition-colors">
                            <input
                                type="radio"
                                name="deleteMode"
                                value="cascade"
                                checked={deleteMode === 'cascade'}
                                onChange={(e) => setDeleteMode(e.target.value)}
                                className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <div className="ml-3 flex-1">
                                <span className="block text-sm font-medium text-red-900">Изтрий картата И всички посещения</span>
                                <span className="block text-xs text-red-600 mt-1">⚠️ ВНИМАНИЕ: Всички записи за посещения с тази карта ще бъдат изтрити завинаги!</span>
                            </div>
                        </label>
                    </div>
                </div>
            </BaseModal>
        </div>
    );
};

export default GymPasses;
