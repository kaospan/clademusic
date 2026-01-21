import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  padding?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',   // 640px
  md: 'max-w-screen-md',   // 768px
  lg: 'max-w-screen-lg',   // 1024px
  xl: 'max-w-screen-xl',   // 1280px
  '2xl': 'max-w-screen-2xl', // 1536px
  full: 'max-w-full',
};

export function ResponsiveContainer({ 
  children, 
  maxWidth = 'xl', 
  className,
  padding = true 
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
  xl: 'gap-8 sm:gap-10',
};

export function ResponsiveGrid({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3 },
  gap = 'md',
  className 
}: ResponsiveGridProps) {
  const gridCols = [
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `sm:grid-cols-${cols.md}`,
    cols.lg && `md:grid-cols-${cols.lg}`,
    cols.xl && `lg:grid-cols-${cols.xl}`,
    cols['2xl'] && `xl:grid-cols-${cols['2xl']}`,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cn(
        'grid',
        gridCols,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

interface DesktopSidebarLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  sidebarWidth?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sidebarWidths = {
  sm: 'lg:w-64',
  md: 'lg:w-80',
  lg: 'lg:w-96',
};

export function DesktopSidebarLayout({ 
  sidebar, 
  main, 
  sidebarWidth = 'md',
  className 
}: DesktopSidebarLayoutProps) {
  return (
    <div className={cn('flex flex-col lg:flex-row gap-6 lg:gap-8', className)}>
      {/* Sidebar - full width on mobile, fixed width on desktop */}
      <aside className={cn(
        'w-full lg:flex-shrink-0',
        sidebarWidths[sidebarWidth]
      )}>
        {sidebar}
      </aside>
      
      {/* Main content - takes remaining space */}
      <main className="flex-1 min-w-0">
        {main}
      </main>
    </div>
  );
}

interface DesktopColumnsProps {
  left?: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  centerWidth?: 'narrow' | 'medium' | 'wide';
  className?: string;
}

const centerWidths = {
  narrow: 'lg:max-w-2xl',
  medium: 'lg:max-w-3xl',
  wide: 'lg:max-w-4xl',
};

export function DesktopColumns({ 
  left, 
  center, 
  right,
  centerWidth = 'medium',
  className 
}: DesktopColumnsProps) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8', className)}>
      {/* Left sidebar - hidden on mobile */}
      {left && (
        <aside className="hidden lg:block lg:col-span-3">
          {left}
        </aside>
      )}
      
      {/* Center content */}
      <main className={cn(
        'col-span-1',
        left && right ? 'lg:col-span-6' : left || right ? 'lg:col-span-9' : 'lg:col-span-12',
        'mx-auto w-full',
        centerWidths[centerWidth]
      )}>
        {center}
      </main>
      
      {/* Right sidebar - hidden on mobile */}
      {right && (
        <aside className="hidden lg:block lg:col-span-3">
          {right}
        </aside>
      )}
    </div>
  );
}
