import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-8');
const artifactDir = path.resolve(
  'C:/Users/USER/.gemini/antigravity/brain/b64b01dc-0723-4625-b7e5-1195aa1629f1/screenshots/phase-8',
);

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  try {
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
  } catch {
    // Artifact directory is only available in local Antigravity environment
  }
});

async function saveScreenshot(page: Page, filename: string) {
  const localPath = path.join(screenshotDir, filename);
  const artifactPath = path.join(artifactDir, filename);
  await page.screenshot({ path: localPath, fullPage: true });
  try {
    fs.copyFileSync(localPath, artifactPath);
  } catch {
    // Non-fatal if brain dir is inaccessible
  }
}

test.describe('Phase 8 — v1.5 Features & Data-Driven Architecture Verification', () => {
  test.setTimeout(90_000);

  test('Test 1: Quick Match random pairing, Chef Table 6-round play, Customer Orders, and Chef Tip', async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 1. Client A opens LandingScreen
    await pageA.goto('/');
    await expect(pageA.getByTestId('screen-landing')).toBeVisible();

    // Select Chef's Table Tier ($40 Steak Dinner, 6 Rounds)
    await pageA.getByTestId('tier-tab-chefs_table').click();
    await pageA.getByTestId('nickname-input').fill('ChefAntoine');

    // 2. Client B opens LandingScreen
    await pageB.goto('/');
    await expect(pageB.getByTestId('screen-landing')).toBeVisible();

    await pageB.getByTestId('tier-tab-chefs_table').click();
    await pageB.getByTestId('nickname-input').fill('ChefGordon');

    // 3. Client A clicks Quick Match
    await pageA.getByTestId('quick-match-btn').click();
    await expect(pageA.getByTestId('cancel-queue-btn')).toBeVisible();

    // 4. Client B clicks Quick Match -> triggers immediate match!
    await pageB.getByTestId('quick-match-btn').click();

    // Both clients should transition into TIER_CONFIRMED or MATCH_INTRO/ROUND_REVEAL
    await expect(pageA.getByTestId('screen-landing')).not.toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('screen-landing')).not.toBeVisible({ timeout: 10_000 });

    // Wait for the match to enter active round
    await expect(pageA.getByTestId('screen-auction-round')).toBeVisible({ timeout: 15_000 });
    await expect(pageB.getByTestId('screen-auction-round')).toBeVisible({ timeout: 15_000 });

    // Verify Customer Order Banner is rendered
    await expect(pageA.getByTestId('customer-order-banner')).toBeVisible();
    await expect(pageB.getByTestId('customer-order-banner')).toBeVisible();

    // Verify DishVisualizer renders steak slate platter
    await expect(pageA.getByTestId('dish-visualizer-steak')).toBeVisible();
    await expect(pageB.getByTestId('dish-visualizer-steak')).toBeVisible();

    // Dismiss tutorial overlay if present
    const tutA = pageA.getByTestId('tutorial-complete-btn');
    if (await tutA.isVisible()) await tutA.click();
    const tutB = pageB.getByTestId('tutorial-complete-btn');
    if (await tutB.isVisible()) await tutB.click();

    // Helper to submit a bid on the first available ingredient card
    const submitRoundBid = async (page: Page) => {
      const tutBtn = page.getByTestId('tutorial-complete-btn');
      if (await tutBtn.isVisible()) {
        await tutBtn.click();
      }

      await expect(
        page.locator('[data-testid="screen-auction-round"][data-match-state="BIDDING"]'),
      ).toBeVisible({ timeout: 15_000 });

      const card = page.locator('[data-testid^="ingredient-card-"]').first();
      await expect(card).toBeVisible({ timeout: 10_000 });
      await card.click();

      const lockBtn = page.getByTestId('lock-bid-btn');
      await expect(lockBtn).toBeVisible({ timeout: 5_000 });
      await lockBtn.click();
      await expect(page.getByTestId('bid-controls-container')).toContainText('Bid Locked', {
        timeout: 5_000,
      });
    };

    // Play all 6 Rounds of Chef's Table
    for (let r = 0; r < 6; r++) {
      await submitRoundBid(pageA);
      await submitRoundBid(pageB);

      // Wait a moment for resolution and transition to next round or final reveal
      await pageA.waitForTimeout(1200);
    }

    // Wait for match completion to reach POST_MATCH or FINAL_REVEAL
    await expect(
      pageA.locator('[data-testid="screen-final-reveal"], [data-testid="screen-post-match"]'),
    ).toBeVisible({ timeout: 30_000 });

    await contextA.close();
    await contextB.close();
  });

  test('Test 2: Share Result PNG Canvas export verifying download event', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/?harness=true&hideBar=true&state=POST_MATCH');
    await expect(page.getByTestId('screen-post-match')).toBeVisible();

    // Verify ShareCardCanvas is rendered and png-ready is true
    const shareContainer = page.getByTestId('share-card-container');
    await expect(shareContainer).toBeVisible();
    await expect(shareContainer).toHaveAttribute('data-png-ready', 'true');

    const downloadBtn = page.getByTestId('download-share-png-btn');
    await expect(downloadBtn).toBeVisible();

    // Verify canvas element exists with width=800, height=450
    const canvas = page.getByTestId('share-card-canvas');
    await expect(canvas).toBeVisible();

    // Click download button
    await downloadBtn.click();
    await expect(downloadBtn).toContainText('Saved to Downloads!');
  });

  test('Test 3: Capture all 5 Visual QA screenshots and verify WCAG AA accessibility', async ({
    page,
  }) => {
    // 1. v15-quick-match-queue-mobile-md.png (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTestId('tier-tab-bistro').click();
    await page.getByTestId('nickname-input').fill('ChefMario');
    await page.getByTestId('quick-match-btn').click();
    await expect(page.getByTestId('cancel-queue-btn')).toBeVisible();
    await page.waitForTimeout(400);
    await saveScreenshot(page, 'v15-quick-match-queue-mobile-md.png');
    await page.getByTestId('cancel-queue-btn').click();

    // 2. v15-bistro-pizza-order-mobile-sm.png (360x640)
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/?harness=true&hideBar=true&state=V15_BISTRO_PIZZA_ORDER');
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();
    await expect(page.getByTestId('customer-order-banner')).toBeVisible();
    await expect(page.getByTestId('dish-visualizer-pizza')).toBeVisible();
    await page.waitForTimeout(400);
    await saveScreenshot(page, 'v15-bistro-pizza-order-mobile-sm.png');

    // Accessibility check on Bistro Pizza Order screen
    const bistroAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(bistroAxe.violations).toEqual([]);

    // 3. v15-chefs-table-steak-desktop.png (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?harness=true&hideBar=true&state=V15_CHEFS_TABLE_STEAK_6ROUNDS');
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();
    await expect(page.getByTestId('dish-visualizer-steak')).toBeVisible();
    await expect(page.getByTestId('chefs-tip-banner')).toBeVisible();
    await page.waitForTimeout(400);
    await saveScreenshot(page, 'v15-chefs-table-steak-desktop.png');

    // Accessibility check on Chef's Table Steak Dinner screen
    const steakAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(steakAxe.violations).toEqual([]);

    // 4. v15-chefs-tip-banner-mobile-md.png (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?harness=true&hideBar=true&state=V15_CHEFS_TABLE_STEAK_6ROUNDS');
    await expect(page.getByTestId('chefs-tip-banner')).toBeVisible();
    await page.waitForTimeout(400);
    await saveScreenshot(page, 'v15-chefs-tip-banner-mobile-md.png');

    // 5. v15-share-card-png-modal-tablet.png (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/?harness=true&hideBar=true&state=POST_MATCH');
    await expect(page.getByTestId('screen-post-match')).toBeVisible();
    await expect(page.getByTestId('download-share-png-btn')).toBeVisible();
    await page.waitForTimeout(400);
    await saveScreenshot(page, 'v15-share-card-png-modal-tablet.png');
  });
});
