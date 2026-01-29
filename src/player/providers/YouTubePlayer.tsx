import { useEffect, useRef } from 'react';
import { usePlayer } from '../PlayerContext';

interface YouTubePlayerProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytPromise: Promise<void> | null = null;
let ytReady = false;

const loadYouTubeApi = () => {
  if (ytReady) return Promise.resolve();
  if (ytPromise) return ytPromise;
  ytPromise = new Promise<void>((resolve) => {
    if (window.YT && window.YT.Player) {
      ytReady = true;
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = () => {
      ytReady = true;
      resolve();
    };
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  });
  return ytPromise;
};

/**
 * YouTube player using IFrame API for reliable autoplay + unmute.
 */
export function YouTubePlayer({ providerTrackId, autoplay = true }: YouTubePlayerProps) {
  const { provider, isMuted, registerProviderControls, updatePlaybackState, clearSeek, seekToSec } = usePlayer();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const mutedRef = useRef(isMuted);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (provider !== 'youtube' || !providerTrackId) return;
    let destroyed = false;
    let progressTimer: number | null = null;

    const setup = async () => {
      await loadYouTubeApi();
      if (destroyed || !window.YT || !containerRef.current) return;

      const startPlayback = (player: any) => {
        if (autoplay) {
          player.playVideo?.();
        }
        // Always attempt to unmute after a user gesture-triggered play.
        player.setVolume?.(100);
        window.setTimeout(() => {
          player.unMute?.();
          player.setVolume?.(100);
          if (player.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING) {
            player.playVideo?.();
          }
        }, 200);
        window.setTimeout(() => {
          player.unMute?.();
          player.setVolume?.(100);
        }, 650);
      };

      if (playerRef.current?.loadVideoById) {
        playerRef.current.loadVideoById(providerTrackId, 0);
        startPlayback(playerRef.current);
        return;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: providerTrackId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          mute: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            startPlayback(event.target);
            const durationMs = event.target.getDuration?.() * 1000;
            if (Number.isFinite(durationMs)) {
              updatePlaybackState({ durationMs });
            }
          },
          onStateChange: (event: any) => {
            const ytState = window.YT?.PlayerState;
            const isPlaying = event.data === ytState?.PLAYING;
            const positionMs = event.target.getCurrentTime() * 1000;
            const durationMs = event.target.getDuration() * 1000;
            updatePlaybackState({
              isPlaying,
              positionMs,
              durationMs: Number.isFinite(durationMs) ? durationMs : 0,
            });
            if (isPlaying && !mutedRef.current) {
              event.target.unMute?.();
            }
          },
        },
      });

      registerProviderControls('youtube', {
        play: async (startSec) => {
          if (!playerRef.current) return;
          if (typeof startSec === 'number') {
            playerRef.current.seekTo?.(startSec, true);
          }
          startPlayback(playerRef.current);
        },
        pause: async () => playerRef.current?.pauseVideo?.(),
        seekTo: async (seconds: number) => playerRef.current?.seekTo?.(seconds, true),
        setVolume: async (vol: number) => playerRef.current?.setVolume?.(Math.round(vol * 100)),
        setMute: async (muted: boolean) => {
          mutedRef.current = muted;
          if (muted) playerRef.current?.mute?.();
          else playerRef.current?.unMute?.();
        },
        teardown: async () => {
          try {
            playerRef.current?.destroy?.();
          } catch (err) {
            console.warn('YouTube teardown failed', err);
          }
        },
      });
    };

    setup();

    return () => {
      destroyed = true;
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
      try {
        playerRef.current?.destroy?.();
      } catch (err) {
        console.warn('YouTube destroy failed', err);
      }
      playerRef.current = null;
    };
  }, [provider, providerTrackId, autoplay, registerProviderControls, updatePlaybackState]);

  useEffect(() => {
    if (provider !== 'youtube') return;
    if (!playerRef.current) return;

    const tick = () => {
      if (!playerRef.current) return;
      const durationSec = playerRef.current.getDuration?.();
      const positionSec = playerRef.current.getCurrentTime?.();
      if (!Number.isFinite(positionSec)) return;
      updatePlaybackState({
        positionMs: positionSec * 1000,
        durationMs: Number.isFinite(durationSec) ? durationSec * 1000 : 0,
      });
    };

    const intervalId = window.setInterval(tick, 500);
    return () => window.clearInterval(intervalId);
  }, [provider, updatePlaybackState, providerTrackId]);

  useEffect(() => {
    if (provider !== 'youtube') return;
    if (seekToSec == null) return;
    playerRef.current?.seekTo?.(seekToSec, true);
    clearSeek();
  }, [provider, seekToSec, clearSeek]);

  if (provider !== 'youtube' || !providerTrackId) return null;

  return <div ref={containerRef} className="w-full bg-black rounded-xl overflow-hidden aspect-video" />;
}
