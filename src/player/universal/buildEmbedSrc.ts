import { MusicProvider } from '@/types';

const clampNonNegativeInt = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
};

const normalizeSpotifyTrackId = (raw: string) => {
  if (raw.startsWith('spotify:track:')) return raw.split(':').pop() || raw;
  return raw;
};

export function buildProviderEmbedSrc(
  provider: MusicProvider,
  id: string,
  opts?: { autoplay?: boolean; startSec?: number | null },
): string | null {
  const autoplay = opts?.autoplay !== false;
  const startSec = clampNonNegativeInt(opts?.startSec);

  switch (provider) {
    case 'spotify': {
      const trackId = normalizeSpotifyTrackId(id);
      const url = new URL(`https://open.spotify.com/embed/track/${trackId}`);
      url.searchParams.set('utm_source', 'clade');
      url.searchParams.set('theme', '0');
      if (autoplay) url.searchParams.set('autoplay', '1');
      return url.toString();
    }
    case 'youtube': {
      const url = new URL(`https://www.youtube.com/embed/${id}`);
      url.searchParams.set('autoplay', autoplay ? '1' : '0');
      url.searchParams.set('mute', '0');
      url.searchParams.set('rel', '0');
      url.searchParams.set('modestbranding', '1');
      url.searchParams.set('playsinline', '1');
      url.searchParams.set('enablejsapi', '1');
      if (startSec !== undefined && startSec > 0) {
        url.searchParams.set('start', String(startSec));
      }
      return url.toString();
    }
    default:
      return null;
  }
}

export function buildProviderDeepLink(
  provider: MusicProvider,
  id: string,
  opts?: { startSec?: number | null },
): string {
  const startSec = clampNonNegativeInt(opts?.startSec);

  switch (provider) {
    case 'spotify': {
      const trackId = normalizeSpotifyTrackId(id);
      return `https://open.spotify.com/track/${trackId}`;
    }
    case 'youtube': {
      const url = new URL('https://www.youtube.com/watch');
      url.searchParams.set('v', id);
      if (startSec !== undefined && startSec > 0) {
        url.searchParams.set('t', `${startSec}s`);
      }
      return url.toString();
    }
    case 'apple_music':
    case 'amazon_music':
    case 'deezer':
    case 'soundcloud':
    default:
      return id;
  }
}

