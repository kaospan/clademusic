/**
 * Spotify User API Service
 * 
 * Fetches user-specific data from Spotify using their stored access token.
 * Handles token refresh automatically.
 */

import { Track } from '@/types';
import { getValidAccessToken, refreshSpotifyToken, getSpotifyCredentials } from './spotifyAuthService';

// Once a top-metrics call returns 401/403, stop re-requesting to avoid noisy 403s and retries.
let topMetricsDisabled = false;

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyPlayHistoryItem {
  track: {
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      id: string;
      name: string;
      images: Array<{ url: string; height: number; width: number }>;
    };
    duration_ms: number;
    external_urls: { spotify: string };
    uri: string;
    preview_url?: string;
  };
  played_at: string;
}

interface SpotifyRecentlyPlayedResponse {
  items: SpotifyPlayHistoryItem[];
  next?: string;
  cursors?: { after: string; before: string };
  limit: number;
  href: string;
}

/**
 * Transform Spotify track to our Track type
 */
function transformSpotifyTrack(item: SpotifyPlayHistoryItem): Track {
  const { track } = item;
  const artwork = track.album.images.sort((a, b) => b.height - a.height)[0];

  return {
    id: `spotify:${track.id}`,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    artists: track.artists.map(a => a.name),
    album: track.album.name,
    cover_url: artwork?.url,
    artwork_url: artwork?.url,
    duration_ms: track.duration_ms,
    spotify_id: track.id,
    url_spotify_web: track.external_urls.spotify,
    url_spotify_app: track.uri,
    preview_url: track.preview_url,
    provider: 'spotify',
    external_id: track.id,
    played_at: item.played_at,
  };
}

/**
 * Fetch user's recently played tracks from Spotify
 */
export async function getRecentlyPlayedTracks(
  userId: string,
  limit = 20
): Promise<{ tracks: Track[]; source: 'spotify' } | null> {
  const accessToken = await getValidAccessToken(userId);
  
  if (!accessToken) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      limit: Math.min(limit, 50).toString(), // Spotify max is 50
    });

    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/player/recently-played?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Token invalid, try to refresh
        const newToken = await refreshSpotifyToken(userId, '');
        if (!newToken) {
          console.error('Spotify token refresh failed');
          return null;
        }
        // Retry with new token
        return getRecentlyPlayedTracks(userId, limit);
      }
      console.error('Failed to fetch recently played:', response.status);
      return null;
    }

    const data: SpotifyRecentlyPlayedResponse = await response.json();

    const unique: Track[] = [];
    const seen = new Set<string>();

    for (const item of data.items) {
      const t = transformSpotifyTrack(item);
      const key = t.spotify_id || t.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(t);
      }
      if (unique.length >= limit) break;
    }

    return { tracks: unique.slice(0, limit), source: 'spotify' };
  } catch (error) {
    console.error('Error fetching recently played:', error);
    return null;
  }
}

/**
 * Check if user has Spotify connected
 */
export async function isSpotifyConnected(userId: string): Promise<boolean> {
  const credentials = await getSpotifyCredentials(userId);
  return credentials !== null;
}

/**
 * Get user's Spotify profile info
 */
export async function getSpotifyProfile(userId: string): Promise<{
  displayName: string;
  email: string;
  imageUrl?: string;
  product?: string;
  followers?: number;
} | null> {
  const accessToken = await getValidAccessToken(userId);
  
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    return {
      displayName: data.display_name || data.id,
      email: data.email,
      imageUrl: data.images?.[0]?.url,
      product: data.product,
      followers: data.followers?.total,
    };
  } catch (error) {
    console.error('Error fetching Spotify profile:', error);
    return null;
  }
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: Array<{ url: string; height: number; width: number }>;
  popularity: number;
}

export interface SpotifyTopTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  popularity: number;
}

export interface AudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
}

export interface MusicStats {
  topGenres: Array<{ genre: string; count: number }>;
  averageEnergy: number;
  averageDanceability: number;
  averageValence: number;
  averageTempo: number;
  moodProfile: 'energetic' | 'chill' | 'melancholic' | 'upbeat' | 'balanced';
  listeningDiversity: number;
}

/**
 * Get user's top tracks from Spotify
 */
export async function getTopTracks(
  userId: string,
  timeRange: TimeRange = 'medium_term',
  limit = 20
): Promise<Track[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  try {
    const params = new URLSearchParams({
      time_range: timeRange,
      limit: Math.min(limit, 50).toString(),
    });

    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/top/tracks?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn('[Spotify] top tracks forbidden/unauthorized; treating as disconnected');
        topMetricsDisabled = true;
        return [];
      }
      return [];
    }

    const data = await response.json();
    return data.items.map((track: SpotifyTopTrack) => ({
      id: `spotify:${track.id}`,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      artists: track.artists.map(a => a.name),
      album: track.album.name,
      cover_url: track.album.images[0]?.url,
      artwork_url: track.album.images[0]?.url,
      duration_ms: track.duration_ms,
      spotify_id: track.id,
      provider: 'spotify' as const,
      external_id: track.id,
    }));
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return [];
  }
}

/**
 * Get user's top artists from Spotify
 */
