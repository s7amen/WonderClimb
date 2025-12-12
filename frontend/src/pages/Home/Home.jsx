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
      {/* Intro & Benefits - Modern Bento Grid */}
      <section className="relative py-24 bg-white overflow-hidden">
        {/* Decorative Gradient Blobs */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-[#ea7a24]/5 rounded-full blur-3xl mix-blend-multiply pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl mix-blend-multiply pointer-events-none" />

        {/* Subtle Dots/Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1a202c 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20">
            <div className="order-2 lg:order-1">
              <span className="inline-block py-1 px-3 rounded-full bg-[#ea7a24]/10 text-[#ea7a24] text-sm font-bold tracking-wide uppercase mb-6">
                За деца 4+ години
              </span>
              <h2 className="text-4xl lg:text-5xl font-rubik font-bold text-neutral-900 leading-tight mb-6">
                Тренировки по <span className="text-[#ea7a24]">катерене</span>
              </h2>
              <div className="space-y-4 text-lg text-neutral-600 leading-relaxed mb-8">
                <p>
                  Тренировките по катерене са организирани занимания в залата, водени от треньори.
                  Те съчетават движение, игра и усвояване на умения в безопасна и подкрепяща среда.
                  Заниманията са съобразени с възрастта и опита на децата и се провеждат в групи или индивидуално..
                </p>
                <p>
                  С тренировките децата развиват сила, координация и издръжливост,
                  както и умения за концентрация и работа в екип. Катеренето насърчава увереността
                  и самостоятелността, като всяко дете напредва със свое собствено темпо.
                </p>
              </div>
            </div>

            {/* Bento Grid Visuals */}
            <div className="order-1 lg:order-2 grid grid-cols-2 gap-4 h-[400px]">
              <div className="col-span-1 rounded-3xl overflow-hidden relative group">
                <img
                  src="/images/homepage/training/vt-60.jpg"
                  alt="Катерене за деца"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>
              <div className="grid grid-rows-2 gap-4">
                <div className="rounded-3xl overflow-hidden relative group">
                  <img
                    src="/images/homepage/training/_DSC3224.jpg"
                    alt="Детска усмивка"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-[#ea7a24]/10 mix-blend-multiply"></div>
                </div>
                <div className="rounded-3xl bg-[#ea7a24] p-6 flex flex-col justify-center text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-4 -mt-4"></div>
                  <span className="text-4xl font-bold mb-1 relative z-10">90</span>
                  <span className="text-white/80 text-sm font-medium relative z-10">минути тренировка</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curved Divider */}
      <div className="relative h-24 bg-white w-full overflow-hidden">
        <svg className="absolute bottom-0 w-full h-24 text-slate-50 transform scale-105" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="currentColor" fillOpacity="1" d="M0,96L80,112C160,128,320,160,480,160C640,160,800,128,960,128C1120,128,1280,160,1360,176L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
        </svg>
      </div>

      {/* Process & Details - Zig Zag */}
      <section className="bg-slate-50 py-12 px-4 overflow-hidden relative">
        {/* Topographic Background Pattern */}
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none">
          <svg className="w-full h-full text-neutral-400" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 10 Q 30 30 60 10 T 100 20" fill="none" stroke="currentColor" strokeWidth="0.2" />
            <path d="M0 30 Q 40 50 70 30 T 100 40" fill="none" stroke="currentColor" strokeWidth="0.2" />
            <path d="M0 50 Q 50 70 80 50 T 100 60" fill="none" stroke="currentColor" strokeWidth="0.2" />
            <path d="M0 70 Q 60 90 90 70 T 100 80" fill="none" stroke="currentColor" strokeWidth="0.2" />
          </svg>
        </div>

        <div className="max-w-5xl mx-auto space-y-24 relative z-10">

          {/* Block 1 - Individual Approach */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2 relative">
              <div className="absolute top-0 -left-4 w-24 h-24 bg-[#ea7a24]/10 rounded-full blur-2xl"></div>
              <div className="relative bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300">
                <h3 className="text-2xl font-bold text-neutral-900 mb-4">Индивидуален подход</h3>
                <div className="space-y-4 text-neutral-600 leading-relaxed">
                  <p>
                    Обръщаме внимание както на техниката и движението, така и на безопасността
                    и правилното поведение в залата.
                  </p>
                  <p>
                    Тренировките са подходящи за деца от различни възрасти, както за напълно начинаещи,
                    така и за деца с предишен опит в катеренето. Групите се формират според възрастта и нивото,
                    така че всяко дете да се чувства комфортно и уверено.
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-all duration-500">
                <img
                  src="/images/homepage/training/climb-12.jpg"
                  alt="Индивидуален подход"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>

          {/* Block 2 (Reversed) - Training Structure */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="w-full md:w-1/2 relative">
              <div className="absolute bottom-0 -right-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="relative bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300">
                <h3 className="text-2xl font-bold text-neutral-900 mb-6">Структура на тренировката</h3>
                <p className="text-neutral-600 mb-6">
                  Всяка тренировка започва със загрявка, включва упражнения за развитие на двигателните качества
                  и време за катерене с насоки от треньорите. Заниманията са с продължителност 75 минути за най-малките, 90 минути за по-големите и 120 мин за състезателите и напредналите.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-neutral-700 font-medium">Загрявка</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200 ml-4"></div>
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-[#ea7a24]/20 text-[#ea7a24] flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-neutral-700 font-medium">Упражнения за двигателни умения</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200 ml-4"></div>
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-neutral-700 font-medium">Катерене с насоки от треньора</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 text-right text-sm font-medium text-slate-500">
                  Общо: 90 минути
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl -rotate-3 hover:rotate-0 transition-all duration-500">
                <img
                  src="/images/homepage/training/_DSC4019.jpg"
                  alt="Структура на тренировката"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Equipment Horizontal Strip */}
      <section className="bg-slate-50 pb-20 pt-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-center text-2xl font-rubik font-bold text-neutral-900 mb-6">Какво да нося?</h3>
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            {[
              { name: 'Удобни дрехи', sub: 'подходящи за сезона', icon: '👕' },
              { name: 'Чисти обувки', sub: 'спортни или за катерене', icon: '👟' },
              { name: 'Вода', sub: 'в добре затворена бутилка', icon: '💧' },
            ].map((item, i) => (
              <div key={i} className="group flex flex-col items-center gap-3 transition-all hover:scale-105 cursor-default">
                <div className="w-24 h-24 bg-white rounded-full shadow-md flex items-center justify-center text-4xl border-2 border-transparent group-hover:border-[#ea7a24] transition-colors">
                  {item.icon}
                </div>
                <div className="text-center">
                  <span className="font-bold text-neutral-800 block group-hover:text-[#ea7a24] transition-colors">{item.name}</span>
                  <span className="text-sm text-neutral-500">{item.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curved Divider Inverted */}
      <div className="relative h-24 bg-[#1a202c] w-full overflow-hidden">
        <svg className="absolute top-0 w-full h-24 text-slate-50 transform scale-105" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="currentColor" fillOpacity="1" d="M0,224L80,213.3C160,203,320,181,480,192C640,203,800,245,960,250.7C1120,256,1280,224,1360,208L1440,192L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
        </svg>
      </div>

      {/* Pricing & CTA Dark Section */}
      <section className="bg-[#1a202c] pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center text-white">

          <h2 className="text-3xl md:text-4xl font-rubik font-bold mb-6">Готови ли сте за тренировка?</h2>

          <p className="text-lg text-white/80 mb-12 leading-relaxed max-w-2xl mx-auto">
            Залата предлага сигурна и приятелска атмосфера, в която децата могат да се движат,
            да се учат и да се развиват. Тренировките са насочени към дългосрочно изграждане на умения
            и любов към движението.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-16 px-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors">
              <h3 className="text-xl font-medium text-white/80 mb-4">Единична тренировка</h3>
              <div className="flex justify-center items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-white">24</span>
                <span className="text-xl text-white/60">лв</span>
              </div>
              <p className="text-sm text-white/40">Перфектно за първи опит</p>
            </div>

            <div className="relative bg-gradient-to-br from-[#ea7a24] to-[#c05600] rounded-3xl p-8 shadow-2xl shadow-orange-500/20 transform hover:-translate-y-1 transition-transform">
              <h3 className="text-xl font-bold text-white mb-4">Карта - 8 тренировки</h3>
              <div className="flex justify-center items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-white">144</span>
                <span className="text-xl text-white/80">лв</span>
              </div>
              <p className="text-sm text-white/80">Валидност 2 месеца</p>
            </div>
          </div>

          <p className="text-white/50 text-sm mb-12 max-w-lg mx-auto">
            * Отстъпки за деца от едно семейство и членове на СК "Чудните скали"
          </p>

          <button
            onClick={() => navigate('/sessions')}
            className="group relative inline-flex items-center gap-3 bg-white text-[#1a202c] text-xl font-bold py-5 px-10 rounded-full hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] transition-all duration-300"
          >
            Запази час
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>

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
