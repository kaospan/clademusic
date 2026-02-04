import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { TrackProviderInfo, getProviderLinks } from '@/lib/providers';
import { getPreferredProvider, setPreferredProvider } from '@/lib/preferences';
import { usePlayer } from '@/player/PlayerContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { searchYouTubeVideos } from '@/services/youtubeSearchService';
import { useConnectSpotify } from '@/hooks/api/useSpotifyConnect';
import { useSpotifyConnected } from '@/hooks/api/useSpotifyUser';
import { buildProviderDeepLink } from '@/player/universal/buildEmbedSrc';

interface QuickStreamButtonsProps {
  track: TrackProviderInfo;
  canonicalTrackId?: string | null;
  trackTitle?: string;
  trackArtist?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// SVG Icons for providers
const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

const AppleMusicIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.401-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.785-.56-2.075-1.46-.18-.556-.106-1.09.188-1.59.33-.562.824-.92 1.456-1.08.263-.07.532-.12.8-.165.527-.09 1.054-.18 1.58-.275.187-.034.36-.09.455-.29.043-.098.065-.214.066-.322.006-.86.004-1.72.002-2.58v-.248l-5.49 1.26v6.6c0 .4-.053.79-.213 1.16-.3.69-.832 1.11-1.56 1.303-.387.1-.78.15-1.18.147-.93-.003-1.725-.6-1.99-1.5-.173-.6-.082-1.16.258-1.68.33-.5.796-.84 1.374-.987.31-.08.63-.14.948-.19.496-.08.992-.15 1.487-.23.26-.04.5-.12.655-.35.077-.113.118-.26.12-.39.01-.18.004-.36.004-.55V6.32c0-.27.058-.52.22-.74.17-.24.41-.38.69-.44.12-.03.25-.04.38-.06l6.67-1.525c.19-.044.39-.08.59-.08.25 0 .46.1.63.29.14.15.21.34.21.55.01.12.01.25.01.37v5.95z" />
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

/**
 * Provider buttons for Spotify and YouTube.
 * Clickable buttons that trigger autoplay in the universal player.
 */
export function QuickStreamButtons({
  track,
  canonicalTrackId = null,
  trackTitle = 'Track',
  trackArtist,
  className,
  size = 'md',
}: QuickStreamButtonsProps) {
  const links = getProviderLinks(track);
  const spotifyLink = links.find((l) => l.provider === 'spotify');
  const youtubeLink = links.find((l) => l.provider === 'youtube');
  const preferredProvider = getPreferredProvider();
  const { openPlayer, positionMs, provider: currentProvider, canonicalTrackId: currentTrackId, trackId: currentProviderTrackId } = usePlayer();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isSpotifyConnected } = useSpotifyConnected();
  const connectSpotify = useConnectSpotify();

  const normalizeSpotifyId = useCallback((raw?: string | null) => {
    if (!raw) return null;
    if (raw.startsWith('spotify:track:')) return raw.split(':').pop() || null;
    const match = raw.match(/track\/(\w+)/);
    if (match?.[1]) return match[1];
    if (raw.includes('?')) return raw.split('?')[0].split('/').pop() || null;
    return raw;
  }, []);

  const normalizeYoutubeId = useCallback((raw?: string | null) => {
    if (!raw) return null;
    const urlMatch = raw.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (urlMatch?.[1]) return urlMatch[1];
    if (raw.length === 11) return raw;
    return raw;
  }, []);

  const spotifyTrackId = useMemo(() => normalizeSpotifyId(track.spotifyId || track.urlSpotifyWeb || track.urlSpotifyApp || spotifyLink?.webUrl || spotifyLink?.appUrl), [normalizeSpotifyId, track.spotifyId, track.urlSpotifyApp, track.urlSpotifyWeb, spotifyLink?.appUrl, spotifyLink?.webUrl]);
  const youtubeTrackId = useMemo(() => normalizeYoutubeId(track.youtubeId || track.urlYoutube || youtubeLink?.webUrl), [normalizeYoutubeId, track.urlYoutube, track.youtubeId, youtubeLink?.webUrl]);

  const hasSpotify = Boolean(spotifyTrackId);
  const hasYouTube = Boolean(youtubeTrackId);
  const unavailable = !hasSpotify && !hasYouTube;

  // Check if this is the currently playing track
  const isCurrentTrack = currentTrackId === canonicalTrackId
    || (currentProvider === 'spotify' && spotifyTrackId && currentProviderTrackId === spotifyTrackId)
    || (currentProvider === 'youtube' && youtubeTrackId && currentProviderTrackId === youtubeTrackId);
  const currentPositionSec = isCurrentTrack && positionMs ? positionMs / 1000 : undefined;

