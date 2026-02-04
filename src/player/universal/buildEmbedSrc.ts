import type { MusicProvider } from '@/types';

export type EmbedBuildOptions = {
  autoplay?: boolean;
  startSec?: number;
  youtubeNoCookie?: boolean;
  appleStorefront?: string;
};

const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(value)));

export function buildProviderDeepLink(provider: MusicProvider, id: string, options?: Pick<EmbedBuildOptions, 'startSec'>) {
  const startSec = typeof options?.startSec === 'number' ? clampInt(options.startSec, 0, 24 * 60 * 60) : undefined;

  switch (provider) {
    case 'spotify':
      return `https://open.spotify.com/track/${encodeURIComponent(id)}`;
    case 'youtube': {
      const url = new URL(`https://www.youtube.com/watch`);
      url.searchParams.set('v', id);
      if (startSec && startSec > 0) url.searchParams.set('t', `${startSec}s`);
      return url.toString();
    }
    case 'apple_music':
      // No canonical deep link without knowing storefront; the embed URL will usually redirect appropriately.
      return `https://music.apple.com/us/song/${encodeURIComponent(id)}`;
    case 'soundcloud':
      // SoundCloud deep links are typically full URLs; if we only have an ID, fall back to SoundCloud search.
      return `https://soundcloud.com/search?q=${encodeURIComponent(id)}`;
    case 'deezer':
      return `https://www.deezer.com/track/${encodeURIComponent(id)}`;
    case 'amazon_music':
      return `https://music.amazon.com/search/${encodeURIComponent(id)}`;
    default: {
      const exhaustive: never = provider;
      return String(exhaustive);
    }
  }
}

export function buildEmbedSrc(provider: MusicProvider, id: string, options: EmbedBuildOptions = {}) {
  const autoplay = options.autoplay === true;
  const startSec = typeof options.startSec === 'number' ? clampInt(options.startSec, 0, 24 * 60 * 60) : undefined;

  switch (provider) {
    case 'spotify': {
      // Documented endpoint: https://open.spotify.com/embed/track/{id}
      // Avoid unsupported query params that can change behavior; "theme" is documented in embed generator.
      const url = new URL(`https://open.spotify.com/embed/track/${encodeURIComponent(id)}`);
      url.searchParams.set('theme', '0');
      return url.toString();
    }
    case 'youtube': {
      // Documented: https://www.youtube.com/embed/VIDEO_ID
      const base = options.youtubeNoCookie === false ? 'https://www.youtube.com/embed/' : 'https://www.youtube-nocookie.com/embed/';
      const url = new URL(`${base}${encodeURIComponent(id)}`);
      // Autoplay may be blocked without user gesture; host captures focus on first click.
      if (autoplay) url.searchParams.set('autoplay', '1');
      url.searchParams.set('playsinline', '1');
      url.searchParams.set('rel', '0');
      url.searchParams.set('modestbranding', '1');
      if (startSec && startSec > 0) url.searchParams.set('start', String(startSec));
      return url.toString();
    }
    case 'apple_music': {
      const storefront = options.appleStorefront || 'us';
      // Documented patterns vary by content type; default to song.
      return `https://embed.music.apple.com/${encodeURIComponent(storefront)}/song/${encodeURIComponent(id)}`;
    }
    case 'soundcloud': {
      // Documented: https://w.soundcloud.com/player/?url={url}
      // If id is already a URL, use it; otherwise, treat as a SoundCloud URL fragment.
      const trackUrl = id.startsWith('http://') || id.startsWith('https://') ? id : `https://soundcloud.com/${id}`;
      const url = new URL('https://w.soundcloud.com/player/');
      url.searchParams.set('url', trackUrl);
      if (autoplay) url.searchParams.set('auto_play', 'true');
      return url.toString();
    }
    case 'deezer':
    case 'amazon_music': {
      // No universal embed endpoints without SDKs; use a deep-link-open fallback in the parent UI.
      return '';
    }
    default: {
      const exhaustive: never = provider;
      return String(exhaustive);
    }
  }
}

