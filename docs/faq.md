# FAQ

**Q: My Spotify login isn’t working!**  
A: Check all of the following:
- Your `VITE_SPOTIFY_REDIRECT_URI` exactly matches the redirect URI in the Spotify Developer Dashboard.
- If the Spotify app is in **Development Mode**, your Spotify account must be added as an allowed user.
- If you see `403` from `api.spotify.com/v1/me`, it often indicates dev-mode allowlist issues (not a code bug).

**Q: The app is blank on GitHub Pages!**  
A: Usually one of these:
- You opened the wrong path. The app lives under: `https://kaospan.github.io/clademusic/`
- Your Vite `base` is wrong. It must be `"/clademusic/"` in `vite.config.ts`.
- Your router basename is wrong. It should be `basename={import.meta.env.BASE_URL}`.
- A stale cached build is trying to load missing hashed chunks. Hard-refresh (Ctrl+F5). The app also attempts a one-time cache-busting reload automatically.

**Q: How do I reset my database?**  
A: Use the provided seed scripts or reset via Supabase dashboard.

**Q: CI deploy failed with `bun install --frozen-lockfile`**  
A: Your `bun.lockb` is out of sync with `package.json`. Run `bun install` and commit the updated lockfile.
