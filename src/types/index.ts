// Music service providers
export type MusicProvider = 'spotify' | 'apple_music' | 'deezer' | 'soundcloud' | 'youtube' | 'amazon_music';

// Song section types (canonical labels)
export type SongSectionType = 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro' | 'breakdown' | 'drop';

// Song section with timestamp for YouTube embed (legacy inline format)
export interface SongSection {
  type: SongSectionType;
  label?: string; // e.g., "Verse 1", "Chorus", "Bridge"
  start_time: number; // in seconds
  end_time?: number; // in seconds (optional)
}

// Track section from database (canonical, provider-agnostic)
export interface TrackSection {
  id: string;
  track_id: string;
  label: SongSectionType;
  start_ms: number;
  end_ms: number;
  created_at: string;
  // Optional chord progression specific to this section
  chords?: string[]; // Roman numerals
  chord_timings?: number[]; // Millisecond timestamps for each chord within the section
}

// Playback provider for player context
export type PlaybackProvider = 'youtube' | 'spotify_sdk' | 'spotify_embed' | 'apple_music';

// Playback mode
export type PlaybackMode = 'watch' | 'listen';

// Player state for context
export interface PlayerState {
  isPlaying: boolean;
  currentTrackId: string | null;
  currentProvider: PlaybackProvider;
  playbackMode: PlaybackMode;
  activeSection: TrackSection | null;
  currentTime: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0-100
  isMuted: boolean;
}

// Provider link information
export interface ProviderLink {
  provider: MusicProvider;
  provider_track_id: string;
  url_web?: string;
  url_app?: string;
  url_preview?: string;
}

// Canonical track shape for unified search results
export interface Track {
  id: string;
  title: string;
  artists?: string[]; // Array of artist names (optional for backward compatibility)
  album?: string;
  duration_ms?: number;
  artwork_url?: string;
  isrc?: string;
  
  // Provider-specific data (optional - populated by unified search)
  providerIds?: Partial<Record<MusicProvider, string>>; // Map of provider -> provider track ID
  providerLinks?: ProviderLink[]; // Array of available provider links
  
  // DB/legacy fields for backward compatibility
  external_id?: string;
  provider?: MusicProvider;
  artist?: string; // Single artist string from DB
  cover_url?: string;
  preview_url?: string;
  spotify_id?: string;
  youtube_id?: string;
  url_spotify_web?: string;
  url_spotify_app?: string;
  url_youtube?: string;
  
  // Song structure data
  sections?: SongSection[]; // Array of song sections with timestamps
  is_common_ancestor?: boolean; // Marks foundational/influential tracks that spawned musical movements
  
  // Historical track metadata
  historical_year?: number; // Original performance year
  historical_decade?: string; // Original performance decade
  historical_notes?: string; // Historical significance notes
  
  // Harmonic fingerprint data
  detected_key?: string;
  detected_mode?: 'major' | 'minor' | 'unknown';
  progression_raw?: string[];
  progression_roman?: string[];
  loop_length_bars?: number;
  cadence_type?: 'none' | 'loop' | 'plagal' | 'authentic' | 'deceptive' | 'other';
  confidence_score?: number;
  analysis_source?: 'metadata' | 'crowd' | 'analysis';
  
  // Audio features
  energy?: number;
  danceability?: number;
  valence?: number;
  tempo?: number; // BPM
  
  // Genre and style
  genre?: string;
  genres?: string[]; // Multiple genre tags
  genre_description?: string;
  
  // Credits
  songwriter?: string; // Primary songwriter
  songwriters?: string[]; // All songwriters
  producer?: string; // Primary producer
  producers?: string[]; // All producers
  label?: string; // Record label
  release_date?: string; // YYYY-MM-DD format
  
  // Metadata
  popularity_score?: number;

