# Deployment

## GitHub Pages (Recommended)

This repo deploys automatically on every push to `main` via GitHub Actions:
- Workflow: `.github/workflows/deploy.yml`
- Default target: GitHub Pages (when `DEPLOY_TARGET` repo variable is unset/empty or `github-pages`)

### Setup (one-time)
1. In GitHub: **Settings → Pages**
   - Source: **GitHub Actions**
2. Ensure build-time env vars exist (GitHub **Secrets/Variables**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)
   - Optional providers: `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_REDIRECT_URI`, `VITE_YOUTUBE_API_KEY`, `VITE_LASTFM_API_KEY`
3. Confirm base path alignment:
   - Vite: `base: "/clademusic/"` in `vite.config.ts`
   - Router: `basename={import.meta.env.BASE_URL}` in `src/App.tsx`

### Deploy
- Merge/push to `main`.
- Watch the **Deploy** workflow in GitHub Actions.

### Verify
- Site: https://kaospan.github.io/clademusic/
- Feed: https://kaospan.github.io/clademusic/feed

---

## Manual Deploy (Optional)

If you want to deploy without GitHub Actions (not recommended for this repo), you can use the `gh-pages` script.

```bash
bun run predeploy
bun run deploy
```
