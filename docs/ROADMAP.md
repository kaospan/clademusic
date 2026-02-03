# 🗺️ Clade Development Roadmap

**Last Updated**: February 3, 2026

This roadmap consolidates all pending tasks, user requests, and feature backlog into a prioritized development plan.

---

## 🚨 Phase 1: Critical Infrastructure (Week 1-2)

### Admin Dashboard System
**Owner**: repoisrael@gmail.com  
**Priority**: 🔴 URGENT  
**Status**: In Progress (core admin plumbing + dashboard shell implemented)

#### 1.1 Admin Role Setup
- [ ] Update `user_roles` table: Set repoisrael@gmail.com as admin
- [x] Create RLS policies for admin-only access (migrations)
- [x] Add admin hook for role verification (`src/hooks/api/useAdmin.ts`)
- [x] Create `AdminRoute` wrapper component (`src/components/AdminRoute.tsx`)

#### 1.2 Admin Dashboard UI
- [x] Create `/admin` page (tabs-based dashboard shell)
- [x] Add subtle admin link in site settings (visible only to admin)
- [x] Implement dashboard home with key metrics
- [ ] Add richer analytics charts and system panels

#### 1.3 User Management
- [ ] User list with search/filter/pagination
- [ ] User profile viewer with activity history
- [ ] Ban/unban functionality with reason logging
- [ ] Password reset tools
- [ ] Account deletion with cascade cleanup

#### 1.4 Content Moderation
- [ ] Flagged content review queue
- [ ] Chord progression moderation panel
- [ ] Track connection approval workflow
- [ ] Bulk actions (approve/reject/delete)
- [ ] Moderation activity log

#### 1.5 Analytics Dashboard
- [ ] Active users (daily/weekly/monthly)
- [ ] Most played tracks chart
- [ ] Popular chord progressions leaderboard
- [ ] API usage metrics (calls per endpoint)
- [ ] Error rate monitoring with alerts
- [ ] Database size and growth trends

#### 1.6 System Configuration
- [ ] Feature flags panel (toggle features on/off)
- [ ] Rate limit editor (API throttling settings)
- [ ] Credit system configuration
- [ ] Maintenance mode toggle with custom message
- [ ] SMTP/email settings management

**Estimated Time**: 2 weeks  
**Dependencies**: None  
**Deliverables**: 
- `/admin` route with 6 panels
- Admin role enforcement
- User/content management tools

---

## 🎨 Phase 2: Profile Theme System (Week 3-4)

### MySpace meets TikTok Profile Customization
**Priority**: 🔴 URGENT  
**Status**: In Progress (theme editor + schema implemented)

#### 2.1 Profile Theme Editor
- [x] Theme editor modal (`src/components/ThemeEditor.tsx`)
- [x] Color pickers (background, accent, text, etc.)
- [x] Font family selector
- [x] Preset templates (theme presets)
- [x] Custom CSS input (advanced users)
- [ ] Theme reset to default button

#### 2.2 Custom Profile Sections
- [ ] Rich text bio editor (markdown support)
- [ ] Featured tracks showcase (drag-to-reorder)
- [ ] Custom playlists grid display
- [ ] Top progressions visualization
- [ ] Mood board/aesthetic image gallery (3-6 images)
- [ ] Section visibility toggles

#### 2.3 Database Schema
- [x] Create `user_themes` table:
  ```sql
  - id (uuid, pk)
  - user_id (uuid, fk → profiles)
  - theme_name (text)
  - colors (jsonb): {background, accent, text, surface}
  - fonts (jsonb): {heading, body}
  - layout (text): preset name
  - custom_css (text, nullable)
  - is_public (boolean): shareable?
  - created_at, updated_at
  ```
- [x] Add indexes on user_id, is_public
- [x] RLS policies: users edit own themes

