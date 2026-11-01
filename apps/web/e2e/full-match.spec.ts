import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve(__dirname, '../../../docs/visual-qa/screenshots/phase-5');
const artifactDir = path.resolve(
  'C:/Users/USER/.gemini/antigravity/brain/b64b01dc-0723-4625-b7e5-1195aa1629f1/screenshots/phase-5',
);

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }
});

async function saveScreenshot(page: Page, filename: string): Promise<void> {
  const filePath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  try {
    const artifactPath = path.join(artifactDir, filename);
    fs.copyFileSync(filePath, artifactPath);
  } catch {
    // ignore copy failure
  }
}

async function placeBid(page: Page, ingredientId: string, targetAmount: number): Promise<void> {
  // Ensure we are in BIDDING state before interacting
  await expect(
    page.locator('[data-testid="screen-auction-round"][data-match-state="BIDDING"]'),
  ).toBeVisible({ timeout: 10_000 });

  const card = page.getByTestId(`ingredient-card-${ingredientId}`);
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.click();

  const isBasic =
    ingredientId.endsWith('plain') ||
    ingredientId.endsWith('basic') ||
    ingredientId.endsWith('none');

  if (!isBasic) {
    const slider = page.getByTestId('bid-slider');
    await expect(slider).toBeVisible({ timeout: 5_000 });
    await slider.fill(String(targetAmount));

    const display = page.getByTestId('bid-amount-display');
    let currentText = await display.textContent();
    let currentVal = parseInt(currentText?.replace(/\D/g, '') || '0', 10);
    while (currentVal < targetAmount) {
      await page.getByTestId('bid-increment-btn').click();
      currentText = await display.textContent();
      currentVal = parseInt(currentText?.replace(/\D/g, '') || '0', 10);
    }
    while (currentVal > targetAmount) {
      await page.getByTestId('bid-decrement-btn').click();
      currentText = await display.textContent();
      currentVal = parseInt(currentText?.replace(/\D/g, '') || '0', 10);
    }
    await expect(display).toContainText(`$${targetAmount}`);
  }

  const lockBtn = page.getByTestId('lock-bid-btn');
  await expect(lockBtn).toBeVisible({ timeout: 5_000 });
  await lockBtn.click();
  await expect(page.getByTestId('bid-controls-container')).toContainText('Bid Locked', {
    timeout: 5_000,
  });
}

