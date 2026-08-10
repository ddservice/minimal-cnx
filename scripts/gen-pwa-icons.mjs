import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = path.resolve('public/icons');
fs.mkdirSync(dir, { recursive: true });

function svg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#3d2b1f"/>
  <circle cx="256" cy="230" r="110" fill="none" stroke="#f7f3ee" stroke-width="28"/>
  <path d="M366 200c36 8 58 36 58 72s-28 68-70 72" fill="none" stroke="#f7f3ee" stroke-width="28" stroke-linecap="round"/>
  <rect x="186" y="340" width="140" height="28" rx="10" fill="#c8a97e"/>
  <rect x="206" y="368" width="100" height="18" rx="8" fill="#c8a97e"/>
</svg>`);
}

await Promise.all(
  [192, 512].map((s) => sharp(svg(s)).png().toFile(path.join(dir, `icon-${s}.png`)))
);
console.log('wrote', dir);
