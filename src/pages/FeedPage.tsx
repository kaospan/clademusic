import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackCard } from '@/components/TrackCard';
import { FeedSkeleton } from '@/components/FeedSkeleton';
import { FeedSidebar } from '@/components/FeedSidebar';
import { LiveChat } from '@/components/LiveChat';
import { ScrollingComments } from '@/components/ScrollingComments';
import { BottomNav } from '@/components/BottomNav';
import { GuestBanner } from '@/components/GuestBanner';
import { ResponsiveContainer, DesktopColumns } from '@/components/layout/ResponsiveLayout';
import { useFeedTracks } from '@/hooks/api/useTracks';
import { useAuth } from '@/hooks/useAuth';
import { useLastFmStats } from '@/hooks/api/useLastFm';
import { useSpotifyRecommendations } from '@/hooks/api/useSpotifyUser';
import { InteractionType, Track } from '@/types';
import { ChevronUp, ChevronDown, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { usePlayer } from '@/player/PlayerContext';
import { CladeLogoAnimated } from '@/components/icons/CladeIcon';
import { ProfileCircle } from '@/components/shared';

export default function FeedPage() {
  const { user, loading: authLoading, guestMode, enterGuestMode } = useAuth();
  const { data: lastfmStats } = useLastFmStats();
  const navigate = useNavigate();
  
  // Fetch from multiple sources
  const { data: trackResult, isLoading: tracksLoading, error: tracksError } = useFeedTracks(50);
  const { data: recommendations = [], isLoading: recommendationsLoading } = useSpotifyRecommendations([], [], 50);

  // Always show both recent feed tracks and personalized recommendations (if available and signed-in).
  const baseFeed = trackResult?.tracks ?? [];
  const personalizedRecs = user ? recommendations : [];
  // Map Last.fm recent scrobbles to Track shape (no provider IDs; display-only)
  const lastfmRecent: Track[] = (lastfmStats?.recentTracks ?? []).map((t, idx) => ({
    id: `lastfm:${t.artist}-${t.name}-${t.playedAt?.getTime() ?? idx}`,
    title: t.name,
    artist: t.artist,
    album: t.album,
    cover_url: t.imageUrl,
    // Keep order as returned (newest first), no provider IDs to avoid quick-stream confusion
  }));

  // Merge in priority order: scrobbles (newest), base feed, personalized recs; dedupe by provider id or title+artist
  const tracks: Track[] = (() => {
    const seen = new Set<string>();
    const all = [...lastfmRecent, ...baseFeed, ...personalizedRecs];
    return all.filter((t) => {
      const title = (t.title || (t as any).name || '').toLowerCase().trim();
      const artist = (t.artist || t.artists?.[0] || '').toLowerCase().trim();
      const key = (t.spotify_id || t.youtube_id || `${title}|${artist}`) || t.id;
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interactions, setInteractions] = useState<Map<string, Set<InteractionType>>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(!user);
  const { openPlayer } = usePlayer();

  useEffect(() => {
    if (user || guestMode) {
      setShowAuthPrompt(false);
    }
  }, [user, guestMode]);
  
  const handleInteraction = (type: InteractionType) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    const trackId = tracks[currentIndex]?.id;
    if (!trackId) return;

    setInteractions((prev) => {
      const next = new Map(prev);
      const trackInteractions = new Set(prev.get(trackId) || []);

      if (trackInteractions.has(type)) {
        trackInteractions.delete(type);
      } else {
        trackInteractions.add(type);
      }

      next.set(trackId, trackInteractions);
      return next;
    });

    // Auto-advance on skip
    if (type === 'skip' && currentIndex < tracks.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goToNext = useCallback(() => {
    if (currentIndex < tracks.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, tracks.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  // Handle touch/scroll with improved swipe detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let startX = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const endX = e.changedTouches[0].clientX;
      const diffY = startY - endY;
      const diffX = Math.abs(startX - endX);
      const timeDiff = Date.now() - startTime;

      // Swipe threshold: at least 50px vertical, mostly vertical (not horizontal), completed within 500ms
      if (Math.abs(diffY) > 50 && Math.abs(diffY) > diffX && timeDiff < 500) {
        if (diffY > 0) {
          goToNext();
        } else {
          goToPrevious();
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goToNext, goToPrevious]);

  if (authLoading || tracksLoading || recommendationsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <FeedSkeleton />
        <BottomNav />
      </div>
    );
  }

  if (tracksError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load tracks</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const currentTrack = tracks[currentIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col touch-pan-y" ref={containerRef} data-feed>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-strong safe-top">
        <ResponsiveContainer maxWidth="full">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <CladeLogoAnimated size={24} className="text-primary" />
              <h1 className="text-lg lg:text-xl font-bold gradient-text">HarmonyFeed</h1>
            </div>
            <div className="flex items-center gap-3 lg:gap-4">
              <span className="text-xs lg:text-sm text-muted-foreground flex items-center gap-1">
                {currentIndex + 1} / {tracks.length}
              </span>
              {!user && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      enterGuestMode();
                      setShowAuthPrompt(false);
                    }}
                    className="gap-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Continue as guest</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/auth')}
                    className="gap-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign in</span>
                  </Button>
                </div>
              )}
              <ProfileCircle />
            </div>
          </div>
        </ResponsiveContainer>
      </header>

      {/* Guest demo CTA */}
      {showAuthPrompt && !user && (
        <div className="pt-16 px-4">
          <div className="mx-auto max-w-3xl rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">You’re exploring in guest mode.</p>
                <p className="text-xs text-muted-foreground">Sign in to like, comment, follow, and save tracks. Playback and browsing stay open.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => navigate('/auth')}>Sign in</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAuthPrompt(false)}>Maybe later</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation arrows (desktop) */}
      <div className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          className="glass"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="glass"
          onClick={goToNext}
          disabled={currentIndex === tracks.length - 1}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>

      {/* Feed content */}
      <main className="flex-1 pt-16 pb-24">
        <ResponsiveContainer maxWidth="full" className="py-6">
          {!user && (
            <div className="mx-auto mb-4 max-w-lg lg:max-w-2xl rounded-lg border border-border/60 bg-background/70 px-4 py-3 shadow-md backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Continue as guest to browse using the latest Last.fm scrobbles. You can switch to your account anytime.
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      enterGuestMode();
                      setShowAuthPrompt(false);
                    }}
                  >
                    Continue as guest
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/auth')}>
                    Sign in
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Simple center-focused layout for all users */}
          <div className="h-[calc(100vh-12rem)] max-w-lg mx-auto lg:max-w-2xl">
            <AnimatePresence mode="wait">
              {currentTrack && (
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <TrackCard
                    track={currentTrack}
                    isActive={true}
                    onInteraction={handleInteraction}
                    interactions={interactions.get(currentTrack.id) || new Set()}
                     onPipModeActivate={(videoId, title) => {
                       if (!videoId) return;
                       openPlayer({
                         canonicalTrackId: currentTrack.id,
                         provider: 'youtube',
                         providerTrackId: videoId,
                         autoplay: true,
                         context: 'feed',
                         title,
                         artist: currentTrack.artist,
                       });
                     }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ResponsiveContainer>
      </main>

      {/* Scrolling comments overlay for current track */}
      {tracks[currentIndex] && (
        <ScrollingComments roomId="global" maxVisible={3} scrollSpeed={4000} />
      )}

      {/* Guest banner */}
      <GuestBanner />

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
