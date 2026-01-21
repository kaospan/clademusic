/**
 * Harmonic Analysis Types
 * 
 * Core data structures for music theory analysis.
 * All harmonic data is stored relative (Roman numerals), never absolute.
 */

// ============================================================================
// CORE HARMONIC TYPES
// ============================================================================

/**
 * Relative harmonic structure (theory-first approach)
 * This is the PRIMARY representation stored in the database.
 */
export interface HarmonicFingerprint {
  // Core identity
  track_id: string;
  
  // Relative harmonic data (NEVER absolute chords)
  tonal_center: RelativeTonalCenter;
  roman_progression: RomanChord[];
  loop_length_bars: number;
  cadence_type: CadenceType;
  modal_color?: ModalColor;
  borrowed_chords?: BorrowedChord[];
  
  // Section-aware progressions
  section_progressions?: SectionProgression[];
  
  // Analysis metadata
  confidence_score: number; // 0.0 - 1.0
  analysis_timestamp: string; // ISO timestamp
  analysis_version: string; // e.g., "1.2.0" for model versioning
  is_provisional: boolean; // True if confidence < threshold
  
  // Derived display data (computed from relative data)
  detected_key?: string; // e.g., "C" - for UI display only
  detected_mode?: 'major' | 'minor' | 'dorian' | 'mixolydian' | 'phrygian' | 'lydian' | 'locrian';
}

/**
 * Relative tonal center (intervallic, not absolute)
 */
export interface RelativeTonalCenter {
  root_interval: number; // 0-11 semitones from reference
  mode: Mode;
  stability_score: number; // 0.0 - 1.0
}

/**
 * Roman numeral chord with quality
 */
export interface RomanChord {
  numeral: string; // e.g., "I", "iv", "V7", "bVI"
  quality: ChordQuality;
  duration_beats?: number; // Rhythmic weight
  timing_ms?: number; // Absolute position in track
  inversions?: number; // 0 = root position, 1 = first inversion, etc.
}

/**
 * Chord quality (independent of root)
 */
export type ChordQuality = 
  | 'major' 
  | 'minor' 
  | 'diminished' 
  | 'augmented' 
  | 'dominant7' 
  | 'major7' 
  | 'minor7' 
  | 'diminished7' 
  | 'half-diminished7'
  | 'sus2'
  | 'sus4'
  | 'add9'
  | 'other';

/**
 * Modal color (flavors beyond major/minor)
 */
export type ModalColor = 
  | 'dorian' 
  | 'phrygian' 
  | 'lydian' 
  | 'mixolydian' 
  | 'aeolian' 
  | 'locrian';

/**
 * Music mode
 */
export type Mode = 'major' | 'minor' | ModalColor;

/**
 * Cadence types (how progressions resolve)
 */
export type CadenceType = 
  | 'authentic' // V → I (strong resolution)
  | 'plagal' // IV → I (amen cadence)
  | 'deceptive' // V → vi (fake-out)
  | 'half' // ends on V (unresolved)
  | 'loop' // circular, no resolution
  | 'modal' // non-functional harmony
  | 'none';

/**
 * Borrowed chord (from parallel mode)
 */
export interface BorrowedChord {
  chord: RomanChord;
  borrowed_from: Mode;
  position_in_progression: number;
}

/**
 * Section-specific progression
 */
export interface SectionProgression {
  section_label: string; // e.g., "verse", "chorus"
  progression: RomanChord[];
  repeat_count: number;
  variations?: RomanChord[][]; // Alternate endings, etc.
}

// ============================================================================
// ANALYSIS PIPELINE TYPES
// ============================================================================

/**
 * Analysis request (input to pipeline)
 */
