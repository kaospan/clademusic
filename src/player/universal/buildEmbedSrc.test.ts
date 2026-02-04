import { describe, expect, it } from 'vitest';
import { buildEmbedSrc, buildProviderDeepLink } from './buildEmbedSrc';

describe('buildEmbedSrc', () => {
  it('builds Spotify track embed URL', () => {
    const src = buildEmbedSrc('spotify', '4uLU6hMCjMI75M1A2tKUQC');
    expect(src).toContain('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
    expect(src).toContain('theme=0');
  });

  it('builds YouTube embed URL with autoplay and start', () => {
    const src = buildEmbedSrc('youtube', 'kJQP7kiw5Fk', { autoplay: true, startSec: 42, youtubeNoCookie: true });
    expect(src).toContain('https://www.youtube-nocookie.com/embed/kJQP7kiw5Fk');
    expect(src).toContain('autoplay=1');
    expect(src).toContain('start=42');
    expect(src).toContain('playsinline=1');
  });

  it('builds SoundCloud player URL', () => {
    const src = buildEmbedSrc('soundcloud', 'https://soundcloud.com/artist/track', { autoplay: true });
    expect(src).toContain('https://w.soundcloud.com/player/');
    expect(src).toContain('auto_play=true');
    expect(src).toContain(encodeURIComponent('https://soundcloud.com/artist/track'));
  });

  it('returns empty string for providers without embed', () => {
    expect(buildEmbedSrc('deezer', '123')).toBe('');
    expect(buildEmbedSrc('amazon_music', 'abc')).toBe('');
  });
});

describe('buildProviderDeepLink', () => {
  it('builds Spotify deep link', () => {
    expect(buildProviderDeepLink('spotify', 'abc')).toBe('https://open.spotify.com/track/abc');
  });

  it('builds YouTube deep link with time', () => {
    const url = buildProviderDeepLink('youtube', 'kJQP7kiw5Fk', { startSec: 90 });
    expect(url).toContain('https://www.youtube.com/watch');
    expect(url).toContain('v=kJQP7kiw5Fk');
    expect(url).toContain('t=90s');
  });
});

