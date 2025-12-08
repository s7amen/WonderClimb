import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminUsersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { getUserFullName } from '../../utils/userUtils';
import { formatDate, formatDateForInput } from '../../utils/dateUtils';
import AddClimberModal from '../../components/Modals/AddClimberModal';
import EditClimberModal from '../../components/Modals/EditClimberModal';

const Climbers = ({ type }) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTraining, setFilterTraining] = useState(type === 'training' ? 'true' : '');
  const [filterRole, setFilterRole] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Mobile card expansion state
  const [expandedCards, setExpandedCards] = useState(new Set());

  const isAdmin = currentUser?.roles?.includes('admin');



  useEffect(() => {
    if (type === 'training') {
      setFilterTraining('true');
    }
  }, [type]);

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        sort: sortField ? `${sortDirection === 'desc' ? '-' : ''}${sortField}` : '-createdAt'
      };

      if (filterStatus) params.status = filterStatus;
      if (filterRole) params.role = filterRole;
      // Note: Search is client-side for now or needs backend support

      const response = await adminUsersAPI.getAll(params);
      setUsers(response.data.users || []);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast(
        error.response?.data?.error?.message || 'Грешка при зареждане на потребители',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      if (searchQuery) {
        const fullName = getUserFullName(user) || '';
        const email = user.email || '';
        const searchLower = searchQuery.toLowerCase();
        if (!fullName.toLowerCase().includes(searchLower) && !email.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      if (filterStatus) {
        if (filterStatus === 'active' && user.accountStatus !== 'active') return false;
        if (filterStatus === 'inactive' && user.accountStatus === 'active') return false;
      }

      if (filterTraining !== '') {
        const isTrainee = user.isTrainee !== undefined ? user.isTrainee : false;
        if (filterTraining === 'true' && !isTrainee) return false;
        if (filterTraining === 'false' && isTrainee) return false;
      }

      if (filterRole) {
        if (!user.roles || !user.roles.includes(filterRole)) return false;
      }

      return true;
    });

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue;

        switch (sortField) {
          case 'name':
            aValue = getUserFullName(a) || '';
            bValue = getUserFullName(b) || '';
            break;
          case 'age':
            aValue = a.dateOfBirth ? calculateAge(a.dateOfBirth) : 0;
            bValue = b.dateOfBirth ? calculateAge(b.dateOfBirth) : 0;
            break;
          case 'isTrainee':
            aValue = a.isTrainee !== undefined ? (a.isTrainee ? 1 : 0) : 0;
            bValue = b.isTrainee !== undefined ? (b.isTrainee ? 1 : 0) : 0;
            break;
          case 'accountStatus':
            aValue = a.accountStatus === 'active' ? 1 : 0;
            bValue = b.accountStatus === 'active' ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [users, searchQuery, filterStatus, filterTraining, filterRole, sortField, sortDirection]);

  const filteredUsers = filteredAndSortedUsers;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 opacity-30 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 ml-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const handleEditClick = (user) => {
    if (!isAdmin) {
      showToast('Само администраторите могат да редактират потребители', 'error');
      return;
    }
    setEditingUser(user);
    setShowEditModal(true);
  };

  const availableRoles = [
    { value: 'admin', label: 'Администратор' },
    { value: 'coach', label: 'Треньор' },
    { value: 'climber', label: 'Катерач' },
    { value: 'instructor', label: 'Инструктор' },
  ];

  const getRoleLabel = (role) => {
    const roleObj = availableRoles.find((r) => r.value === role);
    return roleObj ? roleObj.label : role;
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

  // Helper функция за scroll до елемент
  const scrollToElement = (elementId) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleAddClimber = () => {
    setShowAddModal(true);
  };

  const toggleCardExpansion = (userId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading text="Зареждане на потребители..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-neutral-950">
            {type === 'training' ? 'Трениращи' : 'Катерачи'}
          </h1>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={handleAddClimber}
            className="h-9 px-3 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Добави катерач</span>
          </Button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4" style={{ color: '#35383d' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Търси по име или имейл..."
              className="w-full h-9 pl-10 pr-3 bg-gray-100 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500"
              style={{ color: '#35383d' }}
            />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-neutral-950 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 appearance-none cursor-pointer pr-8"
            >
              <option value="">Всички статуси</option>
              <option value="active">Активен</option>
              <option value="inactive">Неактивен</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {type !== 'training' && (
            <div className="relative">
              <select
                value={filterTraining}
                onChange={(e) => setFilterTraining(e.target.value)}
                className="h-9 px-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-neutral-950 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 appearance-none cursor-pointer pr-8"
              >
                <option value="">Всички</option>
                <option value="true">Да</option>
                <option value="false">Не</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}

          <div className="relative">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-9 px-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-neutral-950 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 appearance-none cursor-pointer pr-8"
            >
              <option value="">Всички роли</option>
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-neutral-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            Няма намерени катерачи
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isExpanded = expandedCards.has(user.id);
            return (
              <div
                key={user.id}
                id={`user-${user.id}`}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        to={`/climbers/${user.id}`}
                        className="text-base font-medium text-neutral-950 hover:text-[#ea7a24] transition-colors"
                      >
                        {getUserFullName(user) || '-'}
                      </Link>
                      <div className="mt-1 text-sm text-[#4a5565]">
                        {user.email || '-'}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {user.roles && user.roles.slice(0, 2).map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border"
                            style={{ backgroundColor: '#eddcca', borderColor: '#eddcca', color: '#35383d' }}
                          >
                            {getRoleLabel(role)}
                          </span>
                        ))}
                        {user.roles && user.roles.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium text-[#4a5565]">
                            +{user.roles.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {isAdmin && (
                        <button
                          onClick={() => handleEditClick(user)}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
                          style={{ color: '#35383d' }}
                          title="Редактирай"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => toggleCardExpansion(user.id)}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: '#35383d' }}
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-[#4a5565]">Телефон:</span>
                          <span className="ml-2 text-neutral-950">{user.phone || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#4a5565]">Дата на раждане:</span>
                          <span className="ml-2 text-neutral-950">{user.dateOfBirth ? formatDate(user.dateOfBirth) : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#4a5565]">Възраст:</span>
                          <span className="ml-2 text-neutral-950">{user.dateOfBirth ? calculateAge(user.dateOfBirth) : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#4a5565]">Статус:</span>
                          <span
                            className="ml-2 inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium text-white"
                            style={{
                              backgroundColor: user.accountStatus === 'active' ? '#eddcca' : '#99a1af',
                              color: user.accountStatus === 'active' ? '#35383d' : 'white'
                            }}
                          >
                            {user.accountStatus === 'active' ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#4a5565]">Трениращ:</span>
                          <span
                            className="ml-2 inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: user.isTrainee ? '#ea7a24' : '#d1d5dc',
                              color: user.isTrainee ? 'white' : '#364153'
                            }}
                          >
                            {user.isTrainee ? 'Да' : 'Не'}
                          </span>
                        </div>
                      </div>
                      {user.roles && user.roles.length > 0 && (
                        <div>
                          <span className="text-sm text-[#4a5565]">Всички роли:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border"
                                style={{ backgroundColor: '#eddcca', borderColor: '#eddcca', color: '#35383d' }}
                              >
                                {getRoleLabel(role)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {type === 'training' && user.pwaInstalled && (
                        <div>
                          <span className="text-sm text-[#4a5565]">App Status:</span>
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Инсталирано
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div >

      {/* Desktop Table View */}
      < div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden" >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer transition-colors hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Име
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Имейл
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Телефон
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата на раждане
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer transition-colors hover:bg-gray-100"
                  onClick={() => handleSort('age')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Възраст
                    {getSortIcon('age')}
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роли
                </th>
                {type === 'training' && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App
                  </th>
                )}
                <th
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer transition-colors hover:bg-gray-100"
                  onClick={() => handleSort('accountStatus')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Акаунт статус
                    {getSortIcon('accountStatus')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer transition-colors hover:bg-gray-100"
                  onClick={() => handleSort('isTrainee')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Трениращ
                    {getSortIcon('isTrainee')}
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    Няма намерени катерачи
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <Link
                        to={`/climbers/${user.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-orange-600 transition-colors"
                      >
                        {getUserFullName(user) || '-'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {user.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {user.dateOfBirth ? formatDate(user.dateOfBirth) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {user.dateOfBirth ? calculateAge(user.dateOfBirth) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {user.roles && user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"
                          >
                            {getRoleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    {type === 'training' && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {user.pwaInstalled ? (
                          <div className="flex items-center justify-center text-green-600" title={`Инсталирано на ${user.pwaLastUsed ? formatDate(user.pwaLastUsed) : '?'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.accountStatus === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {user.accountStatus === 'active' ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isTrainee
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {user.isTrainee ? 'Да' : 'Не'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {isAdmin && (
                        <button
                          onClick={() => handleEditClick(user)}
                          className="text-orange-600 hover:text-orange-900 transition-colors"
                          title="Редактирай"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div >

      {/* Pagination Controls */}
      {
        totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1"
            >
              Предишна
            </Button>
            <span className="text-sm text-gray-600">
              Страница {page} от {totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1"
            >
              Следваща
            </Button>
          </div>
        )
      }

      <AddClimberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchUsers}
      />

      <EditClimberModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSuccess={fetchUsers}
      /></div >
  );
};

export default Climbers;
