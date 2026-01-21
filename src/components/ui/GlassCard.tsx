import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  rounded?: 'md' | 'lg' | 'xl' | '2xl';
}

export function GlassCard({ 
  children, 
  hover = true,
  padding = 'md',
  rounded = 'xl',
  className,
  ...props 
}: GlassCardProps) {
  const paddingClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };
  
  const roundedClasses = {
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  };
  
  return (
    <div
      className={cn(
        'glass',
        roundedClasses[rounded],
        paddingClasses[padding],
        hover && 'hover:bg-muted/30 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
