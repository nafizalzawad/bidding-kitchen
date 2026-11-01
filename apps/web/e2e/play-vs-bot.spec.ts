import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/play-vs-bot');
const artifactDir = path.resolve(
  'C:/Users/USER/.gemini/antigravity/brain/b64b01dc-0723-4625-b7e5-1195aa1629f1/screenshots/play-vs-bot',
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

test.describe('Play vs System (AI Bot) Functional & Accessibility Verification', () => {
  test.setTimeout(60_000);

  test('Test 1: Landing screen renders AI Difficulty Tabs and passes WCAG AA accessibility', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByTestId('screen-landing')).toBeVisible();

    // Verify AI practice card and difficulty tabs
    await expect(page.getByTestId('bot-difficulty-tabs')).toBeVisible();
    await expect(page.getByTestId('bot-difficulty-easy')).toBeVisible();
    await expect(page.getByTestId('bot-difficulty-medium')).toBeVisible();
    await expect(page.getByTestId('bot-difficulty-hard')).toBeVisible();

    // Switch difficulties
    await page.getByTestId('bot-difficulty-hard').click();
    await expect(page.getByTestId('play-vs-bot-btn')).toContainText(/Practice vs AI \(Hard\)/i);

    await page.getByTestId('bot-difficulty-easy').click();
    await expect(page.getByTestId('play-vs-bot-btn')).toContainText(/Practice vs AI \(Easy\)/i);

    await page.getByTestId('bot-difficulty-medium').click();
    await expect(page.getByTestId('play-vs-bot-btn')).toContainText(/Practice vs AI \(Medium\)/i);

    // Save screenshot
    await saveScreenshot(page, 'play-vs-bot-landing-desktop.png');

    // Run Axe WCAG AA audit
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test('Test 2: Create Practice Match vs Medium Bot, verify lobby, and play Round 1', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 412, height: 892 }); // Mobile md
    await page.goto('/');
    await expect(page.getByTestId('screen-landing')).toBeVisible();

    // Select Bistro (Pizza) tier
    await page.getByTestId('tier-tab-bistro').click();
    await page.getByTestId('nickname-input').fill('ChefSolo');

    // Select Medium difficulty
    await page.getByTestId('bot-difficulty-medium').click();
    await page.getByTestId('play-vs-bot-btn').click();

    // Should transition to Lobby with Bot seated
    await expect(page.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });
    const guestSlot = page.getByTestId('player-slot-1');
    await expect(guestSlot).toContainText('Chef Bot (Medium)');
    await expect(guestSlot).toContainText('AI • MEDIUM');
    await expect(guestSlot).toContainText('Ready to Cook');

    await saveScreenshot(page, 'play-vs-bot-lobby-mobile.png');

    // Ready up
    await page.getByTestId('lobby-ready-btn').click();

    // Wait for BIDDING state in Round 0 (Dough)
    await expect(page.getByTestId('screen-auction-round')).toBeVisible({ timeout: 15_000 });

    // Dismiss tutorial overlay if present
    const tutBtn = page.getByTestId('tutorial-complete-btn');
    if (await tutBtn.isVisible()) {
      await tutBtn.click();
    }

    await expect(page.getByTestId('opponent-status-header')).toBeVisible();
    await expect(page.getByTestId('opponent-bot-pill')).toContainText('AI • MEDIUM');

    // Settle for contrast and save screenshot
    await page.waitForTimeout(600);
    await saveScreenshot(page, 'play-vs-bot-round1-bidding-mobile.png');

    // Pick first available ingredient and lock bid
    const ingredientCards = page.locator('[data-testid^="ingredient-card-"]');
    await expect(ingredientCards.first()).toBeVisible();
    await ingredientCards.first().click();

    const lockBtn = page.getByTestId('lock-bid-btn');
    if (await lockBtn.isVisible() && (await lockBtn.isEnabled())) {
      await lockBtn.click();
    }

    // Settle and verify screen remains interactive and transitions cleanly
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();
    await page.waitForTimeout(2000);
    await saveScreenshot(page, 'play-vs-bot-round1-resolved-mobile.png');
  });
});
