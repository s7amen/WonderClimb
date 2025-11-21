import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Card from '../../components/UI/Card';
import Logo from '../../components/UI/Logo';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);

    // Roles are automatically assigned as "climber" - no need to send them
    // Split name into firstName and lastName (simple split on first space)
    const nameParts = (data.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
    
    const result = await registerUser({
      email: data.email,
      password: data.password,
      firstName: firstName,
      lastName: lastName,
    });

    if (result.success) {
      // Redirect based on user role (all new users get "climber" role)
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
      setError(result.error || 'Регистрацията неуспешна');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f3f5] py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border border-[rgba(0,0,0,0.1)] rounded-[10px]">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="mt-2 text-sm text-[#4a5565]">Създайте профил</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-[10px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Име"
            type="text"
            {...register('name', {
              required: 'Името е задължително',
            })}
            error={errors.name?.message}
          />

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
                value: 6,
                message: 'Паролата трябва да бъде поне 6 символа',
              },
            })}
            error={errors.password?.message}
          />

          <Input
            label="Потвърди парола"
            type="password"
            {...register('confirmPassword', {
              required: 'Моля, потвърдете паролата',
              validate: (value) =>
                value === password || 'Паролите не съвпадат',
            })}
            error={errors.confirmPassword?.message}
          />

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full bg-[#ea7a24] hover:bg-[#d86a1a] text-white rounded-[10px]"
          >
            {loading ? 'Създаване на профил...' : 'Създай профил'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#4a5565]">
            Вече имате профил?{' '}
            <Link to="/login" className="text-[#ea7a24] hover:text-[#d86a1a] font-medium">
              Влезте
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;

