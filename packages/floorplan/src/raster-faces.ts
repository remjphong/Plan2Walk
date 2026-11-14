import { inRoom } from './geometry';
import type { RasterSegment } from './raster';
import type { Point } from './schema';

export function boundedFaces(walls: RasterSegment[]) {
  const neighbors = new Map<string, Point[]>();
  const key = (p: Point) => p.join(',');
  function add(a: Point, b: Point) {
    const list = neighbors.get(key(a)) ?? [];
    if (!list.some(point => key(point) === key(b))) list.push(b);
    neighbors.set(key(a), list);
  }
  for (const wall of walls) {
    const positions = [wall.start, wall.end];
    for (const other of walls) {
      if (wall.axis !== other.axis && other.at > wall.start && other.at < wall.end &&
        wall.at >= other.start && wall.at <= other.end) positions.push(other.at);
      if (wall.axis === other.axis && wall.at === other.at) {
        if (other.start > wall.start && other.start < wall.end) positions.push(other.start);
        if (other.end > wall.start && other.end < wall.end) positions.push(other.end);
      }
    }
    const stations = [...new Set(positions)].sort((a, b) => a - b);
    const point = (pos: number): Point => wall.axis === 0 ? [wall.at, pos] : [pos, wall.at];
    for (let i = 1; i < stations.length; i++) {
      const a = point(stations[i - 1]), b = point(stations[i]);
      add(a, b);
      add(b, a);
    }
  }
  const angle = (from: Point, to: Point) => Math.atan2(to[1] - from[1], to[0] - from[0]);
  const seeds = [...neighbors].map(([id, next]) => ({ point: id.split(',').map(Number) as Point, next }));
  for (const { point, next } of seeds) next.sort((a, b) => angle(point, a) - angle(point, b));
  const visited = new Set<string>();
  const faces: { polygon: Point[]; area: number }[] = [];
  for (const { point, next } of seeds) for (const neighbor of next) {
    let a = point, b = neighbor;
    const start = key(a) + '>' + key(b);
    const ring: Point[] = [];
    let edge = start;
    while (!visited.has(edge)) {
      visited.add(edge);
      // An attached wall spur is traversed in both directions. It does not cut a new floor.
      const repeated = ring.findIndex(p => key(p) === key(a));
      if (repeated < 0) ring.push(a);
      else ring.splice(repeated + 1);
      const outgoing = neighbors.get(key(b))!;
      const back = outgoing.findIndex(p => key(p) === key(a));
      const c = outgoing[(back - 1 + outgoing.length) % outgoing.length];
      a = b;
      b = c;
      edge = key(a) + '>' + key(b);
    }
    if (edge !== start || ring.length < 4) continue;
    const area = ring.reduce((sum, [x, y], i) => {
      const nextPt = ring[(i + 1) % ring.length];
      return sum + x * nextPt[1] - y * nextPt[0];
    }, 0) / 2;
    if (area > 0) faces.push({ polygon: ring, area });
  }
  return faces.sort((a, b) => b.area - a.area);
}

function clipHalfPlane(polygon: Point[], axis: 0 | 1, bound: number, keepGreater: boolean): Point[] {
  if (polygon.length < 3) return [];
  const inside = (p: Point) => keepGreater ? p[axis] >= bound - 1e-6 : p[axis] <= bound + 1e-6;
  const intersect = (a: Point, b: Point): Point => {
    const denom = b[axis] - a[axis];
    if (Math.abs(denom) < 1e-9) return a;
    const t = (bound - a[axis]) / denom;
    return axis === 0 ? [bound, a[1] + (b[1] - a[1]) * t] : [a[0] + (b[0] - a[0]) * t, bound];
  };
  const out: Point[] = [];
  let prev = polygon[polygon.length - 1];
  let prevIn = inside(prev);
  for (const curr of polygon) {
    const currIn = inside(curr);
    if (currIn) {
      if (!prevIn) out.push(intersect(prev, curr));
      out.push(curr);
    } else if (prevIn) {
      out.push(intersect(prev, curr));
    }
    prev = curr;
    prevIn = currIn;
  }
  return out;
}

function polygonArea(poly: Point[]) {
  return Math.abs(poly.reduce((sum, [x, y], i) => {
    const next = poly[(i + 1) % poly.length];
    return sum + x * next[1] - y * next[0];
  }, 0) / 2);
}