export async function getTopArtists(
  userId: string,
  timeRange: TimeRange = 'medium_term',
  limit = 20
): Promise<SpotifyArtist[]> {
  if (topMetricsDisabled) return [];

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  try {
    const params = new URLSearchParams({
      time_range: timeRange,
      limit: Math.min(limit, 50).toString(),
    });

    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/top/artists?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn('[Spotify] top artists forbidden/unauthorized; treating as disconnected');
        topMetricsDisabled = true;
        return [];
      }
      return [];
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching top artists:', error);
    return [];
  }
}

/**
 * Get audio features for a list of tracks
 */
export async function getAudioFeatures(
  userId: string,
  trackIds: string[]
): Promise<AudioFeatures[]> {
  if (trackIds.length === 0) return [];
  
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  try {
    // Spotify allows max 100 track IDs per request
    const ids = trackIds.slice(0, 100).join(',');
    const response = await fetch(
      `${SPOTIFY_API_BASE}/audio-features?ids=${ids}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.audio_features.filter(Boolean);
  } catch (error) {
    console.error('Error fetching audio features:', error);
    return [];
  }
}

/**
 * Compute user's music stats from their top tracks and artists
 */
export async function computeMusicStats(userId: string): Promise<MusicStats | null> {
  // Get top tracks and artists
  const [topTracks, topArtists] = await Promise.all([
    getTopTracks(userId, 'medium_term', 50),
    getTopArtists(userId, 'medium_term', 50),
  ]);

  if (topTracks.length === 0) return null;

  // Extract Spotify track IDs (remove 'spotify:' prefix)
  const trackIds = topTracks
    .map(t => t.spotify_id || t.external_id)
    .filter(Boolean) as string[];

  // Get audio features
  const audioFeatures = await getAudioFeatures(userId, trackIds);

  if (audioFeatures.length === 0) return null;

  // Calculate averages
  const avgEnergy = audioFeatures.reduce((s, f) => s + f.energy, 0) / audioFeatures.length;
  const avgDanceability = audioFeatures.reduce((s, f) => s + f.danceability, 0) / audioFeatures.length;
  const avgValence = audioFeatures.reduce((s, f) => s + f.valence, 0) / audioFeatures.length;
  const avgTempo = audioFeatures.reduce((s, f) => s + f.tempo, 0) / audioFeatures.length;

  // Count genres from top artists
  const genreCount: Record<string, number> = {};
  topArtists.forEach(artist => {
    artist.genres.forEach(genre => {
      genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({ genre, count }));

  // Determine mood profile
  let moodProfile: MusicStats['moodProfile'] = 'balanced';
  if (avgEnergy > 0.7 && avgValence > 0.6) moodProfile = 'energetic';
  else if (avgEnergy < 0.4 && avgValence > 0.5) moodProfile = 'chill';
  else if (avgValence < 0.35) moodProfile = 'melancholic';
  else if (avgValence > 0.65 && avgDanceability > 0.6) moodProfile = 'upbeat';

  // Calculate listening diversity (unique artists ratio)
  const uniqueArtists = new Set(topTracks.flatMap(t => t.artists || []));
  const listeningDiversity = Math.min(uniqueArtists.size / topTracks.length, 1);

  return {
    topGenres,
    averageEnergy: avgEnergy,
    averageDanceability: avgDanceability,
    averageValence: avgValence,
    averageTempo: avgTempo,
    moodProfile,
    listeningDiversity,
  };
}

/**
 * Get personalized recommendations based on user's top tracks and artists
 */
export async function getRecommendations(
  userId: string,
  seedTrackIds: string[] = [],
  seedArtistIds: string[] = [],
  limit = 20
): Promise<Track[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  try {
    // If no seeds provided, get from user's top tracks/artists
    let trackSeeds = seedTrackIds;
    let artistSeeds = seedArtistIds;

    if (trackSeeds.length === 0 && artistSeeds.length === 0) {
      const [topTracks, topArtists] = await Promise.all([
        getTopTracks(userId, 'medium_term', 5),
        getTopArtists(userId, 'medium_term', 5),
      ]);

      trackSeeds = topTracks.slice(0, 2).map(t => t.spotify_id || t.external_id).filter(Boolean) as string[];
      artistSeeds = topArtists.slice(0, 3).map(a => a.id);
    }

    // Spotify requires at least 1 seed and max 5 total
    const seeds: string[] = [];
    if (trackSeeds.length > 0) seeds.push(`seed_tracks=${trackSeeds.slice(0, 2).join(',')}`);
    if (artistSeeds.length > 0) seeds.push(`seed_artists=${artistSeeds.slice(0, 3).join(',')}`);

    if (seeds.length === 0) return [];

    const response = await fetch(
      `${SPOTIFY_API_BASE}/recommendations?${seeds.join('&')}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.tracks.map((track: SpotifyTopTrack) => ({
      id: `spotify:${track.id}`,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      artists: track.artists.map(a => a.name),
      album: track.album.name,
      cover_url: track.album.images[0]?.url,
      artwork_url: track.album.images[0]?.url,
      duration_ms: track.duration_ms,
      spotify_id: track.id,
      provider: 'spotify' as const,
      external_id: track.id,
    }));
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}
