import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { decodePreview, inspectPreview } from '../src/ingestion/preview';

test('image dimensions must match the uploaded bytes', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwCAgAB/axXowAAAABJRU5ErkJggg==', 'base64');
  assert.deepEqual(inspectPreview(png), { width: 1, height: 1, mime: 'image/png' });
  assert.throws(() => inspectPreview(Buffer.from('%PDF-1.7')));
  assert.throws(() => inspectPreview(png.subarray(0, 20)));
});

test('only decodes the bounded non-interlaced previews produced by canvas', () => {
  const image = new PNG({ width: 2, height: 2 });
  image.data.fill(255);
  const encoded = PNG.sync.write(image);
  assert.deepEqual(decodePreview(encoded).data, image.data);
  encoded[28] = 1;
  assert.throws(() => decodePreview(encoded), /Interlaced preview/);
});
