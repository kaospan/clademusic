import { useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from './PlayerContext';
import { YouTubePlayer } from './providers/YouTubePlayer';
import { SpotifyEmbedPreview } from './providers/SpotifyEmbedPreview';
import { Volume2, VolumeX, Maximize2, X, ChevronDown, ChevronUp, Play, Pause, Square, SkipBack, SkipForward, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QueueSheet } from './QueueSheet';
import { SpotifyIcon, YouTubeIcon, AppleMusicIcon } from '@/components/QuickStreamButtons';

const providerMeta = {
  spotify: { label: 'Spotify', badge: '🎧', color: 'bg-black/90', Icon: SpotifyIcon },
  youtube: { label: 'YouTube', badge: '▶', color: 'bg-black/90', Icon: YouTubeIcon },
  apple_music: { label: 'Apple Music', badge: '', color: 'bg-neutral-900/90', Icon: AppleMusicIcon },
} as const;

type EmbeddedPlayerDrawerProps = {
  onNext?: () => void;
  onPrev?: () => void;
  canNext?: boolean;
  canPrev?: boolean;
};

export function EmbeddedPlayerDrawer({ onNext, onPrev, canNext, canPrev }: EmbeddedPlayerDrawerProps) {
  const {
    provider,
    trackId,
    trackTitle,
    trackArtist,
    lastKnownTitle,
    lastKnownArtist,
    positionMs,
    durationMs,
    volume,
    isMuted,
    isOpen,
    isMinimized,
    isMini,
    isCinema,
    miniPosition,
    enterCinema,
    exitCinema,
    isPlaying,
    togglePlayPause,
    setVolumeLevel,
    toggleMute,
    seekToMs,
    stop,
    closePlayer,
    collapseToMini,
    restoreFromMini,
    setMiniPosition,
    queue,
    queueIndex,
    playFromQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    shuffleQueue,
    nextTrack,
    previousTrack,
  } = usePlayer();
  const cinemaRef = useRef<HTMLDivElement | null>(null);
  const autoplay = isPlaying;
  const [showVideo, setShowVideo] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const resolvedTitle = trackTitle ?? lastKnownTitle ?? '';
  const resolvedArtist = trackArtist ?? lastKnownArtist ?? '';
  const safeMs = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);
  const positionSec = Math.max(0, safeMs(positionMs) / 1000);
  const durationSec = Math.max(positionSec, safeMs(durationMs) / 1000);
  const volumePercent = Math.round((isMuted ? 0 : Number.isFinite(volume) ? volume : 0) * 100);
  const effectiveCanNext = canNext ?? queue.length > 1;
  const effectiveCanPrev = canPrev ?? queue.length > 1;

  const meta = useMemo(() => {
    const fallback = { label: 'Now Playing', badge: '♪', color: 'bg-neutral-900/90' };
    return provider ? providerMeta[provider as keyof typeof providerMeta] ?? fallback : fallback;
  }, [provider]);

  const isIdle = !isOpen || !provider || !trackId;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (provider !== 'youtube') return;
    if (isCinema) {
      document.exitFullscreen?.();
      exitCinema();
    } else {
      enterCinema();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      if (!active) {
        exitCinema();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [exitCinema]);

  useEffect(() => {
    if (!isCinema) return;
    const node = cinemaRef.current;
    if (!node) return;
    if (document.fullscreenElement) return;
    node.requestFullscreen?.().catch(() => {
      exitCinema();
    });
  }, [isCinema, exitCinema]);

  // Nuclear assertion: never allow more than one universal player in dev/test
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;
    const players = document.querySelectorAll('[data-player="universal"]');
    if (players.length > 1) {
      throw new Error('FATAL: More than one universal player mounted. This is a bug.');
    }
  }, []);

  // Dev guard: ensure only one iframe/provider instance and metadata present
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;
    const frames = document.querySelectorAll('iframe[src*="spotify"], iframe[src*="youtube"]');
    if (frames.length > 1) {
      throw new Error('Invariant violated: multiple provider iframes detected.');
    }
    if (isOpen && !resolvedTitle) {
      throw new Error('Invariant violated: player rendered without title.');
    }
  }, [isOpen, resolvedTitle]);

  const dragBounds = useMemo(() => {
    if (typeof window === 'undefined') {
      return { left: -1000, right: 1000, top: -1000, bottom: 1000 };
    }
    return {
      left: -window.innerWidth,
      right: window.innerWidth,
      top: -window.innerHeight,
      bottom: window.innerHeight,
    };
  }, []);

  return (
    <>
      {/* Single Interchangeable Player - positioned inside navbar area, draggable across screen */}
      {!isMini && (
        <motion.div
          drag
          dragConstraints={dragBounds}
          dragElastic={0.15}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          data-player="universal"
          className="pointer-events-auto fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[min(100vw-16px,780px)] rounded-none md:w-[min(720px,calc(100vw-32px))]"
        >
          <div className={`overflow-hidden rounded-none md:rounded-2xl border border-border/50 bg-gradient-to-br ${meta.color} shadow-2xl backdrop-blur-xl`}>
          {/* Header - Always visible, compact on mobile */}
          <div className="flex items-center gap-3 px-3 py-2 md:px-4 md:py-2.5 bg-background/80 backdrop-blur">
            <span className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-background/80 text-lg md:text-xl shadow-inner">
              {meta.badge}
            </span>
            {meta.Icon && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-white text-[10px] md:text-xs shadow-inner">
                <meta.Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="font-semibold tracking-tight">{meta.label}</span>
              </span>
            )}
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Now Playing</span>
              {resolvedTitle && (
                <span className="text-xs md:text-sm font-bold text-foreground truncate" aria-label="Track title">{resolvedTitle}</span>
              )}
              {resolvedArtist && (
                <span className="text-[11px] md:text-xs text-muted-foreground truncate" aria-label="Artist name">{resolvedArtist}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQueueOpen(true)}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="Show queue"
                title="Show queue"
              >
                <ListMusic className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowVideo((v) => !v)}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label={showVideo ? 'Hide video' : 'Show video'}
                title={showVideo ? 'Hide video' : 'Show video'}
              >
                {showVideo ? <ChevronUp className="h-3 w-3 md:h-4 md:w-4" /> : <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />}
              </button>
              <button
                type="button"
                onClick={() => (effectiveCanPrev ? (onPrev ? onPrev() : previousTrack()) : null)}
                disabled={!effectiveCanPrev}
                className="inline-flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous track"
                title="Previous track"
              >
                <SkipBack className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <button
                type="button"
                onClick={togglePlayPause}
                className="inline-flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border-2 border-primary/70 bg-primary/20 text-primary transition hover:border-primary hover:bg-primary hover:text-white"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4 md:h-5 md:w-5" /> : <Play className="h-4 w-4 md:h-5 md:w-5" />}
              </button>
              <button
                type="button"
                onClick={() => (effectiveCanNext ? (onNext ? onNext() : nextTrack()) : null)}
                disabled={!effectiveCanNext}
                className="inline-flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next track"
                title="Next track"
              >
                <SkipForward className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <button
                type="button"
                onClick={collapseToMini}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="Minimize to mini player"
                title="Minimize"
              >
                <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
              </button>
              <button
                type="button"
                onClick={stop}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-destructive/30 hover:text-destructive"
                aria-label="Stop playback"
                title="Stop playback"
              >
                <Square className="h-3 w-3 md:h-4 md:w-4" />
              </button>
              <button
                type="button"
                onClick={closePlayer}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="Close player"
                title="Close player"
              >
                <X className="h-3 w-3 md:h-4 md:w-4" />
              </button>
            </div>
          </div>

          {/* Video area slides from top of player */}
          <motion.div
            initial={false}
            animate={{ height: showVideo && provider && trackId ? 'auto' : 0, opacity: showVideo && provider && trackId ? 1 : 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden bg-black/80"
            aria-hidden={!showVideo || !provider || !trackId}
          >
            <div className="relative">
              {provider === 'spotify' ? (
                <SpotifyEmbedPreview providerTrackId={trackId} autoplay={autoplay} />
              ) : (
                <YouTubePlayer providerTrackId={trackId} autoplay={autoplay} />
              )}
            </div>
          </motion.div>

          {/* Compact Controls Row: Seekbar + Volume inline */}
          <div className="flex items-center gap-2 px-3 pb-3 md:px-4 md:pb-4 text-white">
            <span className="text-[10px] md:text-xs tabular-nums w-12 text-right" aria-label="Elapsed time">{formatTime(positionSec)}</span>
            <input
              type="range"
              min="0"
              max={Math.max(durationSec, 1)}
              value={Math.min(positionSec, durationSec)}
              onChange={(e) => seekToMs(Number(e.target.value) * 1000)}
              disabled={isIdle}
              className="flex-1 min-w-[80px] h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 
                       [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
              aria-label="Seek"
            />
            <span className="text-[10px] md:text-xs tabular-nums w-12 text-left" aria-label="Total duration">{formatTime(durationSec)}</span>

            <button
              onClick={toggleMute}
              className="p-1.5 text-white/80 hover:text-white transition-colors rounded"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volumePercent}
              onChange={(e) => setVolumeLevel(Number(e.target.value) / 100)}
              className="w-20 md:w-28 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 
                       [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
              aria-label="Volume"
            />

            {provider === 'youtube' && (
              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-white/80 hover:text-white transition-colors rounded"
                aria-label={isCinema ? 'Exit cinema mode' : 'Enter cinema mode'}
              >
                <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            )}
          </div>
        </div>

        </motion.div>
      )}

      {isMini && (
        <motion.div
          drag
          dragElastic={0.2}
          dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
          onDragEnd={(_, info) => {
            setMiniPosition({ x: miniPosition.x + info.offset.x, y: miniPosition.y + info.offset.y });
          }}
          style={{ x: miniPosition.x, y: miniPosition.y }}
          className="pointer-events-auto fixed bottom-6 right-4 z-[65] w-[260px] max-w-[80vw] rounded-xl border border-border/60 bg-neutral-900/90 shadow-2xl backdrop-blur-lg"
        >
          <div className="flex items-center justify-between px-3 py-2 gap-2">
            <div className="flex flex-col min-w-0">
              {resolvedTitle && <span className="text-sm font-semibold text-white truncate">{resolvedTitle}</span>}
              {resolvedArtist && <span className="text-xs text-white/70 truncate">{resolvedArtist}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={restoreFromMini}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Restore player"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Queue sheet */}
      <QueueSheet
        open={queueOpen}
        onOpenChange={setQueueOpen}
        queue={queue}
        currentIndex={queueIndex}
        onPlayTrack={(idx) => playFromQueue(idx)}
        onRemoveTrack={(idx) => removeFromQueue(idx)}
        onReorderQueue={reorderQueue}
        onClearQueue={clearQueue}
        onShuffleQueue={shuffleQueue}
      />
    </>
  );
}