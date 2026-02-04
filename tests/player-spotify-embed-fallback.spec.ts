// @ts-nocheck
import { test, expect } from '@playwright/test';

/**
 * Verifies that Spotify playback falls back to the official embed for guests (no auth).
 * Ensures only one Spotify embed iframe is mounted and the universal player remains singleton.
 */
test.describe('Spotify embed fallback for guests', () => {
  test('renders a single Spotify embed iframe after clicking Spotify quickstream', async ({ page }) => {
    await page.goto('/clademusic/__e2e__/player');

    await page.waitForSelector('[data-e2e-player]');
    const spotifyBtn = page.locator('[data-provider="spotify"]').first();
    await expect(spotifyBtn).toBeVisible();

    await spotifyBtn.click();

    const providerFrame = page.frameLocator('#universal-player-host').locator('iframe#provider');
    await expect(providerFrame).toHaveAttribute('src', /open\.spotify\.com\/embed\/track/, { timeout: 8000 });

    const playerContainer = page.locator('[data-player="universal"]');
    await expect(playerContainer).toHaveCount(1);
  });
});
