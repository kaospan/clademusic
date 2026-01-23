import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { formatTimeFromSeconds } from '@/lib/timeFormat';

interface AudioPreviewProps {
  previewUrl?: string | null;
  title: string;
  artist: string;
  coverUrl?: string | null;
  isActive?: boolean;
  compact?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
}

export function AudioPreview({
  previewUrl,
  title,
  artist,
  coverUrl,
  isActive = false,
  compact = false,
  onPlay,
  onPause,
  className,
}: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pause when becoming inactive
  useEffect(() => {
    if (!isActive && isPlaying) {
      handlePause();
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (!audioRef.current || !previewUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      onPlay?.();
    } catch (err) {
      console.error('Playback failed:', err);
      setError('Unable to play preview');
    } finally {
      setIsLoading(false);
    }
  }, [previewUrl, onPlay]);

  const handlePause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleToggle = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setProgress(dur > 0 ? (current / dur) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    onPause?.();
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const time = (value[0] / 100) * audioRef.current.duration;
    audioRef.current.currentTime = time;
    setProgress(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!previewUrl) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground text-sm', className)}>
        <VolumeX className="w-4 h-4" />
        <span>No preview available</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <audio
          ref={audioRef}
          src={previewUrl}
          preload="none"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => setError('Failed to load audio')}
        />
        
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={handleToggle}
          disabled={isLoading || !!error}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>

        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTimeFromSeconds((progress / 100) * duration)} / {formatTimeFromSeconds(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-card/50 backdrop-blur-sm p-4 space-y-3', className)}>
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setError('Failed to load audio')}
      />

      {/* Track info and play button */}
      <div className="flex items-center gap-3">
        {/* Cover art */}
        {coverUrl && (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            <AnimatePresence>
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-white rounded-full"
                        animate={{
                          height: [8, 16, 8],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{title}</p>
          <p className="text-sm text-muted-foreground truncate">{artist}</p>
        </div>

        {/* Play button */}
        <Button
          variant="default"
          size="icon"
          className="h-12 w-12 rounded-full flex-shrink-0"
          onClick={handleToggle}
          disabled={isLoading || !!error}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{formatTimeFromSeconds((progress / 100) * duration)}</span>
          <span>{formatTimeFromSeconds(duration)}</span>
        </div>
      </div>

      {/* Volume control */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume * 100]}
          onValueChange={handleVolumeChange}
          max={100}
          step={1}
          className="w-24"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
