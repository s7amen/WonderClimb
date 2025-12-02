import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { sessionsAPI, bookingsAPI, parentClimbersAPI, myClimberAPI } from '../../services/api';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, startOfDay, isBefore } from 'date-fns';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { useAuth } from '../../context/AuthContext';
import { getUserFullName } from '../../utils/userUtils';

const Schedule = () => {
  const { user, loading: authLoading } = useAuth();
  const [availableSessions, setAvailableSessions] = useState([]);
  const [children, setChildren] = useState([]);
  const [selfClimber, setSelfClimber] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [daysToShow, setDaysToShow] = useState(30); // Always show next 30 days
  const [loadedUntilDate, setLoadedUntilDate] = useState(null); // Track what date range we've loaded
  const [loadingMore, setLoadingMore] = useState(false); // Loading state for "load more" button
  const { showToast, ToastComponent } = useToast();

  // Filter states
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);

  // Bulk booking states
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [bulkBookingClimberIds, setBulkBookingClimberIds] = useState([]);
  const [showBulkConfirmation, setShowBulkConfirmation] = useState(false);
  const [isBulkBooking, setIsBulkBooking] = useState(false);

  // Quick book confirmation states
  const [showQuickBookConfirmation, setShowQuickBookConfirmation] = useState(false);
  const [quickBookSessionId, setQuickBookSessionId] = useState(null);
  const [isQuickBooking, setIsQuickBooking] = useState(false);

  // Cancel booking states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState(null);
  const [bookingsToCancel, setBookingsToCancel] = useState([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const [bookingData, setBookingData] = useState({
    climberId: '',
    sessionId: '',
    isSelf: false,
  });

  // Visual indicator state for climber selection section
  const [showClimberSelectionHighlight, setShowClimberSelectionHighlight] = useState(false);

  const hasFetchedRef = useRef(false);
  const userIdRef = useRef(null);
  const climberSelectionRef = useRef(null);

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (authLoading) return;

    // If user changed, reset the fetch flag
    const currentUserId = user?._id || user?.id;
    if (userIdRef.current !== currentUserId) {
      hasFetchedRef.current = false;
      userIdRef.current = currentUserId;
    }

    // Prevent duplicate requests
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    let isMounted = true;

    const loadData = async () => {
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
  }, [authLoading, user]);


  const fetchData = async (additionalDays = 0) => {
    try {
      setLoading(true);
      const today = startOfDay(new Date());
      const endDate = addDays(today, 30 + additionalDays);

      // Fetch sessions and bookings with error handling
      let sessionsRes;
      let bookingsRes;
      try {
        [sessionsRes, bookingsRes] = await Promise.all([
          sessionsAPI.getAvailable({
            startDate: today.toISOString(),
            endDate: endDate.toISOString(),
          }),
          bookingsAPI.getMyBookings(),
        ]);

        const newSessions = sessionsRes.data.sessions || [];

        // On initial load (additionalDays === 0), replace sessions. Otherwise merge.
        if (additionalDays === 0) {
          setAvailableSessions(newSessions);
        } else {
          // Merge new sessions with existing ones, avoiding duplicates
          setAvailableSessions(prev => {
            const existingIds = new Set(prev.map(s => s._id));
            const uniqueNewSessions = newSessions.filter(s => !existingIds.has(s._id));
            return [...prev, ...uniqueNewSessions];
          });
        }
        setLoadedUntilDate(endDate);
        // Update bookings
        setMyBookings(bookingsRes?.data?.bookings || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        const errorMessage = error.response?.data?.error?.message || 'Грешка при зареждане на сесии';
        showToast(errorMessage, 'error');
        if (additionalDays === 0) {
          setAvailableSessions([]);
        }
      }

      // Fetch children with error handling
      let childrenRes;
      try {
        childrenRes = await parentClimbersAPI.getAll();
        setChildren(childrenRes.data.climbers?.filter(c => c.accountStatus === 'active') || []);
      } catch (error) {
        console.error('Error fetching children:', error);
        // This is OK if user doesn't have children yet
        setChildren([]);
      }

      // Fetch self profile for climber (only if user has climber role)
      let fetchedSelfClimber = null;
      if (user?.roles?.includes('climber')) {
        try {
          const selfRes = await myClimberAPI.getProfile();
          if (selfRes.data?.climber) {
            fetchedSelfClimber = selfRes.data.climber;
            setSelfClimber(fetchedSelfClimber);
          }
        } catch (error) {
          // User might not have climber profile - this is OK
          if (error.response?.status !== 404 && error.response?.status !== 403) {
            console.error('Error fetching self climber profile:', error);
          }
        }
      }
    } catch (error) {
      console.error('Unexpected error in fetchData:', error);
      showToast('Грешка при зареждане на данни', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async (e) => {
    e.preventDefault();
    try {
      const sessionIdToUse = selectedSession || bookingData.sessionId;
      if (!sessionIdToUse) {
        showToast('Моля, изберете сесия', 'error');
        return;
      }

      let climberId = bookingData.climberId;

      // If booking for self and user has climber role
      if (bookingData.isSelf && selfClimber) {
        climberId = selfClimber._id;
      } else if (bookingData.isSelf && !selfClimber) {
        showToast('Моля, създайте първо профил като катерач', 'error');
        return;
      }

      if (!climberId && !bookingData.isSelf) {
        showToast('Моля, изберете дете или себе си', 'error');
        return;
      }

      await bookingsAPI.create({
        sessionId: sessionIdToUse,
        climberId: climberId,
      });
      showToast('Сесията е резервирана успешно', 'success');
      setShowBookingForm(false);
      setSelectedSession(null);
      setBookingData({ climberId: '', sessionId: '', isSelf: false });
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error?.details || 'Грешка при резервиране на сесия';
      showToast(errorMessage, 'error');
    }
  };


  // Bulk booking functions
  const toggleSessionSelection = (sessionId) => {
    setSelectedSessionIds(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const selectAllFilteredSessions = () => {
    const filteredSessions = getFilteredSessions();
    const availableSessionIds = filteredSessions
      .filter(session => {
        const bookedCount = getBookedCount(session._id);
        return bookedCount < session.capacity;
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
    // Remove highlight when user selects a climber
    if (showClimberSelectionHighlight) {
      setShowClimberSelectionHighlight(false);
    }
  };

  const handleBulkBook = () => {
    if (selectedSessionIds.length === 0) {
      showToast('Моля, изберете поне една тренировка', 'error');
      return;
    }
    if (bulkBookingClimberIds.length === 0) {
      showToast('Моля, изберете за кого е резервацията. Използвайте бутоните "За кого резервирате?" над графика, за да изберете катерач (катерачи).', 'error');
      // Scroll to climber selection section and highlight it
      if (climberSelectionRef.current) {
        climberSelectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setShowClimberSelectionHighlight(true);
        // Remove highlight after 5 seconds
        setTimeout(() => {
          setShowClimberSelectionHighlight(false);
        }, 5000);
      }
      return;
    }
    setShowBulkConfirmation(true);
  };

  const confirmBulkBooking = async () => {
    setIsBulkBooking(true);
    const results = {
      successful: [],
      failed: []
    };

    try {
      // Book each selected session for each selected climber
      for (const sessionId of selectedSessionIds) {
        try {
          const response = await bookingsAPI.create({
            sessionId,
            climberIds: bulkBookingClimberIds,
          });

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
          } else {
            // Fallback - assume all succeeded
            bulkBookingClimberIds.forEach(climberId => {
              results.successful.push({
                climberId,
                sessionId,
                sessionTime: formatTime(availableSessions.find(s => s._id === sessionId)?.date || new Date())
              });
            });
          }
        } catch (error) {
          // Session booking failed
          bulkBookingClimberIds.forEach(climberId => {
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
            const session = availableSessions.find(s => s._id === item.sessionId);
            sessionDetails[item.sessionId] = {
              title: session?.title || 'Тренировка',
              date: session ? format(new Date(session.date), 'PPpp') : '',
              time: session ? formatTime(session.date) : '',
              endTime: session ? getEndTime(session.date, session.durationMinutes) : ''
            };
          }
        });

        const climberNames = {};
        results.successful.forEach(item => {
          const climber = allClimbers.find(c => {
            const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
            const itemIdStr = typeof item.climberId === 'object' && item.climberId?.toString ? item.climberId.toString() : String(item.climberId);
            return climberIdStr === itemIdStr;
          });
          if (climber && !climberNames[item.climberId]) {
            climberNames[item.climberId] = `${climber.firstName} ${climber.lastName}`;
          }
        });

        const sessionList = Object.keys(sessionDetails).map(sessionId => {
          const detail = sessionDetails[sessionId];
          return `${detail.title} - ${detail.date}, ${detail.time} - ${detail.endTime}`;
        }).join('; ');

        const climberList = Object.values(climberNames).join(', ');

        showToast(
          `✓ Успешно резервирано!\n\nЗа: ${climberList}\nТренировки: ${sessionList}`,
          'success'
        );
      }

      if (results.failed.length > 0) {
        const failedDetails = results.failed.map(item => {
          const climber = allClimbers.find(c => {
            const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
            const itemIdStr = typeof item.climberId === 'object' && item.climberId?.toString ? item.climberId.toString() : String(item.climberId);
            return climberIdStr === itemIdStr;
          });
          const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Катерач';
          const session = availableSessions.find(s => s._id === item.sessionId);
          const sessionName = session ? `${session.title} - ${format(new Date(session.date), 'PPpp')}` : 'Тренировка';
          return `${climberName} (${sessionName}): ${item.reason || 'Грешка'}`;
        }).join(', ');
        showToast(`Неуспешни резервации: ${failedDetails}`, 'error');
      }

      // Clear selections and refresh data
      setSelectedSessionIds([]);
      setShowBulkConfirmation(false);
      fetchData();
    } catch (error) {
      showToast('Грешка при масово резервиране', 'error');
      console.error('Bulk booking error:', error);
    } finally {
      setIsBulkBooking(false);
    }
  };

  const getBookedCount = (sessionId) => {
    const session = availableSessions.find(s => s._id === sessionId);
    if (session?.bookedCount !== undefined) {
      return session.bookedCount;
    }
    return 0;
  };

  // Get bookings for a specific session
  const getBookingsForSession = (sessionId) => {
    return myBookings.filter(booking =>
      booking.session?._id === sessionId &&
      booking.status === 'booked'
    );
  };

  // Check if session has bookings for current user or linked profiles
  const hasBookings = (sessionId) => {
    return getBookingsForSession(sessionId).length > 0;
  };

  // Handle cancel booking click
  const handleCancelClick = (sessionId) => {
    const bookings = getBookingsForSession(sessionId);
    if (bookings.length === 0) return;

    setSessionToCancel(sessionId);
    setBookingsToCancel(bookings);

    if (bookings.length === 1) {
      // Single booking - show direct confirmation
      setSelectedBookingIds([bookings[0]._id]);
      setShowCancelModal(true);
    } else {
      // Multiple bookings - show selection modal
      setSelectedBookingIds([]);
      setShowCancelModal(true);
    }
  };

  // Confirm cancel booking
  const confirmCancelBooking = async () => {
    if (selectedBookingIds.length === 0) {
      setCancelError('Моля, изберете поне една резервация за отмяна');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    const results = {
      successful: [],
      failed: []
    };

    try {
      for (const bookingId of selectedBookingIds) {
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
        setMyBookings(prev => prev.map(booking =>
          results.successful.includes(booking._id)
            ? { ...booking, status: 'cancelled', cancelledAt: new Date() }
            : booking
        ));

        const cancelledCount = results.successful.length;
        showToast(
          `Успешно отменени ${cancelledCount} резервации`,
          'success'
        );
      }

      if (results.failed.length > 0) {
        const failedDetails = results.failed.map(item => {
          const booking = bookingsToCancel.find(b => b._id === item.bookingId);
          const climber = booking?.climber;
          const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Катерач';
          return `${climberName}: ${item.reason || 'Грешка'}`;
        }).join(', ');

        // If all failed, show error in modal
        if (results.successful.length === 0) {
          setCancelError(`Неуспешна отмяна: ${failedDetails}`);
        } else {
          // If partial success, show toast for errors
          showToast(
            `Неуспешна отмяна на ${results.failed.length} резервации`,
            'error'
          );
        }
      }
    } catch (error) {
      setCancelError('Грешка при отмяна на резервации');
      console.error('Cancel booking error:', error);
    } finally {
      setIsCancelling(false);

      // Close modal only if there were successful cancellations
      // If all failed, keep modal open to show error
      if (results.successful.length > 0) {
        setShowCancelModal(false);
        setSessionToCancel(null);
        setBookingsToCancel([]);
        setSelectedBookingIds([]);
      }
    }
  };

  const allClimbers = [
    ...(selfClimber ? [{
      _id: selfClimber._id,
      firstName: 'За мен',
      lastName: `(${getUserFullName(user)})`,
      isSelf: true
    }] : []),
    ...children.map(c => ({ ...c, isSelf: false })),
  ];

  // Get unique filter values from available sessions
  const getUniqueTimes = () => {
    const times = availableSessions.map(session => format(new Date(session.date), 'HH:mm'));
    return [...new Set(times)].sort();
  };

  const getUniqueTitles = () => {
    const titles = availableSessions.map(session => session.title);
    return [...new Set(titles)].sort();
  };

  // Filter sessions based on selected filters
  const getFilteredSessions = () => {
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);

    return availableSessions.filter(session => {
      const sessionDate = new Date(session.date);
      const sessionDay = sessionDate.getDay();
      const sessionTime = format(sessionDate, 'HH:mm');
      const sessionTitle = session.title;

      // Only show sessions from today forward, up to daysToShow days ahead
      if (isBefore(sessionDate, today) || isBefore(viewEndDate, sessionDate)) {
        return false;
      }

      // Filter by day of week (only if filter is active)
      if (selectedDays.length > 0 && !selectedDays.includes(sessionDay)) {
        return false;
      }

      // Filter by time (only if filter is active)
      if (selectedTimes.length > 0 && !selectedTimes.includes(sessionTime)) {
        return false;
      }

      // Filter by title (only if filter is active)
      if (selectedTitles.length > 0 && !selectedTitles.includes(sessionTitle)) {
        return false;
      }

      return true;
    });
  };

  // Group sessions by day
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

    // Sort sessions within each day by time
    Object.keys(grouped).forEach(dayKey => {
      grouped[dayKey].sessions.sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );
    });

    return grouped;
  };

  const handleQuickBook = (sessionId) => {
    // Check if any climber is selected - require explicit selection
    const hasBulkSelection = bulkBookingClimberIds.length > 0;
    const hasBookingDataSelection = bookingData.climberId || bookingData.isSelf;

    if (!hasBulkSelection && !hasBookingDataSelection) {
      showToast('Моля, изберете за кого е резервацията. Използвайте бутоните "За кого резервирате?" над графика, за да изберете катерач (катерачи).', 'error');
      // Scroll to climber selection section and highlight it
      if (climberSelectionRef.current) {
        climberSelectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setShowClimberSelectionHighlight(true);
        // Remove highlight after 5 seconds
        setTimeout(() => {
          setShowClimberSelectionHighlight(false);
        }, 5000);
      }
      return;
    }

    // Validate session exists
    const session = availableSessions.find(s => s._id === sessionId);
    if (!session) {
      showToast('Грешка: Тренировката не е намерена', 'error');
      return;
    }

    // Show confirmation modal
    setQuickBookSessionId(sessionId);
    setShowQuickBookConfirmation(true);
  };

  const confirmQuickBooking = async () => {
    if (!quickBookSessionId) {
      showToast('Грешка: Тренировката не е намерена', 'error');
      return;
    }

    setIsQuickBooking(true);
    const results = {
      successful: [],
      failed: []
    };

    try {
      // Determine which climbers to book for
      let climberIdsToBook = [];

      if (bulkBookingClimberIds.length > 0) {
        // Use bulk selection - handle self climber case
        climberIdsToBook = bulkBookingClimberIds.map(selectedId => {
          const climber = allClimbers.find(c => {
            const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
            const idStr = typeof selectedId === 'object' && selectedId?.toString ? selectedId.toString() : String(selectedId);
            return climberIdStr === idStr;
          });
          if (climber?.isSelf && selfClimber) {
            return selfClimber._id;
          }
          return selectedId;
        });
      } else if (bookingData.climberId || bookingData.isSelf) {
        // Use bookingData selection
        if (bookingData.isSelf && selfClimber) {
          climberIdsToBook = [selfClimber._id];
        } else if (bookingData.climberId) {
          climberIdsToBook = [bookingData.climberId];
        }
      }

      if (climberIdsToBook.length === 0) {
        showToast('Моля, изберете за кого е резервацията', 'error');
        setIsQuickBooking(false);
        return;
      }

      // Book the session
      try {
        const response = await bookingsAPI.create({
          sessionId: quickBookSessionId,
          climberIds: climberIdsToBook.length > 1 ? climberIdsToBook : undefined,
          climberId: climberIdsToBook.length === 1 ? climberIdsToBook[0] : undefined,
        });

        if (response.data?.summary) {
          const { successful, failed } = response.data.summary;
          if (successful && successful.length > 0) {
            results.successful.push(...successful.map(item => ({
              ...item,
              sessionId: quickBookSessionId
            })));
          }
          if (failed && failed.length > 0) {
            results.failed.push(...failed.map(item => ({
              ...item,
              sessionId: quickBookSessionId
            })));
          }
        } else {
          // Fallback - assume all succeeded
          climberIdsToBook.forEach(climberId => {
            results.successful.push({
              climberId,
              sessionId: quickBookSessionId,
              sessionTime: formatTime(availableSessions.find(s => s._id === quickBookSessionId)?.date || new Date())
            });
          });
        }
      } catch (error) {
        // Booking failed
        climberIdsToBook.forEach(climberId => {
          results.failed.push({
            climberId,
            sessionId: quickBookSessionId,
            reason: error.response?.data?.error?.message || 'Грешка при резервиране'
          });
        });
      }

      // Build success message
      if (results.successful.length > 0) {
        const session = availableSessions.find(s => s._id === quickBookSessionId);
        const sessionTitle = session?.title || 'Тренировка';
        const sessionDate = session ? format(new Date(session.date), 'PPpp') : '';
        const sessionTime = session ? formatTime(session.date) : '';
        const sessionEndTime = session ? getEndTime(session.date, session.durationMinutes) : '';

        const climberNames = [];
        results.successful.forEach(item => {
          const climber = allClimbers.find(c => {
            const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
            const itemIdStr = typeof item.climberId === 'object' && item.climberId?.toString ? item.climberId.toString() : String(item.climberId);
            return climberIdStr === itemIdStr;
          });
          if (climber) {
            const climberName = `${climber.firstName} ${climber.lastName}`;
            if (!climberNames.includes(climberName)) {
              climberNames.push(climberName);
            }
          }
        });

        const climberList = climberNames.join(', ');

        showToast(
          `✓ Успешно резервирано!\n\nЗа: ${climberList}\nТренировка: ${sessionTitle}\nДата и час: ${sessionDate}, ${sessionTime} - ${sessionEndTime}`,
          'success'
        );
      }

      if (results.failed.length > 0) {
        const failedDetails = results.failed.map(item => {
          const climber = allClimbers.find(c => {
            const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
            const itemIdStr = typeof item.climberId === 'object' && item.climberId?.toString ? item.climberId.toString() : String(item.climberId);
            return climberIdStr === itemIdStr;
          });
          const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Катерач';
          return `${climberName}: ${item.reason || 'Грешка'}`;
        }).join(', ');
        showToast(`Неуспешни резервации: ${failedDetails}`, 'error');
      }

      // Close modal and refresh data
      setShowQuickBookConfirmation(false);
      setQuickBookSessionId(null);
      fetchData();
    } catch (error) {
      showToast('Грешка при резервиране', 'error');
      console.error('Quick booking error:', error);
    } finally {
      setIsQuickBooking(false);
    }
  };

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const today = startOfDay(new Date());
      const currentViewEnd = addDays(today, daysToShow);
      const additionalDays = 30;

      // Fetch sessions and bookings for the next period
      const [sessionsRes, bookingsRes] = await Promise.all([
        sessionsAPI.getAvailable({
          startDate: currentViewEnd.toISOString(),
          endDate: addDays(currentViewEnd, additionalDays).toISOString(),
        }),
        bookingsAPI.getMyBookings(),
      ]);

      const newSessions = sessionsRes.data.sessions || [];

      // Merge new sessions with existing ones, avoiding duplicates
      setAvailableSessions(prev => {
        const existingIds = new Set(prev.map(s => s._id));
        const uniqueNewSessions = newSessions.filter(s => !existingIds.has(s._id));
        return [...prev, ...uniqueNewSessions];
      });

      // Update bookings
      setMyBookings(bookingsRes?.data?.bookings || []);

      setLoadedUntilDate(addDays(currentViewEnd, additionalDays));
      setDaysToShow(prev => prev + additionalDays);
    } catch (error) {
      showToast('Грешка при зареждане на допълнителни тренировки', 'error');
      console.error('Error loading more sessions:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Check if there are more sessions available beyond current view
  const hasMoreSessions = () => {
    if (!loadedUntilDate) return false;
    const today = startOfDay(new Date());
    const viewEndDate = addDays(today, daysToShow);

    // Check if we have sessions beyond the current view period in already loaded data
    const hasSessionsBeyondView = availableSessions.some(session => {
      const sessionDate = new Date(session.date);
      return !isBefore(sessionDate, viewEndDate);
    });

    // Or if we haven't loaded far enough yet
    const needsMoreData = isBefore(loadedUntilDate, addDays(viewEndDate, 1));

    return hasSessionsBeyondView || needsMoreData;
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
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]); // Monday to Sunday
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

  if (loading) {
    return <Loading text="Зареждане на график..." />;
  }

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">График</h1>
      </div>

      <ToastComponent />

      {showBookingForm && (
        <Card>
          <div className="border-b border-gray-200 px-6 py-6">
            <h2 className="text-base font-medium text-neutral-950 mb-1">Резервирай сесия</h2>
            <p className="text-sm" style={{ color: '#4a5565' }}>Изберете сесия и катерач за резервация</p>
          </div>
          <div className="px-6 py-6">
            <form onSubmit={handleBookSession}>
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fff8f0', border: '2px solid #ffd4a3' }}>
                <label className="block text-sm font-medium mb-1" style={{ color: '#4a5565' }}>
                  За кого резервирате?
                </label>
                {allClimbers.length > 0 ? (
                  <select
                    value={bookingData.isSelf ? 'self' : bookingData.climberId}
                    onChange={(e) => {
                      if (e.target.value === 'self') {
                        setBookingData({ ...bookingData, isSelf: true, climberId: '' });
                      } else {
                        setBookingData({ ...bookingData, isSelf: false, climberId: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Избери...</option>
                    {selfClimber && (
                      <option value="self">За мен ({getUserFullName(user)})</option>
                    )}
                    {children.map((child) => (
                      <option key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500">Няма налични катерачи. Моля, добавете дете в профила си.</p>
                )}
              </div>

              {selectedSession ? (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-gray-700 font-medium">
                    Избрана сесия: {availableSessions.find(s => s._id === selectedSession)?.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {format(new Date(availableSessions.find(s => s._id === selectedSession)?.date || new Date()), 'PPpp')}
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Избери сесия
                  </label>
                  <select
                    value={bookingData.sessionId}
                    onChange={(e) => {
                      setBookingData({ ...bookingData, sessionId: e.target.value });
                      setSelectedSession(e.target.value || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Избери сесия...</option>
                    {availableSessions.map((session) => {
                      const bookedCount = getBookedCount(session._id);
                      const isFull = bookedCount >= session.capacity;
                      return (
                        <option key={session._id} value={session._id} disabled={isFull}>
                          {format(new Date(session.date), 'PPpp')} - {session.title}
                          {isFull ? ' (ПЪЛНА)' : ` (${session.capacity - bookedCount} свободни места)`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" variant="primary">
                  Резервирай сесия
                </Button>
                <Button type="button" variant="secondary" onClick={() => {
                  setShowBookingForm(false);
                  setSelectedSession(null);
                  setBookingData({ climberId: '', sessionId: '', isSelf: false });
                }}>
                  Отказ
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Bulk Booking Confirmation Modal */}
      {showBulkConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Потвърждение на масово резервиране</h2>

            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Избрани тренировки:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedSessionIds.map(sessionId => {
                  const session = availableSessions.find(s => s._id === sessionId);
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

            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fff8f0', border: '2px solid #ffd4a3' }}>
              <h3 className="font-semibold mb-2" style={{ color: '#ea7a24' }}>Избрани катерачи:</h3>
              <div className="space-y-1">
                {bulkBookingClimberIds.map(climberId => {
                  const climber = allClimbers.find(c => {
                    const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
                    const idStr = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);
                    return climberIdStr === idStr;
                  });
                  if (!climber) return null;
                  return (
                    <div key={typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId)} className="text-sm text-neutral-950">
                      • {climber.firstName} {climber.lastName}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-gray-700">
                Ще се направят резервации за {selectedSessionIds.length} тренировки за {bulkBookingClimberIds.length} катерач{bulkBookingClimberIds.length > 1 ? 'а' : ''}.
              </p>
            </div>

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

      {/* Quick Book Confirmation Modal */}
      {showQuickBookConfirmation && quickBookSessionId && (() => {
        const session = availableSessions.find(s => s._id === quickBookSessionId);
        if (!session) return null;

        // Get selected climbers
        let selectedClimbers = [];
        if (bulkBookingClimberIds.length > 0) {
          selectedClimbers = bulkBookingClimberIds.map(climberId => {
            const climber = allClimbers.find(c => {
              const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
              const idStr = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);
              return climberIdStr === idStr;
            });
            return climber;
          }).filter(c => c !== undefined);
        } else if (bookingData.climberId || bookingData.isSelf) {
          if (bookingData.isSelf && selfClimber) {
            selectedClimbers = allClimbers.filter(c => c.isSelf);
          } else if (bookingData.climberId) {
            const climber = allClimbers.find(c => {
              const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
              const idStr = typeof bookingData.climberId === 'object' && bookingData.climberId?.toString ? bookingData.climberId.toString() : String(bookingData.climberId);
              return climberIdStr === idStr;
            });
            if (climber) selectedClimbers = [climber];
          }
        }

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Потвърждение на резервация</h2>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Тренировка:</h3>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="font-medium">{session.title}</div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fff8f0', border: '2px solid #ffd4a3' }}>
                <h3 className="font-semibold mb-2" style={{ color: '#ea7a24' }}>За кого резервирате:</h3>
                <div className="space-y-1">
                  {selectedClimbers.length > 0 ? (
                    selectedClimbers.map((climber) => (
                      <div key={climber._id || (climber.isSelf ? 'self' : 'unknown')} className="text-sm text-neutral-950">
                        • {climber.firstName} {climber.lastName}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm" style={{ color: '#4a5565' }}>Няма избрани катерачи</div>
                  )}
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-gray-700">
                  Ще се направи резервация за 1 тренировка за {selectedClimbers.length} катерач{selectedClimbers.length > 1 ? 'а' : ''}.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowQuickBookConfirmation(false);
                    setQuickBookSessionId(null);
                  }}
                  disabled={isQuickBooking}
                >
                  Отказ
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={confirmQuickBooking}
                  disabled={isQuickBooking}
                >
                  {isQuickBooking ? 'Резервиране...' : 'Потвърди'}
                </Button>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Отмяна на резервация</h2>

            {cancelError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {cancelError}
              </div>
            )}

            {sessionToCancel && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Тренировка:</h3>
                {(() => {
                  const session = availableSessions.find(s => s._id === sessionToCancel);
                  if (!session) return null;
                  return (
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="font-medium">{session.title}</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(session.date), 'PPpp')} - {formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {bookingsToCancel.length > 1 ? (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Изберете за кои катерачи да се отмени резервацията:</h3>
                <div className="space-y-2">
                  {bookingsToCancel.map((booking) => {
                    const climber = booking.climber;
                    const climberName = climber ? `${climber.firstName} ${climber.lastName}` : 'Катерач';
                    const isSelected = selectedBookingIds.includes(booking._id);
                    return (
                      <label
                        key={booking._id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookingIds([...selectedBookingIds, booking._id]);
                            } else {
                              setSelectedBookingIds(selectedBookingIds.filter(id => id !== booking._id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{climberName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : bookingsToCancel.length === 1 ? (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Катерач:</h3>
                {bookingsToCancel[0]?.climber && (
                  <div className="text-sm text-gray-700">
                    {bookingsToCancel[0].climber.firstName} {bookingsToCancel[0].climber.lastName}
                  </div>
                )}
              </div>
            ) : null}

            <div className="mb-4 p-3 bg-yellow-50 rounded-md">
              <p className="text-sm text-gray-700">
                Сигурни ли сте, че искате да отмените резервацията?
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCancelModal(false);
                  setSessionToCancel(null);
                  setBookingsToCancel([]);
                  setSelectedBookingIds([]);
                  setCancelError(null);
                }}
                disabled={isCancelling}
              >
                Отказ
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmCancelBooking}
                disabled={isCancelling || selectedBookingIds.length === 0}
              >
                {isCancelling ? 'Отмяна...' : 'Потвърди отмяна'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Booking Confirmation Modal */}
      {showBulkConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Потвърждение на масово резервиране</h2>

            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Избрани тренировки:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedSessionIds.map(sessionId => {
                  const session = availableSessions.find(s => s._id === sessionId);
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

            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fff8f0', border: '2px solid #ffd4a3' }}>
              <h3 className="font-semibold mb-2" style={{ color: '#ea7a24' }}>Избрани катерачи:</h3>
              <div className="space-y-1">
                {bulkBookingClimberIds.map(climberId => {
                  const climber = allClimbers.find(c => {
                    const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
                    const idStr = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);
                    return climberIdStr === idStr;
                  });
                  if (!climber) return null;
                  return (
                    <div key={typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId)} className="text-sm text-neutral-950">
                      • {climber.firstName} {climber.lastName}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-gray-700">
                Ще се направят резервации за {selectedSessionIds.length} тренировки за {bulkBookingClimberIds.length} катерач{bulkBookingClimberIds.length > 1 ? 'а' : ''}.
              </p>
            </div>

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

      {/* Schedule View */}
      <div>

        {/* Filters */}
        <div className="mb-4 space-y-2">
          {/* Days of week filter - starts from Monday */}
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
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${isSelected
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
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${isSelected
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
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors truncate max-w-[200px] ${isSelected
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

          {/* Clear all filters button - below filters, centered */}
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

          {/* Bulk booking section */}
          <div
            ref={climberSelectionRef}
            className={`mt-3 pt-3 md:pt-6 space-y-3 transition-all duration-300 rounded-lg p-4 ${showClimberSelectionHighlight
              ? 'border-2 border-dashed border-orange-400 bg-orange-50'
              : ''
              }`}
            style={{ backgroundColor: showClimberSelectionHighlight ? '#fff4e6' : '#fff8f0' }}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              {/* Climber selection buttons - left side */}
              <div className="flex-1">
                <label className="block text-lg mb-3" style={{ color: '#4a5565' }}>
                  За кого резервирате?
                </label>
                {allClimbers.length > 0 ? (
                  <div className="flex flex-col md:flex-row gap-2 flex-wrap items-center">
                    {allClimbers.map((climber) => {
                      const climberIdStr = typeof climber._id === 'object' && climber._id?.toString ? climber._id.toString() : String(climber._id);
                      const selectedIds = (bulkBookingClimberIds || []).map(id =>
                        typeof id === 'object' && id?.toString ? id.toString() : String(id)
                      );
                      const isSelected = selectedIds.includes(climberIdStr);
                      return (
                        <button
                          key={climberIdStr}
                          type="button"
                          onClick={() => toggleBulkClimberSelection(climber._id)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors w-full md:w-auto ${isSelected
                            ? 'text-white'
                            : 'text-gray-700'
                            }`}
                          style={isSelected
                            ? { backgroundColor: '#ea7a24' }
                            : { backgroundColor: '#f3f3f5', color: '#4a5565' }
                          }
                          onMouseEnter={(e) => {
                            if (isSelected) {
                              e.currentTarget.style.backgroundColor = '#d86a1a';
                            } else {
                              e.currentTarget.style.backgroundColor = '#e5e7eb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isSelected) {
                              e.currentTarget.style.backgroundColor = '#ea7a24';
                            } else {
                              e.currentTarget.style.backgroundColor = '#f3f3f5';
                            }
                          }}
                        >
                          {isSelected && '✓ '}
                          {climber.firstName} {climber.lastName}
                        </button>
                      );
                    })}
                    <Link
                      to="/parent/profile"
                      className="text-sm underline ml-2 flex items-center gap-1"
                      style={{ color: '#4a5565' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#35383d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#4a5565'; }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      добави дете
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: '#4a5565' }}>Няма налични катерачи. Моля, добавете дете в профила си.</p>
                )}
              </div>

              {/* Bulk action button - right side */}
              <div className="flex flex-col items-end md:items-end gap-2 w-full md:w-auto">
                {selectedSessionIds.length > 0 && (
                  <Button
                    onClick={handleBulkBook}
                    disabled={isBulkBooking}
                    variant="primary"
                    className="w-full md:w-auto text-sm md:text-base py-3 md:py-2 md:fixed md:bottom-4 md:right-4 md:z-50 md:shadow-lg"
                  >
                    {isBulkBooking ? 'Резервиране...' : `Запази всички маркирани (${selectedSessionIds.length})`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Маркирай всички бутон - точно над графика */}
        <div className="flex justify-end items-center gap-2 mb-1">
          <button
            type="button"
            onClick={selectAllFilteredSessions}
            className="text-xs md:text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
          >
            Маркирай всички тренировки
          </button>
          {selectedSessionIds.length > 0 && (
            <>
              <span className="text-gray-400 text-xs">|</span>
              <button
                type="button"
                onClick={clearAllSelectedSessions}
                className="text-xs md:text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
              >
                Изчисти всички
              </button>
            </>
          )}
        </div>

        <div className="space-y-4">
          {availableSessions.length === 0 ? (
            <Card>
              <div className="px-6 py-8 text-center">
                <p className="text-base font-medium text-neutral-950 mb-2">Няма налични сесии за резервиране</p>
                <p className="text-sm" style={{ color: '#4a5565' }}>Моля, проверете отново по-късно или се свържете с администратор.</p>
              </div>
            </Card>
          ) : (
            (() => {
              const groupedSessions = groupSessionsByDay();
              const filteredSessions = getFilteredSessions();
              const today = startOfDay(new Date());
              const viewEndDate = addDays(today, daysToShow);

              const days = eachDayOfInterval({ start: today, end: viewEndDate });

              // Check if there are any results when filters are active
              const hasResults = days.some(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayData = groupedSessions[dayKey];
                return dayData && dayData.sessions.length > 0;
              });

              // Show message if filters are active but no results
              if (hasActiveFilters() && !hasResults && filteredSessions.length === 0) {
                return (
                  <Card>
                    <div className="px-6 py-12 text-center">
                      <p className="text-base font-medium text-neutral-950 mb-2">Няма намерени тренировки с избраните филтри</p>
                      <p className="text-sm mb-4" style={{ color: '#4a5565' }}>Моля, опитайте с други филтри или премахнете филтрите</p>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors"
                        style={{ backgroundColor: '#ea7a24' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d86a1a'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ea7a24'; }}
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

                // Hide days without sessions when filters are active
                if (hasActiveFilters() && (!dayData || dayData.sessions.length === 0)) {
                  return null;
                }

                return (
                  <div key={dayKey} className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                    {/* Day Header */}
                    <div className="px-4 py-3" style={{ backgroundColor: '#35383d' }}>
                      <h3 className="text-base font-medium text-white">
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
                          const sessionHasBookings = hasBookings(session._id);

                          return (
                            <div
                              key={session._id}
                              className={`px-4 py-3 ${sessionHasBookings
                                ? 'bg-green-300 border-l-4 border-green-600'
                                : 'bg-white'
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
                                  {isFull ? '0 места' : `${availableSpots} места`}
                                </div>
                                <div className="flex items-center gap-2 justify-end">
                                  {isFull ? (
                                    <>
                                      {sessionHasBookings && (
                                        <button
                                          onClick={() => handleCancelClick(session._id)}
                                          className="text-red-600 hover:text-red-700 text-sm"
                                        >
                                          Отмени
                                        </button>
                                      )}
                                      <button
                                        onClick={() => showToast('Сесията е пълна. Моля, използвайте листата на чакащи.', 'info')}
                                        className="text-orange-600 hover:text-orange-700 text-sm"
                                      >
                                        Листа на чакащи
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {sessionHasBookings && (
                                        <button
                                          onClick={() => handleCancelClick(session._id)}
                                          className="text-red-600 hover:text-red-700 text-sm"
                                        >
                                          Отмени
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleQuickBook(session._id)}
                                        className="text-blue-600 hover:text-blue-700 text-sm"
                                      >
                                        Запази място
                                      </button>
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={selectedSessionIds.includes(session._id)}
                                          onChange={() => toggleSessionSelection(session._id)}
                                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                      </label>
                                    </>
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
                                  {isFull ? '0 места' : `${availableSpots} места`}
                                </div>

                                {/* Action Button */}
                                <div className="flex items-center gap-2">
                                  {sessionHasBookings && (
                                    <button
                                      onClick={() => handleCancelClick(session._id)}
                                      className="text-red-600 hover:text-red-700 text-sm"
                                    >
                                      Отмени
                                    </button>
                                  )}
                                  {isFull ? (
                                    <button
                                      onClick={() => showToast('Сесията е пълна. Моля, използвайте листата на чакащи.', 'info')}
                                      className="text-orange-600 hover:text-orange-700 text-sm"
                                    >
                                      Листа на чакащи
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleQuickBook(session._id)}
                                      className="text-blue-600 hover:text-blue-700 text-sm"
                                    >
                                      Запази място
                                    </button>
                                  )}
                                </div>

                                {/* Checkbox */}
                                <div className="flex justify-end">
                                  {!isFull && (
                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedSessionIds.includes(session._id)}
                                        onChange={() => toggleSessionSelection(session._id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-6 text-center bg-gray-50">
                          <p className="text-sm" style={{ color: '#4a5565' }}>Няма налични тренировки за този ден</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Load More Button */}
        {hasMoreSessions() && (
          <div className="flex justify-center mt-6">
            <Button
              variant="secondary"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Зареждане...' : 'Зареди още тренировки'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;