#### 2.4 Social Enhancements
- [ ] Profile banner image upload (1500x500px)
- [ ] Custom profile URL slugs (`/u/musiclover123`)
- [ ] Optional visitor counter (privacy toggle)
- [ ] Music player skin customization (3-5 skins)
- [ ] Animated background particles (WebGL, opt-in)
- [ ] Profile badges (Top Listener, Chord Master, etc.)

#### 2.5 Theme Marketplace (Future)
- [ ] Browse community themes page
- [ ] One-click theme import/apply
- [ ] Theme ratings and comments
- [ ] Featured themes curated by admin
- [ ] Theme export/download as JSON

**Estimated Time**: 2 weeks  
**Dependencies**: User authentication (✅), ProfilePage (✅)  
**Deliverables**:
- Theme editor with live preview
- 5+ preset templates
- `user_themes` database table
- Profile banner and custom URLs

---

## 🎵 Phase 3: Harmonic Analysis Enhancement (Week 5-7)

### Advanced Harmonic Features
**Priority**: 🟠 HIGH  
**Status**: In Progress (schema + job runner + realtime wiring implemented; ML pending)

#### 3.1 Database Schema
- [x] Create `harmonic_fingerprints` table (migration)
  ```sql
  - id, track_id (fk → tracks)
  - progression (jsonb): Roman numeral array
  - key_signature, mode
  - cadence_type, loop_length_bars
  - confidence_score (0.0-1.0)
  - analysis_method (manual/ml/api)
  - analyzed_at
  ```
- [x] Create `analysis_jobs` table (queue management)
- [ ] Create `track_connections` table:
  ```sql
  - id, from_track_id, to_track_id
  - connection_type (sample/cover/remix/interpolation/reference)
  - confidence (0.0-1.0)
  - evidence_url, evidence_text
  - created_by (user_id)
  - verified_by_admin (boolean)
  ```

#### 3.2 ML Audio Analysis
- [ ] Research Essentia.js vs Web Audio API
- [ ] Implement chroma feature extraction
- [ ] Key and mode detection algorithm
- [ ] Chord progression identification (spectral analysis)
- [ ] Section boundary detection (audio novelty)
- [ ] Confidence score calculation (cross-validation)

#### 3.3 Background Processing
- [x] Supabase Edge Function for async analysis (`supabase/functions/harmonic-analysis`)
- [ ] Job queue system (priority queue: user-requested > batch)
- [x] Real-time progress updates (Supabase Realtime)
- [ ] Error handling and retry logic (3 attempts)
- [ ] Rate limiting (100 jobs/hour per user)

#### 3.4 Advanced Matching Algorithms
- [ ] **Progression rotation matching**: I-V-vi-IV ≈ V-vi-IV-I
- [ ] **Borrowed chord detection**: Identify chords from parallel modes
- [ ] **Modulation detection**: Track key changes within songs
- [ ] **Section-aware progressions**: Different progressions per section (verse/chorus/bridge)
- [ ] **ML embeddings**: Semantic similarity beyond exact matching
- [ ] **Harmonic clustering**: t-SNE visualization of similar tracks

#### 3.5 Crowd-Sourced Corrections
- [ ] User feedback mechanism: "Is this analysis correct?"
- [ ] Manual progression editor (admin/verified users)
- [ ] Voting system for disputed progressions
- [ ] Audit log for all manual edits
- [ ] Confidence boost for verified human corrections

**Estimated Time**: 3 weeks  
**Dependencies**: Supabase Edge Functions, Audio analysis library  
**Deliverables**:
- 3 new database tables
- ML-powered chord detection
- Background job processing
- Advanced similarity matching

---

## 🔌 Phase 4: API Integrations (Week 8-9)

### Third-Party API Integration
**Priority**: 🟠 HIGH  
**Status**: Placeholder Implementation

#### 4.1 Hooktheory API
- [ ] Get API key from hooktheory.com
- [ ] Implement `/api/hooktheory` service with caching
- [ ] Map TheoryTab chord data to Track type
- [ ] Add "Powered by Hooktheory" attribution
- [ ] Rate limiting (100 calls/day free tier)
- [ ] Error handling for API downtime

