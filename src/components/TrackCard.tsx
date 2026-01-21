import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bookmark, X, Sparkles, Waves, Play, Pause, Music, Youtube } from 'lucide-react';
import { HarmonyCard } from './HarmonyCard';
import { CommentsSheet } from './CommentsSheet';
import { NearbyListenersSheet } from './NearbyListenersSheet';
import { ShareSheet } from './ShareSheet';
import { AudioPreview } from './AudioPreview';
import { QuickStreamButtons } from './QuickStreamButtons';
import { YouTubeEmbed } from './YouTubeEmbed';
import { SongSections } from './SongSections';
import { CompactSongSections } from './CompactSongSections';
import { Button } from '@/components/ui/button';
import { Track, InteractionType, TrackSection, SongSection } from '@/types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useRecordListeningActivity } from '@/hooks/api/useNearbyListeners';
import { useRecordPlay } from '@/hooks/api/useFollowing';
import { useAuth } from '@/hooks/useAuth';

interface TrackCardProps {
  track: Track;
  isActive: boolean;
  onInteraction: (type: InteractionType) => void;
  interactions?: Set<InteractionType>;
  onPipModeActivate?: (videoId: string, title: string) => void;
  isPipActive?: boolean;
}

export function TrackCard({ 
  track, 
  isActive, 
  onInteraction, 
  interactions = new Set(),
  onPipModeActivate,
  isPipActive = false,
}: TrackCardProps) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showYouTubeEmbed, setShowYouTubeEmbed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playStartTimeRef = useRef<number | null>(null);
  const recordActivity = useRecordListeningActivity();
  const recordPlay = useRecordPlay();

  // Convert SongSection to TrackSection format
  const convertSections = useCallback((sections: SongSection[]): TrackSection[] => {
    return sections.map((section, index) => ({
      id: `${track.id}-${section.type}-${index}`,
      track_id: track.id,
      label: section.type,
      start_ms: section.start_time * 1000,
      end_ms: section.end_time ? section.end_time * 1000 : (sections[index + 1]?.start_time || track.duration_ms || 240000 / 1000) * 1000,
      created_at: new Date().toISOString(),
    }));
  }, [track.id, track.duration_ms]);

  // Generate default sections if not present
  const generateDefaultSections = useCallback((): TrackSection[] => {
    const durationMs = track.duration_ms || 240000; // Default 4 minutes
    return [
      {
        id: `${track.id}-intro`,
        track_id: track.id,
        label: 'intro',
        start_ms: 0,
        end_ms: Math.floor(durationMs * 0.1),
        created_at: new Date().toISOString(),
      },
      {
        id: `${track.id}-verse1`,
        track_id: track.id,
        label: 'verse',
        start_ms: Math.floor(durationMs * 0.1),
        end_ms: Math.floor(durationMs * 0.3),
        created_at: new Date().toISOString(),
      },
      {
        id: `${track.id}-chorus1`,
        track_id: track.id,
        label: 'chorus',
        start_ms: Math.floor(durationMs * 0.3),
        end_ms: Math.floor(durationMs * 0.5),
        created_at: new Date().toISOString(),
      },
      {
        id: `${track.id}-verse2`,
        track_id: track.id,
        label: 'verse',
        start_ms: Math.floor(durationMs * 0.5),
        end_ms: Math.floor(durationMs * 0.65),
        created_at: new Date().toISOString(),
      },
      {
        id: `${track.id}-chorus2`,
        track_id: track.id,
        label: 'chorus',
        start_ms: Math.floor(durationMs * 0.65),
        end_ms: Math.floor(durationMs * 0.85),
        created_at: new Date().toISOString(),
      },
      {
        id: `${track.id}-outro`,
        track_id: track.id,
        label: 'outro',
        start_ms: Math.floor(durationMs * 0.85),
        end_ms: durationMs,
        created_at: new Date().toISOString(),
      },
    ];
  }, [track.id, track.duration_ms]);

  const trackSections: TrackSection[] = track.sections && track.sections.length > 0 
    ? convertSections(track.sections)
    : generateDefaultSections();

  // Pause audio when card becomes inactive
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
      }
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (audioRef.current && track.preview_url) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        playStartTimeRef.current = Date.now();
        
        // Record listening activity
        recordActivity.mutate({ 
          trackId: track.id, 
          artist: track.artist 
        });
      } catch (err) {
        console.error('Playback failed:', err);
      }
    }
  }, [track.preview_url, track.id, track.artist, recordActivity]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);

      // Record play duration
      if (playStartTimeRef.current && user) {
        const durationMs = Date.now() - playStartTimeRef.current;
        recordPlay.mutate({
          trackId: track.id,
          durationMs,
          source: 'feed',
        });
        playStartTimeRef.current = null;
      }
    }
  }, [user, track.id, recordPlay]);

  const handlePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (playStartTimeRef.current && user) {
      const durationMs = Date.now() - playStartTimeRef.current;
      recordPlay.mutate({
        trackId: track.id,
        durationMs,
        source: 'feed',
      });
      playStartTimeRef.current = null;
    }
  };

  const handleShare = () => {
    onInteraction('share');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0.5 }}
      className="relative w-full h-full flex flex-col"
    >
      {/* Hidden audio element for preview playback */}
      {track.preview_url && (
        <audio
          ref={audioRef}
          src={track.preview_url}
          preload="none"
          onEnded={handleAudioEnded}
        />
      )}

      {/* Background with cover art or YouTube embed */}
      <div className="absolute inset-0 z-0">
        {showYouTubeEmbed && track.youtube_id && !isPipActive ? (
          // YouTube embed as background when Watch button is active
          <div className="w-full h-full">
            <iframe
              src={`https://www.youtube.com/embed/${track.youtube_id}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
              title={`${track.title} - ${track.artist}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
          </div>
        ) : track.cover_url ? (
          <>
            <img
              src={track.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-background" />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 pb-8 space-y-4">
        {/* Track info */}
        <div className="space-y-2">
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl font-bold text-foreground line-clamp-2"
          >
            {track.title}
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-lg text-muted-foreground"
          >
            {track.artist}
          </motion.p>
        </div>

        {/* Compact Song Sections - always visible */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08 }}
        >
          <CompactSongSections
            sections={trackSections}
            youtubeId={track.youtube_id}
            spotifyId={track.spotify_id}
            trackTitle={track.title}
            trackArtist={track.artist || ''}
          />
        </motion.div>

        {/* Play button and streaming links */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3"
        >
          {/* Preview play button (if available) */}
          {track.preview_url && (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePlayPause}
              className="gap-2 glass border-white/20 hover:bg-white/10"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isPlaying ? 'Pause' : 'Preview'}
            </Button>
          )}

          {/* YouTube embed button - inline play without leaving the app */}
          {track.youtube_id && (
            <Button
              variant={showYouTubeEmbed ? 'default' : 'outline'}
              size="lg"
              onClick={() => setShowYouTubeEmbed(!showYouTubeEmbed)}
              className={cn(
                'gap-2',
                showYouTubeEmbed
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'glass border-white/20 hover:bg-white/10'
              )}
            >
              <Youtube className="w-5 h-5" />
              {showYouTubeEmbed ? 'Hide' : 'Watch'}
            </Button>
          )}

          {/* Quick streaming buttons - Spotify & YouTube icons */}
          <QuickStreamButtons
            track={{
              spotifyId: track.spotify_id || undefined,
              youtubeId: track.youtube_id || undefined,
              urlSpotifyWeb: track.url_spotify_web || undefined,
              urlSpotifyApp: track.url_spotify_app || undefined,
              urlYoutube: track.url_youtube || undefined,
            }}
            trackTitle={track.title}
            trackArtist={track.artist}
            size="md"
          />
        </motion.div>

        {/* Harmony card */}
        {track.progression_roman && track.progression_roman.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <HarmonyCard
              progression={track.progression_roman}
              detectedKey={track.detected_key}
              detectedMode={track.detected_mode}
              cadenceType={track.cadence_type}
              confidenceScore={track.confidence_score}
              matchReason="Same vi–IV–I–V loop with similar energy"
            />
          </motion.div>
        )}

        {/* Main action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between pt-4"
        >
          {/* Skip */}
          <ActionButton
            icon={X}
            label="Skip"
            isActive={interactions.has('skip')}
            onClick={() => onInteraction('skip')}
            variant="muted"
          />

          {/* More like this (harmonic) */}
          <ActionButton
            icon={Sparkles}
            label="Harmonic"
            isActive={interactions.has('more_harmonic')}
            onClick={() => onInteraction('more_harmonic')}
            variant="primary"
          />

          {/* Like */}
          <ActionButton
            icon={Heart}
            label="Like"
            isActive={interactions.has('like')}
            onClick={() => onInteraction('like')}
            variant="accent"
          />

          {/* More like this (vibe) */}
          <ActionButton
            icon={Waves}
            label="Vibe"
            isActive={interactions.has('more_vibe')}
            onClick={() => onInteraction('more_vibe')}
            variant="primary"
          />

          {/* Save */}
          <ActionButton
            icon={Bookmark}
            label="Save"
            isActive={interactions.has('save')}
            onClick={() => onInteraction('save')}
            variant="muted"
          />
        </motion.div>

        {/* Secondary actions: Comments, Nearby, Share */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-4"
        >
          {/* Comments */}
          <CommentsSheet trackId={track.id} trackTitle={track.title} />

          {/* Nearby Listeners */}
          <NearbyListenersSheet 
            trackId={track.id} 
            artist={track.artist} 
            trackTitle={track.title}
          />

          {/* Share */}
          <ShareSheet track={track} onShare={handleShare} />
        </motion.div>
      </div>
    </motion.div>
  );
}

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  variant: 'primary' | 'accent' | 'muted';
}

function ActionButton({ icon: Icon, label, isActive, onClick, variant }: ActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-3 rounded-xl transition-all',
        isActive && variant === 'accent' && 'text-accent glow-accent',
        isActive && variant === 'primary' && 'text-primary glow-primary',
        isActive && variant === 'muted' && 'text-foreground',
        !isActive && 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div
        className={cn(
          'p-3 rounded-full transition-all',
          isActive && variant === 'accent' && 'bg-accent/20',
          isActive && variant === 'primary' && 'bg-primary/20',
          isActive && variant === 'muted' && 'bg-muted',
          !isActive && 'bg-muted/50 hover:bg-muted'
        )}
      >
        <Icon className={cn('w-6 h-6', isActive && variant === 'accent' && 'fill-current')} />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </motion.button>
  );
}
