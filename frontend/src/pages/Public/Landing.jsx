import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';

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

      <Footer />
    </div>
  );
};

export default Home;
