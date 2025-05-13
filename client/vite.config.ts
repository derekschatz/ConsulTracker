import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prioritize CommonJS config files for better Replit compatibility
const hasCJSConfigs = fs.existsSync(path.resolve(__dirname, 'tailwind.config.cjs')) && 
                     fs.existsSync(path.resolve(__dirname, 'postcss.config.cjs'));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        // Avoid hash for easier file detection
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
    ],
  },
  css: {
    postcss: hasCJSConfigs ? path.resolve(__dirname, 'postcss.config.cjs') : undefined,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}); 