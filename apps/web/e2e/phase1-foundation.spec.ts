import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-1');

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

const VIEWPORTS = [
  { name: 'mobile-sm', filename: 'contract-diagnostic-mobile-sm.png', width: 360, height: 640 },
  { name: 'mobile-md', filename: 'contract-diagnostic-mobile-md.png', width: 390, height: 844 },
  { name: 'tablet', filename: 'contract-diagnostic-tablet.png', width: 768, height: 1024 },
  { name: 'desktop', filename: 'contract-diagnostic-desktop.png', width: 1280, height: 800 },
];

test.describe('Phase 1 Foundation Visual & Contract Verification', () => {
  for (const vp of VIEWPORTS) {
    test(`renders diagnostic page, asserts layout invariants, and captures ${vp.filename} at ${vp.width}x${vp.height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Wait for fonts to be loaded
      await page.evaluate(() => document.fonts.ready);

      // Verify app title
      await expect(page.getByTestId('app-title')).toBeVisible({ timeout: 10_000 });

      // If tabs exist, navigate to contract diagnostics
      const contractTab = page.getByTestId('tab-contract-diagnostics');
      if (await contractTab.isVisible()) {
        await contractTab.click();
      }

      await expect(page.getByTestId('tag-swatch-section')).toBeVisible();
      await expect(page.getByTestId('tier-list-section')).toBeVisible();
      await expect(page.getByTestId('street-ingredients-section')).toBeVisible();

      // Verify server health badge is online
      const healthBadge = page.getByTestId('server-health-badge');
      await expect(healthBadge).toBeVisible();
      await expect(healthBadge).toContainText('online');

      // Check flavor tag pills
      await expect(page.getByTestId('flavor-pill-smoky').first()).toBeVisible();
      await expect(page.getByTestId('flavor-pill-spicy').first()).toBeVisible();
      await expect(page.getByTestId('flavor-pill-rich').first()).toBeVisible();
      await expect(page.getByTestId('flavor-pill-crispy').first()).toBeVisible();
      await expect(page.getByTestId('flavor-pill-fresh').first()).toBeVisible();

      // Verify Wagyu card attributes
      const wagyuCard = page.getByTestId('ingredient-card-street_patty_wagyu');
      await expect(wagyuCard).toBeVisible();
      await expect(wagyuCard).toContainText('Wagyu');
      await expect(wagyuCard).toContainText('$8');
      await expect(wagyuCard).toContainText('Taste: 10');
      await expect(wagyuCard).toContainText('Stock: 1 (Limited)');

      // Automated layout invariant: Zero horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width);

      // Automated layout invariant: Touch targets >= 44x44
      const interactiveButtons = page.locator('button');
      const buttonCount = await interactiveButtons.count();
      for (let i = 0; i < buttonCount; i++) {
        const btn = interactiveButtons.nth(i);
        if (await btn.isVisible()) {
          const box = await btn.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }

      // Capture screenshot
      const filePath = path.join(screenshotDir, vp.filename);
      await page.screenshot({ path: filePath, fullPage: true });

      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(10_000);
    });
  }

  test('verifies all 19 canonical Street Burger ingredients are listed', async ({ page }) => {
    await page.goto('/');
    const contractTab = page.getByTestId('tab-contract-diagnostics');
    if (await contractTab.isVisible()) {
      await contractTab.click();
    }
    const cards = page.locator('[data-testid^="ingredient-card-street_"]');
    await expect(cards).toHaveCount(19);
  });
});
