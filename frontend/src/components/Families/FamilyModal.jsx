import React, { useState, useEffect } from 'react';
import BaseModal from '../UI/BaseModal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../UI/Toast';
import api from '../../services/api';

const FamilyModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [members, setMembers] = useState([]);
    const [allClimbers, setAllClimbers] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name || '');
                setMembers(initialData.memberIds || []);
            } else {
                setName('');
                setMembers([]);
            }
            setShowDropdown(false);
            fetchAllClimbers();
        }
    }, [isOpen, initialData]);

    const fetchAllClimbers = async () => {
        try {
            const response = await api.get('/admin/users', {
                params: {
                    role: 'climber',
                    limit: 200,
                    sort: 'firstName'
                }
            });
            const users = response.data.users || [];

            // Normalize users: backend returns 'id' but we use '_id' elsewhere
            const normalizedUsers = users.map(u => ({
                ...u,
                _id: u._id || u.id
            }));

            // Remove duplicates and items without ID
            const validUsers = normalizedUsers.filter(u => u && u._id);
            const uniqueUsers = Array.from(new Map(validUsers.map(item => [item._id, item])).values());
            setAllClimbers(uniqueUsers);
        } catch (error) {
            console.error('Error fetching climbers:', error);
        }
    };

    const handleAddMember = (climber) => {
        if (!members.find(m => m._id === climber._id)) {
            setMembers([...members, climber]);
        }
        setShowDropdown(false);
    };

    const handleRemoveMember = (userId) => {
        setMembers(members.filter(m => m._id !== userId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log('Submitting family with members:', members);
        console.log('MemberIds to send:', members.map(m => m._id));

        try {
            setLoading(true);
            const validMemberIds = members
                .map(m => m._id)
                .filter(id => id); // Filter out any undefined/null IDs

            const payload = {
                name,
                memberIds: validMemberIds
            };

            console.log('Payload:', payload);
            await onSave(payload);
            onClose();
        } catch (error) {
            console.error('Error saving family:', error);
            showToast(error.response?.data?.message || error.message || 'Error saving family', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Get climbers who are not already members
    const availableClimbers = allClimbers.filter(c => !members.find(m => m._id === c._id));

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Редактиране на семейство' : 'Ново семейство'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    label="Име на семейството (напр. Семейство Петрови)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Въведете име..."
                />

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Членове на семейството ({members.length})
                    </label>

                    {members.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 mb-3 border border-gray-200">
                            {members.map((member, index) => (
                                <div key={member._id || `member-${index}`} className="flex items-center justify-between bg-white p-2 rounded shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{member.firstName} {member.lastName}</div>
                                            <div className="text-xs text-gray-500">{member.email || member.phone}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMember(member._id)}
                                        className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-sm"
                                    >
                                        Премахни
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left hover:bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            {showDropdown ? 'Затвори списъка' : 'Добави катерач...'}
                        </button>

                        {showDropdown && availableClimbers.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                                {availableClimbers.map((climber) => (
                                    <div
                                        key={climber._id}
                                        className="cursor-pointer select-none relative py-2 px-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                        onClick={() => handleAddMember(climber)}
                                    >
                                        <div className="font-medium">{climber.firstName} {climber.lastName}</div>
                                        <div className="text-xs text-gray-500">{climber.email || climber.phone}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showDropdown && availableClimbers.length === 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-3 px-3 text-sm text-gray-500">
                                Няма повече налични катерачи
                            </div>
                        )}
                    </div>
                </div>



                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Отказ
                    </Button>
                    <Button type="submit" loading={loading}>
                        {initialData ? 'Запази промените' : 'Създай семейство'}
                    </Button>
                </div>
            </form></BaseModal>
    );
};

export default FamilyModal;
