import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createCrcTable() {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

const crcTable = createCrcTable();
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function generatePng(width, height, rgbaFunc) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = rgbaFunc(x, y, width, height);
      const offset = 1 + x * 4;
      row[offset] = Math.max(0, Math.min(255, Math.round(r)));
      row[offset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      row[offset + 2] = Math.max(0, Math.min(255, Math.round(b)));
      row[offset + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
    rawRows.push(row);
  }

  const rawBuffer = Buffer.concat(rawRows);
  const idatData = zlib.deflateSync(rawBuffer);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Cubic Bezier evaluation
function evalCubic(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

function sampleCurve(p0, p1, p2, p3, steps = 25) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(evalCubic(p0, p1, p2, p3, i / steps));
  }
  return pts;
}

// Generate blue pin polygon
const bluePinPoly = [
  ...sampleCurve({ x: 235, y: 130 }, { x: 185, y: 130 }, { x: 145, y: 170 }, { x: 145, y: 220 }),
  ...sampleCurve({ x: 145, y: 220 }, { x: 145, y: 270 }, { x: 215, y: 350 }, { x: 235, y: 370 }),
  ...sampleCurve({ x: 235, y: 370 }, { x: 255, y: 350 }, { x: 325, y: 270 }, { x: 325, y: 220 }),
  ...sampleCurve({ x: 325, y: 220 }, { x: 325, y: 170 }, { x: 285, y: 130 }, { x: 235, y: 130 }),
];

// Generate pink pin polygon
const pinkPinPoly = [
  ...sampleCurve({ x: 305, y: 170 }, { x: 255, y: 170 }, { x: 215, y: 210 }, { x: 215, y: 260 }),
  ...sampleCurve({ x: 215, y: 260 }, { x: 215, y: 310 }, { x: 285, y: 390 }, { x: 305, y: 410 }),
  ...sampleCurve({ x: 305, y: 410 }, { x: 325, y: 390 }, { x: 395, y: 310 }, { x: 395, y: 260 }),
  ...sampleCurve({ x: 395, y: 260 }, { x: 395, y: 210 }, { x: 355, y: 170 }, { x: 305, y: 170 }),
];

// Point in polygon test (Ray Casting algorithm)
function isPointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Render PinPoint Dual-Pin Logo
 */
function renderPinPointLogo(x, y, width, height, isMaskable = false) {
  // Scale to 512x512 coordinate space
  const scaleFactor = isMaskable ? 0.72 : 0.92;
  const cx = 256;
  const cy = 256;

  // 2x2 Supersampling for smooth antialiasing
  let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
  const samples = [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25]
  ];

  for (const [ox, oy] of samples) {
    const origX = ((x + 0.5 + ox) / width) * 512;
    const origY = ((y + 0.5 + oy) / height) * 512;

    // Apply scale centering
    const px = cx + (origX - cx) / scaleFactor;
    const py = cy + (origY - cy) / scaleFactor;

    // Distance from center for background circle
    const distToCenter = Math.sqrt((px - 256) * (px - 256) + (py - 256) * (py - 256));
    
    // Background radial gradient: #FFFFFF -> #F5F3FB (85%) -> #EBE7F7 (100%)
    let bgR = 255, bgG = 255, bgB = 255, bgA = 0;
    
    if (isMaskable) {
      // Full bleed background
      const rRatio = Math.min(1, distToCenter / 256);
      bgR = 255 - rRatio * 20;
      bgG = 255 - rRatio * 24;
      bgB = 255 - rRatio * 8;
      bgA = 255;
    } else if (distToCenter <= 236) {
      const rRatio = distToCenter / 236;
      if (rRatio < 0.85) {
        const subRatio = rRatio / 0.85;
        bgR = 255 - subRatio * 10;
        bgG = 255 - subRatio * 12;
        bgB = 255 - subRatio * 4;
      } else {
        const subRatio = (rRatio - 0.85) / 0.15;
        bgR = 245 - subRatio * 10;
        bgG = 243 - subRatio * 12;
        bgB = 251 - subRatio * 4;
      }
      bgA = 255;
    } else if (distToCenter < 238) {
      // Soft antialiased border
      const edge = (238 - distToCenter) / 2;
      bgR = 235;
      bgG = 231;
      bgB = 247;
      bgA = Math.round(255 * edge);
    }

    let curR = bgR;
    let curG = bgG;
    let curB = bgB;
    let curA = bgA;

    // 1. Blue Pin (Left)
    const inBlue = isPointInPoly({ x: px, y: py }, bluePinPoly);
    if (inBlue && curA > 0) {
      // Linear gradient from (0%, 0%) #7371FC to (100%, 100%) #5B50E6
      const t = Math.min(1, Math.max(0, ((px - 145) + (py - 130)) / (180 + 240)));
      const pinR = 115 + t * (91 - 115);
      const pinG = 113 + t * (80 - 113);
      const pinB = 252 + t * (230 - 252);
      const opacity = 0.88;

      curR = curR * (1 - opacity) + pinR * opacity;
      curG = curG * (1 - opacity) + pinG * opacity;
      curB = curB * (1 - opacity) + pinB * opacity;
    }

    // 2. Pink Pin (Right) with Multiply Blend
    const inPink = isPointInPoly({ x: px, y: py }, pinkPinPoly);
    if (inPink && curA > 0) {
      // Linear gradient from (0%, 0%) #F4608E to (100%, 100%) #E23D71
      const t = Math.min(1, Math.max(0, ((px - 215) + (py - 170)) / (180 + 240)));
      const pinkR = 244 + t * (226 - 244);
      const pinkG = 96 + t * (61 - 96);
      const pinkB = 142 + t * (113 - 142);
      const opacity = 0.82;

      // Multiply blend mode: (A * B) / 255
      const multR = (curR * pinkR) / 255;
      const multG = (curG * pinkG) / 255;
      const multB = (curB * pinkB) / 255;

      curR = curR * (1 - opacity) + multR * opacity;
      curG = curG * (1 - opacity) + multG * opacity;
      curB = curB * (1 - opacity) + multB * opacity;
    }

    totalR += curR;
    totalG += curG;
    totalB += curB;
    totalA += curA;
  }

  return [totalR / 4, totalG / 4, totalB / 4, totalA / 4];
}

