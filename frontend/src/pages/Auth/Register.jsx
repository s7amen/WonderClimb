import { useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../../context/AuthContext';
import { parentClimbersAPI } from '../../services/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Card from '../../components/UI/Card';
import Logo from '../../components/UI/Logo';
import Checkbox from '../../components/UI/Checkbox';
import { useToast } from '../../components/UI/Toast';
import EyeIcon from '../../components/UI/EyeIcon';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import GoogleButton from '../../components/UI/GoogleButton';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [children, setChildren] = useState([]);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const addChild = () => {
    setChildren([...children, { id: Date.now(), firstName: '', middleName: '', lastName: '', dateOfBirth: '', notes: '' }]);
  };

  const removeChild = (id) => {
    setChildren(children.filter(child => child.id !== id));
  };

  const updateChild = (id, field, value) => {
    setChildren(children.map(child => 
      child.id === id ? { ...child, [field]: value } : child
    ));
  };

  const validateChildren = () => {
    for (const child of children) {
      if (!child.firstName || !child.firstName.trim()) {
        return 'Всички деца трябва да имат попълнено име';
      }
      if (!child.lastName || !child.lastName.trim()) {
        return 'Всички деца трябва да имат попълнена фамилия';
      }
      if (child.dateOfBirth && isNaN(new Date(child.dateOfBirth).getTime())) {
        return 'Невалидна дата на раждане за едно от децата';
      }
    }
    return null;
  };

  const onSubmit = async (data) => {
    setError('');
    
    // Validate captcha only if site key is configured
    if (recaptchaSiteKey && !captchaToken) {
      setError('Моля, потвърдете че не сте робот');
      return;
    }

    // Validate terms acceptance
    if (!data.acceptTerms) {
      setError('Моля, приемете условията за ползване');
      if (captchaRef.current) {
        captchaRef.current.reset();
        setCaptchaToken(null);
      }
      return;
    }

    // Validate children
    const childrenError = validateChildren();
    if (childrenError) {
      setError(childrenError);
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || '',
        recaptchaToken: captchaToken,
      });

      if (result.success) {
        // Check if activation is required
        if (result.requiresActivation) {
          // Store email for CheckEmail page
          localStorage.setItem('pendingActivationEmail', data.email);
          navigate('/check-email');
          return;
        }

        // Check if user was logged in (activation email might be disabled)
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        
        // Create children if any and user is logged in
        if (user && children.length > 0) {
          try {
            const childPromises = children.map(child => 
              parentClimbersAPI.create({
                firstName: child.firstName.trim(),
                middleName: child.middleName?.trim() || '',
                lastName: child.lastName.trim(),
                dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString() : null,
                notes: child.notes?.trim() || '',
              })
            );
            
            await Promise.all(childPromises);
            showToast(`Профилът и ${children.length} ${children.length === 1 ? 'детето' : 'децата'} са създадени успешно!`, 'success', 5000);
          } catch (childError) {
            console.error('Error creating children:', childError);
            showToast('Профилът е създаден, но имаше проблем при добавянето на децата', 'warning', 5000);
          }
        } else if (user) {
          showToast('Профилът е създаден успешно!', 'success', 3000);
        } else {
          // User not logged in - activation email was sent
          // Store email for CheckEmail page
          localStorage.setItem('pendingActivationEmail', data.email);
          navigate('/check-email');
          return;
        }

        // Small delay to show success message
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if there's a redirect parameter
        const fromParam = searchParams.get('from');
        if (fromParam) {
          navigate(fromParam);
          return;
        }

        // Redirect based on user role
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
        setError(result.error || 'Регистрацията неуспешна');
        if (captchaRef.current) {
          captchaRef.current.reset();
          setCaptchaToken(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Регистрацията неуспешна');
      if (captchaRef.current) {
        captchaRef.current.reset();
        setCaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  return (
    <div className="min-h-screen bg-[#f3f3f5] flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-4xl border border-[rgba(0,0,0,0.1)] rounded-[10px]">
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
          {/* First Name and Last Name on one row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Име"
              type="text"
              {...register('firstName', {
                required: 'Името е задължително',
              })}
              error={errors.firstName?.message}
              autoFocus
            />
            <Input
              label="Фамилия"
              type="text"
              {...register('lastName', {
                required: 'Фамилията е задължителна',
              })}
              error={errors.lastName?.message}
            />
          </div>

          {/* Password and Confirm Password on second row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-neutral-950 mb-1">
                Парола
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Паролата е задължителна',
                    minLength: {
                      value: 5,
                      message: 'Паролата трябва да бъде поне 5 символа',
                    },
                  })}
                  className={`
                    w-full px-3 py-2 pr-20 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px]
                    focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24]
                    text-sm text-neutral-950 placeholder:text-[#99a1af]
                    ${errors.password ? 'border-red-500' : ''}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5565] hover:text-[#ea7a24] w-5 h-5 flex items-center justify-center"
                  aria-label={showPassword ? 'Скрий парола' : 'Покажи парола'}
                  tabIndex={-1}
                >
                  <EyeIcon open={!showPassword} className="w-5 h-5" />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-950 mb-1">
                Потвърди парола
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Моля, потвърдете паролата',
                    validate: (value) =>
                      value === password || 'Паролите не съвпадат',
                  })}
                  className={`
                    w-full px-3 py-2 pr-20 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px]
                    focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24]
                    text-sm text-neutral-950 placeholder:text-[#99a1af]
                    ${errors.confirmPassword ? 'border-red-500' : ''}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5565] hover:text-[#ea7a24] w-5 h-5 flex items-center justify-center"
                  aria-label={showConfirmPassword ? 'Скрий парола' : 'Покажи парола'}
                  tabIndex={-1}
                >
                  <EyeIcon open={!showConfirmPassword} className="w-5 h-5" />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Email and Phone on third row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
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
              label="Телефон"
              type="tel"
              {...register('phone', {
                pattern: {
                  value: /^[0-9+\-\s()]+$/,
                  message: 'Невалиден телефонен номер',
                },
              })}
              error={errors.phone?.message}
            />
          </div>

          {/* Children Forms */}
          {children.length > 0 && (
            <div className="mb-4 space-y-4 p-4 bg-gray-50 rounded-[10px]">
              <h3 className="text-sm font-medium text-neutral-950 mb-3">Деца:</h3>
              {children.map((child) => (
                <div key={child.id} className="relative bg-white p-4 rounded-[10px] border border-[#d1d5dc]">
                  <button
                    type="button"
                    onClick={() => removeChild(child.id)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-xl font-bold w-6 h-6 flex items-center justify-center"
                    title="Премахни дете"
                  >
                    ×
                  </button>
                  <div className="space-y-3">
                    {/* First row: Names */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">Име</label>
                        <input
                          type="text"
                          value={child.firstName}
                          onChange={(e) => updateChild(child.id, 'firstName', e.target.value)}
                          className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">Презиме</label>
                        <input
                          type="text"
                          value={child.middleName}
                          onChange={(e) => updateChild(child.id, 'middleName', e.target.value)}
                          className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">Фамилия</label>
                        <input
                          type="text"
                          value={child.lastName}
                          onChange={(e) => updateChild(child.id, 'lastName', e.target.value)}
                          className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                        />
                      </div>
                    </div>
                    {/* Second row: Date of birth and Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">Дата на раждане (dd/mm/yyyy)</label>
                        <input
                          type="date"
                          value={child.dateOfBirth}
                          onChange={(e) => updateChild(child.id, 'dateOfBirth', e.target.value)}
                          className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                          placeholder="dd/mm/yyyy"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-950 mb-1">Бележки</label>
                        <input
                          type="text"
                          value={child.notes}
                          onChange={(e) => updateChild(child.id, 'notes', e.target.value)}
                          className="w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Child Button */}
          <div className="mb-4 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={addChild}
              className="w-[240px] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добави профил на дете
            </Button>
          </div>

          {/* reCAPTCHA */}
          {recaptchaSiteKey && (
            <div className="mb-4 flex justify-center">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={recaptchaSiteKey}
                onChange={handleCaptchaChange}
              />
            </div>
          )}

          {/* Terms Checkbox */}
          <div className="mb-4">
            <Checkbox
              {...register('acceptTerms', {
                required: 'Трябва да приемете условията за ползване',
              })}
            >
              Приемам{' '}
              <Link to="/terms-of-service" target="_blank" className="text-[#ea7a24] hover:text-[#d86a1a] underline">
                условията за ползване
              </Link>
            </Checkbox>
            {errors.acceptTerms && (
              <p className="mt-1 text-sm text-red-600 ml-6">{errors.acceptTerms.message}</p>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-[240px] flex items-center justify-center bg-[#ea7a24] hover:bg-[#d86a1a] text-white rounded-[10px]"
            >
              {loading ? 'Създаване на профил...' : 'Създай профил'}
            </Button>
          </div>
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
        <div className="flex justify-center">
          <GoogleButton 
            disabled={loading} 
            text="Влез с Google"
            className="w-[240px]"
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#4a5565]">
            Вече имате профил?{' '}
            <Link to="/login" className="text-[#ea7a24] hover:text-[#d86a1a] font-medium">
              Влезте
            </Link>
          </p>
        </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Register;
