import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeometry, compileCandidates, inRoom, reconcileRasterCandidates, type Candidates, type Point } from '../src/index';

function drawing(transpose: boolean, multiplier: number) {
  const width = (transpose ? 240 : 400) * multiplier;
  const height = (transpose ? 400 : 240) * multiplier;
  const data = new Uint8Array(width * height * 4).fill(255);
  const point = (x: number, y: number): Point => transpose ? [y * multiplier, x * multiplier] : [x * multiplier, y * multiplier];
  function ink(left: number, top: number, right: number, bottom: number, shade: number) {
    for (let y = top * multiplier; y < bottom * multiplier; y++) for (let x = left * multiplier; x < right * multiplier; x++) {
      const i = (transpose ? x * width + y : y * width + x) * 4;
      data.fill(shade, i, i + 3);
    }
  }
  ink(0, 0, 400, 3, 0); ink(0, 237, 400, 240, 0); // frame
  ink(40, 55, 355, 60, 65); ink(40, 147, 355, 152, 65);
  ink(40, 55, 45, 152, 65); ink(350, 55, 355, 152, 65);
  ink(290, 58, 295, 94, 65); ink(291, 90, 351, 95, 65);
  ink(40, 192, 355, 193, 90); // dimension line
  ink(117, 117, 163, 119, 110); ink(117, 130, 163, 132, 110); // sofa
  const source = (x: number, y: number): Point => {
    const p = point(x, y);
    return [p[0] * 1000 / width, p[1] * 1000 / height];
  };
  function bounds(a: Point, b: Point): [number, number, number, number] {
    return [a[0], a[1], b[0], b[1]];
  }
  const wall = (a: Point, b: Point) => ({ a, b, thicknessX: 0, thicknessY: 0 });
  const input: Candidates = {
    status: 'ok', sourceKind: 'architectural_plan',
    rooms: [{ name: 'Living', bounds: bounds(source(42, 62), source(352, 210)) }],
    walls: [
      wall(source(42, 62), source(352, 62)), wall(source(42, 210), source(352, 210)),
      wall(source(42, 62), source(42, 210)), wall(source(352, 62), source(352, 210)),
      wall(source(196, 62), source(196, 210)), // invented partition
      wall(source(292, 108), source(352, 108)),
    ],
    openings: [],
    features: [{ type: 'sofa', label: '', bounds: bounds(source(117, 155), source(163, 181)) }],
  };
  return { input, image: { width, height, data }, point };
}

for (const [transpose, multiplier] of [[false, 1], [true, 2]] as const) {
  test(`pixel evidence corrects a stretched draft and rejects unsupported partitions (${transpose}, ${multiplier})`, () => {
    const { input, image, point } = drawing(transpose, multiplier);
    const { candidates } = reconcileRasterCandidates(input, image);
    const plan = compileCandidates({ ...candidates, width: image.width, height: image.height });
    assert.ok(inRoom(point(160, 125), plan.rooms[0].polygon));
    assert.ok(!inRoom(point(160, 181), plan.rooms[0].polygon));
    assert.ok(!plan.walls.some(wall => {
      const [x, y] = point(196, 100);
      return Math.abs(wall.a[transpose ? 1 : 0] - (transpose ? y : x)) < 2 * multiplier &&
        Math.abs(wall.b[transpose ? 0 : 1] - wall.a[transpose ? 0 : 1]) > 30 * multiplier;
    }));
    const sofa = plan.features?.[0];
    assert.ok(sofa);
    const [x, y] = point(131, 123);
    assert.ok(x >= sofa.bounds[0] && x <= sofa.bounds[2] && y >= sofa.bounds[1] && y <= sofa.bounds[3]);
  });
}

test('missing wall evidence is explicit and cannot create solid partitions', () => {
  const { input, image } = drawing(false, 1);
  image.data.fill(255);
  const result = reconcileRasterCandidates(input, image);
  assert.equal(result.candidates.walls?.length, 0);
  assert.equal(result.candidates.rooms.length, 0);
  assert.ok(result.issues.some(issue => issue.code === 'NO_RASTER_WALL_EVIDENCE'));
});

test('a partition connecting two walls can be recovered from the original ink without an AI proposal', () => {
  const { input, image } = drawing(false, 1);
  input.walls!.splice(4, 1);
  for (let y = 57; y < 150; y++) for (let x = 195; x < 200; x++) {
    const offset = (y * image.width + x) * 4;
    image.data.fill(65, offset, offset + 3);
  }
  const { candidates, floors } = reconcileRasterCandidates(input, image);
  const plan = compileCandidates({ ...candidates, floors, width: image.width, height: image.height });
  assert.ok(plan.walls.some(wall => Math.abs(wall.a[0] - 197) < 2 && Math.abs(wall.b[1] - wall.a[1]) > 85));
  assert.ok(plan.rooms.length >= 2);
});

