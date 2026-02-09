import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CladeLogoAnimated } from '@/components/icons/CladeIcon';
import { CladeWordmark } from '@/components/shared/CladeWordmark';

interface CladeBrandProps {
  to?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  iconClassName?: string;
  wordmarkClassName?: string;
}

export function CladeBrand({
  to = '/feed',
  className,
  size = 'md',
  iconClassName,
  wordmarkClassName,
}: CladeBrandProps) {
  const iconSize = { sm: 18, md: 22, lg: 26 }[size];

  return (
    <NavLink
      to={to}
      className={cn('inline-flex items-center gap-2 select-none leading-none drop-shadow-sm', className)}
      aria-label="Clade home"
    >
      <CladeLogoAnimated size={iconSize} className={cn('text-primary', iconClassName)} />
      <CladeWordmark size={size} className={cn('tracking-tight', wordmarkClassName)} />
    </NavLink>
  );
}

