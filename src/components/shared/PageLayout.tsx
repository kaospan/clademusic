import { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { CladeLogoAnimated } from '@/components/icons/CladeIcon';
import { ProfileCircle } from './ProfileCircle';

interface PageLayoutProps {
  /** Page title shown in header */
  title?: string;
  /** Custom header content (replaces title) */
  headerContent?: ReactNode;
  /** Right-aligned header action buttons */
  headerActions?: ReactNode;
  /** Main content */
  children: ReactNode;
  /** Use fixed header (default: sticky) */
  fixedHeader?: boolean;
  /** Hide bottom navigation */
  hideNav?: boolean;
  /** Additional class for main content */
  mainClassName?: string;
  /** Full-width content (no max-w constraint) */
  fullWidth?: boolean;
}

/**
 * Standard page layout wrapper with consistent header, main, and navigation.
 * Reduces duplication across pages by providing a common structure.
 */
export function PageLayout({
  title,
  headerContent,
  headerActions,
  children,
  fixedHeader = false,
  hideNav = false,
  mainClassName = '',
  fullWidth = false,
}: PageLayoutProps) {
  const headerPositionClass = fixedHeader 
    ? 'fixed top-0 left-0 right-0' 
    : 'sticky top-0';
  
  const containerWidth = fullWidth ? '' : 'max-w-7xl mx-auto';
  const mainPadding = fixedHeader ? 'pt-16 pb-24' : 'pb-24';
  const headerPaddingClass = hideNav ? 'px-4 py-4' : 'pr-4 pl-36 sm:pl-44 py-4';

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
        <CladeLogoAnimated size={44} className="drop-shadow-lg" />
      </div>
      {/* Header */}
      <header className={`z-40 glass-strong safe-top ${headerPositionClass}`}>
        <div className={`${headerPaddingClass} ${containerWidth}`}>
          {headerContent ? (
            headerContent
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CladeLogoAnimated size={28} className="text-primary" />
                <h1 className="text-xl font-bold">{title}</h1>
              </div>
              <div className="flex items-center gap-3">
                {headerActions}
                <ProfileCircle />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`px-4 py-4 ${containerWidth} space-y-6 ${mainPadding} ${mainClassName}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && <BottomNav />}
    </div>
  );
}
