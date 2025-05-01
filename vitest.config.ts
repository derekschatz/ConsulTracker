/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
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
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
      '@testing-library/react': require.resolve('@testing-library/react'),
      'react': require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
    }
  }
}); 