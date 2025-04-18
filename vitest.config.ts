import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: [
        './tests/setup.ts',
        './tests/setup.react.ts'
      ],
      include: [
        './tests/**/*.test.ts',
        './tests/**/*.test.tsx'
      ],
      pool: 'forks',
      poolOptions: {
        threads: {
          singleThread: true
        }
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      }
    },
    resolve: {
      alias: {
        '@': './client/src',
        '@shared': './shared'
      }
    }
  })
); 