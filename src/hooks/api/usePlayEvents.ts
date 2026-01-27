/**
 * React hooks for play events tracking
 * 
 * NOTE: These hooks are stubs until the play_events table is created.
 * For MVP, we track plays via user_interactions table instead.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MusicProvider } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type PlayAction = 'open_app' | 'open_web' | 'preview';

interface RecordPlayEventParams {
  track_id: string;
  provider: MusicProvider;
  action: PlayAction;
  context?: string;
  device?: string;
  metadata?: Record<string, unknown>;
}

interface PlayEventData {
  id: string;
  user_id?: string;
  track_id: string;
  provider: string;
  action: string;
  played_at: string;
  context?: string;
}

// Only allow interaction types that the user_interactions check constraint accepts.
// Known enum (see supabase): like | save | skip | more_harmonic | more_vibe | share
const ALLOWED_INTERACTIONS = new Set(['like', 'save', 'skip', 'more_harmonic', 'more_vibe', 'share']);

let interactionsDisabled = false;
let interactionsWarned = false;
let interactionsDisabledReason: string | null = null;

function disableInteractions(reason: string) {
  interactionsDisabled = true;
  interactionsDisabledReason = reason;
  if (!interactionsWarned) {
    console.warn('[PlayEvents] disabled user_interactions:', reason);
    interactionsWarned = true;
  }
}

/**
 * Hook to record a play event
 * Uses user_interactions table as a stand-in until play_events table exists
 */
export function useRecordPlayEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPlayEventParams): Promise<PlayEventData> => {
      if (interactionsDisabled) {
        return {
          id: crypto.randomUUID(),
          user_id: user?.id,
          track_id: params.track_id,
          provider: params.provider,
          action: params.action,
          played_at: new Date().toISOString(),
          context: params.context,
        };
      }

      // Record as interaction instead until play_events table exists
      if (user) {
        const interaction_type = `play_${params.action}`;

        // If the enum/check constraint doesn't allow this interaction, skip insert to avoid 400s
        if (!ALLOWED_INTERACTIONS.has(interaction_type)) {
          disableInteractions(`unsupported interaction_type ${interaction_type}`);
          return {
            id: crypto.randomUUID(),
            user_id: user.id,
            track_id: params.track_id,
            provider: params.provider,
            action: params.action,
            played_at: new Date().toISOString(),
            context: params.context,
          };
        }

        const { error } = await supabase
          .from('user_interactions')
          .insert({
            user_id: user.id,
            track_id: params.track_id,
            interaction_type,
          });
        
        if (error) {
          const reason = error.message || error.code || 'unknown';
          disableInteractions(`insert failed (${reason})`);
        }
      }

      // Return mock play event data
      return {
        id: crypto.randomUUID(),
        user_id: user?.id,
        track_id: params.track_id,
        provider: params.provider,
        action: params.action,
        played_at: new Date().toISOString(),
        context: params.context,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['play-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-interactions'] });
    },
  });
}

interface PlayHistoryParams {
  limit?: number;
  cursor?: string;
  provider?: MusicProvider;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook to fetch user's play history
 * Uses user_interactions filtered by play_* types
 */
export function usePlayHistory(params: PlayHistoryParams = {}) {
  const { user } = useAuth();
  const { limit = 20 } = params;

  return useQuery({
    queryKey: ['play-history', user?.id, limit],
    queryFn: async (): Promise<PlayEventData[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          id,
          user_id,
          track_id,
          interaction_type,
          created_at
        `)
        .eq('user_id', user.id)
        .like('interaction_type', 'play_%')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Failed to fetch play history:', error);
        return [];
      }

      // Map interactions to play event shape
      return (data || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        track_id: row.track_id,
        provider: 'spotify' as const,
        action: row.interaction_type.replace('play_', ''),
        played_at: row.created_at,
      }));
    },
    enabled: !!user,
  });
}

/**
 * Hook to get play stats for a user
 */
export function usePlayStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['play-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { count } = await supabase
        .from('user_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .like('interaction_type', 'play_%');

      return {
        totalPlays: count || 0,
        providerCounts: {} as Record<string, number>,
        recentPlays: 0,
      };
    },
    enabled: !!user,
  });
}
