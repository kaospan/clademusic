import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from './PlayerContext';
import { YouTubePlayer } from './providers/YouTubePlayer';
import { SpotifyEmbedPreview } from './providers/SpotifyEmbedPreview';
import { Volume2, VolumeX, Maximize2, X, ChevronDown, ChevronUp, Play, Pause, Square, SkipBack, SkipForward, ListMusic, RefreshCcw } from 'lucide-react';
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

/**
 * Hook to animate the seekbar smoothly between provider updates.
 * Syncs to authoritative positionMs on each update while animating locally via RAF.
 */
function useAnimatedSeekbar(
  positionMs: number,
  durationMs: number,
  isPlaying: boolean
): number {
  const [displayMs, setDisplayMs] = useState(positionMs);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const lastAuthorityMsRef = useRef<number>(positionMs);
  const durationRef = useRef<number>(durationMs);

  // Sync to authoritative position when it changes meaningfully
  useEffect(() => {
    const delta = Math.abs(positionMs - lastAuthorityMsRef.current);
    // Accept authority if delta is significant (>150ms) or if it jumped backward
    if (delta > 150 || positionMs < lastAuthorityMsRef.current - 50) {
      setDisplayMs(positionMs);
    }
    lastAuthorityMsRef.current = positionMs;
    lastFrameTimeRef.current = performance.now();
  }, [positionMs]);

  // Clamp display to duration changes to avoid drift beyond track end.
  useEffect(() => {
    durationRef.current = durationMs;
    if (durationMs > 0) {
      setDisplayMs((prev) => Math.min(prev, durationMs));
    }
  }, [durationMs]);

  // When playback stops, snap to authoritative position to stay in sync.
  useEffect(() => {
    if (!isPlaying) {
      setDisplayMs(positionMs);
    }
  }, [isPlaying, positionMs]);

  // Animate forward during playback using RAF
  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const animate = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      setDisplayMs((prev) => {
        const next = prev + elapsed;
        const limit = durationRef.current;
        return limit > 0 ? Math.min(next, limit) : next;
      });

      rafIdRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, durationMs]);

  return displayMs;
}

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
  const safeQueue = Array.isArray(queue) ? queue : [];
  const safeQueueIndex = typeof queueIndex === 'number' ? queueIndex : -1;
  const cinemaRef = useRef<HTMLDivElement | null>(null);
  const autoplay = isPlaying;
  const [queueOpen, setQueueOpen] = useState(false);
  const [scrubSec, setScrubSec] = useState<number | null>(null);
  const [videoScale, setVideoScale] = useState(0.8); // start at a sensible size; user can resize
  const resizeActiveRef = useRef(false);
  const lastClientXRef = useRef(0);
  const lastClientYRef = useRef(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playerScale, setPlayerScale] = useState(1);
  const playerResizeActiveRef = useRef(false);
  const lastPlayerClientXRef = useRef(0);
  const clampPlayerScale = useCallback((scale: number) => Math.min(Math.max(scale, 0.6), 1.3), []);
  const playerWrapperRef = useRef<HTMLDivElement | null>(null);
  const miniContainerRef = useRef<HTMLDivElement | null>(null);
  const miniMargin = 8;
  const getDefaultMiniPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    // place bottom-right with margin
    return { x: window.innerWidth / 2 - miniMargin - 130, y: -(window.innerHeight / 2 - miniMargin - 90) };
  }, [miniMargin]);
  const [isCompact, setIsCompact] = useState(false);
  const getDefaultCompactPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const margin = 12;
    return { x: margin, y: window.innerHeight - 200 };
  }, [miniMargin]);
  const [mainPosition, setMainPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [compactPosition, setCompactPosition] = useState<{ x: number; y: number }>(() => getDefaultCompactPosition());
  const [restorePosition, setRestorePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const layoutStorageKey = 'player_layout_v1';

  const clampScale = useCallback((scale: number) => Math.min(Math.max(scale, 0.3), 1.6), []);
  const commitSeek = useCallback(
    (sec: number) => {
      if (!Number.isFinite(sec)) return;
      seekToMs(sec * 1000);
      setScrubSec(null);
    },
    [seekToMs]
  );

  const resolvedTitle = trackTitle ?? lastKnownTitle ?? '';
  const resolvedArtist = trackArtist ?? lastKnownArtist ?? '';
  const safeMs = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);
  
  // Use animated seekbar for smooth visual updates
  const animatedPositionMs = useAnimatedSeekbar(safeMs(positionMs), safeMs(durationMs), isPlaying);
  const positionSec = Math.max(0, animatedPositionMs / 1000);
  const effectivePositionSec = scrubSec ?? positionSec;
  const durationSec = Math.max(0, safeMs(durationMs) / 1000);
  const seekMaxSecRaw = durationSec > 0 ? durationSec : Math.max(1, positionSec);
  const seekMaxSec = Number.isFinite(seekMaxSecRaw) && seekMaxSecRaw > 0 ? seekMaxSecRaw : 1;
  const seekStepSec = Math.max(0.01, seekMaxSec / 1200); // finer granularity: ~1200 steps across track
  const seekValueSecRaw = Math.min(effectivePositionSec, seekMaxSec);
  const seekValueSec = Number.isFinite(seekValueSecRaw) ? seekValueSecRaw : 0;
  
  const volumePercent = Math.round((isMuted ? 0 : Number.isFinite(volume) ? volume : 0) * 100);
  const isIdle = !isOpen || !provider || !trackId;
  const effectiveCanNext = canNext ?? (safeQueue.length > 1 || Boolean(onNext));
  const effectiveCanPrev = canPrev ?? !isIdle;

  const meta = useMemo(() => {
    const fallback = { label: 'Now Playing', badge: '♪', color: 'bg-neutral-900/90', Icon: null as React.ComponentType<{ className?: string }> | null };
    return provider ? providerMeta[provider as keyof typeof providerMeta] ?? fallback : fallback;
  }, [provider]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = useCallback(() => {
    const el = playerWrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      exitCinema();
    } else {
      el.requestFullscreen?.()
        .then(() => enterCinema())
        .catch(() => {});
    }
  }, [enterCinema, exitCinema]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      if (!active) {
        exitCinema();
      } else {
        enterCinema();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [enterCinema, exitCinema]);

  // Hydrate persisted layout (compact flag + scales)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(layoutStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{ isCompact: boolean; videoScale: number; playerScale: number }>;
      if (typeof parsed.isCompact === 'boolean') setIsCompact(parsed.isCompact);
      if (Number.isFinite(parsed.videoScale)) setVideoScale(clampScale(parsed.videoScale!));
      if (Number.isFinite(parsed.playerScale)) setPlayerScale(clampPlayerScale(parsed.playerScale!));
    } catch (err) {
      console.warn('Failed to hydrate player layout', err);
    }
  }, [clampPlayerScale, clampScale]);

  // Persist layout whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify({ isCompact, videoScale, playerScale });
    try {
      localStorage.setItem(layoutStorageKey, payload);
    } catch (err) {
      console.warn('Failed to persist player layout', err);
    }
  }, [isCompact, videoScale, playerScale]);

  useEffect(() => {
    setScrubSec(null);
  }, [provider, trackId]);

  // Recenter positions when viewport changes
  useEffect(() => {
    const onResize = () => {
      setCompactPosition(getDefaultCompactPosition());
      if (!isCompact && !isMini) {
        setMainPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getDefaultCompactPosition, isCompact, isMini]);

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

  const handlePrev = useCallback(() => {
    if (isIdle) return;
    if (positionMs > 3000) {
      seekToMs(0);
      return;
    }
    if (safeQueueIndex > 0 && safeQueue.length) {
      playFromQueue(safeQueueIndex - 1);
      return;
    }
    if (safeQueueIndex === -1 && safeQueue.length > 0) {
      playFromQueue(0);
      return;
    }
    if (onPrev) {
      onPrev();
      return;
    }
    seekToMs(0);
  }, [isIdle, positionMs, safeQueueIndex, safeQueue.length, playFromQueue, seekToMs, onPrev]);

  const handleNext = useCallback(() => {
    if (safeQueueIndex >= 0 && safeQueueIndex < safeQueue.length - 1) {
      playFromQueue(safeQueueIndex + 1);
      return;
    }
    if (safeQueueIndex === -1 && safeQueue.length > 0) {
      playFromQueue(0);
      return;
    }
    if (onNext) {
      onNext();
    }
  }, [safeQueueIndex, safeQueue.length, playFromQueue, onNext]);

  // Drag-to-resize for video: adjust scale based on diagonal drag of the handle
  const handleResizeStart = useCallback((clientX: number, clientY: number) => {
    resizeActiveRef.current = true;
    lastClientXRef.current = clientX;
    lastClientYRef.current = clientY;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!resizeActiveRef.current) return;
      const point = 'touches' in e ? e.touches[0] : (e as MouseEvent);
      const clientX = point?.clientX ?? lastClientXRef.current;
      const clientY = point?.clientY ?? lastClientYRef.current;
      const deltaX = clientX - lastClientXRef.current;
      const deltaY = clientY - lastClientYRef.current;
      lastClientXRef.current = clientX;
      lastClientYRef.current = clientY;
      const delta = (deltaX + deltaY) * 0.0025; // respond to diagonal drag
      setVideoScale((prev) => clampScale(prev + delta));
    };
    const onUp = () => {
      resizeActiveRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [clampScale]);

  // Player shell resize (width/height via scale)
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!playerResizeActiveRef.current) return;
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? lastPlayerClientXRef.current : (e as MouseEvent).clientX;
      const delta = clientX - lastPlayerClientXRef.current;
      lastPlayerClientXRef.current = clientX;
      setPlayerScale((prev) => clampPlayerScale(prev + delta * 0.0015));
    };
    const onUp = () => {
      playerResizeActiveRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [clampPlayerScale]);

  const clampMiniPosition = useCallback(
    (pos: { x: number; y: number }) => {
      if (typeof window === 'undefined') return pos;
      const rect = miniContainerRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 260;
      const height = rect?.height ?? 120;
      const minX = -(window.innerWidth - width - miniMargin);
      const maxX = window.innerWidth - miniMargin;
      const minY = -(window.innerHeight - height - miniMargin);
      const maxY = window.innerHeight - miniMargin;
      return {
        x: Math.min(Math.max(pos.x, minX), maxX),
        y: Math.min(Math.max(pos.y, minY), maxY),
      };
    },
    [miniMargin]
  );

  const snapCompactToCorner = useCallback(() => {
    if (typeof window === 'undefined') return;
    const rect = playerWrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 12;
    const targets = [
      { x: margin, y: margin }, // top-left (kept for completeness)
      { x: window.innerWidth - rect.width - margin, y: margin }, // top-right
      { x: margin, y: window.innerHeight - rect.height - margin }, // bottom-left
      { x: window.innerWidth - rect.width - margin, y: window.innerHeight - rect.height - margin }, // bottom-right
    ];
    let best = targets[0];
    let bestDist = Infinity;
    const current = { x: rect.left, y: rect.top };
    for (const t of targets) {
      const d = (t.x - current.x) ** 2 + (t.y - current.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    setCompactPosition(best);
  }, []);

  // Reset outer player scale when leaving YouTube (only YouTube is resizable)
  useEffect(() => {
    if (provider !== 'youtube') {
      setPlayerScale(1);
      playerResizeActiveRef.current = false;
    }
    if (isMini) {
      setIsCompact(false);
    }
  }, [provider]);

  return (
    <>
      {/* Single Interchangeable Player - stays mounted for compact & mini so playback never stops */}
      <motion.div
        ref={(node) => {
          playerWrapperRef.current = node;
          miniContainerRef.current = node;
          cinemaRef.current = node;
        }}
        drag={isMini || !isScrubbing} // allow drag in mini; block while scrubbing
        dragConstraints={isMini ? { left: -1000, right: 1000, top: -1000, bottom: 1000 } : dragBounds}
        dragElastic={0.15}
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onDragEnd={(_, info) => {
          if (isMini) {
            const next = { x: miniPosition.x + info.offset.x, y: miniPosition.y + info.offset.y };
            setMiniPosition(clampMiniPosition(next));
          } else if (isCompact) {
            const next = { x: compactPosition.x + info.offset.x, y: compactPosition.y + info.offset.y };
            setCompactPosition(next);
          } else {
            const next = { x: mainPosition.x + info.offset.x, y: mainPosition.y + info.offset.y };
            setMainPosition(next);
          }
        }}
        data-player="universal"
        className={`pointer-events-auto fixed z-[70] rounded-none md:w-[min(720px,calc(100vw-32px))] ${
          isMini
            ? 'bottom-6 right-4 left-auto translate-x-0 w-[clamp(200px,80vw,360px)]'
            : isCompact
              ? 'top-0 left-0 translate-x-0 w-[min(460px,90vw)]'
              : 'top-14 left-1/2 -translate-x-1/2 w-[90vw] max-w-[780px]'
        }`}
        style={{
          scale: isMini ? 0.5 : isCompact ? 0.7 : playerScale,
          transformOrigin: isMini ? 'bottom right' : isCompact ? 'top left' : 'top center',
          x: isMini ? miniPosition.x : isCompact ? compactPosition.x : mainPosition.x,
          y: isMini ? miniPosition.y : isCompact ? compactPosition.y : mainPosition.y,
        }}
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
                onClick={() => (effectiveCanPrev ? handlePrev() : null)}
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
              {isCompact && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCompact(false);
                    setMainPosition(restorePosition);
                  }}
                  className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                  aria-label="Restore compact player"
                  title="Restore compact"
                >
                  <ChevronUp className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => (effectiveCanNext ? handleNext() : null)}
                disabled={!effectiveCanNext}
                className="inline-flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next track"
                title="Next track"
              >
                <SkipForward className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              {!isCompact && (
                <button
                  type="button"
                  onClick={() => {
                    setRestorePosition(mainPosition);
                    setCompactPosition(getDefaultCompactPosition());
                    setIsCompact(true);
                    requestAnimationFrame(snapCompactToCorner);
                  }}
                  className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                  aria-label="Compact player"
                  title="Compact"
                >
                  <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label={isCinema ? 'Exit full screen' : 'Enter full screen'}
                title={isCinema ? 'Exit full screen' : 'Enter full screen'}
              >
                <Maximize2 className="h-3 w-3 md:h-4 md:w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  // When collapsing with X, stop playback and park mini in default spot.
                  setIsCompact(false);
                  const targetPos = clampMiniPosition(getDefaultMiniPosition());
                  setMiniPosition(targetPos);
                  stop();
                  collapseToMini();
                }}
                className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                aria-label="Minimize to mini player"
                title="Minimize to mini player"
              >
                <X className="h-3 w-3 md:h-4 md:w-4" />
              </button>
            </div>
          </div>

          {/* Video area slides from top of player */}
          <motion.div
            initial={false}
            animate={{ height: provider && trackId ? 'auto' : 0, opacity: provider && trackId ? 1 : 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden bg-black/80"
            aria-hidden={!provider || !trackId}
          >
            <div className="relative flex justify-center px-2 py-2">
              <div
                className="w-full sm:w-auto relative"
                style={{
                  width:
                    provider === 'youtube'
                      ? `${Math.min(Math.max(videoScale * 100, 30), 160)}%`
                      : '100%',
                  maxWidth: '100%',
                  transition: 'width 120ms ease',
                }}
              >
                {provider === 'spotify' ? (
                  <SpotifyEmbedPreview providerTrackId={trackId} autoplay={autoplay} />
                ) : (
                  <YouTubePlayer providerTrackId={trackId} autoplay={autoplay} />
                )}
                {provider === 'youtube' && (
                  <div
                    className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    tabIndex={0}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleResizeStart(e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      const clientX = touch?.clientX ?? 0;
                      const clientY = touch?.clientY ?? 0;
                      handleResizeStart(clientX, clientY);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setVideoScale(1);
                      }
                    }}
                    title="Drag to resize video"
                    style={{
                      borderBottom: '8px solid rgba(255,255,255,0.65)',
                      borderRight: '8px solid rgba(255,255,255,0.65)',
                      borderTop: '8px solid transparent',
                      borderLeft: '8px solid transparent',
                      borderBottomRightRadius: '4px',
                    }}
                  />
                )}
              </div>
            </div>
          </motion.div>

          {/* Compact Controls Row: Seekbar + Volume inline */}
          <div className="flex items-center gap-2 px-3 pb-3 md:px-4 md:pb-4 text-white">
            <span className="text-[10px] md:text-xs tabular-nums w-12 text-right" aria-label="Elapsed time">{formatTime(positionSec)}</span>
            <input
              key={`${provider ?? 'none'}-${trackId ?? 'none'}-seek`}
              type="range"
              min="0"
              max={seekMaxSec}
              step={seekStepSec}
              value={seekValueSec}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onMouseDownCapture={(e) => e.stopPropagation()}
              onTouchStartCapture={(e) => e.stopPropagation()}
              onChange={(e) => {
                const nextSec = Number(e.target.value);
                if (!Number.isFinite(nextSec)) return;
                setScrubSec(nextSec);
                // Commit immediately so single taps and drag updates seek right away
                commitSeek(nextSec);
              }}
              onPointerDown={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                const nextSec = Number(target.value);
                if (!Number.isFinite(nextSec)) return;
                setScrubSec(nextSec);
                setIsScrubbing(true);
              }}
              onPointerUp={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                const nextSec = Number(target.value);
                if (!Number.isFinite(nextSec)) return;
                commitSeek(nextSec);
                setIsScrubbing(false);
              }}
              onMouseUp={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                const nextSec = Number(target.value);
                if (!Number.isFinite(nextSec)) return;
                commitSeek(nextSec);
                setIsScrubbing(false);
              }}
              onTouchEnd={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                const nextSec = Number(target.value);
                if (!Number.isFinite(nextSec)) return;
                commitSeek(nextSec);
                setIsScrubbing(false);
              }}
              onClick={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                const nextSec = Number(target.value);
                if (!Number.isFinite(nextSec)) return;
                commitSeek(nextSec);
              }}
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
              onPointerDownCapture={(e) => e.stopPropagation()}
              onMouseDownCapture={(e) => e.stopPropagation()}
              onTouchStartCapture={(e) => e.stopPropagation()}
              onChange={(e) => setVolumeLevel(Number(e.target.value) / 100)}
              className="w-20 md:w-28 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 
                       [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
              aria-label="Volume"
            />

            {provider === 'youtube' && (
              <>
                <button
                  onClick={() => setVideoScale(1)}
                  className="p-1.5 text-white/80 hover:text-white transition-colors rounded"
                  aria-label="Reset video size"
                  title="Reset video size"
                >
                  <RefreshCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Player resize handle (affects overall player scale) */}
      {!isMini && provider === 'youtube' && (
        <div
          className="pointer-events-auto fixed top-14 left-1/2 -translate-x-1/2 z-[71] w-[24px] h-[24px] cursor-se-resize"
          style={{ marginTop: 'calc(4.25rem + 100%)' }}
          onMouseDown={(e) => {
            e.preventDefault();
            playerResizeActiveRef.current = true;
            lastPlayerClientXRef.current = e.clientX;
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            const clientX = e.touches[0]?.clientX ?? 0;
            playerResizeActiveRef.current = true;
            lastPlayerClientXRef.current = clientX;
          }}
          title="Drag to resize player"
        />
      )}

      {/* Queue sheet */}
      <QueueSheet
        open={queueOpen}
        onOpenChange={setQueueOpen}
        queue={safeQueue}
        currentIndex={safeQueueIndex}
        onPlayTrack={(idx) => playFromQueue(idx)}
        onRemoveTrack={(idx) => removeFromQueue(idx)}
        onReorderQueue={reorderQueue}
        onClearQueue={clearQueue}
        onShuffleQueue={shuffleQueue}
      />
    </>
  );
}
