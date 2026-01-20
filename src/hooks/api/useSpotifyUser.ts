/**
 * Spotify User Data Hooks
 * 
 * React Query hooks for fetching user-specific Spotify data.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getRecentlyPlayedTracks,
  isSpotifyConnected,
  getSpotifyProfile,
  getTopTracks,
  getTopArtists,
  computeMusicStats,
  getRecommendations,
  type TimeRange,
  type SpotifyArtist,
  type MusicStats,
} from '@/services/spotifyUserService';
import type { Track } from '@/types';

/**
 * Hook to check if user has Spotify connected
 */
export function useSpotifyConnected() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['spotify-connected', user?.id],
    queryFn: () => isSpotifyConnected(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch user's recently played tracks from Spotify
 */
export function useSpotifyRecentlyPlayed(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['spotify-recently-played', user?.id, limit],
    queryFn: () => getRecentlyPlayedTracks(user!.id, limit),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes - recent plays change frequently
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch user's Spotify profile
 */
export function useSpotifyProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['spotify-profile', user?.id],
    queryFn: () => getSpotifyProfile(user!.id),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch user's top tracks from Spotify
 */
export function useSpotifyTopTracks(timeRange: TimeRange = 'medium_term', limit = 20) {
  const { user } = useAuth();
  const { data: isConnected } = useSpotifyConnected();

  return useQuery<Track[]>({
    queryKey: ['spotify-top-tracks', user?.id, timeRange, limit],
    queryFn: () => getTopTracks(user!.id, timeRange, limit),
    enabled: !!user && isConnected === true,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch user's top artists from Spotify
 */
export function useSpotifyTopArtists(timeRange: TimeRange = 'medium_term', limit = 20) {
  const { user } = useAuth();
  const { data: isConnected } = useSpotifyConnected();

  return useQuery<SpotifyArtist[]>({
    queryKey: ['spotify-top-artists', user?.id, timeRange, limit],
    queryFn: () => getTopArtists(user!.id, timeRange, limit),
    enabled: !!user && isConnected === true,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch user's music stats (energy, danceability, mood, etc.)
 */
export function useMusicStats() {
  const { user } = useAuth();
  const { data: isConnected } = useSpotifyConnected();

  return useQuery<MusicStats | null>({
    queryKey: ['music-stats', user?.id],
    queryFn: () => computeMusicStats(user!.id),
    enabled: !!user && isConnected === true,
    staleTime: 30 * 60 * 1000, // 30 minutes - stats don't change that often
  });
}

/**
 * Hook to fetch personalized recommendations
 */
export function useSpotifyRecommendations(
  seedTrackIds: string[] = [],
  seedArtistIds: string[] = [],
  limit = 20
) {
  const { user } = useAuth();
  const { data: isConnected } = useSpotifyConnected();

  return useQuery<Track[]>({
    queryKey: ['spotify-recommendations', user?.id, seedTrackIds, seedArtistIds, limit],
    queryFn: () => getRecommendations(user!.id, seedTrackIds, seedArtistIds, limit),
    enabled: !!user && isConnected === true,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

