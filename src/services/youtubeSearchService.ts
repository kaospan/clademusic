/**
 * YouTube Search Service
 * 
 * Automatically search for music videos on YouTube
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// If we encounter auth/quota errors, disable further YouTube API calls for this session
let youtubeSearchDisabled = false;
let youtubeSearchDisabledReason: string | null = null;
let youtubeWarningLogged = false;

function disableYouTubeSearch(reason: string) {
  youtubeSearchDisabled = true;
  youtubeSearchDisabledReason = reason;
  if (!youtubeWarningLogged) {
    console.warn('[YouTubeSearch] disabled:', reason);
    youtubeWarningLogged = true;
  }
}

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  // Direct 11-char ID
  const directId = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(directId)) return directId;

  // youtu.be short links
  const shortMatch = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch?.[1]) return shortMatch[1];

  // youtube.com/watch?v=VIDEOID
  const paramMatch = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (paramMatch?.[1]) return paramMatch[1];

  return null;
}

interface YouTubeSearchResult {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      channelTitle: string;
    };
  }>;
}

export interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  type: 'official' | 'cover' | 'live' | 'lyric' | 'audio';
}

/**
 * Fetch a single YouTube video by ID and return minimal metadata as a Track-like object
 */
export async function getYouTubeVideo(videoId: string) {
  if (youtubeSearchDisabled) {
    return null;
  }

  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  if (!apiKey) {
    disableYouTubeSearch('YouTube API key not configured');
    return null;
  }

  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: videoId,
    key: apiKey,
  });

  try {
    const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        disableYouTubeSearch(`YouTube API returned ${res.status} for video lookup`);
      }
      return null;
    }
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    // Rough parse of title into artist - title when possible
    const titleText: string = item.snippet.title || '';
    const [maybeArtist, maybeTitle] = titleText.includes(' - ') ? titleText.split(' - ', 2) : [undefined, titleText];

    // Convert ISO 8601 duration to ms
    const durationIso: string = item.contentDetails?.duration || '';
    const durationMs = iso8601DurationToMs(durationIso);

    return {
      id: `youtube:${videoId}`,
      title: maybeTitle || titleText,
      artist: maybeArtist || item.snippet.channelTitle,
      cover_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      youtube_id: videoId,
      duration_ms: durationMs,
      provider: 'youtube' as const,
    };
  } catch (err) {
    console.error('getYouTubeVideo error', err);
    return null;
  }
}

function iso8601DurationToMs(iso: string): number {
  // Very small parser for PT#M#S
  try {
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    const hours = parseInt(m[1] || '0', 10);
    const minutes = parseInt(m[2] || '0', 10);
    const seconds = parseInt(m[3] || '0', 10);
    return ((hours * 3600) + (minutes * 60) + seconds) * 1000;
  } catch {
    return 0;
  }
}

/**
 * Search YouTube for a song
 * Returns multiple video types: official, covers, live performances, etc.
 */
export async function searchYouTubeVideos(
  artist: string,
  title: string
): Promise<VideoResult[]> {
  if (youtubeSearchDisabled) {
    if (!youtubeWarningLogged && youtubeSearchDisabledReason) {
      console.warn('[YouTubeSearch] skipped because disabled:', youtubeSearchDisabledReason);
      youtubeWarningLogged = true;
    }
    return [];
  }

  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  
  if (!apiKey) {
    disableYouTubeSearch('YouTube API key not configured');
    return [];
  }

  try {
    const results: VideoResult[] = [];

    // If user typed/pasted a YouTube URL or direct video ID, short-circuit to a single fetch
    const directId = extractYouTubeId(title ? `${artist} ${title}` : artist);
    if (directId) {
      const directMeta = await fetchYouTubeVideoSnippet(directId, apiKey);
      if (directMeta) {
        return [{ videoId: directId, title: directMeta.title, channel: directMeta.channel, type: 'official' }];
      }
    }

    // Search 1: Official video/audio
    const officialQuery = `${artist} ${title} official`.trim();
    const officialResults = await searchYouTube(officialQuery, apiKey, 3);
    results.push(...officialResults.map(r => ({ ...r, type: 'official' as const })));
    
    // Search 2: Live performances
    const liveQuery = `${artist} ${title} live`.trim();
    const liveResults = await searchYouTube(liveQuery, apiKey, 2);
    results.push(...liveResults.map(r => ({ ...r, type: 'live' as const })));
    
    // Search 3: Covers
    const coverQuery = `${title || artist} cover`.trim();
    const coverResults = await searchYouTube(coverQuery, apiKey, 2);
    results.push(...coverResults.map(r => ({ ...r, type: 'cover' as const })));
    
    // Remove duplicates by videoId
    const unique = results.filter((v, i, arr) => 
      arr.findIndex(x => x.videoId === v.videoId) === i
    );
    
    return unique;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
}

/**
 * Search YouTube API
 */
async function searchYouTube(
  query: string,
  apiKey: string,
  maxResults: number
): Promise<Omit<VideoResult, 'type'>[]> {
  if (youtubeSearchDisabled) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    videoCategoryId: '10', // Music category
    maxResults: maxResults.toString(),
    key: apiKey,
  });

  const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);
  
  if (!response.ok) {
    console.error('YouTube API error:', response.status);
    if (response.status === 401 || response.status === 403) {
      disableYouTubeSearch(`YouTube API returned ${response.status} for search`);
    }
    return [];
  }

  const data: YouTubeSearchResult = await response.json();
  
  return data.items.map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
  }));
}

async function fetchYouTubeVideoSnippet(videoId: string, apiKey: string): Promise<{ title: string; channel: string } | null> {
  if (youtubeSearchDisabled) return null;

  const params = new URLSearchParams({
    part: 'snippet',
    id: videoId,
    key: apiKey,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      disableYouTubeSearch(`YouTube API returned ${res.status} for snippet fetch`);
    }
    return null;
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;
  return {
    title: item.snippet?.title || 'YouTube video',
    channel: item.snippet?.channelTitle || 'YouTube',
  };
}
