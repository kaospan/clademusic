/**
 * Hook for initiating Spotify OAuth connection
 * Uses PKCE (Proof Key for Code Exchange) for secure authorization
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Storage keys for OAuth state (used across page reload during OAuth flow)
const OAUTH_STATE_KEY = 'harmony_hub_oauth_state';
const OAUTH_VERIFIER_KEY = 'harmony_hub_oauth_verifier';

// Generate a random string for PKCE
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('');
}

// Generate PKCE code challenge from verifier
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
// Web Playback requires the "streaming" scope and the ability to control playback
// Add modify/app-remote scopes to avoid 401/403 on transfer/play.
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'streaming',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-library-read',
  'playlist-read-private',
  'app-remote-control',
].join(' ');

/**
 * Store OAuth state in localStorage for verification after redirect
 */
function storeOAuthState(state: string, codeVerifier: string): void {
  const data = {
    state,
    codeVerifier,
    timestamp: Date.now(),
  };
  localStorage.setItem(OAUTH_STATE_KEY, state);
  localStorage.setItem(OAUTH_VERIFIER_KEY, JSON.stringify(data));
}

/**
 * Retrieve and validate stored OAuth state
 */
export function getStoredOAuthState(): { state: string; codeVerifier: string } | null {
  try {
    const state = localStorage.getItem(OAUTH_STATE_KEY);
    const verifierData = localStorage.getItem(OAUTH_VERIFIER_KEY);
    
    if (!state || !verifierData) return null;
    
    const parsed = JSON.parse(verifierData);
    
    // Expire after 10 minutes
    if (Date.now() - parsed.timestamp > 10 * 60 * 1000) {
      clearOAuthState();
      return null;
    }
    
    return { state: parsed.state, codeVerifier: parsed.codeVerifier };
  } catch {
    return null;
  }
}

/**
 * Clear OAuth state after use
 */
export function clearOAuthState(): void {
  localStorage.removeItem(OAUTH_STATE_KEY);
  localStorage.removeItem(OAUTH_VERIFIER_KEY);
}

export function useConnectSpotify() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      console.log('[Spotify Connect] Starting OAuth flow...');
      
      if (!user) throw new Error('Must be logged in to connect Spotify');

      // Get Spotify client ID from environment
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      console.log('[Spotify Connect] Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');
      
      if (!clientId) {
        throw new Error('Spotify client ID not configured. Add VITE_SPOTIFY_CLIENT_ID to your .env file.');
      }

      // Generate PKCE values
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomString(32);

      // Store state in localStorage for callback verification
      storeOAuthState(state, codeVerifier);
      console.log('[Spotify Connect] State stored:', state.substring(0, 8) + '...');

      // Get the redirect URI - should match what's configured in Spotify Developer Dashboard
      const basePath = import.meta.env.BASE_URL || '/';
      const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI 
        || `${window.location.origin}${basePath.endsWith('/') ? basePath : basePath + '/'}spotify-callback`;
      console.log('[Spotify Connect] Redirect URI:', redirectUri);

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: SPOTIFY_SCOPES,
        state,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
      });

      // Redirect to Spotify
      const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
      console.log('[Spotify Connect] Redirecting to:', authUrl.substring(0, 80) + '...');
      window.location.href = authUrl;
    },
  });
}

/**
 * Hook to disconnect Spotify account
 */
export function useDisconnectSpotify() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      // Remove from user_providers table
      const { error } = await supabase
        .from('user_providers')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'spotify');

      if (error) throw error;

      // Also try to remove from provider_accounts if it exists
    //   await supabase
    //     .from('provider_accounts')
    //     .delete()
    //     .eq('user_id', user.id)
    //     .eq('provider', 'spotify');
    },
  });
}
