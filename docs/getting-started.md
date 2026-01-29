# Getting Started

## Prerequisites
- Node.js 18+
- Bun (optional) or npm/yarn
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
   # or: npm install
   ```

## Environment Variables
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Fill in your values in `.env`:
   - Get Supabase keys from your Supabase dashboard.
   - Get Spotify keys from your Spotify Developer Dashboard.
   - For production:
     ```
     VITE_SPOTIFY_REDIRECT_URI=https://kaospan.github.io/clademusic/spotify-callback
     ```
   - For local development:
     ```
     VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/spotify-callback
     ```
