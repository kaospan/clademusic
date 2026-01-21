# 🎵 Harmony Hub

A music discovery app that helps you find songs based on **harmonic progressions** and connect with listeners who share your taste.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-cyan?logo=tailwindcss)

## ✨ Features

### 🎶 Harmonic Discovery
- **Chord Progression Search** — Find songs by their harmonic structure (e.g., vi–IV–I–V)
- **Progression Archetypes** — Explore popular chord patterns like the "Axis of Awesome" or "50s Progression"
- **Taste DNA** — Track your listening preferences and favorite progressions

### 🎧 Multi-Platform Streaming
- **Spotify Integration** — Connect your Spotify account to sync listening history
- **Quick Stream Buttons** — One-tap access to play songs on Spotify or YouTube
- **Embedded YouTube Player** — Watch music videos without leaving the app

### 👥 Social Features
- **Follow Friends** — See what others are listening to
- **Nearby Listeners** — Discover people nearby playing the same tracks
- **Comments & Reactions** — Discuss songs with the community

### 🔗 Track Connections
- **Sample Relationships** — See which songs sample or are sampled by others
- **Cover Versions** — Discover original versions and covers
- **Interpolations** — Find songs with similar melodic elements

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- **Bun** (optional, for faster installs) or **npm/yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/repoisrael/harmony-hub.git
cd harmony-hub

# Install dependencies
bun install
# or: npm install

# Start the development server
bun dev
# or: npm run dev
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
│   ├── shared/          # Layout, EmptyState, LoadingSpinner
│   └── ui/              # shadcn/ui primitives
├── hooks/               # React hooks
│   └── api/             # Data fetching hooks (React Query)
├── lib/                 # Utilities & helpers
│   ├── animations.ts    # Framer Motion variants
│   ├── constants.ts     # App-wide constants
│   └── providers.ts     # Music provider utilities
├── pages/               # Route pages
├── player/              # Embedded player components
└── types/               # TypeScript types
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Animations** | Framer Motion |
| **State Management** | TanStack Query (React Query) |
| **Backend** | Supabase (Auth, Postgres, Edge Functions) |
| **Testing** | Vitest |

## 📱 Key Pages

| Route | Description |
|-------|-------------|
| `/` | Feed — Swipe through tracks with harmonic analysis |
| `/search` | Search songs by name or chord progression |
| `/following` | Activity feed from people you follow |
| `/profile` | Your taste DNA, connected services, play history |
| `/connections` | Track relationships (samples, covers, etc.) |

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

The app is designed to be deployed on any static hosting platform:

```bash
# Build the app
bun run build

# The `dist/` folder contains the production build
```


Recommended platforms:
- **GitHub Pages** — Free static hosting (see below)
- **Vercel** — Zero-config React deployment
- **Netlify** — Great for static sites
- **Cloudflare Pages** — Edge-first hosting

### Deploying to GitHub Pages

1. Make sure your `package.json` includes:

  ```json
  "homepage": "https://repoisrael.github.io/harmony-hub",
  "scripts": {
    "predeploy": "bun run build",
    "deploy": "gh-pages -d dist"
  }
  ```

2. Install the `gh-pages` package if you haven't already:

  ```bash
  bun add -D gh-pages
  # or: npm install --save-dev gh-pages
  ```

3. Deploy:

  ```bash
  bun run deploy
  # or: npm run deploy
  ```

Your site will be live at https://repoisrael.github.io/harmony-hub

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
  Made with 🎵 by <a href="https://github.com/repoisrael">repoisrael</a>
</p>
