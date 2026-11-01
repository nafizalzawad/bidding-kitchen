import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env['CI'] ? 2 : 0,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm --filter @bidding-kitchen/server run dev',
      port: 3001,
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
      env: {
        TRANSITION_TIMER_SCALE: '0.2',
        MATCH_TIMER_SCALE: '0.2',
      },
    },
    {
      command: 'pnpm --filter @bidding-kitchen/web run dev',
      port: 5173,
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
  ],
});
