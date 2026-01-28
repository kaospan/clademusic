import { useEffect, useMemo } from 'react';
import { usePlayer } from '../PlayerContext';

interface YouTubePlayerProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

/**
 * Iframe-only YouTube embed for fastest load and no SDK contention.
 */
export function YouTubePlayer({ providerTrackId, autoplay }: YouTubePlayerProps) {
  const { provider, isMuted, registerProviderControls, updatePlaybackState, clearSeek } = usePlayer();

  // Browsers will often block autoplay on unmuted YouTube iframes; force mute when autoplaying
  // to maximize successful start, while still honoring explicit mute state when set.
  const shouldAutoplay = Boolean(autoplay);
  const shouldMute = isMuted || shouldAutoplay;

  const src = useMemo(() => {
    if (!providerTrackId) return '';
    const base = `https://www.youtube.com/embed/${providerTrackId}`;
    const params = new URLSearchParams({
      autoplay: shouldAutoplay ? '1' : '0',
      mute: shouldMute ? '1' : '0',
      playsinline: '1',
      controls: '1',
      rel: '0',
    });
    return `${base}?${params.toString()}`;
  }, [providerTrackId, shouldAutoplay, shouldMute]);

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
    // Mark playback as starting immediately to avoid UI lag; simulate duration if unknown
    updatePlaybackState({ isPlaying: !!autoplay, positionMs: 0, durationMs: 0 });
    clearSeek();
  }, [provider, registerProviderControls, updatePlaybackState, clearSeek, shouldAutoplay]);

  if (provider !== 'youtube' || !providerTrackId) return null;

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden aspect-video">
      <iframe
        title="YouTube player"
        src={src}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
}
