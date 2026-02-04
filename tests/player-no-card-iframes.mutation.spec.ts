// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Track cards never render iframes (mutation guard)', () => {
  test('no iframe may exist inside any track card at any time', async ({ page }) => {
    await page.goto('/clademusic/feed');

    await page.waitForSelector('[data-provider="youtube"]');

    await page.click('[data-provider="youtube"]');

    const hasIllegalIframe = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const observer = new MutationObserver(() => {
          const bad = document.querySelectorAll('[data-track-card] iframe');
          if (bad.length > 0) {
            observer.disconnect();
            resolve(true);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        setTimeout(() => {
          observer.disconnect();
          resolve(false);
        }, 1500);
      });
    });

    expect(hasIllegalIframe).toBe(false);
  });
});
