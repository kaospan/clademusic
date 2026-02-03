import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { getValidAccessToken } from '@/services/spotifyAuthService';
import { SpotifyEmbedPreview } from './SpotifyEmbedPreview';

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<any>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  addListener: (event: string, cb: (data: any) => void) => boolean;
  removeListener: (event: string, cb?: (data: any) => void) => boolean;
};

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
let sdkPromise: Promise<void> | null = null;

function loadSpotifyWebPlaybackSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.Spotify?.Player) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      // If script is already present, wait for readiness.
      const check = () => {
        if (window.Spotify?.Player) return resolve();
        setTimeout(check, 50);
      };
      check();
      return;
    }

    const timeout = setTimeout(() => reject(new Error('Spotify Web Playback SDK load timeout')), 15000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timeout);
      resolve();
    };

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Spotify Web Playback SDK'));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

async function spotifyApiFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return res;
}

interface SpotifyWebPlayerProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

/**
 * Spotify full-track playback via Web Playback SDK (requires Spotify Premium).
 * Falls back to the embed preview when SDK/auth/device isn't available.
 */
export function SpotifyWebPlayer({ providerTrackId, autoplay }: SpotifyWebPlayerProps) {
  const isTestEnv =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
  const { user } = useAuth();
  const {
    provider,
    autoplaySpotify,
    seekToSec,
    clearSeek,
    volume,
    isMuted,
    registerProviderControls,
    updatePlaybackState,
  } = usePlayer();

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);
  const volumeRef = useRef<number>(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const shouldAutoplay = useMemo(() => autoplay ?? autoplaySpotify ?? true, [autoplay, autoplaySpotify]);
  const uri = useMemo(() => (providerTrackId ? `spotify:track:${providerTrackId}` : null), [providerTrackId]);

  // Register controls even if we end up falling back; PlayerContext expects these for seek/volume.
  useEffect(() => {
    if (provider !== 'spotify') return;
    registerProviderControls('spotify', {
      play: async (startSec) => {
        const player = playerRef.current;
        if (!player) return;
        if (typeof startSec === 'number') await player.seek(Math.max(0, startSec * 1000));
        await player.resume();
      },
      pause: async () => {
        const player = playerRef.current;
        if (!player) return;
        await player.pause();
      },
      seekTo: async (seconds) => {
        const player = playerRef.current;
        if (!player) return;
        await player.seek(Math.max(0, seconds * 1000));
      },
      setVolume: async (vol) => {
        const player = playerRef.current;
        if (!player) return;
        await player.setVolume(Math.max(0, Math.min(1, vol)));
      },
      setMute: async (muted) => {
        const player = playerRef.current;
        if (!player) return;
        await player.setVolume(muted ? 0 : Math.max(0, Math.min(1, volumeRef.current)));
      },
      teardown: async () => {
        try {
          playerRef.current?.disconnect();
        } catch {
          // ignore
        } finally {
          playerRef.current = null;
          deviceIdRef.current = null;
        }
      },
    });
  }, [provider, registerProviderControls]);

  useEffect(() => {
    if (provider !== 'spotify' || !providerTrackId) return;
    setError(null);
    setReady(false);
    updatePlaybackState({
      positionMs: 0,
      durationMs: 0,
      isPlaying: shouldAutoplay,
    });
  }, [provider, providerTrackId, shouldAutoplay, updatePlaybackState]);

  useEffect(() => {
    if (provider !== 'spotify' || !providerTrackId) return;
    if (!user) {
      setError('Sign in to play full Spotify tracks.');
      return;
    }
    if (isTestEnv) return;

    let cancelled = false;

    const start = async () => {
      try {
        await loadSpotifyWebPlaybackSdk();
        if (cancelled) return;

        const getToken = async () => {
          const token = await getValidAccessToken(user.id);
          return token;
        };

        const token = await getToken();
        if (!token) {
          setError('Spotify connection missing or expired. Reconnect Spotify.');
          return;
        }

        // Create player once.
        if (!playerRef.current) {
          const PlayerCtor = window.Spotify?.Player;
          if (!PlayerCtor) throw new Error('Spotify SDK not available');

          const instance: SpotifyPlayerInstance = new PlayerCtor({
            name: 'Clade Player',
            volume: isMuted ? 0 : volumeRef.current,
            getOAuthToken: async (cb: (t: string) => void) => {
              const next = await getToken();
              if (next) cb(next);
            },
          });

          instance.addListener('ready', ({ device_id }: any) => {
            deviceIdRef.current = device_id;
            setReady(true);
          });

          instance.addListener('not_ready', () => {
            setReady(false);
          });

          instance.addListener('initialization_error', (e: any) => {
            console.error('[Spotify Web Player] init error', e);
            setError('Spotify player failed to initialize.');
          });

          instance.addListener('authentication_error', (e: any) => {
            console.error('[Spotify Web Player] auth error', e);
            setError('Spotify authentication failed. Reconnect Spotify.');
          });

          // Common: non-premium accounts cannot use Web Playback SDK.
          instance.addListener('account_error', (e: any) => {
            console.error('[Spotify Web Player] account error', e);
            setError('Spotify Premium is required for full-track playback. Using preview mode.');
          });

          instance.addListener('playback_error', (e: any) => {
            console.error('[Spotify Web Player] playback error', e);
            // Don’t hard-fail; allow fallback/polling to drive UI.
            setError((prev) => prev ?? 'Spotify playback error. Using preview mode.');
          });

          const ok = await instance.connect();
          if (!ok) {
            setError('Failed to connect Spotify player. Using preview mode.');
            return;
          }

          playerRef.current = instance;
        }

        // Wait for device id before controlling playback.
        const waitForDevice = async () => {
          const start = Date.now();
          while (!deviceIdRef.current && Date.now() - start < 8000) {
            await new Promise((r) => setTimeout(r, 50));
          }
          return deviceIdRef.current;
        };

        const deviceId = await waitForDevice();
        if (!deviceId) {
          setError('Spotify device not ready. Using preview mode.');
          return;
        }

        // Transfer playback to this device (required before play calls work reliably).
        const transfer = await spotifyApiFetch(token, '/me/player', {
          method: 'PUT',
          body: JSON.stringify({ device_ids: [deviceId], play: false }),
        });
        if (!transfer.ok && transfer.status !== 204) {
          const details = await transfer.json().catch(() => null);
          console.warn('[Spotify Web Player] transfer failed', transfer.status, details);
        }

        // Play the requested track (once per track change).
        if (uri && lastTrackIdRef.current !== providerTrackId) {
          lastTrackIdRef.current = providerTrackId;
          if (shouldAutoplay) {
            const playRes = await spotifyApiFetch(token, `/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
              method: 'PUT',
              body: JSON.stringify({ uris: [uri] }),
            });
            if (!playRes.ok && playRes.status !== 204) {
              const details = await playRes.json().catch(() => null);
              console.warn('[Spotify Web Player] play failed', playRes.status, details);
              // 403 usually means insufficient scope or premium requirement.
              if (playRes.status === 403) {
                setError('Spotify playback not permitted (403). Using preview mode.');
              }
            }
          }
        }

        // Poll playback state for seekbar sync.
        if (pollRef.current == null) {
          pollRef.current = window.setInterval(async () => {
            const player = playerRef.current;
            if (!player) return;
            const state = await player.getCurrentState().catch(() => null);
            if (!state) return;
            const track = state.track_window?.current_track;
            const artistNames = Array.isArray(track?.artists)
              ? track.artists.map((a: any) => a?.name).filter(Boolean).join(', ')
              : null;
            updatePlaybackState({
              positionMs: state.position ?? 0,
              durationMs: state.duration ?? 0,
              isPlaying: !state.paused,
              trackTitle: track?.name ?? null,
              trackArtist: artistNames,
              trackAlbum: track?.album?.name ?? null,
            });
          }, 500) as unknown as number;
        }
      } catch (e) {
        console.error('[Spotify Web Player] setup failed', e);
        setError('Spotify full playback failed to start. Using preview mode.');
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [isMuted, isTestEnv, provider, providerTrackId, shouldAutoplay, uri, updatePlaybackState, user]);

  useEffect(() => {
    if (provider !== 'spotify') return;
    if (seekToSec == null) return;
    // If we're in full playback mode, ProviderControls will handle seek; this is just belt-and-suspenders.
    const player = playerRef.current;
    if (player) {
      void player.seek(Math.max(0, seekToSec * 1000));
    }
    clearSeek();
  }, [provider, seekToSec, clearSeek]);

  useEffect(() => {
    return () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      try {
        playerRef.current?.disconnect();
      } catch {
        // ignore
      }
      playerRef.current = null;
      deviceIdRef.current = null;
    };
  }, []);

  if (provider !== 'spotify' || !providerTrackId) return null;

  // When Web Playback SDK isn't available (or user isn't premium), fall back to the embed preview.
  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] text-white/70">{error}</div>
        <SpotifyEmbedPreview providerTrackId={providerTrackId} autoplay={shouldAutoplay} />
      </div>
    );
  }

  // We don’t render an extra UI; playback is driven by the SDK + the universal seekbar.
  // Keep a tiny status line for debuggability.
  return (
    <div className="w-full">
      {!ready && <div className="text-[11px] text-white/50">Starting Spotify playback…</div>}
    </div>
  );
}

