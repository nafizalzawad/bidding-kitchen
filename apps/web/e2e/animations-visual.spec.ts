import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-6');
const artifactDir = path.resolve('C:/Users/USER/.gemini/antigravity/brain/b64b01dc-0723-4625-b7e5-1195aa1629f1/screenshots/phase-6');

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

async function saveScreenshot(page: any, filename: string) {
  const localPath = path.join(screenshotDir, filename);
  const artifactPath = path.join(artifactDir, filename);
  await page.screenshot({ path: localPath, fullPage: true });
  try {
    fs.copyFileSync(localPath, artifactPath);
  } catch {
    // Non-fatal if brain dir is inaccessible
  }
}

test.describe('Phase 6 Animations, Audio and Juice Visual QA & Invariants', () => {
  test.setTimeout(45_000);

  test('Checkpoint 1 (100ms mobile): Bid cards face-down mystery sealed vaults', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?harness=true&state=ROUND_RESOLVE_COLLISION&animStepMs=100');

    // Wait for screen to mount
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();

    // Verify card face-down
    const cardP0 = page.getByTestId('bid-reveal-card-p1');
    await expect(cardP0).toHaveAttribute('data-flip-phase', 'face-down');
    await expect(page.getByTestId('sealed-bid-badge-p0')).toBeVisible();

    // Outcome badges should NOT be visible at 100ms
    await expect(page.getByTestId('bid-outcome-winner-p0')).not.toBeVisible();

    await saveScreenshot(page, 'resolve-checkpoint-1-facedown-100ms-mobile.png');
  });

  test('Checkpoint 2 (700ms mobile): Bid cards flipped face-up with winner ring and price', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?harness=true&state=ROUND_RESOLVE_COLLISION&animStepMs=700');

    await expect(page.getByTestId('screen-auction-round')).toBeVisible();

    // Verify card face-up
    const cardP0 = page.getByTestId('bid-reveal-card-p1');
    await expect(cardP0).toHaveAttribute('data-flip-phase', 'face-up');
    await expect(page.getByTestId('sealed-bid-badge-p0')).not.toBeVisible();

    // Winner badge should be visible
    await expect(page.getByTestId('bid-outcome-winner-p0')).toBeVisible();

    await saveScreenshot(page, 'resolve-checkpoint-2-flipped-700ms-mobile.png');
  });

  test('Checkpoint 3 (1600ms mobile): Slap landed on burger stack, budget drained', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?harness=true&state=ROUND_RESOLVE_COLLISION&animStepMs=1600');

    await expect(page.getByTestId('screen-auction-round')).toBeVisible();
    await expect(page.getByTestId('dish-visualizer')).toBeVisible();

    // Verify card remains face-up
    const cardP0 = page.getByTestId('bid-reveal-card-p1');
    await expect(cardP0).toHaveAttribute('data-flip-phase', 'face-up');

    // Budget track and fill are visible
    await expect(page.getByTestId('budget-bar-track')).toBeVisible();
    await expect(page.getByTestId('budget-bar-fill')).toBeVisible();

    await saveScreenshot(page, 'resolve-checkpoint-3-slap-landed-1600ms-mobile.png');
  });

  test('Checkpoint 4 (300ms desktop): Final reveal scoreboard at Step 1 (Taste points)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?harness=true&state=FINAL_REVEAL&animStepMs=300');

    await expect(page.getByTestId('screen-final-reveal')).toBeVisible();

    const stepIndicator = page.getByTestId('final-reveal-step');
    await expect(stepIndicator).toHaveAttribute('data-step', '1');

    await expect(page.getByTestId('score-row-taste')).toBeVisible();

    await saveScreenshot(page, 'final-reveal-step1-300ms-desktop.png');
  });

  test('Checkpoint 5 (3000ms desktop): Final reveal scoreboard at Step 5 (Full tally & victory)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?harness=true&state=FINAL_REVEAL&animStepMs=3000');

    await expect(page.getByTestId('screen-final-reveal')).toBeVisible();

    const stepIndicator = page.getByTestId('final-reveal-step');
    await expect(stepIndicator).toHaveAttribute('data-step', '5');

    await expect(page.getByTestId('score-row-total')).toBeVisible();
    await expect(page.getByTestId('proceed-post-match-btn')).toBeVisible();

    await saveScreenshot(page, 'final-reveal-step5-3000ms-desktop.png');
  });

  test('Checkpoint 6 (Reduced motion 100ms mobile): Instant face-up cards without spatial flip', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?harness=true&state=ROUND_RESOLVE_COLLISION&animStepMs=100&reducedMotion=true');

    await expect(page.getByTestId('screen-auction-round')).toBeVisible();

    // In reduced motion, cards are immediately face-up even at 100ms
    const cardP0 = page.getByTestId('bid-reveal-card-p1');
    await expect(cardP0).toHaveAttribute('data-flip-phase', 'face-up');
    await expect(page.getByTestId('sealed-bid-badge-p0')).not.toBeVisible();

    await saveScreenshot(page, 'resolve-reduced-motion-100ms-mobile.png');
  });

  test('Sound toggle interaction and localStorage persistence', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?harness=true&state=LANDING');

    const soundToggle = page.getByTestId('sound-toggle-btn');
    await expect(soundToggle).toBeVisible();

    // Default: unmuted (Volume2 icon, title "Mute game sounds")
    await expect(soundToggle).toHaveAttribute('aria-label', 'Mute game sounds');

    // Click to mute
    await soundToggle.click();
    await expect(soundToggle).toHaveAttribute('aria-label', 'Unmute game sounds');

    // Check localStorage
    const isMuted = await page.evaluate(() => localStorage.getItem('bk_sound_muted'));
    expect(isMuted).toBe('true');

    // Click to unmute
    await soundToggle.click();
    await expect(soundToggle).toHaveAttribute('aria-label', 'Mute game sounds');
    const isUnmuted = await page.evaluate(() => localStorage.getItem('bk_sound_muted'));
    expect(isUnmuted).toBe('false');
  });
});
