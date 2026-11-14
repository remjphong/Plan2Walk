import type { Candidates, Issue, Point } from './schema';
import { boundedFaces, compileFloorZones } from './raster-faces';
import { inRoom } from './geometry';

type Axis = 0 | 1;
export type RasterSegment = { axis: Axis; at: number; start: number; end: number; thickness: number };
type Segment = RasterSegment;
type TaggedSegment = Segment & { isComb?: boolean; isDouble?: boolean };
type GapSegment = Segment & { isCrossBarrier?: boolean };
type Raster = { width: number; height: number; data: Uint8Array };
type Transform = (pixel: number) => number;

const identity: Transform = pixel => pixel;
const length = (line: Segment) => line.end - line.start;
const intersection = (a: Segment, b: Segment) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
const segment = (a: Point, b: Point, axis: Axis, thickness: number): Segment => ({
  axis, at: (a[axis] + b[axis]) / 2, start: Math.min(a[1 - axis], b[1 - axis]),
  end: Math.max(a[1 - axis], b[1 - axis]), thickness,
});
const perpendicular = (line: Segment, other: Segment, margin: number) =>
  line.axis !== other.axis && line.at >= other.start - margin && line.at <= other.end + margin;

function detectStairCombs(strokes: TaggedSegment[], shortSide: number) {
  const combs: { bounds: [number, number, number, number]; axis: Axis }[] = [];
  const minLen = Math.max(8, shortSide * .03);
  const maxLen = shortSide * .28;
  for (const axis of [0, 1] as const) {
    const candidates = strokes
      .filter(s => s.axis === axis && s.thickness <= 3 && length(s) >= minLen && length(s) <= maxLen)
      .sort((a, b) => a.at - b.at);
    const used = new Set<TaggedSegment>();
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(candidates[i])) continue;
      const group: TaggedSegment[] = [candidates[i]];
      for (let j = i + 1; j < candidates.length; j++) {
        const last = group.at(-1)!;
        const curr = candidates[j];
        const pitch = curr.at - last.at;
        if (pitch > 16) break;
        if (pitch < 2.5) continue;
        const ov = intersection(last, curr);
        if (ov >= .65 * Math.min(length(last), length(curr)) &&
            Math.max(length(last), length(curr)) / Math.min(length(last), length(curr)) <= 1.8) {
          group.push(curr);
        }
      }
      if (group.length < 5) continue;
      const pitches = group.slice(1).map((s, idx) => s.at - group[idx].at).sort((a, b) => a - b);
      const median = pitches[Math.floor(pitches.length / 2)];
      if (median < 2.5 || pitches.some(p => p > median * 1.9 || p < median * 0.4)) continue;
      group.forEach(s => { s.isComb = true; used.add(s); });
      const minAt = Math.min(...group.map(s => s.at - s.thickness / 2));
      const maxAt = Math.max(...group.map(s => s.at + s.thickness / 2));
      const minPos = Math.min(...group.map(s => s.start));
      const maxPos = Math.max(...group.map(s => s.end));
      combs.push({
        axis,
        bounds: axis === 0 ? [minAt, minPos, maxAt, maxPos] : [minPos, minAt, maxPos, maxAt],
      });
    }
  }
  return combs;
}

