import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL, gymAPI } from '../../services/api';
import api from '../../services/api';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { getUserFullName } from '../../utils/userUtils';
import AuthImage from '../../components/AuthImage';
import { formatDate } from '../../utils/dateUtils';

const FamilyProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [family, setFamily] = useState(null);
    const [loading, setLoading] = useState(true);

    const [passes, setPasses] = useState([]);
    const [passesLoading, setPassesLoading] = useState(false);

    useEffect(() => {
        fetchFamily();
        fetchPasses();
    }, [id]);

    const fetchFamily = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/families/${id}`);
            setFamily(response.data);
        } catch (error) {
            console.error('Error fetching family:', error);
            showToast('Грешка при зареждане на семейство', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchPasses = async () => {
        try {
            setPassesLoading(true);
            const response = await gymAPI.getAllPasses({ familyId: id });
            setPasses(response.data.passes || []);
        } catch (error) {
            console.error('Error fetching passes:', error);
        } finally {
            setPassesLoading(false);
        }
    };

    const getPhotoUrl = (filename) => {
        if (!filename) return null;
        const token = localStorage.getItem('token');
        return `${API_BASE_URL}/admin/photos/thumbnail/${filename}${token ? `?token=${token}` : ''}`;
        // Note: Using the generic photo endpoint logic, but simplified. 
        // Ideally we grab the user ID for the photo URL if we want the specific climber photo.
        // But since we are listing members, we might need their ID.
    };

    const MemberCard = ({ member }) => {
        // Find main photo
        const mainPhoto = member.photos?.find(p => p.isMain) || member.photos?.[0];
        // We need to construct the URL properly using the member's ID
        const photoUrl = mainPhoto ? `${API_BASE_URL}/admin/photos/${member._id}/${mainPhoto.filename}` : null;

        return (
            <Link to={`/climbers/${member._id}`} className="block group">
                <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:shadow-md transition-all h-full">
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                            {photoUrl ? (
                                <AuthImage src={photoUrl} alt={getUserFullName(member)} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold text-lg">
                                    {member.firstName?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                                {getUserFullName(member)}
                            </p>
                            <p className="text-xs text-gray-500">
                                {member.email || member.phone || 'Няма контакти'}
                            </p>
                        </div>
                    </div>
                </div>
            </Link>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loading text="Зареждане..." />
            </div>
        );
    }

    if (!family) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Семейството не беше намерено</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/families')}
                        className="bg-[#ea7a24] h-9 px-4 rounded-lg text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 w-full sm:w-auto self-start"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Назад към списъка
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
                            <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </span>
                            Семейство {family.name}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 ml-12">Бележки: {family.notes || 'Няма бележки'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Members */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-neutral-950">Членове на семейството</h2>
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{family.memberIds?.length || 0}</span>
                        </div>
                        <div className="space-y-3">
                            {family.memberIds && family.memberIds.length > 0 ? (
                                family.memberIds.map(member => (
                                    <MemberCard key={member._id} member={member} />
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm italic">Няма добавени членове</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Passes & Data */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-neutral-950">Семейни Карти</h2>
                            {passes.length > 0 && (
                                <span className="text-sm text-gray-500">Общо: {passes.length}</span>
                            )}
                        </div>

                        {passesLoading ? (
                            <div className="py-4 text-center text-gray-500">Зареждане на карти...</div>
                        ) : passes.length === 0 ? (
                            <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-gray-500 italic">Това семейство няма закупени семейни карти</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Име</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Валидна до</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Посещения</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {passes.map(pass => (
                                            <tr key={pass._id} className={`hover:bg-gray-50 ${pass.isActive ? 'bg-green-50/30' : ''}`}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${pass.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                                        {pass.isActive ? 'Активна' : 'Неактивна'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{pass.name}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(pass.validUntil)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                                                    {pass.totalEntries ? `${pass.remainingEntries} / ${pass.totalEntries}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div></div>
    );
};

export default FamilyProfile;
