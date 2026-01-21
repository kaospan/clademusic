# Harmonic Analysis Architecture

## Overview

CladeAI uses a **hybrid harmonic analysis pipeline** that prioritizes cost-efficiency and user experience. The system analyzes songs by their relative harmonic structure (Roman numerals), not absolute chords or genre metadata.

## Core Principles

### 1. Relative Theory First

**Never store absolute chord names as primary data.**

All harmonic data is stored in relative form:
- `tonal_center` → Relative interval (0-11 semitones from reference)
- `roman_progression` → Array of Roman numeral chords (e.g., `["I", "V", "vi", "IV"]`)
- `cadence_type` → How the progression resolves
- `loop_length_bars` → Structure of the harmonic loop
- `modal_color` → Modal flavor beyond major/minor

Absolute keys (e.g., "C major") are derived only for display purposes.

### 2. Hybrid Pipeline

When a song is added to the system:

```
1. Check harmony database
   ↓
   ├─→ If found: Use cached analysis (O(1))
   └─→ If not found:
       ├─→ Queue async audio analysis
       ├─→ Return provisional data immediately (non-blocking)
       └─→ Update with final result when ready
```

**Key characteristics:**
- **Asynchronous**: Never blocks the UI
- **Cacheable**: Results stored for 90 days minimum
- **Idempotent**: Re-running analysis on same audio yields same result
- **Replaceable**: Can update analysis with improved models

### 3. Cost & Scale Awareness

Audio analysis is expensive. We optimize by:

- **Aggressive caching**: Store all results in `harmonic_fingerprints` table
- **Deduplication**: ISRC-based lookups prevent re-analyzing identical audio
- **Batch processing**: Queue low-priority jobs during off-peak hours
- **Confidence thresholds**: Mark low-confidence results for manual review

**Design Goal**: Support millions of songs, not thousands.

## Data Model

### HarmonicFingerprint (Primary Storage)

```typescript
interface HarmonicFingerprint {
  // Identity
  track_id: string;
  
  // Relative harmonic data (NEVER absolute chords)
  tonal_center: RelativeTonalCenter;
  roman_progression: RomanChord[];
  loop_length_bars: number;
  cadence_type: CadenceType;
  modal_color?: ModalColor;
  borrowed_chords?: BorrowedChord[];
  
  // Section-specific progressions
  section_progressions?: SectionProgression[];
  
  // Analysis metadata
  confidence_score: number; // 0.0 - 1.0
  analysis_timestamp: string;
  analysis_version: string; // e.g., "1.2.0"
  is_provisional: boolean; // true if confidence < 0.7
  
  // Derived display data (computed from relative data)
  detected_key?: string; // e.g., "C" - UI only
  detected_mode?: 'major' | 'minor' | ModalColor;
}
```

### RomanChord

```typescript
interface RomanChord {
  numeral: string; // "I", "iv", "V7", "bVI", etc.
  quality: ChordQuality; // major, minor, diminished, etc.
  duration_beats?: number; // Rhythmic weight
  timing_ms?: number; // Position in track
  inversions?: number; // 0 = root, 1 = first inversion
}
```

### CadenceType

How a progression resolves:

- `authentic` → V → I (strong resolution)
- `plagal` → IV → I (amen cadence)
- `deceptive` → V → vi (fake-out ending)
- `half` → Ends on V (unresolved)
- `loop` → Circular, no resolution
- `modal` → Non-functional harmony
- `none` → No clear cadence

## Analysis Pipeline

### Phase 1: Cache Check

```typescript
async function getHarmonicAnalysis(trackId: string) {
  // O(1) database lookup
  const cached = await checkHarmonyCache(trackId);
  if (cached) {
    return { fingerprint: cached, method: 'cached' };
  }
  
  // Continue to Phase 2...
}
```

**Optimization**: Index `harmonic_fingerprints` table by:
- `track_id` (primary key)
- `confidence_score` (for quality filtering)
- `cadence_type` (for similarity queries)

### Phase 2: Job Queue

```typescript
// Queue async analysis
const job = await queueAnalysis({
  track_id: trackId,
  priority: 'normal', // or 'high' for user-requested
});

// Return provisional data immediately (non-blocking)
return {
  fingerprint: createProvisionalFingerprint(trackId),
  confidence: { overall: 0.0, ... },
  method: 'ml_audio',
};
```

**Important**: UI shows "Analyzing…" state but allows playback.

### Phase 3: Audio Analysis

**Current**: Placeholder mock analysis  
**TODO**: Integrate ML model (e.g., Essentia.js, Chord.js, or custom model)

```typescript
async function runAnalysisJob(job: AnalysisJob) {
  // 1. Fetch audio file
  // 2. Extract chroma features (FFT-based)
  // 3. Detect key and mode (template matching)
  // 4. Identify chord progression (HMM or CNN)
  // 5. Detect section boundaries (novelty detection)
  // 6. Extract cadence patterns
  // 7. Calculate confidence scores
  
  const fingerprint = await mlModel.analyze(audioData);
  await storeInCache(fingerprint);
  
  return { fingerprint, processing_time_ms: ... };
}
```

### Phase 4: Result Storage

```typescript
await supabase
  .from('harmonic_fingerprints')
  .upsert(fingerprint, { onConflict: 'track_id' });
```

Results are cached for **90 days minimum**, reanalyzed after **365 days** if model improves.

## Similarity Engine

Tracks are considered similar if they share:

