/**
 * Harmonic Analysis Service
 * 
 * Hybrid pipeline: check cache → run analysis → store result
 * Cost-efficient, async, non-blocking for UI.
 * 
 * ARCHITECTURE:
 * 1. Check harmony database first (O(1) lookup)
 * 2. If not found, queue async analysis job
 * 3. Return provisional data immediately for UI
 * 4. Update with final result when ready
 * 
 * TODO: Integrate actual audio analysis ML model
 * TODO: Add Supabase Edge Function for background processing
 */

import type {
  AnalysisRequest,
  AnalysisJob,
  AnalysisResult,
  AnalysisStatus,
  HarmonicFingerprint,
  RomanChord,
  AnalysisConfidence,
  RelativeTonalCenter,
} from '@/types/harmony';
import type { Track } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { analyzeAudioTrack } from './audioAnalysis';

type AnalysisJobRequest = AnalysisRequest & {
  audio_hash?: string;
  isrc?: string;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANALYSIS_CONFIG = {
  // Confidence thresholds
  MIN_CONFIDENCE_FOR_DISPLAY: 0.5,
  HIGH_CONFIDENCE_THRESHOLD: 0.7,
  
  // Cache settings
  CACHE_TTL_DAYS: 90,
  REANALYSIS_THRESHOLD_DAYS: 365,
  
  // Processing limits
  MAX_CONCURRENT_JOBS: 5,
  JOB_TIMEOUT_MS: 30000,
  
  // Analysis versions
  CURRENT_MODEL_VERSION: '1.0.0',
} as const;
export { ANALYSIS_CONFIG };

const TTL_MS = ANALYSIS_CONFIG.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
const REANALYZE_MS = ANALYSIS_CONFIG.REANALYSIS_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

const withinWindow = (timestamp: string, windowMs: number) => {
  const age = Date.now() - new Date(timestamp).getTime();
  return age >= 0 && age <= windowMs;
};

const computeReuseWindows = (baseDate = Date.now()) => {
  const reuseUntil = new Date(baseDate + TTL_MS).toISOString();
  const reanalyzeAfter = new Date(baseDate + REANALYZE_MS).toISOString();
  return { reuse_until: reuseUntil, reanalyze_after: reanalyzeAfter };
};

// ============================================================================
// MAIN ANALYSIS API
// ============================================================================

/**
 * Get harmonic analysis for a track
 * Returns cached data if available, otherwise queues analysis
 */
export async function getHarmonicAnalysis(
  trackId: string,
  options: { forceReanalysis?: boolean; audioHash?: string; isrc?: string } = {}
): Promise<AnalysisResult | null> {
  try {
    const { forceReanalysis, audioHash, isrc } = options;

    // Step 1: Check cache
    if (!forceReanalysis) {
      const cached = await checkHarmonyCache({ trackId, audioHash, isrc });
      if (cached) {
        return {
          fingerprint: cached,
          confidence: extractConfidence(cached),
          method: 'cached',
          processing_time_ms: 0,
        };
      }
    }

    // Step 2: Check if analysis job already running
    const existingJob = await getActiveJob({ trackId, audioHash, isrc });
    if (existingJob) {
      return await waitForJob(existingJob.id);
    }

    // Step 3: Queue new analysis
    const job = await queueAnalysis({
      track_id: trackId,
      priority: 'normal',
      audio_hash: audioHash,
      isrc,
    });

    // Step 4: Return provisional data immediately (don't block UI)
    return {
      fingerprint: createProvisionalFingerprint(trackId),
      confidence: {
        overall: 0.0,
        key_detection: 0.0,
        chord_detection: 0.0,
        structure_detection: 0.0,
        tempo_detection: 0.0,
      },
      method: 'ml_audio',
      processing_time_ms: 0,
    };
  } catch (error) {
    console.error('[HarmonicAnalysis] Error:', error);
    return null;
  }
}

/**
 * Queue analysis job (runs in background)
 * Implements idempotency check before inserting
 */
export async function queueAnalysis(request: AnalysisJobRequest): Promise<AnalysisJob> {
  // Double-check for existing active job (race condition prevention)
  const existingJob = await getActiveJob({
    trackId: request.track_id,
    audioHash: request.audio_hash,
    isrc: request.isrc,
  });

  if (existingJob) {
    console.log('[AnalysisJob] Reusing existing job:', existingJob.id);
    return existingJob;
  }

  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const job: AnalysisJob = {
    id: jobId,
    track_id: request.track_id,
    status: 'queued',
    progress: 0.0,
    started_at: now,
  };

  const jobPayload = {
    ...job,
    analysis_version: ANALYSIS_CONFIG.CURRENT_MODEL_VERSION,
    audio_hash: request.audio_hash ?? null,
    isrc: request.isrc ?? null,
  };

  const { error } = await supabase.from('analysis_jobs').insert(jobPayload);
  if (error) {
    console.error('[AnalysisJob] Queue insert error:', error.message);
    throw new Error(`Failed to queue analysis: ${error.message}`);
  }

  console.log('[AnalysisJob] Queued new job:', {
    job_id: jobId,
    track_id: request.track_id,
    has_audio_hash: !!request.audio_hash,
    has_isrc: !!request.isrc,
  });

  // Trigger Edge Function for async processing
  supabase.functions
    .invoke('harmonic-analysis', {
      body: {
        track_id: request.track_id,
        audio_hash: request.audio_hash,
        isrc: request.isrc,
        priority: request.priority ?? 'normal',
        job_id: jobId,
      },
    })
    .then(({ data, error }) => {
      if (error) {
        console.error('[AnalysisJob] Edge Function error:', error);
      } else {
        console.log('[AnalysisJob] Edge Function result:', data);
      }
    })
    .catch(err => {
      console.error('[AnalysisJob] Edge Function invocation failed:', err);
      // Fallback to local processing if Edge Function unavailable
      setTimeout(() => {
        runAnalysisJob(job, request).catch(err => {
          console.error('[AnalysisJob] Async execution error:', err);
        });
      }, 100);
    });

  return job;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<AnalysisJob | null> {
  const { data, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', jobId)
    .limit(1);

  if (error) {
    console.error('[AnalysisJob] Status lookup error:', error.message);
    return null;
  }

  const row = data?.[0];
  return (row as AnalysisJob | undefined) ?? null;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Check harmony cache (database lookup)
 * Implements idempotency: audio_hash > isrc > track_id priority
 * Uses database-generated reuse_until and reanalyze_after columns
 */
async function checkHarmonyCache(params: {
  trackId: string;
  audioHash?: string;
  isrc?: string;
}): Promise<HarmonicFingerprint | null> {
  const { trackId, audioHash, isrc } = params;
  const now = new Date();

  // Priority order for deduplication:
  // 1. audio_hash (exact audio match, most reliable)
  // 2. isrc (recording identifier, reliable for same master)
  // 3. track_id (fallback, least reliable for duplicates)
  
  const lookup = async (column: 'audio_hash' | 'isrc' | 'track_id', value: string) => {
    const { data, error } = await supabase
      .from('harmonic_fingerprints')
      .select('*')
      .eq(column, value)
      .gte('reuse_until', now.toISOString()) // Still within reuse window
      .order('analysis_timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[HarmonyCache] Lookup error:', error.message);
      return null;
    }

    return (data?.[0] as HarmonicFingerprint | undefined) ?? null;
  };

  // Check in priority order
  const candidates: (HarmonicFingerprint | null)[] = [];
  
  if (audioHash) {
    const result = await lookup('audio_hash', audioHash);
    if (result) candidates.push(result);
  }
  
  if (isrc && candidates.length === 0) {
    const result = await lookup('isrc', isrc);
    if (result) candidates.push(result);
  }
  
  if (candidates.length === 0) {
    const result = await lookup('track_id', trackId);
    if (result) candidates.push(result);
  }

  // Return first valid candidate
  for (const cached of candidates) {
    if (!cached) continue;

    // Check if still within reanalysis window (generated column handles TTL)
    const reanalyzeAfter = cached.reanalyze_after 
      ? new Date(cached.reanalyze_after) 
      : null;

    if (reanalyzeAfter && now > reanalyzeAfter) {
      console.log('[HarmonyCache] Fingerprint eligible for reanalysis:', cached.track_id);
      continue; // Treat as cache miss to trigger fresh analysis
    }

    // Valid cached result
    console.log('[HarmonyCache] Cache hit:', {
      track_id: cached.track_id,
      method: audioHash ? 'audio_hash' : isrc ? 'isrc' : 'track_id',
      confidence: cached.confidence_score,
      age_days: Math.floor((now.getTime() - new Date(cached.analysis_timestamp).getTime()) / (24 * 60 * 60 * 1000))
    });

    return cached;
  }

  console.log('[HarmonyCache] Cache miss for track:', trackId);
  return null;
}

/**
 * Store analysis result in cache
 * Implements idempotent upserts with proper conflict resolution
 */
async function storeInCache(
  fingerprint: HarmonicFingerprint & Partial<{ audio_hash: string | null; isrc: string | null }>
): Promise<void> {
  try {
    // Determine conflict resolution strategy based on available identifiers
    // Priority: audio_hash (most specific) > isrc > track_id (least specific)
    let onConflict: string;
    
    if (fingerprint.audio_hash) {
      onConflict = 'audio_hash';
    } else if (fingerprint.isrc) {
      onConflict = 'isrc';
    } else {
      onConflict = 'track_id';
    }

    const payload = {
      ...fingerprint,
      is_provisional: false,
      ...computeReuseWindows(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('harmonic_fingerprints')
      .upsert(payload, { 
        onConflict,
        // Update all fields on conflict (newer analysis overwrites)
      });

    if (error) {
      throw new Error(error.message);
    }

    console.log('[HarmonyCache] Stored fingerprint:', {
      track_id: fingerprint.track_id,
      conflict_key: onConflict,
      confidence: fingerprint.confidence_score,
      provisional: fingerprint.is_provisional,
    });
  } catch (error) {
    console.error('[HarmonyCache] Storage error:', error);
    throw error; // Re-throw to handle upstream
  }
}

// ============================================================================
// ANALYSIS EXECUTION
// ============================================================================

/**
 * Run actual audio analysis (ML model)
 * Orchestrates the analysis pipeline and updates job status
 */
async function runAnalysisJob(job: AnalysisJob, request?: AnalysisJobRequest): Promise<AnalysisResult> {
  const startTime = Date.now();
  const touch = async (patch: Record<string, unknown>) => {
    const { error } = await supabase
      .from('analysis_jobs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', job.id);

    if (error) {
      console.error('[AnalysisJob] Update error:', error.message);
    }
  };
  
  try {
    // Update status
    job.status = 'processing';
    job.progress = 0.1;
    await touch({ status: job.status, progress: job.progress });

    // Run ML analysis pipeline
    console.log('[AnalysisJob] Starting ML pipeline for:', job.track_id);
    
    const fingerprint = await analyzeAudioTrack({
      track_id: job.track_id,
      audio_hash: request?.audio_hash,
      isrc: request?.isrc,
      // TODO: Pass actual audio_url when available
      // audio_url: track.audio_preview_url,
    });

    job.progress = 0.9;
    await touch({ progress: job.progress });

    // Add identifiers from request
    const fingerprintToStore = {
      ...fingerprint,
      audio_hash: request?.audio_hash ?? null,
      isrc: request?.isrc ?? null,
    };
    
    // Store result
    await storeInCache(fingerprintToStore);
    
    job.status = 'completed';
    job.progress = 1.0;
    job.completed_at = new Date().toISOString();
    job.result = fingerprintToStore;

    await touch({
      status: job.status,
      progress: job.progress,
      completed_at: job.completed_at,
      result: fingerprintToStore,
    });

    console.log('[AnalysisJob] Completed analysis:', {
      job_id: job.id,
      track_id: job.track_id,
      confidence: fingerprint.confidence_score,
      progression_length: fingerprint.roman_progression.length,
    });

    return {
      fingerprint: fingerprintToStore,
      confidence: extractConfidence(fingerprintToStore),
      method: 'ml_audio',
      processing_time_ms: Date.now() - startTime,
    };
  } catch (error) {
    job.status = 'failed';
    job.error_message = error instanceof Error ? error.message : 'Unknown error';
    await touch({ status: job.status, error_message: job.error_message });
    
    console.error('[AnalysisJob] Analysis failed:', {
      job_id: job.id,
      track_id: job.track_id,
      error: job.error_message,
    });
    
    throw error;
  }
}

/**
 * Create provisional fingerprint (instant response)
 */
function createProvisionalFingerprint(trackId: string): HarmonicFingerprint {
  return {
    track_id: trackId,
    tonal_center: {
      root_interval: 0,
      mode: 'major',
      stability_score: 0.0,
    },
    roman_progression: [],
    loop_length_bars: 4,
    cadence_type: 'none',
    confidence_score: 0.0,
    analysis_timestamp: new Date().toISOString(),
    analysis_version: ANALYSIS_CONFIG.CURRENT_MODEL_VERSION,
    is_provisional: true,
    ...computeReuseWindows(), // provisional reuse window prevents hammering
    detected_key: undefined,
    detected_mode: 'major',
  };
}

// ============================================================================
// JOB MANAGEMENT
// ============================================================================

/**
 * Get active job for track (if any)
 * Implements deduplication to prevent redundant analysis jobs
 */
async function getActiveJob(params: {
  trackId: string;
  audioHash?: string;
  isrc?: string;
}): Promise<AnalysisJob | null> {
  const { trackId, audioHash, isrc } = params;

  const search = async (column: 'audio_hash' | 'isrc' | 'track_id', value: string) => {
    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq(column, value)
      .in('status', ['queued', 'processing'])
      .order('started_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[AnalysisJob] Active lookup error:', error.message);
      return null;
    }

    return (data?.[0] as AnalysisJob | undefined) ?? null;
  };

  // Check in priority order (same as cache lookup)
  if (audioHash) {
    const job = await search('audio_hash', audioHash);
    if (job) {
      console.log('[AnalysisJob] Found active job by audio_hash:', job.id);
      return job;
    }
  }

  if (isrc) {
    const job = await search('isrc', isrc);
    if (job) {
      console.log('[AnalysisJob] Found active job by isrc:', job.id);
      return job;
    }
  }

  const job = await search('track_id', trackId);
  if (job) {
    console.log('[AnalysisJob] Found active job by track_id:', job.id);
  }

  return job ?? null;
}

/**
 * Wait for job completion (with timeout)
 */
async function waitForJob(jobId: string): Promise<AnalysisResult | null> {
  const timeout = ANALYSIS_CONFIG.JOB_TIMEOUT_MS;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const job = await getJobStatus(jobId);
    
    if (!job) return null;
    
    if (job.status === 'completed' && job.result) {
      return {
        fingerprint: job.result,
        confidence: extractConfidence(job.result),
        method: 'ml_audio',
        processing_time_ms: 0,
      };
    }

    if (job.status === 'cached' && job.result) {
      return {
        fingerprint: job.result,
        confidence: extractConfidence(job.result),
        method: 'cached',
        processing_time_ms: 0,
      };
    }
    
    if (job.status === 'failed') {
      throw new Error(job.error_message || 'Analysis failed');
    }
    
    // Wait 500ms before polling again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Analysis timeout');
}

/**
 * Extract confidence breakdown from fingerprint
 */
function extractConfidence(fingerprint: HarmonicFingerprint): AnalysisConfidence {
  const base = fingerprint.confidence_score;
  return {
    overall: base,
    key_detection: base * 1.05,
    chord_detection: base * 0.95,
    structure_detection: base * 1.02,
    tempo_detection: base * 0.98,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if fingerprint is high quality
 */
export function isHighQuality(fingerprint: HarmonicFingerprint): boolean {
  return (
    fingerprint.confidence_score >= ANALYSIS_CONFIG.HIGH_CONFIDENCE_THRESHOLD &&
    !fingerprint.is_provisional &&
    fingerprint.roman_progression.length > 0
  );
}

/**
 * Format progression as string (for display)
 */
export function formatProgression(chords: RomanChord[]): string {
  return chords.map(c => c.numeral).join(' → ');
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 0.9) return 'Very High';
  if (score >= 0.7) return 'High';
  if (score >= 0.5) return 'Medium';
  if (score >= 0.3) return 'Low';
  return 'Very Low';
}
