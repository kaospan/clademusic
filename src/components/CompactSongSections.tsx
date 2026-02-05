import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { TrackSection } from '@/types';
import { usePlayer } from '@/player/PlayerContext';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/timeFormat';

interface CompactSongSectionsProps {
  sections: TrackSection[];
  youtubeId?: string;
  spotifyId?: string;
  trackTitle: string;
  trackArtist: string;
  canonicalTrackId?: string | null;
  className?: string;
}

const SECTION_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  verse: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'pre-chorus': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  chorus: 'bg-green-500/20 text-green-300 border-green-500/30',
  bridge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  outro: 'bg-red-500/20 text-red-300 border-red-500/30',
  breakdown: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  drop: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

export function CompactSongSections({ 
  sections, 
  youtubeId, 
  spotifyId,
  trackTitle, 
  trackArtist,
  canonicalTrackId = null,
  className 
}: CompactSongSectionsProps) {
  const { openPlayer, seekTo, youtubeOpen, youtubeTrackId, spotifyOpen, spotifyTrackId, currentSectionId, positionMs } = usePlayer();

  const handleSectionClick = (section: TrackSection) => {
    const startSeconds = Math.floor(section.start_ms / 1000);

    const isYoutubePlaying = youtubeOpen && youtubeTrackId?.includes(youtubeId || '');
    const isSpotifyPlaying = spotifyOpen && spotifyTrackId === spotifyId;

    if (youtubeId) {
      if (isYoutubePlaying) {
        seekTo(startSeconds);
      } else {
        openPlayer({
          canonicalTrackId: null,
          provider: 'youtube',
          providerTrackId: youtubeId,
          autoplay: true,
          startSec: startSeconds,
        });
      }
    } else if (spotifyId && !isSpotifyPlaying) {
      openPlayer({ canonicalTrackId: null, provider: 'spotify', providerTrackId: spotifyId, autoplay: true });
    }
  };

  if (!sections || sections.length === 0) return null;

  return (
    <div className={cn('flex gap-1.5 flex-wrap', className)}>
      {sections.map((section, index) => {
        const colorClass = SECTION_COLORS[section.label] || 'bg-muted/20 text-muted-foreground border-muted/30';
        
        // Highlight active section: explicit currentSectionId match OR
        // fallback to position-based highlighting when currentSectionId is null
        const isLastSection = index === sections.length - 1;
        const isActive = currentSectionId === section.id || 
          (currentSectionId === null && positionMs >= section.start_ms && 
           (isLastSection ? positionMs <= section.end_ms : positionMs < section.end_ms));
        
        return (
          <motion.button
            key={section.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => handleSectionClick(section)}
            className={cn(
              'group relative px-2 py-1 rounded-md text-xs font-medium',
              'border transition-all hover:scale-105',
              isActive && 'ring-2 ring-primary ring-offset-1',
              colorClass
            )}
            title={`Play from ${section.label} at ${formatTime(section.start_ms)}`}
          >
            <div className="flex items-center gap-1">
              <Play className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="capitalize">{section.label}</span>
              <span className="text-[10px] opacity-60">{formatTime(section.start_ms)}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
