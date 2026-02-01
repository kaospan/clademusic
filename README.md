# 🎵 Clade

**Find Your Harmony**

A TikTok-style music discovery platform that helps you find songs based on **harmonic progressions**, not genre. Connect with listeners who share your taste through the universal language of chord progressions.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-cyan?logo=tailwindcss)

## ✨ Features

### 🎶 Harmonic Analysis & Discovery
- **Relative theory-based analysis** — Songs analyzed by Roman numeral progressions (I-V-vi-IV), not absolute chords
- **Hybrid analysis pipeline** — Instant cached results + async ML processing for new tracks
- **Confidence scoring** — All analyses labeled with confidence levels (High/Medium/Low/Provisional)
- **Smart similarity matching** — Find tracks by harmonic structure: progression shape (50%), cadence type (20%), loop length (15%), modal color (10%)
- **Cost-efficient at scale** — Aggressive caching (90-day TTL), ISRC deduplication, batch processing
- **Section-aware navigation** — Jump to specific song sections (verse, chorus, bridge) with one tap

### 🎧 Multi-Platform Streaming
- **YouTube & Spotify** — Seamless playback with embedded players
- **Quick stream buttons** — One-tap access to Apple Music, Deezer, SoundCloud
- **Provider badges** — Visual indicators for available platforms
- **Floating players** — Picture-in-picture mode with active player z-index management

### 👥 Social Features
- **Following system** — Track friends and discover their music taste
- **Live comments** — Real-time discussion on tracks
- **Nearby listeners** — See who's listening to similar music around you
- **Play history** — Complete listening history with clickable tracks

### 🔗 Track Connections
- **Sample detection** — Find original samples and tracks that sample this song
- **Cover versions** — Discover different interpretations
- **Remix relationships** — Track the remix tree

### 📊 Rich Metadata
- **Song credits** — Songwriter, producer, label, release date
- **BPM & Key** — Detected tempo and harmonic key with confidence scores
- **Genre tags** — Multiple genre classifications
- **Chord progressions** — Visual chord badges with Roman numeral display

### 🎨 Responsive Desktop UI
- **Widescreen layouts** — Professional multi-column desktop interface
- **Adaptive breakpoints** — Optimized for sm/md/lg/xl/2xl screens (640px-1536px+)
- **Desktop sidebars** — Track metadata, keyboard shortcuts, progress indicators
- **Mobile-first design** — Seamless experience across all devices

## 🚀 Quick Start

### Prerequisites


### Installation

```bash
# Clone the repository
git clone https://github.com/kaospan/clademusic.git
cd clademusic

# Install dependencies
bun install
# or: bun install

# Start the development server
bun dev
# or: bun run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Spotify OAuth (optional)
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/api/spotify-callback
```

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/          # ResponsiveLayout, DesktopColumns, DesktopSidebar
│   ├── shared/          # Layout, EmptyState, LoadingSpinner
│   ├── ui/              # shadcn/ui primitives + ProviderBadge, GlassCard
│   └── AnalysisStatusBadge.tsx  # Harmonic confidence indicators
├── hooks/               # React hooks
│   └── api/             # Data fetching hooks (React Query)
├── lib/                 # Utilities & helpers
│   ├── animations.ts    # Framer Motion variants
│   ├── constants.ts     # App-wide constants
│   ├── formatters.ts    # formatBPM, formatRelativeTime, capitalize
│   ├── providers.ts     # Music provider utilities
│   └── sections.ts      # Section timestamp utilities
├── pages/               # Route pages (responsive layouts)
├── player/              # Embedded player components
├── services/            # Business logic layer
│   ├── harmonicAnalysis.ts    # Hybrid analysis pipeline
│   ├── similarityEngine.ts    # Track matching algorithm
│   └── lastfmService.ts       # External API integrations
├── types/               # TypeScript types
│   ├── harmony.ts       # Harmonic analysis types
│   └── index.ts         # Core Track, User types
└── contexts/            # React Context providers
  ├── QueueContext.tsx         # Playback queue management
  └── YouTubePlayerContext.tsx # Player iframe helpers
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18 + TypeScript (Strict Mode) |
| **Build Tool** | Vite 5.4.19 |
| **Styling** | Tailwind CSS + shadcn/ui + Responsive Breakpoints |
| **Animations** | Framer Motion |
| **State Management** | TanStack Query (React Query) + Context API |
| **Backend** | Supabase (Auth, Postgres, Edge Functions) |
| **Music Theory** | Custom Harmonic Analysis Engine |
| **Audio Analysis** | ML-ready pipeline (Essentia.js integration pending) |
| **Testing** | Vitest + Cypress (E2E) |

## 📱 Key Pages

| Route | Description |
|-------|-------------|
| `/` | **Feed** — TikTok-style track discovery with desktop sidebar, progress tracking, and keyboard shortcuts |
| `/search` | **Search** — Find songs by name/artist or chord progression patterns (e.g., "I-V-vi-IV") |
| `/following` | **Following** — Activity feed from people you follow with play events |
| `/profile` | **Profile** — Your taste DNA, connected services, complete play history with clickable tracks |
| `/connections` | **Connections** — Track relationships (samples, covers, remixes) with network visualization |
| `/compare` | **Compare** — Side-by-side harmonic analysis comparison tool |
| `/track/:id` | **Track Detail** — Full metadata, credits, sections, similar tracks by harmony |

## 🔧 Development

```bash
# Run development server with hot reload
bun dev

# Type checking
bun run typecheck

# Run tests
bun test

# Build for production
bun run build

# Preview production build
bun run preview
```

## 📦 Deployment


### Deploying to GitHub Pages

1. Ensure your `package.json` includes:

   ```json
   "homepage": "https://kaospan.github.io/clademusic/",
   "scripts": {
     "predeploy": "bun run build && echo . > dist/.nojekyll",
     "deploy": "bun run build && gh-pages -d dist"
   }
   ```

2. Install the `gh-pages` package if you haven't already:

   ```bash
   bun add -D gh-pages
   # or: bun install --save-dev gh-pages
   ```

3. Deploy:

   ```bash
   bun run deploy
   # or: bun run deploy
   ```

4. Go to your GitHub repository settings → Pages, and set the source to the `gh-pages` branch. Your site will be live at:

   https://kaospan.github.io/clademusic/

**Note:** The build output is in the `dist/` folder. The `.nojekyll` file disables Jekyll processing for static assets.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
---

<p align="center">
  Made with 🎵 by <a href="https://github.com/kaospan">kaospan</a>
</p>

