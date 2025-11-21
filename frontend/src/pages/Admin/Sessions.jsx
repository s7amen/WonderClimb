import { useState, useEffect } from 'react';
import { sessionsAPI, adminUsersAPI, adminAPI } from '../../services/api';
import { format, addDays, startOfDay, eachDayOfInterval, isBefore } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';

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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    capacity: 10,
    coachIds: [],
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
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSessions, setPreviewSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState(new Set());

  // Get unique session titles for autocomplete
  const getUniqueTitles = () => {
    const titles = sessions
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
      console.log('Fetched sessions:', response.data);
      setSessions(response.data.sessions || []);
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
      showToast('Катерачът е резервиран успешно', 'success');
      setSelectedClimberForSession({ ...selectedClimberForSession, [sessionId]: '' });
      fetchSessions();
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
      };

      if (editingSession) {
        await sessionsAPI.update(editingSession._id, sessionData);
        showToast('Тренировката е обновена успешно', 'success');
      } else {
        await sessionsAPI.create(sessionData);
        showToast('Тренировката е създадена успешно', 'success');
      }

      resetForm();
      fetchSessions();
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
    });
    setEditingSession(session);
    setShowForm(true);
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
      showToast('Сесията е изтрита успешно', 'success');
      setShowDeleteModal(false);
      setSessionToDelete(null);
      fetchSessions();
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

      for (const sessionId of selectedSessionIds) {
        try {
          await sessionsAPI.update(sessionId, { status: 'cancelled' });
          successCount++;
        } catch (error) {
          console.error('Error deleting session:', error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        showToast(`Успешно изтрити ${successCount} тренировки`, 'success');
      } else {
        showToast(`Изтрити ${successCount} тренировки, ${errorCount} грешки`, 'warning');
      }

      setSelectedSessionIds([]);
      setShowBulkDeleteModal(false);
      fetchSessions();
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
    });
    setEditingSession(null);
    setShowForm(false);
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

      for (const session of sessionsToCreate) {
        try {
          const sessionData = {
            title: bulkFormData.title,
            description: bulkFormData.description,
            date: session.date.toISOString(),
            durationMinutes: parseInt(bulkFormData.durationMinutes),
            capacity: parseInt(bulkFormData.capacity),
            coachIds: bulkFormData.coachIds,
          };

          await sessionsAPI.create(sessionData);
          successCount++;
        } catch (error) {
          console.error('Error creating session:', error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        showToast(`Успешно създадени ${successCount} тренировки`, 'success');
      } else {
        showToast(`Създадени ${successCount} тренировки, ${errorCount} грешки`, 'warning');
      }

      resetBulkForm();
      fetchSessions();
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

  // Filter functions
  const getUniqueTimes = () => {
    const times = sessions.map(session => format(new Date(session.date), 'HH:mm'));
    return [...new Set(times)].sort();
  };

  const getFilteredSessions = () => {
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);
    
    return sessions.filter(session => {
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
    const dayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
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
    setSelectedSessionIds(prev => 
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const selectAllFilteredSessions = () => {
    const filteredSessions = getFilteredSessions();
    const availableSessionIds = filteredSessions
      .filter(session => session.status === 'active')
      .map(session => session._id);
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

  if (loading) {
    return <Loading text="Зареждане на сесии..." />;
  }

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-base font-medium text-neutral-950 mb-1">Сесии</h1>
          <p className="text-sm text-[#4a5565]">Управление на тренировки и сесии</p>
        </div>
        <div className="flex gap-2">
          {showForm && (
            <Button variant="secondary" onClick={() => {
              setShowForm(false);
              setIsBulkMode(false);
              setEditingSession(null);
              setShowPreviewModal(false);
            }}>
              Отказ
            </Button>
          )}
          {!showForm && (
            <>
              <Button onClick={() => {
                setShowForm(true);
                setIsBulkMode(false);
                setEditingSession(null);
              }}>
                Нова тренировка
              </Button>
              <Button variant="secondary" onClick={() => {
                setShowForm(true);
                setIsBulkMode(true);
                setEditingSession(null);
              }}>
                Нови тренировки
              </Button>
            </>
          )}
        </div>
      </div>

      <ToastComponent />

      {showForm && (
        <Card title={editingSession ? 'Редактирай тренировка' : (isBulkMode ? 'Създай нови тренировки' : 'Създай нова тренировка')}>
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

                <div className="grid grid-cols-2 gap-4 mb-4">
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="flex gap-2 mt-4">
                  <Button type="submit" variant="primary">
                    Създай
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetBulkForm}>
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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

                <div className="flex gap-2 mt-4">
                  <Button type="submit" variant="primary">
                    {editingSession ? 'Обнови' : 'Създай'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetForm}>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Преглед на тренировките за създаване</h2>
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
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
                Отказ
              </Button>
              <Button 
                variant="primary" 
                onClick={confirmBulkCreate}
                disabled={selectedSessions.size === 0}
              >
                Потвърди ({selectedSessions.size})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Потвърждение на изтриване</h2>
            
            {sessionToDelete && (() => {
              const session = sessions.find(s => s._id === sessionToDelete);
              if (!session) return null;
              return (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Тренировка:</h3>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">{session.title}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mb-4 p-3 bg-yellow-50 rounded-md">
              <p className="text-sm text-gray-700">
                Сигурни ли сте, че искате да изтриете тази тренировка?
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSessionToDelete(null);
                }}
                disabled={isDeleting}
              >
                Отказ
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmDeleteSession}
                disabled={isDeleting}
              >
                {isDeleting ? 'Изтриване...' : 'Потвърди изтриване'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Потвърждение на масово изтриване</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Избрани тренировки за изтриване:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedSessionIds.map(sessionId => {
                  const session = sessions.find(s => s._id === sessionId);
                  if (!session) return null;
                  return (
                    <div key={sessionId} className="p-2 bg-gray-50 rounded">
                      <div className="font-medium">{session.title}</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 rounded-md">
              <p className="text-sm text-gray-700">
                Сигурни ли сте, че искате да изтриете {selectedSessionIds.length} тренировки?
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeleting}
              >
                Отказ
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmBulkDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Изтриване...' : `Потвърди изтриване (${selectedSessionIds.length})`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Schedule View */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
          <h2 className="text-base font-medium text-neutral-950">График на тренировки</h2>
        </div>

        {/* Filters */}
        <div className="mb-4 space-y-2">
          {/* Days of week filter */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-sm font-medium text-gray-700">Дни:</span>
            {selectedDays.length > 0 && (
              <button
                type="button"
                onClick={() => selectAllFilter('day')}
                className="px-2 py-1 text-xs rounded-md font-medium bg-green-100 text-green-700 hover:bg-green-200"
              >
                Избери всички
              </button>
            )}
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const dayNames = ['Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб', 'Нед'];
              const dayIndex = day === 0 ? 6 : day - 1;
              const isSelected = selectedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleFilter('day', day)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {dayNames[dayIndex]}
                </button>
              );
            })}
          </div>

          {/* Time filter */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-sm font-medium text-gray-700">Час:</span>
            {selectedTimes.length > 0 && (
              <button
                type="button"
                onClick={() => selectAllFilter('time')}
                className="px-2 py-1 text-xs rounded-md font-medium bg-green-100 text-green-700 hover:bg-green-200"
              >
                Избери всички
              </button>
            )}
            {getUniqueTimes().map((time) => {
              const isSelected = selectedTimes.includes(time);
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => toggleFilter('time', time)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>

          {/* Title filter */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-sm font-medium text-gray-700">Тренировка:</span>
            {selectedTitles.length > 0 && (
              <button
                type="button"
                onClick={() => selectAllFilter('title')}
                className="px-2 py-1 text-xs rounded-md font-medium bg-green-100 text-green-700 hover:bg-green-200"
              >
                Избери всички
              </button>
            )}
            {getUniqueTitles().map((title) => {
              const isSelected = selectedTitles.includes(title);
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => toggleFilter('title', title)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors truncate max-w-[200px] ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title={title}
                >
                  {title}
                </button>
              );
            })}
          </div>

          {/* Clear all filters button */}
          {hasActiveFilters() && (
            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Премахни всички филтри
              </button>
            </div>
          )}

          {/* Bulk delete section */}
          <div className="mt-6 pt-6 border-t-2 border-gray-300 space-y-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex-1">
                {selectedSessionIds.length > 0 && (
                  <p className="text-sm text-gray-700">
                    Избрани {selectedSessionIds.length} тренировки за изтриване
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end md:items-end gap-2 w-full md:w-auto">
                {selectedSessionIds.length > 0 && (
                  <Button
                    onClick={handleBulkDeleteClick}
                    disabled={isDeleting}
                    variant="danger"
                    className="w-full md:w-auto"
                  >
                    {isDeleting ? 'Изтриване...' : 'Изтрий избраните тренировки'}
                  </Button>
                )}
                <div className="flex flex-row gap-2 items-center">
                  <button
                    type="button"
                    onClick={selectAllFilteredSessions}
                    className="text-xs md:text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
                  >
                    Маркирай всички тренировки
                  </button>
                  {selectedSessionIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllSelectedSessions}
                      className="text-xs md:text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
                    >
                      Изчисти всички
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {(() => {
            const groupedSessions = groupSessionsByDay();
            const filteredSessions = getFilteredSessions();
            const today = startOfDay(new Date());
            const viewEndDate = addDays(today, daysToShow);
            
            const days = eachDayOfInterval({ start: today, end: viewEndDate });
            
            const hasResults = days.some(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayData = groupedSessions[dayKey];
              return dayData && dayData.sessions.length > 0;
            });
            
            if (hasActiveFilters() && !hasResults && filteredSessions.length === 0) {
              return (
                <Card>
                  <div className="text-center py-12">
                    <p className="text-gray-600 text-lg mb-2">Няма намерени тренировки с избраните филтри</p>
                    <p className="text-gray-500 text-sm mb-4">Моля, опитайте с други филтри или премахнете филтрите</p>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
                    >
                      Премахни всички филтри
                    </button>
                  </div>
                </Card>
              );
            }
            
            return days.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayData = groupedSessions[dayKey];
              const dayName = getBulgarianDayName(day);
              const dayDate = format(day, 'dd/MM/yyyy');
              
              if (hasActiveFilters() && (!dayData || dayData.sessions.length === 0)) {
                return null;
              }
              
              return (
                <div key={dayKey} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] overflow-hidden">
                  {/* Day Header */}
                  <div className="bg-[#35383d] text-white px-4 py-3">
                    <h3 className="text-base font-medium">
                      {dayName} | {dayDate}
                    </h3>
                  </div>

                  {/* Sessions List */}
                  <div>
                    {dayData && dayData.sessions.length > 0 ? (
                      dayData.sessions.map((session, index) => {
                        const bookedCount = getBookedCount(session._id);
                        const availableSpots = session.capacity - bookedCount;
                        const isFull = bookedCount >= session.capacity;
                        const isEvenRow = index % 2 === 0;
                        const isActive = session.status === 'active';
                        const hasBookings = bookedCount > 0;
                        const selectedClimberId = selectedClimberForSession[session._id] || '';
                        
                        return (
                          <div
                            key={session._id}
                            className={`px-4 py-3 ${
                              hasBookings 
                                ? 'bg-green-50' 
                                : (isEvenRow ? 'bg-white' : 'bg-orange-50')
                            } border-b border-gray-100 last:border-b-0`}
                          >
                            {/* Mobile Layout */}
                            <div className="md:hidden space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="font-medium text-gray-900">
                                  {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                                </div>
                              </div>
                              <div className="text-gray-800 font-medium">
                                {session.title}
                              </div>
                              <div className="text-gray-600 text-sm">
                                {bookedCount}/{session.capacity}
                              </div>
                              <div className="flex flex-col gap-2">
                                {isActive && (
                                  <>
                                    {/* First row: Dropdown and "Запази място" button */}
                                    <div className="flex gap-2">
                                      <select
                                        value={selectedClimberId}
                                        onChange={(e) => setSelectedClimberForSession({ ...selectedClimberForSession, [session._id]: e.target.value })}
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                      >
                                        <option value="">Избери катерач...</option>
                                        {allClimbers.map((climber) => (
                                          <option key={climber._id} value={climber._id}>
                                            {climber.firstName} {climber.lastName}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => handleManualBooking(session._id)}
                                        disabled={!selectedClimberId}
                                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 whitespace-nowrap"
                                      >
                                        Запази място
                                      </button>
                                    </div>
                                    {/* Second row: Other buttons and checkbox */}
                                    <div className="flex gap-2 flex-wrap">
                                      <button
                                        onClick={() => viewingRoster === session._id ? setViewingRoster(null) : fetchRoster(session._id)}
                                        className="text-gray-600 hover:text-gray-700 text-sm"
                                      >
                                        {viewingRoster === session._id ? 'Скрий списъка' : 'Виж списъка'}
                                      </button>
                                      <button
                                        onClick={() => handleEdit(session)}
                                        className="text-gray-600 hover:text-gray-700 text-sm"
                                      >
                                        Редактирай
                                      </button>
                                      <button
                                        onClick={() => handleDeleteClick(session._id)}
                                        className="text-red-600 hover:text-red-700 text-sm"
                                      >
                                        Изтрий
                                      </button>
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={selectedSessionIds.includes(session._id)}
                                          onChange={() => toggleSessionSelectionForDelete(session._id)}
                                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                      </label>
                                    </div>
                                  </>
                                )}
                                {!isActive && (
                                  <span className="text-sm text-gray-500">Отменена</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Desktop Layout */}
                            <div className="hidden md:grid md:grid-cols-5 gap-4 items-center">
                              {/* Time */}
                              <div className="font-medium text-gray-900">
                                {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                              </div>
                              
                              {/* Activity Name */}
                              <div className="text-gray-800">
                                {session.title}
                              </div>
                              
                              {/* Available Spots */}
                              <div className="text-gray-600">
                                {bookedCount}/{session.capacity}
                              </div>
                              
                              {/* All controls in one column - dropdown, buttons, checkbox */}
                              {isActive && (
                                <div className="flex flex-col gap-2">
                                  {/* First row: Dropdown and "Запази място" button */}
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={selectedClimberId}
                                      onChange={(e) => setSelectedClimberForSession({ ...selectedClimberForSession, [session._id]: e.target.value })}
                                      className="px-2 py-1.5 text-sm border border-gray-300 rounded-md h-8 flex-1"
                                    >
                                      <option value="">Избери катерач...</option>
                                      {allClimbers.map((climber) => (
                                        <option key={climber._id} value={climber._id}>
                                          {climber.firstName} {climber.lastName}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleManualBooking(session._id)}
                                      disabled={!selectedClimberId}
                                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 whitespace-nowrap border border-blue-600 rounded-md h-8 disabled:border-gray-300"
                                    >
                                      Запази място
                                    </button>
                                  </div>
                                  {/* Second row: Other buttons and checkbox */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={() => viewingRoster === session._id ? setViewingRoster(null) : fetchRoster(session._id)}
                                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 whitespace-nowrap border border-gray-300 rounded-md h-8"
                                    >
                                      {viewingRoster === session._id ? 'Скрий списъка' : 'Виж списъка'}
                                    </button>
                                    <button
                                      onClick={() => handleEdit(session)}
                                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 whitespace-nowrap border border-gray-300 rounded-md h-8"
                                    >
                                      Редактирай
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(session._id)}
                                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 whitespace-nowrap border border-red-600 rounded-md h-8"
                                    >
                                      Изтрий
                                    </button>
                                    <label className="flex items-center cursor-pointer h-8">
                                      <input
                                        type="checkbox"
                                        checked={selectedSessionIds.includes(session._id)}
                                        onChange={() => toggleSessionSelectionForDelete(session._id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}
                              {!isActive && (
                                <div className="text-sm text-gray-500">Отменена</div>
                              )}
                            </div>

                            {/* Roster View */}
                            {viewingRoster === session._id && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="font-semibold mb-3">Регистрирани катерачи ({roster.length})</h4>
                                {roster.length === 0 ? (
                                  <p className="text-gray-500 text-sm">Все още няма регистрирани катерачи</p>
                                ) : (
                                  <div className="space-y-2">
                                    {roster.map((item) => {
                                      const climber = item.climber || item;
                                      const bookedBy = item.bookedBy;
                                      return (
                                        <div key={item.bookingId || climber._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                          <div>
                                            <span className="font-medium">{climber.firstName} {climber.lastName}</span>
                                            {climber.dateOfBirth && (
                                              <span className="text-sm text-gray-500 ml-2">
                                                (Възраст: {new Date().getFullYear() - new Date(climber.dateOfBirth).getFullYear()})
                                              </span>
                                            )}
                                            {bookedBy && (
                                              <span className="text-xs text-gray-400 ml-2">
                                                Резервирано от: {
                                                  bookedBy.firstName && bookedBy.lastName
                                                    ? `${bookedBy.firstName} ${bookedBy.middleName || ''} ${bookedBy.lastName}`.trim()
                                                    : bookedBy.name || bookedBy.email
                                                }
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500 bg-gray-50">
                        Няма налични тренировки за този ден
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};

export default Sessions;
