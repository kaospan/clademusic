import { describe, expect, it, vi } from 'vitest';
import { createDebouncedScheduler, sameTarget } from './switching';

describe('sameTarget', () => {
  it('is true only for identical provider/id/src', () => {
    expect(sameTarget(null, null)).toBe(false);
    expect(sameTarget({ provider: 'spotify', id: '1', src: 'a' }, { provider: 'spotify', id: '1', src: 'a' })).toBe(true);
    expect(sameTarget({ provider: 'spotify', id: '1', src: 'a' }, { provider: 'spotify', id: '2', src: 'a' })).toBe(false);
  });
});

describe('createDebouncedScheduler', () => {
  it('fires only once with the latest payload', () => {
    vi.useFakeTimers();
    const fired: number[] = [];
    const scheduler = createDebouncedScheduler<number>(200, (n) => fired.push(n));

    scheduler.request(1);
    scheduler.request(2);
    scheduler.request(3);
    vi.advanceTimersByTime(199);
    expect(fired).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(fired).toEqual([3]);

    vi.useRealTimers();
  });
});

