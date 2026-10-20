import { defineConfig, devices } from '@playwright/test';

const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: remoteBaseUrl ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(remoteBaseUrl
    ? {}
    : {
        webServer: {
          command: 'npm run dev --workspace=@gearflow/web -- --host 127.0.0.1 --port 4173',
          url: 'http://127.0.0.1:4173',
          reuseExistingServer: !process.env.CI,
        },
      }),
});