function polygonBounds(poly: Point[]): [number, number, number, number] {
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export type FloorZoneInput = { name: string; bounds: [number, number, number, number] };

export function compileFloorZones(
  faces: ReturnType<typeof boundedFaces>,
  rooms: FloorZoneInput[],
  network: RasterSegment[],
  allStrokes: RasterSegment[],
  minArea: number,
  tolerance: number,
) {
  const validFaces = faces.filter(face => face.area >= minArea);
  const usedZones = new Set<number>();
  const faceZones = validFaces.map(() => [] as (FloorZoneInput & { cx: number; cy: number; index: number })[]);

  rooms.forEach((room, index) => {
    const [x0, y0, x1, y1] = room.bounds;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let targetFace = validFaces.findIndex(({ polygon }) => inRoom([cx, cy], polygon));
    if (targetFace === -1) {
      // Try inset probe points in case the zone center landed near an L-corner or edge
      const probes: Point[] = [
        [x0 + (x1 - x0) * .35, y0 + (y1 - y0) * .35],
        [x0 + (x1 - x0) * .65, y0 + (y1 - y0) * .35],
        [x0 + (x1 - x0) * .35, y0 + (y1 - y0) * .65],
        [x0 + (x1 - x0) * .65, y0 + (y1 - y0) * .65],
      ];
      let bestHits = 0;
      validFaces.forEach(({ polygon }, fIdx) => {
        const hits = probes.filter(p => inRoom(p, polygon)).length;
        if (hits >= 3 && hits > bestHits) {
          bestHits = hits;
          targetFace = fIdx;
        }
      });
    }
    if (targetFace !== -1) {
      usedZones.add(index);
      if (room.name.trim()) faceZones[targetFace].push({ ...room, cx, cy, index });
    }
  });

  const floors: { name: string; polygon: Point[]; estimated?: boolean; zoneId?: string }[] = [];

  validFaces.forEach(({ polygon }, fIdx) => {
    const assigned = faceZones[fIdx];
    if (assigned.length <= 1) {
      floors.push({ polygon, name: assigned[0]?.name ?? '', zoneId: assigned[0] ? 'Z' + assigned[0].index : 'face-' + fIdx });
      return;
    }
    // Partition on both axes. Small contained zones take precedence over broad
    // room boxes, so a courtyard does not become a strip across the whole house.
    const [left, top, right, bottom] = polygonBounds(polygon);
    const xs = [...new Set([left, right, ...assigned.flatMap(z => [z.bounds[0], z.bounds[2]])
      .filter(x => x > left && x < right)])].sort((a,b) => a-b);
    const ys = [...new Set([top, bottom, ...assigned.flatMap(z => [z.bounds[1], z.bounds[3]])
      .filter(y => y > top && y < bottom)])].sort((a,b) => a-b);
    for (let y = 1; y < ys.length; y++) for (let x = 1; x < xs.length; x++) {
      const cx = (xs[x-1] + xs[x]) / 2, cy = (ys[y-1] + ys[y]) / 2;
      if (!inRoom([cx,cy], polygon)) continue;
      const containing = assigned.filter(z => cx >= z.bounds[0] && cx <= z.bounds[2] && cy >= z.bounds[1] && cy <= z.bounds[3]);
      const zone = containing.sort((a,b) =>
        (a.bounds[2]-a.bounds[0])*(a.bounds[3]-a.bounds[1]) - (b.bounds[2]-b.bounds[0])*(b.bounds[3]-b.bounds[1]))[0];
      let piece = clipHalfPlane(polygon, 0, xs[x-1], true);
      piece = clipHalfPlane(piece, 0, xs[x], false);
      piece = clipHalfPlane(piece, 1, ys[y-1], true);
      piece = clipHalfPlane(piece, 1, ys[y], false);
      if (piece.length >= 3 && polygonArea(piece) > 1e-6) floors.push({
        polygon: piece, name: zone?.name ?? '', zoneId: zone ? 'Z' + zone.index : 'face-' + fIdx,
      });
    }
  });

  // Recover each unresolved zone independently. The estimate requires substantial
  // boundary evidence and is explicitly marked for review by the caller.
  for (let index = 0; index < rooms.length; index++) {
    if (usedZones.has(index)) continue;
    const room = rooms[index];
    const bounds = [...room.bounds] as [number, number, number, number];
    const pool = network;
    const support = (axis: 0 | 1, at: number, start: number, end: number) => {
      const intervals = pool.filter(s => s.axis === axis && Math.abs(s.at - at) <= tolerance * 2)
        .map(s => [Math.max(start, s.start), Math.min(end, s.end)])
        .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
      let covered = 0, cursor = start;
      for (const [a, b] of intervals) {
        covered += Math.max(0, b - Math.max(a, cursor));
        cursor = Math.max(cursor, b);
      }
      return covered / Math.max(1, end - start) >= .65;
    };
    for (const side of [0, 1, 2, 3]) {
      const axis = (side % 2) as 0 | 1;
      const across = 1 - axis;
      const nearest = pool.filter(s => s.axis === axis && Math.abs(s.at - bounds[side]) <= tolerance * 2 &&
        Math.min(s.end, bounds[across + 2]) - Math.max(s.start, bounds[across]) > (bounds[across + 2] - bounds[across]) * .5)
        .sort((a, b) => Math.abs(a.at - bounds[side]) - Math.abs(b.at - bounds[side]))[0];
      if (nearest) bounds[side] = nearest.at;
    }
    const [x0, y0, x1, y1] = bounds;
    if (x1 - x0 < tolerance * 2 || y1 - y0 < tolerance * 2) continue;
    const sides = [support(0, x0, y0, y1), support(1, y0, x0, x1),
      support(0, x1, y0, y1), support(1, y1, x0, x1)];
    if (sides.filter(Boolean).length < 2) continue;
    // Subtract existing orthogonal polygons cell by cell, preserving concavities.
    const vertices = floors.flatMap(f => f.polygon);
    const xs = [...new Set([x0, x1, ...vertices.map(p => p[0]).filter(x => x > x0 && x < x1)])].sort((a,b) => a-b);
    const ys = [...new Set([y0, y1, ...vertices.map(p => p[1]).filter(y => y > y0 && y < y1)])].sort((a,b) => a-b);
    const additions: typeof floors = [];
    for (let yi = 1; yi < ys.length; yi++) {
      let run: number | undefined;
      for (let xi = 1; xi <= xs.length; xi++) {
        const free = xi < xs.length && !floors.some(f => inRoom([(xs[xi-1]+xs[xi])/2, (ys[yi-1]+ys[yi])/2], f.polygon));
        if (free && run === undefined) run = xs[xi-1];
        if (!free && run !== undefined) {
          additions.push({ name: room.name, zoneId: 'Z' + index, estimated: true, polygon: [[run,ys[yi-1]],[xs[xi-1],ys[yi-1]],[xs[xi-1],ys[yi]],[run,ys[yi]]] });
          run = undefined;
        }
      }
    }
    floors.push(...additions);
  }
  return floors;
}
