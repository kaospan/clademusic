import { useMemo, useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from './PlayerContext';
import { Volume2, VolumeX, Maximize2, X, ChevronDown, ChevronUp, Play, Pause, SkipBack, SkipForward, ListMusic, RefreshCcw, Repeat, Sparkles, ArrowLeftRight } from 'lucide-react';
import { QueueSheet } from './QueueSheet';
import { SpotifyIcon, YouTubeIcon, AppleMusicIcon } from '@/components/QuickStreamButtons';
import { useConnectSpotify } from '@/hooks/api/useSpotifyConnect';
import { useSpotifyConnected } from '@/hooks/api/useSpotifyUser';
import { useTrackSections } from '@/hooks/api/useTrackSections';
import { getSectionDisplayLabel } from '@/lib/sections';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTrack } from '@/hooks/api/useTracks';
import { useHarmonicFingerprint } from '@/hooks/api/useHarmonicFingerprint';
import { ChordBadge } from '@/components/ChordBadge';
import { UniversalPlayerHost } from '@/player/universal/UniversalPlayerHost';
import { buildProviderDeepLink } from '@/player/universal/buildEmbedSrc';

const providerMeta = {
  spotify: { label: 'Spotify', badge: '🎧', color: 'bg-black/90', Icon: SpotifyIcon },
  youtube: { label: 'YouTube', badge: '▶', color: 'bg-black/90', Icon: YouTubeIcon },
  apple_music: { label: 'Apple Music', badge: '', color: 'bg-neutral-900/90', Icon: AppleMusicIcon },
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string | null | undefined) => Boolean(value && UUID_RE.test(value));

const getCadenceLabel = (cadence: string | null | undefined) => {
  if (!cadence) return null;
  if (cadence === 'none') return null;
  return cadence.replace(/_/g, ' ');
};

const describeSectionWhy = (params: {
  sectionLabel: string;
  cadenceType?: string | null;
  isLooping?: boolean;
}) => {
  const { sectionLabel, cadenceType, isLooping } = params;
  const base: Record<string, string> = {
    intro: 'Sets the tonal center and groove.',
    verse: 'Builds tension and sets up the hook.',
    'pre-chorus': 'Ramps into the release.',
    chorus: 'Main hook — usually the most stable resolution.',
    bridge: 'Contrast section — often shifts harmonic color.',
    breakdown: 'Pulls back texture to build anticipation.',
    drop: 'Peak energy release.',
    outro: 'Closure and release.',
  };

  const cadence: Record<string, string> = {
    authentic: 'Strong resolution (authentic cadence).',
    plagal: 'Warm resolution (plagal cadence).',
    deceptive: 'Fake-out resolution (deceptive cadence).',
    half: 'Unresolved — hangs on dominant (half cadence).',
    loop: 'Circular loop — no final cadence.',
    modal: 'Modal harmony — color over functional resolution.',
  };

  const parts: string[] = [];
  if (isLooping) parts.push('Looping enabled.');
  parts.push(base[sectionLabel] ?? 'Section context.');
  if (cadenceType && cadence[cadenceType]) parts.push(cadence[cadenceType]);
  return parts.join(' ');
};

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
  const isTestEnv =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
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
    if (isTestEnv) return;
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
  }, [isPlaying, durationMs, isTestEnv]);

  return displayMs;
}

