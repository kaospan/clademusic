import { useEffect } from 'react';
import { usePlayer } from '../PlayerContext';

interface YouTubePlayerProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

/**
 * Lightweight YouTube placeholder to avoid double-player conflicts.
 * Relies on the iframe-based floating player; registers no-op controls to keep PlayerContext stable.
 */
export function YouTubePlayer({ providerTrackId, autoplay }: YouTubePlayerProps) {
  const { provider, registerProviderControls, updatePlaybackState, clearSeek } = usePlayer();

  useEffect(() => {
    if (provider !== 'youtube') return;
    registerProviderControls('youtube', {
      play: async () => {},
      pause: async () => {},
      seekTo: async () => {},
      setVolume: async () => {},
      setMute: async () => {},
      teardown: async () => {},
    });
    // Reset playback state to avoid stale values
    updatePlaybackState({ isPlaying: !!autoplay, positionMs: 0, durationMs: 0 });
    clearSeek();
  }, [provider, registerProviderControls, updatePlaybackState, clearSeek, autoplay]);

  // Render nothing to prevent mounting a second YouTube player (iframe is handled elsewhere)
  return null;
}
