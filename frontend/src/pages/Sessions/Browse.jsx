import { useState, useEffect } from 'react';
import { sessionsAPI, bookingsAPI, parentClimbersAPI, myClimberAPI, settingsAPI } from '../../services/api';
import { format, addDays, startOfDay, eachDayOfInterval, isBefore } from 'date-fns';
import { formatDate } from '../../utils/dateUtils';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import ClimbingLoader from '../../components/UI/ClimbingLoader';
import { useToast } from '../../components/UI/Toast';

import { useAuth } from '../../context/AuthContext';
import LoginModal from '../../components/UI/LoginModal';
import BookingModal from '../../components/UI/BookingModal';
import SessionFilters from '../../components/Sessions/SessionFilters';
import SessionList from '../../components/Sessions/SessionList';
import { getUserFullName, getUserDisplayName } from '../../utils/userUtils';
import ScrollToTop from '../../components/UI/ScrollToTop';
import PWAInstallButton from '../../components/UI/PWAInstallButton';
import useCancelBooking from '../../hooks/useCancelBooking';
import CancellationModal from '../../components/Booking/CancellationModal';
import AddChildModal from '../../components/Modals/AddChildModal';

const Sessions = () => {
  const { isAuthenticated, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysToShow] = useState(30); // Booking horizon - 30 days
  const { showToast } = useToast();

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState(null);

  // Booking state
  const [children, setChildren] = useState([]);
  const [selfClimber, setSelfClimber] = useState(null);
  const [selectedClimberForSession, setSelectedClimberForSession] = useState({});
  const [userBookings, setUserBookings] = useState([]);
  const [defaultSelectedClimberIds, setDefaultSelectedClimberIds] = useState([]);

  // Unified booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSessionIds, setBookingSessionIds] = useState([]);
  const [bookingSessions, setBookingSessions] = useState([]);
  const [bookingDefaultClimberIds, setBookingDefaultClimberIds] = useState([]);

  // Bulk booking state
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [bulkBookingClimberIds, setBulkBookingClimberIds] = useState([]);
  const [isBulkBooking, setIsBulkBooking] = useState(false);

  // Cancel booking state
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [cancelBookingSessionId, setCancelBookingSessionId] = useState(null);
  const [cancelBookingBookings, setCancelBookingBookings] = useState([]);

  // Use shared cancellation hook
  const { cancelError, isCancelling, cancelBookings, resetError } = useCancelBooking({
    showToast,
    onSuccess: (results) => {
      // Update local state for successful cancellations
      setUserBookings(prev => prev.map(booking =>
        results.successful.includes(booking._id)
          ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
          : booking
      ));

      // Update session booked counts
      setSessions(prev => prev.map(s => {
        if (s._id === cancelBookingSessionId) {
          return {
            ...s,
            bookedCount: Math.max(0, (s.bookedCount || 0) - results.successful.length)
          };
        }
        return s;
      }));

      // Close modal on full success
      setShowCancelBookingModal(false);
      setCancelBookingSessionId(null);
      setCancelBookingBookings([]);
    },
    onPartialSuccess: (results) => {
      // Update for successful ones
      setUserBookings(prev => prev.map(booking =>
        results.successful.includes(booking._id)
          ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
          : booking
      ));

      // Remove successful from modal list
      setCancelBookingBookings(prev => prev.filter(b =>
        !results.successful.includes(b.bookingId || b._id)
      ));

      // Update session counts
      setSessions(prev => prev.map(s => {
        if (s._id === cancelBookingSessionId) {
          return {
            ...s,
            bookedCount: Math.max(0, (s.bookedCount || 0) - results.successful.length)
          };
        }
        return s;
      }));

      // Keep modal open to show errors
    },
  });

  // Add child modal state
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [bookingModalRefreshTrigger, setBookingModalRefreshTrigger] = useState(0);

  // Handler for adding child from BookingModal
  const handleAddChildFromBooking = () => {
    setShowAddChildModal(true);
  };

  // Handler for successful child addition - refresh climbers in BookingModal
  const handleAddChildSuccess = async () => {
    await fetchUserData();
    // Trigger refresh in BookingModal by incrementing refreshTrigger
    setBookingModalRefreshTrigger(prev => prev + 1);
    // Close AddChildModal but keep BookingModal open
    setShowAddChildModal(false);
  };

  // Sticky button state for mobile
  const [isSticky, setIsSticky] = useState(false);

  // Filter states
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [selectedTargetGroups, setSelectedTargetGroups] = useState([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState([]);

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

  // Save filters utility functions
  const getSavedFiltersKey = () => {
    if (!user?.id) return null;
    return `wonderclimb-saved-filters-${user.id}`;
  };

  const saveFilters = () => {
    if (!user?.id) return;

    const filtersToSave = {
      selectedDays,
      selectedTimes,
      selectedTitles,
      selectedTargetGroups,
      selectedAgeGroups,
      defaultSelectedClimberIds: defaultSelectedClimberIds.map(id =>
        typeof id === 'object' && id?.toString ? id.toString() : String(id)
      ),
    };

    const key = getSavedFiltersKey();
    if (key) {
      localStorage.setItem(key, JSON.stringify(filtersToSave));
      showToast('Филтрите са запазени успешно', 'success');
    }
  };

  const loadSavedFilters = () => {
    if (!user?.id) return;

    const key = getSavedFiltersKey();
    if (!key) return;

    try {
      const savedFilters = localStorage.getItem(key);
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);

        if (filters.selectedDays) setSelectedDays(filters.selectedDays);
        if (filters.selectedTimes) setSelectedTimes(filters.selectedTimes);
        if (filters.selectedTitles) setSelectedTitles(filters.selectedTitles);
        if (filters.selectedTargetGroups) setSelectedTargetGroups(filters.selectedTargetGroups);
        if (filters.selectedAgeGroups) setSelectedAgeGroups(filters.selectedAgeGroups);
        if (filters.defaultSelectedClimberIds) {
          // Convert string IDs back to proper format
          setDefaultSelectedClimberIds(filters.defaultSelectedClimberIds);
        }
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

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
          return;
        }
        // Invalid cache, remove it
        localStorage.removeItem(CACHE_KEY);
      }

      // Fetch from API only if cache is missing or invalid
      const response = await settingsAPI.getSettings();
      const loadedSettings = response.data.settings || {};
      const labels = {
        targetGroups: loadedSettings.trainingLabels?.targetGroups || [],
        ageGroups: loadedSettings.trainingLabels?.ageGroups || [],
        visibility: {
          targetGroups: loadedSettings.trainingLabels?.visibility?.targetGroups ?? true,
          ageGroups: loadedSettings.trainingLabels?.visibility?.ageGroups ?? true,
          days: loadedSettings.trainingLabels?.visibility?.days ?? true,
          times: loadedSettings.trainingLabels?.visibility?.times ?? true,
          titles: loadedSettings.trainingLabels?.visibility?.titles ?? true,
          reservations: loadedSettings.trainingLabels?.visibility?.reservations ?? true,
        }
      };
      setTrainingLabels(labels);

      // Save to cache (no timestamp needed - invalidated only when settings are saved)
      localStorage.setItem(CACHE_KEY, JSON.stringify(labels));
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchSettings();
  }, []);

  // Load saved filters when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSavedFilters();
    }
  }, [isAuthenticated, user?.id]);

  // Fetch children and self climber when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserData();
    }
  }, [isAuthenticated, user]);

  // Close login modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user && showLoginModal) {
      setShowLoginModal(false);
      // If there was a pending session, try to book it after user data is loaded
      if (pendingSessionId) {
        const sessionId = pendingSessionId;
        setPendingSessionId(null);
        // Wait a bit for user data to be fetched, then try booking
        setTimeout(() => {
          handleBookClick(sessionId);
        }, 500);
      }
    }
  }, [isAuthenticated, user, showLoginModal]);


  // Mobile sticky button is always sticky - no scroll tracking needed
  useEffect(() => {
    // Set sticky to true for mobile, false for desktop
    const handleResize = () => {
      setIsSticky(window.innerWidth < 768);
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fetchUserBookings = async () => {
    try {
      const response = await bookingsAPI.getMyBookings();
      setUserBookings(response.data?.bookings || []);
    } catch (error) {
      // User might not have bookings - this is OK
      if (error.response?.status !== 404 && error.response?.status !== 403) {
        console.error('Error fetching user bookings:', error);
      }
      setUserBookings([]);
    }
  };

  const fetchUserData = async () => {
    try {
      const userRoles = user?.roles || [];

      // Fetch linked children if user has admin or climber role
      // Climbers can have children linked to them
      if (userRoles.includes('admin') || userRoles.includes('climber')) {
        try {
          const childrenRes = await parentClimbersAPI.getAll();
          // Filter by accountStatus - show active children or children without accountStatus (treat as active)
          const allClimbers = childrenRes.data.climbers || [];
          const filteredChildren = allClimbers.filter(c =>
            c.accountStatus === 'active' || c.accountStatus === null || c.accountStatus === undefined
          );
          setChildren(filteredChildren);
        } catch (error) {
          // User might not have access or no children - this is OK
          if (error.response?.status !== 404 && error.response?.status !== 403) {
            console.error('Error fetching children:', error);
          }
        }
      }

      // Fetch self climber profile if user has climber role
      if (userRoles.includes('climber')) {
        try {
          const selfRes = await myClimberAPI.getProfile();
          if (selfRes.data?.climber) {
            setSelfClimber(selfRes.data.climber);
          }
        } catch (error) {
          // User might not have climber role or profile not found - this is OK
          if (error.response?.status !== 404 && error.response?.status !== 403) {
            console.error('Error fetching self climber profile:', error);
          }
        }
      }

      // Fetch user bookings
      await fetchUserBookings();
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const today = startOfDay(new Date());
      const endDate = addDays(today, daysToShow);

      const response = await sessionsAPI.getAvailable({
        startDate: today.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Filter out competitions - only show training sessions
      const allSessions = response.data.sessions || [];
      const trainingSessions = allSessions.filter(session => session.type !== 'competition');
      setSessions(trainingSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showToast(
        error.response?.data?.error?.message || 'Грешка при зареждане на сесии',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (sessionId) => {
    if (!isAuthenticated) {
      setPendingSessionId(sessionId);
      setShowLoginModal(true);
      return;
    }

    // Find the session object
    const session = sessions.find(s => {
      const sId = typeof s._id === 'object' && s._id?.toString ? s._id.toString() : String(s._id);
      const targetId = typeof sessionId === 'object' && sessionId?.toString ? sessionId.toString() : String(sessionId);
      return sId === targetId;
    });

    // Set up booking modal with single session
    // Use default selected climbers from "Тренировка за:" filter
    setBookingSessionIds([sessionId]);
    setBookingSessions(session ? [session] : []);
    setBookingDefaultClimberIds(defaultSelectedClimberIds);
    setShowBookingModal(true);
  };

  // OLD FUNCTIONS REMOVED - Now using unified BookingModal

  // Keep bookSession for backward compatibility if needed elsewhere, but it's not used for booking modals anymore
  const bookSession = async (sessionId, climberIds = null) => {
    try {
      setBookingLoading(true);

      const userRoles = user?.roles || [];
      const hasAdminRole = userRoles.includes('admin');
      const hasClimberRole = userRoles.includes('climber');

      let bookingData;

      if ((hasClimberRole || hasAdminRole) && climberIds && climberIds.length > 0) {
        // Booking for children
        bookingData = {
          sessionId,
          climberIds,
        };
      } else {
        // Climber booking for themselves (API will use their own ID)
        bookingData = {
          sessionId,
        };
      }

      const response = await bookingsAPI.create(bookingData);

      // Show success message
      if (response.data?.summary) {
        const { successful, failed } = response.data.summary;
        if (successful && successful.length > 0) {
          const successNames = successful.map(s => s.climberName).join(', ');
          showToast(`Успешно резервирано за: ${successNames}`, 'success');

          // Optimistically update session booked count
          setSessions(prev => prev.map(s => {
            if (s._id === sessionId) {
              return {
                ...s,
                bookedCount: (s.bookedCount || 0) + successful.length
              };
            }
            return s;
          }));
        }
        if (failed && failed.length > 0) {
          // Show individual error messages for each failed booking
          failed.forEach(f => {
            const reason = f.reason || f.error || 'Грешка при резервиране';
            showToast(`${f.climberName}: ${reason}`, 'error');
          });
        }
      } else {
        showToast('Сесията е резервирана успешно', 'success');

        // Optimistically update session booked count
        setSessions(prev => prev.map(s => {
          if (s._id === sessionId) {
            return {
              ...s,
              bookedCount: (s.bookedCount || 0) + 1
            };
          }
          return s;
        }));
      }

      // Refresh user bookings to show reservation info
      if (isAuthenticated) {
        await fetchUserBookings();
      }

      // Close modal
      setShowBookingModal(false);
      setSelectedSessionId(null);
      setSelectedClimberIds([]);
    } catch (error) {
      showToast(
        error.response?.data?.error?.message || 'Грешка при резервиране на сесия',
        'error'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBookingModalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSessionId) return;

    if (selectedClimberIds.length === 0) {
      showToast('Моля, изберете поне един катерач', 'error');
      return;
    }

    // Filter out 'self' from climber IDs
    const climberIds = selectedClimberIds.filter(id => {
      const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
      return idStr !== 'self';
    });
    const hasSelf = selectedClimberIds.some(id => {
      const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
      return idStr === 'self';
    });

    // Save selected climber for this session (use first selected if multiple)
    if (climberIds.length > 0) {
      setSelectedClimberForSession({
        ...selectedClimberForSession,
        [selectedSessionId]: climberIds[0]
      });
    }

    // Close selection modal and show confirmation
    setShowBookingModal(false);
    setPendingBookingSessionId(selectedSessionId);
    setPendingBookingClimberIds(climberIds.length > 0 ? climberIds : (hasSelf ? null : climberIds));
    setSelectedClimberIds([]);
    setShowSingleBookingConfirmation(true);
  };

  const toggleClimberSelection = (climberId) => {
    setSelectedClimberIds(prev =>
      prev.includes(climberId)
        ? prev.filter(id => id !== climberId)
        : [...prev, climberId]
    );
  };

  // Bulk booking functions
  const toggleSessionSelection = (sessionId) => {
    if (!isAuthenticated) {
      setPendingSessionId(sessionId);
      setShowLoginModal(true);
      return;
    }
    setSelectedSessionIds(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const selectAllFilteredSessions = () => {
    const filtered = getFilteredSessions();
    const availableSessionIds = filtered
      .filter(session => {
        const bookedCount = session.bookedCount || 0;
        return bookedCount < session.capacity && session.status === 'active';
      })
      .map(session => session._id);
    setSelectedSessionIds(availableSessionIds);
  };

  const clearAllSelectedSessions = () => {
    setSelectedSessionIds([]);
  };

  const toggleBulkClimberSelection = (climberId) => {
    const normalizedId = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);
    setBulkBookingClimberIds(prev => {
      const currentIds = (prev || []).map(id =>
        typeof id === 'object' && id?.toString ? id.toString() : String(id)
      );
      const isSelected = currentIds.includes(normalizedId);
      if (isSelected) {
        return prev.filter(id => {
          const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
          return idStr !== normalizedId;
        });
      } else {
        return [...(prev || []), climberId];
      }
    });
  };

  const handleBulkBook = () => {
    if (selectedSessionIds.length === 0) {
      showToast('Моля, изберете поне една тренировка', 'error');
      return;
    }

    // Find session objects for selected IDs
    const selectedSessions = sessions.filter(s => {
      const sId = typeof s._id === 'object' && s._id?.toString ? s._id.toString() : String(s._id);
      return selectedSessionIds.some(id => {
        const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
        return sId === idStr;
      });
    });

    // Set up booking modal with multiple sessions
    setBookingSessionIds(selectedSessionIds);
    setBookingSessions(selectedSessions);
    // Use default selected climbers from "Тренировка за:" filter
    setBookingDefaultClimberIds(defaultSelectedClimberIds);
    setShowBookingModal(true);
  };

  // OLD confirmBulkBooking REMOVED - Now using unified BookingModal



  const handleLoginSuccess = () => {
    // After successful login, stay on the same page
    // The user can proceed with booking by clicking the button again
    // The modal will close automatically, and user stays on /sessions page
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setPendingSessionId(null);
  };

  // Get unique session titles
  const getUniqueTitles = () => {
    const titles = sessions
      .filter(s => s.type !== 'competition')
      .map(s => s.title)
      .filter((title, index, self) => title && self.indexOf(title) === index)
      .sort();
    return titles;
  };

  // Get unique times
  const getUniqueTimes = () => {
    const times = sessions
      .filter(session => session.type !== 'competition')
      .map(session => format(new Date(session.date), 'HH:mm'));
    return [...new Set(times)].sort();
  };

  const getFilteredSessions = () => {
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);

    return sessions.filter(session => {
      // Filter out competitions
      if (session.type === 'competition') {
        return false;
      }

      // Filter out cancelled sessions
      if (session.status === 'cancelled') {
        return false;
      }

      const sessionDate = new Date(session.date);
      const sessionDay = sessionDate.getDay();
      const sessionTime = format(sessionDate, 'HH:mm');
      const sessionTitle = session.title;

      // Only show sessions within the date range
      if (isBefore(sessionDate, today) || isBefore(viewEndDate, sessionDate)) {
        return false;
      }

      // Apply day filter
      if (selectedDays.length > 0 && !selectedDays.includes(sessionDay)) {
        return false;
      }

      // Apply time filter
      if (selectedTimes.length > 0 && !selectedTimes.includes(sessionTime)) {
        return false;
      }

      // Apply title filter
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

  const getBookedCount = (sessionId) => {
    const session = sessions.find(s => s._id === sessionId);
    if (session?.bookedCount !== undefined) {
      return session.bookedCount;
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <ClimbingLoader text="Зареждане..." />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-content">
      {/* Header Section */}
      <div className="mb-2 lg:mb-4">
        <h1 className="text-2xl font-normal text-[#0f172b] mb-2 lg:mb-4 leading-9">График</h1>
      </div>



      {/* Filters and Reservation Container */}
      <div className="mb-4">
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
          showReservation={isAuthenticated && ((user?.roles?.includes('climber') || user?.roles?.includes('admin')) && (children.length > 0 || user?.roles?.includes('climber')))}
          user={user}
          children={children}
          defaultSelectedClimberIds={defaultSelectedClimberIds}
          setDefaultSelectedClimberIds={setDefaultSelectedClimberIds}
          getUserDisplayName={getUserDisplayName}
          onAddChild={() => {
            setShowAddChildModal(true);
          }}
          onSaveFilters={saveFilters}
          trainingLabels={trainingLabels}
        />
      </div>

      {/* Main Content - Schedule */}
      <div className="flex-1 min-w-0">
        {/* Bulk Actions */}
        {isAuthenticated && selectedSessionIds.length > 0 && (
          <>
            {/* Mobile sticky button - always visible at bottom */}
            <div className="lg:hidden fixed [bottom:calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 bg-white shadow-md px-4 py-3">
              <Button
                onClick={handleBulkBook}
                disabled={isBulkBooking}
                variant="primary"
                className="w-full text-sm py-3 flex items-center justify-center gap-2"
              >
                {isBulkBooking ? (
                  'Запазване...'
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {`Запази всички маркирани (${selectedSessionIds.length})`}
                  </>
                )}
              </Button>
            </div>
            {/* Desktop fixed button - centered */}
            <Button
              onClick={handleBulkBook}
              disabled={isBulkBooking}
              variant="primary"
              className="hidden lg:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-50 shadow-lg text-lg py-3 px-6 items-center gap-2"
            >
              {isBulkBooking ? (
                'Запазване...'
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {`Запази всички маркирани (${selectedSessionIds.length})`}
                </>
              )}
            </Button>
          </>
        )}

        {/* Маркирай всички бутон - точно над графика в дясно */}
        <div className="flex justify-end items-center gap-2 mb-1">
          {isAuthenticated && (hasActiveFilters() || selectedSessionIds.length > 0) && (
            <>
              <button
                type="button"
                onClick={selectAllFilteredSessions}
                className="text-xs md:text-sm text-[#ff6900] hover:opacity-80 transition-opacity underline"
              >
                Маркирай всички тренировки
              </button>
              {selectedSessionIds.length > 0 && (
                <>
                  <span className="text-[#cad5e2] text-xs">|</span>
                  <button
                    type="button"
                    onClick={clearAllSelectedSessions}
                    className="text-xs md:text-sm text-[#45556c] hover:opacity-80 transition-opacity underline"
                  >
                    Изчисти всички
                  </button>
                </>
              )}
            </>
          )}
        </div>

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
          mode="public"
          onReserve={handleBookClick}
          onSelect={isAuthenticated ? toggleSessionSelection : undefined}
          selectedSessionIds={selectedSessionIds}
          user={user}
          children={children}
          selectedClimberForSession={selectedClimberForSession}
          userBookings={userBookings}
          onCancelBooking={(sessionId, reservations) => {
            // Показва popup за потвърждение
            setCancelBookingSessionId(sessionId);
            setCancelBookingBookings(reservations);
            setShowCancelBookingModal(true);
          }}
          trainingLabels={trainingLabels}
        />

        {/* Spacer for sticky button on mobile (at bottom) */}
        {selectedSessionIds.length > 0 && (
          <div className="h-[80px] lg:hidden" />
        )}

        {getFilteredSessions().length === 0 && !loading && sessions.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Няма налични сесии в момента</p>
            </div>
          </Card>
        )}

        {getFilteredSessions().length === 0 && !loading && sessions.length > 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-2">Няма намерени тренировки с избраните филтри</p>
              <p className="text-gray-500 text-sm mb-4">Моля, опитайте с други филтри или премахнете филтрите</p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm text-white bg-[#ea7038] hover:opacity-90 rounded-lg font-medium transition-colors"
              >
                Премахни всички филтри
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={handleCloseLoginModal}
          onLoginSuccess={handleLoginSuccess}
          message="Моля, влезте в профила си, за да запазите час."
        />
      )}

      {/* Add Child Modal - Higher z-index when BookingModal is open */}
      <AddChildModal
        isOpen={showAddChildModal}
        onClose={() => setShowAddChildModal(false)}
        onSuccess={handleAddChildSuccess}
        zIndex={showBookingModal ? 10000 : 9999}
      />

      {/* Booking Modal - Unified for Single and Bulk Bookings */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setBookingSessionIds([]);
          setBookingSessions([]);
          setBookingDefaultClimberIds([]);
        }}
        sessionIds={bookingSessionIds}
        sessions={bookingSessions}
        defaultSelectedClimberIds={bookingDefaultClimberIds}
        showToast={showToast}
        onAddChild={handleAddChildFromBooking}
        refreshTrigger={bookingModalRefreshTrigger}
        onBookingSuccess={(results) => {
          // Optimistic update - update session booked counts without refetching
          if (results.successful && results.successful.length > 0) {
            // Group successful bookings by sessionId to count per session
            const bookingsBySession = {};
            results.successful.forEach(booking => {
              const sessionId = booking.sessionId;
              if (!bookingsBySession[sessionId]) {
                bookingsBySession[sessionId] = 0;
              }
              bookingsBySession[sessionId]++;
            });

            // Update sessions with new booked counts
            setSessions(prev => prev.map(session => {
              const sessionIdStr = typeof session._id === 'object' && session._id?.toString 
                ? session._id.toString() 
                : String(session._id);
              
              // Check if this session had successful bookings
              const addedBookings = Object.entries(bookingsBySession).reduce((count, [id, num]) => {
                const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                return idStr === sessionIdStr ? num : count;
              }, 0);

              if (addedBookings > 0) {
                return {
                  ...session,
                  bookedCount: (session.bookedCount || 0) + addedBookings
                };
              }
              return session;
            }));

            // Optimistic update - add new bookings to userBookings
            const newBookings = results.successful.map(item => ({
              _id: item.bookingId || `temp-${Date.now()}-${Math.random()}`,
              sessionId: item.sessionId,
              climberId: item.climberId,
              climber: {
                _id: item.climberId,
                firstName: item.climberName?.split(' ')[0] || '',
                lastName: item.climberName?.split(' ').slice(1).join(' ') || ''
              },
              status: 'booked',
              createdAt: new Date().toISOString()
            }));

            setUserBookings(prev => [...prev, ...newBookings]);
          }

          // Clear selected sessions for bulk booking
          setSelectedSessionIds([]);
          setBulkBookingClimberIds([]);
        }}
      />

      {/* Cancellation Modal - Using Shared Component */}
      <CancellationModal
        isOpen={showCancelBookingModal}
        onClose={() => {
          setShowCancelBookingModal(false);
          setCancelBookingSessionId(null);
          setCancelBookingBookings([]);
          resetError();
        }}
        session={sessions.find(s => s._id === cancelBookingSessionId)}
        bookings={cancelBookingBookings}
        onConfirm={async (selectedIds) => {
          const result = await cancelBookings(selectedIds, cancelBookingBookings);
          // Modal will stay open if there are failures (handled by hook)
        }}
        error={cancelError}
        isLoading={isCancelling}
      />

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Sticky PWA Install Icon - Mobile Only */}
      <PWAInstallButton
        variant="sticky"
        hideWhenBulkBooking={selectedSessionIds.length > 0}
      />

    </div>
  );
};

export default Sessions;
