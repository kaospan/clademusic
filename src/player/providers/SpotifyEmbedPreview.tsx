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

let sdkPromise: Promise<void> | null = null;

const loadSdk = () => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onload = () => {
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
    document.body.appendChild(script);
  });
  return sdkPromise;
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
  } = usePlayer();

  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const volumeRef = useRef<number>(volume);
  const [ready, setReady] = useState(false);

  // Sync volume ref
  useEffect(() => {
    volumeRef.current = volume;
    if (playerRef.current) {
      playerRef.current.setVolume(isMuted ? 0 : volume).catch(() => {});
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (provider !== 'spotify' || !providerTrackId || !user?.id) return;

    let cancelled = false;

    const setup = async () => {
      try {
        await loadSdk();
        if (cancelled || !window.Spotify) return;

        const token = await getValidAccessToken(user.id);
        tokenRef.current = token;
        if (!token) {
          console.warn('Spotify token unavailable; playback disabled');
          return;
        }

        const player = new window.Spotify.Player({
          name: 'Clade Player',
          getOAuthToken: (cb) => cb(token),
          volume: isMuted ? 0 : volumeRef.current,
        });

        player.addListener('ready', ({ device_id }) => {
          deviceIdRef.current = device_id;
          setReady(true);
          transferPlayback(device_id, token, autoplay ?? autoplaySpotify);
          if (providerTrackId) {
            startPlayback(device_id, token, providerTrackId, seekToSec ?? 0);
          }
        });

        player.addListener('player_state_changed', (state) => {
          if (!state) return;
          updatePlaybackState({
            positionMs: state.position,
            durationMs: state.duration,
            isPlaying: !state.paused,
            volume: state.volume ?? volumeRef.current,
            isMuted: state.volume === 0,
            trackTitle: state.track_window?.current_track?.name ?? null,
            trackArtist: state.track_window?.current_track?.artists?.map((a) => a.name).join(', ') ?? null,
            trackAlbum: state.track_window?.current_track?.album?.name ?? null,
          });
        });

        player.addListener('not_ready', () => {
          setReady(false);
        });

        await player.connect();
        playerRef.current = player;

        registerProviderControls('spotify', {
          play: async (startSec) => {
            const tokenVal = tokenRef.current;
            const device = deviceIdRef.current;
            if (!tokenVal || !device) return;
            await transferPlayback(device, tokenVal, true);
            if (providerTrackId) {
              await startPlayback(device, tokenVal, providerTrackId, startSec ?? 0);
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
            await player.setVolume(vol);
          },
          setMute: async (muted: boolean) => {
            await player.setVolume(muted ? 0 : volumeRef.current);
          },
          teardown: async () => {
            await player.disconnect();
          },
        });
      } catch (err) {
        console.error('Spotify SDK setup failed', err);
      }
    };

    setup();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
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

  if (provider !== 'spotify' || !providerTrackId) return null;

  return ready ? null : (
    <div className="w-full h-14 md:h-20 bg-gradient-to-r from-green-950/80 via-black to-green-950/80 rounded-xl overflow-hidden" />
  );
}

async function transferPlayback(deviceId: string, token: string, play: boolean) {
  try {
    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play }),
    });
  } catch (err) {
    console.error('Failed to transfer Spotify playback', err);
  }
}

async function startPlayback(deviceId: string, token: string, trackId: string, startSec: number) {
  try {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
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
  } catch (err) {
    console.error('Failed to start Spotify playback', err);
  }
}
