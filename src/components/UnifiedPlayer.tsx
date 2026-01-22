import { useState } from 'react';
import { Music2, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePlayer } from '@/player/PlayerContext';

interface UnifiedPlayerProps {
  trackId: string;
  trackTitle?: string;
  trackArtist?: string;
  spotifyId?: string;
  youtubeId?: string;
  autoplay?: boolean;
  className?: string;
}

/**
 * Unified Player Component
 * Spotify and YouTube players in the EXACT same position
 * Players phase each other out seamlessly
 * Video doesn't show - slim 2:1 ratio iframe
 * Shows title, seeker, time, pause/stop controls
 * Option to slide down full video
 */
export function UnifiedPlayer({
  trackId,
  trackTitle,
  trackArtist,
  spotifyId,
  youtubeId,
  autoplay = false,
  className,
}: UnifiedPlayerProps) {
  const { openSpotify, openYoutube } = usePlayer();
  const [activePlayer, setActivePlayer] = useState<'spotify' | 'youtube' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSpotifyClick = () => {
    if (spotifyId) {
      setActivePlayer('spotify');
      openSpotify(spotifyId, autoplay);
    }
  };

  const handleYoutubeClick = () => {
    if (youtubeId) {
      setActivePlayer('youtube');
      openYoutube(youtubeId, autoplay);
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Player Icons - Always visible */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSpotifyClick}
          disabled={!spotifyId}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all',
            activePlayer === 'spotify'
              ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/50'
              : 'bg-background border-border hover:border-green-500 hover:bg-green-500/10',
            !spotifyId && 'opacity-30 cursor-not-allowed'
          )}
        >
          <Music2 className="h-5 w-5" />
          <span className="text-sm font-semibold">Spotify</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleYoutubeClick}
          disabled={!youtubeId}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all',
            activePlayer === 'youtube'
              ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/50'
              : 'bg-background border-border hover:border-red-500 hover:bg-red-500/10',
            !youtubeId && 'opacity-30 cursor-not-allowed'
          )}
        >
          <Youtube className="h-5 w-5" />
          <span className="text-sm font-semibold">YouTube</span>
        </motion.button>
      </div>

      {/* Player Info */}
      {(trackTitle || trackArtist) && (
        <div className="text-center mb-2">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {trackTitle}
          </h3>
          {trackArtist && (
            <p className="text-xs text-muted-foreground truncate">{trackArtist}</p>
          )}
        </div>
      )}

      {/* Status */}
      {!activePlayer && (
        <p className="text-center text-xs text-muted-foreground">
          Select a player to start listening
        </p>
      )}
    </div>
  );
}