export function EmbeddedPlayerDrawer({ onNext, onPrev, canNext, canPrev }: EmbeddedPlayerDrawerProps) {
  const isTestEnv =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
  const {
    provider,
    trackId,
    canonicalTrackId,
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
    currentSectionId,
    loopSectionId,
    setCurrentSection,
    setLoopSection,
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: isSpotifyConnected } = useSpotifyConnected();
  const connectSpotify = useConnectSpotify();

  const analysisTrackId = !isTestEnv && isUuid(canonicalTrackId) ? canonicalTrackId : undefined;
  const sectionsQuery = useTrackSections(analysisTrackId);
  const sections = useMemo(() => {
    const raw = sectionsQuery.data;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort((a, b) => a.start_ms - b.start_ms);
  }, [sectionsQuery.data]);

  const trackQuery = useTrack(analysisTrackId, !!analysisTrackId);
  const fingerprintQuery = useHarmonicFingerprint(analysisTrackId);
  const harmony = useMemo(() => {
    const track = trackQuery.data ?? null;
    const fingerprint = fingerprintQuery.data ?? null;

    const detectedKey = (fingerprint as any)?.detected_key ?? (track as any)?.detected_key ?? null;
    const detectedMode = (fingerprint as any)?.detected_mode ?? (track as any)?.detected_mode ?? null;
    const cadenceType = (fingerprint as any)?.cadence_type ?? (track as any)?.cadence_type ?? null;
    const confidenceScore =
      typeof (fingerprint as any)?.confidence_score === 'number'
        ? (fingerprint as any).confidence_score
        : typeof (track as any)?.confidence_score === 'number'
          ? (track as any).confidence_score
          : null;

    const fromTrack: string[] = Array.isArray((track as any)?.progression_roman) ? (track as any).progression_roman : [];
    const fromFingerprint: string[] = Array.isArray((fingerprint as any)?.roman_progression)
      ? (fingerprint as any).roman_progression.map((c: any) => c?.numeral).filter(Boolean)
      : [];

    const progression = fromTrack.length ? fromTrack : fromFingerprint;

    return {
      detectedKey,
      detectedMode,
      cadenceType,
      confidenceScore,
      progression,
    };
  }, [fingerprintQuery.data, trackQuery.data]);

  const safeQueue = Array.isArray(queue) ? queue : [];
  const safeQueueIndex = typeof queueIndex === 'number' ? queueIndex : -1;
  const cinemaRef = useRef<HTMLDivElement | null>(null);
  const autoplay = isPlaying;
  const canSeekInEmbed = false;
  const [queueOpen, setQueueOpen] = useState(false);
  const [scrubSec, setScrubSec] = useState<number | null>(null);
  const [videoScale, setVideoScale] = useState(0.9); // slightly larger, cleaner default for the main player
  const resizeActiveRef = useRef(false);
  const lastClientXRef = useRef(0);
  const lastClientYRef = useRef(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playerScale, setPlayerScale] = useState(1);
  const playerResizeActiveRef = useRef(false);
  const lastPlayerClientXRef = useRef(0);
  const lastPlayerClientYRef = useRef(0);
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
    const width = 420;
    const height = 180;
    return { x: window.innerWidth - width - margin, y: window.innerHeight - height - margin };
  }, [miniMargin]);
  const [mainPosition, setMainPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [compactPosition, setCompactPosition] = useState<{ x: number; y: number }>(() => getDefaultCompactPosition());
  const [dragBounds, setDragBounds] = useState({ left: -1000, right: 1000, top: -1000, bottom: 1000 });
  const layoutStorageKey = 'player_layout_v1';
  const cookieKey = 'player_positions_v1';
  const readCookie = useCallback((key: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${key.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&')}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
  }, []);
  const writeCookie = useCallback((key: string, value: string) => {
    if (typeof document === 'undefined') return;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
  }, []);
  const clampPositionToBounds = useCallback(
    (pos: { x: number; y: number }) => {
      return {
        x: Math.min(Math.max(pos.x, dragBounds.left), dragBounds.right),
        y: Math.min(Math.max(pos.y, dragBounds.top), dragBounds.bottom),
      };
    },
    [dragBounds]
  );

  const clampScale = useCallback((scale: number) => Math.min(Math.max(scale, 0.3), 1.6), []);
  const commitSeek = useCallback(
    (sec: number) => {
      if (!Number.isFinite(sec)) return;
      seekToMs(sec * 1000);
      setScrubSec(null);
    },
    [seekToMs]
  );

  const restoreToDocked = useCallback(() => {
    setIsCompact(false);
    setMainPosition({ x: 0, y: 0 });
    restoreFromMini();
  }, [restoreFromMini]);

  const resolvedTitle = trackTitle ?? lastKnownTitle ?? '';
  const resolvedArtist = trackArtist ?? lastKnownArtist ?? '';
  const safeMs = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);
  const durationMsSafe = safeMs(durationMs);
  
  // Use animated seekbar for smooth visual updates
  const animatedPositionMs = useAnimatedSeekbar(safeMs(positionMs), durationMsSafe, isPlaying);
  const positionSec = Math.max(0, animatedPositionMs / 1000);
  const effectivePositionSec = scrubSec ?? positionSec;
  const durationSec = Math.max(0, durationMsSafe / 1000);
  const seekMaxSecRaw = durationSec > 0 ? durationSec : Math.max(1, positionSec);
  const seekMaxSec = Number.isFinite(seekMaxSecRaw) && seekMaxSecRaw > 0 ? seekMaxSecRaw : 1;
  const seekStepSec = Math.max(0.01, seekMaxSec / 1200); // finer granularity: ~1200 steps across track
  const seekValueSecRaw = Math.min(effectivePositionSec, seekMaxSec);
  const seekValueSec = Number.isFinite(seekValueSecRaw) ? seekValueSecRaw : 0;
  
  const volumePercent = Math.round((isMuted ? 0 : Number.isFinite(volume) ? volume : 0) * 100);
  const isIdle = !isOpen || !provider || !trackId;
  const effectiveCanNext = canNext ?? (safeQueue.length > 1 || Boolean(onNext));
  const effectiveCanPrev = canPrev ?? !isIdle;
  const authoritativePositionMs = safeMs(positionMs);

  const activeSection = useMemo(() => {
    if (!sections.length) return null;
    return sections.find((s) => authoritativePositionMs >= s.start_ms && authoritativePositionMs < s.end_ms) ?? null;
  }, [authoritativePositionMs, sections]);

  const loopSection = useMemo(() => {
    if (!loopSectionId) return null;
    return sections.find((s) => s.id === loopSectionId) ?? null;
  }, [loopSectionId, sections]);

  useEffect(() => {
    if (typeof setCurrentSection !== 'function') return;
    const nextId = activeSection?.id ?? null;
    if (nextId !== currentSectionId) {
      setCurrentSection(nextId);
    }
  }, [activeSection?.id, currentSectionId, setCurrentSection]);

  const lastLoopSeekAtRef = useRef<number>(0);
  useEffect(() => {
    if (!loopSection) return;
    const ms = authoritativePositionMs;
    const thresholdMs = 200;
    if (ms >= loopSection.end_ms - thresholdMs) {
      const now = performance.now();
      if (now - lastLoopSeekAtRef.current > 800) {
        lastLoopSeekAtRef.current = now;
        seekToMs(loopSection.start_ms);
      }
    }
  }, [authoritativePositionMs, loopSection, seekToMs]);

  const meta = useMemo(() => {
    const fallback = { label: 'Now Playing', badge: '♪', color: 'bg-neutral-900/90', Icon: null as React.ComponentType<{ className?: string }> | null };
    return provider ? providerMeta[provider as keyof typeof providerMeta] ?? fallback : fallback;
  }, [provider]);

  const sectionWhy = useMemo(() => {
    if (!activeSection) return null;
    return describeSectionWhy({
      sectionLabel: activeSection.label,
      cadenceType: harmony.cadenceType,
      isLooping: loopSectionId === activeSection.id,
    });
  }, [activeSection, harmony.cadenceType, loopSectionId]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReconnectSpotify = useCallback(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    void connectSpotify.mutateAsync();
  }, [connectSpotify, navigate, user]);

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

  // Hydrate positions from cookie
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = readCookie(cookieKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{
        mainPosition: { x: number; y: number };
        compactPosition: { x: number; y: number };
        miniPosition: { x: number; y: number };
      }>;
      if (parsed.mainPosition) setMainPosition(parsed.mainPosition);
      if (parsed.compactPosition) setCompactPosition(parsed.compactPosition);
      if (parsed.miniPosition) setMiniPosition(parsed.miniPosition);
    } catch (err) {
      console.warn('Failed to hydrate player positions', err);
    }
  }, [readCookie]);

  // Persist positions to cookie
  useEffect(() => {
    const payload = JSON.stringify({ mainPosition, compactPosition, miniPosition });
    writeCookie(cookieKey, payload);
  }, [compactPosition, mainPosition, miniPosition, writeCookie]);

  useEffect(() => {
    setScrubSec(null);
  }, [provider, trackId]);

  const computeDragBounds = useCallback(() => {
    if (typeof window === 'undefined') {
      return { left: -1000, right: 1000, top: -1000, bottom: 1000 };
    }
    const node = playerWrapperRef.current;
    if (!node) return { left: -1000, right: 1000, top: -1000, bottom: 1000 };
    const rect = node.getBoundingClientRect();
    const margin = 8;
    return {
      left: -rect.left + margin,
      right: window.innerWidth - rect.right - margin,
      top: -rect.top + margin,
      bottom: window.innerHeight - rect.bottom - margin,
    };
  }, []);

  const setDragBoundsIfChanged = useCallback(() => {
    const next = computeDragBounds();
    setDragBounds((prev) => {
      if (
        prev.left === next.left &&
        prev.right === next.right &&
        prev.top === next.top &&
        prev.bottom === next.bottom
      ) {
        return prev;
      }
      return next;
    });
  }, [computeDragBounds]);

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

  // Recenter positions when viewport changes
  useEffect(() => {
    const onResize = () => {
      setDragBoundsIfChanged();
      setCompactPosition((prev) => clampPositionToBounds(prev));
      if (!isCompact && !isMini) {
        setMainPosition((prev) => clampPositionToBounds(prev));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPositionToBounds, isCompact, isMini, setDragBoundsIfChanged]);

  useEffect(() => {
    if (!isCinema) return;
    const node = cinemaRef.current;
    if (!node) return;
    if (document.fullscreenElement) return;
    node.requestFullscreen?.().catch(() => {
      exitCinema();
    });
  }, [isCinema, exitCinema]);

  // Dev-only assertion: never allow more than one universal player mounted.
  // Skip in tests (React 18 StrictMode can mount/unmount twice in jsdom harness).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isTestEnv =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
    if (isTestEnv) return;
    if (process.env.NODE_ENV === 'production') return;
    const players = document.querySelectorAll('[data-player="universal"]');
    if (players.length > 1) {
      // Prefer not to crash the whole app in dev; log loudly.
      // This typically indicates the player host was mounted twice due to layout/route wiring.
      console.error('Invariant violated: more than one universal player mounted.');
    }
  }, []);

  // Dev guard: ensure only one iframe/provider instance and metadata present
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isTestEnv =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
    if (isTestEnv) return;
    if (process.env.NODE_ENV === 'production') return;
    const frames = document.querySelectorAll('iframe[src*="spotify"], iframe[src*="youtube"]');
    if (frames.length > 1) {
      console.error('Invariant violated: multiple provider iframes detected.');
    }
    if (isOpen && !resolvedTitle) {
      console.error('Invariant violated: player rendered without title.');
    }
  }, [isOpen, resolvedTitle]);

  useLayoutEffect(() => {
    setDragBoundsIfChanged();
  }, [isMini, isCompact, mainPosition, compactPosition, miniPosition, playerScale, setDragBoundsIfChanged, videoScale]);

  useEffect(() => {
    if (isMini) {
      setMiniPosition((prev) => clampMiniPosition(prev));
      return;
    }
    if (isCompact) {
      setCompactPosition((prev) => clampPositionToBounds(prev));
      return;
    }
    setMainPosition((prev) => clampPositionToBounds(prev));
  }, [clampMiniPosition, clampPositionToBounds, isCompact, isMini]);

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
      const point = 'touches' in e ? e.touches[0] : (e as MouseEvent);
      const clientX = point?.clientX ?? lastPlayerClientXRef.current;
      const clientY = point?.clientY ?? lastPlayerClientYRef.current;
      const deltaX = clientX - lastPlayerClientXRef.current;
      const deltaY = clientY - lastPlayerClientYRef.current;
      lastPlayerClientXRef.current = clientX;
      lastPlayerClientYRef.current = clientY;
      const delta = (deltaX + deltaY) * 0.0012;
      setPlayerScale((prev) => clampPlayerScale(prev + delta));
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

  const PlayerRoot: any = isTestEnv ? 'div' : motion.div;
  const VideoPanel: any = isTestEnv ? 'div' : motion.div;

  return (
    <>
      {/* Single Interchangeable Player - stays mounted for compact & mini so playback never stops */}
      <PlayerRoot
        ref={(node) => {
          playerWrapperRef.current = node;
          miniContainerRef.current = node;
          cinemaRef.current = node;
        }}
        {...(isTestEnv
          ? {}
          : {
              drag: isMini || !isScrubbing,
              dragConstraints: dragBounds,
              dragElastic: 0.15,
              initial: { y: 0, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: -20, opacity: 0 },
              transition: { duration: 0.2, ease: 'easeOut' },
            })}
        onDragEnd={(_, info) => {
          if (isMini) {
            const next = { x: miniPosition.x + info.offset.x, y: miniPosition.y + info.offset.y };
            setMiniPosition(clampMiniPosition(next));
          } else if (isCompact) {
            const next = { x: compactPosition.x + info.offset.x, y: compactPosition.y + info.offset.y };
            setCompactPosition(next);
            requestAnimationFrame(snapCompactToCorner);
          } else {
            const next = { x: mainPosition.x + info.offset.x, y: mainPosition.y + info.offset.y };
            setMainPosition(next);
          }
        }}
        data-player="universal"
        aria-hidden={isMini}
        className={`fixed z-[60] ${isMini ? 'pointer-events-none opacity-0' : 'pointer-events-auto'} ${
          isMini
            ? 'top-0 left-1/2 -translate-x-1/2 w-[min(720px,calc(100vw-32px))]'
            : isCompact
              ? 'top-0 left-0 translate-x-0 w-[min(460px,90vw)]'
              : 'top-16 left-1/2 -translate-x-1/2 w-[92vw] max-w-[720px]'
        }`}
        style={{
          scale: isMini ? 0.9 : isCompact ? 0.7 : playerScale,
          transformOrigin: isMini ? 'center' : isCompact ? 'top left' : 'top center',
          x: isMini ? -2000 : isCompact ? compactPosition.x : mainPosition.x,
          y: isMini ? -2000 : isCompact ? compactPosition.y : mainPosition.y,
          visibility: isMini ? 'hidden' : 'visible',
        }}
      >
        <div className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${meta.color} shadow-[0_18px_60px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl`}>
          {/* Header - Always visible, compact on mobile */}
          <div className="flex items-center gap-3 px-3 py-2.5 md:px-5 md:py-3 bg-background/80 backdrop-blur">
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
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 font-medium">Now Playing</span>
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
                  }}
                  className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                  aria-label="Show video and expand player"
                  title="Show video"
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
                    setIsCompact(true);
                  }}
                  className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground"
                  aria-label="Compact player and hide video"
                  title="Compact (hide video)"
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
                  // Collapse to mini but keep playback alive.
                  setIsCompact(false);
                  const targetPos = clampMiniPosition(getDefaultMiniPosition());
                  setMiniPosition(targetPos);
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

          {/* Embedded playback surface (singleton universal iframe) */}
          <VideoPanel
            initial={isTestEnv ? undefined : false}
            {...(isTestEnv
              ? {}
              : {
                  animate: {
                    height: provider && trackId && !isCompact ? 'auto' : 0,
                    opacity: provider && trackId && !isCompact ? 1 : 0,
                  },
                  transition: { duration: 0.25, ease: 'easeOut' },
                })}
            className="overflow-hidden bg-black/80"
            aria-hidden={!provider || !trackId || isCompact}
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
                <UniversalPlayerHost
                  request={
                    provider && trackId
                      ? {
                          provider,
                          id: trackId,
                          title: resolvedTitle,
                          artist: resolvedArtist,
                          autoplay,
                        }
                      : null
                  }
                />
              </div>
            </div>
          </VideoPanel>

          {/* Compact Controls Row: Seekbar + Volume inline */}
          <div className="flex items-center gap-2 px-3 pb-3 md:px-4 md:pb-4 text-white">
            <span className="text-[10px] md:text-xs tabular-nums w-12 text-right" aria-label="Elapsed time">{formatTime(positionSec)}</span>
            <div className="relative flex-1 min-w-[80px]">
              {!isMini && sections.length > 1 && durationMsSafe > 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center">
                  {sections.slice(1).map((section) => {
                    const left = Math.min(100, Math.max(0, (section.start_ms / durationMsSafe) * 100));
                    return (
                      <span
                        key={`marker-${section.id}`}
                        className="absolute top-1/2 -translate-y-1/2 h-2 w-px bg-white/40"
                        style={{ left: `${left}%` }}
                        aria-hidden="true"
                      />
                    );
                  })}
                </div>
              )}
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
                  if (!canSeekInEmbed) return;
                  const nextSec = Number(e.target.value);
                  if (!Number.isFinite(nextSec)) return;
                  setScrubSec(nextSec);
                  // Commit immediately so single taps and drag updates seek right away
                  commitSeek(nextSec);
                }}
                onPointerDown={(e) => {
                  if (!canSeekInEmbed) return;
                  const target = e.currentTarget as HTMLInputElement;
                  const nextSec = Number(target.value);
                  if (!Number.isFinite(nextSec)) return;
                  setScrubSec(nextSec);
                  setIsScrubbing(true);
                }}
                onPointerUp={(e) => {
                  if (!canSeekInEmbed) return;
                  const target = e.currentTarget as HTMLInputElement;
                  const nextSec = Number(target.value);
                  if (!Number.isFinite(nextSec)) return;
                  commitSeek(nextSec);
                  setIsScrubbing(false);
                }}
                onMouseUp={(e) => {
                  if (!canSeekInEmbed) return;
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
                disabled={isIdle || !canSeekInEmbed}
                className="relative z-10 w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 
                         [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full 
                         [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                aria-label="Seek"
              />
            </div>
            <span className="text-[10px] md:text-xs tabular-nums w-12 text-left" aria-label="Total duration">{formatTime(durationSec)}</span>

            <button
              onClick={toggleMute}
              className="inline-flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/95 transition hover:border-white/50 hover:bg-white/20"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-5 w-5 md:h-6 md:w-6" /> : <Volume2 className="h-5 w-5 md:h-6 md:w-6" />}
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

            {provider === 'spotify' && isSpotifyConnected !== true && (
              <button
                type="button"
                onClick={handleReconnectSpotify}
                className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 transition hover:border-white/60 hover:bg-white/20"
                aria-label="Reconnect Spotify"
                title="Reconnect Spotify"
              >
                Reconnect Spotify
              </button>
            )}

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

          {!isMini && !isCompact && sections.length > 0 && (
            <div className="px-3 pb-3 md:px-4 md:pb-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {sections.map((section) => {
                    const isActive = currentSectionId === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          if (typeof setCurrentSection === 'function') {
                            setCurrentSection(section.id);
                          }
                          if (canSeekInEmbed) {
                            seekToMs(section.start_ms);
                            return;
                          }
                          if (provider && trackId) {
                            const url = buildProviderDeepLink(provider, trackId, { startSec: Math.floor(section.start_ms / 1000) });
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className={[
                          'flex-shrink-0 rounded-full px-3 py-1 text-[11px] md:text-xs font-semibold transition border',
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary/50'
                            : 'bg-white/10 text-white/85 border-white/15 hover:bg-white/15',
                        ].join(' ')}
                        aria-label={`Jump to ${getSectionDisplayLabel(section.label)}`}
                        title={`Jump to ${getSectionDisplayLabel(section.label)}`}
                      >
                        {getSectionDisplayLabel(section.label)}
                      </button>
                    );
                  })}
                </div>

                {activeSection && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof setLoopSection !== 'function') return;
                      const next = loopSectionId === activeSection.id ? null : activeSection.id;
                      setLoopSection(next);
                    }}
                    className={[
                      'inline-flex h-8 w-8 items-center justify-center rounded-full border transition',
                      loopSectionId === activeSection.id
                        ? 'border-primary/50 bg-primary/20 text-primary-foreground'
                        : 'border-white/20 bg-white/10 text-white/90 hover:bg-white/15 hover:border-white/35',
                    ].join(' ')}
                    aria-label={loopSectionId === activeSection.id ? 'Disable section loop' : 'Loop section'}
                    title={loopSectionId === activeSection.id ? 'Disable section loop' : 'Loop section'}
                  >
                    <Repeat className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
          {!isMini && (
            <div
              className="absolute bottom-2 right-2 h-4 w-4 cursor-se-resize outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              tabIndex={0}
              onMouseDown={(e) => {
                e.preventDefault();
                playerResizeActiveRef.current = true;
                lastPlayerClientXRef.current = e.clientX;
                lastPlayerClientYRef.current = e.clientY;
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                lastPlayerClientXRef.current = touch?.clientX ?? 0;
                lastPlayerClientYRef.current = touch?.clientY ?? 0;
                playerResizeActiveRef.current = true;
              }}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPlayerScale(1);
                }
              }}
              title="Drag to resize player window"
              aria-label="Resize player window"
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
      </PlayerRoot>

      {isMini && (
        <motion.div
          drag
          dragElastic={0.2}
          dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
          onDragEnd={(_, info) => {
            const next = { x: miniPosition.x + info.offset.x, y: miniPosition.y + info.offset.y };
            setMiniPosition(clampMiniPosition(next));
          }}
          style={{ x: miniPosition.x, y: miniPosition.y }}
          role="region"
          aria-label="Mini player"
          aria-live="polite"
          className="pointer-events-auto fixed bottom-4 right-4 z-[65] w-[260px] max-w-[85vw] rounded-xl border border-border/60 bg-neutral-900/90 shadow-2xl backdrop-blur-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <div className="flex items-center justify-between px-3 py-2 gap-2">
            <div className="flex flex-col min-w-0">
              {resolvedTitle && <span className="text-sm font-semibold text-white truncate" aria-label="Mini player track title">{resolvedTitle}</span>}
              {resolvedArtist && <span className="text-xs text-white/70 truncate" aria-label="Mini player artist">{resolvedArtist}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={restoreToDocked}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Restore full player"
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
