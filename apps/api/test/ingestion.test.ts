import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPreview } from '../src/ingestion/preview';

test('image dimensions must match the uploaded bytes', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwCAgAB/axXowAAAABJRU5ErkJggg==', 'base64');
  assert.deepEqual(inspectPreview(png), { width: 1, height: 1, mime: 'image/png' });
  assert.throws(() => inspectPreview(Buffer.from('%PDF-1.7')));
  assert.throws(() => inspectPreview(png.subarray(0, 20)));
});
