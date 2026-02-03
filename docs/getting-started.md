# Getting Started

## Prerequisites
- Git
- Bun 1.x (required)
- (Optional) Supabase CLI (for deploying migrations / Edge Functions)

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

## Run Locally
```bash
bun run dev
```
Open `http://localhost:8080/clademusic/`.

## Environment Variables

This app uses Vite env vars (prefixed with `VITE_`). For local overrides, create a `.env.local` file in the project root.

**Required**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SPOTIFY_CLIENT_ID` (for Spotify connect)

**Optional**
- `VITE_SPOTIFY_REDIRECT_URI` (defaults to `${origin}${BASE_URL}spotify-callback`)
- `VITE_LASTFM_API_KEY`
- `VITE_YOUTUBE_API_KEY`

### Spotify Redirect URI Examples
- Production: `https://kaospan.github.io/clademusic/spotify-callback`
- Local: `http://localhost:8080/clademusic/spotify-callback`
