// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Provider switch is atomic (no overlap)', () => {
  test('switching providers stops previous playback first', async ({ page }) => {
    await page.goto('/feed');

    await page.waitForSelector('[data-provider="spotify"]');
    await page.waitForSelector('[data-provider="youtube"]');

    await page.click('[data-provider="spotify"]');
    await page.waitForTimeout(800);

    await page.click('[data-provider="youtube"]');

    const states = await page.evaluate(() => {
      return (window as any).__PLAYER_DEBUG_STATE__;
    });

    expect(states.activeProvider).toBe('youtube');
    expect(states.isPlaying).toBe(true);
    expect(states.providers.spotify?.isPlaying).toBe(false);
    expect(states.providers.youtube?.isPlaying).toBe(true);
  });
});