test.describe('Phase 5 Full Live 2-Player Match & Rematch E2E', () => {
  test.setTimeout(75_000);

  test('plays a complete 5-round Burger match across two browsers with exact collisions and rematch', async ({
    browser,
  }) => {
    // Context A: ChefAlice (Host)
    const contextA = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const pageA = await contextA.newPage();

    // Context B: ChefBob (Guest)
    const contextB = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const pageB = await contextB.newPage();

    // 1. ChefAlice creates room
    await pageA.goto('/', { waitUntil: 'domcontentloaded' });

    const nicknameA = pageA.getByTestId('nickname-input');
    await expect(nicknameA).toBeVisible({ timeout: 10_000 });
    await nicknameA.fill('ChefAlice');

    const createBtn = pageA.getByTestId('create-room-btn');
    await createBtn.click();

    // Wait for Alice to enter Lobby
    await expect(pageA.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });
    const roomCodeElement = pageA.getByTestId('lobby-room-code');
    await expect(roomCodeElement).toBeVisible();
    const rawRoomCode = await roomCodeElement.textContent();
    const roomCode = rawRoomCode?.trim() ?? '';
    expect(roomCode).toMatch(/^[A-Z0-9]{4,6}$/);

    // 2. ChefBob joins room via deep link ?room=CODE
    await pageB.goto(`/?room=${roomCode}`, { waitUntil: 'domcontentloaded' });

    // Verify deep link banner and pre-filled room code
    await expect(pageB.getByTestId('deep-link-banner')).toBeVisible({ timeout: 10_000 });
    const joinCodeInput = pageB.getByTestId('join-room-code-input');
    await expect(joinCodeInput).toHaveValue(roomCode);

    const nicknameB = pageB.getByTestId('nickname-input');
    await expect(nicknameB).toBeVisible();
    await nicknameB.fill('ChefBob');

    const joinBtn = pageB.getByTestId('join-room-submit-btn');
    await joinBtn.click();

    // Wait for Bob to enter Lobby
    await expect(pageB.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });

    // Assert both players are seated in Lobby on both pages
    await expect(pageA.getByTestId('player-slot-0')).toContainText('ChefAlice');
    await expect(pageA.getByTestId('player-slot-1')).toContainText('ChefBob');
    await expect(pageB.getByTestId('player-slot-0')).toContainText('ChefAlice');
    await expect(pageB.getByTestId('player-slot-1')).toContainText('ChefBob');

    // Capture Screenshot 1: live-lobby-mobile-sm.png (360x640)
    await pageA.setViewportSize({ width: 360, height: 640 });
    await pageA.waitForTimeout(100);
    await saveScreenshot(pageA, 'live-lobby-mobile-sm.png');
    await pageA.setViewportSize({ width: 1280, height: 800 });

    // 3. Both ready up
    await pageA.getByTestId('lobby-ready-btn').click();
    await pageB.getByTestId('lobby-ready-btn').click();

    // 4. Match transitions through TIER_CONFIRMED to MATCH_INTRO
    await expect(pageA.getByTestId('screen-match-intro')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('screen-match-intro')).toBeVisible({ timeout: 10_000 });

    // Tutorial overlay appears for first-time chefs
    await expect(pageA.getByTestId('tutorial-overlay')).toBeVisible({ timeout: 5_000 });
    await expect(pageB.getByTestId('tutorial-overlay')).toBeVisible({ timeout: 5_000 });

    // Both complete tutorial
    await pageA.getByTestId('tutorial-complete-btn').click();
    await pageB.getByTestId('tutorial-complete-btn').click();
    await expect(pageA.getByTestId('tutorial-overlay')).not.toBeVisible();
    await expect(pageB.getByTestId('tutorial-overlay')).not.toBeVisible();

    // 5. ROUND 1 (BUN): Alice $4 Brioche vs Bob $2 Sesame
    await expect(pageA.getByTestId('screen-auction-round')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('screen-auction-round')).toBeVisible({ timeout: 10_000 });

    // Capture Screenshot 2: live-bidding-mobile-md.png (390x844) during Round 1 BIDDING
    await pageA.setViewportSize({ width: 390, height: 844 });
    await pageA.waitForTimeout(100);
    await saveScreenshot(pageA, 'live-bidding-mobile-md.png');
    await pageA.setViewportSize({ width: 1280, height: 800 });

    await placeBid(pageA, 'street_bun_brioche', 4);
    await placeBid(pageB, 'street_bun_sesame', 2);

    // 6. ROUND 2 (PATTY): Wagyu Collision (Alice $9 vs Bob $8)
    await expect(pageA.getByTestId('ingredient-card-street_patty_wagyu')).toBeVisible({
      timeout: 15_000,
    });
    await expect(pageB.getByTestId('ingredient-card-street_patty_wagyu')).toBeVisible({
      timeout: 15_000,
    });

    // Alice selects Wagyu and bids $9
    await placeBid(pageA, 'street_patty_wagyu', 9);

    // Set pageA to tablet viewport (768x1024) ahead of resolution for Screenshot 3
    await pageA.setViewportSize({ width: 768, height: 1024 });

    // Bob selects Wagyu and bids $8, triggering collision resolution
    await placeBid(pageB, 'street_patty_wagyu', 8);

    // Capture Screenshot 3: live-resolve-tablet.png (768x1024)
    await expect(pageA.getByTestId('bid-flip-compare')).toBeVisible({ timeout: 10_000 });
    await saveScreenshot(pageA, 'live-resolve-tablet.png');
    await pageA.setViewportSize({ width: 1280, height: 800 });

    // 7. ROUND 3 (SAUCE): Assert Exact Budgets: Alice $7, Bob $18
    await expect(pageA.getByTestId('ingredient-card-street_sauce_spicy_mayo')).toBeVisible({
      timeout: 15_000,
    });
    await expect(pageB.getByTestId('ingredient-card-street_sauce_truffle')).toBeVisible({
      timeout: 15_000,
    });

    // Assert exact budgets after Round 2 Wagyu collision
    // Alice spent $4 (Brioche) + $9 (Wagyu) = $13. Budget = $20 - $13 = $7.
    // Bob spent $2 (Sesame) + $0 (Basic Patty fallback) = $2. Budget = $20 - $2 = $18.
    await expect(pageA.getByText('Your Budget:')).toContainText('$7');
    await expect(pageB.getByText('Your Budget:')).toContainText('$18');

    // Alice bids $2 on Spicy Mayo, Bob bids $3 on Truffle Aioli
    await placeBid(pageA, 'street_sauce_spicy_mayo', 2);
    await placeBid(pageB, 'street_sauce_truffle', 3);

    // 8. ROUND 4 (CHEESE): Alice bids $2 Cheddar, Bob bids $3 Blue Cheese
    await expect(pageA.getByTestId('ingredient-card-street_cheese_cheddar')).toBeVisible({
      timeout: 15_000,
    });
    await expect(pageB.getByTestId('ingredient-card-street_cheese_blue')).toBeVisible({
      timeout: 15_000,
    });

    await placeBid(pageA, 'street_cheese_cheddar', 2);
    await placeBid(pageB, 'street_cheese_blue', 3);

    // 9. ROUND 5 (TOPPING): Alice bids $2 Jalapeno, Bob bids $3 Bacon
    await expect(pageA.getByTestId('ingredient-card-street_topping_jalapeno')).toBeVisible({
      timeout: 15_000,
    });
    await expect(pageB.getByTestId('ingredient-card-street_topping_bacon')).toBeVisible({
      timeout: 15_000,
    });

    await placeBid(pageA, 'street_topping_jalapeno', 2);
    await placeBid(pageB, 'street_topping_bacon', 3);

    // 10. POST MATCH: Assert final scores & Capture Screenshot 4: live-post-match-desktop.png (1280x800)
    await expect(pageA.getByTestId('screen-post-match')).toBeVisible({ timeout: 20_000 });
    await expect(pageB.getByTestId('screen-post-match')).toBeVisible({ timeout: 20_000 });

    // Capture Screenshot 4: live-post-match-desktop.png (1280x800)
    await saveScreenshot(pageA, 'live-post-match-desktop.png');

    // Assert Alice victorious (31 pts vs 26 pts)
    await expect(pageA.getByTestId('screen-post-match')).toContainText('ChefAlice Victorious!');
    await expect(pageA.getByTestId('key-moment-badge')).toBeVisible();

    // 11. REMATCH: Both click Rematch CTA
    const rematchA = pageA.getByTestId('post-match-rematch-btn');
    const rematchB = pageB.getByTestId('post-match-rematch-btn');
    await expect(rematchA).toBeVisible();
    await expect(rematchB).toBeVisible();

    await rematchA.click();
    await rematchB.click();

    // Reset match starts into MATCH_INTRO or ROUND_REVEAL/BIDDING with fresh $20 budget
    await expect(pageA.getByTestId('screen-match-intro')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('screen-match-intro')).toBeVisible({ timeout: 10_000 });

    // Assert Tutorial is SKIPPED on Rematch (since bk_tutorial_seen is true)
    await expect(pageA.getByTestId('tutorial-overlay')).not.toBeVisible();
    await expect(pageB.getByTestId('tutorial-overlay')).not.toBeVisible();

    // Transition into Round 1 BIDDING with fresh $20 starting budget
    await expect(pageA.getByTestId('screen-auction-round')).toBeVisible({ timeout: 15_000 });
    await expect(pageB.getByTestId('screen-auction-round')).toBeVisible({ timeout: 15_000 });
    await expect(pageA.getByText('Your Budget:')).toContainText('$20');
    await expect(pageB.getByText('Your Budget:')).toContainText('$20');

    await contextA.close();
    await contextB.close();
  });
});
