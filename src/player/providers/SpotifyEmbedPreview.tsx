import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../PlayerContext';
import { useAuth } from '@/hooks/useAuth';

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; theme?: number; width?: string; height?: string },
    callback: (controller: SpotifyIframeController) => void
  ) => void;
};

type SpotifyIframeController = {
  play: () => void;
  pause: () => void;
  togglePlay?: () => void;
  seek?: (seconds: number) => void;
  loadUri?: (uri: string) => void;
  addListener: (event: string, cb: (data: any) => void) => void;
  removeListener?: (event: string, cb?: (data: any) => void) => void;
  setVolume?: (volume: number) => void;
  destroy?: () => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
    SpotifyIframeApi?: SpotifyIframeApi;
  }
}

interface SpotifyEmbedPreviewProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

const IFRAME_API_URL = 'https://open.spotify.com/embed/iframe-api/v1';
let iframeApiPromise: Promise<SpotifyIframeApi> | null = null;

const loadIframeApi = () => {
  if (window.SpotifyIframeApi) return Promise.resolve(window.SpotifyIframeApi);
  if (iframeApiPromise) return iframeApiPromise;
  iframeApiPromise = new Promise<SpotifyIframeApi>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Spotify IFrame API load timeout')), 10000);
    window.onSpotifyIframeApiReady = (api) => {
      clearTimeout(timeout);
      window.SpotifyIframeApi = api;
      resolve(api);
    };

    const existing = document.querySelector(`script[src="${IFRAME_API_URL}"]`);
    if (existing) return;

    const script = document.createElement('script');
    script.src = IFRAME_API_URL;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Spotify IFrame API'));
    document.body.appendChild(script);
  });
  return iframeApiPromise;
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
    updatePlaybackState = () => {},
  } = usePlayer();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SpotifyIframeController | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);
  const lastEmitTsRef = useRef<number>(0);
  const volumeRef = useRef<number>(volume);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    volumeRef.current = volume;
    if (controllerRef.current?.setVolume) {
      controllerRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (provider !== 'spotify' || !providerTrackId) return;
    setErrorMessage(null);
    setReady(false);
    lastTrackIdRef.current = providerTrackId;
    lastEmitTsRef.current = 0;
    updatePlaybackState({
      positionMs: 0,
      durationMs: 0,
      isPlaying: autoplay ?? autoplaySpotify ?? true,
    });
  }, [provider, providerTrackId, autoplay, autoplaySpotify, updatePlaybackState]);

  useEffect(() => {
    if (provider !== 'spotify' || !providerTrackId) return;
    if (!user?.id) {
      setErrorMessage('Sign in to connect Spotify for full-track playback.');
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        const api = await loadIframeApi();
        if (cancelled) return;
        const container = containerRef.current;
        if (!container) return;

        const uri = `spotify:track:${providerTrackId}`;
        const shouldAutoplay = autoplay ?? autoplaySpotify ?? true;

        if (!controllerRef.current) {
          container.innerHTML = '';
          api.createController(
            container,
            { uri, theme: 0, width: '100%', height: '100%' },
            (controller) => {
              if (cancelled) return;
              controllerRef.current = controller;
              lastTrackIdRef.current = providerTrackId;
              setReady(true);

              controller.addListener('ready', () => {
                if (shouldAutoplay) controller.play();
              });

              controller.addListener('playback_update', (state) => {
                const payload = state?.data ?? state ?? {};
                const position = typeof payload.position === 'number' ? payload.position : 0;
                const duration = typeof payload.duration === 'number' ? payload.duration : undefined;
                const isPaused = payload.isPaused ?? payload.paused;
                const track = payload.track;
                const artistNames = Array.isArray(track?.artists)
                  ? track.artists.map((a: any) => a?.name).filter(Boolean).join(', ')
                  : null;

                const now = performance.now();
                if (now - lastEmitTsRef.current >= 180) {
                  lastEmitTsRef.current = now;
                  updatePlaybackState({
                    positionMs: position,
                    durationMs: duration,
                    isPlaying: isPaused === undefined ? true : !isPaused,
                    trackTitle: track?.name ?? null,
                    trackArtist: artistNames,
                    trackAlbum: track?.album?.name ?? null,
                  });
                }
              });

              controller.addListener('not_ready', () => {
                setReady(false);
              });

              registerProviderControls('spotify', {
                play: (startSec) => {
                  if (typeof startSec === 'number' && controller.seek) {
                    controller.seek(startSec);
                  }
                  controller.play();
                },
                pause: () => controller.pause(),
                seekTo: (seconds) => controller.seek?.(seconds),
                setVolume: (vol) => controller.setVolume?.(vol),
                setMute: (muted) => controller.setVolume?.(muted ? 0 : volumeRef.current),
                teardown: () => controller.destroy?.(),
              });
            }
          );
        } else if (controllerRef.current.loadUri && lastTrackIdRef.current !== providerTrackId) {
          controllerRef.current.loadUri(uri);
          lastTrackIdRef.current = providerTrackId;
          if (shouldAutoplay) controllerRef.current.play();
        } else if (shouldAutoplay) {
          controllerRef.current.play();
        }
      } catch (err) {
        console.error('[Spotify Embed] setup failed', err);
        setErrorMessage('Spotify embed failed to load.');
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [provider, providerTrackId, autoplay, autoplaySpotify, registerProviderControls, user?.id]);

  useEffect(() => {
    if (provider === 'spotify') return;
    if (controllerRef.current?.destroy) {
      controllerRef.current.destroy();
    }
    controllerRef.current = null;
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    setReady(false);
  }, [provider]);

  useEffect(() => {
    if (provider !== 'spotify') return;
    if (seekToSec == null) return;
    if (controllerRef.current?.seek) {
      controllerRef.current.seek(seekToSec);
    }
    clearSeek();
  }, [provider, seekToSec, clearSeek]);

  useEffect(() => {
    return () => {
      try {
        controllerRef.current?.destroy?.();
      } catch (err) {
        console.warn('[Spotify Embed] destroy failed', err);
      }
      controllerRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  if (provider !== 'spotify' || !providerTrackId) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden">
      {errorMessage ? (
        <div className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-white/70">
          {errorMessage}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full h-[152px] md:h-[180px] rounded-xl overflow-hidden bg-black/60"
          aria-label="Spotify player"
        />
      )}
      {!ready && !errorMessage && (
        <div className="mt-2 text-[11px] text-white/50">Loading Spotify player…</div>
      )}
    </div>
  );
}
