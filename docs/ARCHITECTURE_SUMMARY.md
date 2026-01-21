# CladeAI Architecture Summary

**Last Updated**: January 21, 2026

## Product Vision

TikTok-style music discovery platform that analyzes songs by **harmonic structure**, not genre. Songs are clustered by relative chord progressions, tonal center, cadence type, and loop structure.

## Core Architecture (Non-Negotiable)

### 1. Harmonic Data Model ✅

**Primary storage uses relative theory, never absolute chords:**

```typescript
// ✅ CORRECT (stored in database)
{
  tonal_center: { root_interval: 0, mode: 'major' },
  roman_progression: ['I', 'V', 'vi', 'IV'],
  cadence_type: 'authentic',
  confidence_score: 0.85,
  is_provisional: false
}

// ❌ WRONG (never store as primary data)
{
  chords: ['C', 'G', 'Am', 'F']
}
```

**Absolute keys derived for display only:**
```typescript
const displayKey = getDisplayKey(tonalCenter, 'C'); // "C major"
```

### 2. Hybrid Analysis Pipeline ✅

```
User adds song
     ↓
Check harmony DB → Found? Use cached analysis (O(1))
     ↓ Not found
Queue async job → Return provisional data (non-blocking UI)
     ↓
Run ML analysis (background)
     ↓
Store result → Update confidence score
```

**Key characteristics:**
- ✅ **Asynchronous**: Never blocks UI
- ✅ **Cacheable**: 90-day cache, 365-day reanalysis
- ✅ **Idempotent**: Same audio = same result
- ✅ **Replaceable**: Model versioning support

### 3. Audio Analysis Layer 🚧

**Status**: Placeholder implementation (TODO: integrate ML model)

**Requirements:**
- Extract chroma/harmonic features from audio
- Detect: key center, chord sequence, section boundaries
- Output relative structures with confidence scores
- Never block UI during analysis

**TODO:**
- [ ] Integrate Essentia.js or custom ML model
- [ ] Add Supabase Edge Function for background processing
- [ ] Implement section boundary detection
- [ ] Add real-time progress updates

### 4. UX Requirements ✅

- ✅ Show "Analyzing…" state immediately
- ✅ Allow playback before analysis completes
- ✅ Clearly label provisional harmony results
- ✅ Support future refinement without breaking references

**UI Components:**
```tsx
<AnalysisStatusBadge
  fingerprint={fingerprint}
  isAnalyzing={isAnalyzing}
/>
// Shows: "Analyzing…" | "Provisional" | "High Confidence"

<AnalysisConfidenceDisplay fingerprint={fingerprint} />
// Shows: Progress bar + percentage + version info
```

### 5. Cost & Scale Awareness ✅

**Optimizations:**
- ✅ Aggressive caching (90-day TTL)
- ✅ ISRC-based deduplication
- 🚧 Batch background processing (TODO: queue system)
- ✅ Confidence thresholds (< 0.7 = provisional)

**Design Goal**: Millions of songs, not thousands

### 6. Similarity Engine ✅

**Tracks are similar if they share:**

| Feature | Weight | Implementation |
|---------|--------|----------------|
| Progression shape | 50% | Roman numeral sequence matching |
| Cadence behavior | 20% | Resolution pattern comparison |
| Loop length | 15% | Bar structure similarity |
| Modal color | 10% | Tonal mode matching |
| Tempo | 5% | BPM proximity |

**Genre/artist/instrumentation are secondary signals only.**

```typescript
const results = await findSimilarTracks({
  reference_track_id: 'abc123',
  max_results: 20,
  weights: { progression_shape: 0.5, ... },
});
// Returns: [{ track_id, similarity_score, matching_features, explanation }]
```

**TODO:**
- [ ] Progression rotation matching (I-V-vi-IV ≈ V-vi-IV-I)
- [ ] ML-based embeddings for semantic similarity
- [ ] Harmonic clustering with t-SNE visualization

### 7. Code Quality Standards ✅

- ✅ **Modular**: Separated concerns (types, services, UI)
- ✅ **DRY**: Reusable components (ProviderBadge, GlassCard, formatters)
- ✅ **Testable**: Pure functions, clear interfaces
- ✅ **Config-driven**: `ANALYSIS_CONFIG` for thresholds
- ✅ **Clear separation**: ingestion → analysis → storage → UI

## File Structure