1. **Progression shape** (50% weight)
   - Same Roman numeral sequence
   - Allows rotation: `[I, V, vi, IV]` ≈ `[V, vi, IV, I]`

2. **Cadence behavior** (20% weight)
   - Same resolution pattern

3. **Loop length** (15% weight)
   - Same bar structure

4. **Modal color** (10% weight)
   - Same tonal mode

5. **Tempo** (5% weight)
   - Secondary signal only

**Genre, artist, and instrumentation are NOT primary signals.**

### Similarity Query

```typescript
const results = await findSimilarTracks({
  reference_track_id: 'abc123',
  max_results: 20,
  weights: {
    progression_shape: 0.5,
    cadence_type: 0.2,
    loop_length: 0.15,
    modal_color: 0.1,
    tempo: 0.05,
  },
  filters: {
    min_confidence: 0.7, // Only high-quality results
    same_mode_only: false,
  },
});
```

Returns:
```typescript
[
  {
    track_id: 'xyz789',
    similarity_score: 0.92,
    matching_features: ['progression_shape', 'cadence_type'],
    explanation: 'Similar chord progression, Same resolution pattern',
  },
  // ...
]
```

## UX Requirements

### 1. Non-Blocking Analysis

✅ **Good**: Show "Analyzing…" state, allow playback immediately  
❌ **Bad**: Block UI waiting for analysis to complete

### 2. Provisional Results

Always label provisional data:

```tsx
<AnalysisStatusBadge
  fingerprint={fingerprint}
  isAnalyzing={isAnalyzing}
/>
// Shows: "Provisional" or "High Confidence"
```

### 3. Confidence Indicators

Display confidence scores clearly:

```tsx
<AnalysisConfidenceDisplay fingerprint={fingerprint} />
// Shows: Progress bar + percentage + warning if provisional
```

### 4. Graceful Degradation

If analysis fails:
- Still show track metadata
- Disable harmony-based features (similar tracks, progression search)
- Allow manual data correction

## Database Schema

### `harmonic_fingerprints` Table

```sql
CREATE TABLE harmonic_fingerprints (
  track_id TEXT PRIMARY KEY REFERENCES tracks(id),
  
  -- Relative harmonic data (JSONB)
  tonal_center JSONB NOT NULL,
  roman_progression JSONB NOT NULL,
  loop_length_bars INTEGER NOT NULL,
  cadence_type TEXT NOT NULL,
  modal_color TEXT,
  borrowed_chords JSONB,
  section_progressions JSONB,
  
  -- Analysis metadata
  confidence_score REAL NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  analysis_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analysis_version TEXT NOT NULL,
  is_provisional BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Derived display data
  detected_key TEXT,
  detected_mode TEXT,
  
  -- Indexes for similarity queries
  CONSTRAINT valid_cadence CHECK (cadence_type IN ('authentic', 'plagal', 'deceptive', 'half', 'loop', 'modal', 'none'))
);

CREATE INDEX idx_fingerprints_confidence ON harmonic_fingerprints(confidence_score);
CREATE INDEX idx_fingerprints_cadence ON harmonic_fingerprints(cadence_type);
CREATE INDEX idx_fingerprints_loop_length ON harmonic_fingerprints(loop_length_bars);
```

### `analysis_jobs` Table

```sql
CREATE TABLE analysis_jobs (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id),
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress REAL NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 1),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB, -- HarmonicFingerprint if completed
  
  CONSTRAINT one_active_job_per_track UNIQUE (track_id, status)
);

CREATE INDEX idx_jobs_status ON analysis_jobs(status) WHERE status IN ('queued', 'processing');
CREATE INDEX idx_jobs_track ON analysis_jobs(track_id);
```

## Code Organization

```
src/
├── types/
│   ├── harmony.ts           # Core harmonic types
│   └── index.ts             # Track type (existing)
│
├── services/
│   ├── harmonicAnalysis.ts  # Analysis pipeline
│   └── similarityEngine.ts  # Track matching
│
├── components/
│   └── AnalysisStatusBadge.tsx  # UI for confidence display
│
└── hooks/
    └── useHarmonicAnalysis.ts   # React hook (TODO)
```

## Future Improvements

### Short-term (MVP+)
- [ ] Integrate real ML audio analysis model
- [ ] Add Supabase Edge Function for background processing
- [ ] Implement progression rotation matching
- [ ] Add user feedback mechanism for corrections

### Medium-term
- [ ] ML-based progression embeddings (semantic similarity)
- [ ] Crowd-sourced analysis refinement
- [ ] Real-time analysis progress updates (WebSockets)
- [ ] Batch re-analysis when model improves

### Long-term
- [ ] Section-aware progression analysis
- [ ] Harmonic clustering with t-SNE visualization
- [ ] Borrowed chord detection
- [ ] Modulation detection (key changes within song)

## Performance Targets

- **Cache hit**: < 50ms (database query)
- **Cache miss**: < 100ms (queue job + return provisional)
- **Full analysis**: < 30s (background, non-blocking)
- **Similarity query**: < 200ms (indexed database query)

## References

- **Music Theory**: [Harmonic Function](https://en.wikipedia.org/wiki/Diatonic_function)
- **Chord Detection**: [Essentia.js](https://mtg.github.io/essentia.js/)
- **Roman Numeral Analysis**: [Music21](http://web.mit.edu/music21/)

---

**Last Updated**: January 2026  
**Model Version**: 1.0.0 (placeholder)  
**Author**: CladeAI Engineering Team
