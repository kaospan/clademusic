import { createContext, useContext, useMemo, useState, useCallback, useEffect, ReactNode } from 'react';
import { recordPlayEvent } from '@/api/playEvents';
import { MusicProvider } from '@/types';
import { getPreferredProvider } from '@/lib/preferences';

export interface ConnectedProviders {
  spotify?: { connected: boolean; premium: boolean };
}

export interface PlayerState {
  spotifyOpen: boolean;
  youtubeOpen: boolean;
  canonicalTrackId: string | null;
  spotifyTrackId: string | null;
  youtubeTrackId: string | null;
  autoplaySpotify: boolean;
  autoplayYoutube: boolean;
  /** Start time in seconds for seeking (e.g., section navigation) */
  seekToSec: number | null;
  /** Currently active section ID */
  currentSectionId: string | null;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Queue of tracks */
  queue: import('@/types').Track[];
  /** Current index in queue */
  queueIndex: number;
}

type OpenPlayerPayload = {
  canonicalTrackId: string | null;
  provider: MusicProvider;
  providerTrackId: string | null;
  autoplay?: boolean;
  context?: string;
  /** Optional start time in seconds */
  startSec?: number;
};

interface PlayerContextValue extends PlayerState {
  openPlayer: (payload: OpenPlayerPayload) => void;
  closeSpotify: () => void;
  closeYoutube: () => void;
  switchProvider: (provider: MusicProvider, providerTrackId: string | null, canonicalTrackId?: string | null) => void;
  /** Seek to a specific time (seconds). Used for section navigation. */
  seekTo: (sec: number) => void;
  /** Clear seekToSec after the player has performed the seek */
  clearSeek: () => void;
  /** Set the currently active section */
  setCurrentSection: (sectionId: string | null) => void;
  /** Set playback state */
  setIsPlaying: (playing: boolean) => void;
  /** Add track to queue */
  addToQueue: (track: import('@/types').Track) => void;
  /** Play track from queue at index */
  playFromQueue: (index: number) => void;
  /** Remove track from queue */
  removeFromQueue: (index: number) => void;
  /** Reorder queue */
  reorderQueue: (newQueue: import('@/types').Track[]) => void;
  /** Clear queue */
  clearQueue: () => void;
  /** Shuffle queue */
  shuffleQueue: () => void;
  /** Go to next track in queue */
  nextTrack: () => void;
  /** Go to previous track in queue */
  previousTrack: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const QUEUE_STORAGE_KEY = 'clade_queue_v1';

const clampQueueIndex = (queueLength: number, index: number) => {
  if (queueLength === 0) return -1;
  return Math.max(0, Math.min(index, queueLength - 1));
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>({
    spotifyOpen: false,
    youtubeOpen: false,
    canonicalTrackId: null,
    spotifyTrackId: null,
    youtubeTrackId: null,
    autoplaySpotify: false,
    autoplayYoutube: false,
    seekToSec: null,
    currentSectionId: null,
    isPlaying: false,
    queue: [],
    queueIndex: -1,
  });

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
  }, []);

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
    setState((prev) => ({ ...prev, seekToSec: sec }));
  }, []);

  const clearSeek = useCallback(() => {
    setState((prev) => ({ ...prev, seekToSec: null }));
  }, []);

  const setCurrentSection = useCallback((sectionId: string | null) => {
    setState((prev) => ({ ...prev, currentSectionId: sectionId }));
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setState((prev) => ({ ...prev, isPlaying: playing }));
  }, []);

  const addToQueue = useCallback((track: import('@/types').Track) => {
    setState((prev) => ({ ...prev, queue: [...prev.queue, track] }));
  }, []);

  const playFromQueue = useCallback((index: number) => {
    setState((prev) => {
      const track = prev.queue[index];
      if (!track) return prev;

      const provider = getPreferredProvider();
      const providerTrackId = provider === 'spotify' ? track.spotify_id : track.youtube_id;

      return {
        ...prev,
        queueIndex: index,
        canonicalTrackId: track.id,
        spotifyOpen: provider === 'spotify',
        youtubeOpen: provider === 'youtube',
        spotifyTrackId: provider === 'spotify' ? providerTrackId : null,
        youtubeTrackId: provider === 'youtube' ? providerTrackId : null,
        autoplaySpotify: provider === 'spotify',
        autoplayYoutube: provider === 'youtube',
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

      const provider = getPreferredProvider();
      const providerTrackId = provider === 'spotify' ? track.spotify_id : track.youtube_id;

      return {
        ...prev,
        queueIndex: nextIndex,
        canonicalTrackId: track.id,
        spotifyTrackId: provider === 'spotify' ? providerTrackId : null,
        youtubeTrackId: provider === 'youtube' ? providerTrackId : null,
        autoplaySpotify: provider === 'spotify',
        autoplayYoutube: provider === 'youtube',
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

      const provider = getPreferredProvider();
      const providerTrackId = provider === 'spotify' ? track.spotify_id : track.youtube_id;

      return {
        ...prev,
        queueIndex: prevIndex,
        canonicalTrackId: track.id,
        spotifyTrackId: provider === 'spotify' ? providerTrackId : null,
        youtubeTrackId: provider === 'youtube' ? providerTrackId : null,
        autoplaySpotify: provider === 'spotify',
        autoplayYoutube: provider === 'youtube',
      };
    });
  }, []);

  const value = useMemo<PlayerContextValue>(() => ({
    ...state,
    seekTo,
    clearSeek,
    setCurrentSection,
    setIsPlaying,
    addToQueue,
    playFromQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    shuffleQueue,
    nextTrack,
    previousTrack,
    openPlayer: (payload) => {
      setState((prev) => {
        const updates: Partial<PlayerState> = {
          canonicalTrackId: payload.canonicalTrackId ?? prev.canonicalTrackId,
          seekToSec: payload.startSec ?? null,
        };

        if (payload.provider === 'spotify') {
          updates.spotifyOpen = true;
          updates.spotifyTrackId = payload.providerTrackId;
          updates.autoplaySpotify = payload.autoplay ?? true;
        } else {
          updates.youtubeOpen = true;
          updates.youtubeTrackId = payload.providerTrackId;
          updates.autoplayYoutube = payload.autoplay ?? true;
        }

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
    },
    closeSpotify: () => setState((prev) => ({ ...prev, spotifyOpen: false, autoplaySpotify: false })),
    closeYoutube: () => setState((prev) => ({ ...prev, youtubeOpen: false, autoplayYoutube: false })),
    switchProvider: (provider, providerTrackId, canonicalTrackId) => {
      setState((prev) => {
        const updates: Partial<PlayerState> = {
          canonicalTrackId: canonicalTrackId ?? prev.canonicalTrackId,
          seekToSec: null,
        };

        if (provider === 'spotify') {
          updates.spotifyOpen = true;
          updates.spotifyTrackId = providerTrackId;
          updates.autoplaySpotify = true;
        } else {
          updates.youtubeOpen = true;
          updates.youtubeTrackId = providerTrackId;
          updates.autoplayYoutube = true;
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
    },
  }), [state, seekTo, clearSeek, setCurrentSection, setIsPlaying, addToQueue, playFromQueue, removeFromQueue, reorderQueue, clearQueue, shuffleQueue, nextTrack, previousTrack]);

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
