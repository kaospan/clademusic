/**
 * Unified Music Search Service
 * Coordinates parallel searches across all providers and deduplicates results
 */

import { Track, MusicProvider, SearchResult, SearchParams, ProviderLink } from '@/types';
import { ProviderConnector, NormalizedTrack, tracksAreSimilar } from './connectors/base';
import { SpotifyConnector } from './connectors/spotify';
import { YouTubeConnector } from './connectors/youtube';
import {
  AppleMusicConnector,
  DeezerConnector,
  SoundCloudConnector,
  AmazonMusicConnector,
} from './connectors/stubs';
import { supabase } from '@/integrations/supabase/client';

/**
 * Manager for all provider connectors
 */
class ConnectorRegistry {
  private connectors: Map<MusicProvider, ProviderConnector> = new Map();

  constructor() {
    // Initialize all connectors
    // Spotify uses server-side Edge Function for authentication (no client secret exposed)
    // The SpotifyConnector will call the Edge Function instead of using client credentials
    this.register(new SpotifyConnector(
      import.meta.env.VITE_SPOTIFY_CLIENT_ID
      // NOTE: Client secret is NOT exposed here - auth happens server-side
    ));
    
    this.register(new YouTubeConnector(
      import.meta.env.VITE_YOUTUBE_API_KEY
    ));
    
    this.register(new AppleMusicConnector());
    this.register(new DeezerConnector());
    this.register(new SoundCloudConnector());
    this.register(new AmazonMusicConnector());
  }

  private register(connector: ProviderConnector) {
    this.connectors.set(connector.name, connector);
  }

  getAll(): ProviderConnector[] {
    return Array.from(this.connectors.values());
  }

  getEnabled(): ProviderConnector[] {
    return this.getAll().filter(c => c.enabled);
  }

  get(provider: MusicProvider): ProviderConnector | undefined {
    return this.connectors.get(provider);
  }
}

// Singleton registry
const connectorRegistry = new ConnectorRegistry();

/**
 * Deduplicate tracks by ISRC or by similarity matching
 */
function deduplicateTracks(tracks: NormalizedTrack[]): Map<string, NormalizedTrack[]> {
  const grouped = new Map<string, NormalizedTrack[]>();

  for (const track of tracks) {
    let foundGroup = false;

    // First try ISRC matching (most reliable)
    if (track.isrc) {
      for (const [key, group] of grouped.entries()) {
        if (group[0].isrc === track.isrc) {
          group.push(track);
          foundGroup = true;
          break;
        }
      }
    }

    // If no ISRC match, try similarity matching
    if (!foundGroup) {
      for (const [key, group] of grouped.entries()) {
        if (tracksAreSimilar(group[0], track)) {
          group.push(track);
          foundGroup = true;
          break;
        }
      }
    }

    // Create new group if no match found
    if (!foundGroup) {
      const groupKey = track.isrc || `${track.title}-${track.artists[0]}-${track.provider}`;
      grouped.set(groupKey, [track]);
    }
  }

  return grouped;
}

/**
 * Merge normalized tracks into canonical Track objects
 */
function mergeToCanonicalTracks(groupedTracks: Map<string, NormalizedTrack[]>): Track[] {
  const canonical: Track[] = [];

  for (const [_, tracks] of groupedTracks) {
    // Use the track with most complete data as the base
    const base = tracks.reduce((best, current) => {
      const bestScore = (best.artwork_url ? 1 : 0) + (best.isrc ? 1 : 0) + (best.album ? 1 : 0);
      const currentScore = (current.artwork_url ? 1 : 0) + (current.isrc ? 1 : 0) + (current.album ? 1 : 0);
      return currentScore > bestScore ? current : best;
    });

    // Build provider IDs and links
    const providerIds: Record<string, string> = {};
    const providerLinks: ProviderLink[] = [];

    for (const track of tracks) {
      providerIds[track.provider] = track.provider_track_id;
      providerLinks.push({
        provider: track.provider,
        provider_track_id: track.provider_track_id,
        url_web: track.url_web,
        url_app: track.url_app,
        url_preview: track.url_preview,
      });
    }

    canonical.push({
      id: base.isrc || `${base.provider}-${base.provider_track_id}`,
      title: base.title,
      artists: base.artists,
      album: base.album,
      duration_ms: base.duration_ms,
      artwork_url: base.artwork_url,
      isrc: base.isrc,
      providerIds: providerIds as any,
      providerLinks,
      
      // Legacy fields for backward compatibility
      artist: base.artists[0],
      cover_url: base.artwork_url,
      external_id: base.provider_track_id,
      provider: base.provider,
      
      // Audio features if available
      energy: base.energy,
      danceability: base.danceability,
      valence: base.valence,
    });
  }

  return canonical;
}

/**
 * Main unified search function
 * Searches all enabled providers in parallel and deduplicates results
 */
export async function unifiedSearch(params: SearchParams): Promise<SearchResult> {
  const { query, market = 'US', limit = 20 } = params;

  // Check cache first
  const cached = await checkSearchCache(query, market);
  if (cached) {
    return {
      tracks: cached,
      total: cached.length,
      cached: true,
    };
  }

  const connectors = connectorRegistry.getEnabled();
  const warnings: string[] = [];
  const partialResults: string[] = [];

  // Execute searches in parallel with error handling
  const searchPromises = connectors.map(async (connector) => {
    try {
      return await connector.searchTracks({
        query,
        market,
        limit: Math.ceil(limit / connectors.length) + 5, // Request more to account for deduping
        timeout: 5000,
      });
    } catch (error) {
      console.error(`${connector.name} search failed:`, error);
      partialResults.push(connector.name);
      return [];
    }
  });

  const results = await Promise.allSettled(searchPromises);
  
  // Collect all successful results
  const allTracks: NormalizedTrack[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allTracks.push(...result.value);
    }
  }

  // Deduplicate and merge
  const grouped = deduplicateTracks(allTracks);
  const canonicalTracks = mergeToCanonicalTracks(grouped);

  // Sort by number of providers (tracks available on more platforms come first)
  canonicalTracks.sort((a, b) => b.providerLinks.length - a.providerLinks.length);

  // Limit results
  const limitedTracks = canonicalTracks.slice(0, limit);

  // Cache results
  await cacheSearchResults(query, market, limitedTracks);

  if (partialResults.length > 0) {
    warnings.push(`Some providers unavailable: ${partialResults.join(', ')}`);
  }

  return {
    tracks: limitedTracks,
    total: limitedTracks.length,
    cached: false,
    partial_results: partialResults.length > 0 ? partialResults : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check search cache in database
 */
async function checkSearchCache(query: string, market: string): Promise<Track[] | null> {
  try {
    const { data, error } = await supabase
      .from('search_cache')
      .select('results')
      .eq('query', query)
      .eq('market', market)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    
    // Results is stored as JSON, need to parse it properly
    const results = data.results;
    if (Array.isArray(results)) {
      return results as unknown as Track[];
    }
    return null;
  } catch (error) {
    console.error('Cache check failed:', error);
    return null;
  }
}

/**
 * Cache search results in database
 */
async function cacheSearchResults(query: string, market: string, tracks: Track[]): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await supabase
      .from('search_cache')
      .insert({
        query,
        market,
        results: tracks as any,
        expires_at: expiresAt.toISOString(),
      });
  } catch (error) {
    console.error('Cache write failed:', error);
  }
}

/**
 * Get connector registry for direct access
 */
export function getConnectorRegistry(): ConnectorRegistry {
  return connectorRegistry;
}
