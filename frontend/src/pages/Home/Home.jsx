import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import ClimberMobileBottomNav from '../../components/Layout/ClimberMobileBottomNav';
import Gallery from '../../components/Homepage/Gallery';

const Home = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onLoginSubmit = async (data) => {
    setLoginError('');
    setLoginLoading(true);

    const result = await login(data.email, data.password);

    if (result.success) {
      // Redirect based on user role
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.roles?.includes('admin')) {
        navigate('/dashboard/admin');
      } else if (user?.roles?.includes('coach')) {
        navigate('/dashboard/coach');
      } else if (user?.roles?.includes('climber')) {
        navigate('/dashboard/climber');
      } else {
        navigate('/');
      }
    } else {
      setLoginError(result.error || 'Влизането неуспешно');
    }

    setLoginLoading(false);
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

      {/* Training Info Section */}
      <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-rubik font-medium text-neutral-950 mb-4">
              Тренировки по катерене
            </h2>
            <div className="space-y-4 text-lg text-[#4a5565] max-w-3xl mx-auto">
              <p>
                Заниманията са подходящи за начинаещи и напреднали деца, на възраст над 4 години. 
                Провеждат се в малки групи (до 6 деца / инструктор).
              </p>
              <p className="text-base">
                Спортното и скално катерене са спортове, които развиват комплексни качества. 
                Това е естествена физическа дейност, при която децата развиват сила, издръжливост, 
                гъвкавост и ловкост. Те усъвършенстват координацията, фокуса и развиват умения за 
                справяне с проблеми.
              </p>
              <p className="text-base">
                Нашата цел е не само да научим малките катерачи на основите на спортното катерене, 
                но и да развиват умения за работа в екип и да ги вдъхновим да изследват света около тях 
                чрез този прекрасен спорт. Катеренето е един от спортовете, които най-добре укрепват 
                психиката. Всяко направено движение по стената и всеки изкачен маршрут носят удовлетворение 
                и повишават увереността в собствените сили и умения.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What to Bring Section */}
      <section className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-rubik font-medium text-neutral-950 mb-4">
              Какво да носят децата
            </h2>
            <div className="grid md:grid-cols-3 gap-8 mt-8">
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#ea7a24]/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#ea7a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-neutral-950 mb-2">Обувки</h3>
                <p className="text-[#4a5565]">
                  Чисти обувки или обувки за катерене
                </p>
              </Card>
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#ea7a24]/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#ea7a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-neutral-950 mb-2">Дрехи</h3>
                <p className="text-[#4a5565]">
                  Подходящи удобни дрехи за сезона
                </p>
              </Card>
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#ea7a24]/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#ea7a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-neutral-950 mb-2">Вода</h3>
                <p className="text-[#4a5565]">
                  Бутилка вода за хидратация
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-rubik font-medium text-neutral-950 mb-4">
              Цени
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mt-8">
              <Card className="p-8 text-center hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#ea7a24]/20">
                <div className="mb-4">
                  <h3 className="text-2xl font-medium text-neutral-950 mb-2">Една тренировка</h3>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl font-bold text-[#ea7a24]">24 лв</span>
                    <span className="text-2xl text-[#4a5565]">/</span>
                    <span className="text-3xl font-semibold text-[#4a5565]">€12</span>
                  </div>
                </div>
              </Card>
              <Card className="p-8 text-center hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#ea7a24]/20">
                <div className="mb-4">
                  <h3 className="text-2xl font-medium text-neutral-950 mb-2">Карта</h3>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-4xl font-bold text-[#ea7a24]">144 лв</span>
                    <span className="text-2xl text-[#4a5565]">/</span>
                    <span className="text-3xl font-semibold text-[#4a5565]">€72</span>
                  </div>
                  <p className="text-sm text-[#4a5565] mt-2">8 тренировки</p>
                  <p className="text-xs text-[#4a5565] mt-1 italic">Със срок на ползване 2 месеца</p>
                </div>
              </Card>
            </div>
            <div className="mt-8">
              <Card className="bg-[#ea7a24]/5 border border-[#ea7a24]/20 p-4 inline-block">
                <p className="text-sm text-[#4a5565]">
                  <span className="font-medium text-[#ea7a24]">Бележка:</span> Има отстъпки за семейства и членове на клуба
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <Gallery />

      <Footer />

      {/* Mobile Bottom Navigation - Only for climbers */}
      <ClimberMobileBottomNav />
    </div>
  );
};

export default Home;
