import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Logo from '../../components/UI/Logo';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';

const CheckEmail = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState(() => {
    // Try to get email from localStorage (stored during registration)
    const storedEmail = localStorage.getItem('pendingActivationEmail');
    return storedEmail || '';
  });

  const handleResend = async () => {
    if (!email) {
      showToast('Моля, въведете имейл адрес', 'error');
      return;
    }

    try {
      setResending(true);
      await authAPI.resendActivationEmailByEmail(email);
      showToast('Ако акаунт с този имейл съществува и не е активиран, activation email ще бъде изпратен.', 'success');
    } catch (err) {
      // Always show success message for security (don't reveal if user exists)
      showToast('Ако акаунт с този имейл съществува и не е активиран, activation email ще бъде изпратен.', 'success');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f3f3f5]">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-medium text-neutral-950">Проверете имейла си</h1>
        </div>

        <div className="text-center py-8">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="text-xl font-medium text-neutral-950 mb-4">
            Моля, проверете имейла си за линк за активиране на акаунта
          </h2>

          {email && (
            <p className="text-gray-600 mb-2">
              Имейлът е изпратен на: <span className="font-medium">{email}</span>
            </p>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 mt-6">
            <p className="text-sm text-yellow-800">
              <strong>Важно:</strong> Ако не виждате имейла, проверете и папката <strong>Спам</strong>.
            </p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleResend} 
              variant="primary" 
              disabled={resending}
              className="w-full"
            >
              {resending ? (
                <>
                  <Loading text="Изпращане..." className="inline" />
                </>
              ) : (
                'Изпрати отново activation email'
              )}
            </Button>

            <Button 
              onClick={() => navigate('/login')} 
              variant="secondary"
              className="w-full"
            >
              Към влизане
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              След като активирате акаунта си, ще можете да се логнете и да използвате всички функции на платформата.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CheckEmail;

