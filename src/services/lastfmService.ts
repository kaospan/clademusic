/**
 * Last.fm API Service
 * 
 * Fetches user data from Last.fm using their public API.
 * Last.fm uses username-based lookup (no OAuth required).
 */

import { supabase } from '@/integrations/supabase/client';

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0';

export interface LastFmArtist {
  name: string;
  playcount: string;
  mbid?: string;
  url: string;
  image?: Array<{ '#text': string; size: string }>;
}

export interface LastFmTrack {
  name: string;
  artist: { name: string; mbid?: string; url: string };
  album?: { '#text': string; mbid?: string };
  playcount?: string;
  url: string;
  image?: Array<{ '#text': string; size: string }>;
  date?: { uts: string; '#text': string };
}

export interface LastFmUserInfo {
  name: string;
  realname?: string;
  playcount: string;
  artist_count: string;
  track_count: string;
  image: Array<{ '#text': string; size: string }>;
  registered: { unixtime: string; '#text': string };
  url: string;
}

export interface LastFmStats {
  totalScrobbles: number;
  artistCount: number;
  trackCount: number;
  registeredDate: Date;
  topArtists: Array<{
    name: string;
    playcount: number;
    imageUrl?: string;
  }>;
  topTracks: Array<{
    name: string;
    artist: string;
    playcount: number;
  }>;
  recentTracks: Array<{
    name: string;
    artist: string;
    album?: string;
    playedAt?: Date;
    imageUrl?: string;
    nowPlaying?: boolean;
  }>;
  weeklyArtistCount: number;
}

/**
 * Get the Last.fm API key from environment
 */
function getApiKey(): string {
  const apiKey = import.meta.env.VITE_LASTFM_API_KEY;
  if (!apiKey) {
    throw new Error('Last.fm API key not configured. Add VITE_LASTFM_API_KEY to your .env file.');
  }
  return apiKey;
}

/**
 * Make a Last.fm API request
 */
async function lastfmRequest<T>(
  method: string,
  params: Record<string, string>
): Promise<T | null> {
  try {
    const apiKey = getApiKey();
    const queryParams = new URLSearchParams({
      method,
      api_key: apiKey,
      format: 'json',
      ...params,
    });

    const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`);
    
    if (!response.ok) {
      console.error(`Last.fm API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Check for Last.fm API errors
    if (data.error) {
      console.error(`Last.fm error ${data.error}: ${data.message}`);
      return null;
    }

    return data as T;
  } catch (error) {
    console.error('Last.fm request failed:', error);
    return null;
  }
}

/**
 * Get user info from Last.fm
 */
export async function getLastFmUserInfo(username: string): Promise<LastFmUserInfo | null> {
  interface UserResponse {
    user: LastFmUserInfo;
  }
  
  const data = await lastfmRequest<UserResponse>('user.getInfo', { user: username });
  return data?.user ?? null;
}

/**
 * Get user's top artists from Last.fm
 */
export async function getLastFmTopArtists(
  username: string,
  period: '7day' | '1month' | '3month' | '6month' | '12month' | 'overall' = '3month',
  limit = 10
): Promise<LastFmArtist[]> {
  interface ArtistsResponse {
    topartists: { artist: LastFmArtist[] };
  }
  
  const data = await lastfmRequest<ArtistsResponse>('user.getTopArtists', {
    user: username,
    period,
    limit: limit.toString(),
  });
  
  return data?.topartists?.artist ?? [];
}

/**
 * Get user's top tracks from Last.fm
 */
export async function getLastFmTopTracks(
  username: string,
  period: '7day' | '1month' | '3month' | '6month' | '12month' | 'overall' = '3month',
  limit = 10
): Promise<LastFmTrack[]> {
  interface TracksResponse {
    toptracks: { track: LastFmTrack[] };
  }
  
  const data = await lastfmRequest<TracksResponse>('user.getTopTracks', {
    user: username,
    period,
    limit: limit.toString(),
  });
  
  return data?.toptracks?.track ?? [];
}

/**
 * Get user's recent tracks from Last.fm
 */
export async function getLastFmRecentTracks(
  username: string,
  limit = 20
): Promise<LastFmTrack[]> {
  interface RecentResponse {
    recenttracks: { track: LastFmTrack[] };
  }
  
  const data = await lastfmRequest<RecentResponse>('user.getRecentTracks', {
    user: username,
    limit: limit.toString(),
  });
  
  return data?.recenttracks?.track ?? [];
}

/**
 * Get user's weekly artist chart (for diversity calculation)
 */
