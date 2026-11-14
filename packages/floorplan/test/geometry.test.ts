import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeometry, calibrate, compileCandidates, createOpening, floorPlan, removeOpening, hasSeparatePlanGroups, updateOpening, visionCandidates } from '../src/index';
import { samplePlan } from './fixtures/two-rooms';

test('a partition between adjacent room regions only becomes a wall if the advisor sees a wall there', () => {
  const candidates = visionCandidates.parse({
    status: 'ok', sourceKind: 'architectural_plan',
    rooms: [{ name: 'Khách', bounds: [100, 100, 500, 900] }, { name: 'Bếp', bounds: [500, 100, 900, 900] }],
    walls: [
      { a: [100, 100], b: [900, 100], thicknessX: 0, thicknessY: 20 },
      { a: [100, 900], b: [900, 900], thicknessX: 0, thicknessY: 20 },
      { a: [100, 100], b: [100, 900], thicknessX: 10, thicknessY: 0 },
      { a: [900, 100], b: [900, 900], thicknessX: 10, thicknessY: 0 },
      { a: [900, 100], b: [100, 100], thicknessX: 0, thicknessY: 20 },
    ],
    openings: [{ name: 'D1', type: 'door', x: 500, y: 500, span: 90, axis: 'vertical' }],
  });
  const plan = compileCandidates({ ...candidates, width: 1000, height: 500 });
  assert.equal(plan.walls.length, 4);
  assert.equal(plan.walls[0].thickness, 10);
  assert.equal(plan.openings.length, 0);
  assert.ok(plan.issues.some(issue => issue.code === 'UNRESOLVED_OPENING'));
});

test('stair and furniture candidates survive API schema validation in source coordinates without inventing scale', () => {
  const candidates = visionCandidates.parse({
    status: 'ok', sourceKind: 'architectural_plan',
    rooms: [{ name: '', bounds: [100, 100, 900, 900] }], openings: [],
    features: [
      { type: 'stair', label: '', bounds: [300, 400, 500, 600] },
      { type: 'sofa', label: '', bounds: [600, 200, 800, 400] },
      { type: 'bed', label: '', bounds: [500, 600, 400, 650] },
    ],
  });
  const plan = floorPlan.parse(compileCandidates({ ...candidates, width: 1000, height: 500 }));
  assert.deepEqual(plan.features?.map(feature => [feature.type, feature.bounds]), [
    ['stair', [300, 200, 500, 300]], ['sofa', [600, 100, 800, 200]],
  ]);
  assert.deepEqual(plan.scale, { status: 'unknown' });
});

test('a door joins the floors across the entire wall thickness', () => {
  const geometry = buildGeometry(samplePlan);
  for (let x = 377; x <= 405; x++) assert.equal(geometry.walkable([x, 242]), true, `x=${x}`);
  assert.equal(geometry.walkable([390, 174]), false);
  assert.equal(geometry.walkable([26, 240]), false);
});

test('furniture blocks walking inside its footprint, while an unverified stair has no invented elevation', () => {
  const plan = floorPlan.parse({ ...samplePlan, features: [
    { id: 'table', type: 'table', label: '', bounds: [120, 120, 205, 195] },
    { id: 'stairs', type: 'stair', label: '', bounds: [225, 120, 310, 195] },
    { id: 'outside', type: 'sofa', label: '', bounds: [0, 0, 20, 20] },
  ] });
  const geometry = buildGeometry(plan);
  assert.equal(geometry.walkable([160, 160]), false);
  assert.equal(geometry.walkable([340, 160]), true);
  assert.ok(geometry.issues.some(issue => issue.entityId === 'stairs' && issue.code === 'UNVERIFIED_STAIR_PROFILE'));
  assert.ok(geometry.issues.some(issue => issue.entityId === 'outside' && issue.code === 'FEATURE_OUTSIDE_FLOOR'));
});

test('moving a door updates both the opening and collision from one revision', () => {
  const revised = updateOpening(samplePlan, 'D03', { offset: 0.32 });
  assert.equal(revised.revision, samplePlan.revision + 1);
  const geometry = buildGeometry(revised);
  assert.equal(geometry.walkable([390, 190]), true);
  assert.equal(geometry.walkable([390, 242]), false);
});

test('rejected openings and invalid scale leave the original plan usable', () => {
  assert.throws(() => updateOpening(samplePlan, 'D03', { width: 900 }));
  assert.throws(() => calibrate(samplePlan, [1, 1], [1, 1], 4.2));
  const revised = calibrate(samplePlan, [80, 60], [390, 60], 4.2);
  assert.equal(revised.scale.status, 'verified');
  assert.equal(revised.scale.status === 'verified' && revised.scale.metersPerPixel, 4.2 / 310);
  assert.equal(samplePlan.scale.status, 'unknown');
});

test('a manually added missing door opens the same threshold used for walking', () => {
  const closed = removeOpening(samplePlan, 'D03');
  assert.equal(buildGeometry(closed).walkable([390, 242]), false);
  const revised = createOpening(closed, { type: 'door', wallId: 'W04', offset: .5, width: 68 });
  assert.equal(buildGeometry(revised).walkable([390, 242]), true);
  assert.equal(revised.revision, samplePlan.revision + 2);
  assert.throws(() => createOpening(revised, { type: 'window', wallId: 'W04', offset: .5, width: 20 }));
  assert.equal(closed.openings.length, samplePlan.openings.length - 1);
});

test('model-supplied repeated names cannot create duplicate opening identities', () => {
  const plan = compileCandidates({
    width: 1000, height: 500,
    rooms: [{ name: 'A', bounds: [100, 100, 900, 900] }],
    openings: [
      { name: 'D', type: 'door', x: 200, y: 100, span: 60, axis: 'horizontal' },
      { name: 'D-3', type: 'door', x: 400, y: 100, span: 60, axis: 'horizontal' },
      { name: 'D', type: 'door', x: 600, y: 100, span: 60, axis: 'horizontal' },
    ],
  });
  assert.equal(plan.openings.length, 3);
  assert.equal(new Set(plan.openings.map(opening => opening.id)).size, 3);
});

test('two groups stacked across a clear sheet gutter require a selected region', () => {
  const rooms = [[100, 100, 340, 350], [340, 140, 620, 360], [120, 570, 420, 850], [420, 590, 610, 825]]
    .map(bounds => ({ name: '', bounds: bounds as [number, number, number, number] }));
  assert.equal(hasSeparatePlanGroups(rooms), true);
  assert.equal(hasSeparatePlanGroups(rooms.slice(0, 2)), false);
  assert.equal(hasSeparatePlanGroups([...rooms, { name: 'Hall', bounds: [280, 340, 350, 610] }]), false);
});

test('candidate coordinates are converted once, and an unsupported door stays unresolved', () => {
  const plan = compileCandidates({
    width: 1000, height: 500,
    rooms: [{ name: 'A', bounds: [100, 100, 500, 800] }, { name: 'B', bounds: [500, 100, 900, 800] }],
    openings: [{ name: 'D01', type: 'door', x: 500, y: 500, span: 100, axis: 'vertical' },
      { name: 'D02', type: 'door', x: 300, y: 500, span: 100, axis: 'vertical' }],
  });
  assert.equal(plan.openings.length, 1);
  assert.equal(plan.openings[0].width, 50);
  assert.ok(plan.issues.some(issue => issue.entityId === 'D02'));
  assert.equal(plan.scale.status, 'unknown');
});
