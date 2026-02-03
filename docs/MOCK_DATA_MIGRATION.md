# Mock Data Migration Plan

## Overview
This document outlines all mock/fake data currently in the codebase that needs to be connected to the real database.

## Mock Data Files Identified

### 1. **Track Seeds** (CRITICAL - 201 tracks)
**Location**: `src/data/seedTracks.ts` (1496 lines)

**Current Usage**:
- Direct import in `SearchPage.tsx` for local search
- Used as fallback data across the app
- Contains 201 tracks with full chord progressions, Spotify/YouTube IDs

**Database Status**: ⚠️ Seed script exists; `SearchPage.tsx` still uses the in-memory array.

**Migration Required**:
1. Seed Supabase using `scripts/seed.js` (or a migration-based seed)
2. Update `SearchPage.tsx` to query the database (stop importing `seedTracks`)
3. Keep `seedTracks` as an offline/dev fallback only

**Estimated Impact**: HIGH - affects search, compare, feed, all track displays

---

### 2. **Historical Tracks**
**Location**: `src/data/historicalTracks.ts` (3873 lines)

**Content**: Historical music data from 1920s onwards

**Current Usage**: Imported by seedTracks, contains historical progression data

**Migration Required**: Include in seed migration with seedTracks

---

### 3. **Additional Historical Tracks**
**Location**: `src/data/additionalHistoricalTracks.ts`

**Content**: Additional seed track data

**Migration Required**: Include in seed migration

---

### 4. **Seed Tracks With Providers**
**Location**: `src/data/seedTracksWithProviders.ts` (882 lines)

**Content**: Track data with real Spotify/YouTube IDs
- Already has `generateSeedSQL()` function
- Ready-to-use SQL generation

**Current Usage**: Used by `scripts/seed.js` but never deployed

**Migration Required**: 
1. Run `scripts/seed.js --reset` to populate database
2. Verify tracks table populated

---

### 5. **Sample Connections** (UI Component)
**Location**: `src/components/SampleConnections.tsx` (lines 46-96)

**Mock Data**:
```typescript
const mockSampledBy: SampleConnection[] = [
  // 3 fake sample connections
];

const mockSamplesFrom: SampleConnection[] = [
  // 3 fake source samples
];
```

**Database Status**: ✅ Table exists in migrations; UI still shows mock data

**Migration Required**:
1. Create real sample relationships in database
2. Update component to query `track_connections` table
3. Create `useSampleConnections()` hook (or reuse a real `useConnections` hook)

**Estimated Impact**: MEDIUM - affects track detail pages

---

### 6. **Nearby Listeners Panel**
**Location**: `src/components/NearbyListenersPanel.tsx` (lines 22-77)

**Mock Data**:
```typescript
const mockNearbyListeners: NearbyListener[] = [
  // 5 fake nearby listeners with distances
];
```

**Database Status**: ⚠️ Hook exists (`useNearbyListeners`), but `NearbyListenersPanel` still uses mock data

**Migration Required**:
1. Verify `useNearbyListeners` hook fully connected to database
2. Remove mock fallback from component
3. Test with real location data

**Estimated Impact**: LOW - feature already has database hooks

---

### 7. **Live Comment Feed**
**Location**: `src/components/LiveCommentFeed.tsx` (lines 32-71)

**Mock Data**:
```typescript
const mockComments: Comment[] = [
  // 5 fake comments with likes, users, timestamps
];
```

**Database Status**: ✅ Track comments exist (`supabase/migrations/20260122_track_comments.sql`), but this component still uses mock data

**Migration Required**:
1. Replace mock feed with real queries/subscriptions (either reuse `track_comments` or create entity-scoped comments)
2. Decide schema: track-only vs (track/album/artist) polymorphic comments
3. Wire realtime updates (Supabase Realtime) if needed

**Estimated Impact**: HIGH - social feature, not yet deployed

---

### 8. **Seed Script** (Already Exists!)
**Location**: `scripts/seed.js` (209 lines)

**Status**: ✅ Complete (requires correct Supabase credentials)

**Features**:
- Clears and resets data with `--reset` flag
- Inserts tracks from `seedTracksWithProviders`
- Creates sample/cover/remix connections
- Creates feed items

**Migration Required**:
1. Run: `node scripts/seed.js --reset`
2. Verify data in Supabase dashboard

---

## Migration Priority

### Phase 1: CRITICAL (Do Immediately)
1. ✅ **Seed script exists**: `bun run seed:reset`
   - Populates `tracks` table with real data
   - Creates track connections
   - Creates feed items

