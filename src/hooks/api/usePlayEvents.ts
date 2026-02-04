/**
 * React hooks for play events tracking
 * 
 * Uses the `play_events` table (see Supabase migrations).
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let playEventsDisabled = false;
let playEventsWarned = false;
let playEventsDisabledReason: string | null = null;

function shouldDisablePlayEvents(error: any): boolean {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '');
  return code.startsWith('PGRST') || message.includes('Supabase is not configured') || message.includes('supabaseUrl is required');
}

function disablePlayEvents(reason: string) {
  playEventsDisabled = true;
  playEventsDisabledReason = reason;
  if (!playEventsWarned) {
    console.warn('[PlayEvents] disabled play_events inserts:', reason);
    playEventsWarned = true;
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
      if (playEventsDisabled) {
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

      // Only write play events for canonical DB tracks (UUID ids). Seed tracks use non-UUID ids.
      if (!UUID_RE.test(params.track_id)) {
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

      // Insert play event (user_id may be null for anonymous/guest sessions)
      const { error } = await supabase
        .from('play_events')
        .insert({
          user_id: user?.id ?? null,
          track_id: params.track_id,
          provider: params.provider,
          action: params.action,
          context: params.context ?? null,
          device: params.device ?? null,
          metadata: params.metadata ?? {},
        } as any);

      if (error) {
        const reason = error.message || error.code || 'unknown';
        if (shouldDisablePlayEvents(error)) {
          disablePlayEvents(`insert failed (${reason})`);
        } else {
          console.warn('[PlayEvents] insert failed:', reason);
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
      queryClient.invalidateQueries({ queryKey: ['play-stats'] });
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
        .from('play_events')
        .select(`
          id,
          user_id,
          track_id,
          provider,
          action,
          played_at,
          context
        `)
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Failed to fetch play history:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        track_id: row.track_id,
        provider: row.provider,
        action: row.action,
        played_at: row.played_at,
        context: row.context ?? undefined,
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
        .from('play_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return {
        totalPlays: count || 0,
        providerCounts: {} as Record<string, number>,
        recentPlays: 0,
      };
    },
    enabled: !!user,
  });
}
