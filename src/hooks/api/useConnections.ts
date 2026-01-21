/**
 * React hooks for track connections (WhoSampled-style relationships)
 * 
 * NOTE: These hooks are stubs until the track_connections table is created.
 * The table migration is pending - these provide the interface for future implementation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConnectionType } from '@/types';
import { useAuth } from '@/hooks/useAuth';

// Placeholder types until DB table exists
export interface TrackConnectionRow {
  id: string;
  from_track_id: string;
  to_track_id: string;
  connection_type: ConnectionType;
  confidence?: number;
  evidence_url?: string;
  evidence_text?: string;
  created_at: string;
  created_by?: string;
}

export interface ConnectionGraphData {
  track: {
    id: string;
    title: string;
    artist: string;
    cover_url?: string;
  };
  upstream: TrackConnectionRow[];
  downstream: TrackConnectionRow[];
  most_popular_derivative?: {
    id: string;
    title: string;
    artist: string;
  };
}

/**
 * Hook to fetch connection graph for a track
 * Currently returns empty data - waiting for track_connections table
 */
export function useTrackConnections(trackId: string) {
  return useQuery({
    queryKey: ['track-connections', trackId],
    queryFn: async (): Promise<ConnectionGraphData | null> => {
      if (!trackId) return null;
      
      // TODO: Implement when track_connections table is created
      // Table schema:
      //   - id: uuid primary key
      //   - from_track_id: text
      //   - to_track_id: text
      //   - connection_type: text (sample, cover, remix, interpolation, reference)
      //   - confidence: numeric (0-1)
      //   - evidence_url: text
      //   - created_by: uuid (foreign key to auth.users)
      //   - created_at: timestamptz
      // See TASKS.md for migration SQL
      
      console.log('useTrackConnections: Waiting for track_connections table', trackId);
      
      return {
        track: { id: trackId, title: '', artist: '' },
        upstream: [],
        downstream: [],
      };
    },
    enabled: !!trackId,
  });
}

interface CreateConnectionParams {
  from_track_id: string;
  to_track_id: string;
  connection_type: ConnectionType;
  confidence?: number;
  evidence_url?: string;
  evidence_text?: string;
}

/**
 * Hook to create a new track connection
 * Currently disabled - waiting for track_connections table
 */
export function useCreateConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateConnectionParams): Promise<TrackConnectionRow> => {
      if (!user) throw new Error('Must be logged in to create connections');

      // TODO: Implement when track_connections table is created
      console.log('useCreateConnection: Waiting for track_connections table', params);
      
      throw new Error('track_connections table not yet created');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-connections', variables.from_track_id] });
      queryClient.invalidateQueries({ queryKey: ['track-connections', variables.to_track_id] });
    },
  });
}

/**
 * Hook to get all connections with pagination
 * Currently returns empty array - waiting for track_connections table
 */
export function useAllConnections(limit: number = 50) {
  return useQuery({
    queryKey: ['all-connections', limit],
    queryFn: async () => {
      // TODO: Implement when track_connections table is created
      console.log('useAllConnections: Waiting for track_connections table');
      return [];
    },
  });
}

/**
 * Hook to get connection statistics
 * Currently returns zeros - waiting for track_connections table
 */
export function useConnectionStats() {
  return useQuery({
    queryKey: ['connection-stats'],
    queryFn: async () => {
      // TODO: Implement when track_connections table is created
      return {
        totalConnections: 0,
        typeCounts: {} as Record<string, number>,
        mostConnected: [],
      };
    },
  });
}
