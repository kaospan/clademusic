# Universal Player + Licensing Model (Global + Israel)

## Executive framing (what Clade is / is not)

Clade is a **controller and analytics layer** for licensed playback experiences.

Clade is **not**:
- a digital service provider (DSP) that transmits audio files,
- a rebroadcaster of provider streams,
- a DRM bypass tool,
- an offline cache or download product.

Clade **does**:
- initiate playback using **official provider mechanisms** (SDKs, embeds, link-outs),
- maintain a single “universal player” UX across providers,
- measure user engagement as internal analytics (truthfully labeled),
- present credits/attribution metadata (provider-sourced now; rights-grade via licensed metadata later).

This separation is the key compliance principle: **the licensed provider remains the service delivering the audio**.

## 1) How streaming licensing works (in practice)

Most commercial music has two separate copyrights:

1) **Sound recording (“master”)**  
   Controlled by labels/distributors/artists.
2) **Musical work (“composition/publishing”)**  
   Controlled by songwriters/publishers; administered through publishers + collecting societies.

Interactive streaming services (Spotify/Apple Music) clear both categories at scale via:
- master licenses (usually direct commercial deals),
- publishing licenses (performance + mechanical, via territory-specific structures),
- reporting/audit requirements.

Video platforms (YouTube) use a different structure that mixes platform licenses, rights-holder policies, and content identification systems.

## 2) Why Clade does not need blanket music licenses (if built correctly)

Clade generally avoids taking on “DSP licensing” obligations if:
- audio playback occurs only through provider SDKs/embeds/link-outs,
- Clade does not transmit or cache audio,
- Clade does not repackage streams or provide alternative playback endpoints,
- Clade honors provider entitlements (e.g., Spotify Premium requirements).

Clade still must comply with:
- provider developer terms, branding requirements, attribution strings,
- API quotas, rate limits, and permitted metadata usage,
- privacy laws (telemetry disclosures, consent where required).

## 3) Provider integration tiers (enforceable design)

### Tier A — SDK playback (highest control, strictest terms)
Examples:
- Spotify Web Playback SDK (premium entitlement)
- Apple Music MusicKit JS (user authorization + Apple developer setup)

Capabilities:
- play/pause/seek/state callbacks (best analytics fidelity)

### Tier B — Official embeds
Examples:
- YouTube IFrame API
- SoundCloud/Bandcamp embeds (where available and permitted)

Capabilities:
- partial state callbacks (YouTube), variable measurement fidelity

### Tier C — Link-out only (still compliant)
Examples:
- Deezer / Amazon Music when no stable approved SDK path exists

Capabilities:
- “Open in provider” + measure outbound click intent (not playback)

## 4) Counting plays per user (internal analytics vs provider “streams”)

Do **not** label internal metrics as “streams” for royalty purposes.

Use definitions that are true and defensible:
- **Playback intent**: user clicked play/open.
- **Playback session**: a bounded session with a session_id.
- **Qualified play (internal)**: exceeded threshold (e.g., 30 seconds of active playback) measured from SDK/embed state when available.

Provider partnerships may enable “official stream” attribution later, but that is contractual and provider-defined.

## 5) Crediting rights holders correctly (realistic approach)

### What you can do immediately (no new licenses)
Provider-sourced attribution:
- artist(s), track title, album, label (if exposed), ISRC (sometimes)
- clear source attribution (“Data via Spotify/Apple/YouTube”)

### What requires licensed metadata
Rights-grade crediting (writers/publishers/splits, ISWC mapping) typically requires:
- licensing commercial rights metadata sources, and/or
- direct partner feeds (labels/publishers) with contractual permissions.

Recommended normalized identifiers:
- **ISRC** (recording) and **ISWC** (work/composition), plus party registries.

## 6) Monetization compatible with providers + rights orgs

Provider-side:
- referral traffic / affiliate programs where offered
- API quota agreements for scale
- co-marketing as a discovery/education layer

Rights-holder side:
- engagement analytics and discovery funnels (catalog strategy)
- education licensing (institutional)
- licensed rights metadata upgrades (premium feature)

## 7) Global + Israel operational checklist (high level)

### Legal/Policy
- Terms of Service and Privacy Policy: telemetry + provider delegation disclosures
- DMCA/notice-and-takedown posture if any UGC exists
- Trademark/branding compliance for each provider

### Product enforcement
- single active playback surface (no mixing / rebroadcast)
- strict “no caching” and “no clip export” rules unless separately licensed
- entitlement-aware fallbacks (SDK → embed → link-out)

### Data governance
- retention limits for raw telemetry; aggregate where possible
- user deletion pathways for analytics where required