function mergeDoubleLines(strokes: TaggedSegment[], shortSide: number): TaggedSegment[] {
  const maxSep = Math.max(6, Math.round(shortSide * .032));
  const minLen = Math.max(10, Math.round(shortSide * .06));
  const result: TaggedSegment[] = [];
  for (const axis of [0, 1] as const) {
    const thin = strokes
      .filter(s => s.axis === axis && !s.isComb && s.thickness <= 3 && length(s) >= minLen)
      .sort((a, b) => a.at - b.at);
    const thick = strokes.filter(s => s.axis === axis && !s.isComb && s.thickness > 3);
    const paired = new Set<TaggedSegment>();
    for (let i = 0; i < thin.length; i++) {
      const a = thin[i];
      if (paired.has(a)) continue;
      let match: TaggedSegment | undefined;
      for (let j = i + 1; j < thin.length; j++) {
        const b = thin[j];
        if (paired.has(b)) continue;
        const sep = b.at - a.at;
        if (sep > maxSep) break;
        if (sep < 2) continue;
        const ov = intersection(a, b);
        if (ov < .55 * Math.min(length(a), length(b))) continue;
        // Reject dimension/grid ladders where a 3rd parallel line sits at a similar spacing
        const hasLadderNeighbor = thin.some(c => c !== a && c !== b &&
          (Math.abs((c.at - b.at) - sep) <= 2 || Math.abs((a.at - c.at) - sep) <= 2) &&
          intersection(a, c) >= .4 * Math.min(length(a), length(c)));
        if (hasLadderNeighbor) continue;
        match = b;
        break;
      }
      if (match) {
        paired.add(a);
        paired.add(match);
        const sep = match.at - a.at;
        result.push({
          axis,
          at: (a.at + match.at) / 2,
          start: Math.min(a.start, match.start),
          end: Math.max(a.end, match.end),
          thickness: Math.max(2, Math.round(sep + (a.thickness + match.thickness) / 2)),
          isDouble: true,
        });
      }
    }
    for (const s of thin) if (!paired.has(s)) result.push(s);
    result.push(...thick);
  }
  return result;
}

function wallNetwork(seeds: Segment[], strokes: Segment[][], tolerance: number, shortSide: number, features: Candidates['features'], width: number, height: number) {
  const network: Segment[] = [];
  function merge(line: Segment) {
    const match = network.find(wall => wall.axis === line.axis && Math.abs(wall.at - line.at) <=
      Math.max(1, Math.min(wall.thickness, line.thickness) * .5) && intersection(wall, line) > 1);
    if (match) {
      match.start = Math.min(match.start, line.start);
      match.end = Math.max(match.end, line.end);
      match.thickness = Math.max(match.thickness, line.thickness);
    } else network.push({ ...line });
  }
  seeds.sort((a, b) => length(b) - length(a)).forEach(merge);
  const scan = strokes.flat().sort((a, b) => length(b) - length(a));
  const structuralWidth = Math.max(2, Math.round(shortSide * .007));
  const thicknesses = network.map(line => line.thickness).sort((a, b) => a - b);
  const typical = thicknesses[Math.floor(thicknesses.length / 2)] ?? structuralWidth;
  const featureBoxes = (features ?? [])
    .filter(f => f.type === 'sofa' || f.type === 'bed' || f.type === 'table')
    .map(f => [f.bounds[0] * width / 1000, f.bounds[1] * height / 1000, f.bounds[2] * width / 1000, f.bounds[3] * height / 1000] as const);
  const insideFurniture = (line: Segment) => {
    const mid: Point = line.axis === 0 ? [line.at, (line.start + line.end) / 2] : [(line.start + line.end) / 2, line.at];
    return featureBoxes.some(([x0, y0, x1, y1]) => mid[0] >= x0 && mid[0] <= x1 && mid[1] >= y0 && mid[1] <= y1);
  };
  for (const line of scan) {
    const isStructural = line.thickness >= Math.max(2, Math.min(structuralWidth, typical * .6));
    if (!isStructural || length(line) < Math.max(tolerance * 2.2, line.thickness * 3)) continue;
    const along = network.filter(other => perpendicular(line, other, Math.max(.75 * line.thickness, 2)));
    const junctionTolerance = Math.max(2.5, Math.min(tolerance * 1.1, line.thickness + 1.5));
    const joins = (end: number) => along.filter(other => Math.abs(other.at - end) <= junctionTolerance)
      .sort((a, b) => Math.abs(a.at - end) - Math.abs(b.at - end))[0];
    const a = joins(line.start), b = joins(line.end);
    if (a && b && a !== b) {
      merge({ ...line, start: a.at, end: b.at });
    } else if ((a || b) && line.thickness >= structuralWidth && length(line) >= shortSide * .10 && !insideFurniture(line)) {
      merge({
        ...line,
        start: a ? a.at : line.start,
        end: b ? b.at : line.end,
      });
    }
  }
  // Reconnect endpoints separated by half the width of the crossing wall.
  for (const line of network) {
    const crossing = network.filter(other => perpendicular(line, other, line.thickness / 2 + 1.5));
    for (const key of ['start', 'end'] as const) {
      const other = crossing.filter(wall => Math.abs(wall.at - line[key]) <= wall.thickness / 2 + 1.5)
        .sort((a, b) => Math.abs(a.at - line[key]) - Math.abs(b.at - line[key]))[0];
      if (other) line[key] = other.at;
    }
  }
  return network.filter(wall => length(wall) > 0);
}

