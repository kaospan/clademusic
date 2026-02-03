/**
 * Spotify OAuth Callback Page
 * 
 * Handles the redirect from Spotify after user authorizes the app.
 * Exchanges the authorization code for tokens and stores them.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getStoredOAuthState, clearOAuthState } from '@/hooks/api/useSpotifyConnect';
import { LoadingSpinner } from '@/components/shared';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

interface SpotifyUserProfile {
  id: string;
  email: string;
  display_name: string;
  images?: { url: string }[];
}

export default function SpotifyCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<string>('');
  const handledRef = useRef(false);
  const consumedCodeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      if (handledRef.current) return; // guard against StrictMode double-invoke
      handledRef.current = true;
      try {
        console.log('[Spotify Callback] Starting...');
        console.log('[Spotify Callback] URL params:', Object.fromEntries(searchParams.entries()));
        
        // Get params from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Prevent re-using the same code (page refresh/back button or multiple loads)
        if (code) {
          const key = `spotify_code_${code}`;
          consumedCodeKeyRef.current = key;
          const alreadyUsed = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (alreadyUsed) {
            console.warn('[Spotify Callback] Code already consumed, skipping re-exchange');
            setStatus('success');
            setTimeout(() => navigate('/profile', { replace: true }), 800);
            return;
          }
          // mark in both scopes to survive same-tab refresh and prevent cross-tab reuse
          sessionStorage.setItem(key, 'used');
          localStorage.setItem(key, 'used');
        }

        // Handle Spotify errors
        if (error) {
          console.error('[Spotify Callback] Spotify error:', error, errorDescription);
          throw new Error(errorDescription || `Spotify authorization failed: ${error}`);
        }

        if (!code || !state) {
          console.error('[Spotify Callback] Missing code or state');
          throw new Error('Missing authorization code or state');
        }

        // Verify state matches what we stored
        const storedState = getStoredOAuthState();
        console.log('[Spotify Callback] Stored state:', storedState?.state?.substring(0, 8) + '...');
        console.log('[Spotify Callback] Received state:', state?.substring(0, 8) + '...');
        
        if (!storedState || storedState.state !== state) {
          console.error('[Spotify Callback] State mismatch');
          throw new Error('Invalid state parameter. Please try connecting again.');
        }

        if (!user) {
          console.error('[Spotify Callback] No user logged in');
          throw new Error('You must be logged in to connect Spotify');
        }

        console.log('[Spotify Callback] Exchanging code for tokens...');
        
        // Exchange code for tokens
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        const basePath = import.meta.env.BASE_URL || '/';
        const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
        const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 
          `${window.location.origin}${normalizedBase}spotify-callback`;
        
        console.log('[Spotify Callback] Using redirect URI:', redirectUri);

        const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: storedState.codeVerifier,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('[Spotify Callback] Token exchange failed:', errorData);
          throw new Error(errorData.error_description || `Token exchange failed: ${errorData.error}`);
        }

        console.log('[Spotify Callback] Token exchange successful');
        // Strip code/state from the URL to prevent accidental re-use on refresh
        try {
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (err) {
          console.warn('[Spotify Callback] Failed to clean URL', err);
        }
        const tokens: SpotifyTokenResponse = await tokenResponse.json();
        console.log(
          '[Spotify Callback] Token scope:',
          typeof tokens.scope === 'string' ? tokens.scope : '(missing)'
        );

        let profile: SpotifyUserProfile | null = null;
        console.log('[Spotify Callback] Fetching Spotify profile...');
        // Get user's Spotify profile (best-effort). Some Spotify apps in dev mode return 403 for non-whitelisted users.
        // We still store tokens so the user can retry/reconnect after fixing Spotify dashboard settings.
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        if (!profileResponse.ok) {
          const details = await profileResponse.json().catch(() => null);
          console.error('[Spotify Callback] Profile fetch failed:', profileResponse.status, details);
          // Continue; store tokens with a placeholder provider_user_id.
        } else {
          profile = await profileResponse.json();
        }

        // Calculate token expiry time
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Store in user_providers table (do not clobber refresh_token if Spotify omits it)
        const upsertPayload: {
          user_id: string;
          provider: string;
          provider_user_id: string;
          access_token: string;
          expires_at: string;
          connected_at: string;
          refresh_token?: string;
        } = {
          user_id: user.id,
          provider: 'spotify',
          provider_user_id: profile?.id || `unknown_${user.id}`,
          access_token: tokens.access_token,
          expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        };
        if (tokens.refresh_token) {
          upsertPayload.refresh_token = tokens.refresh_token;
        }

        const { error: upsertError } = await supabase
          .from('user_providers')
          .upsert(upsertPayload, { onConflict: 'user_id,provider' });

        if (upsertError) {
          console.error('Failed to store Spotify connection:', upsertError);
          throw new Error('Failed to save Spotify connection');
        }

        // Clean up OAuth state
        setStatus('success');
        if (!profile) {
          console.warn(
            '[Spotify Callback] Connected, but profile fetch failed. This often means the Spotify app is in dev mode and the user is not added as an allowed user in the Spotify dashboard.'
          );
          setWarningMessage(
            'Connected, but Spotify profile fetch was blocked (403). If your Spotify app is in dev mode, add your account as an allowed user in the Spotify dashboard, then reconnect.'
          );
        }

        // Redirect to profile after a moment
        setTimeout(() => {
          navigate('/profile', { replace: true });
        }, 2000);

      } catch (err) {
        console.error('Spotify callback error:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      } finally {
        // Always clear to avoid stale state; safe because we guard double-run
        clearOAuthState();
      }
    }

    handleCallback();
  }, [searchParams, user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <LoadingSpinner size="lg" />
            <h2 className="text-xl font-semibold">Connecting to Spotify...</h2>
            <p className="text-muted-foreground">Please wait while we complete the connection</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-green-500">Spotify Connected!</h2>
            <p className="text-muted-foreground">Redirecting to your profile...</p>
            {warningMessage && (
              <p className="text-sm text-amber-500/90">{warningMessage}</p>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-destructive">Connection Failed</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={() => navigate('/profile')}>
                Go to Profile
              </Button>
              <Button onClick={() => navigate('/profile')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
