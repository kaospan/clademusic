/**
 * YouTube Video Player (WATCH mode)
 * 
 * Full video player with visible video for background/watch mode.
 * Supports seek via PlayerContext for section navigation.
 * Uses YouTube IFrame API for full control.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayer } from '../PlayerContext';
import { cn } from '@/lib/utils';

interface YouTubeVideoPlayerProps {
  videoId: string;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
  /** Show video controls */
  controls?: boolean;
  /** Callback when player state changes */
  onStateChange?: (isPlaying: boolean) => void;
  /** Callback with current time updates */
  onTimeUpdate?: (currentTime: number) => void;
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
}

// Load YouTube IFrame API
let apiLoaded = false;
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };
  });

  return apiLoadPromise;
}

export function YouTubeVideoPlayer({
  videoId,
  autoplay = true,
  muted = false,
  className,
  controls = true,
  onStateChange,
  onTimeUpdate,
}: YouTubeVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const timeUpdateInterval = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { seekToSec, clearSeek } = usePlayer();

  // Initialize player
  useEffect(() => {
    let mounted = true;

    loadYouTubeAPI().then(() => {
      if (!mounted || !containerRef.current) return;

      // Create a unique ID for this player instance
      const playerId = `yt-player-${videoId}-${Date.now()}`;
      const playerDiv = document.createElement('div');
      playerDiv.id = playerId;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: controls ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (!mounted) return;
            setIsReady(true);
            if (muted) {
              event.target.mute();
            }
            if (autoplay) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            if (!mounted) return;
            const isPlaying = event.data === window.YT.PlayerState.PLAYING;
            onStateChange?.(isPlaying);

            // Start/stop time updates
            if (isPlaying && onTimeUpdate) {
              timeUpdateInterval.current = window.setInterval(() => {
                if (playerRef.current) {
                  onTimeUpdate(playerRef.current.getCurrentTime());
                }
              }, 250);
            } else if (timeUpdateInterval.current) {
              clearInterval(timeUpdateInterval.current);
              timeUpdateInterval.current = null;
            }
          },
        },
      });
    });

    return () => {
      mounted = false;
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
      }
    };
  }, [videoId]);

  // Handle seek requests from context
  useEffect(() => {
    if (seekToSec !== null && isReady && playerRef.current) {
      playerRef.current.seekTo(seekToSec, true);
      playerRef.current.playVideo();
      clearSeek();
    }
  }, [seekToSec, isReady, clearSeek]);

  // Expose player controls via ref
  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && isReady) {
      playerRef.current.seekTo(seconds, true);
    }
  }, [isReady]);

  const play = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.playVideo();
    }
  }, [isReady]);

  const pause = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.pauseVideo();
    }
  }, [isReady]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-video bg-black rounded-xl overflow-hidden',
        className
      )}
    >
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
