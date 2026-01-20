/**
 * Track Data Service
 * 
 * Provides a unified interface for fetching track data with fallback chain:
 * 1. Supabase database (primary source)
 * 2. Spotify API (if connected)
 * 3. Local seed data (fallback for development/offline)
 * 
 * This decouples data fetching from UI components and enables graceful degradation.
 */

import { supabase } from '@/integrations/supabase/client';
import { Track, SongSection } from '@/types';
import { seedTracks } from '@/data/seedTracks';

export interface TrackQuery {
  id?: string;
  spotifyId?: string;
  youtubeId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TrackResult {
  tracks: Track[];
  source: 'database' | 'api' | 'seed';
  total?: number;
}

/**
 * Transform database row to Track type
 * Handles JSON fields that need proper typing
 */
function transformDbRowToTrack(row: Record<string, unknown>): Track {
  return {
    ...row,
    // Handle JSON fields that need proper type conversion
    sections: Array.isArray(row.sections)
      ? (row.sections as SongSection[])
      : undefined,
    detected_mode: (row.detected_mode as 'major' | 'minor' | 'unknown') || undefined,
  } as Track;
}

/**
 * Check if we have database connectivity
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('tracks').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch tracks from Supabase database
 */
async function fetchFromDatabase(query: TrackQuery): Promise<Track[] | null> {
  try {
    let supabaseQuery = supabase.from('tracks').select('*');
    
    if (query.id) {
      supabaseQuery = supabaseQuery.eq('id', query.id);
    }
    
    if (query.spotifyId) {
      supabaseQuery = supabaseQuery.eq('spotify_id', query.spotifyId);
    }
    
    if (query.youtubeId) {
      supabaseQuery = supabaseQuery.eq('youtube_id', query.youtubeId);
    }
    
    if (query.search) {
      // Sanitize search input to prevent filter injection
      const sanitizedSearch = query.search.replace(/[%_,().*\\]/g, '');
      // Escape ILIKE special characters to prevent unexpected pattern matching
      const escapedSearch = query.search.replace(/[%_]/g, '\\$&');
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${escapedSearch}%,artist.ilike.%${escapedSearch}%`
        `title.ilike.%${sanitizedSearch}%,artist.ilike.%${sanitizedSearch}%`
      );
    }
    
    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
    }
    
    if (query.offset) {
      supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 20) - 1);
    }
    
    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.warn('Database fetch failed:', error.message);
      return null;
    }
    
    // Transform database rows to proper Track types
    return data ? data.map(row => transformDbRowToTrack(row as Record<string, unknown>)) : null;
  } catch (error) {
    console.warn('Database fetch error:', error);
    return null;
  }
}

/**
 * Filter seed tracks based on query
 */
function filterSeedTracks(query: TrackQuery): Track[] {
  let results = [...seedTracks];
  
  if (query.id) {
    results = results.filter(t => t.id === query.id);
  }
  
  if (query.spotifyId) {
    results = results.filter(t => t.spotify_id === query.spotifyId);
  }
  
  if (query.youtubeId) {
    results = results.filter(t => t.youtube_id === query.youtubeId);
  }
  
  if (query.search) {
    const lowerSearch = query.search.toLowerCase();
    results = results.filter(t =>
      t.title.toLowerCase().includes(lowerSearch) ||
      t.artist?.toLowerCase().includes(lowerSearch) ||
      t.album?.toLowerCase().includes(lowerSearch)
    );
  }
  
  const offset = query.offset || 0;
  const limit = query.limit || 20;
  
  return results.slice(offset, offset + limit);
}

/**
 * Fetch tracks with automatic fallback
 */
export async function fetchTracks(query: TrackQuery = {}): Promise<TrackResult> {
  // Try database first
  const dbTracks = await fetchFromDatabase(query);
  
  if (dbTracks && dbTracks.length > 0) {
    return {
      tracks: dbTracks,
      source: 'database',
      total: dbTracks.length,
    };
  }
  
  // Fallback to seed data
  const seedResults = filterSeedTracks(query);
  
  return {
    tracks: seedResults,
    source: 'seed',
    total: seedResults.length,
  };
}

/**
 * Get a single track by ID with fallback
 */
export async function getTrackById(id: string): Promise<Track | null> {
  const result = await fetchTracks({ id, limit: 1 });
  return result.tracks[0] || null;
}

/**
 * Get tracks by Spotify ID with fallback
 */
export async function getTrackBySpotifyId(spotifyId: string): Promise<Track | null> {
  const result = await fetchTracks({ spotifyId, limit: 1 });
  return result.tracks[0] || null;
}

/**
 * Search tracks with fallback
 */
export async function searchTracks(
  searchTerm: string,
  options: { limit?: number; offset?: number } = {}
): Promise<TrackResult> {
  return fetchTracks({
    search: searchTerm,
    limit: options.limit || 20,
    offset: options.offset || 0,
  });
}

/**
 * Get all available tracks (for feed)
 */
export async function getFeedTracks(limit = 20): Promise<TrackResult> {
  return fetchTracks({ limit });
}

/**
 * Check data source availability
 */
export async function getDataSourceStatus(): Promise<{
  database: boolean;
  seedDataAvailable: boolean;
}> {
  const dbConnected = await checkDatabaseConnection();
  
  return {
    database: dbConnected,
    seedDataAvailable: seedTracks.length > 0,
  };
}
