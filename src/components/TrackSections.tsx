/**
 * Track Sections Component
 * 
 * Displays song structure sections (intro, verse, chorus, etc.) as clickable buttons.
 * Clicking a section seeks the current player to that timestamp.
 * Shows visual progress through sections based on current playback time.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from '@/player/PlayerContext';
import { useTrackSections } from '@/hooks/api/useTrackSections';
import { 
  getSectionDisplayLabel, 
  getSectionColor, 
  sectionStartSeconds,
  formatMs,
  getSectionWidthPercent,
  getSectionStartPercent,
} from '@/lib/sections';
import { cn } from '@/lib/utils';
import type { TrackSection, SongSectionType } from '@/types';

interface TrackSectionsProps {
  trackId: string;
  /** Current playback time in seconds (for highlighting active section) */
  currentTime?: number;
  /** Total track duration in milliseconds (for progress bar) */
  durationMs?: number;
  /** Compact mode - smaller buttons */
  compact?: boolean;
  /** Show timeline visualization */
  showTimeline?: boolean;
  className?: string;
}

// Mock sections for demo (remove when DB is populated)
const MOCK_SECTIONS: TrackSection[] = [
  { id: '1', track_id: 'demo', label: 'intro', start_ms: 0, end_ms: 15000, created_at: '' },
  { id: '2', track_id: 'demo', label: 'verse', start_ms: 15000, end_ms: 45000, created_at: '' },
  { id: '3', track_id: 'demo', label: 'pre-chorus', start_ms: 45000, end_ms: 60000, created_at: '' },
  { id: '4', track_id: 'demo', label: 'chorus', start_ms: 60000, end_ms: 90000, created_at: '' },
  { id: '5', track_id: 'demo', label: 'verse', start_ms: 90000, end_ms: 120000, created_at: '' },
  { id: '6', track_id: 'demo', label: 'chorus', start_ms: 120000, end_ms: 150000, created_at: '' },
  { id: '7', track_id: 'demo', label: 'bridge', start_ms: 150000, end_ms: 180000, created_at: '' },
  { id: '8', track_id: 'demo', label: 'chorus', start_ms: 180000, end_ms: 210000, created_at: '' },
  { id: '9', track_id: 'demo', label: 'outro', start_ms: 210000, end_ms: 240000, created_at: '' },
];

function SectionButton({ 
  section, 
  isActive, 
  compact,
  onClick 
}: { 
  section: TrackSection; 
  isActive: boolean; 
  compact?: boolean;
  onClick: () => void;
}) {
  const colorClass = getSectionColor(section.label);
  const displayLabel = getSectionDisplayLabel(section.label);
  const timestamp = formatMs(section.start_ms);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg transition-all',
        'border border-border/50 hover:border-primary/50',
        compact ? 'px-2 py-1.5 min-w-[60px]' : 'px-3 py-2 min-w-[80px]',
        isActive 
          ? 'bg-primary/20 border-primary ring-2 ring-primary/30' 
          : 'bg-muted/30 hover:bg-muted/50'
      )}
    >
      {/* Color indicator */}
      <div className={cn(
        'absolute top-1 left-1 w-2 h-2 rounded-full',
        colorClass
      )} />
      
      <span className={cn(
        'font-medium',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {displayLabel}
      </span>
      <span className={cn(
        'text-muted-foreground',
        compact ? 'text-[10px]' : 'text-xs'
      )}>
        {timestamp}
      </span>
    </motion.button>
  );
}

function SectionTimeline({ 
  sections, 
  currentTime, 
  durationMs,
  onSectionClick 
}: { 
  sections: TrackSection[]; 
  currentTime: number;
  durationMs: number;
  onSectionClick: (section: TrackSection) => void;
}) {
  const progressPercent = durationMs > 0 ? (currentTime * 1000 / durationMs) * 100 : 0;

  return (
    <div className="relative w-full h-8 bg-muted/20 rounded-lg overflow-hidden">
      {/* Section blocks */}
      {sections.map((section, index) => {
        const width = getSectionWidthPercent(section, durationMs);
        const left = getSectionStartPercent(section, durationMs);
        const colorClass = getSectionColor(section.label);
        
        return (
          <button
            key={section.id}
            onClick={() => onSectionClick(section)}
            className={cn(
              'absolute top-0 bottom-0 transition-opacity hover:opacity-100',
              colorClass,
              'opacity-60'
            )}
            style={{ 
              left: `${left}%`, 
              width: `${width}%`,
              borderRight: index < sections.length - 1 ? '1px solid rgba(0,0,0,0.3)' : undefined
            }}
            title={`${getSectionDisplayLabel(section.label)} - ${formatMs(section.start_ms)}`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/80 truncate px-1">
              {width > 8 ? getSectionDisplayLabel(section.label) : ''}
            </span>
          </button>
        );
      })}
      
      {/* Playhead */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 transition-all duration-100"
        style={{ left: `${progressPercent}%` }}
      />
    </div>
  );
}

export function TrackSections({
  trackId,
  currentTime = 0,
  durationMs = 240000,
  compact = false,
  showTimeline = true,
  className,
}: TrackSectionsProps) {
  const { seekTo } = usePlayer();
  
  // Fetch sections from DB (with fallback to mock data for demo)
  const { data: dbSections, isLoading } = useTrackSections(trackId);
  const sections = dbSections?.length ? dbSections : MOCK_SECTIONS;

  // Find active section based on current time
  const activeSection = useMemo(() => {
    const currentMs = currentTime * 1000;
    return sections.find(s => currentMs >= s.start_ms && currentMs < s.end_ms);
  }, [sections, currentTime]);

  const handleSectionClick = (section: TrackSection) => {
    const startSec = sectionStartSeconds(section);
    seekTo(startSec);
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="h-12 w-20 bg-muted/30 rounded-lg animate-pulse" 
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section label */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Song Sections</h3>
        {activeSection && (
          <span className="text-xs text-primary font-medium">
            Now: {getSectionDisplayLabel(activeSection.label)}
          </span>
        )}
      </div>

      {/* Timeline visualization */}
      {showTimeline && (
        <SectionTimeline
          sections={sections}
          currentTime={currentTime}
          durationMs={durationMs}
          onSectionClick={handleSectionClick}
        />
      )}

      {/* Section buttons */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <SectionButton
            key={section.id}
            section={section}
            isActive={activeSection?.id === section.id}
            compact={compact}
            onClick={() => handleSectionClick(section)}
          />
        ))}
      </div>
    </div>
  );
}
