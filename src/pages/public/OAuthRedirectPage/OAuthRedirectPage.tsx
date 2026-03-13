import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function OAuthRedirectPage() {
  const { handleToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      handleToken(token);
      navigate('/app/todos', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }, []);

  return <p>Redirecting…</p>;
}
