import { ReactNode } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { CladeLogoAnimated } from '@/components/icons/CladeIcon';
import { ProfileCircle } from './ProfileCircle';
import { Link } from 'react-router-dom';

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`z-40 glass-strong safe-top ${headerPositionClass}`}>
        <div className={`px-4 py-4 ${containerWidth}`}>
          {headerContent ? (
            headerContent
          ) : (
            <div className="grid grid-cols-3 items-center">
              <div className="flex items-center gap-3 justify-self-start min-w-0">
                {title ? <h1 className="text-xl font-bold truncate">{title}</h1> : null}
              </div>

              <Link
                to="/"
                className="justify-self-center inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Clade home"
                title="Clade"
              >
                <CladeLogoAnimated size={34} className="drop-shadow-sm" />
              </Link>

              <div className="flex items-center gap-3 justify-self-end">
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
