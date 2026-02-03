/**
 * Spotify Authentication Service
 * 
 * Centralized token management for Spotify API calls.
 * Handles credential retrieval, token refresh, and validation.
 */

import { supabase } from '@/integrations/supabase/client';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

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
 * Get user's Spotify credentials from database
 */
export async function getSpotifyCredentials(userId: string): Promise<UserProviderRow | null> {
  const { data, error } = await supabase
    .from('user_providers')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'spotify')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as UserProviderRow;
}

/**
 * Refresh Spotify access token
 */
export async function refreshSpotifyToken(
  userId: string,
  refreshToken?: string
): Promise<string | null> {
  // If caller didn't provide a refresh token, read it from DB
  if (!refreshToken) {
    const creds = await getSpotifyCredentials(userId);
    refreshToken = creds?.refresh_token ?? '';
  }

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  
  if (!clientId) {
    console.error('Spotify client ID not configured');
    return null;
  }
  if (!refreshToken) {
    console.warn('Spotify refresh token missing; reconnect required');
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
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const credentials = await getSpotifyCredentials(userId);
  
  if (!credentials) {
    return null;
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(credentials.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    // Token expired or expiring soon, refresh it (will read refresh_token from DB if needed)
    return await refreshSpotifyToken(userId);
  }

  return credentials.access_token;
}