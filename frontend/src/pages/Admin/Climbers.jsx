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

const Climbers = () => {
  const { user: currentUser } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ 
    firstName: '', 
    middleName: '', 
    lastName: '', 
    email: '', 
    phone: '',
    dateOfBirth: '',
    notes: '',
    accountStatus: 'active',
    isTrainee: false,
  });
  const [rolesForm, setRolesForm] = useState([]);
  const [originalRoles, setOriginalRoles] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const modalRef = useRef(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTraining, setFilterTraining] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Mobile card expansion state
  const [expandedCards, setExpandedCards] = useState(new Set());

  const isAdmin = currentUser?.roles?.includes('admin');

  const availableRoles = [
    { value: 'admin', label: 'Администратор' },
    { value: 'coach', label: 'Треньор' },
    { value: 'climber', label: 'Катерач' },
    { value: 'instructor', label: 'Инструктор' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasUnsavedChanges = () => {
    if (!editingUser) return false;
    
    const formChanged = 
      editForm.firstName !== (editingUser.firstName || '') ||
      editForm.middleName !== (editingUser.middleName || '') ||
      editForm.lastName !== (editingUser.lastName || '') ||
      editForm.email !== (editingUser.email || '') ||
      editForm.phone !== (editingUser.phone || '') ||
      editForm.dateOfBirth !== (editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).toISOString().split('T')[0] : '') ||
      editForm.notes !== (editingUser.notes || '') ||
      editForm.accountStatus !== (editingUser.accountStatus || 'active') ||
      editForm.isTrainee !== (editingUser.isTrainee !== undefined ? editingUser.isTrainee : false);
    
    const rolesChanged = JSON.stringify(rolesForm.sort()) !== JSON.stringify(originalRoles.sort());
    
    return formChanged || rolesChanged;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showConfirmDialog) return;
      
      if (showEditModal && modalRef.current && !modalRef.current.contains(event.target)) {
        if (hasUnsavedChanges()) {
          setShowConfirmDialog(true);
        } else {
          handleCancelEdit();
        }
      }
    };

    if (showEditModal && !showConfirmDialog) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEditModal, showConfirmDialog, editForm, rolesForm, editingUser, originalRoles]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminUsersAPI.getAll();
      setUsers(response.data.users || []);
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
        <svg className="w-4 h-4 ml-1 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    const initialForm = {
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
      notes: user.notes || '',
      accountStatus: user.accountStatus || 'active',
      isTrainee: user.isTrainee !== undefined ? user.isTrainee : false,
    };
    setEditForm(initialForm);
    const initialRoles = [...(user.roles || [])];
    setRolesForm(initialRoles);
    setOriginalRoles(initialRoles);
    setShowEditModal(true);
    setShowConfirmDialog(false);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({ 
      firstName: '', 
      middleName: '', 
      lastName: '', 
      email: '', 
      phone: '',
      dateOfBirth: '',
      notes: '',
      accountStatus: 'active',
      isTrainee: false,
    });
    setRolesForm([]);
    setOriginalRoles([]);
    setShowEditModal(false);
    setShowConfirmDialog(false);
  };

  const handleConfirmDiscard = () => {
    handleCancelEdit();
  };

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    await handleSave();
  };

  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      const response = await adminUsersAPI.update(editingUser.id, editForm);
      const updatedUser = response.data.user;
      
      const rolesChanged = JSON.stringify(rolesForm.sort()) !== JSON.stringify(editingUser.roles.sort());
      if (rolesChanged) {
        await adminUsersAPI.updateRoles(editingUser.id, rolesForm);
        // Обновяваме ролите в updatedUser
        updatedUser.roles = rolesForm;
      }
      
      // Обновяваме само редактирания потребител в масива
      setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
      
      showToast('Потребителят е обновен успешно', 'success');
      handleCancelEdit();
      
      // Скролваме до редактирания потребител
      scrollToElement(`user-${editingUser.id}`);
    } catch (error) {
      showToast(
        error.response?.data?.error?.message || 'Грешка при обновяване на потребителя',
        'error'
      );
    }
  };

  const handleRoleToggle = (role) => {
    if (!isAdmin) return;
    if (rolesForm.includes(role)) {
      if (rolesForm.length === 1) {
        showToast('Потребителят трябва да има поне една роля', 'error');
        return;
      }
      setRolesForm(rolesForm.filter((r) => r !== role));
    } else {
      setRolesForm([...rolesForm, role]);
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
    showToast('Функционалността за добавяне на катерач ще бъде имплементирана скоро', 'info');
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
          <h1 className="text-3xl font-bold text-neutral-950">
            Регистрирани катерачи
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
                        to={`/admin/climbers/${user.id}`}
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
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200" style={{ backgroundColor: '#35383d' }}>
                <th 
                  className="px-2 py-2.5 text-center text-sm font-medium text-white cursor-pointer transition-colors"
                  style={{ backgroundColor: 'inherit' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4a5565'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center justify-center">
                    Име
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-2 py-2.5 text-center text-sm font-medium text-white">
                  Имейл
                </th>
                <th className="px-2 py-2.5 text-center text-sm font-medium text-white">
                  Телефон
                </th>
                <th className="px-2 py-2.5 text-center text-sm font-medium text-white">
                  Дата на раждане
                </th>
                <th 
                  className="px-2 py-2.5 text-center text-sm font-medium text-white cursor-pointer transition-colors"
                  style={{ backgroundColor: 'inherit' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4a5565'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  onClick={() => handleSort('age')}
                >
                  <div className="flex items-center justify-center">
                    Възраст
                    {getSortIcon('age')}
                  </div>
                </th>
                <th className="px-2 py-2.5 text-center text-sm font-medium text-white">
                  Роли
                </th>
                <th 
                  className="px-2 py-2.5 text-center text-sm font-medium text-white cursor-pointer transition-colors"
                  style={{ backgroundColor: 'inherit' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4a5565'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  onClick={() => handleSort('accountStatus')}
                >
                  <div className="flex items-center justify-center">
                    Акаунт статус
                    {getSortIcon('accountStatus')}
                  </div>
                </th>
                <th 
                  className="px-2 py-2.5 text-center text-sm font-medium text-white cursor-pointer transition-colors"
                  style={{ backgroundColor: 'inherit' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4a5565'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  onClick={() => handleSort('isTrainee')}
                >
                  <div className="flex items-center justify-center">
                    Трениращ
                    {getSortIcon('isTrainee')}
                  </div>
                </th>
                <th className="px-2 py-2.5 text-center text-sm font-medium text-white">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-center text-gray-500">
                    Няма намерени катерачи
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="border-b border-gray-200 transition-colors"
                    style={{ backgroundColor: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f3f5'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    <td className="px-2 py-4 text-center">
                      <Link 
                        to={`/admin/climbers/${user.id}`}
                        className="text-sm text-neutral-950 transition-colors font-medium inline-block"
                        style={{ color: 'inherit' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ea7a24'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                      >
                        {getUserFullName(user) || '-'}
                      </Link>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="text-sm text-neutral-950">
                        {user.email || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="text-sm text-neutral-950">
                        {user.phone || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="text-sm text-neutral-950">
                        {user.dateOfBirth ? formatDate(user.dateOfBirth) : '-'}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="text-sm text-neutral-950">
                        {user.dateOfBirth ? calculateAge(user.dateOfBirth) : '-'}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {user.roles && user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border"
                            style={{ backgroundColor: '#eddcca', borderColor: '#eddcca', color: '#35383d' }}
                          >
                            {getRoleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium text-white"
                        style={{
                          backgroundColor: user.accountStatus === 'active' ? '#eddcca' : '#99a1af',
                          color: user.accountStatus === 'active' ? '#35383d' : 'white'
                        }}
                      >
                        {user.accountStatus === 'active' ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: user.isTrainee ? '#ea7a24' : '#d1d5dc',
                          color: user.isTrainee ? 'white' : '#364153'
                        }}
                      >
                        {user.isTrainee ? 'Да' : 'Не'}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-center">
                      {isAdmin && (
                        <button
                          onClick={() => handleEditClick(user)}
                          className="inline-flex items-center justify-center w-9 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                          style={{ color: '#35383d' }}
                          title="Редактирай"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <Card className="w-full">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Редактиране на катерач</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Име *
                    </label>
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      placeholder="Име"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Презиме
                    </label>
                    <input
                      type="text"
                      value={editForm.middleName}
                      onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value })}
                      placeholder="Презиме"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Фамилия *
                    </label>
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      placeholder="Фамилия"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Имейл
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Имейл"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Телефон
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Телефон"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Дата на раждане
                    </label>
                    <input
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Акаунт статус
                    </label>
                    <select
                      value={editForm.accountStatus}
                      onChange={(e) => setEditForm({ ...editForm, accountStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    >
                      <option value="active">Активен</option>
                      <option value="inactive">Неактивен</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Трениращ
                    </label>
                    <select
                      value={editForm.isTrainee ? 'true' : 'false'}
                      onChange={(e) => setEditForm({ ...editForm, isTrainee: e.target.value === 'true' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    >
                      <option value="true">Да</option>
                      <option value="false">Не</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Роли *
                    </label>
                    <div className="space-y-2 border border-gray-200 rounded-md p-3">
                      {availableRoles.map((role) => (
                        <label key={role.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={rolesForm.includes(role.value)}
                            onChange={() => handleRoleToggle(role.value)}
                            className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Бележки
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Бележки"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 mt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  className="w-full sm:w-auto"
                >
                  Отказ
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  className="w-full sm:w-auto"
                >
                  Запази
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 60 }}>
          <Card className="w-full max-w-md m-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Имате незаписани промени</h3>
            <p className="text-sm text-gray-600 mb-6">
              Имате незаписани промени. Искате ли да ги запазите преди да затворите?
            </p>
            <div className="flex gap-4 justify-end">
              <Button
                variant="secondary"
                onClick={handleConfirmDiscard}
              >
                Отказ
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowConfirmDialog(false)}
              >
                Отмени
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSave}
              >
                Запази
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default Climbers;
