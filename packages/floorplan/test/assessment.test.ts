import test from 'node:test';
import assert from 'node:assert/strict';
import { assessPlan } from '../evaluation/assess';
import { calibrate } from '../src/index';
import { samplePlan } from './fixtures/two-rooms';

test('checks occupied space, an open area, a partition and an opening orientation', () => {
  const reference = {
    width: samplePlan.width, height: samplePlan.height, tolerancePx: 5,
    probes: [
      { label: 'inside', kind: 'floor', at: [150, 180] },
      { label: 'outside', kind: 'empty', at: [10, 10] },
      { label: 'open area', kind: 'no-wall', at: [150, 180] },
      { label: 'partition', kind: 'wall', at: [390, 180] },
      { label: 'passage', kind: 'door', at: [390, 242], axis: 'vertical' },
    ],
  };
  assert.deepEqual(assessPlan(samplePlan, reference).checks.map(check => check.status), ['pass', 'pass', 'pass', 'pass', 'pass']);
  assert.deepEqual(assessPlan({ ...samplePlan, openings: [] }, reference).checks.map(check => check.status), ['pass', 'pass', 'pass', 'pass', 'fail']);
  const addedWall = { id: 'extra', a: [150, 130] as [number, number], b: [150, 250] as [number, number], thickness: 18 };
  assert.equal(assessPlan({ ...samplePlan, walls: [...samplePlan.walls, addedWall] }, reference).checks[2].status, 'fail');
  assert.throws(() => assessPlan({ ...samplePlan, width: samplePlan.width + 1 }, reference), /dimensions/);
});

test('an assumed scale and missing stair geometry cannot count as measured results', () => {
  const reference = {
    width: samplePlan.width, height: samplePlan.height, tolerancePx: 5,
    probes: [
      { label: 'stair footprint', kind: 'stair', at: [150, 150] },
      { label: 'stair elevation', kind: 'stair-3d', at: [150, 150] },
    ],
    scale: { a: [80, 60], b: [390, 60], meters: 4.2, toleranceMeters: 0.05 },
  };
  assert.deepEqual(assessPlan(samplePlan, reference).checks.map(check => check.status), ['fail', 'unsupported', 'fail']);
  const calibrated = calibrate(samplePlan, [80, 60], [390, 60], 4.2);
  const withFootprint = { ...calibrated, features: [{ id: 'F1', type: 'stair', label: '', bounds: [130, 130, 170, 170] }] };
  assert.deepEqual(assessPlan(withFootprint, reference).checks.map(check => check.status), ['pass', 'unsupported', 'pass']);
  assert.equal(assessPlan(calibrated, { ...reference, scale: null }).checks[2].status, 'fail');
  const wrongScale = calibrate(samplePlan, [80, 60], [390, 60], 4.5);
  assert.equal(assessPlan(wrongScale, reference).checks[2].status, 'fail');
});
