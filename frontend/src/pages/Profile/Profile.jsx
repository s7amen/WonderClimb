import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { parentProfileAPI, parentClimbersAPI } from '../../services/api';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
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
      if (hasFetched) return;
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
        });
      }
    } catch (error) {
      if (error.response?.status === 429) {
        showToast('Твърде много заявки. Моля, изчакайте малко преди да опитате отново.', 'error');
      } else {
        showToast('Грешка при зареждане на данни', 'error');
      }
      console.error('Error fetching data:', error);
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
      return user || {};
    }
  };

  const updateProfile = async () => {
    try {
      await parentProfileAPI.updateProfile({
        firstName: profileData.firstName,
        middleName: profileData.middleName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });
      
      const updatedProfile = await fetchProfile();
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

  const getUserFullName = () => {
    if (profileData.firstName && profileData.lastName) {
      return `${profileData.firstName} ${profileData.middleName || ''} ${profileData.lastName}`.trim();
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim();
    }
    return user?.name || '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return <Loading text="Зареждане на профил..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">Моят профил</h1>
      </div>

      <ToastComponent />

      <div className="bg-[#f3f3f5] min-h-screen py-4 sm:py-6 px-4 sm:px-6">
        <div className="max-w-[1600px] mx-auto">

        {/* Profile Card */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="space-y-4 sm:space-y-6">
            {isEditingProfile ? (
              <>
                {/* Editing Mode: Name fields on first row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                      Име
                    </p>
                    <Input
                      label=""
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      placeholder="Име"
                      className="mb-0"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                      Презиме
                    </p>
                    <Input
                      label=""
                      value={profileData.middleName}
                      onChange={(e) => setProfileData({ ...profileData, middleName: e.target.value })}
                      placeholder="Презиме"
                      className="mb-0"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                      Фамилия
                    </p>
                    <Input
                      label=""
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      placeholder="Фамилия"
                      className="mb-0"
                    />
                  </div>
                </div>
                {/* Editing Mode: Email and Phone on second row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                      Имейл
                    </p>
                    <Input
                      label=""
                      value={profileData.email}
                      disabled
                      className="bg-gray-100 mb-0"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                      Телефон
                    </p>
                    <Input
                      label=""
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+359..."
                      className="mb-0"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* View Mode: Name, Email, Phone on one row for desktop */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                      Име
                    </p>
                    <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                      {getUserFullName() || '-'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                      Имейл
                    </p>
                    <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                      {profileData.email || user?.email || '-'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                      Телефон
                    </p>
                    <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                      {profileData.phone || '-'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {isEditingProfile ? (
                <>
                  <Button variant="primary" onClick={updateProfile} className="w-full sm:w-auto">
                    Запази
                  </Button>
                  <Button variant="secondary" onClick={() => setIsEditingProfile(false)} className="w-full sm:w-auto">
                    Отказ
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setIsEditingProfile(true)} className="w-full sm:w-auto">
                  Редактирай профил
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Children Section */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-[20px] font-medium text-neutral-950 leading-tight sm:leading-[30px] mb-1">
                Свързани профили
              </h2>
              <p className="text-sm text-[#4a5565]">Управлявайте профилите на децата си</p>
            </div>
            <Button 
              variant={showForm ? 'secondary' : 'primary'} 
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setShowForm(true);
                }
              }} 
              className="w-full sm:w-auto"
            >
              {showForm ? 'Отказ' : 'Добави дете'}
            </Button>
          </div>

          {showForm && (
            <div className="mb-6 p-4 sm:p-6 bg-[#f3f3f5] rounded-[10px]">
              <h3 className="text-base font-medium text-neutral-950 mb-4">
                {editingChild ? 'Редактирай дете' : 'Добави ново дете'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Input
                    label="Име"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="mb-0"
                  />
                  <Input
                    label="Презиме"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="mb-0"
                  />
                  <Input
                    label="Фамилия"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="mb-0"
                  />
                  <Input
                    label="Дата на раждане"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="mb-0"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-950 mb-1">
                    Бележки
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                    rows={3}
                    placeholder="Специални бележки или информация за детето ви..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
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
              <div className="text-center py-8">
                <p className="text-[#4a5565]">Все още няма добавени деца</p>
              </div>
            ) : (
              children.map((child) => {
                const age = calculateAge(child.dateOfBirth);
                
                return (
                  <div 
                    key={child._id} 
                    className="p-4 sm:p-6 border border-[rgba(0,0,0,0.1)] rounded-[10px] hover:shadow-sm transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-neutral-950 mb-2">
                          {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}
                        </h3>
                        <div className="space-y-1">
                          {child.dateOfBirth && (
                            <p className="text-sm text-[#4a5565]">
                              Дата на раждане: {formatDate(child.dateOfBirth)}
                              {age !== null && ` (${age} години)`}
                            </p>
                          )}
                          {child.notes && (
                            <p className="text-sm text-[#4a5565]">{child.notes}</p>
                          )}
                        </div>
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
        </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
