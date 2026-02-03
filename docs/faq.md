# FAQ

**Q: My Spotify login isn’t working!**  
A: Make sure your `VITE_SPOTIFY_REDIRECT_URI` matches the one set in your Spotify Developer Dashboard.

**Q: The app is blank on GitHub Pages!**  
A: Ensure your Vite `base` is set to `/clademusic/` and React Router uses `basename={import.meta.env.BASE_URL}` (see `vite.config.ts` and `src/App.tsx`).

**Q: How do I reset my database?**  
A: Use the seed scripts (e.g., `bun run seed:reset`) or reset via the Supabase dashboard.
