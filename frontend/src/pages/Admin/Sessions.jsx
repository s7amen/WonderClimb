import { useState, useEffect } from 'react';
import { sessionsAPI, adminUsersAPI, adminAPI } from '../../services/api';
import { format, addDays, startOfDay, eachDayOfInterval, isBefore } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import SessionFilters from '../../components/Sessions/SessionFilters';
import SessionList from '../../components/Sessions/SessionList';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [allClimbers, setAllClimbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [viewingRoster, setViewingRoster] = useState(null);
  const [roster, setRoster] = useState([]);
  const { showToast, ToastComponent } = useToast();

  // Schedule view states
  const [daysToShow, setDaysToShow] = useState(30);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [selectedClimberForSession, setSelectedClimberForSession] = useState({});

  // Filter states
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);

  // Deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    capacity: 10,
    coachIds: [],
    targetGroups: [],
    ageGroups: ['4-6', '7-12', '13+'],
  });

  // Calculate default dates
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getEndDate = () => {
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return endDate.toISOString().split('T')[0];
  };

  const [bulkFormData, setBulkFormData] = useState({
    title: '',
    description: '',
    daysOfWeek: [],
    startDate: getTodayDate(),
    endDate: getEndDate(),
    time: '',
    durationMinutes: 60,
    capacity: 10,
    coachIds: [],
    targetGroups: [],
    ageGroups: ['4-6', '7-12', '13+'],
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSessions, setPreviewSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState(new Set());

  // Get unique session titles for autocomplete (only training sessions, not competitions)
  const getUniqueTitles = () => {
    const titles = sessions
      .filter(s => s.type !== 'competition') // Ensure we only get training sessions
      .map(s => s.title)
      .filter((title, index, self) => title && self.indexOf(title) === index)
      .sort();
    return titles;
  };

  useEffect(() => {
    fetchSessions();
    fetchCoaches();
    fetchAllClimbers();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionsAPI.getAll();
      // Filter out competitions and cancelled sessions - only show actual training sessions
      const allEvents = response.data.sessions || [];
      const trainingSessions = allEvents.filter(event => 
        event.type !== 'competition' && event.status !== 'cancelled'
      );
      setSessions(trainingSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      console.error('Error response:', error.response?.data);
      showToast(
        error.response?.data?.error?.message || 'Грешка при зареждане на сесии',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCoaches = async () => {
    try {
      const response = await adminUsersAPI.getCoaches();
      console.log('Fetched coaches:', response.data);
      setCoaches(response.data.users || []);
    } catch (error) {
      console.error('Error loading coaches:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const fetchAllClimbers = async () => {
    try {
      const response = await adminAPI.getAllClimbers();
      console.log('Fetched climbers:', response.data);
      setAllClimbers(response.data.climbers || []);
    } catch (error) {
      console.error('Error loading climbers:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const fetchRoster = async (sessionId) => {
    try {
      const response = await sessionsAPI.getRoster(sessionId);
      setRoster(response.data.roster || []);
      setViewingRoster(sessionId);
    } catch (error) {
      showToast('Грешка при зареждане на списъка', 'error');
    }
  };

  const handleManualBooking = async (sessionId) => {
    const selectedClimberId = selectedClimberForSession[sessionId];
    if (!selectedClimberId) {
      showToast('Моля, изберете катерач', 'error');
      return;
    }

    try {
      await sessionsAPI.createManualBooking(sessionId, selectedClimberId);
      
      // Обновяваме само конкретната сесия в масива (увеличаваме bookedCount)
      setSessions(prev => prev.map(s => {
        if (s._id === sessionId) {
          return {
            ...s,
            bookedCount: (s.bookedCount || 0) + 1
          };
        }
        return s;
      }));
      
      setSelectedClimberForSession({ ...selectedClimberForSession, [sessionId]: '' });
      
      if (viewingRoster === sessionId) {
        fetchRoster(sessionId);
      }
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при резервиране на катерач', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      
      const sessionData = {
        title: formData.title,
        description: formData.description,
        date: dateTime.toISOString(),
        durationMinutes: parseInt(formData.durationMinutes),
        capacity: parseInt(formData.capacity),
        coachIds: formData.coachIds,
        targetGroups: formData.targetGroups,
        ageGroups: formData.ageGroups,
      };

      if (editingSession) {
        const response = await sessionsAPI.update(editingSession._id, sessionData);
        const updatedSession = response.data.session;
        
        // Обновяваме само редактираната сесия в масива
        setSessions(prev => prev.map(s => s._id === editingSession._id ? updatedSession : s));
        
        resetForm();
        setShowEditModal(false);
        
        // Скролваме до редактираната сесия
        scrollToElement(`session-${editingSession._id}`);
      } else {
        const response = await sessionsAPI.create(sessionData);
        const newSession = response.data.session;
        
        // Добавяме новата сесия в масива
        setSessions(prev => {
          const filtered = prev.filter(event => 
            event.type !== 'competition' && event.status !== 'cancelled'
          );
          return [...filtered, newSession].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
          );
        });
        
        resetForm();
        setShowForm(false);
        
        // Скролваме до новата сесия
        scrollToElement(`session-${newSession._id}`);
      }
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при запазване на тренировка', 'error');
    }
  };

  const handleEdit = (session) => {
    const sessionDate = new Date(session.date);
    setFormData({
      title: session.title,
      description: session.description || '',
      date: format(sessionDate, 'yyyy-MM-dd'),
      time: format(sessionDate, 'HH:mm'),
      durationMinutes: session.durationMinutes,
      capacity: session.capacity,
      coachIds: session.coachIds?.map(c => c._id || c) || [],
      targetGroups: session.targetGroups || [],
      ageGroups: session.ageGroups || ['4-6', '7-12', '13+'],
    });
    setEditingSession(session);
    setShowEditModal(true);
  };

  const handleDeleteClick = (sessionId) => {
    setSessionToDelete(sessionId);
    setShowDeleteModal(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    try {
      await sessionsAPI.update(sessionToDelete, { status: 'cancelled' });
      
      // Премахваме сесията от масива (филтрираме я като cancelled)
      setSessions(prev => prev.filter(s => s._id !== sessionToDelete));
      
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch (error) {
      showToast('Грешка при изтриване на сесия', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedSessionIds.length === 0) {
      showToast('Моля, изберете поне една тренировка за изтриване', 'error');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedSessionIds.length === 0) return;

    setIsDeleting(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const successfulIds = [];

      for (const sessionId of selectedSessionIds) {
        try {
          await sessionsAPI.update(sessionId, { status: 'cancelled' });
          successfulIds.push(sessionId);
          successCount++;
        } catch (error) {
          console.error('Error deleting session:', error);
          errorCount++;
        }
      }

      // Премахваме успешно изтритите сесии от масива
      if (successfulIds.length > 0) {
        setSessions(prev => prev.filter(s => !successfulIds.includes(s._id)));
      }

      if (errorCount > 0) {
        showToast(`Изтрити ${successCount} тренировки, ${errorCount} грешки`, 'warning');
      }

      setSelectedSessionIds([]);
      setShowBulkDeleteModal(false);
    } catch (error) {
      showToast('Грешка при масово изтриване', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      durationMinutes: 60,
      capacity: 10,
      coachIds: [],
      targetGroups: [],
      ageGroups: ['4-6', '7-12', '13+'],
    });
    setEditingSession(null);
    setShowForm(false);
    setShowEditModal(false);
    setIsBulkMode(false);
  };

  const resetBulkForm = () => {
    setBulkFormData({
      title: '',
      description: '',
      daysOfWeek: [],
      startDate: getTodayDate(),
      endDate: getEndDate(),
      time: '',
      durationMinutes: 60,
      capacity: 10,
      coachIds: [],
      targetGroups: [],
      ageGroups: ['4-6', '7-12', '13+'],
    });
    setShowForm(false);
    setIsBulkMode(false);
    setShowPreviewModal(false);
    setPreviewSessions([]);
    setSelectedSessions(new Set());
  };

  // Calculate preview sessions that will be created
  const calculatePreviewSessions = () => {
    if (!bulkFormData.startDate || !bulkFormData.endDate || !bulkFormData.time || bulkFormData.daysOfWeek.length === 0) {
      return [];
    }

    const start = new Date(bulkFormData.startDate);
    const end = new Date(bulkFormData.endDate);
    const sessions = [];
    const dayNames = {
      0: 'нд',
      1: 'пн',
      2: 'вт',
      3: 'ср',
      4: 'чт',
      5: 'пт',
      6: 'сб',
    };

    const currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      
      if (bulkFormData.daysOfWeek.includes(dayOfWeek)) {
        const sessionDate = new Date(currentDate);
        const [hours, minutes] = bulkFormData.time.split(':').map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);

        if (sessionDate > new Date()) {
          sessions.push({
            date: sessionDate,
            dayName: dayNames[dayOfWeek],
            time: bulkFormData.time,
            title: bulkFormData.title,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return sessions;
  };

  const handleBulkSubmit = (e) => {
    e.preventDefault();
    
    if (!bulkFormData.title || !bulkFormData.startDate || !bulkFormData.endDate || !bulkFormData.time || bulkFormData.daysOfWeek.length === 0) {
      showToast('Моля, попълнете всички задължителни полета', 'error');
      return;
    }

    const preview = calculatePreviewSessions();
    if (preview.length === 0) {
      showToast('Няма валидни тренировки за създаване в избрания период', 'error');
      return;
    }

    setPreviewSessions(preview);
    setSelectedSessions(new Set(preview.map((_, index) => index)));
    setShowPreviewModal(true);
  };

  const toggleSessionSelection = (index) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSessions(newSelected);
  };

  const confirmBulkCreate = async () => {
    try {
      const sessionsToCreate = previewSessions.filter((_, index) => selectedSessions.has(index));
      
      if (sessionsToCreate.length === 0) {
        showToast('Моля, изберете поне една тренировка за създаване', 'error');
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const newSessions = [];

      for (const session of sessionsToCreate) {
        try {
          const sessionData = {
            title: bulkFormData.title,
            description: bulkFormData.description,
            date: session.date.toISOString(),
            durationMinutes: parseInt(bulkFormData.durationMinutes),
            capacity: parseInt(bulkFormData.capacity),
            coachIds: bulkFormData.coachIds,
            targetGroups: bulkFormData.targetGroups,
            ageGroups: bulkFormData.ageGroups,
          };

          const response = await sessionsAPI.create(sessionData);
          newSessions.push(response.data.session);
          successCount++;
        } catch (error) {
          console.error('Error creating session:', error);
          errorCount++;
        }
      }

      // Добавяме новите сесии в масива
      if (newSessions.length > 0) {
        setSessions(prev => {
          const filtered = prev.filter(event => 
            event.type !== 'competition' && event.status !== 'cancelled'
          );
          return [...filtered, ...newSessions].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
          );
        });
      }

      if (errorCount > 0) {
        showToast(`Създадени ${successCount} тренировки, ${errorCount} грешки`, 'warning');
      }

      resetBulkForm();
      
      // Скролваме до първата нова сесия ако има успешно създадени
      if (newSessions.length > 0) {
        scrollToElement(`session-${newSessions[0]._id}`);
      }
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при създаване на тренировки', 'error');
    }
  };

  const toggleDayOfWeek = (day) => {
    setBulkFormData({
      ...bulkFormData,
      daysOfWeek: bulkFormData.daysOfWeek.includes(day)
        ? bulkFormData.daysOfWeek.filter(d => d !== day)
        : [...bulkFormData.daysOfWeek, day],
    });
  };

  const toggleCoach = (coachId) => {
    setFormData({
      ...formData,
      coachIds: formData.coachIds.includes(coachId)
        ? formData.coachIds.filter(id => id !== coachId)
        : [...formData.coachIds, coachId],
    });
  };

  const toggleTargetGroup = (group) => {
    setFormData({
      ...formData,
      targetGroups: formData.targetGroups.includes(group)
        ? formData.targetGroups.filter(g => g !== group)
        : [...formData.targetGroups, group],
    });
  };

  const toggleAgeGroup = (ageGroup) => {
    setFormData({
      ...formData,
      ageGroups: formData.ageGroups.includes(ageGroup)
        ? formData.ageGroups.filter(a => a !== ageGroup)
        : [...formData.ageGroups, ageGroup],
    });
  };

  // Filter functions
  const getUniqueTimes = () => {
    // Only get times from training sessions, not competitions
    const times = sessions
      .filter(session => session.type !== 'competition')
      .map(session => format(new Date(session.date), 'HH:mm'));
    return [...new Set(times)].sort();
  };

  const getFilteredSessions = () => {
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);
    
    return sessions.filter(session => {
      // Exclude competitions - only show training sessions
      if (session.type === 'competition') {
        return false;
      }

      const sessionDate = new Date(session.date);
      const sessionDay = sessionDate.getDay();
      const sessionTime = format(sessionDate, 'HH:mm');
      const sessionTitle = session.title;

      if (isBefore(sessionDate, today) || isBefore(viewEndDate, sessionDate)) {
        return false;
      }

      if (selectedDays.length > 0 && !selectedDays.includes(sessionDay)) {
        return false;
      }

      if (selectedTimes.length > 0 && !selectedTimes.includes(sessionTime)) {
        return false;
      }

      if (selectedTitles.length > 0 && !selectedTitles.includes(sessionTitle)) {
        return false;
      }

      return true;
    });
  };

  const groupSessionsByDay = () => {
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);
    
    const days = eachDayOfInterval({ start: today, end: viewEndDate });
    
    const filteredSessions = getFilteredSessions();
    
    const grouped = {};
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = {
        date: day,
        sessions: []
      };
    });

    filteredSessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const dayKey = format(sessionDate, 'yyyy-MM-dd');
      
      if (grouped[dayKey]) {
        grouped[dayKey].sessions.push(session);
      }
    });

    Object.keys(grouped).forEach(dayKey => {
      grouped[dayKey].sessions.sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
    });

    return grouped;
  };

  const toggleFilter = (filterType, value) => {
    if (filterType === 'day') {
      setSelectedDays(prev => 
        prev.includes(value) 
          ? prev.filter(d => d !== value)
          : [...prev, value]
      );
    } else if (filterType === 'time') {
      setSelectedTimes(prev => 
        prev.includes(value) 
          ? prev.filter(t => t !== value)
          : [...prev, value]
      );
    } else if (filterType === 'title') {
      setSelectedTitles(prev => 
        prev.includes(value) 
          ? prev.filter(t => t !== value)
          : [...prev, value]
      );
    }
  };

  const selectAllFilter = (filterType) => {
    if (filterType === 'day') {
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
    } else if (filterType === 'time') {
      const uniqueTimes = getUniqueTimes();
      setSelectedTimes(uniqueTimes);
    } else if (filterType === 'title') {
      const uniqueTitles = getUniqueTitles();
      setSelectedTitles(uniqueTitles);
    }
  };

  const clearAllFilters = () => {
    setSelectedDays([]);
    setSelectedTimes([]);
    setSelectedTitles([]);
  };

  const hasActiveFilters = () => {
    return selectedDays.length > 0 || selectedTimes.length > 0 || selectedTitles.length > 0;
  };

  const getBulgarianDayName = (date) => {
    const dayNames = ['Нед', 'Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб'];
    return dayNames[date.getDay()];
  };

  const formatTime = (date) => {
    return format(new Date(date), 'HH:mm');
  };

  const getEndTime = (startDate, durationMinutes) => {
    const end = new Date(new Date(startDate).getTime() + durationMinutes * 60000);
    return format(end, 'HH:mm');
  };

  const toggleSessionSelectionForDelete = (sessionId) => {
    // Normalize sessionId to string for consistent comparison
    const normalizedSessionId = typeof sessionId === 'object' && sessionId?.toString 
      ? sessionId.toString() 
      : String(sessionId);
    
    setSelectedSessionIds(prev => {
      const normalizedPrev = prev.map(id => 
        typeof id === 'object' && id?.toString ? id.toString() : String(id)
      );
      
      return normalizedPrev.includes(normalizedSessionId)
        ? prev.filter(id => {
            const normalizedId = typeof id === 'object' && id?.toString ? id.toString() : String(id);
            return normalizedId !== normalizedSessionId;
          })
        : [...prev, sessionId];
    });
  };

  const selectAllFilteredSessions = () => {
    const filteredSessions = getFilteredSessions();
    
    // Get all filtered sessions (don't filter by status - include all)
    const availableSessionIds = filteredSessions
      .map(session => session._id || session.id)
      .filter(id => id); // Remove any undefined/null IDs
    
    // Always select all available sessions
    setSelectedSessionIds(availableSessionIds);
  };

  const clearAllSelectedSessions = () => {
    setSelectedSessionIds([]);
  };

  const getBookedCount = (sessionId) => {
    const session = sessions.find(s => s._id === sessionId);
    if (session?.bookedCount !== undefined) {
      return session.bookedCount;
    }
    return 0;
  };

  // Helper функция за scroll до елемент
  const scrollToElement = (elementId) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100); // Малко забавяне за да се рендерира DOM-а
  };

  if (loading) {
    return <Loading text="Зареждане на сесии..." />;
  }


  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">График</h1>
      </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-col sm:flex-row gap-2">
          {showForm && (
            <Button variant="secondary" onClick={() => {
              setShowForm(false);
              setIsBulkMode(false);
              setEditingSession(null);
              setShowPreviewModal(false);
              resetForm();
              resetBulkForm();
            }} className="w-full sm:w-auto">
              Отказ
            </Button>
          )}
          {!showForm && (
            <Button onClick={() => {
              setShowForm(true);
              setIsBulkMode(false);
              setEditingSession(null);
            }} className="w-full sm:w-auto">
              Нова тренировка
            </Button>
          )}
        </div>

      <ToastComponent />

      {showForm && !editingSession && (
        <Card title={isBulkMode ? 'Създай нови тренировки' : 'Създай нова тренировка'}>
          {!isBulkMode && (
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkMode(false);
                    // Reset bulk form when switching to single mode
                    if (isBulkMode) {
                      setBulkFormData({
                        title: '',
                        description: '',
                        daysOfWeek: [],
                        startDate: getTodayDate(),
                        endDate: getEndDate(),
                        time: '',
                        durationMinutes: 60,
                        capacity: 10,
                        coachIds: [],
                        targetGroups: [],
                        ageGroups: ['4-6', '7-12', '13+'],
                      });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    !isBulkMode
                      ? 'bg-orange-brand text-white hover:opacity-90 focus:ring-orange-brand'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400'
                  }`}
                >
                  Една тренировка
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkMode(true);
                    // Reset single form when switching to bulk mode
                    if (!isBulkMode) {
                      setFormData({
                        title: '',
                        description: '',
                        date: '',
                        time: '',
                        durationMinutes: 60,
                        capacity: 10,
                        coachIds: [],
                        targetGroups: [],
                        ageGroups: ['4-6', '7-12', '13+'],
                      });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isBulkMode
                      ? 'bg-orange-brand text-white hover:opacity-90 focus:ring-orange-brand'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400'
                  }`}
                >
                  Няколко тренировки
                </button>
              </div>
            </div>
          )}
          <form onSubmit={isBulkMode && !editingSession ? handleBulkSubmit : handleSubmit}>
            {isBulkMode && !editingSession ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Заглавие
                  </label>
                  <input
                    type="text"
                    list="session-titles-bulk"
                    value={bulkFormData.title}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Въведете или изберете заглавие"
                    required
                  />
                  <datalist id="session-titles-bulk">
                    {getUniqueTitles().map((title, index) => (
                      <option key={index} value={title} />
                    ))}
                  </datalist>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={bulkFormData.description}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тренировката се провежда всеки:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { day: 1, name: 'пн' },
                      { day: 2, name: 'вт' },
                      { day: 3, name: 'ср' },
                      { day: 4, name: 'чт' },
                      { day: 5, name: 'пт' },
                      { day: 6, name: 'сб' },
                      { day: 0, name: 'нд' },
                    ].map(({ day, name }) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayOfWeek(day)}
                        className={`px-3 py-1 rounded ${
                          bulkFormData.daysOfWeek.includes(day)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Input
                    label="Начална дата"
                    type="date"
                    value={bulkFormData.startDate}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, startDate: e.target.value })}
                    required
                  />
                  <Input
                    label="Крайна дата"
                    type="date"
                    value={bulkFormData.endDate}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, endDate: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Час"
                  type="time"
                  value={bulkFormData.time}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, time: e.target.value })}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Продължителност (минути)"
                    type="number"
                    value={bulkFormData.durationMinutes}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, durationMinutes: e.target.value })}
                    required
                    min={1}
                  />
                  <Input
                    label="Капацитет"
                    type="number"
                    value={bulkFormData.capacity}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, capacity: e.target.value })}
                    required
                    min={1}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подходящо за
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'beginner', label: 'Начинаещи' },
                      { value: 'experienced', label: 'Деца с опит' },
                      { value: 'advanced', label: 'Напреднали' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setBulkFormData({
                            ...bulkFormData,
                            targetGroups: bulkFormData.targetGroups.includes(value)
                              ? bulkFormData.targetGroups.filter(g => g !== value)
                              : [...bulkFormData.targetGroups, value],
                          });
                        }}
                        className={`px-3 py-1 rounded text-sm font-normal transition-colors ${
                          bulkFormData.targetGroups.includes(value)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Години
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: '4-6', label: '4-6' },
                      { value: '7-12', label: '7-12' },
                      { value: '13+', label: '13+' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setBulkFormData({
                            ...bulkFormData,
                            ageGroups: bulkFormData.ageGroups.includes(value)
                              ? bulkFormData.ageGroups.filter(a => a !== value)
                              : [...bulkFormData.ageGroups, value],
                          });
                        }}
                        className={`px-3 py-1 rounded text-sm font-normal transition-colors ${
                          bulkFormData.ageGroups.includes(value)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Треньори
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                    {coaches.length === 0 ? (
                      <p className="text-sm text-gray-500">Няма налични треньори. Моля, създайте потребители треньори първо.</p>
                    ) : (
                      coaches.map((coach) => (
                        <label key={coach.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={bulkFormData.coachIds.includes(coach.id)}
                            onChange={() => {
                              setBulkFormData({
                                ...bulkFormData,
                                coachIds: bulkFormData.coachIds.includes(coach.id)
                                  ? bulkFormData.coachIds.filter(id => id !== coach.id)
                                  : [...bulkFormData.coachIds, coach.id],
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">
                            {coach.firstName && coach.lastName 
                              ? `${coach.firstName} ${coach.middleName || ''} ${coach.lastName}`.trim()
                              : coach.name || coach.email}
                            {coach.email && ` (${coach.email})`}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button type="submit" variant="primary" className="w-full sm:w-auto">
                    Създай
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetBulkForm} className="w-full sm:w-auto">
                    Отказ
                  </Button>
                </div>
              </>
            ) : (
              <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заглавие
              </label>
              <input
                type="text"
                list="session-titles-single"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Въведете или изберете заглавие"
                required
              />
              <datalist id="session-titles-single">
                {getUniqueTitles().map((title, index) => (
                  <option key={index} value={title} />
                ))}
              </datalist>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Дата"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <Input
                label="Час"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Продължителност (минути)"
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                required
                min={1}
              />
              <Input
                label="Капацитет"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
                min={1}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Подходящо за
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'beginner', label: 'Начинаещи' },
                  { value: 'experienced', label: 'Деца с опит' },
                  { value: 'advanced', label: 'Напреднали' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleTargetGroup(value)}
                    className={`px-3 py-1 rounded text-sm font-normal transition-colors ${
                      formData.targetGroups.includes(value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Години
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '4-6', label: '4-6' },
                  { value: '7-12', label: '7-12' },
                  { value: '13+', label: '13+' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleAgeGroup(value)}
                    className={`px-3 py-1 rounded text-sm font-normal transition-colors ${
                      formData.ageGroups.includes(value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Треньори
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                {coaches.length === 0 ? (
                  <p className="text-sm text-gray-500">Няма налични треньори. Моля, създайте потребители треньори първо.</p>
                ) : (
                  coaches.map((coach) => (
                    <label key={coach.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.coachIds.includes(coach.id)}
                        onChange={() => toggleCoach(coach.id)}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {coach.firstName && coach.lastName 
                          ? `${coach.firstName} ${coach.middleName || ''} ${coach.lastName}`.trim()
                          : coach.name || coach.email}
                        {coach.email && ` (${coach.email})`}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button type="submit" variant="primary" className="w-full sm:w-auto">
                    {editingSession ? 'Обнови' : 'Създай'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetForm} className="w-full sm:w-auto">
                    Отказ
                  </Button>
                </div>
              </>
            )}
          </form>
        </Card>
      )}

      {/* Preview Confirmation Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Преглед на тренировките за създаване</h2>
            <p className="text-gray-600 mb-4">
              Избрани <strong>{selectedSessions.size}</strong> от <strong>{previewSessions.length}</strong> тренировки:
            </p>
            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {previewSessions.map((session, index) => (
                <div key={index} className={`p-3 rounded border ${
                  selectedSessions.has(index) 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-gray-100 border-gray-300 opacity-60'
                }`}>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(index)}
                      onChange={() => toggleSessionSelection(index)}
                      className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium">{session.title}</span>
                      <span className="text-gray-500 ml-2">
                        {format(session.date, 'dd.MM.yyyy')} ({session.dayName}) {session.time}
                      </span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowPreviewModal(false)} className="w-full sm:w-auto">
                Отказ
              </Button>
              <Button 
                variant="primary" 
                onClick={confirmBulkCreate}
                disabled={selectedSessions.size === 0}
                className="w-full sm:w-auto"
              >
                Потвърди ({selectedSessions.size})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSessionToDelete(null);
        }}
        onConfirm={confirmDeleteSession}
        title="Изтриване на тренировка"
        message="Сигурни ли сте, че искате да изтриете тази тренировка?"
        confirmText={isDeleting ? 'Изтриване...' : 'Потвърди изтриване'}
        cancelText="Отказ"
        variant="danger"
        disabled={isDeleting}
      >
        {sessionToDelete && (() => {
          const session = sessions.find(s => s._id === sessionToDelete);
          if (!session) return null;
          const formatTime = (date) => format(new Date(date), 'HH:mm');
          const getEndTime = (startDate, durationMinutes) => {
            const end = new Date(new Date(startDate).getTime() + durationMinutes * 60000);
            return format(end, 'HH:mm');
          };
          return (
            <div className="mb-4">
              <h3 className="text-sm sm:text-[16px] font-medium text-neutral-950 mb-2">Тренировка:</h3>
              <div className="p-3 bg-[#f3f3f5] rounded-[10px] border border-[rgba(0,0,0,0.1)]">
                <div className="text-sm sm:text-[16px] font-medium text-neutral-950">{session.title}</div>
                <div className="text-sm text-[#4a5565] mt-1">
                  {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                </div>
              </div>
            </div>
          );
        })()}
      </ConfirmDialog>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        title="Масово изтриване на тренировки"
        message={`Сигурни ли сте, че искате да изтриете ${selectedSessionIds.length} тренировки?`}
        confirmText={isDeleting ? 'Изтриване...' : `Потвърди изтриване (${selectedSessionIds.length})`}
        cancelText="Отказ"
        variant="danger"
        disabled={isDeleting}
      >
        <div className="mb-4">
          <h3 className="text-sm sm:text-[16px] font-medium text-neutral-950 mb-3">Избрани тренировки за изтриване:</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedSessionIds.map(sessionId => {
              const session = sessions.find(s => s._id === sessionId);
              if (!session) return null;
              const formatTime = (date) => format(new Date(date), 'HH:mm');
              const getEndTime = (startDate, durationMinutes) => {
                const end = new Date(new Date(startDate).getTime() + durationMinutes * 60000);
                return format(end, 'HH:mm');
              };
              return (
                <div key={sessionId} className="p-3 bg-[#f3f3f5] rounded-[10px] border border-[rgba(0,0,0,0.1)]">
                  <div className="text-sm sm:text-[16px] font-medium text-neutral-950">{session.title}</div>
                  <div className="text-sm text-[#4a5565] mt-1">
                    {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ConfirmDialog>

      {/* Edit Session Modal */}
      {showEditModal && editingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Редактирай тренировка</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заглавие
                </label>
                <input
                  type="text"
                  list="session-titles-edit"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Въведете или изберете заглавие"
                  required
                />
                <datalist id="session-titles-edit">
                  {getUniqueTitles().map((title, index) => (
                    <option key={index} value={title} />
                  ))}
                </datalist>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Дата"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  label="Час"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Продължителност (минути)"
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  required
                  min={1}
                />
                <Input
                  label="Капацитет"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                  min={1}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подходящо за
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'beginner', label: 'Начинаещи' },
                    { value: 'experienced', label: 'Деца с опит' },
                    { value: 'advanced', label: 'Напреднали' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleTargetGroup(value)}
                      className={`px-3 py-1 rounded text-sm font-normal transition-colors ${
                        formData.targetGroups.includes(value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Години
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: '4-6', label: '4-6' },
                    { value: '7-12', label: '7-12' },
                    { value: '13+', label: '13+' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleAgeGroup(value)}
                      className={`px-3 py-1 rounded text-sm font-normal transition-colors ${
                        formData.ageGroups.includes(value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Треньори
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                  {coaches.length === 0 ? (
                    <p className="text-sm text-gray-500">Няма налични треньори. Моля, създайте потребители треньори първо.</p>
                  ) : (
                    coaches.map((coach) => (
                      <label key={coach.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.coachIds.includes(coach.id)}
                          onChange={() => toggleCoach(coach.id)}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {coach.firstName && coach.lastName 
                            ? `${coach.firstName} ${coach.middleName || ''} ${coach.lastName}`.trim()
                            : coach.name || coach.email}
                          {coach.email && ` (${coach.email})`}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSession(null);
                    resetForm();
                  }}
                  className="w-full sm:w-auto"
                >
                  Отказ
                </Button>
                <Button type="submit" variant="primary" className="w-full sm:w-auto">
                  Обнови
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Filters Card */}
      <SessionFilters
        selectedDays={selectedDays}
        selectedTimes={selectedTimes}
        selectedTitles={selectedTitles}
        getUniqueTimes={getUniqueTimes}
        getUniqueTitles={getUniqueTitles}
        toggleFilter={toggleFilter}
        clearAllFilters={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Bulk Actions */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={selectAllFilteredSessions}
            className="text-xs md:text-base text-[#ff6900] leading-6 hover:opacity-80 transition-opacity"
          >
            Маркирай всички
          </button>
          {selectedSessionIds.length > 0 && (
            <>
              <span className="text-[#cad5e2] text-xs md:text-sm leading-5">|</span>
              <button
                type="button"
                onClick={clearAllSelectedSessions}
                className="text-xs md:text-base text-[#45556c] leading-6 hover:opacity-80 transition-opacity"
              >
                Изчисти всички
              </button>
            </>
          )}
        </div>
        <div className="text-base text-[#45556c] leading-6">
          Общо {getFilteredSessions().length} налични сесии
        </div>
      </div>

      {/* Bulk Delete Button */}
      {selectedSessionIds.length > 0 && (
        <div className="mb-4">
          <Button
            onClick={handleBulkDeleteClick}
            disabled={isDeleting}
            variant="danger"
            className="w-full sm:w-auto"
          >
            {isDeleting ? 'Изтриване...' : `Изтрий избраните тренировки (${selectedSessionIds.length})`}
          </Button>
        </div>
      )}

      {/* Sessions List */}
      <SessionList
        sessions={sessions}
        getFilteredSessions={getFilteredSessions}
        hasActiveFilters={hasActiveFilters}
        clearAllFilters={clearAllFilters}
        getBookedCount={getBookedCount}
        getBulgarianDayName={getBulgarianDayName}
        formatTime={formatTime}
        getEndTime={getEndTime}
        mode="admin"
        onReserve={handleManualBooking}
        onSelect={toggleSessionSelectionForDelete}
        selectedSessionIds={selectedSessionIds}
        coaches={coaches}
        allClimbers={allClimbers}
        selectedClimberForSession={selectedClimberForSession}
        onClimberSelect={(sessionId, climberId) => {
          setSelectedClimberForSession({ ...selectedClimberForSession, [sessionId]: climberId });
        }}
        viewingRoster={viewingRoster}
        roster={roster}
        onViewRoster={(sessionId) => {
          if (viewingRoster === sessionId) {
            setViewingRoster(null);
          } else {
            fetchRoster(sessionId);
          }
        }}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        showToast={showToast}
      />
    </div>
  );
};

export default Sessions;
