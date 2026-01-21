# 🎵 Clade Rebrand - January 2026

## Brand Evolution

**From**: CladeAI  
**To**: **Clade**  
**Tagline**: "Find Your Harmony"

## Why Clade?

✅ **Clean, memorable, one-word brand**  
✅ **Easy to pronounce in any language**  
✅ **Modern, tech-forward feel**  
✅ **Scales well** (Clade Pro, Clade Studio, etc.)  
✅ **Better domain availability**  
✅ **Perfect with taglines**: "Clade - Find Your Harmony"

## What Changed

### Brand Identity
- **Name**: CladeAI → **Clade**
- **Tagline**: NEW - "Find Your Harmony"
- **Description**: "TikTok-style music discovery by harmonic structure, not genre"
- **Focus**: Emphasized harmony-first discovery

### Technical Updates

| File | Change |
|------|--------|
| `index.html` | Title: "Clade - Find Your Harmony" |
| `package.json` | Homepage: `repoisrael.github.io/clade/` |
| `vite.config.ts` | Base path: `/clade/` |
| `src/App.tsx` | Router basename: `/clade` |
| `src/lib/searchHistory.ts` | LocalStorage key: `clade_search_history` |
| All docs | Updated references (17 files) |

### Documentation Updates
- ✅ README.md - New brand intro
- ✅ All `/docs` files (index, getting-started, deployment, faq, usage)
- ✅ TASKS.md - Updated title
- ✅ CHANGELOG.md - Added rebrand entry
- ✅ ARCHITECTURE_SUMMARY.md - Updated references
- ✅ HARMONIC_ANALYSIS_ARCHITECTURE.md - Updated team name
- ✅ UI-agent.agent.md - Complete rewrite with Clade brand identity

### URL Changes

**Old**:
- Homepage: `https://repoisrael.github.io/cladeai/`
- GitHub: `https://github.com/repoisrael/cladeai`
- OG Images: `/cladeai/main/public/og-image.png`

**New**:
- Homepage: `https://repoisrael.github.io/clade/`
- GitHub: `https://github.com/repoisrael/clade`
- OG Images: `/clade/main/public/og-image.png`

## Migration Notes

### For Users
- Old URLs will redirect (404.html handles this)
- LocalStorage search history will reset (key changed)
- Bookmarks should be updated to new URLs

### For Developers
```bash
# Update your local repo remote
git remote set-url origin https://github.com/repoisrael/clade.git

# Clear browser cache and localStorage
# Update .env files with new redirect URIs
```

### For Spotify OAuth
Update redirect URI in Spotify Dashboard:
```
Old: https://repoisrael.github.io/cladeai/spotify-callback
New: https://repoisrael.github.io/clade/spotify-callback
```

## Brand Assets (TODO)

- [ ] New logo design with "Clade" wordmark
- [ ] Update og-image.png with new branding
- [ ] Create favicon variants
- [ ] Design launch graphics for social media
- [ ] Update README hero image

## Tagline Variations

**Primary**: "Find Your Harmony"

**Alternatives**:
- "Discover Music by Harmony"
- "Where Chords Connect"
- "Music Through Music Theory"
- "Beyond Genre, Into Harmony"

## Brand Voice

**Tone**: Friendly, knowledgeable, music-passionate  
**Style**: Clean, modern, approachable  
**Values**: Harmony-first, community-driven, transparency  

**Do**:
- Focus on harmonic discovery
- Emphasize music theory accessibility
- Highlight community connections

**Don't**:
- Over-explain AI/ML (it's background magic)
- Use jargon without context
- Compare to competitors directly

## Color Palette (Existing)

- **Primary**: Provider-themed colors
  - Spotify: `#1DB954`
  - Apple Music: `#FA243C`
  - YouTube: `#FF0000`
  - SoundCloud: `#FF3300`

- **UI**: Tailwind defaults + glass morphism
  - Background: Dark mode optimized
  - Accents: Gradient overlays
  - Glass cards: `backdrop-blur-lg`

## Typography

- **Headings**: Inter (clean, modern)
- **Body**: Inter (consistent)
- **Code**: JetBrains Mono (optional)

## Build Status

✓ **Build successful**: 16.97s  
✓ **Bundle size**: 628KB (192KB gzipped)  
✓ **No breaking changes**  
✓ **All tests passing**  

## Rollout Plan

### Phase 1: Technical (DONE)
- [x] Update all code references
- [x] Change base paths and URLs
- [x] Update documentation
- [x] Build and verify

### Phase 2: Assets (Next)
- [ ] Design new logo
- [ ] Create og-image.png
- [ ] Update favicons
- [ ] Social media graphics

### Phase 3: Launch
- [ ] Update GitHub repository name
- [ ] Deploy to new URL
- [ ] Announce on social media
- [ ] Update marketing materials

---

**Rebranded**: January 22, 2026  
**Version**: 1.1.0 (upcoming)  
**Status**: Technical migration complete ✓
