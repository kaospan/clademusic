# 🎯 Clade - Task List & Progress

**Last Updated**: January 21, 2026

## ✅ Completed Features

### Harmonic Analysis Architecture (Jan 2026)
- [x] **Relative theory type system** — HarmonicFingerprint, RomanChord, CadenceType, ModalColor types
- [x] **Hybrid analysis pipeline** — Cache-first with async job queueing (harmonicAnalysis.ts)
- [x] **Similarity engine** — Track matching by progression shape, cadence, loop length (similarityEngine.ts)
- [x] **Confidence scoring** — 0.0-1.0 scores with provisional flags
- [x] **Analysis status UI** — AnalysisStatusBadge with confidence indicators
- [x] **Model versioning** — Analysis results tagged with version numbers
- [x] **Comprehensive documentation** — HARMONIC_ANALYSIS_ARCHITECTURE.md, ARCHITECTURE_SUMMARY.md

### Responsive Desktop UI (Jan 2026)
- [x] **ResponsiveLayout components** — ResponsiveContainer, ResponsiveGrid, DesktopColumns, DesktopSidebarLayout
- [x] **FeedPage desktop layout** — 3-column with left sidebar (metadata, progress, shortcuts)
- [x] **SearchPage responsive** — Adaptive container with breakpoint optimization
- [x] **Breakpoint system** — sm/md/lg/xl/2xl (640px-1536px+)
- [x] **Desktop sidebars** — FeedSidebar with track info and keyboard shortcuts
- [x] **Mobile-first preservation** — Seamless mobile experience maintained

### Core Features
- [x] Music feed with swipeable track cards
- [x] Harmonic chord progression analysis
- [x] Real-time chord highlighting during playback
- [x] Spotify OAuth integration & search
- [x] YouTube video discovery & playback
- [x] Floating PiP players (Spotify + YouTube)
- [x] Jump-to-time section navigation
- [x] Active player z-index management (100 for active, 50 for inactive)
- [x] Search history with localStorage
- [x] Track detail page with tabs (Sections, Chords, Videos, Samples)
- [x] BPM and genre metadata display (formatBPM utility)
- [x] Queue management system (QueueContext with 6 operations)
- [x] 3-dot track menu (Play Next, Add to Queue, View Album/Artist, Similar Progressions)
- [x] Compact song sections in feed
- [x] Auto-generated song structure (intro/verse/chorus)
- [x] Advanced chord quality parsing (maj7, dim, sus, add9, etc.)

### Rich Metadata (Jan 2026)
- [x] **Song credits** — Songwriter, producer, label, release_date fields
- [x] **Credits display** — ProfilePage all-time history with full metadata
- [x] **Multiple genres** — genres[] array support with genre_description
- [x] **Tempo detection** — tempo field with formatBPM display

### Code Quality (Jan 2026)
- [x] **DRY refactoring** — ProviderBadge, GlassCard reusable components
- [x] **Centralized formatters** — formatBPM, capitalize, formatRelativeTime in formatters.ts
- [x] **Type safety** — Strict TypeScript with comprehensive interfaces
- [x] **Modular architecture** — Separated services (harmonicAnalysis, similarityEngine, lastfmService)
- [x] **Config-driven** — ANALYSIS_CONFIG for thresholds and settings

### UI/UX
- [x] Responsive design with mobile-first approach
- [x] Dark mode with glass morphism effects (GlassCard component)
- [x] Smooth animations with Framer Motion
- [x] Bottom navigation for mobile
- [x] Skeleton loading states (FeedSkeleton)
- [x] Error boundaries and error handling
- [x] Accessibility labels and ARIA attributes
- [x] **Responsive typography** — text-sm lg:text-base scaling
- [x] **Adaptive layouts** — Multi-column grids for desktop

### Infrastructure
- [x] GitHub Pages deployment with SPA routing fix
- [x] Supabase backend integration
- [x] React Query for data fetching/caching
- [x] TypeScript strict mode
- [x] Vite build optimization
- [x] Code splitting with lazy loading
- [x] **Build performance** — 16.43s for 2555 modules (628KB bundle, 192KB gzipped)

## 🔄 In Progress

### Harmonic Analysis Infrastructure
- [ ] **Database schema** — Create `harmonic_fingerprints` and `analysis_jobs` tables
  - Tables: HarmonicFingerprint storage with confidence, cadence, progression
  - Indexes: confidence_score, cadence_type, loop_length_bars
  - RLS policies for user access
  
- [ ] **ML model integration** — Research Essentia.js vs custom audio analysis
  - Chroma feature extraction from audio
  - Key and mode detection
  - Chord progression identification
  - Section boundary detection
  - Confidence score calculation

- [ ] **Background processing** — Supabase Edge Function for async analysis
  - Queue management system
  - Job status tracking
  - Real-time progress updates (WebSockets)
  - Error handling and retry logic

### Database
- [ ] Create `track_connections` table in Supabase
  - Columns: id, from_track_id, to_track_id, connection_type, confidence, evidence_url, evidence_text, created_by, created_at
  - Connection types: 'sample', 'cover', 'remix', 'interpolation', 'reference'
  - Enable RLS policies

### API Integrations (Placeholder → Real)
- [ ] Hooktheory API integration
  - Get API key from hooktheory.com
  - Implement `/api/hooktheory` service
  - Map chord data to Track type
  - Cache responses with React Query
  
- [ ] WhoSampled API integration
  - Get API key from whosampled.com
  - Implement `/api/whosampled` service
  - Parse sample/cover relationships
  - Display in ConnectionsPage

## 📋 Backlog

