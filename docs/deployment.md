# Deployment

## Deploying to GitHub Pages

This repo is configured to deploy under `https://kaospan.github.io/clademusic/`.

1. Confirm Vite base path is set:
   - `vite.config.ts`: `base: "/clademusic/"`

2. Deploy:
   ```bash
   bun run deploy
   ```
3. Your site will be live at:
   https://kaospan.github.io/clademusic/

**Notes**
- React Router uses `basename={import.meta.env.BASE_URL}` (no hard-coded `/clademusic` needed).
- GitHub Actions can deploy automatically via `.github/workflows/cd.yml`.
