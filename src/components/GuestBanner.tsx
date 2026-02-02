import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

/**
 * Persistent banner shown to guest users encouraging sign-up
 * Appears at bottom of screen with dismiss option
 * Reappears after 24h if dismissed
 */
export function GuestBanner() {
  const { guestMode, user } = useAuth();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(() => {
    const dismissed = localStorage.getItem('clade_guest_banner_dismissed');
    if (!dismissed) return false;
    const dismissedTime = parseInt(dismissed, 10);
    const dayInMs = 24 * 60 * 60 * 1000;
    return Date.now() - dismissedTime < dayInMs;
  });

  // Only show for guest users who haven't dismissed recently
  const shouldShow = guestMode && !user && !isDismissed;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('clade_guest_banner_dismissed', Date.now().toString());
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t border-border/50" />
          
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            {/* Message */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#FF00FF]">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground mb-0.5">
                  Join the Conversation
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  Sign up to comment, like, and connect with music lovers
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleSignUp}
                className="bg-gradient-to-r from-[#00F5FF] to-[#FF00FF] hover:opacity-90 transition-opacity shadow-lg shadow-[#00F5FF]/20"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Sign Up</span>
                <span className="sm:hidden">Join</span>
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