test('an AI door on continuous ink cannot cut the wall', () => {
  const { input, image } = drawing(false, 1);
  input.openings = [{ name: 'D1', type: 'door', x: 480, y: 62 * 1000 / 240, span: 60, axis: 'horizontal' }];
  const { candidates, issues } = reconcileRasterCandidates(input, image);
  assert.equal(candidates.openings.length, 0);
  assert.ok(issues.some(issue => issue.code === 'OPENING_WITHOUT_GAP'));
});

test('a clear connected outline survives an empty wall proposal', () => {
  const { input, image } = drawing(false, 1);
  input.walls = [];
  const result = reconcileRasterCandidates(input, image);
  assert.ok(result.floors?.some(floor => inRoom([170, 104], floor.polygon)));
  assert.ok(!result.floors?.some(floor => inRoom([170, 190], floor.polygon)));
});

test('paired wall piers expose a passage and preserve both floors without an AI opening proposal', () => {
  const { input, image } = drawing(false, 1);
  input.walls = [];
  input.rooms = [];
  input.openings = [];
  for (let y = 57; y < 150; y++) for (let x = 195; x < 200; x++) {
    if (y >= 92 && y < 117) continue;
    const offset = (y * image.width + x) * 4;
    image.data.fill(65, offset, offset + 3);
  }
  const { candidates, floors, passages } = reconcileRasterCandidates(input, image);
  const plan = compileCandidates({ ...candidates, floors, passages, width: image.width, height: image.height });
  assert.ok(plan.rooms.some(room => inRoom([125, 100], room.polygon)));
  assert.ok(plan.rooms.some(room => inRoom([225, 100], room.polygon)));
  assert.ok(buildGeometry(plan).walkable([197, 104]));
  assert.ok(!buildGeometry(plan).walkable([197, 75]));
  assert.equal(plan.openings.length, 0, 'a raster gap alone does not establish a door or window');
});

test('an evidence-based floor result never turns unverified room boxes into solid flooring', () => {
  const { input, image } = drawing(false, 1);
  const plan = compileCandidates({ ...input, floors: [], width: image.width, height: image.height });
  assert.deepEqual(plan.rooms, []);
});

test('a real gap in a connecting partition retains its source position and width', () => {
  const { input, image } = drawing(false, 1);
  input.rooms = [{ name: 'Living', bounds: [110, 260, 485, 870] }, { name: 'Bed', bounds: [495, 260, 880, 870] }];
  input.openings = [{ name: 'D1', type: 'door', x: 197 * 1000 / 400, y: 104 * 1000 / 240, span: 25 * 1000 / 240, axis: 'vertical' }];
  for (let y = 57; y < 150; y++) {
    if (y >= 92 && y < 117) continue;
    for (let x = 195; x < 200; x++) {
      const offset = (y * image.width + x) * 4;
      image.data.fill(65, offset, offset + 3);
    }
  }
  const { candidates, floors } = reconcileRasterCandidates(input, image);
  const plan = compileCandidates({ ...candidates, floors, width: image.width, height: image.height });
  assert.equal(plan.openings.length, 1);
  assert.equal(plan.openings[0].width, 25);
  const geometry = buildGeometry(plan);
  assert.ok(geometry.walkable([197, 104]));
  assert.ok(!geometry.walkable([197, 75]));
});

test('a crosswall separates two corner doors on the same axis', () => {
  const { input, image } = drawing(false, 1);
  const paint = (x: number, y: number, x2: number, y2: number) => {
    for (let j = y; j < y2; j++) for (let i = x; i < x2; i++) {
      const offset = (j * image.width + i) * 4;
      image.data.fill(65, offset, offset + 3);
    }
  };
  paint(195, 57, 200, 84);
  paint(195, 119, 200, 150);
  paint(195, 98, 353, 103);
  const point = (x: number, y: number): Point => [x * 1000 / 400, y * 1000 / 240];
  input.walls!.push({ a: point(197, 100), b: point(352, 100), thicknessX: 0, thicknessY: 0 });
  input.openings = [91, 111].map((y, i) => ({
    name: 'D' + i, type: 'door', axis: 'vertical', x: point(197, y)[0], y: point(197, y)[1], span: 15 * 1000 / 240,
  }));
  const { candidates, floors } = reconcileRasterCandidates(input, image);
  const plan = compileCandidates({ ...candidates, floors, width: image.width, height: image.height });
  assert.equal(plan.openings.length, 2);
  const calibrated = { ...plan, scale: { status: 'verified' as const, a: [0, 0] as Point, b: [100, 0] as Point,
    meters: 4, metersPerPixel: .04 } };
  const geometry = buildGeometry(calibrated);
  for (const y of [91, 111]) {
    for (const x of [191, 195, 197, 199, 203]) assert.ok(geometry.walkable([x, y]), `blocked at ${x},${y}`);
  }
  assert.ok(!geometry.walkable([197, 75]));
  assert.ok(!geometry.walkable([205, 100]));
});
