/**
 * Play Events API
 * Simple wrapper for recording play events without requiring React hooks
 */

import { supabase } from '@/integrations/supabase/client';
import { MusicProvider } from '@/types';

type PlayAction = 'open_app' | 'open_web' | 'preview';

interface RecordPlayEventParams {
  track_id: string;
  provider: MusicProvider;
  action: PlayAction;
  context?: string;
  device?: string;
  metadata?: Record<string, unknown>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let playEventsDisabled = false;
let playEventsDisabledReason: string | null = null;
let playEventsWarned = false;

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
 * Record a play event (non-hook version for use outside React components)
 */
export async function recordPlayEvent(params: RecordPlayEventParams): Promise<void> {
  if (playEventsDisabled) return;

  // Only write play events for canonical DB tracks (UUID ids). Seed tracks use non-UUID ids.
  if (!UUID_RE.test(params.track_id)) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('play_events').insert({
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
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'exception during insert';
    disablePlayEvents(`exception: ${reason}`);
  }
}
