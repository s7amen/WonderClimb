import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/UI/Toast';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import FamilyModal from '../../components/Families/FamilyModal';

const FamilyList = () => {
    const { showToast } = useToast();
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [search, setSearch] = useState('');

    const fetchFamilies = async () => {
        try {
            setLoading(true);
            const response = await api.get('/families', {
                params: { search }
            });
            setFamilies(response.data);
        } catch (error) {
            console.error('Error fetching families:', error);
            showToast('Неуспешно зареждане на семейства', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFamilies();
    }, [search]);

    const handleCreate = async (data) => {
        try {
            await api.post('/families', data);
            showToast('Семейството е създадено успешно', 'success');
            fetchFamilies();
        } catch (error) {
            throw error;
        }
    };

    const handleUpdate = async (data) => {
        try {
            await api.put(`/families/${selectedFamily._id}`, data);
            showToast('Семейството е обновен успешно', 'success');
            fetchFamilies();
        } catch (error) {
            throw error;
        }
    };

    const handleDelete = async (family) => {
        const confirmed = window.confirm(`Искате ли да изтриете семейство "${family.name}"?`);

        if (confirmed) {
            try {
                await api.delete(`/families/${family._id}`);
                showToast('Семейството е изтрито', 'success');
                setFamilies(families.filter(f => f._id !== family._id));
            } catch (error) {
                showToast('Грешка при изтриване', 'error');
            }
        }
    };

    const openEditModal = (family) => {
        setSelectedFamily(family);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setSelectedFamily(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-medium text-neutral-950">Семейства</h1>
                <Button onClick={openCreateModal}>
                    Ново семейство
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <input
                    type="text"
                    placeholder="Търсене на семейства..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <Loading />
            ) : families.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    Няма намерени семейства. Създайте първото!
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Семейство
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Катерачи
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Действия
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {families.map((family) => (
                                <tr key={family._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                                    {family.name.charAt(0)}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <Link to={`/families/${family._id}`} className="text-sm font-medium text-gray-900 hover:text-orange-600 transition-colors">
                                                    {family.name}
                                                </Link>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {family.memberIds.map((member, index) => (
                                                <span
                                                    key={member._id}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {member.firstName} {member.lastName}
                                                </span>
                                            ))}
                                            {family.memberIds.length === 0 && (
                                                <span className="text-sm text-gray-400 italic">Няма добавени катерачи</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(family)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            Редактиране
                                        </button>
                                        <button
                                            onClick={() => handleDelete(family)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Изтриване
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <FamilyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={selectedFamily ? handleUpdate : handleCreate}
                initialData={selectedFamily}
            /></div>
    );
};

export default FamilyList;
