import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
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
      timeout: 15_000,
    },
    {
      command: 'pnpm --filter @bidding-kitchen/web run dev',
      port: 5173,
      reuseExistingServer: !process.env['CI'],
      timeout: 15_000,
    },
  ],
});
