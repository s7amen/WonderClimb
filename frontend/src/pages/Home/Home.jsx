import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { sessionsAPI } from '../../services/api';
import { format, addDays, startOfDay } from 'date-fns';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import SessionList from '../../components/Sessions/SessionList';
import BookingModal from '../../components/UI/BookingModal';

const Home = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const sessionsSectionRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchSessions();
  }, []);

  // Intersection Observer for fade-in on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-visible');
            entry.target.classList.remove('opacity-0');
            observer.unobserve(entry.target); // Stop observing after animation
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px 0px 0px',
      }
    );

    const currentRef = sessionsSectionRef.current;
    if (currentRef) {
      // Observe the inner div, not the section
      const innerDiv = currentRef.querySelector('.sessions-content');
      if (innerDiv) {
        observer.observe(innerDiv);
      }
    }

    return () => {
      if (currentRef) {
        const innerDiv = currentRef.querySelector('.sessions-content');
        if (innerDiv) {
          observer.unobserve(innerDiv);
        }
      }
    };
  }, [loading, sessions.length]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const today = startOfDay(new Date());
      const endDate = addDays(today, 5); // Next 5 days only
      
      const response = await sessionsAPI.getAvailable({
        startDate: today.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Filter out competitions - only show training sessions
      const allSessions = response.data.sessions || [];
      const trainingSessions = allSessions.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= today && 
               session.status === 'active' && 
               session.type !== 'competition';
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      setSessions(trainingSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onLoginSubmit = async (data) => {
    setLoginError('');
    setLoginLoading(true);
    
    const result = await login(data.email, data.password);
    
    if (result.success) {
      // Redirect based on user role
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.roles?.includes('admin')) {
        navigate('/admin/dashboard');
      } else if (user?.roles?.includes('coach')) {
        navigate('/coach/dashboard');
      } else if (user?.roles?.includes('climber')) {
        navigate('/parent/profile');
      } else {
        navigate('/');
      }
    } else {
      setLoginError(result.error || 'Влизането неуспешно');
    }
    
    setLoginLoading(false);
  };

  const formatTime = (date) => {
    return format(new Date(date), 'HH:mm');
  };

  const getEndTime = (startDate, durationMinutes) => {
    const end = new Date(new Date(startDate).getTime() + durationMinutes * 60000);
    return format(end, 'HH:mm');
  };

  const getBulgarianDayName = (date) => {
    const dayNames = ['Нед', 'Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб'];
    return dayNames[date.getDay()];
  };

  const getBookedCount = (sessionId) => {
    const session = sessions.find(s => s._id === sessionId);
    if (session?.bookedCount !== undefined) {
      return session.bookedCount;
    }
    return 0;
  };

  const getFilteredSessions = () => {
    return sessions;
  };

  const hasActiveFilters = () => {
    return false; // No filters on home page
  };

  const clearAllFilters = () => {
    // No filters to clear
  };

  return (
    <div className="min-h-screen flex flex-col scroll-smooth overflow-x-hidden">
      {/* Full-screen background section with login form */}
      <section 
        className="relative w-full h-screen flex flex-col items-center justify-center"
        style={{
          backgroundImage: 'url(/images/boulder-kids-wall.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Header positioned at top */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header />
        </div>
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/60 z-0"></div>
        
        {/* Content container - centered */}
        <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center justify-center">
          {/* Title section - moved up */}
          <div className="text-center mb-6 -mt-20">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-rubik font-bold text-white mb-3 leading-tight">
              Тренировки по катерене
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-rubik font-normal">
              СК „Чудните скали" Варна
            </p>
          </div>

          {/* Login form or Book button for logged-in users */}
          {isAuthenticated ? (
            <div className="w-full max-w-md">
              <button
                onClick={() => navigate('/sessions')}
                className="w-full bg-white/20 backdrop-blur-md border-2 border-white rounded-[14px] py-4 sm:py-6 md:py-8 text-xl sm:text-2xl font-rubik font-medium text-white hover:bg-white/30 transition-all duration-300 shadow-lg"
              >
                Запази час
              </button>
            </div>
          ) : (
            <Card className="bg-white/5 backdrop-blur-md border border-white/20 rounded-[14px] p-6 shadow-2xl w-full">
            {loginError && (
              <div className="mb-4 p-3 bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-white rounded-[10px] text-sm">
                {loginError}
              </div>
            )}

            <form onSubmit={handleSubmit(onLoginSubmit)}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-1">
                  Имейл
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white text-sm text-white placeholder:text-white/70"
                  placeholder="Имейл"
                  {...register('email', {
                    required: 'Имейлът е задължителен',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Невалиден имейл адрес',
                    },
                  })}
                />
                {errors.email?.message && (
                  <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-1">
                  Парола
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white text-sm text-white placeholder:text-white/70"
                  placeholder="Парола"
                  {...register('password', {
                    required: 'Паролата е задължителна',
                    minLength: {
                      value: 6,
                      message: 'Паролата трябва да бъде поне 6 символа',
                    },
                  })}
                />
                {errors.password?.message && (
                  <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loginLoading}
                className="w-full mb-4"
              >
                {loginLoading ? 'Влизане...' : 'Влез'}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-white">
                Нямате профил?{' '}
                <Link to="/register" className="text-white hover:text-white/80 font-medium underline">
                  Регистрирайте се
                </Link>
              </p>
            </div>
          </Card>
          )}
        </div>
      </section>

      {/* Sessions section below the fold */}
      <section ref={sessionsSectionRef} className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="sessions-content max-w-[1600px] mx-auto opacity-0">
          <div className="mb-8">
            <h2 className="text-2xl font-rubik font-medium text-neutral-950 mb-2">
              График за тренировки
            </h2>
            <p className="text-base text-[#4a5565]">
              Предстоящи тренировки за следващите 5 дни
            </p>
          </div>

          {loading ? (
            <Loading text="Зареждане на сесии..." />
          ) : sessions.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-[#4a5565]">Няма предстоящи сесии</p>
            </Card>
          ) : (
            <>
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
                onReserve={(sessionId) => {
                  if (!isAuthenticated) {
                    navigate('/login');
                  } else {
                    const session = sessions.find(s => {
                      const sId = typeof s._id === 'object' && s._id?.toString ? s._id.toString() : String(s._id);
                      const targetId = typeof sessionId === 'object' && sessionId?.toString ? sessionId.toString() : String(sessionId);
                      return sId === targetId;
                    });
                    setSelectedSessionId(sessionId);
                    setSelectedSession(session || null);
                    setShowBookingModal(true);
                  }
                }}
                selectedSessionIds={[]}
                user={null}
                children={[]}
                selectedClimberForSession={{}}
                userBookings={[]}
              />
              
              <div className="mt-8 text-center">
                <Button
                  variant="primary"
                  onClick={() => navigate('/sessions')}
                  className="px-8"
                >
                  Виж всички
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedSessionId(null);
          setSelectedSession(null);
        }}
        sessionIds={selectedSessionId ? [selectedSessionId] : []}
        sessions={selectedSession ? [selectedSession] : []}
        onBookingSuccess={async () => {
          // Refresh sessions list
          await fetchSessions();
        }}
      />

      <Footer />
    </div>
  );
};

export default Home;
