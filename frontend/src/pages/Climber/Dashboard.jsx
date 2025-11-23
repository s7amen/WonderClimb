import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { format, startOfDay } from 'date-fns';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';
import { parentClimbersAPI, bookingsAPI } from '../../services/api';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('date'); // 'date' or 'child'
  const { showToast, ToastComponent } = useToast();

  const hasFetchedRef = useRef(false);
  const userIdRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    
    const currentUserId = user?._id || user?.id;
    if (userIdRef.current !== currentUserId) {
      hasFetchedRef.current = false;
      userIdRef.current = currentUserId;
    }
    
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [childrenRes, bookingsRes] = await Promise.all([
        parentClimbersAPI.getAll().catch(() => ({ data: { climbers: [] } })),
        bookingsAPI.getMyBookings().catch(() => ({ data: { bookings: [] } })),
      ]);

      setChildren(childrenRes.data.climbers || []);
      
      // Get all upcoming bookings (no date limit)
      const now = startOfDay(new Date());
      const allBookings = bookingsRes.data.bookings || [];
      const upcomingBookings = allBookings.filter(booking => {
        if (booking.status !== 'booked' || !booking.session?.date) return false;
        const sessionDate = startOfDay(new Date(booking.session.date));
        return sessionDate >= now;
      });
      
      // Sort by date
      upcomingBookings.sort((a, b) => 
        new Date(a.session.date) - new Date(b.session.date)
      );
      
      setBookings(upcomingBookings);
    } catch (error) {
      if (error.response?.status === 429) {
        showToast('Твърде много заявки. Моля, изчакайте малко преди да опитате отново.', 'error');
      } else {
        showToast('Грешка при зареждане на данни', 'error');
      }
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Сигурни ли сте, че искате да откажете тази резервация?')) {
      return;
    }

    try {
      await bookingsAPI.cancel(bookingId);
      showToast('Резервацията е отменена успешно', 'success');
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Грешка при отменяне на резервация';
      showToast(errorMessage, 'error');
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} ч ${mins} м`;
    } else if (hours > 0) {
      return `${hours} ч`;
    } else {
      return `${mins} м`;
    }
  };

  const getBulgarianDayName = (date) => {
    const dayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
    return dayNames[date.getDay()];
  };


  // Sort bookings by date (for "по дата" mode)
  const getSortedBookingsByDate = () => {
    return [...bookings].sort((a, b) => 
      new Date(a.session.date) - new Date(b.session.date)
    );
  };

  // Group bookings by child (for "по дете" mode)
  const groupByChild = () => {
    const grouped = {};
    bookings.forEach(booking => {
      const climberId = booking.climber?._id || booking.climberId;
      if (!climberId) return;
      
      const climberKey = climberId.toString();
      if (!grouped[climberKey]) {
        grouped[climberKey] = {
          climber: booking.climber,
          bookings: []
        };
      }
      grouped[climberKey].bookings.push(booking);
    });
    
    // Sort bookings within each group by date
    return Object.values(grouped).map(group => ({
      ...group,
      bookings: group.bookings.sort((a, b) => 
        new Date(a.session.date) - new Date(b.session.date)
      )
    }));
  };

  const sortedBookings = groupBy === 'date' ? getSortedBookingsByDate() : null;
  const groupedData = groupBy === 'child' ? groupByChild() : null;

  const totalBookings = bookings.length;

  if (loading) {
    return <Loading text="Зареждане..." />;
  }

  return (
    <div className="flex h-full">
      <ToastComponent />
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-neutral-950">
              Табло
            </h1>
          </div>

          {/* Запазени часове Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-neutral-950">
                Запазени часове
              </h2>
              
              {/* Toggle Buttons */}
              <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-1 flex gap-2">
                <button
                  onClick={() => setGroupBy('date')}
                  className={`px-4 py-2 rounded-[8px] text-sm font-normal flex items-center gap-2 transition-colors ${
                    groupBy === 'date'
                      ? 'bg-[#ea7a24] text-white'
                      : 'text-[#4a5565] hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 2H5V4H3V2ZM7 2H9V4H7V2ZM11 2H13V4H11V2ZM3 6H5V8H3V6ZM7 6H9V8H7V6ZM11 6H13V8H11V6ZM3 10H5V12H3V10ZM7 10H9V12H7V10ZM11 10H13V12H11V10Z" fill="currentColor"/>
                  </svg>
                  По дата
                </button>
                <button
                  onClick={() => setGroupBy('child')}
                  className={`px-4 py-2 rounded-[8px] text-sm font-normal flex items-center gap-2 transition-colors ${
                    groupBy === 'child'
                      ? 'bg-[#ea7a24] text-white'
                      : 'text-[#4a5565] hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
                  </svg>
                  По дете
                </button>
              </div>
            </div>

            {/* Reservations List */}
          {bookings.length === 0 ? (
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-8 text-center">
              <p className="text-[#4a5565]">Няма запазени часове</p>
            </div>
          ) : groupBy === 'date' ? (
            /* Render all bookings sorted by date in a single grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedBookings.map((booking) => {
                const sessionDate = new Date(booking.session.date);
                const sessionDateObj = startOfDay(sessionDate);
                const climber = booking.climber;
                const isConfirmed = booking.status === 'booked';
                
                return (
                  <div
                    key={booking._id}
                    className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-5 flex flex-col"
                  >
                    {/* Date Header */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                      <div className="bg-[#ea7a24] rounded-[10px] w-9 h-9 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base font-normal text-neutral-950">
                          {`${getBulgarianDayName(sessionDateObj)}, ${format(sessionDateObj, 'dd.MM.yyyy')}`}
                        </h2>
                      </div>
                    </div>

                    {/* Child Name */}
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-[#35383d]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
                      </svg>
                      <span className="text-base font-normal text-[#35383d]">
                        {climber ? `${climber.firstName} ${climber.lastName || ''}`.trim() : 'Неизвестен'}
                      </span>
                    </div>

                    {/* Time and Duration */}
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-[#ea7a24]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM7.5 4V8.25L11 10L10.25 11.25L6.5 9V4H7.5Z" fill="currentColor"/>
                      </svg>
                      <span className="text-sm font-normal text-[#ea7a24]">
                        {format(sessionDate, 'HH:mm')}
                      </span>
                      <span className="text-sm font-normal text-[#4a5565]">
                        {formatDuration(booking.session.durationMinutes)}
                      </span>
                    </div>

                    {/* Session Title */}
                    <h3 className="text-base font-normal text-neutral-950 mb-4">
                      {booking.session.title}
                    </h3>

                    {/* Status */}
                    <div className="border-t border-gray-100 pt-3 mb-4 flex items-center gap-2">
                      {isConfirmed ? (
                        <>
                          <svg className="w-4 h-4 text-[#adb933]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM6.5 11.5L2.5 7.5L3.91 6.09L6.5 8.68L12.09 3.09L13.5 4.5L6.5 11.5Z" fill="currentColor"/>
                          </svg>
                          <span className="text-sm font-normal text-[#adb933]">
                            Потвърдена
                          </span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-[#ea7a24]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM7.5 4V8.25L11 10L10.25 11.25L6.5 9V4H7.5Z" fill="currentColor"/>
                          </svg>
                          <span className="text-sm font-normal text-[#ea7a24]">
                            Чакаща
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {isConfirmed ? (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="flex-1 bg-red-50 text-[#e7000b] text-sm font-normal py-2 px-4 rounded-[10px] hover:bg-red-100 transition-colors"
                        >
                          Откажи
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              // TODO: Implement confirm booking
                              showToast('Функционалността за потвърждаване ще бъде добавена скоро', 'info');
                            }}
                            className="flex-1 bg-[#adb933] text-white text-sm font-normal py-2 px-4 rounded-[10px] hover:bg-[#9db02a] transition-colors"
                          >
                            Потвърди
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            className="flex-1 bg-red-50 text-[#e7000b] text-sm font-normal py-2 px-4 rounded-[10px] hover:bg-red-100 transition-colors"
                          >
                            Откажи
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Render bookings grouped by child */
            <div className="space-y-8">
              {groupedData.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* Reservation Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {group.bookings.map((booking) => {
                      const sessionDate = new Date(booking.session.date);
                      const sessionDateObj = startOfDay(sessionDate);
                      const climber = booking.climber;
                      const isConfirmed = booking.status === 'booked';
                      
                      return (
                        <div
                          key={booking._id}
                          className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-5 flex flex-col"
                        >
                          {/* Date Header */}
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                            <div className="bg-[#ea7a24] rounded-[10px] w-9 h-9 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div>
                              <h2 className="text-base font-normal text-neutral-950">
                                {`${getBulgarianDayName(sessionDateObj)}, ${format(sessionDateObj, 'dd.MM.yyyy')}`}
                              </h2>
                            </div>
                          </div>

                          {/* Child Name */}
                          <div className="flex items-center gap-2 mb-4">
                            <svg className="w-4 h-4 text-[#35383d]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
                            </svg>
                            <span className="text-base font-normal text-[#35383d]">
                              {climber ? `${climber.firstName} ${climber.lastName || ''}`.trim() : 'Неизвестен'}
                            </span>
                          </div>

                          {/* Time and Duration */}
                          <div className="flex items-center gap-2 mb-4">
                            <svg className="w-4 h-4 text-[#ea7a24]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM7.5 4V8.25L11 10L10.25 11.25L6.5 9V4H7.5Z" fill="currentColor"/>
                            </svg>
                            <span className="text-sm font-normal text-[#ea7a24]">
                              {format(sessionDate, 'HH:mm')}
                            </span>
                            <span className="text-sm font-normal text-[#4a5565]">
                              {formatDuration(booking.session.durationMinutes)}
                            </span>
                          </div>

                          {/* Session Title */}
                          <h3 className="text-base font-normal text-neutral-950 mb-4">
                            {booking.session.title}
                          </h3>

                          {/* Status */}
                          <div className="border-t border-gray-100 pt-3 mb-4 flex items-center gap-2">
                            {isConfirmed ? (
                              <>
                                <svg className="w-4 h-4 text-[#adb933]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM6.5 11.5L2.5 7.5L3.91 6.09L6.5 8.68L12.09 3.09L13.5 4.5L6.5 11.5Z" fill="currentColor"/>
                                </svg>
                                <span className="text-sm font-normal text-[#adb933]">
                                  Потвърдена
                                </span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 text-[#ea7a24]" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM7.5 4V8.25L11 10L10.25 11.25L6.5 9V4H7.5Z" fill="currentColor"/>
                                </svg>
                                <span className="text-sm font-normal text-[#ea7a24]">
                                  Чакаща
                                </span>
                              </>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {isConfirmed ? (
                              <button
                                onClick={() => handleCancelBooking(booking._id)}
                                className="flex-1 bg-red-50 text-[#e7000b] text-sm font-normal py-2 px-4 rounded-[10px] hover:bg-red-100 transition-colors"
                              >
                                Откажи
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    // TODO: Implement confirm booking
                                    showToast('Функционалността за потвърждаване ще бъде добавена скоро', 'info');
                                  }}
                                  className="flex-1 bg-[#adb933] text-white text-sm font-normal py-2 px-4 rounded-[10px] hover:bg-[#9db02a] transition-colors"
                                >
                                  Потвърди
                                </button>
                                <button
                                  onClick={() => handleCancelBooking(booking._id)}
                                  className="flex-1 bg-red-50 text-[#e7000b] text-sm font-normal py-2 px-4 rounded-[10px] hover:bg-red-100 transition-colors"
                                >
                                  Откажи
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Активни абонаменти Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-950">
              Активни абонаменти
            </h2>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] p-8 text-center">
              <p className="text-[#4a5565]">В процес на разработка</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-white border-l border-[rgba(0,0,0,0.1)] flex-shrink-0 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="bg-[#eddcca] rounded-full w-9 h-9 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#35383d]" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10ZM10 12.5C6.66 12.5 0 14.175 0 17.5V20H20V17.5C20 14.175 13.34 12.5 10 12.5Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <p className="text-base font-normal text-neutral-950">
                {user?.firstName} {user?.lastName || ''}
              </p>
            </div>
          </div>

          {/* My Children */}
          <div className="bg-[#f3f3f5] rounded-[10px] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-950" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8ZM8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
              </svg>
              <p className="text-sm font-normal text-neutral-950">Моите деца</p>
            </div>
            <div className="space-y-2">
              {children.length === 0 ? (
                <p className="text-sm text-[#4a5565]">Няма добавени деца</p>
              ) : (
                children.map((child) => {
                  const age = calculateAge(child.dateOfBirth);
                  return (
                    <div key={child._id} className="flex items-center gap-2">
                      <div className="bg-[#adb933] rounded-full w-1.5 h-1.5"></div>
                      <p className="text-sm text-[#4a5565]">
                        {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ')}
                        {age !== null && ` (${age} г.)`}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Total Reservations */}
          <div className="bg-[#f3f3f5] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-neutral-950" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C11.31 2 14 4.69 14 8C14 11.31 11.31 14 8 14ZM7.5 4V8.25L11 10L10.25 11.25L6.5 9V4H7.5Z" fill="currentColor"/>
              </svg>
              <p className="text-sm font-normal text-neutral-950">Общо резервации</p>
            </div>
            <p className="text-base font-normal text-neutral-950">
              {totalBookings} {totalBookings === 1 ? 'тренировка' : 'тренировки'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/sessions')}
              className="w-full bg-[#adb933] text-white text-base font-normal py-3 px-4 rounded-[10px] hover:bg-[#9db02a] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2V6M14 2V6M3 10H17M5 4H15C16.1046 4 17 4.89543 17 6V18C17 19.1046 16.1046 20 15 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Запази час
            </button>
            <button
              onClick={() => navigate('/parent/profile')}
              className="w-full bg-[#ea7a24] text-white text-base font-normal py-3 px-4 rounded-[10px] hover:bg-[#d96a1a] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Добави дете
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
