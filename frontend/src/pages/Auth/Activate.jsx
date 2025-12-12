import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Logo from '../../components/UI/Logo';
import Loading from '../../components/UI/Loading';

const Activate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: loginUser } = useAuth();
  const [status, setStatus] = useState('loading'); // loading, success, error, expired
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Невалиден линк за активиране');
      return;
    }

    handleActivation();
  }, [token]);

  const handleActivation = async () => {
    try {
      setActivating(true);
      const response = await authAPI.activate(token);
      const { token: accessToken, user } = response.data;

      // Store token and user
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      setStatus('success');

      // Redirect after 2 seconds
      setTimeout(() => {
        if (user?.roles?.includes('admin')) {
          navigate('/admin/dashboard');
        } else if (user?.roles?.includes('coach')) {
          navigate('/coach/dashboard');
        } else if (user?.roles?.includes('climber')) {
          navigate('/sessions');
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Грешка при активиране на акаунта';
      setError(errorMessage);
      
      if (errorMessage.includes('изтекъл')) {
        setStatus('expired');
      } else {
        setStatus('error');
      }
    } finally {
      setActivating(false);
    }
  };

  const handleResend = async () => {
    try {
      // This would require user to be logged in, so redirect to login
      navigate('/login?resendActivation=true');
    } catch (err) {
      console.error('Error redirecting to resend:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f3f3f5]">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-medium text-neutral-950">Активиране на акаунт</h1>
        </div>

        {status === 'loading' && activating && (
          <div className="text-center py-8">
            <Loading text="Активиране на акаунт..." />
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-green-600 mb-2">Акаунтът е активиран успешно!</h2>
            <p className="text-gray-600 mb-4">Пренасочване...</p>
          </div>
        )}

        {status === 'expired' && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-yellow-600 mb-2">Линкът е изтекъл</h2>
            <p className="text-gray-600 mb-4">
              Линкът за активиране е изтекъл. Моля, поискайте нов линк.
            </p>
            <Button onClick={handleResend} variant="primary">
              Поискай нов линк
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-red-600 mb-2">Грешка при активиране</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/login')} variant="primary">
                Към влизане
              </Button>
              <Button onClick={handleResend} variant="secondary">
                Поискай нов линк
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Activate;



