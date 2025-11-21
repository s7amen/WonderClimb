import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { myClimberAPI, parentClimbersAPI } from '../../services/api';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    notes: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    notes: '',
  });

  const hasFetchedRef = useRef(false);
  const userIdRef = useRef(null);

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (authLoading) return;
    
    // If user changed, reset the fetch flag
    const currentUserId = user?._id || user?.id;
    if (userIdRef.current !== currentUserId) {
      hasFetchedRef.current = false;
      userIdRef.current = currentUserId;
    }
    
    // Prevent duplicate requests
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    let isMounted = true;

    const loadData = async () => {
      try {
        await fetchData();
      } catch (error) {
        if (isMounted) {
          console.error('Error in loadData:', error);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [childrenRes, profileRes] = await Promise.all([
        parentClimbersAPI.getAll().catch(() => ({ data: { climbers: [] } })),
        fetchProfile(),
      ]);

      setChildren(childrenRes.data.climbers || []);
      if (profileRes) {
        setProfileData({
          firstName: profileRes.firstName || '',
          middleName: profileRes.middleName || '',
          lastName: profileRes.lastName || '',
          email: profileRes.email || '',
          phone: profileRes.phone || '',
          dateOfBirth: profileRes.dateOfBirth || '',
          notes: profileRes.notes || '',
        });
      }
    } catch (error) {
      if (error.response?.status === 429) {
        showToast('Твърде много заявки. Моля, изчакайте малко преди да опитате отново.', 'error');
      } else {
        showToast('Грешка при зареждане на данни', 'error');
      }
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    // Only fetch climber profile if user has climber role
    if (!user?.roles?.includes('climber')) {
      return user || {};
    }
    
    try {
      const response = await myClimberAPI.getProfile();
      return response.data.climber;
    } catch (error) {
      // Only log if it's not a 404 or 403 (expected for users without climber role)
      if (error.response?.status !== 404 && error.response?.status !== 403) {
        console.error('Error fetching profile:', error);
      }
      // Fallback to user from context
      return user || {};
    }
  };

  const updateProfile = async () => {
    try {
      await myClimberAPI.updateProfile({
        firstName: profileData.firstName,
        middleName: profileData.middleName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString() : null,
        notes: profileData.notes,
      });
      showToast('Профилът е обновен успешно', 'success');
      setIsEditingProfile(false);
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при обновяване на профил', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const childData = {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        notes: formData.notes,
      };

      if (editingChild) {
        await parentClimbersAPI.update(editingChild._id, childData);
        showToast('Детето е обновено успешно', 'success');
      } else {
        await parentClimbersAPI.create(childData);
        showToast('Детето е добавено успешно', 'success');
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating/updating child:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error?.details || 'Грешка при запазване на дете';
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = (child) => {
    setFormData({
      firstName: child.firstName,
      middleName: child.middleName || '',
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth ? format(new Date(child.dateOfBirth), 'yyyy-MM-dd') : '',
      notes: child.notes || '',
    });
    setEditingChild(child);
    setShowForm(true);
  };

  const handleDelete = async (childId) => {
    if (!window.confirm('Сигурни ли сте, че искате да изтриете това дете? Това действие не може да бъде отменено.')) {
      return;
    }

    try {
      await parentClimbersAPI.deactivate(childId);
      showToast('Детето е изтрито успешно', 'success');
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при изтриване на дете';
      showToast(errorMessage, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      notes: '',
    });
    setEditingChild(null);
    setShowForm(false);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return <Loading text="Зареждане на профил..." />;
  }

  const age = calculateAge(profileData.dateOfBirth);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-medium text-neutral-950 leading-8 mb-1">Моят профил</h1>
        <p className="text-base leading-6" style={{ color: '#4a5565' }}>Управление на лична информация</p>
      </div>

      <ToastComponent />

      {/* Climber Profile Section */}
      <Card>
        <div className="border-b border-gray-200 px-6 py-6">
          <h2 className="text-base font-medium text-neutral-950 mb-1">Моята информация</h2>
          <p className="text-sm" style={{ color: '#4a5565' }}>Лична информация и профилни данни</p>
        </div>
        <div className="px-6 py-6">
        {isEditingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Име"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                required
              />
              <Input
                label="Презиме"
                value={profileData.middleName}
                onChange={(e) => setProfileData({ ...profileData, middleName: e.target.value })}
              />
            </div>
            <Input
              label="Фамилия"
              value={profileData.lastName}
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              required
            />
            <Input
              label="Имейл"
              value={profileData.email}
              disabled
              className="bg-gray-100"
            />
            <Input
              label="Телефон"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+359..."
            />
            <Input
              label="Дата на раждане"
              type="date"
              value={profileData.dateOfBirth ? format(new Date(profileData.dateOfBirth), 'yyyy-MM-dd') : ''}
              onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Бележки
              </label>
              <textarea
                value={profileData.notes}
                onChange={(e) => setProfileData({ ...profileData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
                rows={3}
                placeholder="Специални бележки или информация..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={updateProfile}>
                Запази
              </Button>
              <Button variant="secondary" onClick={() => setIsEditingProfile(false)}>
                Отказ
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Име</p>
              <p className="text-lg font-medium">
                {profileData.firstName && profileData.lastName 
                  ? `${profileData.firstName} ${profileData.middleName || ''} ${profileData.lastName}`.trim()
                  : (user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim()
                    : user?.name || '')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Имейл</p>
              <p className="text-lg">{profileData.email || user?.email}</p>
            </div>
            {profileData.phone && (
              <div>
                <p className="text-sm text-gray-500">Телефон</p>
                <p className="text-lg">{profileData.phone}</p>
              </div>
            )}
            {profileData.dateOfBirth && (
              <div>
                <p className="text-sm text-gray-500">Дата на раждане</p>
                <p className="text-lg">
                  {format(new Date(profileData.dateOfBirth), 'PP')}
                  {age !== null && ` (${age} години)`}
                </p>
              </div>
            )}
            {profileData.notes && (
              <div>
                <p className="text-sm text-gray-500">Бележки</p>
                <p className="text-lg">{profileData.notes}</p>
              </div>
            )}
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setIsEditingProfile(true)}>
                Редактирай профил
              </Button>
            </div>
          </div>
        )}
        </div>
      </Card>

      {/* Children Section */}
      <Card>
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-medium text-neutral-950 mb-1">Свързани профили - Моите деца</h2>
              <p className="text-sm" style={{ color: '#4a5565' }}>Управлявайте профилите на децата си</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Отказ' : 'Добави дете'}
            </Button>
          </div>
        </div>
        <div className="px-6 py-6">

        {showForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-4">{editingChild ? 'Редактирай дете' : 'Добави ново дете'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-4 gap-4">
                <Input
                  label="Име"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Презиме"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                />
                <Input
                  label="Фамилия"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
                <Input
                  label="Дата на раждане"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Бележки
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
                  rows={3}
                  placeholder="Специални бележки или информация за детето ви..."
                />
              </div>

              <div className="flex gap-2 mt-4">
                <Button type="submit" variant="primary">
                  {editingChild ? 'Обнови' : 'Добави дете'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Отказ
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {children.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Все още няма добавени деца</p>
          ) : (
            children.map((child) => {
              const age = calculateAge(child.dateOfBirth);
              
              return (
                <div key={child._id} className="p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        {child.dateOfBirth && (
                          <p>
                            📅 Дата на раждане: {format(new Date(child.dateOfBirth), 'dd.MM.yyyy')}
                            {age !== null && ` (${age} години)`}
                          </p>
                        )}
                        {child.notes && <p>📝 {child.notes}</p>}
                      </div>
                      {child.accountStatus === 'active' && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs rounded-lg font-medium" style={{ backgroundColor: '#eddcca', color: '#35383d' }}>
                          Активно
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => handleEdit(child)}>
                        Редактирай
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(child._id)} className="text-sm">
                        Изтрий
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;

