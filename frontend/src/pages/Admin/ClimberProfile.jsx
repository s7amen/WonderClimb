import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { adminUsersAPI } from '../../services/api';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { getUserFullName, getAvailableRoleDashboards } from '../../utils/userUtils';

const ClimberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, ToastComponent } = useToast();
  const [climber, setClimber] = useState(null);
  const [loading, setLoading] = useState(true);

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
      navigate('/climbers');
    } finally {
      setLoading(false);
    }
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

  // Get available dashboards for this climber
  const availableDashboards = climber && climber.roles && Array.isArray(climber.roles) 
    ? getAvailableRoleDashboards(climber) 
    : [];
  
  // Check if current path matches a dashboard path
  const isCurrentDashboard = (dashboardPath) => {
    if (!dashboardPath) return false;
    return location.pathname === dashboardPath || location.pathname.startsWith(dashboardPath + '/');
  };

  if (loading) {
    return <Loading text="Зареждане на профил..." />;
  }

  if (!climber) {
    return null;
  }

  return (
    <div className="bg-[#f3f3f5] min-h-screen py-6 px-6">
      <div className="max-w-[985px] mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/climbers')}
            className="bg-[#ea7a24] h-9 px-4 rounded-lg text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Назад</span>
          </button>
          <div className="flex-1">
            <h1 className="text-[20px] font-medium text-neutral-950 leading-[30px] mb-1">
              {getUserFullName(climber) || '-'}
            </h1>
            <p className="text-[16px] text-[#4a5565] leading-[24px]">
              Профил на катерач
            </p>
          </div>
        </div>

        {/* Role Navigation Links */}
        {availableDashboards.length > 0 && (
          <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-4 mb-6">
            <p className="text-[14px] font-medium text-[#4a5565] mb-3">Достъпни портали:</p>
            <div className="flex flex-wrap gap-2">
              {availableDashboards.map((dashboard) => {
                const isActive = isCurrentDashboard(dashboard.path);
                return (
                  <Link
                    key={dashboard.role}
                    to={dashboard.path}
                    className={`
                      inline-flex items-center px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-[#ea7a24] text-white border border-[#ea7a24]' 
                        : 'bg-[#f3f3f5] text-[#35383d] border border-[#d1d5dc] hover:bg-[#e8e8ea]'
                      }
                    `}
                  >
                    {dashboard.label}
                    {isActive && (
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-6">
          <div className="space-y-6">
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
            <div className="grid grid-cols-2 gap-6">
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
            <div className="grid grid-cols-2 gap-6">
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
            <div className="grid grid-cols-2 gap-6">
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
              <div className="grid grid-cols-2 gap-6">
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
            <div className="border-t border-[rgba(0,0,0,0.1)] pt-6">
              {/* Notes Section */}
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-medium text-[#4a5565] leading-[20px]">
                  Бележки
                </p>
                <p className="text-[14px] font-normal text-neutral-950 leading-[20px]">
                  {climber.notes || '-'}
                </p>
              </div>
            </div>

            {/* Registration and Updated Dates */}
            <div className="border-t border-[rgba(0,0,0,0.1)] pt-6">
              <div className="grid grid-cols-2 gap-6">
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
      </div>
      <ToastComponent />
    </div>
  );
};

export default ClimberProfile;

