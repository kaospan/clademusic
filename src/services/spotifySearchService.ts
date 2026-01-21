/**
 * Spotify Search Service
 * 
 * Search any song available on Spotify via their Web API.
 * Uses the user's connected Spotify access token for authenticated searches.
 */

import { Track } from '@/types';
import { getValidAccessToken } from './spotifyAuthService';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

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
