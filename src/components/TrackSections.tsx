/**
 * Track Sections Component
 * 
 * Clean, production-ready UI for song structure navigation.
 * - Canonical sections (provider-agnostic)
 * - No Supabase calls in JSX
 * - Section click = seek (no reload)
 * - Mobile-first horizontal scroll
 */

import { useEffect, useState } from 'react';
import { getTrackSections } from '@/api/trackSections';
import { sectionStartSeconds } from '@/lib/sections';
import { usePlayer } from '@/player/PlayerContext';
import type { TrackSection, SongSectionType } from '@/types';

interface TrackSectionsProps {
  trackId: string;
}

const LABEL_MAP: Record<SongSectionType, string> = {
  intro: 'Intro',
  verse: 'Verse',
  'pre-chorus': 'Pre-Chorus',
  chorus: 'Chorus',
  bridge: 'Bridge',
  outro: 'Outro',
  breakdown: 'Breakdown',
  drop: 'Drop',
};

export function TrackSections({ trackId }: TrackSectionsProps) {
  const [sections, setSections] = useState<TrackSection[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    seekTo,
    currentSectionId,
    setCurrentSection,
    isPlaying,
    positionMs,
  } = usePlayer();

  useEffect(() => {
    load();
  }, [trackId]);

  async function load() {
    setLoading(true);
    try {
      const data = await getTrackSections(trackId);
      setSections(data);
    } catch (err) {
      console.error('Failed to load track sections', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || sections.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {sections.map((section) => {
          // Highlight active section: explicit currentSectionId match OR
          // fallback to position-based highlighting when currentSectionId is null
          const active = currentSectionId === section.id || 
            (currentSectionId === null && positionMs >= section.start_ms && positionMs < section.end_ms);

          return (
            <button
              key={section.id}
              onClick={() => {
                setCurrentSection(section.id);
                seekTo(sectionStartSeconds(section));
              }}
              className={[
                'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
                !isPlaying && 'opacity-90',
              ].join(' ')}
            >
              {LABEL_MAP[section.label] || section.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
