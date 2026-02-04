// @ts-nocheck
import { test, expect } from '@playwright/test';

const playerLocator = '[data-player="universal"]';
const providerSelectors = {
  spotify: '[data-provider="spotify"]',
  youtube: '[data-provider="youtube"]',
};

async function expectSinglePlayer(page) {
  await expect(page.locator(playerLocator)).toHaveCount(1);
  await expect(page.locator('iframe#universal-player-host')).toHaveCount(1);
}

test.describe('Universal Player Singleton Enforcement', () => {
  test('only one playback surface exists at all times', async ({ page }) => {
    await page.goto('/clademusic/__e2e__/player');

    await page.waitForSelector('[data-e2e-player]');
    await page.waitForSelector(providerSelectors.spotify);
    await page.waitForSelector(providerSelectors.youtube);

    const spotifyButton = page.locator(providerSelectors.spotify).first();
    await expect(spotifyButton).toBeVisible();
    await spotifyButton.click();

    await expectSinglePlayer(page);

    const providerFrame = page.frameLocator('#universal-player-host').locator('iframe#provider');
    await expect(providerFrame).toHaveAttribute('src', /open\.spotify\.com\/embed\/track/);

    const youtubeButton = page.locator(providerSelectors.youtube).first();
    await expect(youtubeButton).toBeVisible();
    await youtubeButton.click();

    await expectSinglePlayer(page);
    await expect(providerFrame).toHaveAttribute('src', /youtube/);

    await spotifyButton.click();
    await expectSinglePlayer(page);
    await expect(providerFrame).toHaveAttribute('src', /open\.spotify\.com\/embed\/track/);

    const cardEmbeds = page.locator('[data-track-card] iframe');
    await expect(cardEmbeds).toHaveCount(0);
  });
});
