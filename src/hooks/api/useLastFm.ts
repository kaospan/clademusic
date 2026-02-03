/**
 * Last.fm React Query Hooks
 * 
 * Provides React Query hooks for fetching Last.fm user data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getLastFmUsername,
  getLastFmStats,
  getLastFmRecentTracks,
  connectLastFm,
  disconnectLastFm,
  type LastFmStats,
  type LastFmTrack,
} from '@/services/lastfmService';

/**
 * Hook to get stored Last.fm username
 */
export function useLastFmUsername() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lastfm-username', user?.id],
    queryFn: () => getLastFmUsername(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to check if Last.fm is connected
 */
export function useLastFmConnected() {
  const { data: username } = useLastFmUsername();
  return !!username;
}

/**
 * Hook to fetch Last.fm stats
 */
export function useLastFmStats() {
  const { user } = useAuth();
  const { data: username } = useLastFmUsername();

  return useQuery<LastFmStats | null>({
    queryKey: ['lastfm-stats', username],
    queryFn: () => (username ? getLastFmStats(username) : null),
    enabled: !!user && !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch recent Last.fm scrobbles (raw API tracks).
 * Fetches `limit` most recent scrobbles; consumers can dedupe in UI as needed.
 */
export function useLastFmRecentTracks(limit = 200) {
  const { user } = useAuth();
  const { data: username } = useLastFmUsername();

  return useQuery<LastFmTrack[]>({
    queryKey: ['lastfm-recent', username, limit],
    queryFn: () => (username ? getLastFmRecentTracks(username, limit) : []),
    enabled: !!user && !!username,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to connect Last.fm account
 */
export function useConnectLastFm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      if (!user) throw new Error('Must be logged in');
      await connectLastFm(user.id, username);
      return username;
    },
    onSuccess: (username) => {
      // Update the username cache immediately
      queryClient.setQueryData(['lastfm-username', user?.id], username);
      // Invalidate to refetch stats
      queryClient.invalidateQueries({ queryKey: ['lastfm-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-providers'] });
    },
  });
}

/**
 * Hook to disconnect Last.fm account
 */
export function useDisconnectLastFm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      await disconnectLastFm(user.id);
    },
    onSuccess: () => {
      queryClient.setQueryData(['lastfm-username', user?.id], null);
      queryClient.setQueryData(['lastfm-stats', null], null);
      queryClient.invalidateQueries({ queryKey: ['user-providers'] });
    },
  });
}
