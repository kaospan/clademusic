import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Comment {
  id: string;
  track_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  user_display_name?: string;
  user_avatar_url?: string;
}

function normalizeTrackComment(row: any): Comment {
  return {
    id: row.id,
    track_id: row.track_id,
    user_id: row.user_id,
    content: row.content ?? row.comment ?? '',
    parent_id: row.parent_id ?? row.reply_to ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_display_name: row.user_display_name ?? 'Anonymous',
    user_avatar_url: row.user_avatar_url ?? undefined,
  };
}

function isSchemaCacheError(error: any): boolean {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return code.startsWith('PGRST') || message.includes('schema cache') || message.includes('could not find');
}

export function useTrackComments(trackId: string) {
  return useQuery({
    queryKey: ['track-comments', trackId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('track_comments')
          .select('*')
          .eq('track_id', trackId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('[Comments] track_comments fetch skipped due to schema error', error);
          return [];
        }

        return (data || []).map(normalizeTrackComment);
      } catch (error) {
        console.error('Failed to load track comments:', error);
        return [];
      }
    },
    enabled: !!trackId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      trackId, 
      content, 
      parentId 
    }: { 
      trackId: string; 
      content: string; 
      parentId?: string;
    }) => {
      try {
        if (!user) throw new Error('Must be logged in to comment');

        const tryNewSchema = async () =>
          await supabase
            .from('track_comments')
            .insert({
              track_id: trackId,
              user_id: user.id,
              comment: content,
              reply_to: parentId || null,
            } as any)
            .select()
            .single();

        const tryLegacySchema = async () =>
          await supabase
            .from('track_comments')
            .insert({
              track_id: trackId,
              user_id: user.id,
              content,
              parent_id: parentId || null,
            } as any)
            .select()
            .single();

        let { data, error } = await tryNewSchema();
        if (error && isSchemaCacheError(error)) {
          ({ data, error } = await tryLegacySchema());
        }

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Failed to add comment:', error);
        return null;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-comments', variables.trackId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, trackId }: { commentId: string; trackId: string }) => {
      try {
        const { error } = await supabase
          .from('track_comments')
          .delete()
          .eq('id', commentId);

        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-comments', variables.trackId] });
    },
  });
}

export function useCommentCount(trackId: string) {
  return useQuery({
    queryKey: ['comment-count', trackId],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('track_comments')
          .select('*', { count: 'exact', head: true })
          .eq('track_id', trackId);

        if (error) throw error;
        return count || 0;
      } catch (error) {
        console.error('Failed to load comment count:', error);
        return 0;
      }
    },
    enabled: !!trackId,
  });
}
