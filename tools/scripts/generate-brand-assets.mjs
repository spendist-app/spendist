import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const publicRoot = resolve(workspaceRoot, 'apps/web/public');
const mark = await readFile(
  resolve(publicRoot, 'brand/spendist-mark.svg'),
  'utf8'
);
const markDataUrl = `data:image/svg+xml;base64,${Buffer.from(mark).toString(
  'base64'
)}`;

const outputs = [
  {
    path: 'favicon-32x32.png',
    width: 32,
    height: 32,
    markScale: 1,
    transparent: true,
  },
  {
    path: 'icons/spendist-apple-touch-icon-180x180.png',
    width: 180,
    height: 180,
    markScale: 1,
    transparent: true,
  },
  {
    path: 'icons/spendist-icon-192x192.png',
    width: 192,
    height: 192,
    markScale: 1,
    transparent: true,
  },
  {
    path: 'icons/spendist-icon-512x512.png',
    width: 512,
    height: 512,
    markScale: 1,
    transparent: true,
  },
  {
    path: 'icons/spendist-icon-maskable-192x192.png',
    width: 192,
    height: 192,
    markScale: 0.78,
  },
  {
    path: 'icons/spendist-icon-maskable-512x512.png',
    width: 512,
    height: 512,
    markScale: 0.78,
  },
  {
    path: 'brand/social/facebook-profile-320x320.png',
    width: 320,
    height: 320,
    markScale: 0.76,
  },
  {
    path: 'brand/social/instagram-profile-320x320.png',
    width: 320,
    height: 320,
    markScale: 0.76,
  },
  {
    path: 'brand/social/linkedin-company-logo-400x400.png',
    width: 400,
    height: 400,
    markScale: 0.76,
  },
  {
    path: 'brand/social/x-profile-400x400.png',
    width: 400,
    height: 400,
    markScale: 0.76,
  },
  {
    path: 'brand/social/github-organization-avatar-500x500.png',
    width: 500,
    height: 500,
    markScale: 0.76,
  },
  {
    path: 'brand/social/social-profile-master-1080x1080.png',
    width: 1080,
    height: 1080,
    markScale: 0.76,
  },
  {
    path: 'brand/social/social-share-1200x630.png',
    width: 1200,
    height: 630,
    markScale: 0.48,
    wordmark: true,
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const output of outputs) {
  const target = resolve(publicRoot, output.path);
  await mkdir(dirname(target), { recursive: true });
  await page.setViewportSize({ width: output.width, height: output.height });

  const background = output.transparent
    ? 'transparent'
    : 'linear-gradient(145deg, #FFFDFB 0%, #E6FFFC 100%)';
  const markSize = Math.round(
    Math.min(output.width, output.height) * output.markScale
  );
  const wordmark = output.wordmark ? '<span>Spendist</span>' : '';

  await page.setContent(`
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${Math.round(output.height * 0.05)}px;
        overflow: hidden;
        background: ${background};
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      img { width: ${markSize}px; height: ${markSize}px; }
      span { color: #111827; font-size: ${Math.round(
        output.height * 0.16
      )}px; font-weight: 750; letter-spacing: -0.04em; }
    </style>
    <img src="${markDataUrl}" alt="">
    ${wordmark}
  `);
  await page.screenshot({
    path: target,
    omitBackground: output.transparent ?? false,
  });
}

await browser.close();
