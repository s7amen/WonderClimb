import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sessionsAPI } from '../../services/api';
import { format, addDays, startOfDay } from 'date-fns';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import Logo from '../../components/UI/Logo';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingSessions();
  }, []);

  const fetchUpcomingSessions = async () => {
    try {
      setLoading(true);
      const today = startOfDay(new Date());
      const endDate = addDays(today, 30);
      
      const response = await sessionsAPI.getAvailable({
        startDate: today.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Get first 3 upcoming sessions
      const sessions = (response.data.sessions || [])
        .filter(session => {
          const sessionDate = new Date(session.date);
          return sessionDate >= today && session.status === 'active';
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

      setUpcomingSessions(sessions);
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
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

  const formatDate = (date) => {
    return format(new Date(date), 'd');
  };

  const formatMonth = (date) => {
    return format(new Date(date), 'MM.yyyy');
  };

  const getAvailableSpots = (session) => {
    const bookedCount = session.bookedCount || 0;
    const capacity = session.capacity || 0;
    return Math.max(0, capacity - bookedCount);
  };

  const getCoachName = (session) => {
    if (session.coach?.firstName && session.coach?.lastName) {
      return `${session.coach.firstName} ${session.coach.lastName}`;
    }
    return session.coach?.name || 'Треньор';
  };

  const getSessionType = (session) => {
    // Check if it's a competition based on title or type
    if (session.title?.toLowerCase().includes('турнир') || 
        session.title?.toLowerCase().includes('състезание') ||
        session.type === 'competition') {
      return 'Състезание';
    }
    return 'Групова тренировка';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#35383d] to-[#4a5565] pt-20 pb-16 px-4 sm:px-12 lg:px-12">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left side - Text content */}
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl font-rubik font-medium text-white leading-tight">
                  Тренировки за деца и младежи
                </h1>
                <p className="text-lg md:text-xl text-[#99a1af] leading-relaxed">
                  Безопасна среда за развитие на силата, координацията и увереността на вашето дете
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/register')}
                    className="flex items-center justify-center gap-2"
                  >
                    Създай акаунт
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/sessions')}
                  >
                    Виж график
                  </Button>
                </div>
              </div>
              
              {/* Right side - Image placeholder with icon */}
              <div className="hidden lg:block">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-[400px] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="bg-orange-brand rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <p className="text-neutral-950 font-rubik font-medium">Катерачна зала</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-16 px-4 sm:px-12 lg:px-12">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <Card className="border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <div className="bg-orange-brand rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-rubik font-medium text-neutral-950 mb-2">
                  Резервация на сесии
                </h3>
                <p className="text-base text-[#4a5565]">
                  Виж свободни места и резервирай тренировки
                </p>
              </Card>

              {/* Feature 2 */}
              <Card className="border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <div className="bg-orange-brand rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-rubik font-medium text-neutral-950 mb-2">
                  Управление на график
                </h3>
                <p className="text-base text-[#4a5565]">
                  Предстоящи тренировки и напомняния
                </p>
              </Card>

              {/* Feature 3 */}
              <Card className="border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <div className="bg-orange-brand rounded-[10px] w-12 h-12 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-rubik font-medium text-neutral-950 mb-2">
                  Информация за събития
                </h3>
                <p className="text-base text-[#4a5565]">
                  Актуална информация за състезания
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Upcoming Sessions Section */}
        <section className="bg-[#f3f3f5] py-16 px-4 sm:px-12 lg:px-12">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
              <div>
                <h2 className="text-xl font-rubik font-medium text-neutral-950 mb-2">
                  Предстоящи сесии
                </h2>
                <p className="text-base text-[#4a5565]">
                  Следващи тренировки и събития
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => navigate('/sessions')}
                className="mt-4 sm:mt-0"
              >
                Пълен график
              </Button>
            </div>

            {loading ? (
              <Loading text="Зареждане на сесии..." />
            ) : upcomingSessions.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-[#4a5565]">Няма предстоящи сесии</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => {
                  const sessionDate = new Date(session.date);
                  const availableSpots = getAvailableSpots(session);
                  const sessionType = getSessionType(session);

                  return (
                    <Card key={session._id} className="border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        {/* Date box */}
                        <div className="bg-orange-brand rounded-[10px] w-20 h-20 flex flex-col items-center justify-center text-white shrink-0">
                          <div className="text-base font-rubik font-medium">
                            {formatDate(sessionDate)}
                          </div>
                          <div className="text-xs opacity-90">
                            {formatMonth(sessionDate)}
                          </div>
                        </div>

                        {/* Session info */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <span className="bg-beige border border-beige rounded-lg px-2 py-1 text-xs font-rubik font-medium text-neutral-950">
                              {sessionType}
                            </span>
                          </div>
                          <h3 className="text-base font-rubik font-medium text-neutral-950 mb-2">
                            {session.title}
                          </h3>
                          <div className="flex flex-wrap gap-6 text-base text-[#4a5565]">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{formatTime(session.date)} - {getEndTime(session.date, session.durationMinutes)}</span>
                            </div>
                            {session.coach && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Треньор: {getCoachName(session)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Available spots */}
                        <div className="text-right shrink-0">
                          <div className="text-base text-[#4a5565] mb-1">Свободни места</div>
                          <div className="text-base font-rubik font-medium text-orange-brand">
                            {availableSpots}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Gallery Section */}
        <section className="bg-white py-16 px-4 sm:px-12 lg:px-12">
          <div className="max-w-[1600px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-xl font-rubik font-medium text-neutral-950 mb-3">
                Нашата зала
              </h2>
              <p className="text-base text-[#4a5565]">
                Модерно оборудване и безопасна среда
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((index) => (
                <div key={index} className="bg-[#f3f3f5] rounded-[14px] shadow-lg overflow-hidden h-[300px] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="bg-orange-brand rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-neutral-950 font-rubik font-medium">Снимка {index}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-[#f3f3f5] py-16 px-4 sm:px-12 lg:px-12">
          <div className="max-w-[1600px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-xl font-rubik font-medium text-neutral-950 mb-3">
                Как работи
              </h2>
              <p className="text-base text-[#4a5565]">
                4 лесни стъпки до първата тренировка
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  number: 1,
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                  title: 'Регистрирай се',
                  description: 'Създай акаунт с основна информация'
                },
                {
                  number: 2,
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: 'Избери сесия',
                  description: 'Виж графика и налични тренировки'
                },
                {
                  number: 3,
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  ),
                  title: 'Резервирай място',
                  description: 'Потвърди участие за избраната сесия'
                },
                {
                  number: 4,
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                  title: 'Присъствай',
                  description: 'Посети тренировката в залата'
                }
              ].map((step) => (
                <div key={step.number} className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="bg-orange-brand rounded-full w-20 h-20 flex items-center justify-center text-white mx-auto">
                      {step.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 bg-[#35383d] rounded-full w-8 h-8 flex items-center justify-center text-white text-base font-rubik font-medium">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-base font-rubik font-medium text-neutral-950 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-base text-[#4a5565]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
