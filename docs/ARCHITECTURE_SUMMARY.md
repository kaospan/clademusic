# Clade Architecture Summary

**Last Updated**: February 3, 2026

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

**Status**: Mock analysis pipeline is implemented; ML model integration is still pending.

**Requirements:**
- Extract chroma/harmonic features from audio
- Detect: key center, chord sequence, section boundaries
- Output relative structures with confidence scores
- Never block UI during analysis

**Implemented (in repo):**
- [x] Supabase Edge Function background job runner (`supabase/functions/harmonic-analysis`)
- [x] Database schema for `harmonic_fingerprints` + `analysis_jobs` (`supabase/migrations/20260125_harmonic_analysis_core.sql`)
- [x] Real-time job progress updates (Supabase Realtime via `src/hooks/useHarmonicAnalysis.ts`)

**Remaining:**
- [ ] Integrate Essentia.js or custom ML model
- [ ] Implement section boundary detection

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
- ✅ Background processing via Edge Function + `analysis_jobs`
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
    └── useHarmonicAnalysis.ts     # ✅ React hook (Realtime + job tracking)
```

## Database Schema

The schema is defined via Supabase migrations (see `supabase/migrations/20260125_harmonic_analysis_core.sql`).

### `harmonic_fingerprints` (excerpt)

```sql
CREATE TABLE harmonic_fingerprints (
  id uuid PRIMARY KEY,
  track_id TEXT NOT NULL,
  tonal_center JSONB NOT NULL,
  roman_progression JSONB NOT NULL,
  loop_length_bars INTEGER NOT NULL,
  cadence_type TEXT NOT NULL,
  confidence_score REAL CHECK (confidence_score BETWEEN 0 AND 1),
  analysis_version TEXT NOT NULL,
  is_provisional BOOLEAN DEFAULT TRUE,
  detected_key TEXT, -- display only
  ...
);
```

### `analysis_jobs` (excerpt)

```sql
CREATE TABLE analysis_jobs (
  id uuid PRIMARY KEY,
  track_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cached')),
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

- [ ] ML audio analysis integration (Essentia.js or custom)
- [ ] Advanced similarity (rotation matching, embeddings, clustering)
- [ ] Section boundary detection

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
   - Harden Edge Function error handling + retries
   - Add rate limits for analysis triggers
   - Add admin tooling for stuck jobs

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

## Recent Changes (Feb 3, 2026)

1. ✅ Added Supabase Edge Function runner (`harmonic-analysis`)
2. ✅ Added schema migrations for `harmonic_fingerprints` and `analysis_jobs`
3. ✅ Added real-time job + fingerprint subscriptions (`useHarmonicAnalysis`)
4. 🚧 ML model integration still pending

## Next Steps

1. **Immediate**: Deploy Supabase migrations + Edge Functions to the target project
2. **Short-term**: Integrate ML audio analysis model
3. **Medium-term**: Add section boundary detection
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
