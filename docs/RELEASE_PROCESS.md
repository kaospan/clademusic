# Release Process (Web)

Clade uses Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.

- **`package.json`** is the canonical app version used for releases.
- **`CHANGELOG.md`** is the canonical human-readable history (Keep a Changelog format).

---

## Regular Releases

1. **Update changelog**
   - Move items from `Unreleased` into a new version section: `## [X.Y.Z] - YYYY-MM-DD`
   - Keep entries grouped under `Added / Changed / Fixed / Security`

2. **Bump version**
   - Update `package.json` `"version"` to match `CHANGELOG.md`

3. **Verify locally**
   - `bun run lint`
   - `bun run typecheck`
   - `bun run test`
   - `bun run build`

4. **Merge to `main`**
   - GitHub Actions runs `CI`
   - GitHub Actions runs `Deploy` on push to `main` and publishes to GitHub Pages by default

5. **Tag the release (recommended)**
   - Create a git tag: `vX.Y.Z`
   - Create GitHub release notes from `CHANGELOG.md`

---

## Hotfix Releases

Use a hotfix when `main` is broken or production needs an urgent patch.

1. Land the minimal fix to `main`
2. Cut a patch version: `X.Y.(Z+1)`
3. Document under `Fixed` in `CHANGELOG.md`

---

## Rollback

If production is broken after a deploy:

- Revert the offending commit(s) on `main`
- Push to `main` (auto-deploy runs again)