const iconsDir = path.join(__dirname, '../public/icons');
const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('📍 Generating PinPoint high-resolution PWA and Web App Icons...');

// Generate standard PNG icons
const icon192 = generatePng(192, 192, (x, y, w, h) => renderPinPointLogo(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);
console.log('✓ Created public/icons/icon-192.png');

const icon512 = generatePng(512, 512, (x, y, w, h) => renderPinPointLogo(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);
console.log('✓ Created public/icons/icon-512.png');

// Generate maskable PNG icons (full bleed canvas safe-zone)
const iconMaskable192 = generatePng(192, 192, (x, y, w, h) => renderPinPointLogo(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), iconMaskable192);
console.log('✓ Created public/icons/icon-maskable-192.png');

const iconMaskable512 = generatePng(512, 512, (x, y, w, h) => renderPinPointLogo(x, y, w, h, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), iconMaskable512);
console.log('✓ Created public/icons/icon-maskable-512.png');

// Generate Apple Touch Icon (180x180)
const appleIcon = generatePng(180, 180, (x, y, w, h) => renderPinPointLogo(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleIcon);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('✓ Created public/apple-touch-icon.png');

// Generate Favicons (32x32, 16x16)
const favicon32 = generatePng(32, 32, (x, y, w, h) => renderPinPointLogo(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'favicon-32x32.png'), favicon32);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon32);
console.log('✓ Created public/favicon.ico & public/icons/favicon-32x32.png');

const favicon16 = generatePng(16, 16, (x, y, w, h) => renderPinPointLogo(x, y, w, h, false));
fs.writeFileSync(path.join(iconsDir, 'favicon-16x16.png'), favicon16);
console.log('✓ Created public/icons/favicon-16x16.png');

// Write exact SVG master icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Background Circle Radial Gradient -->
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="85%" stop-color="#F5F3FB" stop-opacity="1" />
      <stop offset="100%" stop-color="#EBE7F7" stop-opacity="1" />
    </radialGradient>

    <!-- Blue Pin Gradient -->
    <linearGradient id="bluePinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7371FC" />
      <stop offset="100%" stop-color="#5B50E6" />
    </linearGradient>

    <!-- Pink Pin Gradient -->
    <linearGradient id="pinkPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F4608E" />
      <stop offset="100%" stop-color="#E23D71" />
    </linearGradient>
  </defs>

  <!-- Background Glow Circle -->
  <circle cx="256" cy="256" r="236" fill="url(#bgGlow)" />

  <!-- Blue Map Pin (Left) -->
  <path
    d="M 235,130
       C 185,130 145,170 145,220
       C 145,270 215,350 235,370
       C 255,350 325,270 325,220
       C 325,170 285,130 235,130 Z"
    fill="url(#bluePinGrad)"
    opacity="0.88"
  />

  <!-- Pink Map Pin (Right, Overlapping with Multiply Blend) -->
  <path
    d="M 305,170
       C 255,170 215,210 215,260
       C 215,310 285,390 305,410
       C 325,390 395,310 395,260
       C 395,210 355,170 305,170 Z"
    fill="url(#pinkPinGrad)"
    opacity="0.82"
    style="mix-blend-mode: multiply;"
  />
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svgContent);
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svgContent);
console.log('✓ Created SVG icons in public/icons/');
console.log('🎉 All PinPoint PWA assets generated successfully!');
