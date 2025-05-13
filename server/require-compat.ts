// This file provides compatibility for ES Module imports in a Node.js environment
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const require = createRequire(import.meta.url);
export const getAbsolutePath = (relativePath: string) => path.join(__dirname, relativePath);
