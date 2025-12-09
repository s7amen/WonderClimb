import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { parentProfileAPI, parentClimbersAPI } from '../../services/api';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import { formatDate, formatDateForInput } from '../../utils/dateUtils';

const Profile = () => {
  const { user, updateUser } = useAuth();
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
  const { showToast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState(null);
  const [bookedSessionsCount, setBookedSessionsCount] = useState(0);

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
      const response = await parentProfileAPI.updateProfile({
        firstName: profileData.firstName,
        middleName: profileData.middleName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });

      const updatedProfile = response.data.user;
      if (updatedProfile) {
        setProfileData({
          firstName: updatedProfile.firstName || profileData.firstName,
          middleName: updatedProfile.middleName || profileData.middleName,
          lastName: updatedProfile.lastName || profileData.lastName,
          email: updatedProfile.email || profileData.email,
          phone: updatedProfile.phone || profileData.phone,
        });

        // Update user in AuthContext to refresh menu and dashboard
        updateUser({
          firstName: updatedProfile.firstName,
          middleName: updatedProfile.middleName,
          lastName: updatedProfile.lastName,
          phone: updatedProfile.phone,
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
      dateOfBirth: child.dateOfBirth ? formatDateForInput(child.dateOfBirth) : '',
      notes: child.notes || '',
    });
    setEditingChild(child);
    setShowForm(true);
  };

  const handleDelete = (childId) => {
    // Set up dialog state immediately
    setDeleteTargetId(childId);
    setShowDeleteDialog(true);

    // Check for related data in the background
    parentClimbersAPI.checkDeletion(childId)
      .then((checkResponse) => {
        const relatedData = checkResponse.data;

        // Build warning message for other related data (not bookings, as they're handled separately)
        let warningMessage = null;
        if (relatedData.attendanceRecords > 0) {
          warningMessage = `${relatedData.attendanceRecords} записа за присъствие ще бъдат изтрити.`;
        }

        // Update dialog state with fetched data
        setDeleteWarning(warningMessage);
        setBookedSessionsCount(relatedData.bookings?.future?.active || 0);
      })
      .catch((error) => {
        console.error('Error checking deletion:', error);
        // If check fails, continue without warning data
        setDeleteWarning(null);
        setBookedSessionsCount(0);
      });
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await parentClimbersAPI.deactivate(deleteTargetId);
      showToast('Детето е изтрито успешно', 'success');
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
      setDeleteWarning(null);
      setBookedSessionsCount(0);
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при изтриване на дете';
      showToast(errorMessage, 'error');
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
      setDeleteWarning(null);
      setBookedSessionsCount(0);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteTargetId(null);
    setDeleteWarning(null);
    setBookedSessionsCount(0);
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


  if (loading) {
    return <Loading text="Зареждане на профил..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">Моят профил</h1>
      </div><ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Изтриване на профил"
        message="Сигурни ли сте, че искате да изтриете този свързан профил? Това действие не може да бъде отменено."
        warningMessage={deleteWarning}
        hasBookedSessions={bookedSessionsCount > 0}
        bookedSessionsCount={bookedSessionsCount}
        confirmText="Изтрий"
        cancelText="Отказ"
        variant="danger"
      />

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
              <div className={`flex gap-2 pt-2 ${isEditingProfile ? 'justify-center sm:justify-end' : 'flex-col sm:flex-row justify-end'}`}>
                {isEditingProfile ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditingProfile(false)} className="w-auto flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Отказ
                    </Button>
                    <Button variant="primary" onClick={updateProfile} className="w-auto flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Запази
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setIsEditingProfile(true)} className="w-full sm:w-auto flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
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
                <h2 className="text-lg sm:text-[20px] font-medium text-neutral-950 leading-tight sm:leading-[30px]">
                  Свързани профили
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant={showForm ? 'secondary' : 'primary'}
                  onClick={() => {
                    if (showForm) {
                      resetForm();
                    } else {
                      setShowForm(true);
                    }
                  }}
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  {showForm ? 'Отказ' : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Добави дете
                    </>
                  )}
                </Button>
              </div>
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
                      label="Дата на раждане (dd/mm/yyyy)"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="mb-0"
                      placeholder="dd/mm/yyyy"
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
                    <Button type="submit" variant="primary" className="w-full sm:w-auto flex items-center gap-2">
                      {editingChild ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Обнови
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Добави дете
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Отказ
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {children.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#4a5565]">Все още няма добавени деца</p>
                </div>
              ) : (
                children.map((child) => {
                  // Defensive check - if child is null or undefined, skip it
                  if (!child) return null;

                  const age = calculateAge(child.dateOfBirth);

                  return (
                    <div
                      key={child._id || Math.random()}
                      className="p-4 sm:p-6 border border-[rgba(0,0,0,0.1)] rounded-[10px] hover:shadow-sm transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="text-base font-medium text-neutral-950 mb-2">
                            {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}
                          </h3>
                          <div className="space-y-1">
                            {child.dateOfBirth && (
                              <p className="text-sm text-[#4a5565] flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
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
                          <Button variant="secondary" onClick={() => handleEdit(child)} className="w-full sm:w-auto flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Редактирай
                          </Button>
                          <Button variant="danger" onClick={() => handleDelete(child._id)} className="w-full sm:w-auto flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