  // Playback / history metadata
  played_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  preferred_provider?: MusicProvider | 'none';
  twofa_enabled?: boolean;
  twofa_secret?: string;
  twofa_backup_codes?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface UserProvider {
  id: string;
  user_id: string;
  provider: MusicProvider;
  provider_user_id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  connected_at: string;
}

export interface UserInteraction {
  id: string;
  user_id: string;
  track_id: string;
  interaction_type: 'like' | 'save' | 'skip' | 'more_harmonic' | 'more_vibe' | 'share';
  created_at: string;
}

export interface UserCredits {
  id: string;
  user_id: string;
  monthly_allowance: number;
  credits_used: number;
  last_reset: string;
}

export interface ChordSubmission {
  id: string;
  track_id: string;
  user_id: string;
  detected_key?: string;
  detected_mode?: 'major' | 'minor';
  progression_roman?: string[];
  status: 'pending' | 'approved' | 'rejected';
  moderated_by?: string;
  created_at: string;
}

export type InteractionType = 'like' | 'save' | 'skip' | 'more_harmonic' | 'more_vibe' | 'share';

// Play event types
export type PlayAction = 'open_app' | 'open_web' | 'preview';

export interface PlayEvent {
  id: string;
  user_id?: string;
  track_id: string;
  provider: MusicProvider;
  action: PlayAction;
  played_at: string;
  context?: string;
  device?: string;
  metadata?: Record<string, any>;
}

// Track connections (WhoSampled-style)
export type ConnectionType = 'sample' | 'cover' | 'interpolation' | 'remix' | 'inspiration';

export interface TrackConnection {
  id: string;
  from_track_id: string;
  to_track_id: string;
  connection_type: ConnectionType;
  confidence?: number;
  evidence_url?: string;
  evidence_text?: string;
  created_at: string;
  created_by?: string;
}

export interface ConnectionGraph {
  track: Track;
  upstream: Array<TrackConnection & { track: Track }>;   // What this track comes from
  downstream: Array<TrackConnection & { track: Track }>; // What this track influenced
  most_popular_derivative?: Track;
}

// Search types
export interface SearchResult {
  tracks: Track[];
  total: number;
  cached: boolean;
  partial_results?: string[]; // List of providers that had errors
  warnings?: string[];
}

export interface SearchParams {
  query: string;
  market?: string;
  limit?: number;
}

// 2FA types
export interface TwoFactorSetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface TwoFactorVerify {
  code: string;
  backup_code?: boolean;
}

// Roman numeral to display mapping
export const ROMAN_NUMERALS = {
  'I': { label: 'I', class: 'chord-i' },
  'i': { label: 'i', class: 'chord-i' },
  'II': { label: 'II', class: 'chord-ii' },
  'ii': { label: 'ii', class: 'chord-ii' },
  'III': { label: 'III', class: 'chord-iii' },
  'iii': { label: 'iii', class: 'chord-iii' },
  'IV': { label: 'IV', class: 'chord-iv' },
  'iv': { label: 'iv', class: 'chord-iv' },
  'V': { label: 'V', class: 'chord-v' },
  'v': { label: 'v', class: 'chord-v' },
  'VI': { label: 'VI', class: 'chord-vi' },
  'vi': { label: 'vi', class: 'chord-vi' },
  'VII': { label: 'VII', class: 'chord-vii' },
  'vii': { label: 'vii', class: 'chord-vii' },
} as const;

// Album type
export interface Album {
  id: string;
  name: string;
  artist: string;
  artist_id?: string;
  cover_url?: string;
  release_date?: string;
  total_tracks?: number;
  tracks?: Track[];
  spotify_id?: string;
  genres?: string[];
}

// Artist type
export interface Artist {
  id: string;
  name: string;
  image_url?: string;
  genres?: string[];
  followers?: number;
  popularity?: number;
  spotify_id?: string;
  top_tracks?: Track[];
  albums?: Album[];
}

// Comment with likes for live feed
export interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  user_liked?: boolean;
  user?: {
    display_name?: string;
    avatar_url?: string;
  };
  is_pinned?: boolean;
}

// Sample connection element types (like WhoSampled)
export type SampleElement = 'vocals' | 'hook' | 'drums' | 'bassline' | 'melody' | 'lyrics' | 'multiple' | 'other';

// Sample connection between tracks
export interface SampleConnection {
  id: string;
  original_track: Track;
  sampling_track: Track;
  element: SampleElement;
  description?: string;
  start_time?: number; // Timestamp in original track
  verified?: boolean;
  votes?: number;
}

// Nearby listener
export interface NearbyListener {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  listened_at: string;
  distance_km?: number;
  city?: string;
}
