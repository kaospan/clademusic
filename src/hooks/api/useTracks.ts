/**
 * Track Data Hooks
 * 
 * React Query hooks for track data with automatic fallback.
 * Uses the trackService which handles database -> seed data fallback.
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
 */
export function useTrack(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.TRACKS, 'single', id],
    queryFn: () => getTrackById(id!),
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
