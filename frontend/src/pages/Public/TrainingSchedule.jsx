import { useState, useEffect, useRef } from 'react';
import { sessionsAPI, bookingsAPI, parentClimbersAPI, myClimberAPI } from '../../services/api';
import { format, addDays, startOfDay, eachDayOfInterval, isBefore } from 'date-fns';
import { formatDate } from '../../utils/dateUtils';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../../components/UI/LoginModal';
import SessionFilters from '../../components/Sessions/SessionFilters';
import SessionList from '../../components/Sessions/SessionList';
import { getUserFullName, getUserDisplayName } from '../../utils/userUtils';

const Sessions = () => {
  const { isAuthenticated, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysToShow] = useState(30); // Booking horizon - 30 days
  const { showToast, ToastComponent } = useToast();

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState(null);

  // Booking state
  const [children, setChildren] = useState([]);
  const [selfClimber, setSelfClimber] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedClimberIds, setSelectedClimberIds] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedClimberForSession, setSelectedClimberForSession] = useState({});
  const [userBookings, setUserBookings] = useState([]);
  const [defaultSelectedClimberIds, setDefaultSelectedClimberIds] = useState([]);
  const [showSingleBookingConfirmation, setShowSingleBookingConfirmation] = useState(false);
  const [pendingBookingSessionId, setPendingBookingSessionId] = useState(null);
  const [pendingBookingClimberIds, setPendingBookingClimberIds] = useState(null);

  // Bulk booking state
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [bulkBookingClimberIds, setBulkBookingClimberIds] = useState([]);
  const [showBulkConfirmation, setShowBulkConfirmation] = useState(false);
  const [isBulkBooking, setIsBulkBooking] = useState(false);
  const [showBulkBookingModal, setShowBulkBookingModal] = useState(false);

  // Cancel booking state
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  
  // Add child modal state
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [addChildFormData, setAddChildFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
  });
  const [addChildLoading, setAddChildLoading] = useState(false);
  const [foundExistingProfile, setFoundExistingProfile] = useState(null);
  const [cancelBookingSessionId, setCancelBookingSessionId] = useState(null);
  const [cancelBookingBookings, setCancelBookingBookings] = useState([]);
  const [selectedCancelBookingIds, setSelectedCancelBookingIds] = useState([]);
  const [isCancelling, setIsCancelling] = useState(false);

  // Sticky button state for mobile
  const [isSticky, setIsSticky] = useState(false);

  // Sticky positioning state for sidebar sections
  const reservationCardRef = useRef(null);
  const [filtersTopOffset, setFiltersTopOffset] = useState('330px');

  // Filter states
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [selectedTargetGroups, setSelectedTargetGroups] = useState([]);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

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

  // Calculate filters top offset based on reservation card height
  useEffect(() => {
    const calculateFiltersOffset = () => {
      if (reservationCardRef.current && isAuthenticated && ((user?.roles?.includes('climber') || user?.roles?.includes('admin')) && (children.length > 0 || user?.roles?.includes('climber')))) {
        const reservationCardHeight = reservationCardRef.current.offsetHeight;
        const headerHeight = isAuthenticated ? 114 : 70; // 70px main header + 44px second menu if authenticated
        const gapBetweenSections = 16; // space-y-4 = 1rem = 16px
        const calculatedOffset = headerHeight + reservationCardHeight + gapBetweenSections;
        setFiltersTopOffset(`${calculatedOffset}px`);
      }
    };

    // Calculate on mount and when dependencies change
    calculateFiltersOffset();

    // Recalculate on window resize
    const handleResize = () => {
      calculateFiltersOffset();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAuthenticated, user, children]);

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

  const handleBookClick = async (sessionId) => {
    if (!isAuthenticated) {
      // Show login modal instead of redirecting
      setPendingSessionId(sessionId);
      setShowLoginModal(true);
      return;
    }

    const userRoles = user?.roles || [];
    const hasAdminRole = userRoles.includes('admin');
    const hasClimberRole = userRoles.includes('climber');

    // Проверява дали има избрани катерачи от defaultSelectedClimberIds
    const hasSelf = (defaultSelectedClimberIds || []).some(id => {
      const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
      return idStr === 'self';
    });
    const climberIds = (defaultSelectedClimberIds || []).filter(id => {
      const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
      return idStr !== 'self';
    });

    // If user has climber/admin role and has children
    if ((hasClimberRole || hasAdminRole) && children.length > 0) {
      // Ако има избрани катерачи от defaultSelectedClimberIds, показва потвърждение
      if (climberIds.length > 0 || hasSelf) {
      setPendingBookingSessionId(sessionId);
        setPendingBookingClimberIds(climberIds.length > 0 ? climberIds : null);
        setShowSingleBookingConfirmation(true);
      return;
    }

      // Проверява дали има избран катерач за тази сесия
      const selectedClimberId = selectedClimberForSession[sessionId];
      if (selectedClimberId) {
        // Child already selected, show confirmation
        setPendingBookingSessionId(sessionId);
        setPendingBookingClimberIds([selectedClimberId]);
        setShowSingleBookingConfirmation(true);
        return;
      } else {
        // No child selected, show selection modal
      setSelectedSessionId(sessionId);
      // Pre-populate with defaultSelectedClimberIds if available
      setSelectedClimberIds(defaultSelectedClimberIds.length > 0 ? [...defaultSelectedClimberIds] : []);
      setShowBookingModal(true);
      return;
      }
    }

    // If user only has climber role (with no children)
    if (hasClimberRole) {
      // Ако има избран 'self' от defaultSelectedClimberIds или няма избрани катерачи, показва потвърждение
      if (hasSelf || defaultSelectedClimberIds.length === 0) {
        setPendingBookingSessionId(sessionId);
        setPendingBookingClimberIds(null);
        setShowSingleBookingConfirmation(true);
        return;
      }
      // Ако има избрани деца (но не 'self'), показва modal
      if (climberIds.length > 0) {
      setSelectedSessionId(sessionId);
        setSelectedClimberIds(climberIds);
      setShowBookingModal(true);
        return;
      }
      // Fallback - показва потвърждение
      setPendingBookingSessionId(sessionId);
      setPendingBookingClimberIds(null);
      setShowSingleBookingConfirmation(true);
      return;
    }

    // Fallback: if no role matches, show error
    showToast('Нямате права за резервиране на сесии', 'error');
  };

  const confirmSingleBooking = async () => {
    if (!pendingBookingSessionId) return;
    await bookSession(pendingBookingSessionId, pendingBookingClimberIds);
    setShowSingleBookingConfirmation(false);
    setPendingBookingSessionId(null);
    setPendingBookingClimberIds(null);
  };

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
    const userRoles = user?.roles || [];
    const hasAdminRole = userRoles.includes('admin');
    const hasClimberRole = userRoles.includes('climber');
    
    // Ако е climber/admin с деца и няма избрани катерачи, показва popup за избор
    if ((hasClimberRole || hasAdminRole) && children.length > 0) {
      if (bulkBookingClimberIds.length === 0 && defaultSelectedClimberIds.length === 0) {
        setShowBulkBookingModal(true);
        return;
      }
      // Използва defaultSelectedClimberIds ако има, иначе bulkBookingClimberIds
      const climbersToUse = defaultSelectedClimberIds.length > 0 ? defaultSelectedClimberIds : bulkBookingClimberIds;
      if (climbersToUse.length === 0) {
        setShowBulkBookingModal(true);
        return;
      }
      setShowBulkConfirmation(true);
    } else if (hasClimberRole) {
      // Climber booking for themselves - проверява дали има избрани катерачи
      if (defaultSelectedClimberIds.length === 0) {
        setShowBulkBookingModal(true);
        return;
      }
      setShowBulkConfirmation(true);
    } else {
      showToast('Нямате права за резервиране на сесии', 'error');
    }
  };

  const confirmBulkBooking = async () => {
    setIsBulkBooking(true);
    const results = {
      successful: [],
      failed: []
    };

    try {
      const userRoles = user?.roles || [];
      const hasAdminRole = userRoles.includes('admin');
      const hasClimberRole = userRoles.includes('climber');
      
      // Използва defaultSelectedClimberIds ако има, иначе bulkBookingClimberIds
      const climbersToUse = defaultSelectedClimberIds.length > 0 
        ? defaultSelectedClimberIds 
        : bulkBookingClimberIds;
      
      // Ако все още няма избрани катерачи, използва defaultSelectedClimberIds
      const finalClimbersToUse = climbersToUse.length > 0 ? climbersToUse : defaultSelectedClimberIds;
      
      // Проверява дали има 'self' в избраните катерачи
      const hasSelf = finalClimbersToUse.some(id => {
        const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
        return idStr === 'self';
      });
      
      // Филтрира 'self' от climber IDs
      const climberIds = finalClimbersToUse.filter(id => {
        const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
        return idStr !== 'self';
      });
      
      // Book each selected session
      for (const sessionId of selectedSessionIds) {
        try {
          // Book for children if any selected
          if (climberIds.length > 0) {
            const bookingData = {
              sessionId,
              climberIds: climberIds,
            };
            const response = await bookingsAPI.create(bookingData);
            
            if (response.data?.summary) {
              const { successful, failed } = response.data.summary;
              if (successful && successful.length > 0) {
                results.successful.push(...successful.map(item => ({
                  ...item,
                  sessionId
                })));
              }
              if (failed && failed.length > 0) {
                results.failed.push(...failed.map(item => ({
                  ...item,
                  sessionId
                })));
              }
            }
          }
          
          // Book for self if selected
          if (hasSelf) {
            const bookingData = {
              sessionId,
            };
            const response = await bookingsAPI.create(bookingData);
            
            if (response.data?.summary) {
              const { successful, failed } = response.data.summary;
              if (successful && successful.length > 0) {
                results.successful.push(...successful.map(item => ({
                  ...item,
                  sessionId
                })));
              }
              if (failed && failed.length > 0) {
                results.failed.push(...failed.map(item => ({
                  ...item,
                  sessionId
                })));
              }
            }
          }
        } catch (error) {
          // Session booking failed
          const climberIds = (hasClimberRole || hasAdminRole) && bulkBookingClimberIds.length > 0 
            ? bulkBookingClimberIds 
            : [user?._id];
          climberIds.forEach(climberId => {
            results.failed.push({
              climberId,
              sessionId,
              reason: error.response?.data?.error?.message || 'Грешка при резервиране'
            });
          });
        }
      }

      // Build success message
      if (results.successful.length > 0) {
        const sessionDetails = {};
        results.successful.forEach(item => {
          if (!sessionDetails[item.sessionId]) {
            const session = sessions.find(s => s._id === item.sessionId);
            sessionDetails[item.sessionId] = {
              title: session?.title || 'Тренировка',
              date: session ? format(new Date(session.date), 'PPpp') : '',
              time: session ? formatTime(session.date) : ''
            };
          }
        });

        const sessionList = Object.keys(sessionDetails).map(sessionId => {
          const detail = sessionDetails[sessionId];
          return `${detail.title} - ${detail.date} ${detail.time}`;
        }).join(', ');

        const climberNames = [...new Set(results.successful.map(s => s.climberName))].join(', ');
        showToast(`Успешно резервирано за ${climberNames}: ${sessionList}`, 'success');
      }

      if (results.failed.length > 0) {
        const failedDetails = results.failed.map(item => {
          const climber = (hasClimberRole || hasAdminRole) && children.length > 0
            ? children.find(c => c._id === item.climberId)
            : null;
          const climberName = climber ? `${climber.firstName} ${climber.lastName}` : (user?.firstName + ' ' + user?.lastName);
          return `${climberName}: ${item.reason || 'Грешка'}`;
        }).join(', ');
        showToast(`Неуспешни резервации: ${failedDetails}`, 'error');
      }

      // Optimistically update sessions booked counts
      results.successful.forEach(item => {
        setSessions(prev => prev.map(s => {
          if (s._id === item.sessionId) {
            return {
              ...s,
              bookedCount: (s.bookedCount || 0) + 1
            };
          }
          return s;
        }));
      });
      
      // Refresh user bookings to show reservation info
      if (isAuthenticated) {
        await fetchUserBookings();
      }
      
      // Clear selections
      setSelectedSessionIds([]);
      setBulkBookingClimberIds([]);
      setShowBulkConfirmation(false);
    } catch (error) {
      showToast(
        error.response?.data?.error?.message || 'Грешка при масово резервиране',
        'error'
      );
    } finally {
      setIsBulkBooking(false);
    }
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    if (!addChildFormData.firstName || !addChildFormData.lastName) {
      showToast('Моля, попълнете поне име и фамилия', 'error');
      return;
    }

    setAddChildLoading(true);
    try {
      const childData = {
        firstName: addChildFormData.firstName.trim(),
        lastName: addChildFormData.lastName.trim(),
        dateOfBirth: addChildFormData.dateOfBirth || undefined,
      };

      const response = await parentClimbersAPI.create(childData);
      
      // Check if duplicate found
      if (response.data.duplicate && response.data.existingProfile) {
        setFoundExistingProfile(response.data.existingProfile);
        setAddChildLoading(false);
        return;
      }

      // New child created successfully
      showToast('Детето е добавено успешно', 'success');
      setShowAddChildModal(false);
      setAddChildFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
      setFoundExistingProfile(null);
      
      // Refresh children list
      await fetchUserData();
    } catch (error) {
      if (error.response?.data?.error?.existingProfile) {
        setFoundExistingProfile(error.response.data.error.existingProfile);
      } else {
        showToast(
          error.response?.data?.error?.message || 'Грешка при добавяне на дете',
          'error'
        );
      }
    } finally {
      setAddChildLoading(false);
    }
  };

  const handleLinkExistingChild = async () => {
    if (!foundExistingProfile?._id) return;

    setAddChildLoading(true);
    try {
      await parentClimbersAPI.linkExisting(foundExistingProfile._id);
      showToast('Профилът е свързан успешно', 'success');
      setShowAddChildModal(false);
      setAddChildFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
      setFoundExistingProfile(null);
      
      // Refresh children list
      await fetchUserData();
    } catch (error) {
      showToast(
        error.response?.data?.error?.message || 'Грешка при свързване на профил',
        'error'
      );
    } finally {
      setAddChildLoading(false);
    }
  };

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
    } else if (filterType === 'targetGroup') {
      setSelectedTargetGroups(prev => 
        prev.includes(value) 
          ? prev.filter(t => t !== value)
          : [...prev, value]
      );
    }
  };

  const clearAllFilters = () => {
    setSelectedDays([]);
    setSelectedTimes([]);
    setSelectedTitles([]);
    setSelectedTargetGroups([]);
  };

  const hasActiveFilters = () => {
    return selectedDays.length > 0 || selectedTimes.length > 0 || selectedTitles.length > 0 || selectedTargetGroups.length > 0;
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
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loading text="Зареждане на сесии..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-2 lg:mb-4">
          <h1 className="text-2xl font-normal text-[#0f172b] mb-2 lg:mb-4 leading-9">График</h1>
        </div>

        <ToastComponent />

        {/* Layout with Sidebar and Main Content */}
        <div className={`flex flex-col lg:flex-row ${filtersCollapsed ? 'lg:gap-8' : 'gap-y-2 lg:gap-6'}`}>
          {/* Left Sidebar - Reservation and Filters */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-2 lg:space-y-4">
            {/* Default Climber Selection - In Sidebar */}
            {isAuthenticated && ((user?.roles?.includes('climber') || user?.roles?.includes('admin')) && (children.length > 0 || user?.roles?.includes('climber'))) && (
              <Card ref={reservationCardRef} className="bg-white/80 border border-slate-200 rounded-[16px]">
                <div className="overflow-hidden">
                  {/* Title */}
                  <div className="pt-[12px] px-[16px] pb-0">
                    <h2 className="text-[#cbd5e1] text-sm leading-5 font-semibold uppercase">РЕЗЕРВИРАЙ ЗА:</h2>
                  </div>

                  {/* Header with divider */}
                  <div className="flex justify-end items-center pb-px pt-[12px] px-[16px] border-b border-slate-200">
                  </div>

                  {/* Content */}
                  <div className="px-[16px] pt-[12px] pb-[12px]">
                    <div className="flex flex-col gap-2">
                    {/* Self profile option for climbers */}
                    {user?.roles?.includes('climber') && (
                      <button
                        key="self"
                        type="button"
                        onClick={() => {
                          const selfId = 'self';
                          const selectedIds = (defaultSelectedClimberIds || []).map(id =>
                            typeof id === 'object' && id?.toString ? id.toString() : String(id)
                          );
                          const isSelected = selectedIds.includes(selfId);
                          if (isSelected) {
                            setDefaultSelectedClimberIds(prev => prev.filter(id => {
                              const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                              return idStr !== selfId;
                            }));
                          } else {
                            setDefaultSelectedClimberIds(prev => [...prev, selfId]);
                          }
                        }}
                        className={`h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 rounded-[8px] transition-all ${
                          (defaultSelectedClimberIds || []).some(id => {
                            const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                            return idStr === 'self';
                          })
                            ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full bg-[#ff6900] flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-medium">
                            {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'А'}
                          </span>
                        </div>
                        {/* Name */}
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-xs leading-4 font-normal text-[#0f172b] truncate">
                            {getUserDisplayName(user) || user?.email || 'Аз'}
                          </div>
                        </div>
                      </button>
                    )}
                    {/* Children options */}
                    {children.map((climber) => {
                      const climberIdStr = typeof climber._id === 'object' && climber._id?.toString ? climber._id.toString() : String(climber._id);
                      const selectedIds = (defaultSelectedClimberIds || []).map(id =>
                        typeof id === 'object' && id?.toString ? id.toString() : String(id)
                      );
                      const isSelected = selectedIds.includes(climberIdStr);
                      
                      // Get first letter from first name for avatar
                      const firstLetter = climber.firstName?.[0]?.toUpperCase() || climber.lastName?.[0]?.toUpperCase() || '?';
                      
                      // Avatar color based on index
                      const avatarColors = ['bg-[#ff6900]', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                      const avatarColor = avatarColors[children.indexOf(climber) % avatarColors.length];
                      
                      return (
                        <button
                          key={climberIdStr}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setDefaultSelectedClimberIds(prev => prev.filter(id => {
                                const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                                return idStr !== climberIdStr;
                              }));
                            } else {
                              setDefaultSelectedClimberIds(prev => [...prev, climber._id]);
                            }
                          }}
                          className={`h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 rounded-[8px] transition-all ${
                            isSelected
                              ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center shrink-0`}>
                            <span className="text-white text-xs font-medium">
                              {firstLetter}
                            </span>
                          </div>
                          {/* Name */}
                          <div className="text-left flex-1 min-w-0">
                            <div className="text-xs leading-4 font-normal text-[#0f172b] truncate">
                              {climber.firstName} {climber.lastName}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    
                    {/* Add Child Button */}
                    {(user?.roles?.includes('climber') || user?.roles?.includes('admin')) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddChildModal(true);
                          setAddChildFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
                          setFoundExistingProfile(null);
                        }}
                        className="h-[32px] flex items-center gap-2 px-[12px] py-[6px] border-2 border-dashed border-gray-300 rounded-[8px] hover:border-[#ff6900] hover:bg-orange-50 transition-all text-[#64748b] hover:text-[#ff6900]"
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div className="text-xs leading-4 font-normal whitespace-nowrap">
                          Добави дете
                        </div>
                      </button>
                    )}
                    </div>
                    {(!defaultSelectedClimberIds || defaultSelectedClimberIds.length === 0) && (
                      <p className="text-[10px] text-blue-600 font-medium mt-2">
                        Моля, изберете поне един катерач преди резервиране на тренировки
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Filters */}
            <div 
              className={`${isAuthenticated && ((user?.roles?.includes('climber') || user?.roles?.includes('admin')) && (children.length > 0 || user?.roles?.includes('climber'))) ? 'lg:sticky' : (isAuthenticated ? 'lg:sticky lg:top-[114px]' : 'lg:sticky lg:top-[70px]')} lg:z-30`}
              style={isAuthenticated && ((user?.roles?.includes('climber') || user?.roles?.includes('admin')) && (children.length > 0 || user?.roles?.includes('climber'))) ? { top: filtersTopOffset } : undefined}
            >
              <SessionFilters
                sticky={true}
                selectedDays={selectedDays}
                selectedTimes={selectedTimes}
                selectedTitles={selectedTitles}
                selectedTargetGroups={selectedTargetGroups}
                getUniqueTimes={getUniqueTimes}
                getUniqueTitles={getUniqueTitles}
                toggleFilter={toggleFilter}
                clearAllFilters={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
                compact={true}
                onCollapseChange={setFiltersCollapsed}
              />
            </div>
          </div>

          {/* Main Content - Schedule */}
          <div className="flex-1 min-w-0">
            {/* Bulk Actions */}
            {isAuthenticated && selectedSessionIds.length > 0 && (
              <>
                {/* Mobile sticky button - always visible at bottom */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-md px-4 py-3">
                  <Button
                    onClick={handleBulkBook}
                    disabled={isBulkBooking}
                    variant="primary"
                    className="w-full text-sm py-3"
                  >
                    {isBulkBooking ? 'Запазване...' : `Запази всички маркирани (${selectedSessionIds.length})`}
                  </Button>
                </div>
                {/* Desktop fixed button - centered */}
                <Button
                  onClick={handleBulkBook}
                  disabled={isBulkBooking}
                  variant="primary"
                  className="hidden md:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-50 shadow-lg text-lg py-3 px-6"
                >
                  {isBulkBooking ? 'Запазване...' : `Запази всички маркирани (${selectedSessionIds.length})`}
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
                setSelectedCancelBookingIds(reservations.map(r => r.bookingId));
                setShowCancelBookingModal(true);
              }}
            />

            {/* Spacer for sticky button on mobile (at bottom) */}
            {selectedSessionIds.length > 0 && (
              <div className="h-[80px] md:hidden" />
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
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseLoginModal}
        onLoginSuccess={handleLoginSuccess}
        showRegisterLink={true}
      />

      {/* Booking Modal - Модерен дизайн */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#0f172b]">Избери катерач</h2>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedSessionId(null);
                  setSelectedClimberIds([]);
                }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
              </div>
            </div>
            
            <form onSubmit={handleBookingModalSubmit} className="p-6">
              <div className="space-y-3 mb-6">
                {/* Self option for climbers */}
                {user?.roles?.includes('climber') && (
                  <label
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedClimberIds.includes('self')
                        ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedClimberIds.includes('self')}
                      onChange={() => toggleClimberSelection('self')}
                        className="w-5 h-5 text-[#ff6900] border-gray-300 rounded focus:ring-2 focus:ring-[#ff6900] focus:ring-offset-2 cursor-pointer"
                    />
                    </div>
                    <span className="ml-3 text-base font-medium text-[#0f172b]">
                      За мен ({getUserFullName(user) || user?.email || 'Аз'})
                    </span>
                  </label>
                )}
                {/* Children options */}
                {children.map((child) => {
                  const childIdStr = typeof child._id === 'object' && child._id?.toString ? child._id.toString() : String(child._id);
                  const selectedIds = selectedClimberIds.map(id =>
                    typeof id === 'object' && id?.toString ? id.toString() : String(id)
                  );
                  const isSelected = selectedIds.includes(childIdStr);
                  
                  return (
                    <label
                      key={child._id}
                      className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleClimberSelection(child._id)}
                          className="w-5 h-5 text-[#ff6900] border-gray-300 rounded focus:ring-2 focus:ring-[#ff6900] focus:ring-offset-2 cursor-pointer"
                      />
                      </div>
                      <span className="ml-3 text-base font-medium text-[#0f172b]">
                        {child.firstName} {child.lastName}
                      </span>
                    </label>
                  );
                })}
              </div>

              {children.length === 0 && !user?.roles?.includes('climber') && (
                <p className="text-sm text-[#64748b] mb-6 text-center py-4">
                  Няма налични катерачи за резервиране.
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedSessionId(null);
                    setSelectedClimberIds([]);
                  }}
                  className="flex-1"
                >
                  Отказ
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={selectedClimberIds.length === 0 || bookingLoading}
                  className="flex-1"
                >
                  {bookingLoading ? 'Запазване...' : 'Запази'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Booking Confirmation Modal */}
      {showSingleBookingConfirmation && pendingBookingSessionId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#0f172b]">Потвърждение на резервация</h2>
                <button
                  onClick={() => {
                    setShowSingleBookingConfirmation(false);
                    setPendingBookingSessionId(null);
                    setPendingBookingClimberIds(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                  disabled={bookingLoading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {(() => {
                const session = sessions.find(s => s._id === pendingBookingSessionId);
                if (!session) return null;

                const userRoles = user?.roles || [];
                const hasAdminRole = userRoles.includes('admin');
                const hasClimberRole = userRoles.includes('climber');

                return (
                  <>
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2">Тренировка:</h3>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-gray-900 mb-1">{session.title || 'Тренировка'}</div>
                        <div className="text-sm text-gray-600">
                          {getBulgarianDayName ? getBulgarianDayName(new Date(session.date)) : format(new Date(session.date), 'EEEE')}, {format(new Date(session.date), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTime ? formatTime(session.date) : format(new Date(session.date), 'HH:mm')} - {getEndTime ? getEndTime(session.date, session.durationMinutes) : format(new Date(new Date(session.date).getTime() + session.durationMinutes * 60000), 'HH:mm')}
                        </div>
                      </div>
                    </div>

                    {((hasClimberRole || hasAdminRole) && children.length > 0 && pendingBookingClimberIds && pendingBookingClimberIds.length > 0) && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-700 mb-2">Катерачи:</h3>
                        <div className="space-y-1">
                          {pendingBookingClimberIds.map(climberId => {
                            const climber = children.find(c => {
                              const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
                              const idStr = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);
                              return climberIdStr === idStr;
                            });
                            if (!climber) return null;
                            return (
                              <div key={typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId)} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                                • {climber.firstName} {climber.lastName}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {hasClimberRole && (!pendingBookingClimberIds || pendingBookingClimberIds.length === 0) && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-700 mb-2">Катерач:</h3>
                        <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                          • {user?.firstName} {user?.lastName}
                        </div>
                      </div>
                    )}

                    <div className="mb-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        Сигурни ли сте, че искате да резервирате тази тренировка?
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowSingleBookingConfirmation(false);
                          setPendingBookingSessionId(null);
                          setPendingBookingClimberIds(null);
                        }}
                        disabled={bookingLoading}
                        className="flex-1"
                      >
                        Отказ
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={confirmSingleBooking}
                        disabled={bookingLoading}
                        className="flex-1"
                      >
                        {bookingLoading ? 'Резервиране...' : 'Потвърди'}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Booking Modal - Модерен дизайн */}
      {showBulkBookingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#0f172b]">Избери катерач</h2>
                <button
                  onClick={() => {
                    setShowBulkBookingModal(false);
                    setBulkBookingClimberIds([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-3 mb-6">
                {/* Self option for climbers */}
                {user?.roles?.includes('climber') && (
                  <label
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      bulkBookingClimberIds.some(id => {
                        const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                        return idStr === 'self';
                      }) || defaultSelectedClimberIds.some(id => {
                        const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                        return idStr === 'self';
                      })
                        ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={bulkBookingClimberIds.some(id => {
                          const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                          return idStr === 'self';
                        }) || defaultSelectedClimberIds.some(id => {
                          const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                          return idStr === 'self';
                        })}
                        onChange={() => toggleBulkClimberSelection('self')}
                        className="w-5 h-5 text-[#ff6900] border-gray-300 rounded focus:ring-2 focus:ring-[#ff6900] focus:ring-offset-2 cursor-pointer"
                      />
                    </div>
                    <span className="ml-3 text-base font-medium text-[#0f172b]">
                      За мен ({getUserFullName(user) || user?.email || 'Аз'})
                    </span>
                  </label>
                )}
                {/* Children options */}
                {children.map((child) => {
                  const childIdStr = typeof child._id === 'object' && child._id?.toString ? child._id.toString() : String(child._id);
                  const selectedIds = bulkBookingClimberIds.map(id =>
                    typeof id === 'object' && id?.toString ? id.toString() : String(id)
                  );
                  const defaultIds = defaultSelectedClimberIds.map(id =>
                    typeof id === 'object' && id?.toString ? id.toString() : String(id)
                  );
                  const isSelected = selectedIds.includes(childIdStr) || defaultIds.includes(childIdStr);
                  
                  return (
                    <label
                      key={child._id}
                      className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBulkClimberSelection(child._id)}
                          className="w-5 h-5 text-[#ff6900] border-gray-300 rounded focus:ring-2 focus:ring-[#ff6900] focus:ring-offset-2 cursor-pointer"
                        />
                      </div>
                      <span className="ml-3 text-base font-medium text-[#0f172b]">
                        {child.firstName} {child.lastName}
                      </span>
                    </label>
                  );
                })}
              </div>

              {children.length === 0 && !user?.roles?.includes('climber') && (
                <p className="text-sm text-[#64748b] mb-6 text-center py-4">
                  Няма налични катерачи за резервиране.
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowBulkBookingModal(false);
                    setBulkBookingClimberIds([]);
                  }}
                  className="flex-1"
                >
                  Отказ
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    // Проверява избраните катерачи от bulkBookingClimberIds или defaultSelectedClimberIds
                    const hasSelected = bulkBookingClimberIds.length > 0 || defaultSelectedClimberIds.length > 0;
                    
                    if (!hasSelected) {
                      showToast('Моля, изберете поне един катерач', 'error');
                      return;
                    }
                    
                    // Ако има defaultSelectedClimberIds, ги използва, иначе използва bulkBookingClimberIds
                    if (defaultSelectedClimberIds.length > 0 && bulkBookingClimberIds.length === 0) {
                      setBulkBookingClimberIds(defaultSelectedClimberIds);
                    }
                    
                    // Затваря popup-а и показва потвърждение
                    setShowBulkBookingModal(false);
                    setShowBulkConfirmation(true);
                  }}
                  className="flex-1"
                >
                  Продължи
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Booking Confirmation Modal */}
      {showBulkConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-neutral-950">Потвърждение на масово резервиране</h2>
              <button
                onClick={() => setShowBulkConfirmation(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isBulkBooking}
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Избрани тренировки:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedSessionIds.map(sessionId => {
                  const session = sessions.find(s => s._id === sessionId);
                  if (!session) return null;
                  return (
                    <div key={sessionId} className="p-2 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900">{session.title}</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(() => {
              // Get the climbers to use - prefer defaultSelectedClimberIds if available, otherwise bulkBookingClimberIds
              const climbersToUse = defaultSelectedClimberIds.length > 0 
                ? defaultSelectedClimberIds 
                : bulkBookingClimberIds;
              
              // Filter out 'self' from climber IDs for display
              const climberIdsForDisplay = climbersToUse.filter(id => {
                const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                return idStr !== 'self';
              });
              
              const hasSelf = climbersToUse.some(id => {
                const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
                return idStr === 'self';
              });
              
              const totalClimberCount = climberIdsForDisplay.length + (hasSelf ? 1 : 0);
              
              return (
                <>
                  {(user?.roles?.includes('climber') || user?.roles?.includes('admin')) && children.length > 0 && climberIdsForDisplay.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2">Избрани катерачи:</h3>
                      <div className="space-y-1">
                        {climberIdsForDisplay.map(climberId => {
                          const climber = children.find(c => {
                            const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
                            const idStr = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);
                            return climberIdStr === idStr;
                          });
                          if (!climber) return null;
                          return (
                            <div key={typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId)} className="text-sm text-gray-700">
                              • {climber.firstName} {climber.lastName}
                            </div>
                          );
                        })}
                        {hasSelf && (
                          <div className="text-sm text-gray-700">
                            • {user?.firstName} {user?.lastName}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {user?.roles?.includes('climber') && !user?.roles?.includes('admin') && children.length === 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2">Катерач:</h3>
                      <div className="text-sm text-gray-700">
                        • {user?.firstName} {user?.lastName}
                      </div>
                    </div>
                  )}

                  <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      Ще се направят резервации за <strong>{selectedSessionIds.length}</strong> тренировки за <strong>
                        {(user?.roles?.includes('climber') || user?.roles?.includes('admin')) && children.length > 0 
                          ? totalClimberCount 
                          : 1}</strong> катерач{(user?.roles?.includes('climber') || user?.roles?.includes('admin')) && children.length > 0 && totalClimberCount > 1 ? 'а' : ''}.
                    </p>
                  </div>
                </>
              );
            })()}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowBulkConfirmation(false)}
                disabled={isBulkBooking}
              >
                Отказ
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={confirmBulkBooking}
                disabled={isBulkBooking}
              >
                {isBulkBooking ? 'Резервиране...' : 'Потвърди'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Child Modal */}
      {showAddChildModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#0f172b]">
                  {foundExistingProfile ? 'Свържи съществуващ профил' : 'Добави дете'}
                </h2>
              <button
                onClick={() => {
                    setShowAddChildModal(false);
                    setAddChildFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
                    setFoundExistingProfile(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                  disabled={addChildLoading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
              </div>
            </div>
            
            <div className="p-6">
              {foundExistingProfile ? (
                <div>
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      Намерен е съществуващ профил с тези данни:
                    </p>
                    <div className="text-sm text-gray-700">
                      <p><strong>Име:</strong> {foundExistingProfile.firstName} {foundExistingProfile.lastName}</p>
                      {foundExistingProfile.dateOfBirth && (
                        <p><strong>Дата на раждане:</strong> {formatDate(foundExistingProfile.dateOfBirth)}</p>
                      )}
                      {foundExistingProfile.email && (
                        <p><strong>Имейл:</strong> {foundExistingProfile.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      Искате ли да свържете този профил към вашия акаунт?
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setFoundExistingProfile(null);
                        setAddChildFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
                      }}
                      disabled={addChildLoading}
                      className="flex-1"
                    >
                      Отказ
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleLinkExistingChild}
                      disabled={addChildLoading}
                      className="flex-1"
                    >
                      {addChildLoading ? 'Свързване...' : 'Свържи профил'}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddChild}>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Име <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={addChildFormData.firstName}
                        onChange={(e) => setAddChildFormData({ ...addChildFormData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6900] focus:border-[#ff6900] outline-none"
                        required
                        disabled={addChildLoading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Фамилия <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={addChildFormData.lastName}
                        onChange={(e) => setAddChildFormData({ ...addChildFormData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6900] focus:border-[#ff6900] outline-none"
                        required
                        disabled={addChildLoading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата на раждане (dd/mm/yyyy)
                      </label>
                      <input
                        type="date"
                        value={addChildFormData.dateOfBirth}
                        onChange={(e) => setAddChildFormData({ ...addChildFormData, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6900] focus:border-[#ff6900] outline-none"
                        disabled={addChildLoading}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowAddChildModal(false);
                        setAddChildFormData({ firstName: '', lastName: '', dateOfBirth: '', email: '' });
                        setFoundExistingProfile(null);
                      }}
                      disabled={addChildLoading}
                      className="flex-1"
                    >
                      Отказ
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={addChildLoading}
                      className="flex-1"
                    >
                      {addChildLoading ? 'Добавяне...' : 'Добави дете'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Modal - Модерен дизайн */}
      {showCancelBookingModal && cancelBookingSessionId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#0f172b]">Отмени резервация</h2>
                <button
                  onClick={() => {
                    setShowCancelBookingModal(false);
                    setCancelBookingSessionId(null);
                    setCancelBookingBookings([]);
                    setSelectedCancelBookingIds([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                  disabled={isCancelling}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Session Info */}
              {(() => {
                const session = sessions.find(s => s._id === cancelBookingSessionId);
                if (!session) return null;
                return (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="font-semibold text-[#0f172b] mb-1">{session.title || 'Тренировка'}</div>
                    <div className="text-sm text-[#64748b]">
                      {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                    </div>
                  </div>
                );
              })()}

              {/* Reservations List */}
              {cancelBookingBookings.length > 0 ? (
                <>
              <div className="mb-4">
                    <p className="text-sm text-[#64748b] mb-3">
                      {cancelBookingBookings.length === 1 
                        ? 'Избери резервация за отменяне:' 
                        : 'Избери резервации за отменяне:'}
                    </p>
                    <div className="space-y-2">
                      {cancelBookingBookings.map((reservation) => {
                        const isSelected = selectedCancelBookingIds.includes(reservation.bookingId);
                    return (
                          <label
                            key={reservation.bookingId}
                            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? 'border-red-500 bg-red-50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedCancelBookingIds(prev => 
                                    prev.includes(reservation.bookingId)
                                      ? prev.filter(id => id !== reservation.bookingId)
                                      : [...prev, reservation.bookingId]
                                  );
                                }}
                                className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
                                disabled={isCancelling}
                              />
                      </div>
                            <span className="ml-3 text-base font-medium text-[#0f172b]">
                              {reservation.climberName}
                            </span>
                          </label>
                    );
                  })}
                </div>
              </div>
                </>
              ) : (
                <p className="text-sm text-[#64748b] mb-6 text-center py-4">
                  Няма налични резервации за отменяне.
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                    setShowCancelBookingModal(false);
                    setCancelBookingSessionId(null);
                    setCancelBookingBookings([]);
                    setSelectedCancelBookingIds([]);
                  }}
                  disabled={isCancelling}
                  className="flex-1"
              >
                Отказ
              </Button>
              <Button
                type="button"
                  onClick={async () => {
                    if (selectedCancelBookingIds.length === 0) {
                      showToast('Моля, изберете поне една резервация за отменяне', 'error');
                      return;
                    }

                    setIsCancelling(true);
                    const results = {
                      successful: [],
                      failed: []
                    };

                    try {
                      // Отменя всички избрани резервации
                      for (const bookingId of selectedCancelBookingIds) {
                        try {
                          await bookingsAPI.cancel(bookingId);
                          results.successful.push(bookingId);
                        } catch (error) {
                          results.failed.push({
                            bookingId,
                            reason: error.response?.data?.error?.message || 'Грешка при отмяна'
                          });
                        }
                      }
                      
                      // Update local state for successful cancellations instead of full page reload
                      if (results.successful.length > 0) {
                        setUserBookings(prev => prev.map(booking => 
                          results.successful.includes(booking._id)
                            ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
                            : booking
                        ));
                        
                        // Optimistically update session booked counts
                        setSessions(prev => prev.map(s => {
                          if (s._id === cancelBookingSessionId) {
                            return {
                              ...s,
                              bookedCount: Math.max(0, (s.bookedCount || 0) - results.successful.length)
                            };
                          }
                          return s;
                        }));
                        
                        showToast(
                          results.successful.length === 1
                            ? 'Резервацията е отменена успешно'
                            : `${results.successful.length} резервации са отменени успешно`,
                          'success'
                        );
                      }

                      if (results.failed.length > 0) {
                        showToast(
                          `Неуспешна отмяна на ${results.failed.length} резервации`,
                          'error'
                        );
                      }
                    } catch (error) {
                      showToast(
                        error.response?.data?.error?.message || 'Грешка при отменяне на резервация',
                        'error'
                      );
                    } finally {
                      // Always close modal and clear state
                      setShowCancelBookingModal(false);
                      setCancelBookingSessionId(null);
                      setCancelBookingBookings([]);
                      setSelectedCancelBookingIds([]);
                      setIsCancelling(false);
                    }
                  }}
                  disabled={isCancelling || selectedCancelBookingIds.length === 0}
                  variant="danger"
                  className="flex-1"
                >
                  {isCancelling ? 'Отменяне...' : 'Отмени'}
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Sessions;
