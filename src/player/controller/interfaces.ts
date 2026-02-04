import type { MusicProvider, Track } from '@/types';

/**
 * Canonical track identifier used across queue, harmony, and playback.
 *
 * - Database tracks: UUID (preferred; enables sections + harmony DB lookups)
 * - Provider-only tracks: stable synthetic IDs like `spotify:<id>` / `youtube:<id>`
 */
export type CanonicalTrackId = string;

export type OpenPlayerIntent = {
  canonicalTrackId: CanonicalTrackId | null;
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

export type PlayerQueueState = {
  queue: Track[];
  queueIndex: number;
};

export type PlayerTransportState = {
  provider: MusicProvider | null;
  providerTrackId: string | null;
  canonicalTrackId: CanonicalTrackId | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number; // 0..1
  isMuted: boolean;
};

export type PlayerSectionState = {
  currentSectionId: string | null;
  loopSectionId: string | null;
};

/**
 * PlayerController interface (single source of truth).
 *
 * NOTE: The current implementation lives in `src/player/PlayerContext.tsx`.
 * This interface is the contract we refactor towards so non-UI code can
 * depend on the controller without importing React context types.
 */
export interface PlayerController {
  readonly isOpen: boolean;
  readonly state: PlayerTransportState & PlayerQueueState & PlayerSectionState;

  open: (intent: OpenPlayerIntent) => void;
  play: (intent: { canonicalTrackId: CanonicalTrackId | null; provider: MusicProvider; providerTrackId: string | null; startSec?: number }) => void;
  pause: () => void;
  stop: () => void;
  close: () => void;

  switchProvider: (provider: MusicProvider, providerTrackId: string | null, canonicalTrackId?: CanonicalTrackId | null) => void;
  seekToMs: (ms: number) => void;

  setVolume: (volume: number) => void;
  toggleMute: () => void;

  setCurrentSection: (sectionId: string | null) => void;
  setLoopSection: (sectionId: string | null) => void;

  enqueueNext: (track: Track) => void;
  enqueueLater: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (queue: Track[]) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