function outlineSeeds(strokes: TaggedSegment[][], zones: Candidates['rooms'], width: number, height: number, tolerance: number) {
  const shortSide = Math.min(width, height);
  const structuralWidth = Math.max(2, Math.round(shortSide * .007));
  const pool = strokes.flat().filter(line => line.isDouble || line.thickness >= structuralWidth);
  const lines = wallNetwork(pool, [], tolerance, shortSide, [], width, height);
  const minArea = width * height * .009;
  const outlines = boundedFaces(lines).filter(({ area }) => area >= minArea);
  const labelPoints = zones.map(({ bounds: [x, y, right, bottom] }): Point =>
    [(x + right) * width / 2000, (y + bottom) * height / 2000]);
  const selected = outlines.filter(({ polygon, area }) => area >= width * height * .11 ||
    labelPoints.some(point => inRoom(point, polygon)));
  return lines.filter(line => selected.some(({ polygon }) => polygon.some((point, i) => {
    const next = polygon[(i + 1) % polygon.length];
    return point[line.axis] === line.at && next[line.axis] === line.at &&
      Math.min(point[1 - line.axis], next[1 - line.axis]) >= line.start &&
      Math.max(point[1 - line.axis], next[1 - line.axis]) <= line.end;
  })));
}

function findGap(
  lines: Segment[],
  crossLines: Segment[],
  axis: Axis,
  at: number,
  position: number,
  span: number,
  tolerance: number,
  shortSide: number,
) {
  const minThickness = shortSide < 320 ? 1 : 2;
  const matches: GapSegment[] = lines.filter(line =>
    line.axis === axis && Math.abs(line.at - at) <= tolerance && line.thickness >= minThickness);
  const crossBarriers: GapSegment[] = crossLines
    .filter(cross => cross.axis === 1 - axis && cross.thickness >= minThickness &&
      cross.start - tolerance <= at && cross.end + tolerance >= at)
    .map(cross => ({
      axis,
      at,
      start: cross.at - cross.thickness / 2,
      end: cross.at + cross.thickness / 2,
      thickness: cross.thickness,
      isCrossBarrier: true,
    }));
  const pool = [...matches, ...crossBarriers];
  const gaps = pool.flatMap(before => pool.flatMap(after => {
    if (before === after) return [];
    if (before.isCrossBarrier && after.isCrossBarrier) {
      // Allow two perpendicular walls to bracket a full-width corridor doorway only when span closely matches
      const rawSpan = after.start - before.end;
      if (rawSpan < span * .5 || rawSpan > span + tolerance * 1.5) return [];
    }
    const from = before.isCrossBarrier ? before.end : before.end + 1;
    const to = after.isCrossBarrier ? after.start : after.start;
    const realRef = !before.isCrossBarrier ? before : !after.isCrossBarrier ? after : undefined;
    if (!before.isCrossBarrier && !after.isCrossBarrier &&
      Math.abs(before.at - after.at) > Math.max(1.5, Math.min(before.thickness, after.thickness) * .65)) return [];
    if (from > position + tolerance * .5 || to < position - tolerance * .5) return [];
    if (to - from < span * .35 || to - from > span + tolerance * 2.5) return [];
    const center = (from + to) / 2;
    if (Math.abs(center - position) > Math.max(tolerance * 1.2, span * .45)) return [];
    const refThickness = realRef ? realRef.thickness : minThickness;
    if (matches.some(line => Math.abs(line.at - (realRef ? realRef.at : at)) <= Math.max(2, refThickness * .6) &&
      line.start < center && line.end > center && line.thickness >= refThickness * .6)) return [];
    const wallAt = realRef ? realRef.at : at;
    const penalty = (before.isCrossBarrier || after.isCrossBarrier ? 0.5 : 0);
    return [{ before, after, center, span: to - from, wallAt, wallThickness: refThickness, penalty }];
  }));
  return gaps.sort((a, b) =>
    (Math.abs(a.wallAt - at) + Math.abs(a.center - position) + a.penalty) -
    (Math.abs(b.wallAt - at) + Math.abs(b.center - position) + b.penalty))[0];
}

