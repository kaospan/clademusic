/**
 * Track Sections API Hook
 * 
 * Fetches canonical song structure sections (intro, verse, chorus, etc.)
 * for seek-based playback across providers.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrackSection } from '@/types';

/**
 * Fetch all sections for a track, ordered by start time
 * 
 * Note: Uses rpc/raw approach until track_sections table is added to Supabase types
 * after running the migration and regenerating types.
 */
async function getTrackSections(trackId: string): Promise<TrackSection[]> {
  // Direct query using rpc to avoid type checking issues with new table
  const { data, error } = await supabase.rpc('get_track_sections' as never, { 
    p_track_id: trackId 
  } as never);

  if (error) {
    // Table/function might not exist yet - return empty array gracefully
    // This is expected until migration is applied
    console.debug('track_sections not available yet:', error.message);
    return [];
  }
  
  // If rpc doesn't exist, fallback to returning empty
  if (!data) return [];
  
  return (data as unknown as TrackSection[]) ?? [];
}

/**
 * React Query hook for fetching track sections
 */
export function useTrackSections(trackId: string | undefined) {
  return useQuery({
    queryKey: ['track-sections', trackId],
    queryFn: () => getTrackSections(trackId!),
    enabled: !!trackId,
    staleTime: 1000 * 60 * 60, // Sections rarely change - cache for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });
}

/**
 * Get a specific section by label
 */
export function findSectionByLabel(
  sections: TrackSection[],
  label: TrackSection['label']
): TrackSection | undefined {
  return sections.find(s => s.label === label);
}

/**
 * Get the section that contains a given timestamp
 */
export function findSectionAtTime(
  sections: TrackSection[],
  timeMs: number
): TrackSection | undefined {
  return sections.find(s => timeMs >= s.start_ms && timeMs < s.end_ms);
}
