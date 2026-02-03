import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/api/useProfile';
import { cn } from '@/lib/utils';

type ProfileCircleProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses: Record<NonNullable<ProfileCircleProps['size']>, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
};

export function ProfileCircle({ className, size = 'md' }: ProfileCircleProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const fallback = useMemo(() => {
    const email = user?.email || '';
    return email ? email[0]?.toUpperCase() : 'U';
  }, [user?.email]);

  const handleClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      navigate('/auth');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn('inline-flex items-center justify-center rounded-full border border-border/60 bg-background/60 hover:bg-background/80 transition', className)}
      aria-label={user ? 'Open profile' : 'Sign in'}
      title={user ? 'Profile' : 'Sign in'}
    >
      {user ? (
        <Avatar className={cn(sizeClasses[size], 'border border-border/60')}>
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/15 text-primary font-semibold">
            {fallback}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span className={cn(sizeClasses[size], 'inline-flex items-center justify-center')}>
          <User className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