function extractRawStrokes(image: Raster, axis: Axis, shortSide: number): TaggedSegment[] {
  const dimensions = [image.width, image.height];
  const across = dimensions[axis], along = dimensions[1 - axis];
  const gap = Math.max(2, Math.round(shortSide * .008));
  const minRun = Math.max(6, Math.round(shortSide * .02));
  const margin = Math.max(2, Math.floor(shortSide * .012));
  const tracks: (TaggedSegment & { last: number; samples: number })[] = [];
  let active: typeof tracks = [];
  for (let at = margin; at < across - margin; at++) {
    active = active.filter(track => at - track.last <= 1);
    let start = -1, end = -1;
    function save() {
      if (end - start < minRun) return;
      const run = { axis, at, start, end, thickness: 1 };
      const same = active.find(track => track.last < at && intersection(track, run) >= .7 * Math.min(length(track), length(run)));
      if (same) {
        same.at = (same.at * same.samples + at) / ++same.samples;
        if (length(run) > length(same)) { same.start = start; same.end = end; }
        same.last = at;
        same.thickness++;
      } else {
        const track = { ...run, last: at, samples: 1 };
        tracks.push(track);
        active.push(track);
      }
    }
    for (let pos = margin; pos < along - margin; pos++) {
      const offset = 4 * (axis === 0 ? pos * image.width + at : at * image.width + pos);
      const r = image.data[offset], g = image.data[offset + 1], b = image.data[offset + 2], alpha = image.data[offset + 3];
      const luminance = .2126 * r + .7152 * g + .0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const isInk = alpha >= 180 && (luminance <= 154 || (luminance <= 186 && chroma <= 22 && shortSide < 340));
      if (!isInk) continue;
      if (end < 0 || pos - end > gap) {
        save();
        start = pos;
      }
      end = pos;
    }
    save();
  }
  return tracks.filter(s => !(length(s) >= along * .94 && (s.at <= 4 || s.at >= across - 5)));
}

