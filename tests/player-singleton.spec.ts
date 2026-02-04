// @ts-nocheck
import { test, expect } from '@playwright/test';

const playerLocator = '[data-player="universal"]';
const providerSelectors = {
  spotify: '[data-provider="spotify"]',
  youtube: '[data-provider="youtube"]',
};

async function expectSinglePlayer(page) {
  await expect(page.locator(playerLocator)).toHaveCount(1);
}

test.describe('Universal Player Singleton Enforcement', () => {
  test('only one playback surface exists at all times', async ({ page }) => {
    await page.goto('/clademusic/feed');

    await page.waitForSelector(providerSelectors.spotify);
    await page.waitForSelector(providerSelectors.youtube);

    const spotifyButton = page.locator(providerSelectors.spotify).first();
    await expect(spotifyButton).toBeVisible();
    await spotifyButton.click();

    await expectSinglePlayer(page);

    const youtubeIframes = page.locator('iframe[src*="youtube"]');
    const initialYouTubeCount = await youtubeIframes.count();
    expect(initialYouTubeCount).toBeLessThanOrEqual(1);

    const youtubeButton = page.locator(providerSelectors.youtube).first();
    await expect(youtubeButton).toBeVisible();
    await youtubeButton.click();

    await expectSinglePlayer(page);
    await expect(youtubeIframes).toHaveCount(1);

    await spotifyButton.click();
    await expectSinglePlayer(page);
    const afterSwitchYouTubeCount = await youtubeIframes.count();
    expect(afterSwitchYouTubeCount).toBeLessThanOrEqual(1);

    const cardEmbeds = page.locator('[data-track-card] iframe');
    await expect(cardEmbeds).toHaveCount(0);
  });
});
