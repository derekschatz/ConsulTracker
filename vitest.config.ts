import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.test.ts'],
    testTimeout: 30000, // 30 seconds
    hookTimeout: 30000, // 30 seconds
    pool: 'forks', // Use process isolation for tests
    poolOptions: {
      threads: {
        singleThread: true // Run tests sequentially
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
    },
  },
}); 