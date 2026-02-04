# Code Review Checklist

This checklist is the default for every PR / code review in Clade. It’s designed to keep `main` deployable and prevent “blank page” regressions.

---

## ✅ Required (Most PRs)

### Build & Tests
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run build`

### Product / UX
- [ ] No blank screen on load (verify on `/clademusic/` + `/clademusic/feed`)
- [ ] New errors are handled gracefully (error boundaries, toasts, fallbacks)
- [ ] Loading/empty/error states are reasonable
- [ ] Mobile layout still works (at least one quick smoke check)

### Docs & Versioning
- [ ] `CHANGELOG.md` updated (Unreleased or a new version section)
- [ ] Docs updated if behavior/config changed (`docs/*`)
- [ ] If this is release-ready: `package.json` version bumped

---

## 🎧 Player / Providers (When touching playback)

- [ ] Switching tracks does not replay the previous track
- [ ] Provider switching works (Spotify ↔ YouTube) without crashing the app
- [ ] QuickStream buttons open the intended provider for the selected track
- [ ] When provider auth is missing/invalid, UI falls back without breaking the feed

---

## 🔐 OAuth / Auth (When touching Spotify/Last.fm/Supabase auth)

- [ ] Redirect URIs match environment (`/clademusic/spotify-callback` in production)
- [ ] Connected state updates without page refresh (React Query cache invalidation)
- [ ] Token errors are surfaced (toast/log) and don’t cause infinite reconnect loops

---

## 🚀 Deployment / CI (When changing workflows or build config)

- [ ] GitHub Actions workflows still pass on PR (`CI`, `Deploy` build job)
- [ ] Pages deploy still runs on push to `main` (`Deploy` workflow)
- [ ] Vite `base` stays aligned with Pages path (`/clademusic/`)

---

## Notes

- For the release workflow, see `docs/RELEASE_PROCESS.md`.

