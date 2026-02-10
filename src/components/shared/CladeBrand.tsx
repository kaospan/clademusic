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
  const iconSizeClass = {
    sm: 'w-4 h-4 md:w-[18px] md:h-[18px]',
    md: 'w-5 h-5 md:w-[22px] md:h-[22px]',
    lg: 'w-6 h-6 md:w-[26px] md:h-[26px]',
  }[size];

  return (
    <NavLink
      to={to}
      className={cn('inline-flex items-center gap-2 select-none leading-none drop-shadow-sm', className)}
      aria-label="Clade home"
    >
      <CladeLogoAnimated size={iconSize} className={cn('text-primary shrink-0', iconSizeClass, iconClassName)} />
      <CladeWordmark size={size} className={cn('tracking-tight', wordmarkClassName)} />
    </NavLink>
  );
}

