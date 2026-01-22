import { useEffect, useMemo, useRef } from 'react';
import { usePlayer } from '../PlayerContext';

interface YouTubePlayerProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

const ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

/**
 * Seekable YouTube player using iframe with visual embed.
 * Supports section navigation via seekToSec from PlayerContext.
 * Now displays the video iframe instead of audio-only indicator.
 */
export function YouTubePlayer({ providerTrackId, autoplay }: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { seekToSec, clearSeek } = usePlayer();

  const src = useMemo(() => {
    if (!providerTrackId) return null;
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      modestbranding: '1',
      rel: '0',
      enablejsapi: '1',
      origin: window.location.origin,
    });
    // Use the privacy-enhanced domain to reduce cookie usage
    return `https://www.youtube-nocookie.com/embed/${providerTrackId}?${params.toString()}`;
  }, [providerTrackId, autoplay]);

  // Handle seek requests from context
  useEffect(() => {
    if (seekToSec !== null && iframeRef.current?.contentWindow) {
      // YouTube iframe API expects a JSON command via postMessage
      const command = JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seekToSec, true],
      });
      iframeRef.current.contentWindow.postMessage(command, '*');
      clearSeek();
    }
  }, [seekToSec, clearSeek]);

  if (!src) return null;

  return (
    <div className="w-full h-14 md:h-20 bg-gradient-to-r from-red-950/80 via-black to-red-950/80 rounded-xl overflow-hidden">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0 relative z-[110]"
        src={src}
        allow={ALLOW}
        title="YouTube player"
        style={{ borderRadius: '12px' }}
      />
    </div>
  );
}
