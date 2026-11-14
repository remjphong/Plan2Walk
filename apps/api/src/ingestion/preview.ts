import { PNG } from 'pngjs';

export function decodePreview(data: Buffer) {
  // Browser canvas produces non-interlaced previews. pngjs does not cap inflate
  // output for interlaced input, so reject it before decoding.
  if (data[28] !== 0) throw new Error('Interlaced preview');
  return PNG.sync.read(data);
}

export function upscaleForVision(pixels: { width: number; height: number; data: Uint8Array }, fallback: Buffer): Buffer {
  const { width, height, data } = pixels;
  if (Math.max(width, height) >= 1100) return fallback;
  const outW = width * 2, outH = height * 2;
  const out = new PNG({ width: outW, height: outH });
  for (let y = 0; y < outH; y++) {
    const sy = Math.min(height - 1, y / 2);
    const y0 = Math.floor(sy), y1 = Math.min(height - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(width - 1, x / 2);
      const x0 = Math.floor(sx), x1 = Math.min(width - 1, x0 + 1), fx = sx - x0;
      const i00 = (y0 * width + x0) * 4, i10 = (y0 * width + x1) * 4;
      const i01 = (y1 * width + x0) * 4, i11 = (y1 * width + x1) * 4;
      const dst = (y * outW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx;
        const bot = data[i01 + c] * (1 - fx) + data[i11 + c] * fx;
        out.data[dst + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return PNG.sync.write(out);
}

export function inspectPreview(data: Buffer) {
  if (data.length >= 33 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      && data.toString('ascii', 12, 16) === 'IHDR' && data.readUInt32BE(8) === 13) {
    const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
    if (width && height) return { width, height, mime: 'image/png' };
  }
  throw new Error('Ảnh xem trước không hợp lệ.');
}
