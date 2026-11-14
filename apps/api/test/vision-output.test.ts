import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCandidates, floorPlan } from '@plan2walk/floorplan';
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

test('a provider room label becomes the name without retrying or changing its bounds', async () => {
  let attempts = 0;
  const result = await readVisionCandidates(async () => {
    attempts++;
    return JSON.stringify({
      status: 'ok', sourceKind: 'architectural_plan',
      rooms: [
        { label: 'Bếp + ăn', bounds: [10, 20, 400, 600] },
        { name: 'WC', label: 'Vệ sinh', bounds: [400, 20, 500, 300] },
        { bounds: [500, 20, 700, 300] },
      ],
      openings: [],
    });
  });
  assert.equal(attempts, 1);
  assert.deepEqual(result.rooms.map(({ name }) => name), ['Bếp + ăn', 'WC', '']);
  assert.deepEqual(result.rooms[0].bounds, [10, 20, 400, 600]);
});

test('an unrecognized feature is flagged without losing the stair, and invalid optional bounds are discarded', async () => {
  const candidates = await readVisionCandidates(async () => JSON.stringify({
    status: 'ok', sourceKind: 'architectural_plan',
    rooms: [{ name: 'Bếp', bounds: [10, 20, 700, 600] }], openings: [],
    features: [
      { type: 'stair', label: '', bounds: [20, 30, 100, 200] },
      { type: 'chair', label: '', bounds: [150, 30, 250, 200] },
      { type: 'sofa', label: '', bounds: [-1, 30, 370, 200] },
    ],
  }));
  const plan = floorPlan.parse(compileCandidates({ ...candidates, width: 1000, height: 1000 }));
  assert.deepEqual(plan.features?.map(({ type, bounds }) => [type, bounds]), [
    ['stair', [20, 30, 100, 200]],
    ['unclassified', [150, 30, 250, 200]],
  ]);
  assert.ok(plan.issues.some(issue => issue.code === 'UNCLASSIFIED_FEATURE'));
  assert.ok(plan.issues.some(issue => issue.code === 'INVALID_FEATURE'));
});
