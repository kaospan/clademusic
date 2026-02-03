import { describe, it, expect } from 'vitest';
import { normalizeLastFmUsername } from '@/services/lastfmService';

describe('normalizeLastFmUsername', () => {
  it('extracts username from a Last.fm profile URL', () => {
    expect(normalizeLastFmUsername('https://www.last.fm/user/lottabase')).toBe('lottabase');
  });

  it('extracts username from a Last.fm profile URL with extra path', () => {
    expect(normalizeLastFmUsername('https://www.last.fm/user/lottabase/library')).toBe('lottabase');
  });

  it('extracts username from a URL without protocol', () => {
    expect(normalizeLastFmUsername('www.last.fm/user/lottabase')).toBe('lottabase');
  });

  it('strips @ prefix and whitespace', () => {
    expect(normalizeLastFmUsername('  @lottabase  ')).toBe('lottabase');
  });

  it('returns plain usernames unchanged (aside from trimming)', () => {
    expect(normalizeLastFmUsername('lottabase')).toBe('lottabase');
  });
});

