/**
 * Play Events API
 * Simple wrapper for recording play events without requiring React hooks
 */

import { supabase } from '@/integrations/supabase/client';
import { MusicProvider } from '@/types';

type PlayAction = 'open_app' | 'open_web' | 'preview';

interface RecordPlayEventParams {
  /** Canonical key: UUID or provider synthetic id like `spotify:<id>` */
  track_id: string;
  provider: MusicProvider;
  action: PlayAction;
  provider_track_id?: string | null;
  context?: string;
  device?: string;
  metadata?: Record<string, unknown>;
}

type PlaybackEventType = 'intent' | 'link_out' | 'state' | 'qualified_play' | 'error';

const ANON_ID_KEY = 'clade_anonymous_id_v1';

function getOrCreateAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing && existing.length > 10) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, next);
    return next;
  } catch {
    // Fallback for restricted storage environments.
    return crypto.randomUUID();
  }
}

let currentSessionKey: string | null = null;
let currentSessionId: string | null = null;

function getSessionIdFor(params: {
  userId: string | null;
  anonymousId: string;
  provider: MusicProvider;
  providerTrackId?: string | null;
  canonicalTrackKey: string;
}): string {
  const key = [
    params.userId ?? `anon:${params.anonymousId}`,
    params.provider,
    params.providerTrackId ?? '',
    params.canonicalTrackKey,
  ].join('|');

  if (currentSessionKey !== key) {
    currentSessionKey = key;
    currentSessionId = crypto.randomUUID();
  }

  return currentSessionId!;
}

/**
 * Record a play event (non-hook version for use outside React components)
 */
export async function recordPlayEvent(params: RecordPlayEventParams): Promise<void> {
  try {
    const anonymousId = getOrCreateAnonymousId();
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const eventType: PlaybackEventType =
      params.action === 'preview'
        ? 'intent'
        : params.action === 'open_app' || params.action === 'open_web'
          ? 'link_out'
          : 'intent';

    const sessionId = getSessionIdFor({
      userId,
      anonymousId,
      provider: params.provider,
      providerTrackId: params.provider_track_id ?? null,
      canonicalTrackKey: params.track_id,
    });

    const { error } = await supabase.from('playback_events').insert({
      user_id: userId,
      anonymous_id: userId ? null : anonymousId,
      session_id: sessionId,
      event_type: eventType,
      provider: params.provider,
      provider_track_id: params.provider_track_id ?? null,
      canonical_track_key: params.track_id,
      context: params.context ?? null,
      properties: params.metadata ?? {},
    });

    if (error) {
      // Avoid throwing in the UI path; log for diagnostics.
      console.warn('[PlayEvents] insert failed:', error.message || error.code || error);
    }
  } catch (error) {
    console.warn('[PlayEvents] exception:', error);
  }
}
