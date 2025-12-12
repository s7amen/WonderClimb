import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/UI/Loading';

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserFromToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      // Redirect to login with error
      navigate(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      // Store token
      localStorage.setItem('token', token);
      
      // Fetch user info
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      fetch(`${apiBaseUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user info');
          }
          return res.json();
        })
        .then(data => {
          if (data.user) {
            // Update auth context with user data
            setUserFromToken(data.user);
            
            // Redirect based on role
            const user = data.user;
            if (user.roles?.includes('admin')) {
              navigate('/dashboard/admin');
            } else if (user.roles?.includes('coach')) {
              navigate('/dashboard/coach');
            } else if (user.roles?.includes('climber')) {
              navigate('/sessions');
            } else {
              navigate('/');
            }
          } else {
            navigate('/login?error=Failed to fetch user info');
          }
        })
        .catch(err => {
          console.error('Error fetching user info:', err);
          navigate('/login?error=Failed to complete authentication');
        });
    } else {
      navigate('/login?error=No token received');
    }
  }, [navigate, searchParams, setUserFromToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f3f5]">
      <Loading text="Завършване на влизането..." />
    </div>
  );
};

export default Callback;



