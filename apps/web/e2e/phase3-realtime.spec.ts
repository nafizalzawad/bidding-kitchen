import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-3');

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
});

const VIEWPORTS = [
  { name: 'mobile-sm', filename: 'dual-inspector-mobile-sm.png', width: 360, height: 640 },
  { name: 'mobile-md', filename: 'dual-inspector-mobile-md.png', width: 390, height: 844 },
  { name: 'tablet', filename: 'dual-inspector-tablet.png', width: 768, height: 1024 },
  { name: 'desktop', filename: 'dual-inspector-desktop.png', width: 1280, height: 800 },
];

test.describe('Phase 3 Realtime Authoritative Server & Dual-Client Inspector Verification', () => {
  for (const vp of VIEWPORTS) {
    test(`renders Dual-Client Inspector and captures ${vp.filename} at ${vp.width}x${vp.height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/?tab=live-inspector', { waitUntil: 'load' });
      await page.waitForLoadState('domcontentloaded');

      // Verify app title
      await expect(page.getByTestId('app-title')).toBeVisible({ timeout: 10_000 });

      // Verify Live Dual-Client Inspector tab is active
      const inspectorTab = page.getByTestId('tab-live-inspector');
      await expect(inspectorTab).toBeVisible();

      // Verify Hidden Information proof badge is visible and sealed
      const proofBadge = page.getByTestId('hidden-info-proof-badge');
      await expect(proofBadge).toBeVisible();
      await expect(proofBadge).toContainText('Hidden Information Boundary');

      // Verify Quick Start button
      await expect(page.getByTestId('inspector-quick-start-btn')).toBeVisible();

      // Verify side-by-side / stacked client panels
      await expect(page.getByTestId('client-a-panel')).toBeVisible();
      await expect(page.getByTestId('client-b-panel')).toBeVisible();

      // Automated layout invariant: Zero horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width);

      // Capture full-page screenshot
      const screenshotPath = path.join(screenshotDir, vp.filename);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      expect(fs.existsSync(screenshotPath)).toBe(true);
      const stat = fs.statSync(screenshotPath);
      expect(stat.size).toBeGreaterThan(1000);
    });
  }

  test('orchestrates live room via quick start and captures dual-inspector-live-bidding-mobile-md.png at 390x844', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?tab=live-inspector');
    await page.evaluate(() => document.fonts.ready);

    const quickStartBtn = page.getByTestId('inspector-quick-start-btn');
    await expect(quickStartBtn).toBeVisible();
    await quickStartBtn.click();

    // Sockets connect and room is created; wait until room code displays or state enters BIDDING
    const clientAPanel = page.getByTestId('client-a-panel');
    await expect(clientAPanel).toBeVisible();

    // Verify Connected status badge on Client A
    await expect(clientAPanel).toContainText('Connected', { timeout: 10_000 });

    // Wait until BIDDING or TIER_CONFIRMED appears
    await expect(clientAPanel).toContainText(/TIER_CONFIRMED|MATCH_INTRO|ROUND_REVEAL|BIDDING/i);

    // Verify Hidden Information Proof Badge remains 100% Sealed
    const proofBadge = page.getByTestId('hidden-info-proof-badge');
    await expect(proofBadge).toContainText('100% Sealed & Sanitized');

    // Capture screenshot of live match state
    const filename = 'dual-inspector-live-bidding-mobile-md.png';
    const screenshotPath = path.join(screenshotDir, filename);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stat = fs.statSync(screenshotPath);
    expect(stat.size).toBeGreaterThan(1000);
  });
});
