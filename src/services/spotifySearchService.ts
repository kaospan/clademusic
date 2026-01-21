/**
 * Spotify Search Service
 * 
 * Search any song available on Spotify via their Web API.
 * Uses the user's connected Spotify access token for authenticated searches.
 */

import { supabase } from '@/integrations/supabase/client';
import { Track } from '@/types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

interface SpotifySearchResult {
  tracks: {
    items: Array<{
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
      external_ids?: {
        isrc?: string;
      };
    }>;
    total: number;
  };
}

interface UserProviderRow {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  connected_at: string;
}

/**
 * Get Spotify credentials for authenticated user
 */
async function getSpotifyCredentials(userId: string): Promise<UserProviderRow | null> {
  const { data, error } = await supabase
    .from('user_providers')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'spotify')
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserProviderRow;
}

/**
 * Refresh Spotify access token
 */
async function refreshSpotifyToken(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  
  if (!clientId) {
    console.error('Spotify client ID not configured');
    return null;
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to refresh Spotify token:', errorData);
      return null;
    }

    const data = await response.json();
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // Update token in database
    await supabase
      .from('user_providers')
      .update({
        access_token: data.access_token,
        expires_at: newExpiresAt,
        // Spotify may return a new refresh token
        ...(data.refresh_token && { refresh_token: data.refresh_token }),
      })
      .eq('user_id', userId)
      .eq('provider', 'spotify');

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    return null;
  }
}

/**
 * Get valid access token, refreshing if needed
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const credentials = await getSpotifyCredentials(userId);
  
  if (!credentials) {
    return null;
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(credentials.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    // Token expired or expiring soon, refresh it
    return await refreshSpotifyToken(userId, credentials.refresh_token);
  }

  return credentials.access_token;
}

/**
 * Search Spotify for any song
 */
export async function searchSpotify(
  userId: string,
  query: string,
  limit = 20
): Promise<Track[]> {
  const accessToken = await getValidAccessToken(userId);
  
  if (!accessToken) {
    console.warn('No Spotify access token available - user may need to reconnect');
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: Math.min(limit, 50).toString(),
      market: 'US',
    });

    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Token invalid even after refresh attempt
        console.error('Spotify token invalid - user needs to reconnect');
      } else {
        console.error('Spotify search failed:', response.status, await response.text());
      }
      return [];
    }

    const data: SpotifySearchResult = await response.json();

    return data.tracks.items.map((track) => ({
      id: `spotify:${track.id}`,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      artists: track.artists.map((a) => a.name),
      album: track.album.name,
      cover_url: track.album.images[0]?.url,
      artwork_url: track.album.images[0]?.url,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      spotify_id: track.id,
      url_spotify_web: track.external_urls.spotify,
      url_spotify_app: track.uri,
      provider: 'spotify' as const,
      external_id: track.id,
      isrc: track.external_ids?.isrc,
    }));
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return [];
  }
}
