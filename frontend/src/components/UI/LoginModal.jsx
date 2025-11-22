import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Logo from './Logo';

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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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

  const handleOverlayClick = (e) => {
    // Close only if clicking the overlay itself, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-md">
        <Card className="border border-[rgba(0,0,0,0.1)] rounded-[10px] relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Затвори"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

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
                  value: 6,
                  message: 'Паролата трябва да бъде поне 6 символа',
                },
              })}
              error={errors.password?.message}
            />

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
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
        </Card>
      </div>
    </div>
  );
};

export default LoginModal;