// Register each axis against pairs of visible strokes. A displacement found on only
// one wall is ambiguous and cannot stretch the entire drawing.
function registerAxis(walls: Segment[], strokes: Segment[], crossStrokes: Segment[], size: number, tolerance: number): Transform {
  const structural = crossStrokes.filter(stroke => stroke.thickness >= Math.max(2, tolerance * .45));
  const firstSide = structural.find(stroke => length(stroke) >= size * .62);
  const oppositeSide = firstSide && structural.find(stroke => stroke !== firstSide && length(stroke) >= size * .62 &&
    intersection(firstSide, stroke) >= size * .55 && Math.abs(firstSide.at - stroke.at) >= tolerance * 3);
  const limits = walls.reduce(([min, max], wall) => [Math.min(min, wall.at), Math.max(max, wall.at)], [Infinity, -Infinity]);
  const plausibleOutline = (transform: Transform) => {
    if (!firstSide || !oppositeSide || !walls.length) return true;
    const [min, max] = limits;
    const limit = Math.max(firstSide.end, oppositeSide.end), start = Math.min(firstSide.start, oppositeSide.start);
    return transform(min) <= start + size * .1 && transform(max) >= limit - size * .1;
  };
  const distinct = walls.filter((wall, i) => walls.findIndex(other => Math.abs(other.at - wall.at) < tolerance) === i)
    .sort((a, b) => length(b) - length(a)).slice(0, 14);
  const anchors = distinct.map(wall => ({ wall, matches: strokes
    .filter(stroke => stroke.thickness >= Math.max(2, tolerance * .45) &&
      intersection(wall, stroke) >= .42 * Math.min(length(wall), length(stroke)) && length(stroke) > length(wall) * .26)
    .slice(0, 12) }));
  const score = (transform: Transform) => anchors.reduce((sum, { wall, matches }) => {
    const support = Math.max(0, ...matches.map(stroke => {
      const proximity = 1 - Math.abs(transform(wall.at) - stroke.at) / (tolerance * 1.5);
      return proximity * (.4 + .6 * intersection(wall, stroke) / length(wall));
    }));
    return sum + support * Math.sqrt(length(wall));
  }, 0);
  const identityFitsOutline = plausibleOutline(identity);
  let best = identity, bestScore = score(identity) + .38 * Math.sqrt(size);
  for (const [i, first] of anchors.entries()) for (const second of anchors.slice(i + 1)) {
    const span = second.wall.at - first.wall.at;
    if (Math.abs(span) < size * .12) continue;
    for (const a of first.matches) for (const b of second.matches) {
      const scale = (b.at - a.at) / span;
      if (scale < .33 || scale > 1.65 || Math.abs(a.at - first.wall.at) > size * .38) continue;
      if (a.thickness < 2 || b.thickness < 2) continue;
      const transform = (value: number) => a.at + (value - first.wall.at) * scale;
      if (!plausibleOutline(transform) && identityFitsOutline) continue;
      const candidateScore = score(transform) - (Math.abs(1 - scale) * .55 + Math.abs(transform(0)) / size) * Math.sqrt(size);
      if (candidateScore > bestScore) { bestScore = candidateScore; best = transform; }
    }
  }
  return best;
}

