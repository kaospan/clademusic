import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';

const AuthGatePage = () => {
  const { user, loading, guestMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/feed', { replace: true });
    } else if (guestMode) {
      navigate('/feed', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, guestMode, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <LoadingSpinner size="lg" />
    </div>
  );
};

export default AuthGatePage;
