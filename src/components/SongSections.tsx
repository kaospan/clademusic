import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music2, Play } from 'lucide-react';
import { SongSection, SongSectionType } from '@/types';
import { cn } from '@/lib/utils';
import { usePlayer } from '@/player/PlayerContext';

interface SongSectionsProps {
  sections: SongSection[];
  youtubeId: string;
  title: string;
  className?: string;
}

const sectionColors: Record<SongSectionType, string> = {
  intro: 'from-blue-500/20 to-blue-600/10',
  verse: 'from-purple-500/20 to-purple-600/10',
  'pre-chorus': 'from-indigo-500/20 to-indigo-600/10',
  chorus: 'from-pink-500/20 to-pink-600/10',
  bridge: 'from-orange-500/20 to-orange-600/10',
  breakdown: 'from-red-500/20 to-red-600/10',
  drop: 'from-yellow-500/20 to-yellow-600/10',
  outro: 'from-teal-500/20 to-teal-600/10',
};

const sectionIcons: Record<SongSectionType, string> = {
  intro: '🎬',
  verse: '📝',
  'pre-chorus': '🎵',
  chorus: '🎤',
  bridge: '🌉',
  breakdown: '💥',
  drop: '⚡',
  outro: '🎭',
};

export function SongSections({ sections, youtubeId, title, className }: SongSectionsProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const { openPlayer } = usePlayer();

  if (!sections || sections.length === 0) {
    return null;
  }

  const handleSectionClick = (index: number) => {
    const section = sections[index];
    setExpandedSection(index === expandedSection ? null : index);

    if (youtubeId) {
      // IMPORTANT: All playback must go through the universal player; no inline embeds.
      openPlayer({
        canonicalTrackId: undefined,
        provider: 'youtube',
        providerTrackId: youtubeId,
        autoplay: true,
        startSec: section.start_time,
        context: 'song-sections',
        title,
      });
    }
  };


  function formatTime(seconds: number): React.ReactNode {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Music2 className="w-4 h-4" />
        <span>Song Structure</span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {sections.map((section, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSectionClick(index)}
              className={cn(
                'w-full p-3 rounded-xl transition-all',
                'bg-gradient-to-br',
                sectionColors[section.type],
                'border border-white/10',
                'hover:border-white/20',
                expandedSection === index && 'ring-2 ring-primary',
                'flex items-center justify-between gap-2'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0">{sectionIcons[section.type]}</span>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {section.label || section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(section.start_time)}
                    {section.end_time && ` - ${formatTime(section.end_time)}`}
                  </span>
                </div>
              </div>
              <Play className="w-4 h-4 flex-shrink-0" />
            </motion.button>
          ))}
        </div>

        {/* IMPORTANT: No inline YouTube iframes; universal player is the only playback surface. */}
      </div>
    </div>
  );
}
