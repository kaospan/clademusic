import { test, expect } from '@playwright/test';

test('Spotify quickstream swaps provider src deterministically (singleton universal iframe)', async ({ page }) => {
  // Block external calls (Supabase + provider domains) to keep tests hermetic.
  await page.route('**/*.supabase.co/**', (route) => route.fulfill({ status: 200, body: '{}' }));
  await page.route('**open.spotify.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>spotify</body></html>' })
  );
  await page.route('**youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>youtube</body></html>' })
  );
  await page.route('**www.youtube.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>youtube</body></html>' })
  );

  await page.goto('/clademusic/__e2e__/player');

  await expect(page.locator('iframe#universal-player')).toHaveCount(1);

  // Click Track A Spotify quickstream button (first spotify button on page)
  const spotifyButtons = page.locator('[data-provider="spotify"]');
  await expect(spotifyButtons).toHaveCount(2);

  await spotifyButtons.nth(0).click();
  await expect(page.getByText('E2E Track A')).toBeVisible();

  const universalFrame = page.frameLocator('#universal-player');
  const providerFrame = universalFrame.locator('iframe#provider');
  await expect(providerFrame).toHaveCount(1);
  await expect(providerFrame).toHaveAttribute('src', /open\.spotify\.com\/embed\/track\/4uLU6hMCjMI75M1A2tKUQC/);

  // Click Track B via keyboard activation
  await spotifyButtons.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('E2E Track B')).toBeVisible();
  await expect(providerFrame).toHaveAttribute('src', /open\.spotify\.com\/embed\/track\/7ouMYWpwJ422jRcDASZB7P/);
});
