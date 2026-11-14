import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCandidates, inRoom } from '../src/index';
import { compileFloorZones } from '../src/raster-faces';

test('a small functional zone stays inside its two-dimensional bounds', () => {
  const face = { polygon: [[0,0],[200,0],[200,100],[0,100]] as [number,number][], area: 20000 };
  const floors = compileFloorZones([face], [
    {name:'Living', bounds:[0,0,100,100]},
    {name:'Garden', bounds:[80,0,120,35]},
    {name:'Kitchen', bounds:[100,0,200,100]},
  ], [], [], 10, 2);
  assert.ok(floors.some(f => f.name === 'Garden' && inRoom([100,20],f.polygon)));
  assert.ok(!floors.some(f => f.name === 'Garden' && inRoom([100,80],f.polygon)));
  assert.ok(floors.every(f => f.zoneId));
});

test('an explicitly empty floor result never silently becomes AI rectangles', () => {
  const plan = compileCandidates({ width: 400, height: 240, floors: [], walls: [], openings: [],
    rooms: [{ name: 'Living', bounds: [100, 100, 900, 900] }] });
  assert.equal(plan.rooms.length, 0);
});

test('a small closed room does not suppress a distant zone supported by boundary strokes', () => {
  const walls = [
    { axis: 1 as const, at: 40, start: 40, end: 350, thickness: 4 },
    { axis: 1 as const, at: 180, start: 40, end: 350, thickness: 4 },
  ];
  const rooms = [{ name: 'Living', bounds: [40, 40, 160, 180] as [number, number, number, number] }];
  const face = { polygon: [[300, 40], [350, 40], [350, 90], [300, 90]] as [number, number][], area: 2500 };
  for (const faces of [[], [face]]) {
    const floors = compileFloorZones(faces, rooms, walls, walls, 60, 3);
    assert.ok(floors.some(f => inRoom([100, 100], f.polygon)));
  }
});
