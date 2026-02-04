import type { MusicProvider } from '@/types';

/**
 * Provider-agnostic control surface used by the PlayerController.
 *
 * IMPORTANT:
 * - Providers must be idempotent (duplicate calls are safe).
 * - Providers must not mutate global app state (they may load SDK scripts).
 * - Exactly one provider should be active at a time.
 */
export type ProviderControls = {
  play: (startSec?: number | null) => Promise<void> | void;
  pause: () => Promise<void> | void;
  seekTo: (seconds: number) => Promise<void> | void;
  setVolume: (volume: number) => Promise<void> | void; // 0..1
  setMute: (muted: boolean) => Promise<void> | void;
  teardown?: () => Promise<void> | void;
};

export type ProviderPlaybackUpdate = {
  positionMs?: number;
  durationMs?: number;
  isPlaying?: boolean;
  volume?: number;
  isMuted?: boolean;
  trackTitle?: string | null;
  trackArtist?: string | null;
  trackAlbum?: string | null;
  lastKnownTitle?: string | null;
  lastKnownArtist?: string | null;
  lastKnownAlbum?: string | null;
};

/**
 * Future-facing provider adapter interface (Spotify, YouTube, Apple, etc).
 *
 * Today, providers are implemented as React components that register ProviderControls
 * into PlayerContext. This interface is the contract we refactor towards so that
 * providers can be driven by a single controller without provider-specific leaks.
 */
export interface ProviderAdapter {
  readonly provider: MusicProvider;
  readonly controls: ProviderControls;

  /**
   * Called when this provider becomes active for the current track.
   * Implementations should load SDKs and prepare playback surfaces.
   */
  activate: (params: {
    providerTrackId: string;
    autoplay: boolean;
    startSec?: number | null;
  }) => Promise<void> | void;

  /**
   * Called when this provider is no longer active.
   * Implementations must stop playback and release resources.
   */
  deactivate: () => Promise<void> | void;
}