#### 4.2 WhoSampled API
- [ ] Get API key from whosampled.com
- [ ] Implement `/api/whosampled` service
- [ ] Parse sample/cover relationships
- [ ] Display in ConnectionsPage with evidence links
- [ ] Cache responses (24hr TTL)
- [ ] Fallback to manual user submissions

#### 4.3 YouTube Music OAuth
- [ ] Add YouTube OAuth flow to ProfilePage
- [ ] Fetch user's YouTube Music library
- [ ] Map YouTube tracks to Spotify/Apple Music equivalents
- [ ] Display YouTube listening history
- [ ] Sync play counts (opt-in)

#### 4.4 Last.fm Scrobbling
- [ ] Enable real-time scrobbling from Clade player
- [ ] Batch scrobble when user re-connects Last.fm
- [ ] Handle API errors gracefully
- [ ] Display scrobble status in player UI

**Estimated Time**: 2 weeks  
**Dependencies**: API keys, OAuth credentials  
**Deliverables**:
- 4 new API integrations
- Cached responses with React Query
- Error handling and rate limiting

---

## 🎛️ Phase 5: Player & Queue Enhancements (Week 10-11)

### Improved Playback Experience
**Priority**: 🟡 MEDIUM  
**Status**: Basic Implementation Complete

#### 5.1 Queue Management UI
- [ ] Dedicated `/queue` page
- [ ] Drag-to-reorder queue items
- [ ] Bulk actions (clear queue, shuffle, save as playlist)
- [ ] Queue history (last 50 tracks)
- [ ] Smart queue suggestions based on current track

#### 5.2 Playback Features
- [ ] Crossfade between tracks (1-10s)
- [ ] Gapless playback for albums
- [ ] Speed control (0.5x - 2x)
- [ ] Pitch adjustment (±6 semitones)
- [ ] Audio normalization (ReplayGain)
- [ ] Sleep timer with fade-out

#### 5.3 Video Player
- [ ] Fullscreen video mode for YouTube embeds
- [ ] Picture-in-picture support
- [ ] Video quality selector (auto/720p/1080p)
- [ ] Timestamp-based section navigation (from SongSections)
- [ ] Video chapters integration

#### 5.4 Lyrics Integration
- [ ] Musixmatch API integration
- [ ] Display time-synced lyrics (karaoke mode)
- [ ] Manual lyrics submission by users
- [ ] Highlight current line during playback
- [ ] Lyrics search functionality

**Estimated Time**: 2 weeks  
**Dependencies**: YouTube API, Musixmatch API  
**Deliverables**:
- Queue management page
- Advanced playback controls
- Fullscreen video player
- Time-synced lyrics

---

## 📱 Phase 6: Social Features (Week 12-14)

### Community & Sharing
**Priority**: 🟡 MEDIUM  
**Status**: Not Started

