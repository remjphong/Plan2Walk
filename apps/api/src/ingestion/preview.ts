export function inspectPreview(data: Buffer) {
  if (data.length >= 33 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      && data.toString('ascii', 12, 16) === 'IHDR' && data.readUInt32BE(8) === 13) {
    const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
    if (width && height) return { width, height, mime: 'image/png' };
  }
  throw new Error('Ảnh xem trước không hợp lệ.');
}
