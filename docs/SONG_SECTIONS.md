# Song Sections Feature Documentation

## Overview
This document describes the new song sections feature that allows tracks to have timestamped sections (intro, verse, chorus, bridge, outro) with individual YouTube embeds for each section.

## Features

### 1. YouTube Background for Watch Button
When users click the "Watch" button on a track card:
- The YouTube video plays  
- UI elements remain visible with a gradient overlay
- Button changes to "Hide" to dismiss the video
- Creates an immersive music video experience

### 2. Spotify Native App Integration
Improved Spotify link handling:
- Uses hidden iframe to attempt opening Spotify native app
- Falls back to background web player if app not installed
- No popups or focus changes - keeps user on current page
- Seamless integration that doesn't interrupt browsing

### 3. Song Sections with Timestamps
Display song structure with individual playback controls:
- Grid layout showing all sections (intro, verse, chorus, bridge, outro)
- Each section button shows section type with emoji icon, custom label, and timestamp
- Click any section to play that specific part of the song
- YouTube embed opens with startTime and endTime parameters

## Data Structure

### SongSection Type
```typescript
export type SongSectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';

export interface SongSection {
  type: SongSectionType;
  label?: string;        // e.g., "Verse 1", "Chorus"
  start_time: number;    // in seconds
  end_time?: number;     // in seconds (optional)
}
```

## Implementation Details
See the full codebase for implementation details in:
- `src/components/SongSections.tsx` - Main sections component
- `src/components/TrackCard.tsx` - YouTube background integration
- `src/components/YouTubeEmbed.tsx` - Timestamp support
- `src/lib/providers.ts` - Spotify native app handling
- `src/types/index.ts` - Type definitions
