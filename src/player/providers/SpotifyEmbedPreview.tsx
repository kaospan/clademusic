import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { getValidAccessToken } from '@/services/spotifyAuthService';

type SpotifyPlayer = {
  addListener: (event: string, cb: (...args: any[]) => void) => void;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (ms: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
};

type SpotifySDK = {
  Player: new (options: { name: string; getOAuthToken: (cb: (token: string) => void) => void; volume?: number }) => SpotifyPlayer;
};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: SpotifySDK;
  }
}

interface SpotifyEmbedPreviewProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

const SPOTIFY_EMBED_ALLOW = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';

let sdkPromise: Promise<void> | null = null;
let sdkReady = false;
let spotifyPlayerSingleton: SpotifyPlayer | null = null;
let spotifyDeviceId: string | null = null;
let audioContextResumed = false;
let spotifyListenersAttached = false;
let registeredFallbackControls = false;

const resetSpotifyState = () => {
  spotifyPlayerSingleton = null;
  spotifyDeviceId = null;
  spotifyListenersAttached = false;
};

const MIN_AUDIBLE_VOLUME = 0.05; // avoid accidental zeros when unmuted
const lastTrackStarted: { id: string | null } = { id: null };
const inFlightPlay: { running: boolean } = { running: false };

const loadSdk = () => {
  if (sdkReady) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.Spotify) {
      sdkReady = true;
      resolve();
      return;
    }

    // Define the global hook BEFORE the SDK loads; the SDK will invoke it immediately after execution.
    window.onSpotifyWebPlaybackSDKReady = () => {
      sdkReady = true;
      resolve();
    };

    const existing = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
    document.body.appendChild(script);
  });
  return sdkPromise;
};

const getOrCreatePlayer = (token: string, initialVolume: number): SpotifyPlayer => {
  if (spotifyPlayerSingleton) return spotifyPlayerSingleton;

  spotifyPlayerSingleton = new window.Spotify!.Player({
    name: 'Clade Player',
    getOAuthToken: (cb) => cb(token),
    volume: initialVolume,
  });

  return spotifyPlayerSingleton;
};

const resumeAudioContextOnGesture = () => {
  if (audioContextResumed) return;
  const handler = () => {
    const ctx = (window as any).__spotifyAudioContext;
    if (ctx?.state === 'suspended') {
      void ctx.resume();
    }
    audioContextResumed = true;
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
  };
  document.addEventListener('click', handler, { once: true });
  document.addEventListener('touchstart', handler, { once: true });
};

const logActiveDevice = async (token: string) => {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log('[Spotify] ACTIVE DEVICE:', data?.device);
  } catch (err) {
    console.warn('[Spotify] Failed to fetch active device', err);
  }
};

