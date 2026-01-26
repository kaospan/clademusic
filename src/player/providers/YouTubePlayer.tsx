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

const loadYouTubeApi = () => {
  if (ytPromise) return ytPromise;
  ytPromise = new Promise<void>((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => resolve();
    document.body.appendChild(tag);
  });
  return ytPromise;
};

/**
 * YouTube player with real controls (play/pause/seek/volume/mute) wired into PlayerContext.
 */
export function YouTubePlayer({ providerTrackId, autoplay }: YouTubePlayerProps) {
  const {
    provider,
    seekToSec,
    clearSeek,
    registerProviderControls,
    updatePlaybackState,
    volume,
    isMuted,
  } = usePlayer();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (provider !== 'youtube' || !providerTrackId) return;
    let destroyed = false;

    const setup = async () => {
      await loadYouTubeApi();
      if (destroyed || !window.YT) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: providerTrackId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(isMuted ? 0 : Math.round(volume * 100));
            if (autoplay) event.target.playVideo();
            updatePlaybackState({ durationMs: event.target.getDuration() * 1000 });
          },
          onStateChange: (event: any) => {
            const data = event.data;
            const ytState = window.YT?.PlayerState;
            const isPlaying = data === ytState?.PLAYING;
            const positionMs = event.target.getCurrentTime() * 1000;
            const durationMs = event.target.getDuration() * 1000;
            updatePlaybackState({
              isPlaying,
              positionMs,
              durationMs,
            });

            if (pollRef.current) {
              window.clearInterval(pollRef.current);
              pollRef.current = null;
            }
            if (isPlaying) {
              pollRef.current = window.setInterval(() => {
                if (!playerRef.current) return;
                const pos = playerRef.current.getCurrentTime() * 1000;
                const dur = playerRef.current.getDuration() * 1000;
                updatePlaybackState({ positionMs: pos, durationMs: dur });
              }, 1000);
            }
          },
        },
      });

      registerProviderControls('youtube', {
        play: async () => playerRef.current?.playVideo?.(),
        pause: async () => playerRef.current?.pauseVideo?.(),
        seekTo: async (seconds: number) => playerRef.current?.seekTo?.(seconds, true),
        setVolume: async (vol: number) => playerRef.current?.setVolume?.(Math.round(vol * 100)),
        setMute: async (muted: boolean) => {
          if (muted) playerRef.current?.mute?.();
          else playerRef.current?.unMute?.();
        },
        teardown: async () => playerRef.current?.destroy?.(),
      });
    };

    setup();

    return () => {
      destroyed = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [provider, providerTrackId, autoplay, registerProviderControls, updatePlaybackState, volume, isMuted]);

  // External seek requests
  useEffect(() => {
    if (provider !== 'youtube') return;
    if (seekToSec == null) return;
    playerRef.current?.seekTo?.(seekToSec, true);
    clearSeek();
  }, [provider, seekToSec, clearSeek]);

  // Sync mute/volume changes
  useEffect(() => {
    if (provider !== 'youtube') return;
    if (!playerRef.current) return;
    if (isMuted) playerRef.current.mute?.();
    else {
      playerRef.current.unMute?.();
      playerRef.current.setVolume?.(Math.round(volume * 100));
    }
  }, [provider, volume, isMuted]);

  return <div ref={containerRef} className="w-full h-14 md:h-24 bg-black rounded-xl overflow-hidden" />;
}
