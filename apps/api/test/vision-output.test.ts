import test from 'node:test';
import assert from 'node:assert/strict';
import { readVisionCandidates } from '../src/vision/output';

test('a blank JSON response gets one retry with a format hint', async () => {
  const attempts: (string | undefined)[] = [];
  const result = await readVisionCandidates(async hint => {
    attempts.push(hint);
    return attempts.length === 1 ? '   ' : '{"status":"unsupported","sourceKind":"render_or_photo","rooms":[],"openings":[]}';
  });
  assert.equal(result.sourceKind, 'render_or_photo');
  assert.equal(attempts.length, 2);
  assert.match(attempts[1]!, /JSON/);
});

test('invalid coordinates are never filled in and invalid output is retried only once', async () => {
  let attempts = 0;
  await assert.rejects(readVisionCandidates(async () => {
    attempts++;
    return '{"status":"ok","sourceKind":"architectural_plan","rooms":[{"name":"","bounds":[-1,0,400,600]}],"openings":[]}';
  }), /rooms/);
  assert.equal(attempts, 2);
});

test('the provider synonym for a supported plan is normalized without changing coordinates', async () => {
  const result = await readVisionCandidates(async () =>
    '{"status":"supported","sourceKind":"architectural_plan","rooms":[{"name":"Room","bounds":[10,20,400,600]}],"openings":[]}');
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.rooms[0].bounds, [10, 20, 400, 600]);
});