export function SpotifyEmbedPreview({ providerTrackId, autoplay }: SpotifyEmbedPreviewProps) {
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
    setDuration,
  } = usePlayer();

  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const volumeRef = useRef<number>(volume);
  const lastPositionRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);

  // Sync volume ref
  useEffect(() => {
    volumeRef.current = volume;
    if (playerRef.current) {
      playerRef.current.setVolume(isMuted ? 0 : volume).catch(() => {});
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (provider !== 'spotify' || !providerTrackId) return;

    // Guest / no token: fall back to lightweight iframe embed
    if (!user?.id) {
      setUseEmbedFallback(true);
      if (!registeredFallbackControls) {
        registerProviderControls('spotify', {
          play: async () => {},
          pause: async () => {},
          seekTo: async () => {},
          setVolume: async () => {},
          setMute: async () => {},
          teardown: async () => {},
        });
        registeredFallbackControls = true;
      }
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        const [_, token] = await Promise.all([
          loadSdk(),
          getValidAccessToken(user.id).catch((err) => {
            console.warn('Spotify token fetch failed, using embed fallback', err);
            return null;
          }),
        ]);
        if (cancelled || !window.Spotify) return;
        tokenRef.current = token;
        if (!token) {
          setUseEmbedFallback(true);
          if (!registeredFallbackControls) {
            registerProviderControls('spotify', {
              play: async () => {},
              pause: async () => {},
              seekTo: async () => {},
              setVolume: async () => {},
              setMute: async () => {},
              teardown: async () => {},
            });
            registeredFallbackControls = true;
          }
          return;
        }

        setUseEmbedFallback(false);
        const initialVolume = isMuted ? 0 : Math.max(volumeRef.current, MIN_AUDIBLE_VOLUME);
        const player = getOrCreatePlayer(token, initialVolume);

        if (!spotifyListenersAttached) {
          player.addListener('ready', async ({ device_id }) => {
            spotifyDeviceId = device_id;
            deviceIdRef.current = device_id;
            setReady(true);
            console.log('[Spotify] READY device:', device_id);
            try {
              await player.setVolume(Math.max(0.8, MIN_AUDIBLE_VOLUME));
            } catch (err) {
              console.warn('[Spotify] Failed to set initial volume', err);
            }
            void logActiveDevice(token);
            const shouldPlay = autoplay ?? autoplaySpotify ?? true;
            if (providerTrackId && lastTrackStarted.id !== providerTrackId) {
              lastTrackStarted.id = providerTrackId;
              const transferred = await transferPlayback(device_id, token, shouldPlay);
              await startPlayback(device_id, token, providerTrackId, seekToSec ?? 0, transferred);
            }
          });

          player.addListener('player_state_changed', (state) => {
            try {
              if (!state) return;
              const artistsArr = Array.isArray(state.track_window?.current_track?.artists)
                ? state.track_window?.current_track?.artists
                : [];
              const artistNames = artistsArr.map((a) => a?.name).filter(Boolean).join(', ') || null;

              const pos = typeof state.position === 'number' ? state.position : 0;
              const lastPos = lastPositionRef.current;
              const isGlitchyBackward = pos < lastPos - 1500 && !state.paused;
              if (!isGlitchyBackward) {
                lastPositionRef.current = pos;
              }

              console.log('[Spotify] state:', {
                paused: state.paused,
                position: state.position,
                duration: state.duration,
                track: state.track_window?.current_track?.name,
                volume: state.device?.volume_percent ?? state.volume,
              });
              if (state.duration) {
                setDuration(state.duration);
              }
              updatePlaybackState({
                positionMs: isGlitchyBackward ? lastPos : pos,
                durationMs: state.duration,
                isPlaying: !state.paused,
                volume: state.volume ?? volumeRef.current,
                isMuted: state.volume === 0,
                trackTitle: state.track_window?.current_track?.name ?? null,
                trackArtist: artistNames,
                trackAlbum: state.track_window?.current_track?.album?.name ?? null,
              });
              if (state.track_window?.current_track?.id) {
                lastTrackStarted.id = state.track_window.current_track.id;
              }
            } catch (err) {
              console.warn('[Spotify] state handler error', err);
            }
          });

          player.addListener('not_ready', ({ device_id }) => {
            console.warn('[Spotify] NOT_READY device:', device_id);
            setReady(false);
          });

          spotifyListenersAttached = true;
        }

        await player.connect();
        playerRef.current = player;
        resumeAudioContextOnGesture();

        registerProviderControls('spotify', {
          play: async (startSec) => {
            const tokenVal = tokenRef.current;
            const device = deviceIdRef.current;
            if (!tokenVal || !device) return;
            if (providerTrackId && lastTrackStarted.id === providerTrackId && ready) {
              await player.resume?.();
              return;
            }
            if (inFlightPlay.running) return;
            inFlightPlay.running = true;
            try {
              const transferred = await transferPlayback(device, tokenVal, true);
              if (providerTrackId) {
                lastTrackStarted.id = providerTrackId;
                await startPlayback(device, tokenVal, providerTrackId, startSec ?? 0, transferred);
              }
            } finally {
              inFlightPlay.running = false;
            }
          },
          pause: async () => {
            await player.pause();
          },
          seekTo: async (seconds: number) => {
            await player.seek(seconds * 1000);
          },
          setVolume: async (vol: number) => {
            volumeRef.current = vol;
            await player.setVolume(Math.max(vol, MIN_AUDIBLE_VOLUME));
          },
          setMute: async (muted: boolean) => {
            await player.setVolume(muted ? 0 : Math.max(volumeRef.current, MIN_AUDIBLE_VOLUME));
          },
          teardown: async () => {
            try {
              await player.disconnect();
            } catch (err) {
              console.warn('Spotify teardown disconnect failed', err);
            }
            playerRef.current = null;
            deviceIdRef.current = null;
            setReady(false);
            resetSpotifyState();
          },
        });
      } catch (err) {
        console.error('Spotify SDK setup failed', err);
        setUseEmbedFallback(true);
      }
    };

    setup();

    return () => {
      cancelled = true;
      // Do not disconnect the singleton on unmount to avoid orphan device audio; let teardown handle it on provider switch.
      playerRef.current = null;
      setReady(false);
    };
  }, [provider, providerTrackId, user?.id, autoplay, autoplaySpotify, registerProviderControls, updatePlaybackState, seekToSec, isMuted]);

  // Handle external seek commands
  useEffect(() => {
    if (provider !== 'spotify') return;
    if (seekToSec == null) return;
    if (playerRef.current) {
      playerRef.current.seek(seekToSec * 1000).catch(() => {});
    }
    clearSeek();
  }, [seekToSec, provider, clearSeek]);

  // Autoplay or start playback when track changes and player is ready (also covers return after provider switch)
  useEffect(() => {
    if (provider !== 'spotify') return;
    if (useEmbedFallback) return;
    if (!providerTrackId || !ready) return;

    const token = tokenRef.current;
    const device = deviceIdRef.current || spotifyDeviceId;
    if (!token || !device) return;

    const shouldPlay = autoplay ?? autoplaySpotify ?? false;
    if (!shouldPlay) return;
    void transferPlayback(device, token, true).then((transferred) => {
      void startPlayback(device, token, providerTrackId, seekToSec ?? 0, transferred);
    });
    
    // Ensure audible volume after transfer
    if (playerRef.current && !isMuted) {
      const vol = Math.max(volumeRef.current, MIN_AUDIBLE_VOLUME);
      playerRef.current.setVolume(vol).catch(() => {});
    }
  }, [provider, providerTrackId, ready, autoplay, autoplaySpotify, seekToSec, isMuted, useEmbedFallback]);

  if (provider !== 'spotify' || !providerTrackId) return null;

  if (useEmbedFallback) {
    return (
      <iframe
        title="Spotify preview"
        src={`https://open.spotify.com/embed/track/${providerTrackId}?utm_source=clade&theme=0&autoplay=1`}
        className="w-full h-20 md:h-[88px] rounded-xl border-0"
        allow={SPOTIFY_EMBED_ALLOW}
        loading="lazy"
      />
    );
  }

  return ready ? null : (
    <div className="w-full h-14 md:h-20 bg-gradient-to-r from-green-950/80 via-black to-green-950/80 rounded-xl overflow-hidden" />
  );
}

async function transferPlayback(deviceId: string, token: string, play: boolean) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play }),
    });
    if (!res.ok) {
      const body = await safeText(res);
      console.warn(`[Spotify] Transfer failed: ${res.status} ${res.statusText} body=${body}`);
      return false;
    } else {
      console.log('[Spotify] Transfer successful, play:', play);
    }
    return true;
  } catch (err) {
    console.error('[Spotify] Failed to transfer playback', err);
    return false;
  }
}

async function startPlayback(deviceId: string, token: string, trackId: string, startSec: number, transferred: boolean) {
  try {
    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [`spotify:track:${trackId}`],
        position_ms: Math.max(0, Math.floor(startSec * 1000)),
      }),
    });
    if (!res.ok) {
      const body = await safeText(res);
      console.warn(`[Spotify] Start playback failed: ${res.status} ${res.statusText} transferred=${transferred} body=${body}`);
    } else {
      console.log('[Spotify] Start playback successful for track:', trackId);
    }
  } catch (err) {
    console.error('[Spotify] Failed to start playback', err);
  }
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return '<no-body>';
  }
}
