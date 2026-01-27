/**
 * useHarmonicAnalysis Hook
 * 
 * React hook for harmonic analysis job status and triggering.
 * Features:
 * - Subscribe to job status via Supabase realtime
 * - Reflect analyzing / provisional / high-confidence states
 * - Support reanalysis trigger
 * - Handle failures gracefully
 * - No polling abuse (uses realtime subscriptions)
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getHarmonicAnalysis,
  getJobStatus,
  queueAnalysis,
  isHighQuality,
} from '@/services/harmonicAnalysis';
import type { AnalysisResult, AnalysisJob, HarmonicFingerprint } from '@/types/harmony';

interface UseHarmonicAnalysisOptions {
  trackId: string;
  audioHash?: string;
  isrc?: string;
  enabled?: boolean; // Auto-fetch on mount
}

interface UseHarmonicAnalysisReturn {
  // Data
  fingerprint: HarmonicFingerprint | null;
  confidence: number;
  isProvisional: boolean;
  isHighQuality: boolean;
  
  // Job status
  job: AnalysisJob | null;
  isAnalyzing: boolean;
  progress: number; // 0-1
  
  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Actions
  triggerAnalysis: (forceReanalysis?: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useHarmonicAnalysis(
  options: UseHarmonicAnalysisOptions
): UseHarmonicAnalysisReturn {
  const { trackId, audioHash, isrc, enabled = true } = options;

  // State
  const [fingerprint, setFingerprint] = useState<HarmonicFingerprint | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Derived states
  const isProvisional = fingerprint?.is_provisional ?? true;
  const isAnalyzing = job?.status === 'queued' || job?.status === 'processing';
  const progress = job?.progress ?? (fingerprint ? 1.0 : 0.0);
  const fingerprintIsHighQuality = fingerprint ? isHighQuality(fingerprint) : false;

  // Fetch analysis result
  const fetchAnalysis = useCallback(
    async (forceReanalysis = false) => {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const result = await getHarmonicAnalysis(trackId, {
          forceReanalysis,
          audioHash,
          isrc,
        });

        if (result) {
          setFingerprint(result.fingerprint);
          setConfidence(result.confidence.overall);

          // If analysis was queued, we might have a provisional result
          if (result.fingerprint.is_provisional) {
            // Check for active job
            const { data: jobs } = await supabase
              .from('analysis_jobs')
              .select('*')
              .eq('track_id', trackId)
              .in('status', ['queued', 'processing'])
              .order('started_at', { ascending: false })
              .limit(1);

            if (jobs && jobs.length > 0) {
              setJob(jobs[0] as AnalysisJob);
            }
          }
        } else {
          setError(new Error('No analysis result available'));
          setIsError(true);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Analysis failed');
        setError(error);
        setIsError(true);
        console.error('[useHarmonicAnalysis] Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [trackId, audioHash, isrc]
  );

  // Trigger new analysis
  const triggerAnalysis = useCallback(
    async (forceReanalysis = false) => {
      try {
        setIsLoading(true);
        setIsError(false);

        const newJob = await queueAnalysis({
          track_id: trackId,
          priority: 'normal',
          audio_hash: audioHash,
          isrc,
        });

        setJob(newJob);

        // Optimistically set provisional result
        setFingerprint({
          track_id: trackId,
          tonal_center: { root_interval: 0, mode: 'major', stability_score: 0 },
          roman_progression: [],
          loop_length_bars: 4,
          cadence_type: 'none',
          confidence_score: 0,
          analysis_timestamp: new Date().toISOString(),
          analysis_version: '1.0.0',
          is_provisional: true,
          detected_mode: 'major',
        });
        setConfidence(0);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to trigger analysis');
        setError(error);
        setIsError(true);
        console.error('[useHarmonicAnalysis] Trigger error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [trackId, audioHash, isrc]
  );

  // Subscribe to job updates (Supabase Realtime)
  useEffect(() => {
    if (!job?.id) return;

    console.log('[useHarmonicAnalysis] Subscribing to job:', job.id);

    const channel = supabase
      .channel(`analysis_job_${job.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          console.log('[useHarmonicAnalysis] Job update:', payload.new);
          const updatedJob = payload.new as AnalysisJob;
          setJob(updatedJob);

          // If completed, fetch final result
          if (updatedJob.status === 'completed' && updatedJob.result) {
            setFingerprint(updatedJob.result as HarmonicFingerprint);
            setConfidence(updatedJob.result.confidence_score);
          }

          // Cached reuse path still delivers a result
          if (updatedJob.status === 'cached' && updatedJob.result) {
            setFingerprint(updatedJob.result as HarmonicFingerprint);
            setConfidence(updatedJob.result.confidence_score);
          }

          // If failed, set error
          if (updatedJob.status === 'failed') {
            setError(new Error(updatedJob.error_message || 'Analysis failed'));
            setIsError(true);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[useHarmonicAnalysis] Unsubscribing from job:', job.id);
      supabase.removeChannel(channel);
    };
  }, [job?.id]);

  // Subscribe to fingerprint updates
  useEffect(() => {
    if (!trackId) return;

    console.log('[useHarmonicAnalysis] Subscribing to fingerprint:', trackId);

    const channel = supabase
      .channel(`harmonic_fingerprint_${trackId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT or UPDATE
          schema: 'public',
          table: 'harmonic_fingerprints',
          filter: `track_id=eq.${trackId}`,
        },
        (payload) => {
          console.log('[useHarmonicAnalysis] Fingerprint update:', payload.new);
          const updatedFingerprint = payload.new as HarmonicFingerprint;
          setFingerprint(updatedFingerprint);
          setConfidence(updatedFingerprint.confidence_score);
        }
      )
      .subscribe();

    return () => {
      console.log('[useHarmonicAnalysis] Unsubscribing from fingerprint:', trackId);
      supabase.removeChannel(channel);
    };
  }, [trackId]);

  // Auto-fetch on mount
  useEffect(() => {
    if (enabled && trackId) {
      fetchAnalysis();
    }
  }, [enabled, trackId, fetchAnalysis]);

  return {
    // Data
    fingerprint,
    confidence,
    isProvisional,
    isHighQuality: fingerprintIsHighQuality,

    // Job status
    job,
    isAnalyzing,
    progress,

    // Loading states
    isLoading,
    isError,
    error,

    // Actions
    triggerAnalysis,
    refetch: fetchAnalysis,
  };
}
