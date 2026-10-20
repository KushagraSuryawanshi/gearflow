import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['./src/test/globalSetup.ts'],
    // Test files share one database, so they must not run at the same time.
    fileParallelism: false,
    env: {
      JWT_SECRET: 'test-only-secret-that-is-long-enough-for-hs256',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**', 'src/server.ts', 'src/seed.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 80, branches: 80 },
    },
  },
});
