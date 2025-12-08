import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gymAPI, trainingAPI, parentClimbersAPI, myClimberAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { formatDate } from '../../utils/dateUtils';

const Subscriptions = () => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [gymPasses, setGymPasses] = useState([]);
    const [trainingPasses, setTrainingPasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [linkedProfiles, setLinkedProfiles] = useState([]);
    const [selfClimber, setSelfClimber] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch self climber profile if user has climber role
            let selfProfile = null;
            if (user?.roles?.includes('climber')) {
                try {
                    const selfRes = await myClimberAPI.getProfile();
                    if (selfRes.data?.climber) {
                        selfProfile = selfRes.data.climber;
                        setSelfClimber(selfRes.data.climber);
                    }
                } catch (error) {
                    console.error('Error fetching self profile:', error);
                }
            }

            // Fetch linked profiles (children)
            let profiles = [];
            try {
                const profilesRes = await parentClimbersAPI.getAll();
                profiles = (profilesRes.data.climbers || []).filter(c =>
                    c.accountStatus === 'active' || c.accountStatus === null || c.accountStatus === undefined
                );
                setLinkedProfiles(profiles);
            } catch (error) {
                console.error('Error fetching linked profiles:', error);
            }

            // Collect all user IDs to fetch passes for
            const userIds = [];
            if (selfProfile) {
                userIds.push({ id: selfProfile._id, name: `${selfProfile.firstName} ${selfProfile.lastName}`, isSelf: true });
            }
            profiles.forEach(profile => {
                userIds.push({
                    id: profile._id,
                    name: `${profile.firstName} ${profile.lastName}`,
                    isSelf: false
                });
            });

            // Fetch gym passes for all users
            const allGymPasses = [];
            for (const userInfo of userIds) {
                try {
                    const passesRes = await gymAPI.getAllPasses({ userId: userInfo.id });
                    const passes = (passesRes.data.passes || []).map(pass => ({
                        ...pass,
                        ownerName: userInfo.name,
                        ownerId: userInfo.id,
                        isSelf: userInfo.isSelf
                    }));
                    allGymPasses.push(...passes);
                } catch (error) {
                    console.error(`Error fetching gym passes for ${userInfo.name}:`, error);
                }
            }

            // Fetch training passes for all users
            const allTrainingPasses = [];
            for (const userInfo of userIds) {
                try {
                    const passesRes = await trainingAPI.getAllPasses({ userId: userInfo.id });
                    const passes = (passesRes.data.passes || []).map(pass => ({
                        ...pass,
                        ownerName: userInfo.name,
                        ownerId: userInfo.id,
                        isSelf: userInfo.isSelf
                    }));
                    allTrainingPasses.push(...passes);
                } catch (error) {
                    console.error(`Error fetching training passes for ${userInfo.name}:`, error);
                }
            }

            // Sort passes: active first, then by date
            const sortPasses = (passes) => {
                return passes.sort((a, b) => {
                    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
            };

            setGymPasses(sortPasses(allGymPasses));
            setTrainingPasses(sortPasses(allTrainingPasses));
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Грешка при зареждане на данни', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getPassStatus = (pass) => {
        if (!pass.isActive) return { label: 'Неактивна', color: 'bg-gray-100 text-gray-800', isActive: false };

        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        if (pass.validUntil && new Date(pass.validUntil) < startOfToday) {
            return { label: 'Изтекла', color: 'bg-red-100 text-red-800', isActive: false };
        }

        if (pass.validFrom && new Date(pass.validFrom) > endOfToday) {
            return { label: 'Бъдеща', color: 'bg-blue-100 text-blue-800', isActive: true };
        }

        if (pass.remainingEntries === 0) {
            return { label: 'Изчерпана', color: 'bg-orange-100 text-orange-800', isActive: false };
        }

        return { label: 'Активна', color: 'bg-green-100 text-green-800', isActive: true };
    };

    const renderPassesTable = (passes, emptyMessage) => {
        if (passes.length === 0) {
            return (
                <div className="py-8 text-center text-gray-500 italic">
                    {emptyMessage}
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Име
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Карта
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                Валидна от
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Валидна до
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Посещения
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Статус
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {passes.map((pass) => {
                            const status = getPassStatus(pass);

                            return (
                                <tr key={pass._id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {pass.ownerName}
                                        {pass.isSelf && (
                                            <span className="ml-1 text-xs text-gray-500">(Аз)</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {pass.name || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                        {formatDate(pass.validFrom) || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(pass.validUntil) || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                                        {pass.remainingEntries !== null && pass.totalEntries !== null
                                            ? `${pass.remainingEntries} / ${pass.totalEntries}`
                                            : 'Неограничено'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                                        >
                                            {status.label}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-medium text-neutral-950">Абонаменти</h1>
                </div>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loading text="Зареждане на карти..." />
                </div>
            </div>
        );
    }

    // Filter active passes
    const activeGymPasses = gymPasses.filter(pass => getPassStatus(pass).isActive);
    const activeTrainingPasses = trainingPasses.filter(pass => getPassStatus(pass).isActive);

    // Check if there are any passes at all
    const hasAnyPasses = gymPasses.length > 0 || trainingPasses.length > 0;
    const hasActiveGymPasses = activeGymPasses.length > 0;
    const hasActiveTrainingPasses = activeTrainingPasses.length > 0;
    const hasAllGymPasses = gymPasses.length > 0;
    const hasAllTrainingPasses = trainingPasses.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-medium text-neutral-950">Абонаменти</h1>
            </div>

            {!hasAnyPasses ? (
                <Card>
                    <div className="p-6 text-center">
                        <p className="text-gray-500 italic">Няма активни карти</p>
                    </div>
                </Card>
            ) : (
                <>
                    {/* Active Passes Section */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-medium text-neutral-950">Активни карти</h2>

                        {/* Active Gym Passes */}
                        {hasActiveGymPasses && (
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-medium text-neutral-950 mb-4">
                                        Карти за залата
                                    </h3>
                                    {renderPassesTable(activeGymPasses, 'Няма активни карти за залата')}
                                </div>
                            </Card>
                        )}

                        {/* Active Training Passes */}
                        {hasActiveTrainingPasses && (
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-medium text-neutral-950 mb-4">
                                        Карти за тренировки
                                    </h3>
                                    {renderPassesTable(activeTrainingPasses, 'Няма активни карти за тренировки')}
                                </div>
                            </Card>
                        )}

                        {/* No active passes message */}
                        {!hasActiveGymPasses && !hasActiveTrainingPasses && (
                            <Card>
                                <div className="p-6 text-center">
                                    <p className="text-gray-500 italic">Няма активни карти</p>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* All Passes Section */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-medium text-neutral-950">Всички карти</h2>

                        {/* All Gym Passes */}
                        {hasAllGymPasses && (
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-medium text-neutral-950 mb-4">
                                        Карти за залата
                                    </h3>
                                    {renderPassesTable(gymPasses, 'Няма карти за залата')}
                                </div>
                            </Card>
                        )}

                        {/* All Training Passes */}
                        {hasAllTrainingPasses && (
                            <Card>
                                <div className="p-6">
                                    <h3 className="text-lg font-medium text-neutral-950 mb-4">
                                        Карти за тренировки
                                    </h3>
                                    {renderPassesTable(trainingPasses, 'Няма карти за тренировки')}
                                </div>
                            </Card>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Subscriptions;
