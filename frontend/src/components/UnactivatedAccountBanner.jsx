import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { useToast } from './UI/Toast';
import Loading from './UI/Loading';

const UnactivatedAccountBanner = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [resending, setResending] = useState(false);

  // Don't show banner if user is not logged in or email is activated
  if (!user || user.emailActivationStatus === 'activated' || user.emailActivationStatus === null) {
    return null;
  }

  const handleResend = async () => {
    try {
      setResending(true);
      await authAPI.resendActivation();
      showToast('Имейлът е изпратен отново. Моля, проверете пощата си.', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Грешка при изпращане на имейл';
      showToast(errorMessage, 'error');
    } finally {
      setResending(false);
    }
  };

  const getStatusMessage = () => {
    if (user.emailActivationStatus === 'email_sent') {
      return 'Имейл за активиране е изпратен. Моля, проверете пощата си.';
    }
    return 'Акаунтът не е активиран. Моля, проверете имейла си за линк за активиране.';
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg className="h-5 w-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-800">
            <strong>Внимание:</strong> {getStatusMessage()}
          </p>
        </div>
        <button
          onClick={handleResend}
          disabled={resending}
          className="ml-4 px-4 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {resending ? (
            <>
              <Loading text="Изпращане..." className="inline" />
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Изпрати отново</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UnactivatedAccountBanner;