  const spotifyDeepLink = useMemo(
    () => (spotifyTrackId ? buildProviderDeepLink('spotify', spotifyTrackId) : null),
    [spotifyTrackId]
  );
  const youtubeDeepLink = useMemo(
    () => (youtubeTrackId ? buildProviderDeepLink('youtube', youtubeTrackId, { startSec: currentPositionSec }) : null),
    [youtubeTrackId, currentPositionSec]
  );

  const handleSpotifyClick = useCallback(() => {
    if (!hasSpotify || !spotifyTrackId) return;
    setPreferredProvider('spotify');

    // Always allow Spotify to play *something* immediately:
    // - Guest / not connected: Spotify embed preview
    // - Connected: full Spotify Web Playback (if available)
    // Reconnect is handled explicitly from the player UI (no surprise redirects here).
    openPlayer({
      canonicalTrackId,
      provider: 'spotify',
      providerTrackId: spotifyTrackId,
      autoplay: true,
      context: 'quick-stream',
      title: trackTitle,
      artist: trackArtist,
      startSec: currentPositionSec,
    });
  }, [hasSpotify, canonicalTrackId, trackTitle, trackArtist, openPlayer, currentPositionSec, spotifyTrackId]);

  const handleYouTubeClick = useCallback(async () => {
    setPreferredProvider('youtube');

    // If we already have a YouTube ID, use it; otherwise, search for a best match.
    let resolvedId = youtubeTrackId;
    if (!resolvedId) {
      try {
        const results = await searchYouTubeVideos(trackArtist || '', trackTitle || '');
        resolvedId = results[0]?.videoId;
      } catch (err) {
        console.warn('YouTube search failed; falling back to no-op', err);
      }
    }

    if (!resolvedId) {
      console.warn('No YouTube result found for track; cannot play');
      return;
    }

    openPlayer({
      canonicalTrackId,
      provider: 'youtube',
      providerTrackId: resolvedId,
      autoplay: true,
      context: 'quick-stream',
      title: trackTitle,
      artist: trackArtist,
      startSec: currentPositionSec,
    });
  }, [canonicalTrackId, trackTitle, trackArtist, openPlayer, currentPositionSec, youtubeTrackId]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  } as const;

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  } as const;

  if (unavailable) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Music className="w-4 h-4" />
        <span className="text-sm">No streaming links</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <motion.button
        whileHover={{ scale: hasSpotify ? 1.05 : 1 }}
        whileTap={{ scale: hasSpotify ? 0.97 : 1 }}
        onMouseDown={(e) => {
          // Middle-click / cmd-click / ctrl-click opens provider page in a new tab.
          if (!hasSpotify || !spotifyDeepLink) return;
          if (e.button === 1 || e.metaKey || e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            window.open(spotifyDeepLink, '_blank', 'noopener,noreferrer');
          }
        }}
        onClick={hasSpotify ? handleSpotifyClick : undefined}
        data-provider="spotify"
        disabled={!hasSpotify}
        className={cn(
          sizeClasses[size],
          'rounded-full flex items-center justify-center transition-all',
          hasSpotify
            ? 'bg-gradient-to-br from-[#1DB954] to-[#1ed760] text-white shadow-lg hover:shadow-xl hover:from-[#1ed760] hover:to-[#1DB954] cursor-pointer'
            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60',
          currentProvider === 'spotify' && isCurrentTrack && 'ring-2 ring-white ring-offset-2 ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
        title={hasSpotify ? 'Play in Spotify' : 'Spotify unavailable'}
        aria-label={hasSpotify ? `Play ${trackTitle} in Spotify` : 'Spotify unavailable'}
      >
        <SpotifyIcon className={iconSizes[size]} />
      </motion.button>

      <motion.button
        whileHover={{ scale: hasYouTube ? 1.05 : 1 }}
        whileTap={{ scale: hasYouTube ? 0.97 : 1 }}
        onMouseDown={(e) => {
          if (!youtubeDeepLink) return;
          if (e.button === 1 || e.metaKey || e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            window.open(youtubeDeepLink, '_blank', 'noopener,noreferrer');
          }
        }}
        onClick={handleYouTubeClick}
        data-provider="youtube"
        className={cn(
          sizeClasses[size],
          'rounded-full flex items-center justify-center transition-all',
          'bg-gradient-to-br from-[#FF0000] to-[#CC0000] text-white shadow-lg hover:shadow-xl hover:from-[#FF0000] hover:to-[#EE0000] cursor-pointer',
          currentProvider === 'youtube' && isCurrentTrack && 'ring-2 ring-white ring-offset-2 ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
        title={hasYouTube ? 'Play on YouTube' : 'Find on YouTube'}
        aria-label={hasYouTube ? `Play ${trackTitle} on YouTube` : `Find ${trackTitle} on YouTube`}
      >
        <YouTubeIcon className={iconSizes[size]} />
      </motion.button>
    </div>
  );
}

// Export individual icons for reuse
export { SpotifyIcon, AppleMusicIcon, YouTubeIcon };
export default QuickStreamButtons;
