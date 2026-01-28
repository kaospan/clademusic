# Copilot Operating Rules — CladeAI

## Role
Senior full-stack engineer, UX-aware architect, music-theory-literate.

## Absolute UX/Player Invariants (Do not change unless explicitly tasked)
- ONE universal player across the app (no page-level embeds)
- Only ONE provider active and ONE iframe mounted at a time
- No overlapping audio, no hidden/background playback
- Player z-index is always above interactive UI (player: 60, floating UI: 50)
- Logged-in vs logged-out must NOT differ in playback behavior, placement, or provider buttons

If a task is not explicitly about player UX, do not modify player files.

---

## Prime Directive
Ship production-ready implementations of **existing TODO / 🚧 / partially implemented systems**.
Do NOT add new features, redesign UI, or invent scope beyond what already exists.

## Workflow Constraints
- Edit **one file per response** (one complete diff per file).
- After each file edit: output “✅ Completed edit X/Y” and list the next file to edit.
- Reference repo-relative paths (e.g., `src/services/harmonicAnalysis.ts`).
- No whitespace-only changes.

## Integrity Rules
- Never fake analysis results.
- Missing/uncertain data must be marked `is_provisional: true` with low confidence.
- UI must never block on analysis; async jobs only.
- Partial data must render.

---

## Data Model (Non-negotiable)
Primary stored harmony is relative:
- roman numerals
- tonal center (interval + mode)
- cadence type
Absolute chords/keys are display-only and derived.

---

## Implementation Priorities (in order)

### Priority 1 — Supabase Persistence
Implement schema + writes/reads for:
- `harmonic_fingerprints`
- `analysis_jobs`

Add indexes for:
- `roman_progression`, `cadence_type`, `loop_length_bars`, `confidence_score`

Implement cache reuse + idempotency:
- dedupe by ISRC and/or audio-hash
- TTL reuse default 90 days
- reanalysis eligibility default 365 days
Put constants in `ANALYSIS_CONFIG`.

Wire into:
- `src/services/harmonicAnalysis.ts`

### Priority 2 — Background Analysis Pipeline
Supabase Edge Function + job state machine:
queued → processing → completed/failed  
Persist progress `0..1`, include `analysis_version`.

UI must get:
- immediate provisional response
- eventual refined result via job completion

### Priority 3 — Audio/ML Analysis v0 (honest + minimal)
- chroma extraction
- tonal center detection
- dominant loop detection
- roman numeral conversion
- confidence scoring from signal clarity/stability/consistency
Prefer Essentia.js if already present; otherwise do not introduce heavyweight deps without stubs/TODOs.

### Priority 4 — React Hook Completion
Complete `src/hooks/useHarmonicAnalysis.ts`:
- subscribe to job status
- handle provisional/high-confidence/failures
- allow reanalysis trigger
- avoid polling abuse

### Priority 5 — Similarity Engine TODOs (deterministic)
Implement:
- progression rotation matching
- loop normalization
Return explanation payload:
matching_features: {
  shared_progression_shape: boolean
  cadence_match?: string
  rotation_offset?: number
}

---

## Testing Requirements
Add/extend unit tests for:
- progression rotation matching
- cache reuse + TTL logic
- confidence threshold behavior
No brittle DOM tests unless a TODO already exists for them.

---

## Scope Guardrails
Only implement Hooktheory/WhoSampled enrichment if the repo already contains stubs/TODOs.
Do not add new UI polish, monetization, or genre tagging.
“Player TODOs are allowed only when they violate the UX/Player Invariants.”

## Change Control (Non-Negotiable)

- Do NOT refactor existing code unless a task explicitly requires refactoring.
  - “Refactor” includes: renaming, moving files, reorganizing logic, extracting helpers,
    changing function signatures, or altering control flow beyond the minimum required
    to complete the task.
  - Bug fixes and TODO completions must preserve existing structure unless explicitly
    instructed otherwise.
