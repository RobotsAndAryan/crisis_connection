import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const extSrcDir = path.join(root, 'chrome-extension');
const outDir = path.join(extSrcDir, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Copy compiled Vite app
fs.cpSync(distDir, outDir, { recursive: true });

// Copy Manifest V3 extension files (overriding PWA manifest with Chrome Extension manifest)
fs.copyFileSync(path.join(extSrcDir, 'manifest.json'), path.join(outDir, 'manifest.json'));
fs.copyFileSync(path.join(extSrcDir, 'background.js'), path.join(outDir, 'background.js'));
fs.copyFileSync(path.join(extSrcDir, 'icon.png'), path.join(outDir, 'icon.png'));

// Remove PWA sw.js from extension package to avoid MV3 service worker collision
const swPath = path.join(outDir, 'sw.js');
if (fs.existsSync(swPath)) {
  fs.rmSync(swPath);
}

console.log(`Chrome Extension (Manifest V3 Side Panel) packaged at: ${outDir}`);
console.log('Load unpacked in chrome://extensions -> select chrome-extension/dist');
