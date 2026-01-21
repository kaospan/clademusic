/**
 * Track Data Hooks
 * 
 * React Query hooks for track data with automatic fallback.
 * Uses the trackService which handles database -> seed data fallback.
 * For Spotify IDs (spotify:xxx), fetches directly from Spotify API.
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchTracks,
  getTrackById,
  searchTracks,
  getFeedTracks,
  getDataSourceStatus,
  TrackQuery,
} from '@/services/trackService';
import { getSpotifyTrack } from '@/services/spotifySearchService';
import { useAuth } from '@/hooks/useAuth';
import { QUERY_KEYS } from '@/lib/constants';

/**
 * Hook to fetch multiple tracks with fallback
 */
export function useTracks(query: TrackQuery = {}, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.TRACKS, query],
    queryFn: () => fetchTracks(query),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single track by ID
 * Handles both local IDs and Spotify IDs (prefixed with "spotify:")
 */
export function useTrack(id: string | undefined, enabled = true) {
  const { user } = useAuth();
  const isSpotifyId = id?.startsWith('spotify:');
  
  return useQuery({
    queryKey: [QUERY_KEYS.TRACKS, 'single', id],
    queryFn: async () => {
      if (!id) return null;
      
      // If it's a Spotify ID, fetch from Spotify API
      if (isSpotifyId && user) {
        const spotifyId = id.replace('spotify:', '');
        return await getSpotifyTrack(user.id, spotifyId);
      }
      
      // Otherwise, fetch from local database/seed data
      return await getTrackById(id);
    },
    enabled: !!id && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to search tracks
 */
export function useTrackSearch(
  searchTerm: string,
  options: { limit?: number; offset?: number } = {}
) {
  return useQuery({
    queryKey: [QUERY_KEYS.TRACKS, 'search', searchTerm, options],
    queryFn: () => searchTracks(searchTerm, options),
    enabled: searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for feed tracks (main page)
 */
export function useFeedTracks(limit = 20) {
  return useQuery({
    queryKey: [QUERY_KEYS.FEED, limit],
    queryFn: () => getFeedTracks(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check data source availability
 */
export function useDataSourceStatus() {
  return useQuery({
    queryKey: ['dataSourceStatus'],
    queryFn: getDataSourceStatus,
    staleTime: 60 * 1000, // 1 minute
    retry: false,
  });
}
