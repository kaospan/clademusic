

# Clade Music - Full MVP Plan

A hybrid artist/label website with an integrated music analysis tool, featuring a dark aesthetic with motion effects, multi-page structure, and comprehensive music platform integration.

---

## 🏠 1. Home Page (Hero + Overview)
**The landing experience that captures the Clade brand identity**

- **Animated Hero Section**
  - Large "Clade" logo with animated gradient text
  - "Find Your Harmony" tagline with particle/motion background
  - Floating musical note elements in the background
  - Two primary CTAs: "Explore Releases" and "Try the Tool"
  
- **Featured Release Spotlight**
  - Latest release card with album art, title, and embedded player
  - Quick links to all streaming platforms (Spotify, Apple Music, YouTube, SoundCloud, Deezer, Tidal, Amazon, Last.fm)
  
- **Label Stats/Social Proof**
  - Animated counters (releases, streams, etc.)
  - Brief mission statement about Clade as a label

- **Quick Links Section**
  - Preview cards linking to Releases, Tool, Events, and About pages

---

## 🎵 2. Releases Page
**Showcase the growing music catalog (4-10+ releases)**

- **Filter/Sort Options**
  - Filter by type (Single, EP, Album)
  - Sort by date (newest/oldest)
  
- **Release Grid/List**
  - Album artwork cards with hover effects
  - Release title, artist(s), release date
  - Genre/mood tags
  
- **Individual Release View** (modal or expanded card)
  - Full album art
  - Track listing with duration
  - Embedded player (Spotify/SoundCloud/YouTube)
  - Links to ALL streaming platforms
  - Release notes/credits
  - Downloadable press assets

- **Data-Driven**: Releases stored in a `data/releases.json` file for easy updates

---

## 🔧 3. Tool Page (Music Analysis Demo)
**Separate page for the harmony/chord analysis tool**

- **Tool Introduction**
  - What the tool does
  - Key features (AI analysis, tonic comparisons, visualizations)
  
- **Interactive Demo Section**
  - Track selector with example songs
  - Chord progression visualizer
  - Key/scale analysis display
  - Harmonic complexity meter
  
- **Feature Cards**
  - AI-Powered Analysis
  - Tonic Comparisons
  - Visual Harmony
  - Real-Time Processing
  
- **CTA Section**
  - "Start Exploring" / "Browse as Guest" buttons
  - Link to full app (if hosted separately)

---

## 📖 4. About Page
**The story behind Clade**

- **Label Bio**
  - Mission and vision
  - What "Clade" means (the musical/biological concept)
  - The team behind it
  
- **Artist Roster Section**
  - Photos and bios of artists on the label
  - Links to their individual profiles/socials
  
- **Press Kit / EPK Section**
  - Downloadable logo pack (various formats)
  - High-res press photos
  - One-sheet/bio PDF
  - Brand guidelines

---

## 📅 5. Events Page
**Upcoming shows, performances, and appearances**

- **Upcoming Events List**
  - Date, venue, location
  - Ticket link buttons
  - Event descriptions
  
- **Past Events Archive**
  - Collapsible section with previous shows
  
- **Data-Driven**: Events stored in `data/events.json`

---

## 🛒 6. Merch Section
**Link to merchandise (can be integrated or external)**

- **Featured Items Grid**
  - Product images with prices
  - "Shop Now" links to external store (Big Cartel, Shopify, Bandcamp)
  
- **Or**: Full integration with a merch store if needed later

---

## 📬 7. Contact Page
**Multiple ways to reach Clade**

- **Contact Form**
  - Name, email, subject, message fields
  - Honeypot anti-spam field
  - Dual submission: Formspree integration (configurable) with mailto fallback
  - Success toast notification
  
- **Direct Contact Info**
  - Email address displayed
  - Booking inquiry vs. general inquiry distinction
  
- **Social Links Grid**
  - All social platforms with animated icons
  - Instagram, YouTube, Spotify, SoundCloud, X, etc.

---

## 🎨 8. Design System & Layout

**Navigation**
- Sticky header with logo and nav links
- Mobile hamburger menu with smooth slide-in
- Active page highlighting
- Dark mode toggle (persisted in localStorage)

**Visual Style**
- Dark gradient background (matching current brand)
- Animated particles/floating elements
- Gradient accent colors (cyan, magenta, orange from current brand)
- Smooth scroll and page transitions
- Hover animations on interactive elements

**Footer**
- Newsletter signup form (email collection)
- Social links
- Quick navigation
- Copyright and legal links
- "Back to top" button

---

## ⚡ 9. Technical Quality

**Performance**
- Lazy-loaded images and embeds
- Optimized image formats (WebP where possible)
- Minimal layout shift (proper image dimensions)
- Skeleton loaders for dynamic content

**Accessibility**
- Semantic HTML structure
- Skip-to-content link
- Keyboard navigation support
- Proper focus management
- ARIA labels where needed
- Sufficient color contrast

**SEO**
- Meta titles and descriptions per page
- OpenGraph and Twitter cards
- Favicon and apple-touch-icon
- Sitemap.xml (static)
- Robots.txt
- Canonical URLs

---

## 📁 10. Content Management Structure

**Data Files** (easy to edit without touching code)
```
/src/data/
  ├── releases.json     # All music releases
  ├── events.json       # Upcoming and past events
  ├── socials.json      # Social media links
  ├── merch.json        # Featured merchandise
  └── siteConfig.json   # General site settings
```

**Documentation**
- README with clear instructions for:
  - Adding new releases
  - Managing events
  - Updating social links
  - Configuring contact form (Formspree API key)
  - Deploying to GitHub Pages

---

## 🚀 Implementation Approach

1. **Phase 1**: Core layout (navigation, footer, dark theme with animations)
2. **Phase 2**: Home page with hero and featured release
3. **Phase 3**: Releases page with data-driven grid
4. **Phase 4**: About page with press kit downloads
5. **Phase 5**: Events page
6. **Phase 6**: Contact page with form
7. **Phase 7**: Tool demo page
8. **Phase 8**: Newsletter signup, merch links, final polish
9. **Phase 9**: SEO optimization, accessibility audit, performance tuning

