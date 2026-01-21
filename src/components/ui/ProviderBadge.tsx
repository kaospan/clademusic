import { MusicProvider } from '@/types';
import { PROVIDER_INFO } from '@/lib/providers';
import { cn } from '@/lib/utils';

interface ProviderBadgeProps {
  provider: MusicProvider;
  className?: string;
  showIcon?: boolean;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProviderBadge({ 
  provider, 
  className, 
  showIcon = true, 
  showName = true,
  size = 'md'
}: ProviderBadgeProps) {
  const info = PROVIDER_INFO[provider];
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-0.5',
    md: 'px-2 py-0.5 text-xs gap-1',
    lg: 'px-3 py-1 text-sm gap-1.5',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium',
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: `${info.color}20`,
        color: info.color 
      }}
    >
      {showIcon && <span className={size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : 'text-xs'}>{info.icon}</span>}
      {showName && <span>{info.name}</span>}
    </span>
  );
}
