import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parentClimbersAPI } from '../../services/api';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { parentProfileAPI } from '../../services/api';

const Profile = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    let isMounted = true;
    let hasFetched = false;

    const loadData = async () => {
      if (hasFetched) return; // Prevent duplicate requests
      hasFetched = true;
      
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
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [childrenRes, profileRes] = await Promise.all([
        parentClimbersAPI.getAll(),
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
    try {
      const response = await parentProfileAPI.getProfile();
      return response.data.user;
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to user from context
      return user || {};
    }
  };

  const updateProfile = async () => {
    try {
      const response = await parentProfileAPI.updateProfile({
        firstName: profileData.firstName,
        middleName: profileData.middleName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });
      
      // Обновяваме профилните данни от отговора
      const updatedProfile = response.data.user;
      if (updatedProfile) {
        setProfileData({
          firstName: updatedProfile.firstName || profileData.firstName,
          middleName: updatedProfile.middleName || profileData.middleName,
          lastName: updatedProfile.lastName || profileData.lastName,
          email: updatedProfile.email || profileData.email,
          phone: updatedProfile.phone || profileData.phone,
        });
      }
      
      showToast('Профилът е обновен успешно', 'success');
      setIsEditingProfile(false);
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
        const response = await parentClimbersAPI.update(editingChild._id, childData);
        const updatedChild = response.data.climber;
        
        // Обновяваме само редактираното дете в масива
        setChildren(prev => prev.map(c => c._id === editingChild._id ? updatedChild : c));
        
        showToast('Детето е обновено успешно', 'success');
        resetForm();
        
        // Скролваме до редактираното дете
        scrollToElement(`child-${editingChild._id}`);
      } else {
        const response = await parentClimbersAPI.create(childData);
        const newChild = response.data.climber;
        
        // Добавяме новото дете в масива
        setChildren(prev => [...prev, newChild]);
        
        showToast('Детето е добавено успешно', 'success');
        resetForm();
        
        // Скролваме до новото дете
        scrollToElement(`child-${newChild._id}`);
      }
    } catch (error) {
      console.error('Error creating/updating child:', error);
      console.error('Error response:', error.response?.data);
      console.error('User roles:', user?.roles);
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
      
      // Премахваме детето от масива
      setChildren(prev => prev.filter(c => c._id !== childId));
      
      showToast('Детето е изтрито успешно', 'success');
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

  // Helper функция за scroll до елемент
  const scrollToElement = (elementId) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  if (loading) {
    return <Loading text="Зареждане на профил..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Профил</h1>

      <ToastComponent />

      {/* Parent Profile Section */}
      <Card title="Моята информация">
        {isEditingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="primary" onClick={updateProfile} className="w-full sm:w-auto">
                Запази
              </Button>
              <Button variant="secondary" onClick={() => setIsEditingProfile(false)} className="w-full sm:w-auto">
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
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setIsEditingProfile(true)}>
                Редактирай профил
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Children Section */}
      <Card title="Свързани профили - Моите деца">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <p className="text-sm text-gray-600">Управлявайте профилите на децата си</p>
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
            {showForm ? 'Отказ' : 'Добави дете'}
          </Button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-4">{editingChild ? 'Редактирай дете' : 'Добави ново дете'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Специални бележки или информация за детето ви..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button type="submit" variant="primary" className="w-full sm:w-auto">
                  {editingChild ? 'Обнови' : 'Добави дете'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm} className="w-full sm:w-auto">
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
                <div key={child._id} id={`child-${child._id}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
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
                        <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                          Активно
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button variant="secondary" onClick={() => handleEdit(child)} className="w-full sm:w-auto">
                        Редактирай
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(child._id)} className="w-full sm:w-auto">
                        Изтрий
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

export default Profile;

