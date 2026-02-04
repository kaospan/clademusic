// @ts-nocheck
import { test, expect } from '@playwright/test';

/**
 * Verifies that Spotify playback falls back to the official embed for guests (no auth).
 * Ensures only one Spotify embed iframe is mounted and the universal player remains singleton.
 */
test.describe('Spotify embed fallback for guests', () => {
  test('renders a single Spotify embed iframe after clicking Spotify quickstream', async ({ page }) => {
    await page.goto('/clademusic/feed');

    const spotifyBtn = page.locator('[data-provider="spotify"]').first();
    await expect(spotifyBtn).toBeVisible();

    await spotifyBtn.click();

    const embedIframe = page.locator('iframe[src*="open.spotify.com/embed/track"]');
    await expect(embedIframe).toHaveCount(1, { timeout: 8000 });

    const playerContainer = page.locator('[data-player="universal"]');
    await expect(playerContainer).toHaveCount(1);
  });
});
