/**
 * Watch Card Component
 * 
 * Hero-style card with YouTube video as background.
 * WATCH button activates video playback.
 * Overlaid controls for WATCH/LISTEN mode switching.
 * Section navigation integrated.
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward } from 'lucide-react';
import { YouTubeVideoPlayer } from '@/player/providers/YouTubeVideoPlayer';
import { TrackSections } from '@/components/TrackSections';
import { PlaybackControls } from '@/components/PlaybackControls';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Track } from '@/types';

interface WatchCardProps {
  track: Track;
  /** Auto-start in watch mode */
  autoWatch?: boolean;
  /** Show section timeline */
  showSections?: boolean;
  /** Aspect ratio */
  aspectRatio?: 'video' | 'square' | 'wide';
  className?: string;
}

export function WatchCard({
  track,
  autoWatch = false,
  showSections = true,
  aspectRatio = 'video',
  className,
}: WatchCardProps) {
  const [isWatching, setIsWatching] = useState(autoWatch);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<number | null>(null);

  const youtubeId = track.youtube_id || track.providerIds?.youtube;

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  const handleWatchActivate = useCallback(() => {
    setIsWatching(true);
  }, []);

  const handleStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    if (playing) {
      handleMouseMove();
    } else {
      setShowControls(true);
    }
  }, [handleMouseMove]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const aspectClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    wide: 'aspect-[21/9]',
  }[aspectRatio];

  // Thumbnail when not watching
  const thumbnail = track.cover_url || track.artwork_url || 
    (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : null);

  return (
    <div className={cn('relative rounded-2xl overflow-hidden bg-black', className)}>
      <div 
        className={cn('relative', aspectClass)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {isWatching && youtubeId ? (
          // Active YouTube player
          <YouTubeVideoPlayer
            videoId={youtubeId}
            autoplay={true}
            controls={false}
            onStateChange={handleStateChange}
            onTimeUpdate={handleTimeUpdate}
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          // Thumbnail preview
          <div className="absolute inset-0">
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={track.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background" />
            )}
          </div>
        )}

        {/* Gradient overlay */}
        <div className={cn(
          'absolute inset-0 transition-opacity duration-300',
          'bg-gradient-to-t from-black/90 via-black/30 to-transparent',
          isWatching && isPlaying && !showControls && 'opacity-0'
        )} />

        {/* Controls overlay */}
        <AnimatePresence>
          {(!isWatching || showControls) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col justify-between p-4 md:p-6"
            >
              {/* Top bar - Track info */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-white truncate drop-shadow-lg">
                    {track.title}
                  </h2>
                  <p className="text-sm md:text-base text-white/80 truncate drop-shadow">
                    {track.artist || track.artists?.join(', ')}
                  </p>
                </div>
                
                {isWatching && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => {/* TODO: fullscreen */}}
                  >
                    <Maximize2 className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Center play button (when not watching) */}
              {!isWatching && youtubeId && (
                <div className="flex-1 flex items-center justify-center">
                  <motion.button
                    onClick={handleWatchActivate}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors"
                  >
                    <Play className="w-10 h-10 text-white fill-current ml-1" />
                  </motion.button>
                </div>
              )}

              {/* Bottom controls */}
              <div className="space-y-3">
                {/* Playback mode buttons */}
                <PlaybackControls
                  track={track}
                  onWatchMode={handleWatchActivate}
                  mode={isWatching ? 'watch' : null}
                  compact
                  showProviders={!isWatching}
                />

                {/* Section timeline (when watching) */}
                {isWatching && showSections && (
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3">
                    <TrackSections
                      trackId={track.id}
                      currentTime={currentTime}
                      durationMs={track.duration_ms || 240000}
                      compact
                      showTimeline={true}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
