import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackCard } from '@/components/TrackCard';
import { FeedSkeleton } from '@/components/FeedSkeleton';
import { FeedSidebar } from '@/components/FeedSidebar';
import { LiveChat } from '@/components/LiveChat';
import { ScrollingComments } from '@/components/ScrollingComments';
import { BottomNav } from '@/components/BottomNav';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { ResponsiveContainer, DesktopColumns } from '@/components/layout/ResponsiveLayout';
import { useFeedTracks } from '@/hooks/api/useTracks';
import { useSpotifyRecentlyPlayed } from '@/hooks/api/useSpotifyUser';
import { useAuth } from '@/hooks/useAuth';
import { InteractionType, Track } from '@/types';
import { ChevronUp, ChevronDown, LogIn, AlertCircle, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  getSearchHistory, 
  type SearchHistoryItem 
} from '@/lib/searchHistory';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Fetch from multiple sources
  const { data: trackResult, isLoading: tracksLoading, error: tracksError } = useFeedTracks(50);
  const { data: spotifyData, isLoading: spotifyLoading } = useSpotifyRecentlyPlayed(20);
  
  // Merge Spotify recently played with feed tracks, preferring Spotify when available
  const feedTracks = trackResult?.tracks ?? [];
  const spotifyTracks = spotifyData?.tracks ?? [];
  
  // Combine: Spotify recently played first, then fill with other tracks (deduped by ID and spotify_id)
  const tracks: Track[] = (() => {
    if (spotifyTracks.length > 0) {
      const spotifyIds = new Set(spotifyTracks.map(t => t.spotify_id).filter(Boolean));
      const seenIds = new Set(spotifyTracks.map(t => t.id).filter(Boolean));
      const otherTracks = feedTracks.filter(t => 
        !spotifyIds.has(t.spotify_id) && !seenIds.has(t.id)
      );
      return [...spotifyTracks, ...otherTracks];
    }
    // Deduplicate feedTracks by ID and spotify_id
    const seen = new Set<string>();
    return feedTracks.filter(t => {
      const key = t.spotify_id || t.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  
  const dataSource = spotifyTracks.length > 0 ? 'spotify' : trackResult?.source;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interactions, setInteractions] = useState<Map<string, Set<InteractionType>>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);
  
  // PiP state - managed at feed level so it persists across track changes
  const [pipVideo, setPipVideo] = useState<{ videoId: string; title: string } | null>(null);

  const handleInteraction = (type: InteractionType) => {
    if (!user) {
      navigate('/auth');
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

  // Handle entering PiP mode from TrackCard
  const handlePipModeActivate = (videoId: string, title: string) => {
    setPipVideo({ videoId, title });
  };

  // Handle clicking a search history item
  const handleHistoryClick = (item: SearchHistoryItem) => {
    if (item.track) {
      navigate(`/track/${encodeURIComponent(item.track.id)}`);
    } else {
      navigate('/search');
    }
  };

  if (authLoading || tracksLoading) {
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
    <div className="min-h-screen bg-background flex flex-col touch-pan-y" ref={containerRef}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-strong safe-top">
        <ResponsiveContainer maxWidth="full">
          <div className="flex items-center justify-between py-3">
            <h1 className="text-lg lg:text-xl font-bold gradient-text">HarmonyFeed</h1>
            <div className="flex items-center gap-3 lg:gap-4">
              <span className="text-xs lg:text-sm text-muted-foreground flex items-center gap-1">
              {currentIndex + 1} / {tracks.length}
              {dataSource === 'spotify' && (
                <span className="ml-1 text-[#1DB954] flex items-center gap-0.5" title="Your Spotify history">
                  <Music className="w-3 h-3" />
                </span>
              )}
              {dataSource === 'seed' && (
                <span className="ml-1 text-amber-500" title="Using demo data">•</span>
              )}
            </span>
            {!user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
            )}
          </div>
        </div>
        </ResponsiveContainer>
      </header>

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
          {/* Recent search history section (shown at the top) */}
          {searchHistory.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 max-w-lg mx-auto lg:max-w-2xl"
            >
              <div className="glass rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Recent Searches
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/search')}
                    className="h-7 text-xs"
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-2">
                  {searchHistory.slice(0, 3).map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleHistoryClick(item)}
                      className="p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Music className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {item.track ? (
                            <>
                              <div className="font-medium text-sm truncate">{item.track.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{item.track.artist}</div>
                            </>
                          ) : (
                            <div className="font-medium text-sm">{item.query}</div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
          <DesktopColumns
            left={
              <FeedSidebar
                currentTrack={currentTrack}
                trackIndex={currentIndex}
                totalTracks={tracks.length}
              />
            }
            center={
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
                        onPipModeActivate={handlePipModeActivate}
                        isPipActive={pipVideo?.videoId === currentTrack.youtube_id}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            }
            right={
              <div className="sticky top-20 space-y-4">
                <LiveChat roomType="global" className="h-[calc(100vh-8rem)]" />
              </div>
            }
            centerWidth="wide"
          />
        </ResponsiveContainer>
      </main>

      {/* Picture-in-Picture mini player - persists across track changes */}
      <AnimatePresence>
        {pipVideo && (
          <YouTubeEmbed
            key={`pip-${pipVideo.videoId}`}
            videoId={pipVideo.videoId}
            title={pipVideo.title}
            onClose={() => setPipVideo(null)}
            onPipModeChange={(isPip) => {
              if (!isPip) setPipVideo(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Scrolling comments overlay for current track */}
      {tracks[currentIndex] && (
        <ScrollingComments roomId="global" maxVisible={3} scrollSpeed={4000} />
      )}

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
