# Getting Started

## Prerequisites
- Bun (required)
- Git

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/kaospan/clademusic.git
   cd clademusic
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Start the dev server:
   ```bash
   bun run dev
   ```
   Open: http://localhost:8080/clademusic/

## Environment Variables
Create a `.env.local` file in the project root (recommended).

- Get Supabase keys from your Supabase dashboard.
- Get Spotify keys from your Spotify Developer Dashboard (optional).

### Example
```env
# Supabase (required for most features)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Spotify OAuth (optional)
VITE_SPOTIFY_CLIENT_ID=...
# Local dev (Vite runs at /clademusic/ in this repo)
VITE_SPOTIFY_REDIRECT_URI=http://localhost:8080/clademusic/spotify-callback

# Production (GitHub Pages)
# VITE_SPOTIFY_REDIRECT_URI=https://kaospan.github.io/clademusic/spotify-callback
```
