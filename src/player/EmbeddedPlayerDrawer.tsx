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
  const [spotifyMinimized, setSpotifyMinimized] = useState(false);
  const [youtubeMinimized, setYoutubeMinimized] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  // Auto-minimize the other player when one opens/expands
  useEffect(() => {
    if (spotifyOpen && !spotifyMinimized) {
      setYoutubeMinimized(true);
    }
  }, [spotifyOpen, spotifyMinimized]);

  useEffect(() => {
    if (youtubeOpen && !youtubeMinimized) {
      setSpotifyMinimized(true);
    }
  }, [youtubeOpen, youtubeMinimized]);

  const renderPlayer = (type: 'spotify' | 'youtube', isMinimized: boolean, setMinimized: (val: boolean) => void, close: () => void, trackId: string | null, autoplay: boolean, isOpen: boolean) => {
    if (!isOpen) return null;

    const meta = providerMeta[type];

    return (
      <motion.div
        key={`player-${type}`}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="pointer-events-auto w-[320px]"
      >
        <div className={`overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${meta.color} shadow-2xl backdrop-blur-xl`}>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-background/60">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-xl shadow-inner">{meta.badge}</span>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Now Playing</span>
                <span className="text-sm font-bold text-foreground">{meta.label}</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQueueOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="View queue"
              >
                <Menu className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMinimized(!isMinimized)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label={isMinimized ? 'Expand player' : 'Minimize player'}
              >
                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="Close player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!isMinimized && (
              <motion.div
                key={`player-body-${type}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="px-3 pb-3"
              >
                <div className="overflow-hidden rounded-xl">
                  {type === 'spotify' ? (
                    <SpotifyEmbedPreview providerTrackId={trackId} autoplay={autoplay} />
                  ) : (
                    <YouTubePlayer providerTrackId={trackId} autoplay={autoplay} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="pointer-events-none fixed bottom-0 right-4 z-50 pb-20 flex gap-3 items-end">
      <AnimatePresence>
        {renderPlayer('youtube', youtubeMinimized, setYoutubeMinimized, closeYoutube, youtubeTrackId, autoplayYoutube, youtubeOpen)}
      </AnimatePresence>
      <AnimatePresence>
        {renderPlayer('spotify', spotifyMinimized, setSpotifyMinimized, closeSpotify, spotifyTrackId, autoplaySpotify, spotifyOpen)}
      </AnimatePresence>

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
    </div>
  );
}