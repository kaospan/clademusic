/**
 * Harmonic Fingerprint API Hook
 *
 * Lightweight read hook for the `harmonic_fingerprints` table.
 * Used by the embedded player to enrich UI with detected key/mode/progression.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HarmonicFingerprint } from '@/types/harmony';

async function getHarmonicFingerprint(trackId: string): Promise<HarmonicFingerprint | null> {
  const { data, error } = await supabase
    .from('harmonic_fingerprints')
    .select('*')
    .eq('track_id', trackId)
    .order('analysis_timestamp', { ascending: false })
    .limit(1);

  if (error) {
    // Table might not exist yet in some environments (migration not applied).
    console.debug('harmonic_fingerprints not available yet:', error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : null;
  return (row as unknown as HarmonicFingerprint | null) ?? null;
}

export function useHarmonicFingerprint(trackId: string | undefined) {
  return useQuery({
    queryKey: ['harmonic-fingerprint', trackId],
    queryFn: () => getHarmonicFingerprint(trackId!),
    enabled: !!trackId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: false,
  });
}

