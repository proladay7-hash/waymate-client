const fs = require('fs');
const zlib = require('zlib');

function makeCrcTable() {
  let c; const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[n] = c;
  }
  return table;
}
const crcTable = makeCrcTable();
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function encodePng(width, height, rgba) {
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });

  function makeChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Decode user PNG
const userImgBuf = fs.readFileSync('C:/Users/Admin/.gemini/antigravity-ide/brain/f2fba128-f8b0-46b2-8ce5-526fb6841e1a/.user_uploaded/media_1792383162646.png');
const uW = userImgBuf.readUInt32BE(16);
const uH = userImgBuf.readUInt32BE(20);

let pos = 8; const idatChunks = [];
while (pos < userImgBuf.length) {
  const len = userImgBuf.readUInt32BE(pos);
  const type = userImgBuf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') idatChunks.push(userImgBuf.subarray(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idatChunks));
const stride = 1 + uW * 4;
const srcPixels = Buffer.alloc(uW * uH * 4);
const rowBuf = Buffer.alloc(uW * 4), prevRow = Buffer.alloc(uW * 4);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
}

for (let y = 0; y < uH; y++) {
  const filter = raw[y * stride], rowStart = y * stride + 1;
  for (let x = 0; x < uW * 4; x++) {
    const rawVal = raw[rowStart + x];
    const left = x >= 4 ? rowBuf[x - 4] : 0, up = prevRow[x], upLeft = x >= 4 ? prevRow[x - 4] : 0;
    let val = 0;
    if (filter === 0) val = rawVal;
    else if (filter === 1) val = (rawVal + left) & 0xff;
    else if (filter === 2) val = (rawVal + up) & 0xff;
    else if (filter === 3) val = (rawVal + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) val = (rawVal + paeth(left, up, upLeft)) & 0xff;
    rowBuf[x] = val;
  }
  rowBuf.copy(prevRow);
  rowBuf.copy(srcPixels, y * uW * 4);
}

// Alpha mask
const alphaGrid = new Float32Array(uW * uH);
for (let y = 0; y < uH; y++) {
  for (let x = 0; x < uW; x++) {
    const idx = (y * uW + x) * 4;
    const r = srcPixels[idx], g = srcPixels[idx+1], b = srcPixels[idx+2];
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
    let a = (245 - brightness) / 195;
    if (a < 0) a = 0;
    if (a > 1) a = 1;
    // Slight smooth curve
    a = a * a * (3 - 2 * a);
    alphaGrid[y * uW + x] = a;
  }
}

// Bilinear sample alpha at (x, y) in user image coordinate space
function sampleAlpha(x, y) {
  if (x < 0 || x >= uW - 1 || y < 0 || y >= uH - 1) return 0;
  const x0 = Math.floor(x), x1 = x0 + 1;
  const y0 = Math.floor(y), y1 = y0 + 1;
  const fx = x - x0, fy = y - y0;
  const a00 = alphaGrid[y0 * uW + x0];
  const a10 = alphaGrid[y0 * uW + x1];
  const a01 = alphaGrid[y1 * uW + x0];
  const a11 = alphaGrid[y1 * uW + x1];
  return (a00 * (1 - fx) + a10 * fx) * (1 - fy) + (a01 * (1 - fx) + a11 * fx) * fy;
}

// Target bounds in user image:
const cropX = 26, cropY = 32, cropW = 480, cropH = 200;

