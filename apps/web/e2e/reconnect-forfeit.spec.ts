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

test.describe('Phase 5 Reconnect, Lobby Leave & Forfeit E2E', () => {
  test.setTimeout(45_000);

  test('handles mid-match tab refresh and restores session with locked bid', async ({
    browser,
  }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();

    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await contextB.newPage();

    // 1. Alice creates room
    await pageA.goto('/');
    await pageA.getByTestId('nickname-input').fill('ChefAlice');
    await pageA.getByTestId('create-room-btn').click();
    await expect(pageA.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });

    const roomCode = (await pageA.getByTestId('lobby-room-code').textContent())?.trim() ?? '';
    expect(roomCode).toMatch(/^[A-Z0-9]{4,6}$/);

    // 2. Bob joins via deep link
    await pageB.goto(`/?room=${roomCode}`);
    await pageB.getByTestId('nickname-input').fill('ChefBob');
    await pageB.getByTestId('join-room-submit-btn').click();
    await expect(pageB.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });

    // 3. Both ready up and skip tutorial
    await pageA.getByTestId('lobby-ready-btn').click();
    await pageB.getByTestId('lobby-ready-btn').click();

    await expect(pageA.getByTestId('screen-match-intro')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('screen-match-intro')).toBeVisible({ timeout: 10_000 });

    await pageA.getByTestId('tutorial-complete-btn').click();
    await pageB.getByTestId('tutorial-complete-btn').click();

    // 4. Round 1 BIDDING: Alice selects Brioche ($4) and locks bid
    await expect(
      pageA.locator('[data-testid="screen-auction-round"][data-match-state="BIDDING"]'),
    ).toBeVisible({ timeout: 10_000 });
    const briocheCard = pageA.getByTestId('ingredient-card-street_bun_brioche');
    await expect(briocheCard).toBeVisible();
    await briocheCard.click();

    const lockBtn = pageA.getByTestId('lock-bid-btn');
    await expect(lockBtn).toBeVisible();
    await lockBtn.click();

    await expect(pageA.getByTestId('bid-controls-container')).toContainText('Bid Locked', {
      timeout: 5_000,
    });
    await expect(pageA.getByTestId('bid-controls-container')).toContainText('$4 on Brioche');

    // 5. Alice reloads tab (simulating refresh or accidental navigation)
    await pageA.reload();
    await pageA.waitForLoadState('domcontentloaded');

    // 6. Verify sessionStorage restored active session, active round, and locked bid
    await expect(
      pageA.locator('[data-testid="screen-auction-round"][data-match-state="BIDDING"]'),
    ).toBeVisible({ timeout: 10_000 });
    await expect(pageA.getByTestId('bid-controls-container')).toContainText('Bid Locked', {
      timeout: 5_000,
    });
    await expect(pageA.getByTestId('bid-controls-container')).toContainText('$4 on Brioche');

    await contextA.close();
    await contextB.close();
  });

  test('notifies host with leave toast when guest leaves lobby', async ({ browser }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();

    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await contextB.newPage();

    // 1. Alice creates room
    await pageA.goto('/');
    await pageA.getByTestId('nickname-input').fill('ChefAlice');
    await pageA.getByTestId('create-room-btn').click();
    await expect(pageA.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });

    const roomCode = (await pageA.getByTestId('lobby-room-code').textContent())?.trim() ?? '';
    expect(roomCode).toMatch(/^[A-Z0-9]{4,6}$/);

    // 2. Bob joins via deep link
    await pageB.goto(`/?room=${roomCode}`);
    await pageB.getByTestId('nickname-input').fill('ChefBob');
    await pageB.getByTestId('join-room-submit-btn').click();
    await expect(pageB.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });

    // Both seated
    await expect(pageA.getByTestId('player-slot-1')).toContainText('ChefBob');

    // Alice readies up
    await pageA.getByTestId('lobby-ready-btn').click();
    await expect(pageA.getByTestId('player-slot-0')).toContainText('✓ Ready to Cook');

    // 3. Bob leaves lobby
    const leaveBtn = pageB.getByTestId('leave-lobby-btn');
    await expect(leaveBtn).toBeVisible();
    await leaveBtn.click();

    // Bob returned to LandingScreen
    await expect(pageB.getByTestId('screen-landing')).toBeVisible({ timeout: 5_000 });

    // 4. Alice receives toast notification and slot 1 is cleared
    await expect(pageA.getByTestId('toast-container')).toContainText(/left the lobby/i, {
      timeout: 5_000,
    });
    await expect(pageA.getByTestId('player-slot-1')).toContainText('Waiting for friend...');

    await contextA.close();
    await contextB.close();
  });

  test('triggers forfeit victory when opponent disconnects and reconnect window expires', async ({
    browser,
  }) => {
    const contextA = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageA = await contextA.newPage();

    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await contextB.newPage();

    // 1. Alice creates room
    await pageA.goto('/');
    await pageA.getByTestId('nickname-input').fill('ChefAlice');
    await pageA.getByTestId('create-room-btn').click();
    await expect(pageA.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });

    const roomCode = (await pageA.getByTestId('lobby-room-code').textContent())?.trim() ?? '';
    expect(roomCode).toMatch(/^[A-Z0-9]{4,6}$/);

    // 2. Bob joins via deep link
    await pageB.goto(`/?room=${roomCode}`);
    await pageB.getByTestId('nickname-input').fill('ChefBob');
    await pageB.getByTestId('join-room-submit-btn').click();
    await expect(pageB.getByTestId('screen-lobby')).toBeVisible({ timeout: 10_000 });

    // 3. Set short reconnect window (1200ms) for fast automated forfeit testing
    const overrideRes = await pageA.request.post('http://localhost:3001/api/test/room-timers', {
      data: { roomCode, reconnectWindowMs: 1200 },
    });
    expect(overrideRes.ok()).toBe(true);

    // 4. Both ready up and skip tutorial
    await pageA.getByTestId('lobby-ready-btn').click();
    await pageB.getByTestId('lobby-ready-btn').click();

    await expect(pageA.getByTestId('screen-match-intro')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('screen-match-intro')).toBeVisible({ timeout: 10_000 });

    await pageA.getByTestId('tutorial-complete-btn').click();
    await pageB.getByTestId('tutorial-complete-btn').click();

    // 5. Enter Round 1 BIDDING
    await expect(
      pageA.locator('[data-testid="screen-auction-round"][data-match-state="BIDDING"]'),
    ).toBeVisible({ timeout: 10_000 });

    // 6. Bob unexpectedly disconnects (closes browser tab/context)
    await contextB.close();

    // 7. Alice's screen displays ConnectionBanner with opponent disconnected alert
    await expect(pageA.getByTestId('connection-banner')).toBeVisible({ timeout: 5_000 });
    await expect(pageA.getByTestId('connection-banner')).toContainText(/Opponent disconnected/i);

    // Capture Screenshot 5: live-reconnect-banner-mobile-md.png (390x844)
    await saveScreenshot(pageA, 'live-reconnect-banner-mobile-md.png');

    // 8. Reconnect window expires (1200ms) -> Server forfeits match to Alice
    // Alice's screen transitions to POST_MATCH within ~2.5s
    await expect(pageA.getByTestId('screen-post-match')).toBeVisible({ timeout: 10_000 });
    await expect(pageA.getByTestId('screen-post-match')).toContainText('ChefAlice Victorious!');

    await contextA.close();
  });
});
