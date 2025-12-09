import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { parentProfileAPI, parentClimbersAPI } from '../../services/api';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import { formatDate } from '../../utils/dateUtils';
import AddChildModal from '../../components/Modals/AddChildModal';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);

  // Modal State
  const [showChildModal, setShowChildModal] = useState(false);
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

  const handleOpenAdd = () => {
    setEditingChild(null);
    setShowChildModal(true);
  };

  const handleOpenEdit = (child) => {
    setEditingChild(child);
    setShowChildModal(true);
  };

  const handleCloseModal = () => {
    setShowChildModal(false);
    setEditingChild(null);
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
      <div className="flex justify-between items-center sm:hidden px-4 pt-4">
        <h1 className="text-2xl font-bold text-neutral-950">Моят профил</h1>
      </div>

      <ConfirmDialog
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

      <AddChildModal
        isOpen={showChildModal}
        onClose={handleCloseModal}
        onSuccess={() => {
          fetchData();
          handleCloseModal();
        }}
        initialData={editingChild}
      />

      <div className="bg-[#f3f3f5] min-h-screen py-4 sm:py-6 px-4 sm:px-6">
        <div className="max-w-[1600px] mx-auto">

          {/* Profile Card */}
          <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-[22px] font-bold text-neutral-950 hidden sm:block">Моят профил</h1>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isEditingProfile ? (
                  <div className="hidden sm:flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditingProfile(false)} className="w-auto flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Отказ
                    </Button>
                    <Button variant="primary" onClick={updateProfile} className="w-auto flex items-center gap-2 bg-[#8bc34a] hover:bg-[#7cb342] border-transparent text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Запази
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => setIsEditingProfile(true)} className="sm:w-auto flex items-center gap-2 bg-[#8bc34a] hover:bg-[#7cb342] border-transparent text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Редактирай профила
                  </Button>
                )}
              </div>
            </div>

            <div className={`border-t border-gray-100 pt-6 ${isEditingProfile ? 'space-y-6' : ''}`}>
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

                  {/* Mobile Action Buttons (Centered below form) */}
                  <div className="flex sm:hidden justify-center gap-4 mt-6">
                    <Button variant="outline" onClick={() => setIsEditingProfile(false)} className="w-auto px-8 flex items-center justify-center gap-2">
                      Отказ
                    </Button>
                    <Button variant="primary" onClick={updateProfile} className="w-auto px-8 flex items-center justify-center gap-2 bg-[#8bc34a] hover:bg-[#7cb342] border-transparent text-white">
                      Запази
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* View Mode: Name, Email, Phone on one row for desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 text-[#4a5565]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-gray-400 leading-tight">Име</p>
                        <p className="text-[15px] font-medium text-neutral-900 truncate">
                          {getUserFullName() || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-gray-400 leading-tight">Имейл</p>
                        <p className="text-[15px] font-medium text-neutral-900 truncate">
                          {profileData.email || user?.email || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-gray-400 leading-tight">Телефон</p>
                        <p className="text-[15px] font-medium text-neutral-900 truncate">
                          {profileData.phone || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
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
                  variant="primary"
                  onClick={handleOpenAdd}
                  className="w-full sm:w-auto flex items-center gap-2 bg-[#ea7a24] hover:bg-[#d66a1a] border-transparent text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добави дете
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {children.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#4a5565]">Все още няма добавени деца</p>
                </div>
              ) : (
                children.map((child) => {
                  if (!child) return null;
                  const age = calculateAge(child.dateOfBirth);

                  return (
                    <div
                      key={child._id || Math.random()}
                      className="p-4 bg-gray-50/50 rounded-[10px] hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Avatar Circle */}
                          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: child.color || '#ea7a24' }}>
                            <span className="text-white font-medium text-sm">
                              {child.firstName?.[0]}{child.lastName?.[0]}
                            </span>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <h3 className="text-[15px] font-medium text-neutral-900 truncate">
                              {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}
                            </h3>
                            {child.dateOfBirth && (
                              <p className="text-[13px] text-gray-500 flex items-center gap-1">
                                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-gray-700">{formatDate(child.dateOfBirth)}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row gap-2 w-full sm:w-auto items-center">
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenEdit(child)}
                            className="shrink-0 w-9 h-9 p-0 sm:w-auto sm:px-4 flex items-center justify-center gap-2 bg-[#8bc34a] hover:bg-[#7cb342] border-transparent text-white text-sm"
                          >
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span className="hidden sm:inline">Редактирай</span>
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleDelete(child._id)}
                            className="shrink-0 w-9 h-9 p-0 flex items-center justify-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] border-transparent text-white rounded-md"
                            title="Изтрий"
                          >
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
