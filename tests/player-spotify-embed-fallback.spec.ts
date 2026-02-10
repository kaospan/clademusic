// @ts-nocheck
import { test, expect } from '@playwright/test';

/**
 * Verifies that Spotify playback falls back to the official embed for guests (no auth).
 * Ensures only one Spotify embed iframe is mounted and the universal player remains singleton.
 */
test.describe('Spotify embed fallback for guests', () => {
  test('renders a single Spotify embed iframe after clicking Spotify quickstream', async ({ page }) => {
    await page.goto('/clademusic/__e2e__/player');

    const spotifyBtn = page.locator('[data-provider="spotify"]').first();
    await expect(spotifyBtn).toBeVisible();

    await spotifyBtn.click();

    const providerFrame = page.frameLocator('#universal-player').locator('iframe#provider');
    await expect(providerFrame).toHaveCount(1, { timeout: 8000 });
    await expect(providerFrame).toHaveAttribute('src', /open\.spotify\.com\/embed\/track/);

    const playerContainer = page.locator('[data-player="universal"]');
    await expect(playerContainer).toHaveCount(1);
  });
});
