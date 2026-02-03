import type { Track } from '@/types';

type SpotifyImage = { url: string; height?: number; width?: number };
type SpotifyArtist = { id?: string; name: string };
type SpotifyAlbum = { id?: string; name: string; images: SpotifyImage[] };

export type SpotifyApiTrack = {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  external_urls?: { spotify?: string };
  uri?: string;
  preview_url?: string;
  external_ids?: { isrc?: string };
};

function pickBestImage(images: SpotifyImage[] | undefined): SpotifyImage | undefined {
  if (!images || images.length === 0) return undefined;
  let best = images[0];
  let bestScore = (best.width ?? 0) * (best.height ?? 0);
  for (let i = 1; i < images.length; i++) {
    const img = images[i];
    const score = (img.width ?? 0) * (img.height ?? 0);
    if (score > bestScore) {
      best = img;
      bestScore = score;
    }
  }
  return best;
}

export function spotifyApiTrackToTrack(track: SpotifyApiTrack): Track {
  const artwork = pickBestImage(track.album?.images);
  const artistNames = track.artists?.map((a) => a.name).filter(Boolean) ?? [];

  return {
    id: `spotify:${track.id}`,
    title: track.name,
    artist: artistNames.join(', '),
    artists: artistNames,
    album: track.album?.name,
    cover_url: artwork?.url,
    artwork_url: artwork?.url,
    duration_ms: track.duration_ms,
    preview_url: track.preview_url,
    spotify_id: track.id,
    url_spotify_web: track.external_urls?.spotify,
    url_spotify_app: track.uri,
    provider: 'spotify',
    external_id: track.id,
    isrc: track.external_ids?.isrc,
  };
}

