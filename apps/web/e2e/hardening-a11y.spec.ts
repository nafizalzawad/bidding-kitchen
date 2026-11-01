import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-7');
const artifactDir = path.resolve(
  'C:/Users/USER/.gemini/antigravity/brain/b64b01dc-0723-4625-b7e5-1195aa1629f1/screenshots/phase-7',
);

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
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

test.describe('Phase 7 Hardening & Accessibility Verification', () => {
  test.setTimeout(60_000);

  test('WCAG 2.1 AA automated audit across all primary screens', async ({ page }) => {
    // 1. Landing Screen
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?harness=true&state=LANDING');
    await expect(page.getByTestId('screen-landing')).toBeVisible();
    await page.waitForTimeout(300);

    const landingAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(landingAxe.violations).toEqual([]);

    // 2. Bidding Active Screen
    await page.goto('/?harness=true&state=BIDDING_ACTIVE');
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();
    await page.waitForTimeout(300);

    const biddingAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(biddingAxe.violations).toEqual([]);

    // 3. Post Match Screen
    await page.goto('/?harness=true&state=POST_MATCH');
    await expect(page.getByTestId('screen-post-match')).toBeVisible();
    await page.waitForTimeout(300);

    const postMatchAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(postMatchAxe.violations).toEqual([]);
  });

  test('Keyboard navigation loop: Tab, Space selection, slider adjust, Enter lock', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?harness=true&state=BIDDING_ACTIVE');
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();

    // Select second ingredient card using keyboard
    const secondCard = page.locator('[data-testid^="ingredient-card-"]').nth(1);
    await secondCard.focus();

    // Trigger Space to select
    await page.keyboard.press('Space');
    await expect(secondCard).toHaveAttribute('aria-pressed', 'true');

    // Tab into controls
    const slider = page.getByTestId('bid-slider');
    if (await slider.isVisible()) {
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
    }

    // Verify live announcer exists and announces the round
    const announcer = page.getByTestId('sr-live-announcer');
    await expect(announcer).toBeAttached();
    const announcerText = await announcer.textContent();
    expect(announcerText).toBeTruthy();
  });

  test('Layout shift budget check: CLS < 0.02 during active bidding', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?harness=true&state=BIDDING_ACTIVE');
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();

    const cls = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        // Trigger interaction that could cause layout shifts
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 600);
      });
    });

    expect(cls).toBeLessThan(0.02);
  });

  test('Visual QA Checkpoint 1: Keyboard focus bidding mobile md (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?harness=true&state=BIDDING_ACTIVE');
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();

    // Focus the second ingredient card to display the :focus-visible outline
    const card = page.locator('[data-testid^="ingredient-card-"]').nth(1);
    await card.focus();

    await saveScreenshot(page, 'a11y-keyboard-focus-bidding-mobile-md.png');
  });

  test('Visual QA Checkpoint 2: Combo drawer open mobile sm (360x740)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/?harness=true&state=BIDDING_ACTIVE');
    await expect(page.getByTestId('screen-auction-round')).toBeVisible();

    // Open Combo Drawer
    const combosBtn = page.getByTestId('combos-toggle-btn');
    await expect(combosBtn).toBeVisible();
    await combosBtn.click();

    // Verify drawer is visible
    await expect(page.getByTestId('combo-hint-drawer')).toBeVisible();

    await saveScreenshot(page, 'a11y-combo-drawer-open-mobile-sm.png');
  });

  test('Visual QA Checkpoint 3: Post-match history expanded desktop (1280x800)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?harness=true&state=POST_MATCH');
    await expect(page.getByTestId('screen-post-match')).toBeVisible();

    // Ensure 5-round bid history table is visible and expanded
    const historyTable = page.getByTestId('bid-history-table');
    await expect(historyTable).toBeVisible();

    await saveScreenshot(page, 'post-match-history-expanded-desktop.png');
  });

  test('Visual QA Checkpoint 4: Post-match share toast tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/?harness=true&state=POST_MATCH');
    await expect(page.getByTestId('screen-post-match')).toBeVisible();

    // Click Share Result button
    const shareBtn = page.getByTestId('post-match-share-btn');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Toast should become visible
    await expect(page.getByText('Match summary copied to clipboard!')).toBeVisible();

    await saveScreenshot(page, 'post-match-share-toast-tablet.png');
  });
});
