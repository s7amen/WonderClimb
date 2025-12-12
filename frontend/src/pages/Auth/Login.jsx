import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import Logo from '../../components/UI/Logo';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import Checkbox from '../../components/UI/Checkbox';
import { useToast } from '../../components/UI/Toast';
import GoogleButton from '../../components/UI/GoogleButton';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  useEffect(() => {
    // Check if user just registered
    if (searchParams.get('registered') === 'true') {
      showToast('Моля, проверете имейла си за линк за активиране на акаунта.', 'info', 8000);
    }
    // Check if resend activation was requested
    if (searchParams.get('resendActivation') === 'true') {
      setShowResendLink(true);
    }
  }, [searchParams, showToast]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    
    const result = await login(data.email, data.password);
    
    if (result.success) {
      // Redirect based on user role
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.roles?.includes('admin')) {
        navigate('/admin/dashboard');
      } else if (user?.roles?.includes('coach')) {
        navigate('/coach/dashboard');
      } else if (user?.roles?.includes('climber')) {
        navigate('/sessions');
      } else {
        navigate('/');
      }
    } else {
      const errorMessage = result.error || 'Влизането неуспешно';
      setError(errorMessage);
      
      // Show resend link if account is not activated
      if (errorMessage.includes('активиран') || errorMessage.includes('верифициран')) {
        setShowResendLink(true);
        setResendEmail(data.email);
      }
    }
    
    setLoading(false);
  };

  const handleResendActivation = async () => {
    try {
      await authAPI.resendActivation();
      showToast('Activation email е изпратен успешно. Моля, проверете имейла си.', 'success', 8000);
      setShowResendLink(false);
    } catch (err) {
      showToast('Грешка при изпращане на activation email. Моля, опитайте отново.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border border-[rgba(0,0,0,0.1)] rounded-[10px]">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="mt-2 text-sm text-[#4a5565]">Влезте в профила си</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-[10px]">
              {error}
              {showResendLink && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleResendActivation}
                    className="text-sm underline hover:no-underline"
                  >
                    Изпрати отново activation email
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Имейл"
              type="email"
              {...register('email', {
                required: 'Имейлът е задължителен',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Невалиден имейл адрес',
                },
              })}
              error={errors.email?.message}
            />

            <Input
              label="Парола"
              type="password"
              {...register('password', {
                required: 'Паролата е задължителна',
                minLength: {
                  value: 5,
                  message: 'Паролата трябва да бъде поне 5 символа',
                },
              })}
              error={errors.password?.message}
            />

            <div className="mb-4">
              <Checkbox
                label="Запомни ме"
                {...register('rememberMe')}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Влизане...' : 'Влез'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">или</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <GoogleButton disabled={loading} className="w-full" />

          <div className="mt-6 text-center">
            <p className="text-sm text-[#4a5565]">
              Нямате профил?{' '}
              <Link to="/register" className="text-[#ea7a24] hover:text-[#d86a1a] font-medium">
                Регистрирайте се
              </Link>
            </p>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Login;