function renderCanvas(targetW, targetH, options = {}) {
  const {
    bg = [0, 0, 0, 0], // RGBA
    fgColor = [23, 38, 71], // Default user drawing navy
    useGradient = false,
    gradientColors = [
      [0, 163, 224], // Cyan #00A3E0
      [0, 102, 177], // Motorsport Blue #0066B1
      [226, 6, 19],  // Racing Red #E20613
    ],
    padFactor = 0.22,
    roundBg = 0,
    bgGradient = null,
  } = options;

  const out = Buffer.alloc(targetW * targetH * 4);
  const innerW = targetW * (1 - padFactor * 2);
  const scale = innerW / cropW;
  const innerH = cropH * scale;
  const offsetX = (targetW - innerW) / 2;
  const offsetY = (targetH - innerH) / 2;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = (y * targetW + x) * 4;
      
      // Background
      let br = bg[0], bg_ = bg[1], bb = bg[2], ba = bg[3];
      if (bgGradient) {
        const t = (x + y) / (targetW + targetH);
        br = Math.round(bgGradient[0][0] * (1 - t) + bgGradient[1][0] * t);
        bg_ = Math.round(bgGradient[0][1] * (1 - t) + bgGradient[1][1] * t);
        bb = Math.round(bgGradient[0][2] * (1 - t) + bgGradient[1][2] * t);
        ba = 255;
      }

      // Rounded rect mask if roundBg > 0
      if (roundBg > 0) {
        const rx = Math.min(x, targetW - 1 - x);
        const ry = Math.min(y, targetH - 1 - y);
        if (rx < roundBg && ry < roundBg) {
          const d = Math.hypot(roundBg - rx, roundBg - ry);
          if (d > roundBg) {
            ba = Math.max(0, Math.min(255, Math.round(255 * (roundBg + 1 - d))));
          }
        }
      }

      // Map (x, y) to user crop space
      const srcX = cropX + (x - offsetX) / scale;
      const srcY = cropY + (y - offsetY) / scale;
      const alpha = sampleAlpha(srcX, srcY);

      if (alpha > 0.001) {
        let fr = fgColor[0], fg = fgColor[1], fb = fgColor[2];
        if (useGradient) {
          // Horizontal gradient across drawing
          const t = Math.max(0, Math.min(1, (srcX - cropX) / cropW));
          if (t < 0.5) {
            const gt = t * 2;
            fr = Math.round(gradientColors[0][0] * (1 - gt) + gradientColors[1][0] * gt);
            fg = Math.round(gradientColors[0][1] * (1 - gt) + gradientColors[1][1] * gt);
            fb = Math.round(gradientColors[0][2] * (1 - gt) + gradientColors[1][2] * gt);
          } else {
            const gt = (t - 0.5) * 2;
            fr = Math.round(gradientColors[1][0] * (1 - gt) + gradientColors[2][0] * gt);
            fg = Math.round(gradientColors[1][1] * (1 - gt) + gradientColors[2][1] * gt);
            fb = Math.round(gradientColors[1][2] * (1 - gt) + gradientColors[2][2] * gt);
          }
        }

        // Composite FG over BG
        const srcA = alpha;
        const dstA = ba / 255;
        const outA = srcA + dstA * (1 - srcA);
        if (outA > 0) {
          out[idx] = Math.round((fr * srcA + br * dstA * (1 - srcA)) / outA);
          out[idx+1] = Math.round((fg * srcA + bg_ * dstA * (1 - srcA)) / outA);
          out[idx+2] = Math.round((fb * srcA + bb * dstA * (1 - srcA)) / outA);
          out[idx+3] = Math.round(outA * 255);
        }
      } else {
        out[idx] = br;
        out[idx+1] = bg_;
        out[idx+2] = bb;
        out[idx+3] = ba;
      }
    }
  }
  return encodePng(targetW, targetH, out);
}

// 1. icon.png (1024x1024) - Clean modern app icon on dark carbon/surface with M-sport accents
const iconPng = renderCanvas(1024, 1024, {
  bgGradient: [[14, 19, 31], [8, 11, 17]], // Surface to dark carbon #0E131F -> #080B11
  useGradient: true, // M-sport gradient on the custom drawn line
  padFactor: 0.18,
});
fs.writeFileSync('d:/waymate/waymate-client/assets/icon.png', iconPng);

// 2. android-icon-foreground.png (512x512) - Transparent with custom drawn logo
const fgPng = renderCanvas(512, 512, {
  bg: [0, 0, 0, 0],
  useGradient: true,
  padFactor: 0.22,
});
fs.writeFileSync('d:/waymate/waymate-client/assets/android-icon-foreground.png', fgPng);

// 3. android-icon-background.png (512x512) - Background color matching app.json (#F4F7F5 or dark motorsport)
const bgPixels = Buffer.alloc(512 * 512 * 4);
for (let i = 0; i < 512 * 512; i++) {
  bgPixels[i*4] = 14;     // #0E131F
  bgPixels[i*4+1] = 19;
  bgPixels[i*4+2] = 31;
  bgPixels[i*4+3] = 255;
}
fs.writeFileSync('d:/waymate/waymate-client/assets/android-icon-background.png', encodePng(512, 512, bgPixels));

// 4. android-icon-monochrome.png (512x512) - White on transparent
const monoPng = renderCanvas(512, 512, {
  bg: [0, 0, 0, 0],
  fgColor: [255, 255, 255],
  padFactor: 0.22,
});
fs.writeFileSync('d:/waymate/waymate-client/assets/android-icon-monochrome.png', monoPng);

// 5. splash-icon.png (1024x1024)
const splashPng = renderCanvas(1024, 1024, {
  bg: [0, 0, 0, 0],
  useGradient: true,
  padFactor: 0.20,
});
fs.writeFileSync('d:/waymate/waymate-client/assets/splash-icon.png', splashPng);

// 6. favicon.png (48x48)
const favPng = renderCanvas(48, 48, {
  bg: [14, 19, 31, 255],
  useGradient: true,
  padFactor: 0.15,
});
fs.writeFileSync('d:/waymate/waymate-client/assets/favicon.png', favPng);

console.log('All 6 app asset icons successfully generated!');
