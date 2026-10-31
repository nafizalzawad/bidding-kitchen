import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target folder for Phase 1 visual verification screenshots
const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-1');

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

const VIEWPORTS = [
  { name: 'mobile-compact', width: 360, height: 640 },
  { name: 'mobile-standard', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

test.describe('Phase 1 Foundation Visual & Contract Verification', () => {
  for (const vp of VIEWPORTS) {
    test(`renders diagnostic page and captures screenshot at ${vp.width}x${vp.height} (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Wait for main title and components
      await expect(
        page.getByRole('heading', { level: 1, name: /Bidding Kitchen/i })
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Phase 1 Foundation')).toBeVisible();

      // Check flavor tag pills
      await expect(page.getByTestId('flavor-pill-smoky').first()).toBeVisible();
      await expect(page.getByTestId('flavor-pill-spicy').first()).toBeVisible();
      await expect(page.getByTestId('flavor-pill-rich').first()).toBeVisible();
      await expect(page.getByTestId('flavor-pill-crispy').first()).toBeVisible();
      await expect(page.getByTestId('flavor-pill-fresh').first()).toBeVisible();

      // Ensure at least one key ingredient card is visible
      await expect(page.getByTestId('ingredient-card-street-patty-wagyu')).toBeVisible();

      // Capture screenshot
      const filename = `viewport-${vp.width}x${vp.height}.png`;
      const filePath = path.join(screenshotDir, filename);
      await page.screenshot({ path: filePath, fullPage: true });

      expect(fs.existsSync(filePath)).toBe(true);
    });
  }

  test('verifies all 19 canonical Street Burger ingredients are listed', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('[data-testid^="ingredient-card-street-"]');
    await expect(cards).toHaveCount(19);
  });
});
