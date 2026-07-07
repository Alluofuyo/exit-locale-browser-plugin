import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const sizes = [16, 32, 48, 128];
const outputDir = 'public/icons';

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function mix(from, to, amount) {
  return Math.round(from + (to - from) * amount);
}

function color(hex) {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function isInsideRoundedSquare(x, y, size) {
  const radius = size * 0.22;
  const inset = size * 0.06;
  const left = inset;
  const right = size - inset;
  const top = inset;
  const bottom = size - inset;
  const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const cy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;

  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function pixelColor(x, y, size) {
  if (!isInsideRoundedSquare(x, y, size)) {
    return [0, 0, 0, 0];
  }

  const top = color('#172033');
  const bottom = color('#0f766e');
  const gradient = y / size;
  let r = mix(top[0], bottom[0], gradient);
  let g = mix(top[1], bottom[1], gradient);
  let b = mix(top[2], bottom[2], gradient);

  const cx = size * 0.5;
  const cy = size * 0.45;
  const radius = size * 0.28;
  const distance = Math.hypot(x - cx, y - cy);
  const latitudeLine = Math.abs(y - cy) < size * 0.035 && Math.abs(x - cx) < radius * 0.95;
  const longitudeLine = Math.abs(x - cx) < size * 0.035 && Math.abs(y - cy) < radius * 0.95;
  const globeRing = Math.abs(distance - radius) < size * 0.04;
  const pinTip =
    y > cy + radius * 0.45 &&
    y < size * 0.85 &&
    Math.abs(x - cx) < (size * 0.85 - y) * 0.38;

  if (globeRing || latitudeLine || longitudeLine || pinTip) {
    r = 236;
    g = 253;
    b = 245;
  }

  const innerDot = distance < size * 0.055;
  if (innerDot) {
    r = 45;
    g = 212;
    b = 191;
  }

  return [r, g, b, 255];
}

function createPng(size) {
  const bytesPerPixel = 4;
  const stride = size * bytesPerPixel + 1;
  const raw = Buffer.alloc(stride * size);

  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = y * stride + 1 + x * bytesPerPixel;
      const [r, g, b, a] = pixelColor(x + 0.5, y + 0.5, size);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outputDir, { recursive: true });

for (const size of sizes) {
  writeFileSync(`${outputDir}/icon-${size}.png`, createPng(size));
}
