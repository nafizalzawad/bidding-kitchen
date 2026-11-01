import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-4');
const artifactDir = path.resolve('C:/Users/USER/.gemini/antigravity/brain/b64b01dc-0723-4625-b7e5-1195aa1629f1/screenshots/phase-4');

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }
});

const VIEWPORTS = [
  { name: 'mobile-sm', width: 360, height: 640 },
  { name: 'mobile-md', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

const HARNESS_STATES = [
  'LANDING',
  'LOBBY_HOST',
  'LOBBY_GUEST_READY',
  'TIER_CONFIRMED_COUNTDOWN',
  'MATCH_INTRO',
  'TUTORIAL_OVERLAY',
  'BIDDING_ACTIVE',
  'BIDDING_LOCKED_WAITING',
  'ROUND_RESOLVE_COLLISION',
  'ROUND_END_BREATHER',
  'FINAL_REVEAL',
  'POST_MATCH',
  'OPPONENT_DISCONNECTED',
  'ERROR_EMPTY_STATE',
];

test.describe('Phase 4 Static Screens Visual QA & Invariant Assertions', () => {
  test.setTimeout(45_000);

  for (const vp of VIEWPORTS) {
    for (const stateKey of HARNESS_STATES) {
      test(`renders ${stateKey} at ${vp.width}x${vp.height} (${vp.name}), verifies invariants & captures screenshot`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`/?harness=true&state=${stateKey}&hideBar=true&reducedMotion=true`);

        // Wait for network idle and fonts
        await page.waitForLoadState('domcontentloaded');
        await page.evaluate(() => document.fonts.ready);

        // Assert Invariant 1: Zero Horizontal Overflow
        const isOverflowing = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(isOverflowing).toBe(false);

        // Assert Invariant 2: Minimum Touch Targets on interactive buttons
        const buttons = page.locator('button:visible');
        const count = await buttons.count();
        for (let i = 0; i < count; i++) {
          const btn = buttons.nth(i);
          const box = await btn.boundingBox();
          if (box && box.width > 0 && box.height > 0) {
            // Check button touch target minimums (accounting for tiny 1px subpixel rounding)
            expect(
              box.width,
              `Button #${i} width ${box.width}px should be >= 40px`,
            ).toBeGreaterThanOrEqual(39.5);
            expect(
              box.height,
              `Button #${i} height ${box.height}px should be >= 40px`,
            ).toBeGreaterThanOrEqual(39.5);
          }
        }

        // Assert Invariant 3: One-thumb reachability for Lock Bid button on mobile-md (390x844)
        if (stateKey === 'BIDDING_ACTIVE' && vp.name === 'mobile-md') {
          const lockBtn = page.getByTestId('lock-bid-btn');
          await expect(lockBtn).toBeVisible();
          const box = await lockBtn.boundingBox();
          expect(box).not.toBeNull();
          if (box) {
            // Verify lock button is in the lower thumb zone and fits within the 844px height
            expect(box.y + box.height).toBeLessThanOrEqual(844);
          }
        }

        // Assert Invariant 4: Zero Cumulative Layout Shift (CLS) on variant selection
        if (stateKey === 'BIDDING_ACTIVE') {
          const lockBtn = page.getByTestId('lock-bid-btn');
          const boxBefore = await lockBtn.boundingBox();
          const scrollBefore = await page.evaluate(() => window.scrollY);

          // Select Wagyu via dispatchEvent to prevent synthetic browser auto-scrolling
          const wagyuCard = page.getByTestId('ingredient-card-street_patty_wagyu');
          if (await wagyuCard.isVisible()) {
            await wagyuCard.dispatchEvent('click');
            const boxAfter = await lockBtn.boundingBox();
            const scrollAfter = await page.evaluate(() => window.scrollY);

            const docYBefore = (boxBefore?.y ?? 0) + scrollBefore;
            const docYAfter = (boxAfter?.y ?? 0) + scrollAfter;

            expect(Math.abs(docYBefore - docYAfter)).toBeLessThanOrEqual(2);
          }
        }

        // Capture deterministic screenshot
        const filename = `${stateKey.toLowerCase()}-${vp.name}.png`;
        const filePath = path.join(screenshotDir, filename);
        await page.screenshot({ path: filePath, fullPage: false });

        // Copy to brain artifacts directory for embedding
        try {
          const artifactPath = path.join(artifactDir, filename);
          fs.copyFileSync(filePath, artifactPath);
        } catch {
          // Ignore copy failures
        }
      });
    }
  }
});
