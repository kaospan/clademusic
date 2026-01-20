/**
 * Playback Controls Component
 * 
 * WATCH button - Shows YouTube video inline as background
 * LISTEN button - Plays audio via best available provider
 * Provider switching icons
 * 
 * Rules:
 * - WATCH = YouTube embed visible
 * - LISTEN = Spotify SDK > Spotify Embed > YouTube audio
 * - NEVER auto-open native apps
 * - External app opening requires explicit user action
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Tv, Headphones, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayer } from '@/player/PlayerContext';
import { cn } from '@/lib/utils';
import type { MusicProvider, Track } from '@/types';

// Provider configuration
const PROVIDER_CONFIG: Record<string, {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}> = {
  spotify: {
    icon: '🎧',
    label: 'Spotify',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 hover:bg-green-500/20',
  },
  apple_music: {
    icon: '🍎',
    label: 'Apple Music',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10 hover:bg-pink-500/20',
  },
  youtube: {
    icon: '▶',
    label: 'YouTube',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20',
  },
  amazon_music: {
    icon: '🎵',
    label: 'Amazon',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
  },
  deezer: {
    icon: '🎶',
    label: 'Deezer',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
  },
  tidal: {
    icon: '🌊',
    label: 'Tidal',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20',
  },
};

interface PlaybackControlsProps {
  track: Track;
  /** Callback when WATCH mode is activated */
  onWatchMode?: () => void;
  /** Current playback mode */
  mode?: 'watch' | 'listen' | null;
  /** Show provider icons */
  showProviders?: boolean;
  /** Compact mode */
  compact?: boolean;
  className?: string;
}

export function PlaybackControls({
  track,
  onWatchMode,
  mode = null,
  showProviders = true,
  compact = false,
  className,
}: PlaybackControlsProps) {
  const { openPlayer, provider: currentProvider, switchProvider } = usePlayer();
  const [activeMode, setActiveMode] = useState<'watch' | 'listen' | null>(mode);

  // Get available providers for this track
  const availableProviders = Object.entries(track.providerIds || {})
    .filter(([_, id]) => id)
    .map(([provider]) => provider as MusicProvider);

  // Always include youtube if we have a youtube_id
  if (track.youtube_id && !availableProviders.includes('youtube')) {
    availableProviders.unshift('youtube');
  }

  // Handle WATCH button click
  const handleWatch = useCallback(() => {
    const youtubeId = track.youtube_id || track.providerIds?.youtube;
    
    if (!youtubeId) {
      console.warn('No YouTube ID available for WATCH mode');
      return;
    }

    setActiveMode('watch');
    onWatchMode?.();
    
    openPlayer({
      canonicalTrackId: track.id,
      provider: 'youtube',
      providerTrackId: youtubeId,
      autoplay: true,
      context: 'watch',
    });
  }, [track, openPlayer, onWatchMode]);

  // Handle LISTEN button click - priority: Spotify SDK > Spotify Embed > YouTube
  const handleListen = useCallback(() => {
    setActiveMode('listen');

    // Priority 1: Spotify (if connected)
    const spotifyId = track.spotify_id || track.providerIds?.spotify;
    if (spotifyId) {
      openPlayer({
        canonicalTrackId: track.id,
        provider: 'spotify',
        providerTrackId: spotifyId,
        autoplay: true,
        context: 'listen',
      });
      return;
    }

    // Priority 2: YouTube as fallback
    const youtubeId = track.youtube_id || track.providerIds?.youtube;
    if (youtubeId) {
      openPlayer({
        canonicalTrackId: track.id,
        provider: 'youtube',
        providerTrackId: youtubeId,
        autoplay: true,
        context: 'listen',
      });
      return;
    }

    console.warn('No playback provider available');
  }, [track, openPlayer]);

  // Handle provider switch
  const handleProviderSwitch = useCallback((provider: MusicProvider) => {
    const providerId = provider === 'youtube' 
      ? (track.youtube_id || track.providerIds?.youtube)
      : provider === 'spotify'
        ? (track.spotify_id || track.providerIds?.spotify)
        : track.providerIds?.[provider];

    if (!providerId) {
      console.warn(`No ${provider} ID available`);
      return;
    }

    switchProvider(provider, providerId, track.id);
  }, [track, switchProvider]);

  // Handle "Open in App" - explicit user action, allowed to open native app
  const handleOpenInApp = useCallback((provider: MusicProvider) => {
    const link = track.providerLinks?.find(l => l.provider === provider);
    const appUrl = link?.url_app || link?.url_web;
    
    if (appUrl) {
      window.open(appUrl, '_blank');
    }
  }, [track]);

  const hasYouTube = track.youtube_id || track.providerIds?.youtube;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main WATCH / LISTEN buttons */}
      <div className="flex gap-2">
        {hasYouTube && (
          <Button
            onClick={handleWatch}
            variant={activeMode === 'watch' ? 'default' : 'outline'}
            className={cn(
              'gap-2 flex-1',
              activeMode === 'watch' && 'bg-red-500 hover:bg-red-600 text-white border-red-500'
            )}
            size={compact ? 'sm' : 'default'}
          >
            <Tv className="w-4 h-4" />
            WATCH
          </Button>
        )}
        
        <Button
          onClick={handleListen}
          variant={activeMode === 'listen' ? 'default' : 'outline'}
          className={cn(
            'gap-2 flex-1',
            activeMode === 'listen' && 'bg-green-500 hover:bg-green-600 text-white border-green-500'
          )}
          size={compact ? 'sm' : 'default'}
        >
          <Headphones className="w-4 h-4" />
          LISTEN
        </Button>
      </div>

      {/* Provider icons for switching */}
      {showProviders && availableProviders.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Play on:</span>
          {availableProviders.map((provider) => {
            const config = PROVIDER_CONFIG[provider];
            if (!config) return null;
            
            const isActive = currentProvider === provider;
            
            return (
              <motion.button
                key={provider}
                onClick={() => handleProviderSwitch(provider)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all',
                  config.bgColor,
                  isActive && 'ring-2 ring-primary'
                )}
                title={`Play on ${config.label}`}
              >
                <span>{config.icon}</span>
                {!compact && <span className={config.color}>{config.label}</span>}
              </motion.button>
            );
          })}
          
          {/* "Open in App" button */}
          {track.providerLinks?.some(l => l.url_app) && (
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7"
                onClick={() => handleOpenInApp(currentProvider as MusicProvider)}
              >
                <ExternalLink className="w-3 h-3" />
                Open in App
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
