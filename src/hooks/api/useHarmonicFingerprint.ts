/**
 * Harmonic Fingerprint Hook
 *
 * Read-only hook for fetching the latest harmonic fingerprint for a track.
 * This is intentionally NOT the same as `useHarmonicAnalysis`:
 * - No realtime subscriptions
 * - No job triggering / side-effects
 * - Safe to use in high-frequency UI like the universal player
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HarmonicFingerprint } from '@/types/harmony';

async function fetchLatestFingerprint(trackId: string): Promise<HarmonicFingerprint | null> {
  const { data, error } = await supabase
    .from('harmonic_fingerprints')
    .select('*')
    .eq('track_id', trackId)
    .order('analysis_timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.debug('[useHarmonicFingerprint] Query error:', error.message);
    return null;
  }

  return (data?.[0] as HarmonicFingerprint | undefined) ?? null;
}

export function useHarmonicFingerprint(trackId: string | undefined) {
  return useQuery({
    queryKey: ['harmonic-fingerprint', trackId],
    queryFn: () => fetchLatestFingerprint(trackId!),
    enabled: !!trackId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

