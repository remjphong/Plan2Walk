import type { Opening, Plan, Point, Wall } from './schema';

export const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const interpolate = (a: Point, b: Point, t: number): Point =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function project(p: Point, wall: Wall) {
  const length = distance(wall.a, wall.b);
  if (length === 0) return { along: 0, across: Infinity, length };
  const x = p[0] - wall.a[0], y = p[1] - wall.a[1];
  const dx = (wall.b[0] - wall.a[0]) / length, dy = (wall.b[1] - wall.a[1]) / length;
  return { along: x * dx + y * dy, across: Math.abs(x * dy - y * dx), length };
}

export function inRoom(point: Point, polygon: Point[]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function openingInterval(opening: Opening, wall: Wall) {
  const center = opening.offset * distance(wall.a, wall.b);
  return [center - opening.width / 2, center + opening.width / 2] as const;
}

export function openingError(plan: Plan, opening: Opening) {
  const wall = plan.walls.find(item => item.id === opening.wallId);
  if (!wall) return 'Chọn một tường chủ.';
  const [start, end] = openingInterval(opening, wall);
  if (!Number.isFinite(start + end) || opening.width <= 0 || start < 0 || end > distance(wall.a, wall.b))
    return 'Khẩu độ phải nằm trọn trên tường.';
  for (const other of plan.openings) {
    if (other.id === opening.id || other.wallId !== wall.id) continue;
    const [a, b] = openingInterval(other, wall);
    if (Math.min(end, b) > Math.max(start, a)) return 'Khẩu độ chồng lên một cửa khác.';
  }
  return null;
}

export function updateOpening(plan: Plan, id: string, change: Partial<Pick<Opening, 'offset' | 'width' | 'wallId'>>) {
  const current = plan.openings.find(item => item.id === id);
  if (!current) throw new Error('Không tìm thấy cửa.');
  const revised = { ...current, ...change, reviewed: true };
  const error = openingError(plan, revised);
  if (error) throw new Error(error);
  return { ...plan, revision: plan.revision + 1,
    openings: plan.openings.map(item => item.id === id ? revised : item),
    issues: plan.issues.filter(item => item.entityId !== id) };
}

export function uniqueOpeningId(ids: ReadonlySet<string>, base: string) {
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(base + '-' + suffix)) suffix++;
  return base + '-' + suffix;
}

export function createOpening(plan: Plan, fields: Omit<Opening, 'id' | 'reviewed'>) {
  const id = uniqueOpeningId(new Set(plan.openings.map(item => item.id)), fields.type === 'door' ? 'D' : 'C');
  const opening: Opening = { ...fields, id, reviewed: true };
  const error = openingError(plan, opening);
  if (error) throw new Error(error);
  return { ...plan, revision: plan.revision + 1, openings: [...plan.openings, opening] };
}

export function removeOpening(plan: Plan, id: string) {
  if (!plan.openings.some(item => item.id === id)) throw new Error('Không tìm thấy cửa.');
  return { ...plan, revision: plan.revision + 1, openings: plan.openings.filter(item => item.id !== id),
    issues: plan.issues.filter(item => item.entityId !== id) };
}

export function calibrate(plan: Plan, a: Point, b: Point, meters: number): Plan {
  const span = distance(a, b);
  const validPoint = ([x, y]: Point) => x >= 0 && y >= 0 && x <= plan.width && y <= plan.height;
  if (span < 2 || !validPoint(a) || !validPoint(b) || !Number.isFinite(meters) || meters <= 0)
    throw new Error('Chọn hai mốc khác nhau và nhập khoảng cách lớn hơn 0.');
  return { ...plan, revision: plan.revision + 1,
    scale: { status: 'verified', a, b, meters, metersPerPixel: meters / span } };
}

export type WallPiece = { wall: Wall; start: number; end: number; bottom: number; top: number };

export function buildGeometry(plan: Plan) {
  const unit = plan.scale.status === 'verified' ? plan.scale.metersPerPixel : 10 / Math.max(plan.width, plan.height);
  const radius = 0.16 / unit;
  const pieces: WallPiece[] = [];
  const links: { wall: Wall; start: number; end: number }[] = [];
  const issues = [...plan.issues];
  for (const wall of plan.walls) {
    const length = distance(wall.a, wall.b);
    if (!length) continue;
    const valid = plan.openings.filter(opening => opening.wallId === wall.id && !openingError(plan, opening));
    const cuts = valid.map(opening => ({ opening, interval: openingInterval(opening, wall) }))
      .sort((a, b) => a.interval[0] - b.interval[0]);
    const add = (start: number, end: number, bottom: number, top: number) => {
      if (end > start) pieces.push({ wall, start, end, bottom, top });
    };
    let cursor = 0;
    for (const { opening, interval: [start, end] } of cuts) {
      add(cursor, start, 0, 2.7);
      add(start, end, opening.type === 'door' ? 2.1 : 2.22, 2.7);
      if (opening.type === 'window') add(start, end, 0, 1.05);
      else {
        const center = interpolate(wall.a, wall.b, (start + end) / (2 * length));
        const delta = wall.thickness / 2 + 2;
        const normal: Point = [(wall.a[1] - wall.b[1]) * delta / length, (wall.b[0] - wall.a[0]) * delta / length];
        const left = plan.rooms.find(room => inRoom([center[0] + normal[0], center[1] + normal[1]], room.polygon));
        const right = plan.rooms.find(room => inRoom([center[0] - normal[0], center[1] - normal[1]], room.polygon));
        if (left && right && left.id !== right.id) links.push({ wall, start, end });
      }
      cursor = end;
    }
    add(cursor, length, 0, 2.7);
  }
  for (const opening of plan.openings) {
    const error = openingError(plan, opening);
    if (error) issues.push({ code: 'INVALID_OPENING', message: error, entityId: opening.id });
  }
  function walkable(p: Point) {
    const onFloor = plan.rooms.some(room => inRoom(p, room.polygon));
    const inThreshold = links.some(({ wall, start, end }) => {
      const { along, across } = project(p, wall);
      return along >= start + radius && along <= end - radius && across <= wall.thickness / 2 + 2;
    });
    if (!onFloor && !inThreshold) return false;
    return !pieces.some(({ wall, start, end, bottom }) => {
      if (bottom >= 1.8) return false;
      const { along, across } = project(p, wall);
      const pastEnd = Math.max(start - along, along - end, 0);
      const pastFace = Math.max(across - wall.thickness / 2, 0);
      return Math.hypot(pastEnd, pastFace) < radius;
    });
  }
  return { unit, pieces, issues, walkable };
}
