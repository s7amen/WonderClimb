import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../../context/AuthContext';
import { parentClimbersAPI, authAPI } from '../../services/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Card from '../../components/UI/Card';
import Logo from '../../components/UI/Logo';
import Checkbox from '../../components/UI/Checkbox';
import { useToast } from '../../components/UI/Toast';
import EyeIcon from '../../components/UI/EyeIcon';
import { formatDateForInput } from '../../utils/dateUtils';

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
  const backgroundRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  // Parallax effect for background
  useEffect(() => {
    const handleScroll = () => {
      if (backgroundRef.current) {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5; // Adjust speed (0.5 = moves at half the scroll speed)
        backgroundRef.current.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Parallax background */}
      <div
        ref={backgroundRef}
        className="absolute inset-0 w-full h-[120%]"
        style={{
          backgroundImage: 'url(/images/boulder-kids-wall.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          willChange: 'transform',
        }}
      ></div>
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>
      
      {/* Content container */}
      <div className="relative z-10 w-full max-w-4xl">
        <Card className="w-full border border-white/50 rounded-[10px] backdrop-blur-md" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
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
          <div className="mb-4">
            <Button
              type="button"
              variant="secondary"
              onClick={addChild}
              className="w-full flex items-center justify-center gap-2"
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

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full bg-[#ea7a24] hover:bg-[#d86a1a] text-white rounded-[10px]"
          >
            {loading ? 'Създаване на профил...' : 'Създай профил'}
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

        {/* Gmail OAuth Button */}
        <Button
          type="button"
          variant="secondary"
          onClick={() => authAPI.googleAuth()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 border border-gray-300"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Регистрирай се с Google
        </Button>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#4a5565]">
            Вече имате профил?{' '}
            <Link to="/login" className="text-[#ea7a24] hover:text-[#d86a1a] font-medium">
              Влезте
            </Link>
          </p>
        </div>
        </Card>
      </div></div>
  );
};

export default Register;
