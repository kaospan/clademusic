// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Universal player z-index dominance', () => {
  test('player must be visually above feed and controls', async ({ page }) => {
    await page.goto('/clademusic/feed');

    await page.waitForSelector('[data-provider="spotify"]');

    await page.click('[data-provider="spotify"]');

    const playerZ = await page.evaluate(() => {
      const player = document.querySelector('[data-player="universal"]');
      if (!player) return null;
      return parseInt(getComputedStyle(player).zIndex || '0', 10);
    });

    const feedZ = await page.evaluate(() => {
      const feed = document.querySelector('[data-feed]');
      if (!feed) return 0;
      const val = parseInt(getComputedStyle(feed).zIndex || '0', 10);
      return Number.isNaN(val) ? 0 : val;
    });

    expect(playerZ).not.toBeNull();
    expect(playerZ!).toBeGreaterThan(feedZ);
    expect(playerZ!).toBeGreaterThan(100);
  });
});
