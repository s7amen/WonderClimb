import { useState, useEffect } from 'react';
import { bookingsAPI, parentClimbersAPI, myClimberAPI } from '../../services/api';
import { format } from 'date-fns';
import { bg } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import { getUserFullName } from '../../utils/userUtils';
import { useToast } from './Toast';
import BaseModal from './BaseModal';
import Button from './Button';
import Loading from './Loading';

const BookingModal = ({
  isOpen,
  onClose,
  sessionIds = [],
  sessions = [],
  onBookingSuccess,
  defaultSelectedClimberIds = [],
  showToast, // Accept showToast as prop to ensure toast persists after modal close
  onAddChild, // Callback to open AddChildModal
  refreshTrigger // Trigger to refresh climbers list (increment to trigger refresh)
}) => {
  const { user } = useAuth();
  // Remove internal useToast to prevent toast disappearing on close
  // const { showToast, ToastComponent } = useToast();
  const [children, setChildren] = useState([]);
  const [selfClimber, setSelfClimber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClimberIds, setSelectedClimberIds] = useState([]);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState(null);

  // Normalize sessionIds to array
  const normalizedSessionIds = Array.isArray(sessionIds)
    ? sessionIds
    : (sessionIds ? [sessionIds] : []);

  useEffect(() => {
    if (isOpen) {
      fetchClimbers();
      // Set default selected climbers if provided
      if (defaultSelectedClimberIds.length > 0) {
        setSelectedClimberIds(defaultSelectedClimberIds);
      }
    } else {
      // Reset state when modal closes
      setSelectedClimberIds([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user, refreshTrigger]);

  const fetchClimbers = async () => {
    try {
      setLoading(true);

      const promises = [
        parentClimbersAPI.getAll(),
      ];

      // Only fetch self climber if user has climber role
      if (user?.roles?.includes('climber')) {
        promises.push(myClimberAPI.getProfile().catch(() => ({ data: { climber: null } })));
      } else {
        promises.push(Promise.resolve({ data: { climber: null } }));
      }

      const [childrenRes, selfRes] = await Promise.all(promises);

      // Filter children by accountStatus - include active and null/undefined (for backward compatibility)
      const filteredChildren = childrenRes.data.climbers?.filter(c =>
        c.accountStatus === 'active' || c.accountStatus === null || c.accountStatus === undefined
      ) || [];
      setChildren(filteredChildren);

      // Set self climber if available
      if (selfRes.data?.climber) {
        setSelfClimber(selfRes.data.climber);
      }

      // No automatic selection - user must manually select climbers
      // This prevents booking for wrong profiles (e.g., only children when user wanted self + children)
      if (defaultSelectedClimberIds.length > 0) {
        setSelectedClimberIds(defaultSelectedClimberIds);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Грешка при зареждане на данни', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return format(new Date(date), 'HH:mm');
  };

  const getEndTime = (startDate, durationMinutes) => {
    const end = new Date(new Date(startDate).getTime() + durationMinutes * 60000);
    return format(end, 'HH:mm');
  };

  const toggleClimberSelection = (climberId) => {
    const normalizedId = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);

    setSelectedClimberIds(prev => {
      const currentIds = (prev || []).map(id => {
        if (id === 'self') return 'self';
        return typeof id === 'object' && id?.toString ? id.toString() : String(id);
      });
      const isSelected = currentIds.includes(normalizedId);
      if (isSelected) {
        return prev.filter(id => {
          if (id === 'self') return normalizedId !== 'self';
          const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
          return idStr !== normalizedId;
        });
      } else {
        return [...(prev || []), climberId];
      }
    });
  };

  const userRoles = user?.roles || [];
  const hasClimberRole = userRoles.includes('climber');

  const allClimbers = [
    ...(selfClimber ? [{
      _id: selfClimber._id,
      firstName: 'За мен',
      lastName: `(${getUserFullName(user)})`,
      isSelf: true
    }] : []),
    ...children.map(c => ({ ...c, isSelf: false })),
  ];

  const handleBookSessions = async () => {
    if (normalizedSessionIds.length === 0) {
      setError('Грешка: Не са избрани тренировки');
      return;
    }

    // Filter out 'self' from climber IDs and replace with actual self climber ID
    const climberIdsForAPI = [];
    const hasSelf = selectedClimberIds.some(id => {
      const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
      return idStr === 'self';
    });

    // Add self climber ID if 'self' is selected
    if (hasSelf && selfClimber?._id) {
      climberIdsForAPI.push(selfClimber._id);
    }

    // Add children IDs (filter out 'self' placeholder)
    selectedClimberIds.forEach(id => {
      const idStr = typeof id === 'object' && id?.toString ? id.toString() : String(id);
      if (idStr !== 'self') {
        climberIdsForAPI.push(id);
      }
    });

    if (climberIdsForAPI.length === 0) {
      setError('Моля, изберете поне един катерач');
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      const results = {
        successful: [],
        failed: []
      };

      // Book each session for each selected climber
      for (const sessionId of normalizedSessionIds) {
        try {
          // Always send climberIds array with all selected climbers (including self if selected)
          const bookingData = { sessionId, climberIds: climberIdsForAPI };

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
          } else {
            // Fallback - assume all succeeded
            climberIdsForAPI.forEach(climberId => {
              const climber = allClimbers.find(c => {
                const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
                const idStr = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);
                return climberIdStr === idStr;
              });
              results.successful.push({
                climberId,
                sessionId,
                climberName: climber ? `${climber.firstName} ${climber.lastName}` : 'Катерач'
              });
            });
          }
        } catch (error) {
          // Session booking failed - add all selected climbers to failed list
          climberIdsForAPI.forEach(climberId => {
            const climber = allClimbers.find(c => {
              const climberIdStr = typeof c._id === 'object' && c._id?.toString ? c._id.toString() : String(c._id);
              const idStr = typeof climberId === 'object' && climberId?.toString ? climberId.toString() : String(climberId);
              return climberIdStr === idStr;
            });
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
        const sessionCount = normalizedSessionIds.length;
        const climberCount = new Set(results.successful.map(r => r.climberId || r.climberName)).size;
        const successMessage = sessionCount === 1
          ? `Успешно резервирано за ${climberCount} катерач${climberCount > 1 ? 'а' : ''}`
          : `Успешно резервирано ${sessionCount} тренировки за ${climberCount} катерач${climberCount > 1 ? 'а' : ''}`;
        showToast(successMessage, 'success');
      }

      if (results.failed.length > 0) {
        const failedDetails = results.failed.map(item => {
          const climberName = item.climberName || (item.climberId === 'self' ? getUserFullName(user) : 'Катерач');
          return `${climberName}: ${item.reason || 'Грешка'}`;
        }).join(', ');

        // If all failed, show error in modal
        if (results.successful.length === 0) {
          setError(`Неуспешни резервации: ${failedDetails}`);
        } else {
          // If partial success, show toast for errors
          showToast(`Неуспешни резервации: ${failedDetails}`, 'error');
        }
      }

      // Call success callback and close modal
      if (results.successful.length > 0 && onBookingSuccess) {
        onBookingSuccess(results);
      }

      // Close modal after successful booking
      if (results.successful.length > 0 && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage = error.response?.data?.error?.message || 'Грешка при резервиране на сесия';
      setError(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  // Get sessions to display (use provided sessions or find from sessionIds)
  const sessionsToDisplay = sessions.length > 0
    ? sessions
    : normalizedSessionIds.map(id => ({ _id: id }));

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Запази час"
        size="md"
        className="rounded-2xl"
        footer={
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2"
              disabled={isBooking}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Отказ
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleBookSessions}
              disabled={isBooking || selectedClimberIds.length === 0 || normalizedSessionIds.length === 0}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {isBooking ? (
                'Запазване...'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Запази час
                </>
              )}
            </Button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <Loading text="Зареждане..." />
        ) : (
          <>
            {/* Sessions Information */}
            {sessionsToDisplay.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  {sessionsToDisplay.length === 1 ? 'Тренировка:' : `Тренировки (${sessionsToDisplay.length}):`}
                </h3>
                <div className="space-y-2">
                  {sessionsToDisplay.map((session, index) => {
                    const sessionId = session._id || normalizedSessionIds[index];
                    const sessionTitle = session.title || 'Тренировка';
                    const sessionDate = session.date ? new Date(session.date) : null;

                    return (
                      <div key={sessionId || index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="font-medium text-gray-900 mb-1">{sessionTitle}</div>
                        {sessionDate && (
                          <>
                            <div className="text-sm text-gray-600">
                              {format(sessionDate, 'EEEE, d MMMM yyyy', { locale: bg })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatTime(sessionDate)} - {getEndTime(sessionDate, session.durationMinutes || 60)}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Climber Selection */}
            {allClimbers.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">За кого резервирате?</h3>
                <div className="space-y-3">
                  {/* Self option for climbers */}
                  {hasClimberRole && (
                    <label
                      className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedClimberIds.includes('self')
                        ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClimberIds.includes('self')}
                        onChange={() => toggleClimberSelection('self')}
                        className="w-5 h-5 text-[#ff6900] border-gray-300 rounded focus:ring-2 focus:ring-[#ff6900] focus:ring-offset-2 cursor-pointer"
                      />
                      <span className="ml-3 text-base font-medium text-[#0f172b]">
                        За мен ({getUserFullName(user) || user?.email || 'Аз'})
                      </span>
                    </label>
                  )}
                  {/* Children options */}
                  {children.map((child) => {
                    const childIdStr = typeof child._id === 'object' && child._id?.toString ? child._id.toString() : String(child._id);
                    const selectedIds = selectedClimberIds.map(id => {
                      if (id === 'self') return 'self';
                      return typeof id === 'object' && id?.toString ? id.toString() : String(id);
                    });
                    const isSelected = selectedIds.includes(childIdStr);

                    return (
                      <label
                        key={child._id}
                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected
                          ? 'border-[#ff6900] bg-[#fff5f0] shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleClimberSelection(child._id)}
                          className="w-5 h-5 text-[#ff6900] border-gray-300 rounded focus:ring-2 focus:ring-[#ff6900] focus:ring-offset-2 cursor-pointer"
                        />
                        <span className="ml-3 text-base font-medium text-[#0f172b]">
                          {child.firstName} {child.lastName}
                        </span>
                      </label>
                    );
                  })}
                  {/* Add Child Button */}
                  {onAddChild && (userRoles.includes('climber') || userRoles.includes('admin')) && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddChild();
                      }}
                      className="w-full h-[48px] flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#ff6900] hover:bg-orange-50 transition-all text-[#64748b] hover:text-[#ff6900]"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="text-base font-medium">Добави дете</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">За кого резервирате?</h3>
                <div className="text-center py-8">
                  <p className="text-sm text-[#64748b] mb-4">Няма налични катерачи за резервиране.</p>
                  {/* Add Child Button when no climbers */}
                  {onAddChild && (userRoles.includes('climber') || userRoles.includes('admin')) && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddChild();
                      }}
                      className="h-[48px] flex items-center gap-2 px-4 py-2 mx-auto border-2 border-dashed border-gray-300 rounded-xl hover:border-[#ff6900] hover:bg-orange-50 transition-all text-[#64748b] hover:text-[#ff6900]"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="text-base font-medium">Добави дете</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </BaseModal>
    </>
  );
};

export default BookingModal;