export async function getLastFmWeeklyArtists(
  username: string
): Promise<number> {
  interface WeeklyResponse {
    weeklyartistchart: { artist: Array<{ name: string; playcount: string }> };
  }
  
  const data = await lastfmRequest<WeeklyResponse>('user.getWeeklyArtistChart', {
    user: username,
  });
  
  return data?.weeklyartistchart?.artist?.length ?? 0;
}

/**
 * Get complete Last.fm stats for a user
 */
export async function getLastFmStats(username: string): Promise<LastFmStats | null> {
  if (!username) return null;

  try {
    // Fetch all data in parallel
    const [userInfo, topArtists, topTracks, recentTracks, weeklyArtistCount] = await Promise.all([
      getLastFmUserInfo(username),
      getLastFmTopArtists(username, '3month', 10),
      getLastFmTopTracks(username, '3month', 10),
      getLastFmRecentTracks(username, 10),
      getLastFmWeeklyArtists(username),
    ]);

    if (!userInfo) {
      return null;
    }

    // Extract largest image from array
    const getImageUrl = (images?: Array<{ '#text': string; size: string }>): string | undefined => {
      if (!images || images.length === 0) return undefined;
      // Priority: extralarge > large > medium > small
      const sizePriority = ['extralarge', 'large', 'medium', 'small'];
      for (const size of sizePriority) {
        const img = images.find(i => i.size === size);
        if (img?.['#text']) return img['#text'];
      }
      return images[0]?.['#text'] || undefined;
    };

    return {
      totalScrobbles: parseInt(userInfo.playcount, 10) || 0,
      artistCount: parseInt(userInfo.artist_count, 10) || 0,
      trackCount: parseInt(userInfo.track_count, 10) || 0,
      registeredDate: new Date(parseInt(userInfo.registered.unixtime, 10) * 1000),
      topArtists: topArtists.map(a => ({
        name: a.name,
        playcount: parseInt(a.playcount, 10) || 0,
        imageUrl: getImageUrl(a.image),
      })),
      topTracks: topTracks.map(t => ({
        name: t.name,
        artist: t.artist.name,
        playcount: parseInt(t.playcount || '0', 10),
      })),
      recentTracks: recentTracks.map(t => ({
        name: t.name,
        artist: t.artist.name,
        album: t.album?.['#text'],
        playedAt: t.date ? new Date(parseInt(t.date.uts, 10) * 1000) : undefined,
        imageUrl: getImageUrl(t.image),
        nowPlaying: !t.date, // If no date, it's currently playing
      })),
      weeklyArtistCount,
    };
  } catch (error) {
    console.error('Error fetching Last.fm stats:', error);
    return null;
  }
}

/**
 * Store Last.fm username for a user
 */
export async function connectLastFm(userId: string, username: string): Promise<void> {
  // Verify the username exists on Last.fm
  const userInfo = await getLastFmUserInfo(username);
  if (!userInfo) {
    throw new Error('Last.fm username not found. Please check the username and try again.');
  }

  const updateMetadata = async () => {
    const { data, error } = await supabase.auth.updateUser({
      data: { lastfm_username: username },
    });
    if (error || !data?.user) {
      throw new Error('Failed to save Last.fm connection');
    }
  };

  // Store in user_providers (or a dedicated lastfm_connections table)
  // Using the provider_user_id field to store the username
  const { error } = await supabase
    .from('user_providers')
    .upsert({
      user_id: userId,
      provider: 'lastfm',
      provider_user_id: username,
      // Last.fm doesn't use OAuth tokens for public data
      access_token: 'public',
      refresh_token: 'public',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      connected_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    console.error('Failed to store Last.fm connection (user_providers):', error);
    // Fallback to auth user metadata when the DB schema/policies do not allow lastfm.
    await updateMetadata();
    return;
  }
}

/**
 * Get stored Last.fm username for a user
 */
export async function getLastFmUsername(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_providers')
    .select('provider_user_id')
    .eq('user_id', userId)
    .eq('provider', 'lastfm')
    .maybeSingle();

  if (!error && data?.provider_user_id) {
    return data.provider_user_id;
  }

  // Fallback to auth metadata when lastfm isn't stored in user_providers
  const { data: userData } = await supabase.auth.getUser();
  const meta = userData?.user?.user_metadata as { lastfm_username?: string } | undefined;
  if (userData?.user?.id === userId && meta?.lastfm_username) {
    return meta.lastfm_username;
  }

  return null;
}

/**
 * Disconnect Last.fm
 */
export async function disconnectLastFm(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_providers')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'lastfm');

  if (error) {
    console.warn('Failed to remove Last.fm from user_providers:', error);
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { lastfm_username: null },
  });
  if (metaError) {
    throw new Error('Failed to disconnect Last.fm');
  }
}
