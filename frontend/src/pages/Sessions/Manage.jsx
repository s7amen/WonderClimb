import { useState, useEffect } from 'react';
import { sessionsAPI, adminUsersAPI, adminAPI, settingsAPI } from '../../services/api';
import { format, addDays, startOfDay, eachDayOfInterval, isBefore } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import ClimbingLoader from '../../components/UI/ClimbingLoader';
import { useToast } from '../../components/UI/Toast';
import SessionFilters from '../../components/Sessions/SessionFilters';
import SessionList from '../../components/Sessions/SessionList';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import ScrollToTop from '../../components/UI/ScrollToTop';

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
  const { showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState('upcoming');


  // Schedule view states
  const [daysToShow, setDaysToShow] = useState(30);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [selectedClimberForSession, setSelectedClimberForSession] = useState({});

  // Filter states
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [selectedTargetGroups, setSelectedTargetGroups] = useState([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState([]);

  // Deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'cancel' or 'delete'
  const [deleteRelatedData, setDeleteRelatedData] = useState(null); // attendance/booking counts

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
    ageGroups: [],
  });

  // Dynamic filter labels from settings
  const [trainingLabels, setTrainingLabels] = useState({
    targetGroups: [],
    ageGroups: [],
    visibility: {
      targetGroups: true,
      ageGroups: true,
      days: true,
      times: true,
      titles: true,
      reservations: true
    }
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
    ageGroups: [], // Will use defaults from settings if empty not hardcoded
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
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const CACHE_KEY = 'wonderclimb-training-labels';

    // Helper to validate cached data structure
    const isValidCache = (data) => {
      return data &&
        Array.isArray(data.targetGroups) &&
        Array.isArray(data.ageGroups) &&
        typeof data.visibility === 'object';
    };

    try {
      // Check cache first - no TTL, cache is invalidated only when settings are saved
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        // Handle old format { data, timestamp } or new format (direct object)
        const labels = data.data || data;
        if (isValidCache(labels)) {
          setTrainingLabels(labels);

          // Set default age groups for forms if available
          const defaultAgeGroups = labels.ageGroups.map(g => g.label);
          if (defaultAgeGroups.length > 0) {
            setFormData(prev => ({ ...prev, ageGroups: defaultAgeGroups }));
            setBulkFormData(prev => ({ ...prev, ageGroups: defaultAgeGroups }));
          }
          return;
        }
        // Invalid cache, remove it
        localStorage.removeItem(CACHE_KEY);
      }

      // Fetch from API only if cache is missing or invalid
      const response = await settingsAPI.getTrainingLabels();
      const loadedTrainingLabels = response.data.trainingLabels || {};
      const labels = {
        targetGroups: loadedTrainingLabels.targetGroups || [],
        ageGroups: loadedTrainingLabels.ageGroups || [],
        visibility: {
          targetGroups: loadedTrainingLabels.visibility?.targetGroups ?? true,
          ageGroups: loadedTrainingLabels.visibility?.ageGroups ?? true,
          days: loadedTrainingLabels.visibility?.days ?? true,
          times: loadedTrainingLabels.visibility?.times ?? true,
          titles: loadedTrainingLabels.visibility?.titles ?? true,
          reservations: loadedTrainingLabels.visibility?.reservations ?? true,
        }
      };
      setTrainingLabels(labels);

      // Save to cache (no timestamp needed - invalidated only when settings are saved)
      localStorage.setItem(CACHE_KEY, JSON.stringify(labels));

      // Set default age groups for forms if available
      const defaultAgeGroups = labels.ageGroups.map(g => g.label);
      if (defaultAgeGroups.length > 0) {
        setFormData(prev => ({ ...prev, ageGroups: defaultAgeGroups }));
        setBulkFormData(prev => ({ ...prev, ageGroups: defaultAgeGroups }));
      }
    } catch (error) {
      console.error('Error fetching training labels:', error);
      // If API call fails and no cache exists, use empty arrays (will show no labels)
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        setTrainingLabels({
          targetGroups: [],
          ageGroups: [],
          visibility: {
            targetGroups: true,
            ageGroups: true,
            days: true,
            times: true,
            titles: true,
            reservations: true,
          }
        });
      }
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      // Fetch -90 days to +365 days
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const response = await sessionsAPI.getAll(startDate);

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

        showToast('Тренировката е създадена успешно', 'success');
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
      targetGroups: session.targetGroups || [],
      ageGroups: session.ageGroups || (trainingLabels.ageGroups.length > 0 ? trainingLabels.ageGroups.map(g => g.label) : ['4-6', '7-12', '13+']),
    });
    setEditingSession(session);
    setShowEditModal(true);
  };

  // Duplication states
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateConfig, setDuplicateConfig] = useState({
    targetDate: '',
    endDate: '',
    repeats: 1,
    useEndDate: false
  });
  const [duplicatePreview, setDuplicatePreview] = useState([]);
  const [showDuplicatePreview, setShowDuplicatePreview] = useState(false);

  // Duplication Logic
  const handleDuplicateClick = () => {
    if (selectedSessionIds.length === 0) {
      showToast('Моля, изберете поне една тренировка за дублиране', 'error');
      return;
    }

    // Find the earliest date among selected sessions to establish relative offsets
    const selectedSessionsList = sessions.filter(s => selectedSessionIds.includes(s._id));
    if (selectedSessionsList.length === 0) return;

    // Default target date: 1 week after the earliest selected session
    // Or if that's in the past, 1 week from today
    const sortedByDate = [...selectedSessionsList].sort((a, b) => new Date(a.date) - new Date(b.date));
    const earliestSessionDate = new Date(sortedByDate[0].date);

    // Default to next week from the earliest session
    const defaultTargetDate = addDays(earliestSessionDate, 7);

    setDuplicateConfig({
      targetDate: format(defaultTargetDate, 'yyyy-MM-dd'),
      endDate: '',
      repeats: 1,
      useEndDate: false
    });
    setShowDuplicateModal(true);
  };

  const calculateDuplicates = () => {
    const selectedSessionsList = sessions.filter(s => selectedSessionIds.includes(s._id));
    if (selectedSessionsList.length === 0) return [];

    const sortedByDate = [...selectedSessionsList].sort((a, b) => new Date(a.date) - new Date(b.date));
    const anchorDate = new Date(sortedByDate[0].date); // The earliest date is our anchor
    const targetDate = new Date(duplicateConfig.targetDate);

    // Calculate time difference between anchor and target
    const timeShift = targetDate.getTime() - anchorDate.getTime();

    const newSessions = [];

    // Determine how many weeks to duplicate
    let weeksCount;
    if (duplicateConfig.useEndDate && duplicateConfig.endDate) {
      const endDate = new Date(duplicateConfig.endDate);
      const daysDiff = Math.ceil((endDate.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000));
      weeksCount = Math.ceil(daysDiff / 7) + 1; // +1 to include the last week
    } else {
      weeksCount = duplicateConfig.repeats;
    }

    // For each week
    for (let i = 0; i < weeksCount; i++) {
      const repeatTimeShift = i * 7 * 24 * 60 * 60 * 1000; // +7 days for each repeat

      selectedSessionsList.forEach(session => {
        const originalDate = new Date(session.date);
        // New Date = Original + (Target - Anchor) + (i * 7 days)
        const newDateTimestamp = originalDate.getTime() + timeShift + repeatTimeShift;
        const newDate = new Date(newDateTimestamp);

        // If using end date, filter out sessions beyond the end date
        if (duplicateConfig.useEndDate && duplicateConfig.endDate) {
          const endDate = new Date(duplicateConfig.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (newDate > endDate) {
            return; // Skip this session
          }
        }

        newSessions.push({
          ...session,
          _id: undefined, // Clear ID
          id: undefined,
          date: newDate,
          bookedCount: 0, // Reset bookings
          status: 'active'
        });
      });
    }

    return newSessions.sort((a, b) => a.date - b.date);
  };

  const handleDuplicatePreview = () => {
    if (!duplicateConfig.targetDate) {
      showToast('Моля, изберете начална дата', 'error');
      return;
    }
    if (duplicateConfig.useEndDate && !duplicateConfig.endDate) {
      showToast('Моля, изберете крайна дата', 'error');
      return;
    }
    if (duplicateConfig.useEndDate && duplicateConfig.endDate) {
      const start = new Date(duplicateConfig.targetDate);
      const end = new Date(duplicateConfig.endDate);
      if (end <= start) {
        showToast('Крайната дата трябва да бъде след началната', 'error');
        return;
      }
    }
    const preview = calculateDuplicates();
    if (preview.length === 0) {
      showToast('Няма тренировки за дублиране с избраните настройки', 'error');
      return;
    }
    setDuplicatePreview(preview);
    setShowDuplicateModal(false);
    setShowDuplicatePreview(true);
  };

  const confirmDuplicate = async () => {
    try {
      setLoading(true);
      const response = await sessionsAPI.createBatch(duplicatePreview);

      const newSessions = response.data.sessions;

      // Add new sessions to state
      setSessions(prev => {
        const filtered = prev.filter(event =>
          event.type !== 'competition' && event.status !== 'cancelled'
        );
        return [...filtered, ...newSessions].sort((a, b) =>
          new Date(a.date) - new Date(b.date)
        );
      });

      showToast(`Успешно дублирани ${newSessions.length} тренировки`, 'success');

      setShowDuplicatePreview(false);
      setDuplicateConfig({ targetDate: '', endDate: '', repeats: 1, useEndDate: false });
      setSelectedSessionIds([]); // Clear selection after success

    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Грешка при дублиране', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel click (soft delete)
  const handleCancelClick = async (sessionId) => {
    setSessionToDelete(sessionId);
    setDeleteType('cancel');
    setShowDeleteModal(true);
  };

  // Handle hard delete click
  const handleDeleteClick = async (sessionId) => {
    try {
      // First check if session has attendance/bookings
      const response = await sessionsAPI.checkRelatedData(sessionId);
      const relatedData = response.data;

      // If has attendance, cannot delete - only cancel
      if (relatedData.attendanceRecords > 0) {
        showToast(
          `Не може да изтриете тренировка с ${relatedData.attendanceRecords} посещения. Използвайте "Откажи" вместо това.`,
          'error'
        );
        return;
      }

      setSessionToDelete(sessionId);
      setDeleteType('delete');
      setDeleteRelatedData(relatedData);
      setShowDeleteModal(true);
    } catch (error) {
      showToast(
        error.response?.data?.error?.message || 'Грешка при проверка на тренировка',
        'error'
      );
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    try {
      if (deleteType === 'cancel') {
        // Soft delete - cancel the session
        await sessionsAPI.update(sessionToDelete, { status: 'cancelled' });
        showToast('Тренировката е отказана успешно', 'success');
      } else if (deleteType === 'delete') {
        // Hard delete - permanently delete from database
        await sessionsAPI.deleteSession(sessionToDelete);
        showToast('Тренировката е изтрита успешно', 'success');
      }

      // Премахваме сесията от масива
      setSessions(prev => prev.filter(s => s._id !== sessionToDelete));

      setShowDeleteModal(false);
      setSessionToDelete(null);
      setDeleteType(null);
      setDeleteRelatedData(null);
    } catch (error) {
      showToast(
        error.response?.data?.error?.message || 'Грешка при изтриване на сесия',
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Analysis
  const [bulkDeleteAnalysis, setBulkDeleteAnalysis] = useState(null);

  // Bulk Edit State
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  const [initialBulkValues, setInitialBulkValues] = useState({}); // To detect mixed values

  const getCommonValue = (sessions, field, compareFn = (a, b) => a === b) => {
    if (sessions.length === 0) return null;
    const firstVal = sessions[0][field];

    // For arrays (coaches, groups), we need deep comparison if not provided
    if (Array.isArray(firstVal)) {
      const areArraysEqual = (arr1, arr2) => {
        if (arr1.length !== arr2.length) return false;
        // Simple sort and compare for IDs/Slugs
        const sorted1 = [...arr1].sort();
        const sorted2 = [...arr2].sort();
        return sorted1.every((val, index) => val === sorted2[index]);
      };

      const allSame = sessions.every(s => areArraysEqual(s[field] || [], firstVal || []));
      return allSame ? firstVal : 'MIXED';
    }

    // For primitives
    const allSame = sessions.every(s => s[field] === firstVal);
    return allSame ? firstVal : 'MIXED';
  };

  const handleBulkEditClick = () => {
    const selectedSessionsList = sessions.filter(s => selectedSessionIds.includes(s._id));
    if (selectedSessionsList.length === 0) return;

    // Normalize coaches to IDs for comparison
    const normalizedSessions = selectedSessionsList.map(s => ({
      ...s,
      coachIds: s.coachIds?.map(c => c._id || c) || [],
    }));

    const commonValues = {
      title: getCommonValue(normalizedSessions, 'title'),
      description: getCommonValue(normalizedSessions, 'description'),
      durationMinutes: getCommonValue(normalizedSessions, 'durationMinutes'),
      capacity: getCommonValue(normalizedSessions, 'capacity'),
      coachIds: getCommonValue(normalizedSessions, 'coachIds'),
      targetGroups: getCommonValue(normalizedSessions, 'targetGroups'),
      ageGroups: getCommonValue(normalizedSessions, 'ageGroups'),
    };

    setInitialBulkValues(commonValues);

    // Initialize form data - if MIXED, leave empty or set to specific placeholder logic handled in UI
    // We will use 'undefined' or special value for mixed in the form to denote "no change unless touched"
    setBulkEditData({
      title: commonValues.title === 'MIXED' ? '' : commonValues.title,
      description: commonValues.description === 'MIXED' ? '' : commonValues.description,
      durationMinutes: commonValues.durationMinutes === 'MIXED' ? '' : commonValues.durationMinutes,
      capacity: commonValues.capacity === 'MIXED' ? '' : commonValues.capacity,
      coachIds: commonValues.coachIds === 'MIXED' ? [] : commonValues.coachIds,
      targetGroups: commonValues.targetGroups === 'MIXED' ? [] : commonValues.targetGroups,
      ageGroups: commonValues.ageGroups === 'MIXED' ? [] : commonValues.ageGroups,
    });

    setShowBulkEditModal(true);
  };

  const confirmBulkEdit = async (e) => {
    e.preventDefault();
    if (selectedSessionIds.length === 0) return;

    setLoading(true);
    try {
      // Determine changed fields
      const updates = {};

      // Helper to check if field changed from initial "Common/Mixed" state
      // Logic: If user touched a Mixed field, we update. 
      // If user changed a Common field, we update.
      // We can track this by comparing current bulkEditData with initialBulkValues
      // BUT: If initial was 'MIXED', any value in bulkEditData (even empty) might be a desired change?
      // No, usually UX is: Mixed fields are shown as "Mixed". If user sets a value, it applies to all.
      // If user leaves it as "Mixed" (or empty), we don't update that field.

      // Simpler approach: We only include fields in the update payload that have valid values
      // AND we need a way to know if the user explicitly cleared a field.
      // Let's assume for this version:
      // Valid value entered -> Update all.
      // Checks for modifications:

      const isModified = (field, value, initial) => {
        if (initial === 'MIXED') {
          // If it was mixed, we only update if the user provided a specific non-empty/valid value
          // Or if they explicitly cleared it? 
          // For simplicity: If arrays are empty, we assume "No Change" if it was mixed.
          // If primitives are empty/null, we assume "No Change" if it was mixed.
          if (Array.isArray(value)) return value.length > 0;
          return value !== '' && value !== null && value !== undefined;
        }
        // If it wasn't mixed, we update if value is different
        return value !== initial;
      };

      if (isModified('title', bulkEditData.title, initialBulkValues.title)) updates.title = bulkEditData.title;
      if (isModified('description', bulkEditData.description, initialBulkValues.description)) updates.description = bulkEditData.description;
      if (isModified('durationMinutes', bulkEditData.durationMinutes, initialBulkValues.durationMinutes)) updates.durationMinutes = parseInt(bulkEditData.durationMinutes);
      if (isModified('capacity', bulkEditData.capacity, initialBulkValues.capacity)) updates.capacity = parseInt(bulkEditData.capacity);

      // For arrays, simple length check might not be enough if user WANTS to clear tags.
      // But standard "Mixed" UI usually requires an explicit "Clear" action or "Set" action.
      // Here: If user selects items in the list, we overwrite. 
      // If list is empty AND initial was unique (not mixed), we assume they cleared it.
      // If list is empty AND initial was MIXED, we assume they didn't touch it.

      if (initialBulkValues.coachIds !== 'MIXED' || bulkEditData.coachIds.length > 0) {
        if (JSON.stringify(bulkEditData.coachIds.sort()) !== JSON.stringify((initialBulkValues.coachIds === 'MIXED' ? [] : initialBulkValues.coachIds).sort())) {
          updates.coachIds = bulkEditData.coachIds;
        }
      }

      if (initialBulkValues.targetGroups !== 'MIXED' || bulkEditData.targetGroups.length > 0) {
        if (JSON.stringify(bulkEditData.targetGroups.sort()) !== JSON.stringify((initialBulkValues.targetGroups === 'MIXED' ? [] : initialBulkValues.targetGroups).sort())) {
          updates.targetGroups = bulkEditData.targetGroups;
        }
      }

      if (initialBulkValues.ageGroups !== 'MIXED' || bulkEditData.ageGroups.length > 0) {
        if (JSON.stringify(bulkEditData.ageGroups.sort()) !== JSON.stringify((initialBulkValues.ageGroups === 'MIXED' ? [] : initialBulkValues.ageGroups).sort())) {
          updates.ageGroups = bulkEditData.ageGroups;
        }
      }

      if (Object.keys(updates).length === 0) {
        setShowBulkEditModal(false);
        showToast('Няма промени за запазване', 'info');
        setLoading(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const sessionId of selectedSessionIds) {
        try {
          // We need to merge with existing session data to be safe, 
          // but update endpoint usually accepts partial. 
          // Let's assume `sessionsAPI.update` handles partials or we might need to fetch-merge-save.
          // Based on `handleSubmit` (single edit), it sends full object.
          // Let's check `sessionsAPI.update`. Assuming it's PATCH-like or PUT-like.
          // Safety: We will merge updates into the specific session's current data if needed, 
          // or rely on backend. Most standard Mongoose/backend designs allow partials or we pass full obj.
          // Looking at `handleSubmit`: it re-constructs the whole object.
          // To be safe, let's merge with the session's existing data from state.

          const session = sessions.find(s => s._id === sessionId);
          if (!session) continue;

          const sessionDate = new Date(session.date);

          // Re-construct full object ensuring we don't lose data
          // We only override the fields present in `updates`
          const mergedData = {
            title: updates.title !== undefined ? updates.title : session.title,
            description: updates.description !== undefined ? updates.description : (session.description || ''),
            date: session.date, // Preserve original date
            durationMinutes: updates.durationMinutes !== undefined ? updates.durationMinutes : session.durationMinutes,
            capacity: updates.capacity !== undefined ? updates.capacity : session.capacity,
            coachIds: updates.coachIds !== undefined ? updates.coachIds : (session.coachIds?.map(c => c._id || c) || []),
            targetGroups: updates.targetGroups !== undefined ? updates.targetGroups : (session.targetGroups || []),
            ageGroups: updates.ageGroups !== undefined ? updates.ageGroups : (session.ageGroups || []),
          };

          await sessionsAPI.update(sessionId, mergedData);
          successCount++;

          // Optimistic Update in State
          setSessions(prev => prev.map(s => {
            if (s._id === sessionId) {
              return {
                ...s,
                ...updates, // This applies the simplified updates
                // For arrays, we just set them. 
                // Note: we need to handle populated fields like 'coachIds' if UI expects objects?
                // SessionList usually handles IDs or Objects robustly? 
                // Let's check: SessionList usually displays data. 
                // If we update coachIds to [id1,], but session had [{_id: id1...}], 
                // we might break UI temporarily until refresh. 
                // Fix: We should update with "rich" objects if possible or rely on re-fetch.
                // A simple re-fetch of all sessions might be safer but slower.
                // Let's try to map IDs back to Coach Objects from `coaches` state for the UI update.
              };
            }
            return s;
          }));

        } catch (error) {
          console.error(`Error updating session ${sessionId}:`, error);
          errorCount++;
        }
      }

      // Refresh data to ensure consistency (especially for populated fields like coaches)
      fetchSessions();

      if (errorCount > 0) {
        showToast(`Обновени ${successCount} тренировки, ${errorCount} грешки`, 'warning');
      } else {
        showToast(`Успешно обновени ${successCount} тренировки`, 'success');
      }

      setShowBulkEditModal(false);
      setSelectedSessionIds([]);
    } catch (error) {
      showToast('Грешка при масово обновяване', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteClick = async () => {
    if (selectedSessionIds.length === 0) {
      showToast('Моля, изберете поне една тренировка за изтриване', 'error');
      return;
    }

    try {
      setLoading(true); // Small loading indicator while checking

      // Analyze all selected sessions
      const analysis = {
        total: selectedSessionIds.length,
        withAttendance: 0,
        withBookings: 0,
        sessionsWithAttendance: [],
        sessionsWithBookings: [],
        safeToDelete: 0
      };

      // We need to check each session
      // Using Promise.all for parallel execution
      const checkPromises = selectedSessionIds.map(async (sessionId) => {
        try {
          const response = await sessionsAPI.checkRelatedData(sessionId);
          return { id: sessionId, data: response.data };
        } catch (error) {
          console.error(`Error checking session ${sessionId}:`, error);
          return { id: sessionId, error: true };
        }
      });

      const results = await Promise.all(checkPromises);

      results.forEach(result => {
        if (result.error) return; // Skip errored checks

        const { attendanceRecords, bookings } = result.data;
        const totalBookings = bookings?.total || 0;

        if (attendanceRecords > 0) {
          analysis.withAttendance++;
          const session = sessions.find(s => s._id === result.id);
          if (session) analysis.sessionsWithAttendance.push(session.title);
        } else if (totalBookings > 0) {
          analysis.withBookings++;
          const session = sessions.find(s => s._id === result.id);
          if (session) analysis.sessionsWithBookings.push(session.title);
        } else {
          analysis.safeToDelete++;
        }
      });

      setBulkDeleteAnalysis(analysis);
      setShowBulkDeleteModal(true);
    } catch (error) {
      showToast('Грешка при проверка на избраните тренировки', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmBulkDelete = async (actionType = 'cancel') => {
    if (selectedSessionIds.length === 0) return;

    setIsDeleting(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const successfulIds = [];

      // Loop through selected IDs
      for (const sessionId of selectedSessionIds) {
        try {
          if (actionType === 'delete') {
            // Hard Delete
            // Skip if this specific session has attendance (double check protection)
            // Ideally UI prevents this, but safety first
            // We rely on the user understanding the bulk action applies to all
            await sessionsAPI.deleteSession(sessionId);
          } else {
            // Soft Delete (Cancel)
            await sessionsAPI.update(sessionId, { status: 'cancelled' });
          }

          successfulIds.push(sessionId);
          successCount++;
        } catch (error) {
          console.error(`Error processing session ${sessionId}:`, error);
          errorCount++;
        }
      }

      // Remove successful sessions from state
      if (successfulIds.length > 0) {
        setSessions(prev => prev.filter(s => !successfulIds.includes(s._id)));
      }

      if (errorCount > 0) {
        showToast(
          `Обработени ${successCount} тренировки, ${errorCount} грешки`,
          'warning'
        );
      } else {
        showToast(
          actionType === 'delete'
            ? 'Тренировките бяха изтрити успешно'
            : 'Тренировките бяха отказани успешно',
          'success'
        );
      }

      setSelectedSessionIds([]);
      setShowBulkDeleteModal(false);
      setBulkDeleteAnalysis(null);
    } catch (error) {
      showToast('Грешка при масова операция', 'error');
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
      targetGroups: [],
      ageGroups: trainingLabels.ageGroups.length > 0 ? trainingLabels.ageGroups.map(g => g.label) : ['4-6', '7-12', '13+'],
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
      targetGroups: [],
      ageGroups: trainingLabels.ageGroups.length > 0 ? trainingLabels.ageGroups.map(g => g.label) : ['4-6', '7-12', '13+'],
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

      if (activeTab === 'upcoming') {
        // Show from today onwards (up to viewEndDate)
        if (isBefore(sessionDate, today) || isBefore(viewEndDate, sessionDate)) {
          return false;
        }
      } else {
        // Show past sessions (before today)
        if (!isBefore(sessionDate, today)) {
          return false;
        }
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

      // Apply target groups filter
      if (selectedTargetGroups.length > 0) {
        if (!session.targetGroups || session.targetGroups.length === 0) {
          return false;
        }
        // Check if session has at least one of the selected target groups
        const hasMatchingGroup = selectedTargetGroups.some(group =>
          session.targetGroups.includes(group)
        );
        if (!hasMatchingGroup) {
          return false;
        }
      }

      // Apply age groups filter
      if (selectedAgeGroups.length > 0) {
        if (!session.ageGroups || session.ageGroups.length === 0) {
          return false;
        }
        // Check if session has at least one of the selected age groups
        const hasMatchingAgeGroup = selectedAgeGroups.some(ageGroup =>
          session.ageGroups.includes(ageGroup)
        );
        if (!hasMatchingAgeGroup) {
          return false;
        }
      }

      return true;
    });

  };

  const groupSessionsByDay = () => {
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);

    const filteredSessions = getFilteredSessions();

    const grouped = {};

    // For upcoming sessions, we want to show all days in range even if empty
    // For past sessions, we only want to show days that have sessions
    if (activeTab === 'upcoming') {
      const days = eachDayOfInterval({ start: today, end: viewEndDate });
      days.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        grouped[dayKey] = {
          date: day,
          sessions: []
        };
      });
    } else {
      // Initialize groups only for days present in filtered sessions for past tab
      filteredSessions.forEach(session => {
        const sessionDate = new Date(session.date);
        const dayKey = format(sessionDate, 'yyyy-MM-dd');
        if (!grouped[dayKey]) {
          grouped[dayKey] = {
            date: startOfDay(sessionDate),
            sessions: []
          };
        }
      });
    }


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

    // If past tab, we might want to sort days descending (newest first)? 
    // Usually lists iterate over Object.entries/keys which ends up being insertion order or key order.
    // We will rely on the consumer of this function to sort the days if needed, 
    // but SessionList iterates Object.entries which isn't guaranteed order.
    // However, JS engines usually iterate integer-like keys in order, and string keys in insertion order.
    // To be safe, let's leave as is, and SessionList usually iterates.
    // Wait, typical schedule view is chronological. Even for past, usually you scroll down to see history?
    // User requested "Past" tab. Usually "History" is Newest -> Oldest. "Upcoming" is Soonest -> Latest.
    // I will verify this behavior in UI.


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
      // Single select - replace current selection or deselect if same value
      setSelectedTitles(prev =>
        prev.includes(value)
          ? [] // Deselect if same value clicked
          : [value] // Replace with new selection (single select)
      );
    } else if (filterType === 'targetGroup') {
      setSelectedTargetGroups(prev =>
        prev.includes(value)
          ? prev.filter(t => t !== value)
          : [...prev, value]
      );
    } else if (filterType === 'ageGroup') {
      setSelectedAgeGroups(prev =>
        prev.includes(value)
          ? prev.filter(a => a !== value)
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
    } else if (filterType === 'targetGroup') {
      const allTargetGroups = trainingLabels.targetGroups.map(g => g.slug);
      setSelectedTargetGroups(allTargetGroups);
    } else if (filterType === 'ageGroup') {
      const allAgeGroups = trainingLabels.ageGroups.map(g => g.label);
      setSelectedAgeGroups(allAgeGroups);
    }
  };

  const clearAllFilters = () => {
    setSelectedDays([]);
    setSelectedTimes([]);
    setSelectedTitles([]);
    setSelectedTargetGroups([]);
    setSelectedAgeGroups([]);
  };

  const hasActiveFilters = () => {
    return selectedDays.length > 0 || selectedTimes.length > 0 || selectedTitles.length > 0 || selectedTargetGroups.length > 0 || selectedAgeGroups.length > 0;
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
    return <ClimbingLoader text="Зареждане..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">График</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`
               whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
               ${activeTab === 'upcoming'
                ? 'border-orange-brand text-orange-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
             `}
          >
            Предстоящи
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`
               whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
               ${activeTab === 'past'
                ? 'border-orange-brand text-orange-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
             `}
          >
            Минали
          </button>
        </nav>
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
                        ageGroups: trainingLabels.ageGroups.length > 0 ? trainingLabels.ageGroups.map(g => g.label) : ['4-6', '7-12', '13+'],
                      });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${!isBulkMode
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
                        ageGroups: trainingLabels.ageGroups.length > 0 ? trainingLabels.ageGroups.map(g => g.label) : ['4-6', '7-12', '13+'],
                      });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isBulkMode
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
                        className={`px-3 py-1 rounded ${bulkFormData.daysOfWeek.includes(day)
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

                {trainingLabels.targetGroups.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Подходящо за
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {trainingLabels.targetGroups.map((group) => (
                        <button
                          key={group.slug}
                          type="button"
                          onClick={() => {
                            setBulkFormData({
                              ...bulkFormData,
                              targetGroups: bulkFormData.targetGroups.includes(group.slug)
                                ? bulkFormData.targetGroups.filter(g => g !== group.slug)
                                : [...bulkFormData.targetGroups, group.slug],
                            });
                          }}
                          className={`px-3 py-1 rounded text-sm font-normal transition-colors border ${bulkFormData.targetGroups.includes(group.slug)
                            ? 'text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          style={{
                            backgroundColor: bulkFormData.targetGroups.includes(group.slug) ? (group.color || '#3b82f6') : undefined,
                            borderColor: !bulkFormData.targetGroups.includes(group.slug) ? undefined : 'transparent'
                          }}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {trainingLabels.ageGroups.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Години
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {trainingLabels.ageGroups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setBulkFormData({
                              ...bulkFormData,
                              ageGroups: bulkFormData.ageGroups.includes(group.label)
                                ? bulkFormData.ageGroups.filter(a => a !== group.label)
                                : [...bulkFormData.ageGroups, group.label],
                            });
                          }}
                          className={`px-3 py-1 rounded text-sm font-normal transition-colors ${bulkFormData.ageGroups.includes(group.label)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

                {trainingLabels.targetGroups.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Подходящо за
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {trainingLabels.targetGroups.map((group) => (
                        <button
                          key={group.slug}
                          type="button"
                          onClick={() => toggleTargetGroup(group.slug)}
                          className={`px-3 py-1 rounded text-sm font-normal transition-colors border ${formData.targetGroups.includes(group.slug)
                            ? 'text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          style={{
                            backgroundColor: formData.targetGroups.includes(group.slug) ? (group.color || '#3b82f6') : undefined,
                            borderColor: !formData.targetGroups.includes(group.slug) ? undefined : 'transparent'
                          }}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {trainingLabels.ageGroups.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Години
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {trainingLabels.ageGroups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => toggleAgeGroup(group.label)}
                          className={`px-3 py-1 rounded text-sm font-normal transition-colors ${formData.ageGroups.includes(group.label)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

      {/* Duplicate Configuration Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Дублиране на тренировки</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Избрани са {selectedSessionIds.length} тренировки. Моля, изберете начална дата за новите сесии.
            </p>

            <div className="mb-4">
              <Input
                label="Начална дата (за първия ден от селекцията)"
                type="date"
                value={duplicateConfig.targetDate}
                onChange={(e) => setDuplicateConfig({ ...duplicateConfig, targetDate: e.target.value })}
                required
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = new Date(duplicateConfig.targetDate || new Date());
                    setDuplicateConfig({
                      ...duplicateConfig,
                      targetDate: format(addDays(current, 7), 'yyyy-MM-dd')
                    });
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  +1 Седмица
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = new Date(duplicateConfig.targetDate || new Date());
                    setDuplicateConfig({
                      ...duplicateConfig,
                      targetDate: format(addDays(current, 28), 'yyyy-MM-dd')
                    });
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  +4 Седмици
                </button>
              </div>
            </div>

            {/* Option to use Repeats or End Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Начин на дублиране
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={!duplicateConfig.useEndDate}
                    onChange={() => setDuplicateConfig({ ...duplicateConfig, useEndDate: false })}
                    className="mr-2"
                  />
                  <span className="text-sm">Брой повторения</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={duplicateConfig.useEndDate}
                    onChange={() => setDuplicateConfig({ ...duplicateConfig, useEndDate: true })}
                    className="mr-2"
                  />
                  <span className="text-sm">До крайна дата</span>
                </label>
              </div>
            </div>

            {!duplicateConfig.useEndDate ? (
              <div className="mb-6">
                <Input
                  label="Брой повторения (седмици)"
                  type="number"
                  min="1"
                  max="52"
                  value={duplicateConfig.repeats}
                  onChange={(e) => setDuplicateConfig({ ...duplicateConfig, repeats: parseInt(e.target.value) || 1 })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Пример: 1 = само веднъж на посочената дата. 4 = повтаря се 4 седмици подред.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <Input
                  label="Крайна дата"
                  type="date"
                  value={duplicateConfig.endDate}
                  onChange={(e) => setDuplicateConfig({ ...duplicateConfig, endDate: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Тренировките ще се дублират за всяка седмица между началната и крайната дата, като се запазват дните от седмицата.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full sm:w-auto"
              >
                Отказ
              </Button>
              <Button
                variant="primary"
                onClick={handleDuplicatePreview}
                className="w-full sm:w-auto"
              >
                Преглед
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Duplicate Preview Modal */}
      {showDuplicatePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4">Преглед на дублираните тренировки</h2>
            <p className="text-gray-600 mb-4 text-sm">
              {duplicatePreview.length} тренировки ще бъдат създадени:
            </p>

            <div className="overflow-y-auto flex-1 mb-4">
              <div className="space-y-2">
                {duplicatePreview.map((session, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="font-medium">{session.title}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(session.date), 'dd.MM.yyyy HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end border-t pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDuplicatePreview(false);
                  setShowDuplicateModal(true); // Go back to config
                }}
                className="w-full sm:w-auto"
              >
                Назад
              </Button>
              <Button
                variant="primary"
                onClick={confirmDuplicate}
                className="w-full sm:w-auto"
              >
                Потвърди създаването ({duplicatePreview.length})
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Confirmation Modal */}
      {
        showPreviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Преглед на тренировките за създаване</h2>
              <p className="text-gray-600 mb-4">
                Избрани <strong>{selectedSessions.size}</strong> от <strong>{previewSessions.length}</strong> тренировки:
              </p>
              <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                {previewSessions.map((session, index) => (
                  <div key={index} className={`p-3 rounded border ${selectedSessions.has(index)
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
        )
      }

      {/* Delete/Cancel Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSessionToDelete(null);
          setDeleteType(null);
          setDeleteRelatedData(null);
        }}
        onConfirm={confirmDeleteSession}
        title={deleteType === 'cancel' ? 'Отказване на тренировка' : 'Изтриване на тренировка'}
        message={
          deleteType === 'cancel'
            ? 'Сигурни ли сте, че искате да откажете тази тренировка? Тя ще бъде скрита от графика.'
            : deleteRelatedData && deleteRelatedData.bookings && deleteRelatedData.bookings.total > 0
              ? `Внимание! Тази тренировка има ${deleteRelatedData.bookings.total} резервации, които също ще бъдат изтрити. Сигурни ли сте?`
              : 'Сигурни ли сте, че искате да изтриете завинаги тази тренировка от базата данни?'
        }
        confirmText={isDeleting ? (deleteType === 'cancel' ? 'Отказване...' : 'Изтриване...') : (deleteType === 'cancel' ? 'Потвърди отказване' : 'Потвърди изтриване')}
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
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-xl w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Изтриване на {selectedSessionIds.length} тренировки
            </h2>

            <div className="mb-6 space-y-4">
              {/* Analysis Summary */}
              {bulkDeleteAnalysis && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                  <p className="font-medium mb-2">Анализ на избраните тренировки:</p>

                  {bulkDeleteAnalysis.withAttendance > 0 && (
                    <div className="flex items-start gap-2 text-red-600 mb-2">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <strong>{bulkDeleteAnalysis.withAttendance}</strong> тренировки имат записани посещения.
                        <p className="text-xs text-red-500 mt-1">
                          Тези тренировки НЕ могат да бъдат изтрити напълно, за да се запази историята.
                          Можете само да ги "Откажете".
                        </p>
                      </div>
                    </div>
                  )}

                  {bulkDeleteAnalysis.withBookings > 0 && (
                    <div className="flex items-start gap-2 text-orange-600 mb-2">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <strong>{bulkDeleteAnalysis.withBookings}</strong> тренировки имат резервации (без посещения).
                        <p className="text-xs text-orange-500 mt-1">
                          Ако ги изтриете напълно, резервациите също ще бъдат изтрити!
                        </p>
                      </div>
                    </div>
                  )}

                  {bulkDeleteAnalysis.safeToDelete > 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <span className="text-lg">✓</span>
                      <span>
                        <strong>{bulkDeleteAnalysis.safeToDelete}</strong> тренировки са чисти и могат да бъдат изтрити безопасно.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-gray-600">
                Моля изберете действие:
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Option 1: Cancel (Soft Delete) - Always Available */}
              <button
                onClick={() => confirmBulkDelete('cancel')}
                disabled={isDeleting}
                className="w-full flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-gray-900">Откажи тренировките</span>
                  <span className="text-sm text-gray-500">Скрива ги от графика, но запазва историята.</span>
                </div>
                {isDeleting ? <span className="text-sm text-gray-500">Processing...</span> : <span className="text-blue-600">Препоръчително</span>}
              </button>

              {/* Option 2: Delete (Hard Delete) - Conditionally Available */}
              <button
                onClick={() => confirmBulkDelete('delete')}
                disabled={isDeleting || (bulkDeleteAnalysis && bulkDeleteAnalysis.withAttendance > 0)}
                className={`w-full flex items-center justify-between p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${(bulkDeleteAnalysis && bulkDeleteAnalysis.withAttendance > 0)
                  ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                  : 'border-red-200 hover:bg-red-50'
                  }`}
              >
                <div className="flex flex-col items-start">
                  <span className={`font-medium ${bulkDeleteAnalysis?.withAttendance > 0 ? 'text-gray-400' : 'text-red-700'}`}>
                    Изтрий завинаги
                  </span>
                  <span className="text-sm text-gray-400">
                    {bulkDeleteAnalysis?.withAttendance > 0
                      ? 'Недостъпно (има посещения)'
                      : 'Премахва всичко от базата данни. Няма връщане назад!'}
                  </span>
                </div>
              </button>

              <div className="mt-2 text-center">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2"
                >
                  Затвори прозореца
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Session Modal */}
      {
        showEditModal && editingSession && (
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

                {trainingLabels.targetGroups.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Подходящо за
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {trainingLabels.targetGroups.map((group) => (
                        <button
                          key={group.slug}
                          type="button"
                          onClick={() => toggleTargetGroup(group.slug)}
                          className={`px-3 py-1 rounded text-sm font-normal transition-colors border ${formData.targetGroups.includes(group.slug)
                            ? 'text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          style={{
                            backgroundColor: formData.targetGroups.includes(group.slug) ? (group.color || '#3b82f6') : undefined,
                            borderColor: !formData.targetGroups.includes(group.slug) ? undefined : 'transparent'
                          }}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {trainingLabels.ageGroups.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Години
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {trainingLabels.ageGroups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => toggleAgeGroup(group.label)}
                          className={`px-3 py-1 rounded text-sm font-normal transition-colors ${formData.ageGroups.includes(group.label)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
        )
      }

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Редактиране на {selectedSessionIds.length} тренировки</h2>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">
              Промените ще бъдат приложени за всички избрани тренировки.
              Полетата с "Различни стойности" няма да бъдат променени, освен ако не въведете нова стойност.
            </p>

            <form onSubmit={confirmBulkEdit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заглавие
                </label>
                <input
                  type="text"
                  list="session-titles-bulk-edit"
                  value={bulkEditData.title}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
                      ${initialBulkValues.title === 'MIXED' && !bulkEditData.title ? 'border-orange-300 bg-orange-50 placeholder-orange-400' : 'border-gray-300'}
                    `}
                  placeholder={initialBulkValues.title === 'MIXED' ? "Различни стойности (оставете празно за без промяна)" : "Заглавие"}
                />
                <datalist id="session-titles-bulk-edit">
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
                  value={bulkEditData.description}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md
                      ${initialBulkValues.description === 'MIXED' && !bulkEditData.description ? 'border-orange-300 bg-orange-50 placeholder-orange-400' : 'border-gray-300'}
                    `}
                  placeholder={initialBulkValues.description === 'MIXED' ? "Различни стойности (оставете празно за без промяна)" : "Описание"}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Продължителност (минути)"
                  type="number"
                  value={bulkEditData.durationMinutes}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, durationMinutes: e.target.value })}
                  min={1}
                  placeholder={initialBulkValues.durationMinutes === 'MIXED' ? "Различни" : ""}
                  className={initialBulkValues.durationMinutes === 'MIXED' && !bulkEditData.durationMinutes ? 'border-orange-300 bg-orange-50 placeholder-orange-400' : ''}
                />
                <Input
                  label="Капацитет"
                  type="number"
                  value={bulkEditData.capacity}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, capacity: e.target.value })}
                  min={1}
                  placeholder={initialBulkValues.capacity === 'MIXED' ? "Различни" : ""}
                  className={initialBulkValues.capacity === 'MIXED' && !bulkEditData.capacity ? 'border-orange-300 bg-orange-50 placeholder-orange-400' : ''}
                />
              </div>

              {trainingLabels.targetGroups.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подходящо за {initialBulkValues.targetGroups === 'MIXED' && <span className="text-orange-500 text-xs font-normal">(Различни стойности)</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {trainingLabels.targetGroups.map((group) => (
                      <button
                        key={group.slug}
                        type="button"
                        onClick={() => {
                          setBulkEditData(prev => ({
                            ...prev,
                            targetGroups: prev.targetGroups.includes(group.slug)
                              ? prev.targetGroups.filter(g => g !== group.slug)
                              : [...prev.targetGroups, group.slug]
                          }));
                        }}
                        className={`px-3 py-1 rounded text-sm font-normal transition-colors border ${bulkEditData.targetGroups.includes(group.slug)
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        style={{
                          backgroundColor: bulkEditData.targetGroups.includes(group.slug) ? (group.color || '#3b82f6') : undefined,
                          borderColor: !bulkEditData.targetGroups.includes(group.slug) ? undefined : 'transparent'
                        }}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {trainingLabels.ageGroups.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Години {initialBulkValues.ageGroups === 'MIXED' && <span className="text-orange-500 text-xs font-normal">(Различни стойности)</span>}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {trainingLabels.ageGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setBulkEditData(prev => ({
                            ...prev,
                            ageGroups: prev.ageGroups.includes(group.label)
                              ? prev.ageGroups.filter(a => a !== group.label)
                              : [...prev.ageGroups, group.label]
                          }));
                        }}
                        className={`px-3 py-1 rounded text-sm font-normal transition-colors ${bulkEditData.ageGroups.includes(group.label)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Треньори {initialBulkValues.coachIds === 'MIXED' && <span className="text-orange-500 text-xs font-normal">(Различни стойности)</span>}
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                  {coaches.length === 0 ? (
                    <p className="text-sm text-gray-500">Няма налични треньори.</p>
                  ) : (
                    coaches.map((coach) => (
                      <label key={coach.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={bulkEditData.coachIds.includes(coach.id)}
                          onChange={() => {
                            setBulkEditData(prev => ({
                              ...prev,
                              coachIds: prev.coachIds.includes(coach.id)
                                ? prev.coachIds.filter(id => id !== coach.id)
                                : [...prev.coachIds, coach.id]
                            }));
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {coach.firstName ? `${coach.firstName} ${coach.lastName}` : coach.name || coach.email}
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
                  onClick={() => setShowBulkEditModal(false)}
                  className="w-full sm:w-auto"
                >
                  Отказ
                </Button>
                <Button type="submit" variant="primary" className="w-full sm:w-auto">
                  Запази промените
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
        selectedTargetGroups={selectedTargetGroups}
        selectedAgeGroups={selectedAgeGroups}
        getUniqueTimes={getUniqueTimes}
        getUniqueTitles={getUniqueTitles}
        toggleFilter={toggleFilter}
        clearAllFilters={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
        trainingLabels={trainingLabels}
      />

      {/* Bulk Actions - с запазено място */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="h-[32px] flex items-center gap-3">
          <button
            type="button"
            onClick={selectAllFilteredSessions}
            className="text-xs md:text-base text-[#ff6900] leading-6 hover:opacity-80 transition-opacity"
          >
            Маркирай всички тренировки
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

      {/* Bulk Action Bar */}
      {selectedSessionIds.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm sticky top-4 z-10">
          <span className="text-sm font-medium text-gray-700">
            Избрани: {selectedSessionIds.length}
          </span>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Button
              onClick={handleDuplicateClick}
              variant="outline"
              className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Дублирай
            </Button>
            <Button
              onClick={handleBulkEditClick}
              variant="primary"
              className="flex-1 sm:flex-none"
            >
              Редактирай
            </Button>
            <Button
              onClick={handleBulkDeleteClick}
              disabled={isDeleting}
              variant="outline"
              className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              Details
            </Button>
          </div>
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
        onCancel={handleCancelClick}
        onDelete={handleDeleteClick}
        showToast={showToast}
        sortOrder={activeTab === 'past' ? 'desc' : 'asc'}
        trainingLabels={trainingLabels}
      />



      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div >
  );
};

export default Sessions;
