import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        // Climbers can access parent dashboard to manage their profile and linked children
        navigate('/parent/profile');
      } else {
        navigate('/');
      }
    } else {
      setError(result.error || 'Влизането неуспешно');
    }
    
    setLoading(false);
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

