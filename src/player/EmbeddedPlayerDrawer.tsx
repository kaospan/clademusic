import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, X, Menu } from 'lucide-react';
import { usePlayer } from './PlayerContext';
import { YouTubePlayer } from './providers/YouTubePlayer';
import { SpotifyEmbedPreview } from './providers/SpotifyEmbedPreview';
import { QueueSheet } from './QueueSheet';

const providerMeta = {
  spotify: { label: 'Spotify', badge: '🎧', color: 'from-green-500/20 to-green-600/10' },
  youtube: { label: 'YouTube', badge: '▶', color: 'from-red-500/20 to-red-600/10' },
} as const;

export function EmbeddedPlayerDrawer() {
  const {
    spotifyOpen,
    youtubeOpen,
    spotifyTrackId,
    youtubeTrackId,
    autoplaySpotify,
    autoplayYoutube,
    closeSpotify,
    closeYoutube,
    queue,
    queueIndex,
    playFromQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    shuffleQueue,
  } = usePlayer();
  const [isMinimized, setIsMinimized] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  // Determine which player is active
  const activePlayer = spotifyOpen ? 'spotify' : youtubeOpen ? 'youtube' : null;
  const isOpen = spotifyOpen || youtubeOpen;
  
  const currentTrackId = activePlayer === 'spotify' ? spotifyTrackId : youtubeTrackId;
  const currentAutoplay = activePlayer === 'spotify' ? autoplaySpotify : autoplayYoutube;
  const closePlayer = activePlayer === 'spotify' ? closeSpotify : closeYoutube;
  const meta = activePlayer ? providerMeta[activePlayer] : null;

  if (!isOpen || !meta) return null;

  return (
    <>
      {/* Single Interchangeable Player - EXACT same position for Spotify & YouTube */}
      <motion.div
        drag={isMinimized ? "y" : false}
        dragConstraints={{ top: 0, bottom: 200 }}
        dragElastic={0.1}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="pointer-events-auto fixed bottom-16 md:bottom-0 left-0 right-0 md:left-auto md:right-4 z-[100] md:pb-20 w-full md:w-[360px] md:max-w-[360px] px-2 md:px-0"
      >
        <div className={`overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${meta.color} shadow-2xl backdrop-blur-xl`}>
          {/* Header - Always visible, compact on mobile */}
          <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-background/80 backdrop-blur">
            <span className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-background/80 text-lg md:text-xl shadow-inner">
              {meta.badge}
            </span>
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Now Playing</span>
              <span className="text-xs md:text-sm font-bold text-foreground truncate">{meta.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQueueOpen(true)}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="View queue"
              >
                <Menu className="h-3 w-3 md:h-4 md:w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label={isMinimized ? 'Expand player' : 'Minimize player'}
              >
                {isMinimized ? <ChevronUp className="h-3 w-3 md:h-4 md:w-4" /> : <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />}
              </button>
              <button
                type="button"
                onClick={closePlayer}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="Close player"
              >
                <X className="h-3 w-3 md:h-4 md:w-4" />
              </button>
            </div>
          </div>

          {/* Player Body - Shorter on mobile, hidden when minimized on desktop */}
          <AnimatePresence initial={false}>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="px-2 pb-2 md:px-3 md:pb-3"
              >
                <div className="overflow-hidden rounded-xl">
                  {activePlayer === 'spotify' ? (
                    <SpotifyEmbedPreview providerTrackId={currentTrackId} autoplay={currentAutoplay} />
                  ) : (
                    <YouTubePlayer providerTrackId={currentTrackId} autoplay={currentAutoplay} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Queue Sheet */}
      <QueueSheet
        open={queueOpen}
        onOpenChange={setQueueOpen}
        queue={queue}
        currentIndex={queueIndex}
        onPlayTrack={playFromQueue}
        onRemoveTrack={removeFromQueue}
        onReorderQueue={reorderQueue}
        onClearQueue={clearQueue}
        onShuffleQueue={shuffleQueue}
      />
    </>
  );
}