### 🔴 URGENT - Recently Requested (Jan 22, 2026)

#### Admin Dashboard System
- [ ] **Admin role & access control**
  - Set `repoisrael@gmail.com` as sole admin in user_roles table
  - Create RLS policies for admin-only access
  - Add admin check utility functions

- [ ] **Admin dashboard page** (`/admin`)
  - Subtle admin link in site settings (only visible to admin)
  - Protected route with admin role verification
  - Dashboard layout with sidebar navigation

- [ ] **User management panel**
  - List all users with search/filter
  - View user profiles and activity
  - Ban/unban users
  - Reset user passwords
  - Delete accounts

- [ ] **Content moderation tools**
  - Review flagged comments/content
  - Moderate user-submitted chord progressions
  - Track connections approval/rejection
  - Bulk moderation actions

- [ ] **Analytics dashboard**
  - Active users count (daily/weekly/monthly)
  - Most played tracks
  - Popular chord progressions
  - API usage metrics
  - Error rate monitoring

- [ ] **System configuration**
  - Feature flags (enable/disable features)
  - Rate limit settings
  - Credit system configuration
  - Maintenance mode toggle

#### Profile Theme Customization (MySpace meets TikTok)
- [ ] **Profile theme editor**
  - Background color/image picker
  - Accent color customization
  - Font style selector
  - Layout preset templates (minimal, vibrant, retro, neon)

- [ ] **Custom profile sections**
  - Bio section with rich text editor
  - Featured tracks showcase
  - Custom playlists display
  - Top progressions grid
  - Mood board/aesthetic section

- [ ] **Profile themes data model**
  - Create `user_themes` table
  - Store theme JSON: colors, fonts, layout, custom_css
  - Allow theme preview before saving
  - Share theme templates

- [ ] **Social profile enhancements**
  - Profile banner image
  - Custom profile URL slugs
  - Visitor counter (optional)
  - Music player skin customization
  - Animated backgrounds (subtle)

- [ ] **Theme marketplace (future)**
  - Browse community-created themes
  - One-click theme import
  - Theme ratings and comments
  - Featured themes section

### High Priority - Harmonic Analysis
- [ ] **Progression rotation matching** — Detect rotated progressions (I-V-vi-IV ≈ V-vi-IV-I)
- [ ] **ML embeddings** — Semantic similarity beyond exact matching
- [ ] **Crowd-sourced corrections** — User feedback mechanism for improving analysis
- [ ] **Section-aware progressions** — Different progressions for verse/chorus/bridge
- [ ] **Borrowed chord detection** — Identify chords from parallel modes
- [ ] **Modulation detection** — Track key changes within songs
- [ ] **Harmonic clustering** — Group similar tracks with t-SNE visualization

### High Priority - Features
- [ ] YouTube Music OAuth integration (ProfilePage)
  - Add YouTube OAuth flow
  - Store tokens in user_providers table
  - Enable playlist import
  
- [ ] Queue UI panel/drawer
  - Show current queue list
  - Drag-to-reorder functionality
  - Remove from queue button
  - Clear queue button
  
- [ ] Fullscreen mode for video player (WatchCard)
  - Implement fullscreen API
  - Add controls overlay
  - Handle escape key

### Medium Priority
- [ ] Album page enhancements
  - Show all tracks in album
  - Album artwork
  - Release date and label info
  
- [ ] Artist page enhancements
  - Top tracks
  - Albums discography
  - Artist bio
  - Similar artists
  
- [ ] Real-time listening activity
  - Show nearby listeners map
  - Live comment feed
  - Real-time reactions
  
- [ ] Chord progression similarity search
  - Implement vector similarity (pgvector)
  - Match by harmonic distance
  - Show similarity percentage

### Low Priority
- [ ] Playlist creation and management
- [ ] User collections/favorites
- [ ] Social follow/unfollow
- [ ] Push notifications for new matches
- [ ] Export playlists to Spotify/YouTube
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] PWA offline support

## 🐛 Known Issues

### Minor
- [ ] HTML title still says "TODO" (index.html line 6)
  - Update to "Clade - Find Your Harmony"
  
- [ ] Spotify embed doesn't support timestamp seek
  - YouTube supports seekTo, Spotify restarts
  - Consider switching to Spotify Web Playback SDK
  
### Documentation
- [ ] Update README.md project name (duplicate header)
- [ ] Add API documentation for Supabase functions
- [ ] Add contribution guidelines
- [ ] Add architecture diagrams

## 🚀 Performance Optimizations

- [ ] Implement virtual scrolling for large track lists
- [ ] Optimize bundle size (currently 627 kB)
  - Consider code splitting by route
  - Lazy load heavy components
  - Tree-shake unused dependencies
  
- [ ] Add service worker for caching
- [ ] Optimize image loading with Next-gen formats (WebP, AVIF)
- [ ] Implement request deduplication for Spotify API

## 📊 Analytics & Monitoring

- [ ] Add error tracking (Sentry)
- [ ] Add analytics (Plausible/PostHog)
- [ ] Track user engagement metrics
- [ ] Monitor API rate limits
- [ ] Set up performance monitoring (Web Vitals)

## 🔐 Security

- [ ] Add rate limiting for API endpoints
- [ ] Implement CSRF protection
- [ ] Add input sanitization
- [ ] Security audit for XSS vulnerabilities
- [ ] Regular dependency updates
- [ ] Add security headers

---

**Last Updated**: January 21, 2026
**Total Completed**: 30+ features
**Total Pending**: 35+ tasks
**Priority**: Database setup, API integrations, Queue UI
