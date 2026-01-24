import { useMemo, useState, useEffect } from 'react';
import { usePlayer } from './PlayerContext';
import { YouTubePlayer } from './providers/YouTubePlayer';
import { SpotifyEmbedPreview } from './providers/SpotifyEmbedPreview';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, X, ChevronsDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const providerMeta = {
  spotify: { label: 'Spotify', badge: '🎧', color: 'bg-green-900/90' },
  youtube: { label: 'YouTube', badge: '▶', color: 'bg-red-900/90' },
  apple_music: { label: 'Apple Music', badge: '', color: 'bg-neutral-900/90' },
} as const;

export function EmbeddedPlayerDrawer() {
  const {
    isOpen,
    provider,
    trackId,
    isPlaying,
    setIsPlaying,
    isMinimized,
    setMinimized,
    closePlayer,
    trackTitle,
    trackArtist,
    nextTrack,
    previousTrack,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const autoplay = isPlaying;

  const meta = useMemo(() => {
    return provider ? providerMeta[provider as keyof typeof providerMeta] ?? { label: 'Now Playing', badge: '♪', color: 'bg-neutral-900/90' } : { label: 'Now Playing', badge: '♪', color: 'bg-neutral-900/90' };
  }, [provider]);

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

  if (!isOpen || !provider || !trackId) return null;

  // Mobile: Compact strip at top-right corner (audio-only, no video)
  // Desktop: Bottom player bar with full controls
  return (
    <>
      {/* Mobile Player - Top-right compact strip */}
      <div
        className={cn(
          'fixed z-[60] md:hidden',
          'flex flex-col gap-2 p-3 rounded-xl backdrop-blur-xl shadow-2xl border border-white/10',
          meta.color,
          isMinimized
            ? 'top-4 right-4 w-64'
            : 'top-4 left-4 right-4 w-[calc(100vw-2rem)]'
        )}
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        }}
        role="region"
        aria-label="Now Playing"
      >
        {/* Header with title and close */}
        <div className="flex items-center gap-2">
          <span className="text-xl select-none shrink-0" aria-label={meta.label}>{meta.badge}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate" title={trackTitle ?? 'Now Playing'}>
              {trackTitle ?? 'Now Playing'}
            </p>
            {trackArtist && (
              <p className="text-xs text-white/70 truncate" title={trackArtist}>
                {trackArtist}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMinimized(!isMinimized)}
            className="shrink-0 text-white/80 hover:text-white p-1 rounded transition-colors"
            aria-label={isMinimized ? 'Expand player' : 'Minimize player'}
          >
            <ChevronsDownUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={closePlayer}
            className="shrink-0 text-white/80 hover:text-white p-1 rounded transition-colors"
            aria-label="Close player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isMinimized && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70 tabular-nums">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer 
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                       [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
              aria-label="Seek"
            />
            <span className="text-xs text-white/70 tabular-nums">{formatTime(duration)}</span>
          </div>
        )}

        {/* Playback controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={previousTrack}
              className="p-2 text-white/80 hover:text-white transition-colors rounded"
              aria-label="Previous track"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 text-white bg-white/20 hover:bg-white/30 transition-colors rounded-full"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={nextTrack}
              className="p-2 text-white/80 hover:text-white transition-colors rounded"
              aria-label="Next track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
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
      </div>

      {/* Desktop Player - Bottom bar */}
      <div
        className={cn(
          'hidden md:flex',
          'fixed bottom-0 left-0 right-0 z-[60] w-full items-center justify-center',
          meta.color
        )}
        style={{ 
          aspectRatio: '12/1', 
          minHeight: 0, 
          height: 'var(--clade-player-height,52px)', 
          maxHeight: '52px', 
          boxShadow: '0 -2px 16px rgba(0,0,0,0.18)' 
        }}
        role="region"
        aria-label="Now Playing Desktop"
      >
        <div className="flex flex-row items-center w-full max-w-lg mx-auto px-2 gap-2">
          <span className="text-xl select-none" aria-label={meta.label}>{meta.badge}</span>
          <span className="flex-1 truncate text-sm font-semibold text-white" title={trackTitle ?? 'Now Playing'}>
            {trackTitle ?? 'Now Playing'}
          </span>
          {trackArtist && (
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
          'fixed bottom-0 left-0 right-0 z-[60] pointer-events-auto',
          // Hide the visual area on mobile while keeping the audio alive
          'h-[1px] overflow-hidden md:h-[52px]'
        )}
        aria-hidden
      >
        {provider === 'spotify' ? (
          <SpotifyEmbedPreview providerTrackId={trackId} autoplay={autoplay} />
        ) : (
          <YouTubePlayer providerTrackId={trackId} autoplay={autoplay} />
        )}
      </div>
    </>
  );
}