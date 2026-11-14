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

  const floors: { name: string; polygon: Point[] }[] = [];

  validFaces.forEach(({ polygon }, fIdx) => {
    const assigned = faceZones[fIdx];
    if (assigned.length <= 1) {
      floors.push({ polygon, name: assigned[0]?.name ?? '' });
      return;
    }
    // Open-plan face shared by multiple functional zones: split cleanly along dominant spread axis
    const xs = assigned.map(z => z.cx), ys = assigned.map(z => z.cy);
    const splitAxis: 0 | 1 = (Math.max(...xs) - Math.min(...xs)) >= (Math.max(...ys) - Math.min(...ys)) ? 0 : 1;
    const sorted = [...assigned].sort((a, b) => (splitAxis === 0 ? a.cx - b.cx : a.cy - b.cy));
    // Collapse duplicate/overlapping zone labels within 10px along split axis
    const distinct: typeof sorted = [];
    for (const z of sorted) {
      const prev = distinct.at(-1);
      const center = splitAxis === 0 ? z.cx : z.cy;
      const prevCenter = prev ? (splitAxis === 0 ? prev.cx : prev.cy) : -Infinity;
      if (prev && Math.abs(center - prevCenter) < tolerance * 1.2) {
        if (z.name.length > prev.name.length) distinct[distinct.length - 1] = z;
      } else {
        distinct.push(z);
      }
    }
    if (distinct.length <= 1) {
      floors.push({ polygon, name: distinct[0]?.name ?? '' });
      return;
    }
    const [fMinX, fMinY, fMaxX, fMaxY] = polygonBounds(polygon);
    const fMin = splitAxis === 0 ? fMinX : fMinY;
    const fMax = splitAxis === 0 ? fMaxX : fMaxY;
    const cuts: number[] = [fMin];
    for (let i = 0; i < distinct.length - 1; i++) {
      const a = distinct[i], b = distinct[i + 1];
      const ca = splitAxis === 0 ? a.cx : a.cy;
      const cb = splitAxis === 0 ? b.cx : b.cy;
      const rawCut = (a.bounds[splitAxis + 2] + b.bounds[splitAxis]) / 2;
      const prevCut = cuts.at(-1)!;
      const cut = Math.max(Math.max(prevCut + 4, ca + 2), Math.min(cb - 2, rawCut));
      cuts.push(cut);
    }
    cuts.push(fMax);

    for (let i = 0; i < distinct.length; i++) {
      let piece = clipHalfPlane(polygon, splitAxis, cuts[i], true);
      piece = clipHalfPlane(piece, splitAxis, cuts[i + 1], false);
      if (piece.length >= 3 && polygonArea(piece) >= minArea * 0.25) {
        floors.push({ polygon: piece, name: distinct[i].name });
      }
    }
  });

  // Case C: Semi-open patios / balconies / rear courtyards adjacent to the structural wall network
  if (validFaces.length) {
    const faceBoxes = validFaces.map(f => polygonBounds(f.polygon));
    const houseBounds: [number, number, number, number] = [
      Math.min(...faceBoxes.map(b => b[0])),
      Math.min(...faceBoxes.map(b => b[1])),
      Math.max(...faceBoxes.map(b => b[2])),
      Math.max(...faceBoxes.map(b => b[3])),
    ];
    const patioPattern = /san|ngo|hien|ban cong|lo gia|balcon|terrace|patio|porch|yard|vuon/i;
    const fold = (s: string) => s.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '');

    rooms.forEach((room, index) => {
      if (usedZones.has(index) || !room.name.trim()) return;
      let [x0, y0, x1, y1] = room.bounds;
      if ((x1 - x0) * (y1 - y0) < minArea) return;
      // Must be adjacent/touching the main house footprint or explicitly a patio/exterior area with ink evidence
      const normalizedName = fold(room.name);
      const isPatioName = patioPattern.test(normalizedName);
      const nearHouse = x1 >= houseBounds[0] - tolerance * 4 && x0 <= houseBounds[2] + tolerance * 4 &&
        y1 >= houseBounds[1] - tolerance * 4 && y0 <= houseBounds[3] + tolerance * 4;
      if (!nearHouse) return;

      // Snap each edge to nearby network walls or structural strokes
      const pool = [...network, ...allStrokes];
      const snapEdge = (axis: 0 | 1, val: number, minSpan: number, maxSpan: number) => {
        const perp = pool.filter(s => s.axis === axis && Math.abs(s.at - val) <= tolerance * 2.5 &&
          Math.max(0, Math.min(s.end, maxSpan) - Math.max(s.start, minSpan)) >= (maxSpan - minSpan) * .35)
          .sort((a, b) => Math.abs(a.at - val) - Math.abs(b.at - val))[0];
        return perp ? perp.at : val;
      };
      x0 = snapEdge(0, x0, y0, y1);
      x1 = snapEdge(0, x1, y0, y1);
      y0 = snapEdge(1, y0, x0, x1);
      y1 = snapEdge(1, y1, x0, x1);
      // Also align top/bottom flush with main house horizontal corridor when within 2*tolerance
      if (Math.abs(y0 - houseBounds[1]) <= tolerance * 2) y0 = houseBounds[1];
      if (Math.abs(y1 - houseBounds[3]) <= tolerance * 2) y1 = houseBounds[3];

      // Trim any overlap with existing interior face boxes along the dominant shared side
      for (const [fx0, fy0, fx1, fy1] of faceBoxes) {
        const ox = Math.min(x1, fx1) - Math.max(x0, fx0);
        const oy = Math.min(y1, fy1) - Math.max(y0, fy0);
        if (ox <= 1 || oy <= 1) continue;
        if (ox <= oy) {
          if (x0 < fx0) x1 = Math.min(x1, fx0);
          else if (x1 > fx1) x0 = Math.max(x0, fx1);
        } else {
          if (y0 < fy0) y1 = Math.min(y1, fy0);
          else if (y1 > fy1) y0 = Math.max(y0, fy1);
        }
      }
      if (x1 - x0 < tolerance * 2 || y1 - y0 < tolerance * 2) return;

      // Require physical ink evidence on at least 2 boundary sides (or patio label + touching house wall)
      const hasStrokeOn = (axis: 0 | 1, atVal: number, s: number, e: number) =>
        pool.some(line => line.axis === axis && Math.abs(line.at - atVal) <= tolerance * 1.5 &&
          Math.max(0, Math.min(line.end, e) - Math.max(line.start, s)) >= (e - s) * .3);
      const sidesSupported = [
        hasStrokeOn(0, x0, y0, y1),
        hasStrokeOn(0, x1, y0, y1),
        hasStrokeOn(1, y0, x0, x1),
        hasStrokeOn(1, y1, x0, x1),
      ].filter(Boolean).length;

      if (sidesSupported >= 2 || (isPatioName && sidesSupported >= 1)) {
        floors.push({
          name: room.name,
          polygon: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
        });
      }
    });
  }

  return floors;
}
