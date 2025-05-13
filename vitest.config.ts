/// <reference types="vitest" />
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

// Create config for Vite and Vitest
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
      '@testing-library/react': require.resolve('@testing-library/react'),
      'react': require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
    }
  },
  // Vitest specific configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    deps: {
      inline: [
        '@radix-ui/*',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
      ]
    },
    testTimeout: 10000,
    passWithNoTests: false,
    reporters: ['verbose'],
    pool: 'forks',
    watch: false,
  }
} as UserConfig); 