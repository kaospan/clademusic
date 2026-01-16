// Music service providers
export type MusicProvider = 'spotify' | 'apple_music' | 'deezer' | 'soundcloud' | 'youtube' | 'amazon_music';

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
  
  // Metadata
  popularity_score?: number;
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
