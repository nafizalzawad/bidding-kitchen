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
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm --filter @bidding-kitchen/server run dev',
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
      env: {
        HOST: '0.0.0.0',
        TRANSITION_TIMER_SCALE: '0.2',
        MATCH_TIMER_SCALE: '0.2',
      },
    },
    {
      command: 'pnpm --filter @bidding-kitchen/web run dev --host 0.0.0.0',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
  ],
});
