import { useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from './PlayerContext';
import { YouTubePlayer } from './providers/YouTubePlayer';
import { SpotifyEmbedPreview } from './providers/SpotifyEmbedPreview';
import { Volume2, VolumeX, Maximize2, X, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

const providerMeta = {
  spotify: { label: 'Spotify', badge: '🎧', color: 'bg-black/90' },
  youtube: { label: 'YouTube', badge: '▶', color: 'bg-black/90' },
  apple_music: { label: 'Apple Music', badge: '', color: 'bg-neutral-900/90' },
} as const;

export function EmbeddedPlayerDrawer() {
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
    collapseToMini,
    restoreFromMini,
    setMiniPosition,
    miniPosition,
    enterCinema,
    exitCinema,
    isPlaying,
    togglePlayPause,
    setVolumeLevel,
    toggleMute,
    seekToMs,
    closePlayer,
  } = usePlayer();
  const cinemaRef = useRef<HTMLDivElement | null>(null);
  const autoplay = isPlaying;

  const resolvedTitle = trackTitle ?? lastKnownTitle ?? '';
  const resolvedArtist = trackArtist ?? lastKnownArtist ?? '';
  const positionSec = Math.max(0, positionMs / 1000);
  const durationSec = Math.max(positionSec, durationMs > 0 ? durationMs / 1000 : 0);
  const volumePercent = Math.round((isMuted ? 0 : volume) * 100);

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

  return (
    <>
      {/* Single Interchangeable Player - EXACT same position for Spotify & YouTube */}
      {!isMini && (
        <motion.div
          drag={isMinimized ? "y" : false}
          dragConstraints={{ top: 0, bottom: 200 }}
          dragElastic={0.1}
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          data-player="universal"
          className="pointer-events-auto fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100vw-2rem)] max-w-3xl px-2 md:px-0"
        >
        <div className={`overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${meta.color} shadow-2xl backdrop-blur-xl`}>
          {/* Header - Always visible, compact on mobile */}
          <div className="flex items-center gap-3 px-3 py-2 md:px-4 md:py-2.5 bg-background/80 backdrop-blur">
            <span className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-background/80 text-lg md:text-xl shadow-inner">
              {meta.badge}
            </span>
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Now Playing</span>
              {resolvedTitle && (
                <span className="text-xs md:text-sm font-bold text-foreground truncate" aria-label="Track title">{resolvedTitle}</span>
              )}
              {resolvedArtist && (
                <span className="text-[11px] md:text-xs text-muted-foreground truncate" aria-label="Artist name">{resolvedArtist}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={togglePlayPause}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-3 w-3 md:h-4 md:w-4" /> : <Play className="h-3 w-3 md:h-4 md:w-4" />}
              </button>
              <button
                type="button"
                onClick={collapseToMini}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="Collapse to mini player"
              >
                <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
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

          {/* Compact Controls Row: Seekbar + Volume inline */}
          <div className="flex items-center gap-2 px-3 pb-3 md:px-4 md:pb-4 text-white">
            <span className="text-[10px] md:text-xs tabular-nums" aria-label="Elapsed time">{formatTime(positionSec)}</span>
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
            <span className="text-[10px] md:text-xs tabular-nums" aria-label="Total duration">{formatTime(durationSec)}</span>

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

        {/* Embeds are rendered once at the root to avoid duplicates; see shared container below */}
        </motion.div>
      )}

      {isMini && (
        <motion.div
          drag
          dragElastic={0.2}
          dragConstraints={{ left: -80, right: 80, top: -80, bottom: 200 }}
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

      {/* Single shared embed container to guarantee exactly one iframe */}
      <div
        ref={isCinema && provider === 'youtube' ? cinemaRef : undefined}
        className={cn(
          'fixed bottom-0 left-0 right-0 pointer-events-auto',
          isCinema && provider === 'youtube'
            ? 'inset-0 z-[140] bg-black/80 flex items-center justify-center'
            : 'z-[120] h-[1px] overflow-hidden md:h-[52px]'
        )}
        aria-hidden
      >
        {isCinema && provider === 'youtube' && (
          <>
            <div className="absolute inset-0 bg-black/60 pointer-events-none" />
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={() => {
                  document.exitFullscreen?.();
                  exitCinema();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="Exit cinema mode"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
        {provider && trackId ? (
          provider === 'spotify' ? (
            <SpotifyEmbedPreview providerTrackId={trackId} autoplay={autoplay} />
          ) : (
            <YouTubePlayer providerTrackId={trackId} autoplay={autoplay} />
          )
        ) : null}
      </div>
    </>
  );
}