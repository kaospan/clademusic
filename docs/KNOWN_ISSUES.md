# Known Issues

This page tracks user-visible problems that are either unresolved or have important operational notes.

---

## Open

### Spotify
- **403 on `api.spotify.com/v1/me` after connecting**
  - Usually means the Spotify app is in **Development Mode** and the current user is not on the allowlist in the Spotify Developer Dashboard.
- **QuickStream sometimes plays the previous track**
  - Symptoms: after playing track A, selecting track B starts track A again unless the page is refreshed.
- **When Spotify is connected, preview audio still plays instead of full track**
  - Expected: Spotify-connected users should get full playback (where supported by auth + account type).

---

## Recently Resolved

### 1.0.1 (2026-02-04)
- Prevented “blank screen” crashes by adding app/route/player error boundaries
- Fixed build-breaking hidden characters accidentally committed into source files

