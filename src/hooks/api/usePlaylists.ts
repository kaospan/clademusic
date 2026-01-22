import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_collaborative: boolean;
  cover_url: string | null;
  cover_color: string | null;
  created_at: string;
  updated_at: string;
  last_played_at: string | null;
  play_count: number;
  track_count?: number;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  added_by: string | null;
  position: number;
  added_at: string;
  track?: any; // Will be joined with tracks table
}

export interface PlaylistCollaborator {
  id: string;
  playlist_id: string;
  user_id: string;
  can_edit: boolean;
  can_add_tracks: boolean;
  can_remove_tracks: boolean;
  invited_by: string | null;
  invited_at: string;
  user?: any; // Will be joined with profiles
}

// Get user's playlists
export function usePlaylists(userId?: string) {
  return useQuery({
    queryKey: ['playlists', userId],
    queryFn: async () => {
      let query = supabase
        .from('playlists')
        .select(`
          *,
          playlist_tracks(count)
        `)
        .order('updated_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(playlist => ({
        ...playlist,
        track_count: playlist.playlist_tracks?.[0]?.count || 0,
      })) as Playlist[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get single playlist with tracks
export function usePlaylist(playlistId?: string) {
  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      if (!playlistId) return null;

      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_tracks(
            *,
            track:track_id(*)
          ),
          playlist_collaborators(
            *,
            user:user_id(username, avatar_url)
          ),
          owner:user_id(username, avatar_url)
        `)
        .eq('id', playlistId)
        .order('position', { foreignTable: 'playlist_tracks' })
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!playlistId,
  });
}

// Get public playlists
export function usePublicPlaylists(limit = 20) {
  return useQuery({
    queryKey: ['publicPlaylists', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_tracks(count),
          owner:user_id(username, avatar_url)
        `)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(playlist => ({
        ...playlist,
        track_count: playlist.playlist_tracks?.[0]?.count || 0,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create playlist
export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlist: { name: string; description?: string; is_public?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name: playlist.name,
          description: playlist.description || null,
          is_public: playlist.is_public ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

// Update playlist
export function useUpdatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, updates }: { playlistId: string; updates: Partial<Playlist> }) => {
      const { data, error } = await supabase
        .from('playlists')
        .update(updates)
        .eq('id', playlistId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

// Delete playlist
export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });
}

// Add track to playlist
export function useAddTrackToPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      const { data, error } = await supabase.rpc('add_track_to_playlist', {
        p_playlist_id: playlistId,
        p_track_id: trackId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] });
    },
  });
}

// Remove track from playlist
export function useRemoveTrackFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] });
    },
  });
}

// Reorder playlist tracks
export function useReorderPlaylistTracks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackIds }: { playlistId: string; trackIds: string[] }) => {
      const { error } = await supabase.rpc('reorder_playlist_tracks', {
        p_playlist_id: playlistId,
        p_track_ids: trackIds,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] });
    },
  });
}

// Add collaborator
export function useAddCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      playlistId, 
      userId, 
      permissions 
    }: { 
      playlistId: string; 
      userId: string;
      permissions?: { can_edit?: boolean; can_add_tracks?: boolean; can_remove_tracks?: boolean };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('playlist_collaborators')
        .insert({
          playlist_id: playlistId,
          user_id: userId,
          invited_by: user.id,
          can_edit: permissions?.can_edit ?? true,
          can_add_tracks: permissions?.can_add_tracks ?? true,
          can_remove_tracks: permissions?.can_remove_tracks ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] });
    },
  });
}

// Remove collaborator
export function useRemoveCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, userId }: { playlistId: string; userId: string }) => {
      const { error } = await supabase
        .from('playlist_collaborators')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] });
    },
  });
}
