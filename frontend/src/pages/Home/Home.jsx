import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sessionsAPI } from '../../services/api';
import { format, addDays, startOfDay } from 'date-fns';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import SessionList from '../../components/Sessions/SessionList';
import LoginModal from '../../components/UI/LoginModal';

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const sessionsSectionRef = useRef(null);
  const backgroundRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  // Close login modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user && showLoginModal) {
      setShowLoginModal(false);
      // Navigate to sessions page after successful login
      navigate('/sessions');
    }
  }, [isAuthenticated, user, showLoginModal, navigate]);

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

  // Parallax effect for background
  useEffect(() => {
    const handleScroll = () => {
      if (backgroundRef.current) {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5; // Adjust speed (0.5 = moves at half the scroll speed)
        backgroundRef.current.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
        className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Parallax background */}
        <div
          ref={backgroundRef}
          className="absolute inset-0 w-full h-[120%]"
          style={{
            backgroundImage: 'url(/images/boulder-kids-wall.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            willChange: 'transform',
          }}
        ></div>
        
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight md:whitespace-nowrap">
              Тренировки по катерене
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-normal">
              СК "Чудните скали" Варна
            </p>
          </div>

          {/* Book button - shows login modal if not authenticated */}
          <div className="w-full max-w-md group">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/sessions');
                } else {
                  setShowLoginModal(true);
                }
              }}
              className="w-full backdrop-blur-md group-hover:backdrop-blur-none border border-white rounded-[14px] py-6 text-3xl font-medium text-white transition-all duration-300 shadow-2xl group-hover:shadow-2xl group-hover:scale-105"
              style={{ 
                background: 'rgba(255, 255, 255, 0)',
              }}
            >
              Запази час
            </button>
          </div>
        </div>
      </section>

      {/* Sessions section below the fold */}
      <section ref={sessionsSectionRef} className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="sessions-content max-w-[1600px] mx-auto opacity-0">
          <div className="mb-8">
            <h2 className="text-2xl font-medium text-neutral-950 mb-2">
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
                    setShowLoginModal(true);
                  } else {
                    navigate('/sessions');
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

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          // After successful login, navigate to sessions page
          navigate('/sessions');
        }}
        showRegisterLink={true}
      />

      <Footer />
    </div>
  );
};

export default Home;
