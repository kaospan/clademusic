import { cn } from '@/lib/utils';

interface CladeWordmarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CladeWordmark({ className, size = 'md' }: CladeWordmarkProps) {
  const sizeClass = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  return (
    <span
      className={cn(
        'font-bold bg-gradient-to-r from-[#00F5FF] via-[#FF00FF] to-[#FFD700] bg-clip-text text-transparent',
        sizeClass,
        className
      )}
    >
      Clade
    </span>
  );
}

