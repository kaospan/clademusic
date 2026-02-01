// Music provider utilities and link generation

export type MusicProvider = 'spotify' | 'youtube' | 'apple_music' | 'deezer' | 'soundcloud' | 'amazon_music';

export interface ProviderLink {
  provider: MusicProvider;
  name: string;
  icon: string;
  webUrl: string;
  appUrl?: string;
  color: string;
}

export interface TrackProviderInfo {
  spotifyId?: string;
  youtubeId?: string;
  urlSpotifyWeb?: string;
  urlSpotifyApp?: string;
  urlYoutube?: string;
  appleMusicId?: string;
  deezerId?: string;
  soundcloudId?: string;
  amazonMusicId?: string;
}

// Generate Spotify URLs from track ID
export function generateSpotifyLinks(spotifyId: string): { web: string; app: string } {
  return {
    web: `https://open.spotify.com/track/${spotifyId}`,
    app: `spotify:track:${spotifyId}`,
  };
}

// Generate YouTube URL from video ID
export function generateYoutubeLink(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

// Get all available provider links for a track
export function getProviderLinks(track: TrackProviderInfo): ProviderLink[] {
  const links: ProviderLink[] = [];

  if (track.spotifyId || track.urlSpotifyWeb) {
    const spotifyLinks = track.spotifyId 
      ? generateSpotifyLinks(track.spotifyId)
      : { web: track.urlSpotifyWeb!, app: track.urlSpotifyApp };
    
    links.push({
      provider: 'spotify',
      name: 'Spotify',
      icon: '🎵',
      webUrl: spotifyLinks.web,
      appUrl: spotifyLinks.app,
      color: '#1DB954',
    });
  }

  if (track.youtubeId || track.urlYoutube) {
    const youtubeUrl = track.youtubeId 
      ? generateYoutubeLink(track.youtubeId) 
      : track.urlYoutube!;
    
    links.push({
      provider: 'youtube',
      name: 'YouTube (Free)',
      icon: '▶️',
      webUrl: youtubeUrl,
      color: '#FF0000',
    });
  }

  return links;
}

// Open provider link - opens web player directly
export function openProviderLink(link: ProviderLink, preferApp = false): void {
  const targetUrl = preferApp && link.appUrl ? link.appUrl : link.webUrl;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

// Provider display info
export const PROVIDER_INFO: Record<MusicProvider, { name: string; icon: string; color: string }> = {
  spotify: { name: 'Spotify', icon: '🎵', color: '#1DB954' },
  youtube: { name: 'YouTube', icon: '▶️', color: '#FF0000' },
  apple_music: { name: 'Apple Music', icon: '🍎', color: '#FA243C' },
  deezer: { name: 'Deezer', icon: '🎧', color: '#FF6600' },
  soundcloud: { name: 'SoundCloud', icon: '☁️', color: '#FF5500' },
  amazon_music: { name: 'Amazon Music', icon: '📦', color: '#00A8E1' },
};
