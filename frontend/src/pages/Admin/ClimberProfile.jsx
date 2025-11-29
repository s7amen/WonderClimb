import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, adminUsersAPI } from '../../services/api';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { getUserFullName } from '../../utils/userUtils';
import PhotoUpload from '../../components/PhotoUpload';
import PhotoGallery from '../../components/PhotoGallery';
import AuthImage from '../../components/AuthImage';
import ImageLightbox from '../../components/ImageLightbox';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';

const ClimberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const { user: currentUser } = useAuth();
  const [climber, setClimber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  // Check if current user can manage photos (admin or coach)
  const canManagePhotos = currentUser?.roles?.some(role => ['admin', 'coach'].includes(role));

  useEffect(() => {
    fetchClimber();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchClimber = async () => {
    try {
      setLoading(true);
      const response = await adminUsersAPI.getById(id);
      setClimber(response.data.user);
    } catch (error) {
      console.error('Error fetching climber:', error);
      showToast(
        error.response?.data?.error?.message || 'Грешка при зареждане на профила',
        'error'
      );
      navigate('/admin/climbers');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpdate = (updatedPhotos) => {
    setClimber(prev => ({
      ...prev,
      photos: updatedPhotos,
    }));
  };

  const openMainPhotoLightbox = () => {
    if (climber?.photos && climber.photos.length > 0) {
      const mainPhotoIndex = climber.photos.findIndex(p => p.isMain) || 0;
      setLightboxImageIndex(mainPhotoIndex);
      setLightboxOpen(true);
    }
  };

  const openGalleryLightbox = (index) => {
    setLightboxImageIndex(index);
    setLightboxOpen(true);
  };

  const getPhotoUrl = (filename) => {
    return `${API_BASE_URL}/admin/photos/${id}/${filename}`;
  };

  const handlePrevious = () => {
    if (climber?.photos && climber.photos.length > 0) {
      const newIndex = lightboxImageIndex > 0 ? lightboxImageIndex - 1 : climber.photos.length - 1;
      setLightboxImageIndex(newIndex);
    }
  };

  const handleNext = () => {
    if (climber?.photos && climber.photos.length > 0) {
      const newIndex = lightboxImageIndex < climber.photos.length - 1 ? lightboxImageIndex + 1 : 0;
      setLightboxImageIndex(newIndex);
    }
  };


  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const timePart = date.toLocaleTimeString('bg-BG', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} ${timePart}`;
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '-';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      admin: 'Администратор',
      coach: 'Треньор',
      climber: 'Катерач',
      instructor: 'Инструктор',
    };
    return roleLabels[role] || role;
  };


  if (loading) {
    return <Loading text="Зареждане на профил..." />;
  }

  if (!climber) {
    return null;
  }

  return (
    <div className="bg-[#f3f3f5] min-h-screen py-4 sm:py-6 px-4 sm:px-6">
      <div className="max-w-[985px] mx-auto">
        {/* Header with Back Button */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/admin/climbers')}
              className="bg-[#ea7a24] h-9 px-4 rounded-lg text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 w-full sm:w-auto self-start"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Назад</span>
            </button>
            <div className="flex-1 w-full">
              <h1 className="text-lg sm:text-[20px] font-medium text-neutral-950 leading-tight sm:leading-[30px] mb-1">
                {getUserFullName(climber) || '-'}
              </h1>
              <p className="text-sm sm:text-[16px] text-[#4a5565] leading-tight sm:leading-[24px]">
                Профил на катерач
              </p>
            </div>
          </div>
        </div>


        {/* Profile Card */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 sm:p-6 relative">
          {/* Main Photo Display - Visible to all */}
          {climber?.photos && climber.photos.length > 0 && (() => {
            const mainPhoto = climber.photos.find(p => p.isMain) || climber.photos[0];
            const photoUrl = getPhotoUrl(mainPhoto.filename);
            return (
              <div className="flex justify-center mb-6 md:mb-0 md:absolute md:left-6 md:top-6 md:w-[280px] md:h-[280px] cursor-pointer">
                <div className="bg-[#f3f3f5] border-4 border-[#ea7a24] rounded-[16px] w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px] overflow-hidden p-1 hover:opacity-90 transition-opacity" onClick={openMainPhotoLightbox}>
                  <AuthImage
                    src={photoUrl}
                    alt="Профилна снимка"
                    className="w-full h-full object-cover rounded-[12px]"
                  />
                </div>
              </div>
            );
          })()}

          <div className={climber?.photos && climber.photos.length > 0 ? "md:ml-[312px] space-y-4 sm:space-y-6" : "space-y-4 sm:space-y-6"}>
            {/* Name Field */}
            <div className="flex flex-col gap-2">
              <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                Име
              </p>
              <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                {getUserFullName(climber) || '-'}
              </p>
            </div>

            {/* Email and Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                  Имейл
                </p>
                <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                  {climber.email || '-'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                  Телефон
                </p>
                <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                  {climber.phone || '-'}
                </p>
              </div>
            </div>

            {/* Date of Birth and Age Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                  Дата на раждане
                </p>
                <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                  {climber.dateOfBirth ? formatDate(climber.dateOfBirth) : '-'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                  Възраст
                </p>
                <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                  {climber.dateOfBirth ? calculateAge(climber.dateOfBirth) : '-'}
                </p>
              </div>
            </div>

            {/* Roles and Status Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                  Роли
                </p>
                <div className="flex flex-wrap gap-2">
                  {climber.roles && climber.roles.length > 0 ? (
                    climber.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[#eddcca] border border-[#eddcca] text-[#35383d] h-[22px]"
                      >
                        {getRoleLabel(role)}
                      </span>
                    ))
                  ) : (
                    <span className="text-[14px] text-neutral-950">-</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                    Статус на акаунта
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium h-[22px] w-fit ${
                      climber.accountStatus === 'active'
                        ? 'bg-[#eddcca] text-[#35383d] border border-[#eddcca]'
                        : 'bg-[#99a1af] text-white border border-[#99a1af]'
                    }`}
                  >
                    {climber.accountStatus === 'active' ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                    Трениращ
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium h-[22px] w-fit ${
                      climber.isTrainee
                        ? 'bg-[#ea7a24] text-white border border-transparent'
                        : 'bg-[#d1d5dc] text-[#364153] border border-[#d1d5dc]'
                    }`}
                  >
                    {climber.isTrainee ? 'Да' : 'Не'}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 sm:pt-6">
              {/* Notes Section */}
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                  Бележки
                </p>
                <p className="text-[14px] font-normal text-neutral-950 leading-[20px] break-words">
                  {climber.notes || '-'}
                </p>
              </div>
            </div>

            {/* Registration and Updated Dates */}
            <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 sm:pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                    Регистриран
                  </p>
                  <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                    {climber.createdAt ? formatDateTime(climber.createdAt) : '-'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                    Обновен
                  </p>
                  <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                    {climber.updatedAt ? formatDateTime(climber.updatedAt) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Photos Section - Only for admin/coach - At the bottom */}
        {canManagePhotos && (
          <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-6 mt-6">
            <PhotoGallery 
              climberId={id}
              photos={climber?.photos || []}
              onUpdate={handlePhotoUpdate}
              onImageClick={openGalleryLightbox}
            />
          </div>
        )}

        {/* Lightbox */}
        {lightboxOpen && climber?.photos && climber.photos.length > 0 && (
          <ImageLightbox
            isOpen={lightboxOpen}
            imageUrl={getPhotoUrl(climber.photos[lightboxImageIndex].filename)}
            onClose={() => setLightboxOpen(false)}
            onPrevious={climber.photos.length > 1 ? handlePrevious : null}
            onNext={climber.photos.length > 1 ? handleNext : null}
            showNavigation={climber.photos.length > 1}
          />
        )}
      </div>
      <ToastComponent />
    </div>
  );
};

export default ClimberProfile;