#### 6.1 Social Interactions
- [ ] Follow/unfollow users
- [ ] User activity feed (following's plays, likes, comments)
- [ ] Notifications system (new follower, comment reply, mention)
- [ ] User mentions in comments (@username)
- [ ] Track/playlist sharing to social media (Twitter, Discord)

#### 6.2 Playlists
- [ ] Create/edit/delete playlists
- [ ] Collaborative playlists (multi-user edit)
- [ ] Playlist covers (auto-generate or custom upload)
- [ ] Smart playlists (auto-update based on filters)
- [ ] Playlist folders/organization
- [ ] Import/export playlists (JSON, M3U, Spotify CSV)

#### 6.3 Listening Parties
- [ ] Create listening party rooms
- [ ] Real-time synchronized playback
- [ ] Live chat during playback
- [ ] DJ mode (host controls queue)
- [ ] Invite system (public/private rooms)
- [ ] Voting on next track

#### 6.4 Challenges & Gamification
- [ ] Weekly listening challenges
- [ ] Chord progression identification quiz
- [ ] Leaderboards (most plays, best ears, top contributor)
- [ ] Badges and achievements
- [ ] Streak counters (daily listening streaks)

**Estimated Time**: 3 weeks  
**Dependencies**: Real-time infrastructure (WebSockets), notification system  
**Deliverables**:
- Follow system with activity feed
- Collaborative playlists
- Listening party rooms
- Gamification features

---

## ⚡ Phase 7: Performance & Optimization (Week 15-16)

### Speed & Efficiency Improvements
**Priority**: 🟡 MEDIUM  
**Status**: Baseline Established

#### 7.1 Frontend Optimization
- [ ] Virtual scrolling for long track lists (react-window)
- [ ] Code splitting by route (React.lazy)
- [ ] Image optimization (WebP, AVIF with fallbacks)
- [ ] Font subsetting (load only used glyphs)
- [ ] Bundle size reduction (tree-shaking, minification)
- [ ] Service worker for offline support

#### 7.2 Backend Optimization
- [ ] Database query optimization (indexes, EXPLAIN ANALYZE)
- [ ] Response caching (Redis or in-memory)
- [ ] CDN for static assets
- [ ] Image CDN for album art (Cloudinary/imgix)
- [ ] Lazy loading for below-the-fold content

#### 7.3 Monitoring & Analytics
- [ ] Sentry for error tracking
- [ ] Plausible/Umami for privacy-friendly analytics
- [ ] Web Vitals monitoring (CWV dashboard)
- [ ] Uptime monitoring (UptimeRobot/Better Uptime)
- [ ] Automated performance budgets (Lighthouse CI)

**Estimated Time**: 2 weeks  
**Dependencies**: None  
**Deliverables**:
- <300KB initial bundle size
- <2s Time to Interactive
- Offline support (PWA)
- Real-time error monitoring

---

## 🔒 Phase 8: Security & Privacy (Week 17)

### Security Hardening
**Priority**: 🟢 LOW (Security already good)  
**Status**: Basic Security in Place

#### 8.1 Security Enhancements
- [ ] Content Security Policy (CSP) headers
- [ ] Rate limiting on auth endpoints (prevent brute force)
- [ ] CAPTCHA for signup/login (hCaptcha)
- [ ] Session timeout and renewal
- [ ] Audit logs for sensitive actions
- [ ] SQL injection prevention audit (parameterized queries)

#### 8.2 Privacy Features
- [ ] Privacy settings page (profile visibility, data sharing)
- [ ] Data export tool (GDPR compliance)
- [ ] Account deletion with data purge
- [ ] Cookie consent banner (EU compliance)
- [ ] Anonymous mode (browse without tracking)
- [ ] Third-party cookie blocking

**Estimated Time**: 1 week  
**Dependencies**: None  
**Deliverables**:
- Enhanced security headers
- GDPR-compliant data tools
- Privacy settings panel

---

## 🎯 Phase 9: Mobile App (Week 18-22)

### Native Mobile Experience
**Priority**: 🟢 LOW (Future Consideration)  
**Status**: Not Started

#### 9.1 Progressive Web App (PWA)
- [ ] Service worker with offline caching
- [ ] Add to home screen prompt
- [ ] Push notifications (new releases, friend activity)
- [ ] Background sync for play history
- [ ] App-like navigation (no browser chrome)

#### 9.2 React Native App (Optional)
- [ ] Port web app to React Native
- [ ] Native audio playback (react-native-track-player)
- [ ] iOS App Store submission
- [ ] Android Play Store submission
- [ ] Deep linking (open Clade from Spotify/YouTube)
- [ ] Background playback support

**Estimated Time**: 4+ weeks  
**Dependencies**: PWA infrastructure  
**Deliverables**:
- PWA with offline support
- Optional native iOS/Android apps

---

## 📊 Backlog (No Timeline)

### Future Considerations
**Priority**: 🟢 LOW  
**Status**: Ideas for Future

- [ ] AI-generated chord progressions (GPT-style model)
- [ ] Voice search ("Find songs like Bohemian Rhapsody")
- [ ] Album/Artist pages with full discographies
- [ ] Genre-based radio stations
- [ ] Collaborative filtering recommendations
- [ ] Integrated music theory lessons (interactive)
- [ ] Sheet music generation from chord progressions
- [ ] MIDI export of progressions
- [ ] Integration with DAWs (Ableton Link)
- [ ] Podcast support (music-related shows)
- [ ] Concert/tour date integration (Songkick API)
- [ ] Merchandise integration (artist merch shops)
- [ ] Ticketing integration (show tickets)
- [ ] Music journalism (blog posts, reviews)
- [ ] Artist verification badges
- [ ] Label partnerships (new release promotions)

---

## 🎓 Documentation & Testing

### Continuous Improvements
**Priority**: 🟡 MEDIUM  
**Status**: Ongoing

- [ ] Unit tests for all services (Vitest)
- [ ] E2E tests for critical flows (Cypress)
- [ ] Component testing with Storybook
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Code coverage >80%
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Browser compatibility testing
- [ ] Performance benchmarks
- [ ] Load testing (k6)
- [ ] User documentation (wiki/help center)
- [ ] Video tutorials (YouTube channel)
- [ ] Developer onboarding guide

---

## 📈 Success Metrics

### KPIs to Track

**User Engagement**:
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Average session duration
- Tracks played per session
- Return rate (7-day, 30-day)

**Technical Performance**:
- Page load time (target: <2s)
- Time to Interactive (target: <3s)
- Error rate (target: <0.5%)
- API response time (target: <200ms)
- Uptime (target: 99.9%)

**Feature Adoption**:
- % users with custom themes
- Harmonic analysis requests per day
- Playlist creation rate
- Social interactions (follows, comments)
- Admin dashboard usage

---

## 🚀 Release Strategy

### Version Milestones

**v1.0.0 - MVP** (Current)
- ✅ Track discovery and playback
- ✅ Harmonic analysis architecture
- ✅ Responsive desktop UI
- ✅ User profiles and auth
- ✅ Spotify/Last.fm integration

**v1.1.0 - Admin & Themes** (Phase 1-2, ~4 weeks)
- Admin dashboard
- Profile theme customization
- User management tools

**v1.2.0 - Harmonic Intelligence** (Phase 3-4, ~5 weeks)
- ML-powered chord detection
- Advanced similarity matching
- API integrations (Hooktheory, WhoSampled)

**v1.3.0 - Enhanced Playback** (Phase 5, ~2 weeks)
- Queue management UI
- Fullscreen video player
- Time-synced lyrics

**v2.0.0 - Social Platform** (Phase 6-8, ~6 weeks)
- Follow system and activity feed
- Collaborative playlists
- Listening parties
- Performance optimization

**v3.0.0 - Mobile** (Phase 9, ~4+ weeks)
- PWA with offline support
- Optional native apps

---

## 📝 Notes

**Development Principles**:
1. Ship incremental value (small PRs, frequent deploys)
2. Test before merging (unit + E2E coverage)
3. Document as you build (README, docs, changelogs)
4. Monitor in production (errors, performance, usage)
5. Gather user feedback early and often

**Tech Debt Management**:
- Refactor when touching existing code
- Maintain <5% duplication rate
- Update dependencies monthly
- Run security audits quarterly

**Community Involvement**:
- Open source roadmap (GitHub Projects)
- Feature voting system (users vote on priorities)
- Beta testing program (early access for power users)
- Bug bounty program (responsible disclosure)

---

**Last Reviewed**: February 3, 2026  
**Next Review**: March 3, 2026  
**Maintained By**: kaospan@gmail.com
