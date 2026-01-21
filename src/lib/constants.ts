/**
 * Shared constants for the application.
 * Centralize magic strings and values here.
 */

// Error messages
export const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'Not authenticated',
  MUST_BE_LOGGED_IN: 'Must be logged in',
  FAILED_TO_LOAD: 'Failed to load data',
  NETWORK_ERROR: 'Network error. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

// Query keys for React Query
export const QUERY_KEYS = {
  // User
  profile: ['profile'],
  userProviders: ['user-providers'],
  
  // Social
  following: ['following'],
  followers: ['followers'],
  followingFeed: ['following-feed'],
  
  // Tracks
  TRACKS: 'tracks',
  FEED: 'feed',
  trackComments: (trackId: string) => ['track-comments', trackId],
  trackConnections: (trackId: string) => ['track-connections', trackId],
  
  // Play history
  playHistory: ['play-history'],
  playStats: ['play-stats'],
  
  // Location
  userLocation: ['user-location'],
  nearbyListeners: (trackId?: string, artist?: string) => ['nearby-listeners', trackId, artist],
  
  // Search
  unifiedSearch: (query: string) => ['unified-search', query],
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'harmony-hub-auth-token',
  PREFERRED_PROVIDER: 'harmony-hub-preferred-provider',
  VOLUME: 'harmony-hub-volume',
  THEME: 'harmony-hub-theme',
} as const;

// UI constants
export const UI = {
  MAX_CONTAINER_WIDTH: 'max-w-lg',
  BOTTOM_NAV_HEIGHT: 'pb-24',
  HEADER_HEIGHT: 'h-16',
  ANIMATION_DURATION_FAST: 0.15,
  ANIMATION_DURATION_NORMAL: 0.2,
  ANIMATION_DURATION_SLOW: 0.3,
} as const;

// Limits and thresholds
export const LIMITS = {
  MAX_COMMENT_LENGTH: 500,
  MAX_SEARCH_RESULTS: 50,
  DEFAULT_PAGE_SIZE: 20,
  MAX_NEARBY_RADIUS_KM: 100,
  MIN_NEARBY_RADIUS_KM: 1,
} as const;

// Cache / Stale time constants for React Query (in milliseconds)
export const CACHE_TIMES = {
  /** 30 seconds - for frequently changing data */
  VERY_SHORT: 30 * 1000,
  /** 2 minutes - for semi-realtime data */
  SHORT: 2 * 60 * 1000,
  /** 5 minutes - default for most queries */
  MEDIUM: 5 * 60 * 1000,
  /** 15 minutes - for rarely changing data */
  LONG: 15 * 60 * 1000,
  /** 1 hour - for static reference data */
  VERY_LONG: 60 * 60 * 1000,
  /** Infinite - never refetch automatically */
  INFINITE: Infinity,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  SPOTIFY_AUTH: 'https://accounts.spotify.com/authorize',
  SPOTIFY_TOKEN: 'https://accounts.spotify.com/api/token',
  SPOTIFY_API: 'https://api.spotify.com/v1',
} as const;
