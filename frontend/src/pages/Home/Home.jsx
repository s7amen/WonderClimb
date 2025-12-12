import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import ClimberMobileBottomNav from '../../components/Layout/ClimberMobileBottomNav';
import Gallery from '../../components/Homepage/Gallery';
import ImageModal from '../../components/Homepage/ImageModal';
import Reveal from '../../components/UI/Reveal';
import useScrollReveal from '../../hooks/useScrollReveal';
import { useRef, useEffect } from 'react';
import LoginModal from '../../components/UI/LoginModal';

const Home = () => {
  const { isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Images for the thumbnail gallery under the fold
  const thumbnailImages = [
    '/images/homepage/training/vt-60.jpg',
    '/images/homepage/training/_DSC3224.jpg',
    '/images/homepage/training/IMG_20240530_175803.jpg',
    '/images/homepage/training/IMG_20240320_185402.jpg',
  ];

  // Scroll effect for hero section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      // Calculate progress (0 to 1) based on how much user scrolled through viewport
      const progress = Math.min(scrollY / windowHeight, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Refs for rotating images
  const [imgRef1, img1Visible] = useScrollReveal({ threshold: 0.2 });
  const [imgRef2, img2Visible] = useScrollReveal({ threshold: 0.2 });
  const [imgRef3, img3Visible] = useScrollReveal({ threshold: 0.2 });
  const [imgRef4, img4Visible] = useScrollReveal({ threshold: 0.2 });
  const [imgRef5, img5Visible] = useScrollReveal({ threshold: 0.2 });

  const handleBookSessionClick = () => {
    if (isAuthenticated) {
      navigate('/sessions');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = () => {
    navigate('/sessions');
  };


  return (
    <div className="min-h-screen flex flex-col scroll-smooth overflow-x-hidden">
      {/* Header - Outside hero section for sticky behavior */}
      <Header />

      {/* Full-screen background section with book button */}
      <section
        className="relative w-full h-screen flex flex-col items-center justify-center"
      >
        {/* Background */}
        <div
          className="absolute inset-0 w-full h-full -z-10 transition-all duration-100"
          style={{
            backgroundImage: 'url(/images/boulder-kids-wall.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 1 - scrollProgress * 0.6, // Fade out (reduce to 40% opacity)
            transform: `scale(${1 + scrollProgress * 0.1})` // Subtle zoom in
          }}
        />

        {/* Dark overlay for readability */}
        <div 
          className="absolute inset-0 -z-10 transition-opacity duration-100"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${0.6 - scrollProgress * 0.2})` // Lighten overlay as content fades
          }}
        ></div>

        {/* Content container - centered */}
        <div 
          className="relative z-10 w-full max-w-md px-4 flex flex-col items-center justify-center transition-all duration-100 -mt-16 sm:-mt-20"
          style={{
            opacity: 1 - scrollProgress * 0.8, // Fade out content
            transform: `translateY(${-scrollProgress * 50}px)` // Move up slightly (50px max)
          }}
        >
          {/* Title section */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-rubik font-bold text-white mb-3 leading-tight md:whitespace-nowrap">
              Тренировки по катерене
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 font-rubik font-normal">
              СК „Чудните скали" Варна
            </p>
          </div>

          {/* Book button - always visible */}
          <div className="w-full max-w-md">
            <button
              onClick={handleBookSessionClick}
              className="w-full bg-white/20 backdrop-blur-md border-2 border-white rounded-[14px] py-4 sm:py-6 md:py-8 text-xl sm:text-2xl font-rubik font-medium text-white hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
              Запази час
            </button>
          </div>
        </div>
      </section>

      {/* Training Info Section */}
      {/* Intro & Benefits - Text First on Mobile */}
      <section className="relative py-12 sm:py-20 bg-white overflow-hidden">
        {/* Decorative Gradient Blobs */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-[#ea7a24]/5 rounded-full blur-3xl mix-blend-multiply pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl mix-blend-multiply pointer-events-none" />

        {/* Subtle Dots/Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1a202c 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        <div className="container mx-auto px-4 relative z-10">
          <Reveal>
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-center">
              {/* Text Content - First on Mobile */}
              <div>
                <span className="inline-block py-1 px-3 rounded-full bg-[#ea7a24]/10 text-[#ea7a24] text-xs sm:text-sm font-bold tracking-wide uppercase mb-4 sm:mb-6">
                  За деца 4+ години
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-rubik font-bold text-neutral-900 leading-tight mb-4 sm:mb-6">
                  Тренировки по <span className="text-[#ea7a24]">катерене</span>
                </h2>
                <div className="space-y-3 sm:space-y-4 text-base sm:text-lg text-neutral-600 leading-relaxed mb-6 sm:mb-8">
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

                {/* Compact Thumbnail Gallery - Mobile */}
                <div className="lg:hidden grid grid-cols-2 gap-3 mb-6">
                  {thumbnailImages.slice(0, 4).map((src, index) => (
                    <div
                      key={index}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden group cursor-pointer"
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img
                        src={src}
                        alt={`Тренировка ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bento Grid Visuals - Desktop Only */}
              <div className="hidden lg:grid grid-cols-2 gap-4 h-[400px]">
                <div
                  ref={imgRef1}
                  className={`col-span-1 rounded-3xl overflow-hidden relative group transition-all duration-1000 ${img1Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                >
                  <img
                    src="/images/homepage/training/vt-60.jpg"
                    alt="Катерене за деца"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                </div>
                <div className="grid grid-rows-2 gap-4">
                  <div
                    ref={imgRef2}
                    className={`rounded-3xl overflow-hidden relative group transition-all duration-1000 delay-100 ${img2Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  >
                    <img
                      src="/images/homepage/training/_DSC3224.jpg"
                      alt="Детска усмивка"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-[#ea7a24]/10 mix-blend-multiply"></div>
                  </div>
                  <div
                    ref={imgRef5}
                    className={`rounded-3xl overflow-hidden relative group transition-all duration-1000 ${img5Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  >
                    <img
                      src="/images/homepage/training/IMG_20240530_175803.jpg"
                      alt="Тренировка"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Curved Divider */}
      <div className="relative h-16 sm:h-24 bg-white w-full overflow-hidden -mb-px">
        <svg className="absolute bottom-0 left-0 w-full h-16 sm:h-24 text-slate-50 block" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="currentColor" fillOpacity="1" d="M0,96L80,112C160,128,320,160,480,160C640,160,800,128,960,128C1120,128,1280,160,1360,176L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
        </svg>
      </div>

      {/* Process & Details - Zig Zag */}
      <section className="bg-slate-50 py-12 sm:py-16 px-4 overflow-hidden relative">
        {/* Topographic Background Pattern */}
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none">
          <svg className="w-full h-full text-neutral-400" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 10 Q 30 30 60 10 T 100 20" fill="none" stroke="currentColor" strokeWidth="0.2" />
            <path d="M0 30 Q 40 50 70 30 T 100 40" fill="none" stroke="currentColor" strokeWidth="0.2" />
            <path d="M0 50 Q 50 70 80 50 T 100 60" fill="none" stroke="currentColor" strokeWidth="0.2" />
            <path d="M0 70 Q 60 90 90 70 T 100 80" fill="none" stroke="currentColor" strokeWidth="0.2" />
          </svg>
        </div>

        <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16 md:space-y-24 relative z-10">

          {/* Block 1 - Individual Approach */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <Reveal
              className="w-full md:w-1/2 relative"
              direction="left"
            >
              <div className="absolute top-0 -left-4 w-24 h-24 bg-[#ea7a24]/10 rounded-full blur-2xl"></div>
              <div className="relative bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300">
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-3 sm:mb-4">Индивидуален подход</h3>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-neutral-600 leading-relaxed">
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
            </Reveal>
            <div className="w-full md:w-1/2 flex justify-center">
              <div
                ref={imgRef3}
                className={`relative w-full max-w-md aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-1000 ${img3Visible ? 'rotate-3 opacity-100 translate-x-0' : 'rotate-0 opacity-0 translate-x-10'} hover:rotate-0`}
              >
                <img
                  src="/images/homepage/training/IMG_20240320_185402.jpg"
                  alt="Индивидуален подход"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>

          {/* Block 2 (Reversed) - Training Structure */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <Reveal
              className="w-full md:w-1/2 relative"
              direction="right"
            >
              <div className="absolute bottom-0 -right-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="relative bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300">
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4 sm:mb-6">Структура на тренировката</h3>
                <p className="text-sm sm:text-base text-neutral-600 mb-4 sm:mb-6">
                  Всяка тренировка започва със загрявка, включва упражнения за развитие на двигателните качества
                  и време за катерене с насоки от треньорите. Заниманията са с продължителност 75 минути за най-малките, 90 минути за по-големите и 120 мин за състезателите и напредналите.
                </p>


              </div>
            </Reveal>
            <div className="w-full md:w-1/2 flex justify-center">
              <div
                ref={imgRef4}
                className={`relative w-full max-w-md aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-1000 ${img4Visible ? '-rotate-3 opacity-100 translate-x-0' : 'rotate-0 opacity-0 -translate-x-10'} hover:rotate-0`}
              >
                <img
                  src="/images/homepage/training/_DSC2984.jpg"
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
      <section className="bg-slate-50 pb-12 sm:pb-20 pt-8 sm:pt-10 px-4">
        <Reveal>
          <div className="max-w-6xl mx-auto">
            <h3 className="text-center text-xl sm:text-2xl font-rubik font-bold text-neutral-900 mb-4 sm:mb-6">Какво да нося?</h3>
            <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-12 justify-items-center">
              {[
                { name: 'Удобни дрехи', sub: 'подходящи за сезона', icon: '👕' },
                { name: 'Чисти обувки', sub: 'спортни или за катерене', icon: '👟' },
                { name: 'Вода', sub: 'в добре затворена бутилка', icon: '💧' },
              ].map((item, i) => (
                <div key={i} className="group flex flex-col items-center gap-2 sm:gap-3 transition-all hover:scale-105 cursor-default">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-full shadow-md flex items-center justify-center text-2xl sm:text-3xl md:text-4xl border-2 border-transparent group-hover:border-[#ea7a24] transition-colors">
                    {item.icon}
                  </div>
                  <div className="text-center">
                    <span className="text-xs sm:text-sm font-bold text-neutral-800 block group-hover:text-[#ea7a24] transition-colors">{item.name}</span>
                    <span className="text-[10px] sm:text-xs text-neutral-500">{item.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to="/faq" className="text-[#ea7a24] font-bold text-lg hover:underline transition-all">
                Често задавани въпроси
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Curved Divider Inverted */}
      <div className="relative h-16 sm:h-24 bg-[#1a202c] w-full overflow-hidden -mt-px">
        <svg className="absolute top-0 left-0 w-full h-16 sm:h-24 text-slate-50 block" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="currentColor" fillOpacity="1" d="M0,224L80,213.3C160,203,320,181,480,192C640,203,800,245,960,250.7C1120,256,1280,224,1360,208L1440,192L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
        </svg>
      </div>

      {/* Pricing & CTA Dark Section */}
      <section className="bg-[#1a202c] pb-12 sm:pb-20 md:pb-24 px-4">
        <Reveal>
          <div className="max-w-4xl mx-auto text-center text-white">

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-rubik font-bold mb-4 sm:mb-6">Готови ли сте за тренировка?</h2>

            <p className="text-base sm:text-lg text-white/80 mb-8 sm:mb-12 leading-relaxed max-w-2xl mx-auto">
              Залата предлага сигурна и приятелска атмосфера, в която децата могат да се движат,
              да се учат и да се развиват. Тренировките са насочени към дългосрочно изграждане на умения
              и любов към движението.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:gap-8 mb-12 sm:mb-16 px-2 sm:px-4">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 hover:bg-white/10 transition-colors">
                <h3 className="text-sm sm:text-base md:text-xl font-medium text-white/80 mb-2 sm:mb-4">Единична тренировка</h3>
                <div className="flex justify-center items-baseline gap-1 mb-1 sm:mb-2">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">24</span>
                  <span className="text-sm sm:text-lg md:text-xl text-white/60">лв</span>
                </div>
                <p className="text-xs sm:text-sm text-white/40">Подходящо за начало</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 hover:bg-white/10 transition-colors">
                <h3 className="text-sm sm:text-base md:text-xl font-medium text-white/80 mb-2 sm:mb-4">Карта - 8 тренировки</h3>
                <div className="flex justify-center items-baseline gap-1 mb-1 sm:mb-2">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">144</span>
                  <span className="text-sm sm:text-lg md:text-xl text-white/60">лв</span>
                </div>
                <p className="text-xs sm:text-sm text-white/40">Валидност 2 месеца</p>
              </div>
            </div>

            <p className="text-white/50 text-xs sm:text-sm mb-8 sm:mb-12 max-w-lg mx-auto">
              * Отстъпки за деца от едно семейство и членове на СК "Чудните скали"
            </p>

            <button
              onClick={handleBookSessionClick}
              className="group relative inline-flex items-center gap-2 sm:gap-3 bg-white text-[#1a202c] text-base sm:text-lg md:text-xl font-bold py-3 sm:py-4 md:py-5 px-6 sm:px-8 md:px-10 rounded-full hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] transition-all duration-300"
            >
              Запази час
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>

          </div>
        </Reveal>
      </section>

      {/* Gallery Section */}
      <Gallery />

      {/* Image Modal for Thumbnails */}
      {selectedImageIndex !== null && (
        <ImageModal
          images={thumbnailImages}
          selectedIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}

      <Footer />

      {/* Mobile Bottom Navigation - Only for climbers */}
      <ClimberMobileBottomNav />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        showRegisterLink={true}
      />
    </div>
  );
};

export default Home;
