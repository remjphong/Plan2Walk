import { distance, project, openingError, uniqueOpeningId } from './geometry';
import type { Candidates, Plan, Point } from './schema';

type Bounds = [number, number, number, number];

export function hasSeparatePlanGroups(rooms: Candidates['rooms']) {
  if (rooms.length < 4) return false;
  return ([0, 1] as const).some(axis => {
    const intervals = rooms.map(({ bounds }) => ({ start: bounds[axis], end: bounds[axis + 2] }))
      .sort((a, b) => a.start - b.start);
    let end = intervals[0].end;
    return intervals.slice(1).some(({ start, end: nextEnd }, index) => {
      const count = index + 1;
      const gap = count >= 2 && intervals.length - count >= 2 && start - end >= 90;
      end = Math.max(end, nextEnd);
      return gap;
    });
  });
}

function snapLines(values: number[], tolerance: number) {
  const snapped = new Map<number, number>();
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end] - sorted[start] <= tolerance) end++;
    const target = (sorted[start] + sorted[end - 1]) / 2;
    for (let index = start; index < end; index++) snapped.set(sorted[index], target);
    start = end;
  }
  return snapped;
}

export function compileCandidates(input: Pick<Candidates, 'rooms' | 'openings' | 'walls' | 'features'> & {
  passages?: Plan['passages']; width: number; height: number; rejectedFeatures?: number; floors?: { name: string; polygon: Point[]; zoneId?: string }[];
}): Plan {
  const { width, height } = input;
  const plan: Plan = { schemaVersion: 1, revision: 0, width, height, rooms: [], walls: [], openings: [], issues: [], scale: { status: 'unknown' } };
  plan.passages = input.passages;
  const tolerance = Math.min(width, height) * 0.012;
  const pointFromSource = ([x, y]: Point): Point => [x * width / 1000, y * height / 1000];
  const wallId = () => 'W' + String(plan.walls.length + 1).padStart(2, '0');
  const boxes = input.rooms.map(room => {
    const [x0, y0, x1, y1] = room.bounds;
    return { name: room.name, bounds: [x0 * width / 1000, y0 * height / 1000, x1 * width / 1000, y1 * height / 1000] as Bounds };
  });
  const xs = snapLines(boxes.flatMap(({ bounds: [a, , b] }) => [a, b]), tolerance);
  const ys = snapLines(boxes.flatMap(({ bounds: [, a, , b] }) => [a, b]), tolerance);
  const accepted: Bounds[] = [];
  const segments = new Map<string, { axis: 'x' | 'y'; at: number; spans: [number, number][] }>();
  function edge(axis: 'x' | 'y', at: number, a: number, b: number) {
    const key = axis + ':' + at;
    const line = segments.get(key) ?? { axis, at, spans: [] };
    line.spans.push([a, b]);
    segments.set(key, line);
  }
  if (input.floors === undefined) {
    for (const { name, bounds } of boxes) {
      const [a, b, c, d] = bounds;
      const x0 = xs.get(a)!, y0 = ys.get(b)!, x1 = xs.get(c)!, y1 = ys.get(d)!;
      if (x1 - x0 < 2 * tolerance || y1 - y0 < 2 * tolerance || accepted.some(([u, v, r, s]) =>
        Math.min(x1, r) > Math.max(x0, u) && Math.min(y1, s) > Math.max(y0, v))) {
        plan.issues.push({ code: 'ROOM_CONFLICT', message: 'Có vùng phòng chồng nhau hoặc quá nhỏ. Đối chiếu vùng đã chọn.' });
        continue;
      }
      accepted.push([x0, y0, x1, y1]);
      const id = 'R' + accepted.length;
      const label = name.trim();
      const dimensionLabel = /^\d[\d.,\s'’"′″-]*(?:mm|cm|m|ft|in)?\s*[×x]\s*\d[\d.,\s'’"′″-]*(?:mm|cm|m|ft|in)?$/i.test(label);
      plan.rooms.push({ id, name: label && !dimensionLabel ? label : 'Phòng ' + accepted.length,
        polygon: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] });
      if (!input.walls) {
        edge('x', y0, x0, x1); edge('x', y1, x0, x1);
        edge('y', x0, y0, y1); edge('y', x1, y0, y1);
      }
    }
  }
  if (input.floors !== undefined) {
    plan.rooms = input.floors.map(({ name, polygon, zoneId }, index) => ({
      id: 'R' + (index + 1), name: name.trim() || 'Khu ' + (index + 1), polygon, zoneId,
    }));
  }
  const labels = new Map<string, Plan['rooms'][number]>();
  const area = (room: Plan['rooms'][number]) => Math.abs(room.polygon.reduce((sum, p, i) => {
    const q = room.polygon[(i+1) % room.polygon.length];
    return sum + p[0]*q[1] - q[0]*p[1];
  }, 0));
  for (const room of plan.rooms) {
    if (!room.zoneId) continue;
    const previous = labels.get(room.zoneId);
    room.showLabel = !room.zoneId.startsWith('face-') && (!previous || area(room) > area(previous));
    if (room.showLabel) {
      if (previous) previous.showLabel = false;
      labels.set(room.zoneId, room);
    }
  }
  for (const { axis, at, spans } of segments.values()) {
    const breaks = [...new Set(spans.flat())].sort((a, b) => a - b);
    for (let i = 1; i < breaks.length; i++) {
      const a = breaks[i - 1], b = breaks[i];
      if (!spans.some(([start, end]) => a >= start && b <= end)) continue;
      plan.walls.push({ id: wallId(),
        a: axis === 'x' ? [a, at] : [at, a], b: axis === 'x' ? [b, at] : [at, b],
        thickness: Math.max(2, tolerance) });
    }
  }
  if (input.walls) {
    const seen = new Set<string>();
    for (const source of input.walls) {
      const a = pointFromSource(source.a), b = pointFromSource(source.b);
      const length = distance(a, b);
      const thickness = distance([0, 0], pointFromSource([source.thicknessX, source.thicknessY]));
      const key = [a.join(','), b.join(',')].sort().join(':');
      if (length < 2 || thickness > length || seen.has(key)) continue;
      seen.add(key);
      plan.walls.push({ id: wallId(), a, b, thickness: thickness > 0 ? thickness : Math.max(2, tolerance) });
      if (!thickness) {
        const id = plan.walls.at(-1)!.id;
        plan.issues.push({ code: 'UNVERIFIED_THICKNESS', message: id + ' chưa đọc được độ dày từ bản gốc.', entityId: id });
      }
    }
    if (!plan.walls.length)
      plan.issues.push({ code: 'NO_WALL_EVIDENCE', message: 'Chưa nhận diện được nét tường. Bố cục chỉ dùng để đối chiếu.' });
  }
  let rejectedFeatures = input.rejectedFeatures ?? 0;
  if (input.features) {
    plan.features = input.features.flatMap(({ type, label, bounds: [left, top, right, bottom] }, index) => {
      if (right <= left || bottom <= top) {
        rejectedFeatures++;
        return [];
      }
      const id = 'F' + (index + 1);
      if (type === 'unclassified')
        plan.issues.push({ code: 'UNCLASSIFIED_FEATURE', message: id + ' chưa xác định loại. Kiểm tra vùng đánh dấu trên bản gốc.', entityId: id });
      return [{ id, type, label: label.trim(),
        bounds: [...pointFromSource([left, top]), ...pointFromSource([right, bottom])] as Bounds }];
    });
  }
  if (rejectedFeatures)
    plan.issues.push({ code: 'INVALID_FEATURE', message: 'Có ' + rejectedFeatures + ' mục nhận diện vật thể không thể hiển thị do dữ liệu không hợp lệ.' });
  const ids = new Set<string>();
  for (const candidate of input.openings) {
    const id = uniqueOpeningId(ids, candidate.name.trim() || (candidate.type === 'door' ? 'D' : 'C') + (ids.size + 1));
    ids.add(id);
    const position = pointFromSource([candidate.x, candidate.y]);
    const horizontal = candidate.axis === 'horizontal';
    const widthPx = candidate.span * (horizontal ? width : height) / 1000;
    const matches = plan.walls.filter(({ a, b }) => horizontal ? a[1] === b[1] : a[0] === b[0])
      .map(wall => ({ wall, ...project(position, wall) }))
      .filter(match => match.across <= 3 * tolerance
        && match.along >= widthPx / 2 - tolerance
        && match.along + widthPx / 2 <= match.length + tolerance
        && widthPx <= match.length - 0.5)
      .sort((a, b) => a.across - b.across);
    const best = matches[0];
    const clampedAlong = best && Math.min(best.length - widthPx / 2 - 0.25, Math.max(widthPx / 2 + 0.25, best.along));
    const opening = best && { id, type: candidate.type, wallId: best.wall.id, width: widthPx, offset: clampedAlong / best.length, reviewed: false };
    if (!opening || (matches[1] && matches[1].across - best.across < tolerance) || openingError(plan, opening)) {
      plan.issues.push({ code: 'UNRESOLVED_OPENING', message: id + ' chưa gắn được vào tường có bằng chứng.', entityId: id });
      continue;
    }
    const previous = plan.openings.find(item => item.wallId === opening.wallId &&
      distance(position, [best.wall.a[0] + (best.wall.b[0] - best.wall.a[0]) * item.offset,
        best.wall.a[1] + (best.wall.b[1] - best.wall.a[1]) * item.offset]) < tolerance);
    if (previous) continue;
    plan.openings.push(opening);
    plan.issues.push({ code: 'REVIEW_OPENING', message: 'Đối chiếu vị trí và khẩu độ ' + id + ' trên bản gốc.', entityId: id });
  }
  plan.issues.push({ code: 'DRAFT_GEOMETRY', message: input.walls
    ? 'Đây là bản nháp. Hãy đối chiếu biên sàn, nét tường và các lỗ mở với bản gốc.'
    : 'Tường và sàn là bản nháp hình học từ biên phòng. Đối chiếu với nét gốc trước khi dùng.' });
  return plan;
}
