import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import Button from './Button';
import Input from './Input';
import Logo from './Logo';
import BaseModal from './BaseModal';
import FormField from './FormField';

const LoginModal = ({ isOpen, onClose, onLoginSuccess, showRegisterLink = true }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setError('');
    }
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);

    const result = await login(data.email, data.password);

    if (result.success) {
      // Call success callback if provided
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      // Close modal
      onClose();
    } else {
      setError(result.error || 'Влизането неуспешно');
    }

    setLoading(false);
  };

  const handleRegisterClick = () => {
    onClose();
    navigate('/register');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      className="p-0"
    >
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
        <FormField
          label="Имейл"
          name="email"
          error={errors.email?.message}
          required
        >
          <Input
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
        </FormField>

        <FormField
          label="Парола"
          name="password"
          error={errors.password?.message}
          required
        >
          <Input
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
        </FormField>

        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full mt-2"
        >
          {loading ? 'Влизане...' : 'Влез'}
        </Button>
      </form>

      {showRegisterLink && (
        <div className="mt-6 text-center">
          <p className="text-sm text-[#4a5565] mb-3">
            Нямате профил?
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={handleRegisterClick}
            className="w-full"
          >
            Регистрирайте се
          </Button>
        </div>
      )}
    </BaseModal>
  );
};

export default LoginModal;

