import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from './PlayerContext';
import { YouTubePlayer } from './providers/YouTubePlayer';
import { SpotifyEmbedPreview } from './providers/SpotifyEmbedPreview';
import { Volume2, VolumeX, Maximize2, X, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

const providerMeta = {
  spotify: { label: 'Spotify', badge: '🎧', color: 'bg-green-900/90' },
  youtube: { label: 'YouTube', badge: '▶', color: 'bg-red-900/90' },
  apple_music: { label: 'Apple Music', badge: '', color: 'bg-neutral-900/90' },
} as const;

export function EmbeddedPlayerDrawer() {
  const {
    provider,
    trackId,
    trackTitle,
    trackArtist,
    trackAlbum,
    isOpen,
    isMinimized,
    setMinimized,
    isPlaying,
    setIsPlaying,
    nextTrack,
    previousTrack,
    closePlayer,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const autoplay = isPlaying;

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    // TODO: Implement actual seeking in player providers
  };

  // Basic ticking to keep seeker in sync when playing
  useEffect(() => {
    if (!isPlaying || isIdle) return;
    const id = window.setInterval(() => {
      setCurrentTime((t) => (t + 1 > duration ? duration : t + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, isIdle, duration]);

  // Reset progress when track/provider changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration((prev) => (prev > 0 ? prev : 180));
  }, [trackId, provider]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Nuclear assertion: never allow more than one universal player in dev/test
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;
    const players = document.querySelectorAll('[data-player="universal"]');
    if (players.length > 1) {
      throw new Error('FATAL: More than one universal player mounted. This is a bug.');
    }
  }, []);

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
        data-player="universal"
        className="pointer-events-auto fixed top-4 right-4 left-4 md:top-auto md:bottom-[calc(env(safe-area-inset-bottom)+24px)] md:left-1/2 md:right-auto z-[60] transform md:-translate-x-1/2 w-[calc(100vw-2rem)] md:w-[640px] md:max-w-[640px] px-2 md:px-0"
      >
        <div className={`overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${meta.color} shadow-2xl backdrop-blur-xl`}>
          {/* Header - Always visible, compact on mobile */}
          <div className="flex items-center gap-3 px-3 py-2 md:px-4 md:py-2.5 bg-background/80 backdrop-blur">
            <span className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-background/80 text-lg md:text-xl shadow-inner">
              {meta.badge}
            </span>
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Now Playing</span>
              <span className="text-xs md:text-sm font-bold text-foreground truncate" aria-label="Track title">{trackTitle ?? 'Unknown title'}</span>
              <span className="text-[11px] md:text-xs text-muted-foreground truncate" aria-label="Artist name">{trackArtist ?? 'Unknown artist'}</span>
              <span className="text-[10px] md:text-[11px] text-muted-foreground/80 truncate" aria-label="Album name">{trackAlbum ?? 'Unknown album'}</span>
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
                onClick={() => setMinimized(!isMinimized)}
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

          <div className="flex items-center gap-3 px-3 pb-2 md:px-4 md:pb-3">
            <div className="flex flex-col flex-1 min-w-0 text-white/90" aria-live="polite">
              <span className="text-sm md:text-base font-semibold truncate">{trackTitle ?? 'Unknown title'}</span>
              <span className="text-xs md:text-sm text-white/80 truncate">{trackArtist ?? 'Unknown artist'}</span>
              <span className="text-[11px] md:text-xs text-white/70 truncate">{trackAlbum ?? 'Unknown album'}</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <span className="text-[11px] md:text-xs tabular-nums" aria-label="Elapsed time">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration}
                value={Math.min(currentTime, duration)}
                onChange={handleSeek}
                disabled={isIdle}
                className="w-32 md:w-48 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 
                         [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full 
                         [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                aria-label="Seek"
              />
              <span className="text-[11px] md:text-xs tabular-nums" aria-label="Total duration">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 px-3 pb-3 md:px-4 md:pb-4">
            {/* Volume control */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-white/80 hover:text-white transition-colors rounded"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {!isMinimized && (
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseInt(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 
                         [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full 
                         [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                aria-label="Volume"
              />
            )}

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white transition-colors rounded"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embeds are rendered once at the root to avoid duplicates; see shared container below */}
      </motion.div>

      {/* Desktop Player - Bottom bar */}
      <div
        className={cn(
          'hidden md:flex',
          'sticky top-0 left-1/2 -translate-x-1/2 z-[120] w-full items-center justify-center pointer-events-auto',
          meta.color
        )}
        style={{
          aspectRatio: '12/1',
          minHeight: 0,
          height: 'var(--clade-player-height,52px)',
          maxHeight: '52px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.18)'
        }}
        role="region"
        aria-label="Now Playing Desktop"
      >
        <div className="flex flex-row items-center w-full max-w-lg mx-auto px-2 gap-2">
          <span className="text-xl select-none" aria-label={meta.label}>{meta.badge}</span>
          <span className="flex-1 truncate text-sm font-semibold text-white" title={trackTitle ?? 'Now Playing'}>
            {trackTitle ?? (isIdle ? 'Player ready — pick a track' : 'Now Playing')}
          </span>
          {trackArtist && !isIdle && (
            <span className="text-xs text-white/70 truncate" title={trackArtist}>
              {trackArtist}
            </span>
          )}
          <button
            type="button"
            onClick={closePlayer}
            className="ml-2 text-white/80 hover:text-white text-lg px-2 py-1 rounded"
            aria-label="Close player"
          >
            ×
          </button>
        </div>
      </div>

      {/* Single shared embed container to guarantee exactly one iframe */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[120] pointer-events-auto',
          'h-[1px] overflow-hidden md:h-[52px]'
        )}
        aria-hidden
      >
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