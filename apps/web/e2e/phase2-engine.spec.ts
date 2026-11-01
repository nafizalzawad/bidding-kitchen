import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-2');

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

const VIEWPORTS = [
  { name: 'mobile-sm', filename: 'engine-sandbox-mobile-sm.png', width: 360, height: 640 },
  { name: 'mobile-md', filename: 'engine-sandbox-mobile-md.png', width: 390, height: 844 },
  { name: 'tablet', filename: 'engine-sandbox-tablet.png', width: 768, height: 1024 },
  { name: 'desktop', filename: 'engine-sandbox-desktop.png', width: 1280, height: 800 },
];

test.describe('Phase 2 Engine Sandbox Visual & Invariant Verification', () => {
  for (const vp of VIEWPORTS) {
    test(`renders Engine Sandbox Inspector and captures ${vp.filename} at ${vp.width}x${vp.height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/?tab=engine-sandbox');

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      // Verify app title
      await expect(page.getByTestId('app-title')).toBeVisible({ timeout: 10_000 });

      // If tabs exist, navigate to Engine Sandbox
      const sandboxTab = page.getByTestId('tab-engine-sandbox');
      if (await sandboxTab.isVisible()) {
        await sandboxTab.click();
      }

      // Verify Engine Sandbox panel is active
      await expect(page.getByTestId('sim-seed-input')).toBeVisible();
      await expect(page.getByTestId('btn-simulate-match')).toBeVisible();
      await expect(page.getByTestId('match-winner-badge')).toBeVisible();

      // Verify scores and round cards
      await expect(page.getByTestId('p0-final-score')).toBeVisible();
      await expect(page.getByTestId('p1-final-score')).toBeVisible();
      await expect(page.getByTestId('round-card-0')).toBeVisible();
      await expect(page.getByTestId('round-card-4')).toBeVisible();

      // Capture full-page screenshot
      const screenshotPath = path.join(screenshotDir, vp.filename);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      expect(fs.existsSync(screenshotPath)).toBe(true);
      const stat = fs.statSync(screenshotPath);
      expect(stat.size).toBeGreaterThan(1000);
    });
  }

  test('executes Wagyu collision preset and captures engine-sandbox-collision-mobile-md.png at 390x844', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?tab=engine-sandbox');
    await page.evaluate(() => document.fonts.ready);

    const sandboxTab = page.getByTestId('tab-engine-sandbox');
    if (await sandboxTab.isVisible()) {
      await sandboxTab.click();
    }

    // Click the Wagyu collision preset button
    const collisionBtn = page.getByTestId('btn-test-collision');
    await expect(collisionBtn).toBeVisible();
    await collisionBtn.click();

    // Verify Round 2 (index 1, PATTY) displays collision outcome
    const round1Card = page.getByTestId('round-card-1');
    await expect(round1Card).toBeVisible();
    await expect(round1Card).toContainText('Collision: High Bid Win');
    await expect(round1Card).toContainText('patty_wagyu');

    // Capture full-page screenshot
    const filename = 'engine-sandbox-collision-mobile-md.png';
    const screenshotPath = path.join(screenshotDir, filename);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stat = fs.statSync(screenshotPath);
    expect(stat.size).toBeGreaterThan(1000);
  });
});