```
src/
├── types/
│   ├── harmony.ts                 # ✅ Core harmonic types
│   └── index.ts                   # ✅ Track type (updated)
│
├── services/
│   ├── harmonicAnalysis.ts        # ✅ Analysis pipeline
│   └── similarityEngine.ts        # ✅ Track matching
│
├── components/
│   ├── AnalysisStatusBadge.tsx    # ✅ Confidence UI
│   └── layout/
│       └── ResponsiveLayout.tsx   # ✅ Desktop layouts
│
└── hooks/
    └── useHarmonicAnalysis.ts     # 🚧 TODO: React hook
```

## Database Schema (TODO)

### `harmonic_fingerprints` Table

```sql
CREATE TABLE harmonic_fingerprints (
  track_id TEXT PRIMARY KEY,
  tonal_center JSONB NOT NULL,
  roman_progression JSONB NOT NULL,
  loop_length_bars INTEGER NOT NULL,
  cadence_type TEXT NOT NULL,
  confidence_score REAL CHECK (confidence_score BETWEEN 0 AND 1),
  analysis_version TEXT NOT NULL,
  is_provisional BOOLEAN DEFAULT TRUE,
  detected_key TEXT, -- UI display only
  ...
);
```

### `analysis_jobs` Table

```sql
CREATE TABLE analysis_jobs (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress REAL CHECK (progress BETWEEN 0 AND 1),
  result JSONB, -- HarmonicFingerprint
  ...
);
```

## Implementation Status

### ✅ Completed

- [x] Harmonic types system (`src/types/harmony.ts`)
- [x] Analysis pipeline architecture (`src/services/harmonicAnalysis.ts`)
- [x] Similarity engine (`src/services/similarityEngine.ts`)
- [x] UI confidence indicators (`src/components/AnalysisStatusBadge.tsx`)
- [x] Comprehensive documentation (`docs/HARMONIC_ANALYSIS_ARCHITECTURE.md`)
- [x] Responsive desktop UI (FeedPage, SearchPage)
- [x] DRY refactoring (ProviderBadge, GlassCard, formatters)
- [x] Queue management system
- [x] Song credits (songwriter, producer, label)
- [x] BPM and genre metadata

### 🚧 In Progress

- [ ] Database schema migration (Supabase)
- [ ] ML audio analysis integration (Essentia.js or custom)
- [ ] Supabase Edge Function for background processing
- [ ] Real-time job progress updates

### 📋 TODO (Priority Order)

1. **Database Integration**
   - Create `harmonic_fingerprints` and `analysis_jobs` tables
   - Add indexes for similarity queries
   - Implement cache lookup/storage

2. **ML Model Integration**
   - Research: Essentia.js vs Chord.js vs custom model
   - Implement chroma feature extraction
   - Add key/chord detection
   - Calculate confidence scores

3. **Background Processing**
   - Create Supabase Edge Function for async analysis
   - Implement job queue system
   - Add progress tracking (WebSockets)

4. **Advanced Similarity**
   - Progression rotation matching
   - ML-based embeddings
   - Clustering visualization

5. **User Refinement**
   - Crowd-sourced corrections
   - Manual override interface
   - Feedback mechanism

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Cache hit | < 50ms | 🚧 TODO |
| Cache miss (queue) | < 100ms | 🚧 TODO |
| Full analysis | < 30s (background) | 🚧 TODO |
| Similarity query | < 200ms | 🚧 TODO |

## Recent Changes (Jan 21, 2026)

1. ✅ Created harmonic analysis type system
2. ✅ Implemented hybrid pipeline architecture
3. ✅ Built similarity engine with configurable weights
4. ✅ Added UI components for confidence display
5. ✅ Documented architecture comprehensively
6. ✅ Updated responsive desktop UI (FeedPage, SearchPage)
7. ✅ Build successful (16.43s, 2555 modules)

## Next Steps

1. **Immediate**: Create database tables via Supabase migration
2. **Short-term**: Integrate ML audio analysis model
3. **Medium-term**: Add real-time progress tracking
4. **Long-term**: Build harmonic clustering visualization

## References

- **Architecture Doc**: [`docs/HARMONIC_ANALYSIS_ARCHITECTURE.md`](../docs/HARMONIC_ANALYSIS_ARCHITECTURE.md)
- **Types**: [`src/types/harmony.ts`](../src/types/harmony.ts)
- **Services**: [`src/services/harmonicAnalysis.ts`](../src/services/harmonicAnalysis.ts), [`src/services/similarityEngine.ts`](../src/services/similarityEngine.ts)
- **UI**: [`src/components/AnalysisStatusBadge.tsx`](../src/components/AnalysisStatusBadge.tsx)

---

**This architecture is designed to feel correct five years from now.**

- Never fake harmony results
- Never guess without marking confidence
- Always store relative theory as primary data
- Always cache aggressively for scale
- Always label provisional results clearly