export interface AnalysisRequest {
  track_id: string;
  audio_url?: string; // URL to audio file for analysis
  metadata?: Partial<Track>; // Pre-existing metadata
  force_reanalysis?: boolean; // Skip cache
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Analysis job status
 */
export interface AnalysisJob {
  id: string;
  track_id: string;
  status: AnalysisStatus;
  progress: number; // 0.0 - 1.0
  started_at: string;
  completed_at?: string;
  error_message?: string;
  result?: HarmonicFingerprint;
}

export type AnalysisStatus = 
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cached';

/**
 * Analysis confidence breakdown
 */
export interface AnalysisConfidence {
  overall: number; // 0.0 - 1.0
  key_detection: number;
  chord_detection: number;
  structure_detection: number;
  tempo_detection: number;
}

/**
 * Analysis result with provenance
 */
export interface AnalysisResult {
  fingerprint: HarmonicFingerprint;
  confidence: AnalysisConfidence;
  method: AnalysisMethod;
  processing_time_ms: number;
  audio_features?: AudioFeatures;
}

export type AnalysisMethod = 
  | 'cached' // Retrieved from database
  | 'metadata' // From provider metadata
  | 'ml_audio' // Machine learning audio analysis
  | 'crowd_sourced' // User-submitted corrections
  | 'hybrid'; // Multiple methods combined

/**
 * Audio features (supplementary data)
 */
export interface AudioFeatures {
  tempo_bpm: number;
  energy: number; // 0.0 - 1.0
  danceability: number; // 0.0 - 1.0
  valence: number; // 0.0 - 1.0 (happiness)
  acousticness: number; // 0.0 - 1.0
  instrumentalness: number; // 0.0 - 1.0
  loudness_db: number;
  spectral_centroid?: number; // Brightness
  zero_crossing_rate?: number; // Noisiness
}

// ============================================================================
// SIMILARITY & CLUSTERING TYPES
// ============================================================================

/**
 * Similarity query (find tracks like this one)
 */
export interface SimilarityQuery {
  reference_track_id: string;
  max_results?: number; // Default 20
  filters?: SimilarityFilters;
  weights?: SimilarityWeights;
}

/**
 * Similarity filters
 */
export interface SimilarityFilters {
  min_confidence?: number; // Only include high-confidence results
  same_mode_only?: boolean; // major/minor constraint
  tempo_range?: [number, number]; // BPM range
  exclude_track_ids?: string[]; // Blacklist
}

/**
 * Similarity weights (how much each factor matters)
 */
export interface SimilarityWeights {
  progression_shape: number; // Default 0.5
  cadence_type: number; // Default 0.2
  loop_length: number; // Default 0.15
  modal_color: number; // Default 0.1
  tempo: number; // Default 0.05
}

/**
 * Similarity result
 */
export interface SimilarityResult {
  track_id: string;
  similarity_score: number; // 0.0 - 1.0
  matching_features: string[]; // e.g., ["progression_shape", "cadence_type"]
  explanation?: string; // Human-readable why it's similar
}

/**
 * Harmonic cluster (group of similar tracks)
 */
export interface HarmonicCluster {
  id: string;
  name?: string; // e.g., "I-V-vi-IV variations"
  prototype_progression: RomanChord[];
  member_track_ids: string[];
  avg_confidence: number;
  created_at: string;
}

// ============================================================================
// HELPERS & UTILITIES
// ============================================================================

/**
 * Check if harmonic data meets quality threshold
 */
export function isHighConfidence(fingerprint: HarmonicFingerprint): boolean {
  return fingerprint.confidence_score >= 0.7 && !fingerprint.is_provisional;
}

/**
 * Get display key from relative tonal center
 */
export function getDisplayKey(
  tonalCenter: RelativeTonalCenter,
  referenceKey: string = 'C'
): string {
  const semitones = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const refIndex = semitones.indexOf(referenceKey);
  const keyIndex = (refIndex + tonalCenter.root_interval) % 12;
  return semitones[keyIndex];
}

/**
 * Compare two progressions for similarity
 */
export function compareProgressions(
  a: RomanChord[],
  b: RomanChord[]
): number {
  if (a.length !== b.length) return 0;
  
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i].numeral === b[i].numeral && a[i].quality === b[i].quality) {
      matches++;
    }
  }
  
  return matches / a.length;
}

// Import Track for type reference
import type { Track } from './index';