2. **Update SearchPage** to query database
   - Replace `import { seedTracks }` with database query
   - Reuse existing `src/hooks/api/useTracks.ts`
   - Add search indexing

3. **Deploy pending migrations**:
   - `20260122_playlists.sql` (263 lines, 5 tables)
   - `20260122_profile_themes.sql` (200+ lines, theme system)

### Phase 2: HIGH (Next Session)
4. **Update SampleConnections component**
   - Query `track_connections` table
   - Create `useSampleConnections()` hook
   - Remove mock data

5. **Verify NearbyListeners**
   - Confirm database queries working
   - Remove any mock fallbacks

### Phase 3: MEDIUM (Social Features)
6. **Comments System**
   - Create comments migration
   - Build `useComments()` hook with real-time
   - Update LiveCommentFeed component

---

## Database Tables Status

### ✅ Already Exist
- `tracks` - Empty, needs seeding
- `profiles` - User profiles
- `play_events` - Playback tracking
- `track_provider_links` - Spotify/YouTube links
- `track_connections` - Sample/cover/remix relationships
- `feed_items` - Social feed
- `track_comments` - Track comments
- `harmonic_fingerprints` - Harmonic analysis results
- `analysis_jobs` - Harmonic analysis queue

### ⏸️ Migration Ready, Not Deployed
- `playlists` - Needs migration run
- `playlist_tracks` - Needs migration run
- `playlist_collaborators` - Needs migration run
- `user_themes` - Needs migration run
- `theme_presets` - Needs migration run

### ❌ Not Created Yet
- `comments` (multi-entity) - If we want album/artist comments beyond `track_comments`
- `notifications` - Phase 5 roadmap

---

## Technical Debt (TODOs Found)

### `src/services/similarityEngine.ts`
- Line 17: `TODO: Add ML-based embedding similarity`
- Line 18: `TODO: Implement progression transposition matching`
- Line 95: `TODO: Query database for tracks with matching progression`
- Line 108: `TODO: Implement clustering algorithm`
- Line 260: `TODO: Optimize database query with indexes`
- Line 267: `TODO: Use vector search for progression embeddings`
- Line 278: `TODO: Query from harmonic_fingerprints table`
- Line 328: `TODO: Add common substitutions`

### `src/services/harmonicAnalysis.ts`
- Line 13: `TODO: Integrate actual audio analysis ML model`
- Line 14: `TODO: Add Supabase Edge Function for background processing`
- Line 122: `TODO: Store job in database`
- Line 125: `TODO: Trigger Edge Function for async processing`
- Line 140: `TODO: Query from database`
- Line 159: `TODO: Query from harmonic_fingerprints table`
- Line 188: `TODO: Upsert to harmonic_fingerprints table`
- Lines 214-226: `TODO:` Extract audio features (6 TODOs)

---

## Next Actions

### Immediate (This Session)
1. ✅ Create queue system for player
2. ⏳ Run seed script to populate database
3. ⏳ Deploy pending migrations
4. ⏳ Update SearchPage to use database

### Next Session
5. Create migration for any missing mock data tables
6. Update all components to use database queries
7. Remove mock data imports
8. Test all features with real data

---

## Success Metrics

After migration complete:
- ✅ No `mock` or `fake` constants in production code
- ✅ All searches query database
- ✅ Sample connections show real relationships
- ✅ Playlists and themes working
- ✅ seedTracks only used as offline fallback
- ✅ All migrations deployed to Supabase

---

## Files to Update

### Components Using Mock Data:
1. `src/pages/SearchPage.tsx` - Uses seedTracks directly
2. `src/components/SampleConnections.tsx` - mockSampledBy, mockSamplesFrom
3. `src/components/NearbyListenersPanel.tsx` - mockNearbyListeners
4. `src/components/LiveCommentFeed.tsx` - mockComments

### Hooks to Create:
1. `src/hooks/api/useTracks.ts` - Database track queries
2. `src/hooks/api/useSampleConnections.ts` - Sample relationships
3. `src/hooks/api/useComments.ts` - Comment system (Phase 5)

### Migrations to Deploy:
1. `supabase/migrations/20260122_playlists.sql`
2. `supabase/migrations/20260122_profile_themes.sql`
3. Create: `supabase/migrations/20260122_seed_tracks.sql`
4. Create (future): `supabase/migrations/202601XX_comments.sql`

---

Generated: 2026-01-22
Status: Updated 2026-02-03 (mixed: several migrations exist; some UI still uses mock data)