export function reconcileRasterCandidates(input: Candidates, image: Raster) {
  const dimensions = [image.width, image.height];
  const shortSide = Math.min(...dimensions);
  const tolerance = Math.max(3, shortSide * .017);
  const pixels = ([x, y]: Point): Point => [x * image.width / 1000, y * image.height / 1000];
  const normalized = ([x, y]: Point): Point => [x * 1000 / image.width, y * 1000 / image.height];

  const rawStrokes = ([0, 1] as const).flatMap(axis => extractRawStrokes(image, axis, shortSide));
  const stairCombs = detectStairCombs(rawStrokes, shortSide);
  const combined = mergeDoubleLines(rawStrokes, shortSide);

  // Determine building structural envelope to reject outer dimension chains and sheet captions
  const wallBand = Math.max(2, Math.round(shortSide * .007));
  const strong = combined.filter(s => !s.isComb && (s.isDouble || (s.thickness >= wallBand && length(s) >= shortSide * .05)));
  const strongW = strong.filter(s => s.axis === 0);
  const strongH = strong.filter(s => s.axis === 1);
  let env: [number, number, number, number] | undefined;
  if (strongW.length >= 2 && strongH.length >= 2) {
    const xs = [...strongW.map(s => s.at), ...strongH.flatMap(s => [s.start, s.end])];
    const ys = [...strongH.map(s => s.at), ...strongW.flatMap(s => [s.start, s.end])];
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    if (maxX - minX >= image.width * .2 && maxY - minY >= image.height * .2) {
      env = [minX - tolerance * 2, minY - tolerance * 2, maxX + tolerance * 2, maxY + tolerance * 2];
    }
  }
  const insideEnvelope = (s: TaggedSegment) => {
    if (!env) return true;
    const x0 = s.axis === 0 ? s.at : s.start, x1 = s.axis === 0 ? s.at : s.end;
    const y0 = s.axis === 0 ? s.start : s.at, y1 = s.axis === 0 ? s.end : s.at;
    return x1 >= env[0] && x0 <= env[2] && y1 >= env[1] && y0 <= env[3];
  };
  const minKeepThickness = shortSide < 320 ? 1 : Math.max(2, Math.round(shortSide * .006));
  const strokes: [TaggedSegment[], TaggedSegment[]] = [0, 1].map(axis =>
    combined
      .filter(s => s.axis === axis && !s.isComb && (s.isDouble || (s.thickness >= minKeepThickness && insideEnvelope(s))))
      .sort((a, b) => ((b.isDouble ? 2 : 1) * b.thickness * Math.sqrt(length(b))) - ((a.isDouble ? 2 : 1) * a.thickness * Math.sqrt(length(a))))
      .slice(0, 180),
  ) as [TaggedSegment[], TaggedSegment[]];

  const proposed = (input.walls ?? []).flatMap(wall => {
    const a = pixels(wall.a), b = pixels(wall.b);
    const axis = Math.abs(a[0] - b[0]) < Math.abs(a[1] - b[1]) ? 0 : 1;
    const line = segment(a, b, axis, 0);
    return length(line) >= 6 && Math.abs(a[axis] - b[axis]) <= Math.max(2, length(line) * .07) ? [line] : [];
  });
  const transforms = ([0, 1] as const).map(axis => registerAxis(proposed.filter(line => line.axis === axis),
    strokes[axis], strokes[1 - axis], dimensions[axis], tolerance));
  const transfer = (point: Point): Point => [transforms[0](point[0]), transforms[1](point[1])];
  const issues: Issue[] = [];

  // Match every collinear raster pier along each proposed AI wall (never drop shorter split piers!)
  const matched: TaggedSegment[] = [];
  let matchedWallsCount = 0;
  for (const line of proposed) {
    const across = transforms[line.axis], along = transforms[1 - line.axis];
    const registered = { ...line, at: across(line.at), start: along(line.start), end: along(line.end) };
    const candidates = strokes[line.axis].filter(stroke =>
      Math.abs(stroke.at - registered.at) <= tolerance * 1.7 &&
      intersection(stroke, registered) >= Math.max(6, Math.min(length(stroke) * .45, length(registered) * .12)));
    if (!candidates.length) continue;
    candidates.sort((a, b) => Math.abs(a.at - registered.at) - Math.abs(b.at - registered.at));
    const anchorAt = candidates[0].at;
    const aligned = candidates.filter(c => Math.abs(c.at - anchorAt) <= Math.max(2, tolerance * .8));
    const totalCover = aligned.reduce((sum, s) => sum + intersection(s, registered), 0);
    if (totalCover < Math.max(7, length(registered) * .16)) continue;
    matchedWallsCount++;
    for (const pier of aligned) {
      matched.push({
        ...pier,
        start: Math.max(pier.start, registered.start - tolerance),
        end: Math.min(pier.end, registered.end + tolerance),
      });
    }
  }

  const outlined = outlineSeeds(strokes, input.rooms, image.width, image.height, tolerance);
  const supported: Segment[] = [...matched, ...outlined];
  const allCrossPool = [...strokes[0], ...strokes[1]];

  const openingCandidates = input.openings.flatMap(opening => {
    const [x, y] = pixels([opening.x, opening.y]);
    const axis: Axis = opening.axis === 'horizontal' ? 1 : 0;
    const point: Point = [x, y], registered = transfer(point);
    const along = transforms[1 - axis];
    const originalSpan = opening.span * dimensions[1 - axis] / 1000;
    const crossPool = [...supported.filter(s => s.axis === 1 - axis), ...strokes[1 - axis]];
    const gap = findGap(strokes[axis], crossPool, axis, point[axis], point[1 - axis], originalSpan, tolerance * 1.6, shortSide) ??
      findGap(strokes[axis], crossPool, axis, registered[axis], registered[1 - axis], along(originalSpan) - along(0), tolerance * 1.6, shortSide);
    if (!gap) return [];
    const overlapsWall = supported.some(line => line.axis === axis && Math.abs(line.at - gap.wallAt) <=
      Math.max(2, gap.wallThickness * .7) &&
      ((!gap.before.isCrossBarrier && intersection(line, gap.before) > 0) ||
       (!gap.after.isCrossBarrier && intersection(line, gap.after) > 0)));
    const touchesSupported = (seg: GapSegment, endpoint: number) =>
      seg.isCrossBarrier
        ? supported.some(w => w.axis === 1 - axis && Math.abs(w.at - seg.start - seg.thickness / 2) <= tolerance &&
            gap.wallAt >= w.start - tolerance && gap.wallAt <= w.end + tolerance) ||
          allCrossPool.some(w => w.axis === 1 - axis && Math.abs(w.at - (seg.start + seg.thickness / 2)) <= tolerance &&
            gap.wallAt >= w.start - tolerance && gap.wallAt <= w.end + tolerance)
        : supported.some(wall => perpendicular(seg, wall, wall.thickness / 2 + 2.5) &&
            Math.abs(endpoint - wall.at) <= wall.thickness / 2 + 2.5);
    const beforeOk = overlapsWall || touchesSupported(gap.before, gap.before.start);
    const afterOk = overlapsWall || touchesSupported(gap.after, gap.after.end);
    if (!beforeOk || !afterOk) return [];

    // Bridge gap strictly up to the crosswall centerline when a side is a T-junction crosswall
    const bridgeStart = gap.before.isCrossBarrier ? (gap.before.start + gap.before.end) / 2 : gap.before.start;
    const bridgeEnd = gap.after.isCrossBarrier ? (gap.after.start + gap.after.end) / 2 : gap.after.end;
    supported.push({
      axis,
      at: gap.wallAt,
      start: Math.min(bridgeStart, bridgeEnd),
      end: Math.max(bridgeStart, bridgeEnd),
      thickness: gap.wallThickness,
    });
    const [nx, ny] = normalized(axis === 0 ? [gap.wallAt, gap.center] : [gap.center, gap.wallAt]);
    return [{ ...opening, x: nx, y: ny, span: gap.span * 1000 / dimensions[1 - axis] }];
  });

  if (openingCandidates.length < input.openings.length) issues.push({
    code: 'OPENING_WITHOUT_GAP', message: 'Một số cửa đề xuất chưa có khe hoặc nét đủ rõ. Kiểm tra bản gốc trước khi thêm cửa.',
  });

  const network = wallNetwork(supported, strokes, tolerance, shortSide, input.features, image.width, image.height);
  const walls = network.map(line => {
    const point = (p: number): Point => normalized(line.axis === 0 ? [line.at, p] : [p, line.at]);
    return {
      a: point(line.start), b: point(line.end),
      thicknessX: line.axis === 0 ? line.thickness * 1000 / image.width : 0,
      thicknessY: line.axis === 1 ? line.thickness * 1000 / image.height : 0,
    };
  });

  if (network.length < 2 || !network.some(line => line.axis === 0) || !network.some(line => line.axis === 1)) {
    issues.push({ code: 'NO_RASTER_WALL_EVIDENCE', message: 'Chưa tìm đủ nét tường có thể kiểm tra trên ảnh. Chọn vùng rõ hơn.' });
    return { candidates: { ...input, rooms: [], walls: [], openings: [], features: [] }, issues };
  }
  if (matchedWallsCount < (input.walls?.length ?? 0)) issues.push({
    code: 'UNVERIFIED_WALLS', message: 'Một số vách đề xuất không có đủ nét trên bản gốc và đã được bỏ khỏi bản nháp.',
  });

  const moveBounds = ([left, top, right, bottom]: [number, number, number, number], room = false) => {
    const a = transfer(pixels([left, top])), b = transfer(pixels([right, bottom]));
    if (room) for (const axis of [0, 1] as const) {
      const perpendicularAxis = axis === 0 ? 1 : 0;
      const side = { axis, at: 0, start: a[perpendicularAxis], end: b[perpendicularAxis], thickness: 0 };
      for (const point of [a, b]) {
        const neighbor = network.filter(wall => wall.axis === axis && Math.abs(wall.at - point[axis]) <= tolerance * 1.7 &&
          intersection(wall, side) >= length(side) * .50)
          .sort((m, n) => Math.abs(m.at - point[axis]) - Math.abs(n.at - point[axis]))[0];
        if (neighbor) point[axis] = neighbor.at;
      }
    }
    const limit = (value: number) => Math.min(1000, Math.max(0, value));
    return [...normalized(a).map(limit), ...normalized(b).map(limit)] as [number, number, number, number];
  };

  const rooms = input.rooms.map(room => ({ ...room, bounds: moveBounds(room.bounds, true) }));
  const zones = rooms.map(room => {
    const [a, b, c, d] = room.bounds;
    return { name: room.name, bounds: [...pixels([a, b]), ...pixels([c, d])] as [number, number, number, number] };
  });
  const faces = boundedFaces(network);
  const floors = compileFloorZones(faces, zones, network, strokes.flat(), Math.max(60, tolerance * tolerance * 3), tolerance);
  if (!floors.length || zones.some(({ name, bounds: [x, y, right, bottom] }) =>
    name.trim() && !floors.some(({ polygon }) => inRoom([(x + right) / 2, (y + bottom) / 2], polygon)))) issues.push({
    code: 'INCOMPLETE_FLOOR_EVIDENCE',
    message: 'Một số vùng sàn chưa có đường bao khép kín trên bản gốc. Bản dựng cần được đối chiếu trước khi đi thử.',
  });

  // Ground stair features onto verified raster tread combs when inside the structural envelope
  const features = input.features?.map(feature => {
    const moved = moveBounds(feature.bounds);
    if (feature.type === 'stair' && stairCombs.length) {
      const [fx0, fy0] = pixels([moved[0], moved[1]]), [fx1, fy1] = pixels([moved[2], moved[3]]);
      const fcx = (fx0 + fx1) / 2, fcy = (fy0 + fy1) / 2;
      const nearby = stairCombs
        .map(comb => {
          const [cx0, cy0, cx1, cy1] = comb.bounds;
          const dist = Math.hypot((cx0 + cx1) / 2 - fcx, (cy0 + cy1) / 2 - fcy);
          const overlap = Math.max(0, Math.min(fx1, cx1) - Math.max(fx0, cx0)) * Math.max(0, Math.min(fy1, cy1) - Math.max(fy0, cy0));
          return { comb, dist, overlap };
        })
        .filter(item => (!env || (item.comb.bounds[0] >= env[0] && item.comb.bounds[2] <= env[2] &&
          item.comb.bounds[1] >= env[1] && item.comb.bounds[3] <= env[3])) && (item.overlap > 0 || item.dist <= shortSide * .22))
        .sort((a, b) => (b.overlap > 0 ? 1 : 0) - (a.overlap > 0 ? 1 : 0) || a.dist - b.dist)[0];
      if (nearby) {
        const [cx0, cy0, cx1, cy1] = nearby.comb.bounds;
        return { ...feature, bounds: [...normalized([cx0, cy0]), ...normalized([cx1, cy1])] as [number, number, number, number] };
      }
    }
    return { ...feature, bounds: moved };
  });

  return {
    candidates: {
      ...input, walls,
      rooms,
      features,
      openings: openingCandidates,
    },
    issues,
    floors: floors.length ? floors : undefined,
  };
}
