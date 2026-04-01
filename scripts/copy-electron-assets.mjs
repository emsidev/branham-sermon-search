import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourcePreloadPath = path.resolve(projectRoot, 'desktop', 'preload.cjs');
const targetDirectory = path.resolve(projectRoot, 'dist-electron');
const targetPreloadPath = path.resolve(targetDirectory, 'preload.cjs');

if (!existsSync(sourcePreloadPath)) {
  throw new Error(`Missing preload asset: ${sourcePreloadPath}`);
}

mkdirSync(targetDirectory, { recursive: true });
copyFileSync(sourcePreloadPath, targetPreloadPath);
