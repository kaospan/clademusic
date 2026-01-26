import { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { recordPlayEvent } from '@/api/playEvents';
import { MusicProvider } from '@/types';
import { getPreferredProvider } from '@/lib/preferences';

interface ConnectedProviders {
  spotify?: { connected: boolean };
  youtube?: { connected: boolean };
  apple_music?: { connected: boolean };
} 

export interface PlayerState {
  provider: MusicProvider | null;
  trackId: string | null;
  canonicalTrackId: string | null;
  trackTitle: string | null;
  trackArtist: string | null;
  trackAlbum: string | null;
  lastKnownTitle: string | null;
  lastKnownArtist: string | null;
  lastKnownAlbum: string | null;
  positionMs: number;
  durationMs: number;
  volume: number; // 0..1
  isMuted: boolean;
  spotifyOpen: boolean;
  youtubeOpen: boolean;
  spotifyTrackId: string | null;
  youtubeTrackId: string | null;
  autoplaySpotify: boolean;
  autoplayYoutube: boolean;
  isPlaying: boolean;
  isMinimized: boolean;
  isMini: boolean;
  isCinema: boolean;
  miniPosition: { x: number; y: number };
  seekToSec: number | null;
  currentSectionId: string | null;
  queue: import('@/types').Track[];
  queueIndex: number;
}

type ProviderControls = {
  play: (startSec?: number | null) => Promise<void> | void;
  pause: () => Promise<void> | void;
  seekTo: (seconds: number) => Promise<void> | void;
  setVolume: (volume: number) => Promise<void> | void; // 0..1
  setMute: (muted: boolean) => Promise<void> | void;
  teardown?: () => Promise<void> | void;
};

type OpenPlayerPayload = {
  canonicalTrackId: string | null;
  provider: MusicProvider;
  providerTrackId: string | null;
  title?: string;
  artist?: string;
  album?: string;
  autoplay?: boolean;
  context?: string;
  /** Optional start time in seconds */
  startSec?: number;
};

interface PlayerContextValue extends PlayerState {
  readonly isOpen: boolean;
  openPlayer: (payload: OpenPlayerPayload) => void;
  /** High-level play API: canonicalTrackId may be the app track id (optional), provider selects the provider, providerTrackId is the provider-specific id, startSec optional */
  play: (canonicalTrackId: string | null, provider: MusicProvider, providerTrackId?: string | null, startSec?: number) => void;
  pause: () => void;
  stop: () => void;
  closePlayer: () => void;
  /** High-level play API: canonicalTrackId may be the app track id (optional), provider selects the provider, providerTrackId is the provider-specific id, startSec optional */
  play: (canonicalTrackId: string | null, provider: MusicProvider, providerTrackId?: string | null, startSec?: number) => void;
  pause: () => void;
  stop: () => void;
  closeSpotify: () => void;
  closeYoutube: () => void;
  switchProvider: (provider: MusicProvider, providerTrackId: string | null, canonicalTrackId?: string | null) => void;
  seekTo: (sec: number) => void;
  clearSeek: () => void;
  seekToMs: (ms: number) => void;
  togglePlayPause: () => void;
  setVolumeLevel: (volume: number) => void;
  toggleMute: () => void;
  setCurrentSection: (sectionId: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setMinimized: (value: boolean) => void;
  collapseToMini: () => void;
  restoreFromMini: () => void;
  setMiniPosition: (pos: { x: number; y: number }) => void;
  enterCinema: () => void;
  exitCinema: () => void;
  registerProviderControls: (provider: MusicProvider, controls: ProviderControls) => void;
  updatePlaybackState: (updates: Partial<Pick<PlayerState, 'positionMs' | 'durationMs' | 'isPlaying' | 'volume' | 'isMuted' | 'trackTitle' | 'trackArtist' | 'trackAlbum' | 'lastKnownTitle' | 'lastKnownArtist' | 'lastKnownAlbum'>>) => void;
  addToQueue: (track: import('@/types').Track) => void;
  playFromQueue: (index: number) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (newQueue: import('@/types').Track[]) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const QUEUE_STORAGE_KEY = 'clade_queue_v1';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const dedupeArtists = (artist: string | null) => {
  if (!artist) return null;
  const seen = new Set<string>();
  const parts = artist
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => {
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return parts.length ? parts.join(', ') : null;
};

const clampQueueIndex = (queueLength: number, index: number) => {
  if (queueLength === 0) return -1;
  return Math.max(0, Math.min(index, queueLength - 1));
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>({
    provider: null,
    trackId: null,
    canonicalTrackId: null,
    trackTitle: null,
    trackArtist: null,
    trackAlbum: null,
    lastKnownTitle: null,
    lastKnownArtist: null,
    lastKnownAlbum: null,
    positionMs: 0,
    durationMs: 0,
    volume: 0.7,
    isMuted: false,
    spotifyOpen: false,
    youtubeOpen: false,
    spotifyTrackId: null,
    youtubeTrackId: null,
    autoplaySpotify: false,
    autoplayYoutube: false,
    isPlaying: false,
    isMinimized: false,
    isMini: false,
    isCinema: false,
    miniPosition: { x: 0, y: 0 },
    seekToSec: null,
    currentSectionId: null,
    queue: [],
    queueIndex: -1,
  });
  const providerControlsRef = useRef<Partial<Record<MusicProvider, ProviderControls>>>({});

  // Hydrate queue from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { queue?: import('@/types').Track[]; queueIndex?: number };
      const queue = Array.isArray(parsed?.queue) ? parsed.queue : [];
      const queueIndex = clampQueueIndex(queue.length, typeof parsed?.queueIndex === 'number' ? parsed.queueIndex : -1);
      setState((prev) => ({ ...prev, queue, queueIndex }));
    } catch (err) {
      console.error('Failed to hydrate queue from storage', err);
    }
  }, [state.provider]);

  // Persist queue to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({
        queue: state.queue,
        queueIndex: clampQueueIndex(state.queue.length, state.queueIndex),
      });
      localStorage.setItem(QUEUE_STORAGE_KEY, payload);
    } catch (err) {
      console.error('Failed to persist queue to storage', err);
    }
  }, [state.queue, state.queueIndex]);

  const seekTo = useCallback((sec: number) => {
    setState((prev) => ({ ...prev, seekToSec: sec, positionMs: sec * 1000 }));
  }, [state.provider]);

  const clearSeek = useCallback(() => {
    setState((prev) => ({ ...prev, seekToSec: null }));
  }, []);

  const seekToMs = useCallback((ms: number) => {
    const sec = Math.max(0, ms / 1000);
    setState((prev) => ({ ...prev, positionMs: ms }));
    seekTo(sec);
  }, [seekTo]);

  const setCurrentSection = useCallback((sectionId: string | null) => {
    setState((prev) => ({ ...prev, currentSectionId: sectionId }));
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setState((prev) => ({ ...prev, isPlaying: playing }));
  }, []);

  const setVolumeLevel = useCallback((volume: number) => {
    const clamped = clamp01(volume);
    setState((prev) => ({ ...prev, volume: clamped, isMuted: clamped === 0 ? true : prev.isMuted && clamped === 0 }));
    const activeProvider = state.provider;
    if (activeProvider) {
      providerControlsRef.current[activeProvider]?.setVolume?.(clamped);
      if (clamped > 0) {
        providerControlsRef.current[activeProvider]?.setMute?.(false);
      }
    }
  }, [state.provider]);

  const toggleMute = useCallback(() => {
    setState((prev) => {
      const nextMuted = !prev.isMuted;
      const activeProvider = prev.provider;
      if (activeProvider) {
        providerControlsRef.current[activeProvider]?.setMute?.(nextMuted);
      }
      return { ...prev, isMuted: nextMuted };
    });
  }, []);

  const togglePlayPause = useCallback(() => {
    setState((prev) => {
      const activeProvider = prev.provider;
      const controls = activeProvider ? providerControlsRef.current[activeProvider] : undefined;
      if (!controls) return prev;

      if (prev.isPlaying) {
        controls.pause?.();
        return {
          ...prev,
          isPlaying: false,
          autoplaySpotify: false,
          autoplayYoutube: false,
        };
      }

      controls.play?.(prev.seekToSec ?? null);
      return {
        ...prev,
        isPlaying: true,
        autoplaySpotify: activeProvider === 'spotify',
        autoplayYoutube: activeProvider === 'youtube',
      };
    });
  }, []);

  const registerProviderControls = useCallback((provider: MusicProvider, controls: ProviderControls) => {
    providerControlsRef.current[provider] = controls;
  }, []);

  const updatePlaybackState = useCallback((updates: Partial<Pick<PlayerState, 'positionMs' | 'durationMs' | 'isPlaying' | 'volume' | 'isMuted' | 'trackTitle' | 'trackArtist' | 'trackAlbum' | 'lastKnownTitle' | 'lastKnownArtist' | 'lastKnownAlbum'>>) => {
    setState((prev) => {
      const next: PlayerState = { ...prev };

      if (updates.positionMs !== undefined) next.positionMs = Math.max(0, updates.positionMs);
      if (updates.durationMs !== undefined) next.durationMs = Math.max(updates.durationMs, 0);
      if (updates.isPlaying !== undefined) next.isPlaying = updates.isPlaying;
      if (updates.volume !== undefined) next.volume = clamp01(updates.volume);
      if (updates.isMuted !== undefined) next.isMuted = updates.isMuted;

      const title = updates.trackTitle ?? prev.trackTitle ?? prev.lastKnownTitle;
      if (title) {
        next.trackTitle = title;
        next.lastKnownTitle = title;
      }

      const artistInput = updates.trackArtist ?? prev.trackArtist ?? prev.lastKnownArtist;
      const dedupedArtist = dedupeArtists(artistInput);
      if (dedupedArtist) {
        next.trackArtist = dedupedArtist;
        next.lastKnownArtist = dedupedArtist;
      }

      const album = updates.trackAlbum ?? prev.trackAlbum ?? prev.lastKnownAlbum;
      if (album) {
        next.trackAlbum = album;
        next.lastKnownAlbum = album;
      }

      return next;
    });
  }, []);

  const setMinimized = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, isMinimized: value }));
  }, []);

  const collapseToMini = useCallback(() => {
    setState((prev) => ({ ...prev, isMini: true, isMinimized: true }));
  }, []);

  const restoreFromMini = useCallback(() => {
    setState((prev) => ({ ...prev, isMini: false, isMinimized: false }));
  }, []);

  const setMiniPosition = useCallback((pos: { x: number; y: number }) => {
    setState((prev) => ({ ...prev, miniPosition: pos }));
  }, []);

  const enterCinema = useCallback(() => {
    setState((prev) => ({ ...prev, isCinema: true }));
  }, []);

  const exitCinema = useCallback(() => {
    setState((prev) => ({ ...prev, isCinema: false }));
  }, []);

  const addToQueue = useCallback((track: import('@/types').Track) => {
    setState((prev) => ({ ...prev, queue: [...prev.queue, track] }));
  }, []);

  const playFromQueue = useCallback((index: number) => {
    setState((prev) => {
      const track = prev.queue[index];
      if (!track) return prev;
      return {
        ...prev,
        queueIndex: index,
        canonicalTrackId: track.id,
        provider: getPreferredProvider(),
        trackId: getPreferredProvider() === 'spotify' ? track.spotify_id : track.youtube_id,
      };
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState((prev) => {
      const newQueue = prev.queue.filter((_, i) => i !== index);
      const adjustedIndex = index < prev.queueIndex ? prev.queueIndex - 1 : prev.queueIndex;
      const queueIndex = clampQueueIndex(newQueue.length, adjustedIndex);
      return { ...prev, queue: newQueue, queueIndex };
    });
  }, []);

  const reorderQueue = useCallback((newQueue: import('@/types').Track[]) => {
    setState((prev) => ({
      ...prev,
      queue: newQueue,
      queueIndex: clampQueueIndex(newQueue.length, prev.queueIndex),
    }));
  }, []);

  const clearQueue = useCallback(() => {
    setState((prev) => ({ ...prev, queue: [], queueIndex: -1 }));
  }, []);

  const shuffleQueue = useCallback(() => {
    setState((prev) => {
      const currentTrack = prev.queue[prev.queueIndex];
      const remainingTracks = prev.queue.slice(prev.queueIndex + 1);
      const shuffled = [...remainingTracks].sort(() => Math.random() - 0.5);
      const newQueue = [
        ...prev.queue.slice(0, prev.queueIndex + 1),
        ...shuffled
      ];
      return { ...prev, queue: newQueue, queueIndex: clampQueueIndex(newQueue.length, prev.queueIndex) };
    });
  }, []);

  const nextTrack = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length === 0) return prev;
      
      // Loop to first track if at the end
      const nextIndex = prev.queueIndex >= prev.queue.length - 1 ? 0 : prev.queueIndex + 1;
      const track = prev.queue[nextIndex];
      if (!track) return prev;

      return {
        ...prev,
        queueIndex: nextIndex,
        canonicalTrackId: track.id,
        provider: getPreferredProvider(),
        trackId: getPreferredProvider() === 'spotify' ? track.spotify_id : track.youtube_id,
      };
    });
  }, []);

  const previousTrack = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length === 0) return prev;
      
      // Loop to last track if at the beginning
      const prevIndex = prev.queueIndex <= 0 ? prev.queue.length - 1 : prev.queueIndex - 1;
      const track = prev.queue[prevIndex];
      if (!track) return prev;

      return {
        ...prev,
        queueIndex: prevIndex,
        canonicalTrackId: track.id,
        provider: getPreferredProvider(),
        trackId: getPreferredProvider() === 'spotify' ? track.spotify_id : track.youtube_id,
      };
    });
  }, []);

  // High-level play/pause/stop helpers
  const play = useCallback((canonicalTrackId: string | null, provider: MusicProvider, providerTrackId?: string | null, startSec?: number) => {
    setState((prev) => {
      const updates: Partial<PlayerState> = {
        canonicalTrackId: canonicalTrackId ?? prev.canonicalTrackId,
        seekToSec: startSec ?? null,
      };

      if (provider === 'spotify') {
        updates.spotifyOpen = true;
        updates.spotifyTrackId = providerTrackId ?? prev.spotifyTrackId;
        updates.autoplaySpotify = true;
        updates.youtubeOpen = false;
        updates.autoplayYoutube = false;
      } else {
        updates.youtubeOpen = true;
        updates.youtubeTrackId = providerTrackId ?? prev.youtubeTrackId;
        updates.autoplayYoutube = true;
        updates.spotifyOpen = false;
        updates.autoplaySpotify = false;
      }

      updates.isPlaying = true;

      return { ...prev, ...updates };
    });

    if (canonicalTrackId) {
      recordPlayEvent({ track_id: canonicalTrackId, provider, action: 'preview', context: 'player' }).catch((err) => console.error('Failed to record play event', err));
    }
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false, autoplaySpotify: false, autoplayYoutube: false }));
  }, []);

  const stop = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false, spotifyOpen: false, youtubeOpen: false, spotifyTrackId: null, youtubeTrackId: null, canonicalTrackId: null, autoplaySpotify: false, autoplayYoutube: false, seekToSec: null }));
  }, []);

  // High-level play/pause/stop helpers
  const play = useCallback((canonicalTrackId: string | null, provider: MusicProvider, providerTrackId?: string | null, startSec?: number) => {
    const prevProvider = state.provider;
    if (prevProvider && prevProvider !== provider) {
      providerControlsRef.current[prevProvider]?.pause?.();
      providerControlsRef.current[prevProvider]?.setMute?.(true);
      providerControlsRef.current[prevProvider]?.teardown?.();
    }

    setState((prev) => {
      const updates: Partial<PlayerState> = {
        canonicalTrackId: canonicalTrackId ?? prev.canonicalTrackId,
        seekToSec: startSec ?? null,
        provider,
        trackId: providerTrackId ?? prev.trackId,
        trackTitle: prev.trackTitle ?? prev.lastKnownTitle,
        trackArtist: dedupeArtists(prev.trackArtist ?? prev.lastKnownArtist),
        trackAlbum: prev.trackAlbum ?? prev.lastKnownAlbum,
        isMinimized: false,
        isMini: false,
        isCinema: false,
        positionMs: startSec ? startSec * 1000 : prev.positionMs,
        isMuted: false,
      };

      if (provider === 'spotify') {
        updates.spotifyOpen = true;
        updates.spotifyTrackId = providerTrackId ?? prev.spotifyTrackId;
        updates.autoplaySpotify = true;
        updates.youtubeOpen = false;
        updates.autoplayYoutube = false;
      } else {
        updates.youtubeOpen = true;
        updates.youtubeTrackId = providerTrackId ?? prev.youtubeTrackId;
        updates.autoplayYoutube = true;
        updates.spotifyOpen = false;
        updates.autoplaySpotify = false;
      }

      updates.isPlaying = true;

      return { ...prev, ...updates };
    });

    if (canonicalTrackId) {
      recordPlayEvent({ track_id: canonicalTrackId, provider, action: 'preview', context: 'player' }).catch((err) => console.error('Failed to record play event', err));
    }
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false, autoplaySpotify: false, autoplayYoutube: false }));
  }, []);

  const stop = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      spotifyOpen: false,
      youtubeOpen: false,
      spotifyTrackId: null,
      youtubeTrackId: null,
      canonicalTrackId: null,
      trackId: null,
      provider: null,
       lastKnownTitle: prev.trackTitle ?? prev.lastKnownTitle,
       lastKnownArtist: prev.trackArtist ?? prev.lastKnownArtist,
       lastKnownAlbum: prev.trackAlbum ?? prev.lastKnownAlbum,
      autoplaySpotify: false,
      autoplayYoutube: false,
      seekToSec: null,
      isMini: false,
      isCinema: false,
    }));
  }, []);

  const openPlayer = useCallback((payload: OpenPlayerPayload) => {
    const prevProvider = state.provider;
    if (prevProvider && prevProvider !== payload.provider) {
      providerControlsRef.current[prevProvider]?.pause?.();
      providerControlsRef.current[prevProvider]?.setMute?.(true);
      providerControlsRef.current[prevProvider]?.teardown?.();
    }

    setState((prev) => {
      const updates: Partial<PlayerState> = {
        provider: payload.provider,
        trackId: payload.providerTrackId,
        canonicalTrackId: payload.canonicalTrackId ?? prev.canonicalTrackId,
        trackTitle: payload.title ?? prev.trackTitle ?? prev.lastKnownTitle,
        trackArtist: dedupeArtists(payload.artist ?? prev.trackArtist ?? prev.lastKnownArtist),
        trackAlbum: payload.album ?? prev.trackAlbum ?? prev.lastKnownAlbum,
        lastKnownTitle: payload.title ?? prev.trackTitle ?? prev.lastKnownTitle,
        lastKnownArtist: dedupeArtists(payload.artist ?? prev.trackArtist ?? prev.lastKnownArtist),
        lastKnownAlbum: payload.album ?? prev.trackAlbum ?? prev.lastKnownAlbum,
        seekToSec: payload.startSec ?? null,
        positionMs: payload.startSec ? payload.startSec * 1000 : 0,
        durationMs: prev.durationMs || 0,
        isMuted: false,
        isMinimized: false,
        isMini: false,
        isCinema: false,
        isPlaying: payload.autoplay ?? true,
        spotifyOpen: payload.provider === 'spotify',
        youtubeOpen: payload.provider === 'youtube',
        spotifyTrackId: payload.provider === 'spotify' ? payload.providerTrackId : prev.spotifyTrackId,
        youtubeTrackId: payload.provider === 'youtube' ? payload.providerTrackId : prev.youtubeTrackId,
        autoplaySpotify: payload.provider === 'spotify' ? payload.autoplay ?? true : false,
        autoplayYoutube: payload.provider === 'youtube' ? payload.autoplay ?? true : false,
      };
      return { ...prev, ...updates };
    });

    if (payload.canonicalTrackId) {
      recordPlayEvent({
        track_id: payload.canonicalTrackId,
        provider: payload.provider,
        action: 'preview',
        context: payload.context ?? 'player',
      }).catch((err) => {
        console.error('Failed to record play event', err);
      });
    }
  }, []);

  const closePlayer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      provider: null,
      trackId: null,
      canonicalTrackId: null,
      trackTitle: prev.trackTitle,
      trackArtist: prev.trackArtist,
      isPlaying: false,
      isMinimized: false,
      isMini: false,
      isCinema: false,
      seekToSec: null,
      spotifyOpen: false,
      youtubeOpen: false,
      spotifyTrackId: null,
      youtubeTrackId: null,
      autoplaySpotify: false,
      autoplayYoutube: false,
    }));
  }, []);

  const closeSpotify = useCallback(() => {
    setState((prev) => ({ ...prev, spotifyOpen: false, autoplaySpotify: false }));
  }, []);

  const closeYoutube = useCallback(() => {
    setState((prev) => ({ ...prev, youtubeOpen: false, autoplayYoutube: false }));
  }, []);

  const switchProvider = useCallback((provider: MusicProvider, providerTrackId: string | null, canonicalTrackId?: string | null) => {
    const prevProvider = state.provider;
    if (prevProvider && prevProvider !== provider) {
      providerControlsRef.current[prevProvider]?.pause?.();
      providerControlsRef.current[prevProvider]?.setMute?.(true);
      providerControlsRef.current[prevProvider]?.teardown?.();
    }

    setState((prev) => {
      const updates: Partial<PlayerState> = {
        canonicalTrackId: canonicalTrackId ?? prev.canonicalTrackId,
        seekToSec: null,
        provider,
        trackId: providerTrackId ?? prev.trackId,
        trackTitle: prev.trackTitle ?? prev.lastKnownTitle,
        trackArtist: dedupeArtists(prev.trackArtist ?? prev.lastKnownArtist),
        trackAlbum: prev.trackAlbum ?? prev.lastKnownAlbum,
        isMinimized: false,
        isMini: false,
        isCinema: false,
        isPlaying: true,
        isMuted: false,
      };

      if (provider === 'spotify') {
        updates.spotifyOpen = true;
        updates.spotifyTrackId = providerTrackId;
        updates.autoplaySpotify = true;
        updates.youtubeOpen = false;
        updates.autoplayYoutube = false;
      } else {
        updates.youtubeOpen = true;
        updates.youtubeTrackId = providerTrackId;
        updates.autoplayYoutube = true;
        updates.spotifyOpen = false;
        updates.autoplaySpotify = false;
      }

      return { ...prev, ...updates };
    });

    const trackIdToLog = canonicalTrackId ?? state.canonicalTrackId;
    if (trackIdToLog) {
      recordPlayEvent({
        track_id: trackIdToLog,
        provider,
        action: 'preview',
        context: 'provider-switch',
      }).catch((err) => {
        console.error('Failed to record provider switch event', err);
      });
    }
  }, [state.canonicalTrackId, state.provider]);

  const isOpen = !!state.provider && !!state.trackId;

  // Dev-only invariants: single provider and metadata presence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return;

    if (state.spotifyOpen && state.youtubeOpen) {
      throw new Error('Invariant violated: both providers open; only one provider may be active.');
    }

    if (isOpen && (!state.trackTitle && !state.lastKnownTitle)) {
      throw new Error('Invariant violated: player open without title; metadata must be resolved before render.');
    }
  }, [isOpen, state.spotifyOpen, state.youtubeOpen, state.trackTitle, state.lastKnownTitle]);

  // Expose debug state in dev/test only for Playwright provider-atomicity assertions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (import.meta.env.MODE === 'production') return;
    (window as any).__PLAYER_DEBUG_STATE__ = {
      activeProvider: state.provider,
      isPlaying: state.isPlaying,
      providers: {
        spotify: { isPlaying: state.provider === 'spotify' && state.isPlaying },
        youtube: { isPlaying: state.provider === 'youtube' && state.isPlaying },
      },
    };
  }, [state.provider, state.isPlaying]);

  // Ensure the page layout reserves space for the floating player when open so
  // the player never ends up visually behind other UI. We toggle a body class
  // and set a CSS variable with the player's height to let global styles
  // push content above the player (no content is covered).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const el = document.body;
      if (isOpen) {
        el.classList.add('clade-player-open');
        // Keep this in sync with EmbeddedPlayerDrawer's height
        el.style.setProperty('--clade-player-height', '52px');
      } else {
        el.classList.remove('clade-player-open');
        el.style.removeProperty('--clade-player-height');
      }
    } catch (err) {
      console.error('Failed to toggle player body class', err);
    }
  }, [isOpen]);

  const value = useMemo<PlayerContextValue>(() => ({
    ...state,
    isOpen,
    openPlayer,
    play,
    pause,
    stop,
    closePlayer,
    closeSpotify,
    closeYoutube,
    switchProvider,
    seekTo,
    seekToMs,
    clearSeek,
    togglePlayPause,
    setVolumeLevel,
    toggleMute,
    setCurrentSection,
    setIsPlaying,
    setMinimized,
    collapseToMini,
    restoreFromMini,
    setMiniPosition,
    enterCinema,
    exitCinema,
    registerProviderControls,
    updatePlaybackState,
    addToQueue,
    playFromQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    shuffleQueue,
    nextTrack,
    previousTrack,
  }), [state, isOpen, openPlayer, play, pause, stop, closePlayer, closeSpotify, closeYoutube, switchProvider, seekTo, seekToMs, clearSeek, togglePlayPause, setVolumeLevel, toggleMute, setCurrentSection, setIsPlaying, setMinimized, collapseToMini, restoreFromMini, setMiniPosition, enterCinema, exitCinema, registerProviderControls, updatePlaybackState, addToQueue, playFromQueue, removeFromQueue, reorderQueue, clearQueue, shuffleQueue, nextTrack, previousTrack]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function resolveDefaultProvider(connected: ConnectedProviders): MusicProvider {
  // First check user's preferred provider from localStorage
  const preferred = getPreferredProvider();
  if (preferred) {
    // If user prefers Spotify, check if it's connected
    if (preferred === 'spotify' && connected?.spotify?.connected) {
      return 'spotify';
    }
    // For other providers, use the preference if it's valid
    if (preferred === 'youtube' || preferred === 'apple_music') {
      return preferred;
    }
  }
  
  // Fallback: if Spotify is connected, use it
  if (connected?.spotify?.connected) return 'spotify';
  
  // Default to YouTube
  return 'youtube';
}
