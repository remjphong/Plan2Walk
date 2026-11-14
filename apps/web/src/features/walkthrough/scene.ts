import * as T from 'three';
import { buildGeometry, distance, interpolate, type Plan, type Point, type Wall } from '@plan2walk/floorplan';
import { floorFinish, modelFinishes } from './materials';

type Side = 'top' | 'bottom' | 'left' | 'right';
type PlanFeature = NonNullable<Plan['features']>[number];

function orientFeature(bounds: PlanFeature['bounds'], type: PlanFeature['type'], walls: readonly Wall[]): Side {
  const [x0, y0, x1, y1] = bounds;
  const w = Math.max(1e-3, x1 - x0), d = Math.max(1e-3, y1 - y0);
  const maxSnap = Math.max(w, d) * 1.1;
  const longBack = type === 'sofa' || type === 'kitchen_counter' || type === 'sink' || type === 'table';
  const shortBack = type === 'bed' || type === 'toilet';

  const sideSpan = (side: Side) => side === 'top' || side === 'bottom' ? w : d;
  const otherSpan = (side: Side) => side === 'top' || side === 'bottom' ? d : w;

  let bestSide: Side | null = null;
  let bestScore = Infinity;

  const evalSide = (side: Side, dist: number) => {
    if (dist > maxSnap) return;
    const span = sideSpan(side), other = otherSpan(side);
    let penalty = 0;
    if (longBack && span < other * .9) penalty = Math.min(w, d) * .45;
    else if (shortBack && span > other * 1.05) penalty = Math.min(w, d) * .45;
    const score = dist + penalty;
    if (score < bestScore) {
      bestScore = score;
      bestSide = side;
    }
  };

  for (const wall of walls) {
    if (Math.abs(wall.a[1] - wall.b[1]) < 1) {
      const wy = (wall.a[1] + wall.b[1]) / 2;
      const minX = Math.min(wall.a[0], wall.b[0]), maxX = Math.max(wall.a[0], wall.b[0]);
      const overlap = Math.min(x1, maxX) - Math.max(x0, minX);
      if (overlap >= .3 * w) {
        evalSide('top', Math.abs(wy - y0));
        evalSide('bottom', Math.abs(wy - y1));
      }
    } else if (Math.abs(wall.a[0] - wall.b[0]) < 1) {
      const wx = (wall.a[0] + wall.b[0]) / 2;
      const minY = Math.min(wall.a[1], wall.b[1]), maxY = Math.max(wall.a[1], wall.b[1]);
      const overlap = Math.min(y1, maxY) - Math.max(y0, minY);
      if (overlap >= .3 * d) {
        evalSide('left', Math.abs(wx - x0));
        evalSide('right', Math.abs(wx - x1));
      }
    }
  }

  if (bestSide) return bestSide;
  if (longBack) return w >= d ? 'top' : 'left';
  if (shortBack) return w <= d ? 'top' : 'left';
  return 'top';
}

export function createModel(plan: Plan, overview: boolean) {
  const geometry = buildGeometry(plan);
  const unit = geometry.unit;
  const points = plan.rooms.flatMap(room => room.polygon);
  const minX = Math.min(...points.map(p => p[0])), minY = Math.min(...points.map(p => p[1]));
  const maxX = Math.max(...points.map(p => p[0])), maxY = Math.max(...points.map(p => p[1]));
  const center: Point = [(maxX + minX) / 2, (maxY + minY) / 2];
  const size = Math.max((maxX - minX) * unit, (maxY - minY) * unit);
  const local = (point: Point, y = 0) => new T.Vector3((point[0] - center[0]) * unit, y, (point[1] - center[1]) * unit);
  const raw = (x: number, z: number): Point => [x / unit + center[0], z / unit + center[1]];
  const group = new T.Group();
  const finishes = modelFinishes();
  const plaster = new T.MeshStandardMaterial({ color: '#f5efe3', roughness: .88 });
  const baseboard = new T.MeshStandardMaterial({ color: '#dfd6c8', roughness: .74 });
  const cap = new T.MeshStandardMaterial({ color: '#819287', roughness: .89 });
  const frame = new T.MeshStandardMaterial({ color: '#536d76', metalness: .12, roughness: .45 });
  const glass = new T.MeshStandardMaterial({ color: '#a9d5ec', transparent: true, opacity: .42, roughness: .24, side: T.DoubleSide });
  const timber = new T.MeshStandardMaterial({ color: '#b98a60', roughness: .64 });
  const materials = [plaster, baseboard, cap, frame, glass, timber];
  // The model view uses a cut section so the same floor plan remains readable from above.
  const windowWalls = new Set(plan.openings.filter(opening => opening.type === 'window').map(opening => opening.wallId));
  function wallCeiling(wall: Plan['walls'][number]) {
    if (!overview) return Infinity;
    if (wall.a[1] === wall.b[1] && wall.a[1] >= maxY - wall.thickness) return .72;
    return windowWalls.has(wall.id) ? 1.65 : 1.15;
  }

  function box(a: Point, b: Point, width: number, bottom: number, top: number, material: T.Material | T.Material[], shadows = true) {
    if (top <= bottom || distance(a, b) === 0) return;
    const mesh = new T.Mesh(new T.BoxGeometry(distance(a, b) * unit, top - bottom, width), material);
    mesh.position.copy(local(interpolate(a, b, .5), (bottom + top) / 2));
    mesh.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const labels: { id: string; title: string; location: T.Vector3; kind: 'room' | 'door' }[] = [];
  for (const room of plan.rooms) {
    const shape = new T.Shape();
    room.polygon.forEach((p, i) => {
      const v = local(p);
      if (!i) shape.moveTo(v.x, -v.z); else shape.lineTo(v.x, -v.z);
    });
    shape.closePath();
    const finish = floorFinish(room.name);
    const material = finishes.surfaces[finish];
    const floor = new T.Mesh(new T.ShapeGeometry(shape), material);
    const uv = floor.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * finishes.repeats[finish], uv.getY(i) * finishes.repeats[finish]);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);
    if (overview) {
      const slab = new T.Mesh(new T.ExtrudeGeometry(shape, { depth: .11, bevelEnabled: false }), cap);
      slab.rotation.x = -Math.PI / 2;
      slab.position.y = -.115;
      slab.castShadow = true;
      group.add(slab);
    }
    const middle = room.polygon.reduce<Point>((sum, p) => [sum[0] + p[0] / room.polygon.length, sum[1] + p[1] / room.polygon.length], [0, 0]);
    labels.push({ id: room.id, title: room.name, location: local(middle, .12), kind: 'room' });
  }
  for (const { wall, start, end, bottom, top } of geometry.pieces) {
    const length = distance(wall.a, wall.b);
    const a = interpolate(wall.a, wall.b, start / length), b = interpolate(wall.a, wall.b, end / length);
    const height = Math.min(top, wallCeiling(wall));
    box(a, b, wall.thickness * unit, bottom, height, [plaster, plaster, cap, plaster, plaster, plaster]);
    if (bottom === 0) box(a, b, wall.thickness * unit + .012, 0, Math.min(height, .07), baseboard, false);
  }
  const furnishing = new T.MeshStandardMaterial({ color: '#9c7351', roughness: .82 });
  const darkWood = new T.MeshStandardMaterial({ color: '#614631', roughness: .82 });
  const fabric = new T.MeshStandardMaterial({ color: '#608777', roughness: .92 });
  const cushion = new T.MeshStandardMaterial({ color: '#789c8c', roughness: .9 });
  const linen = new T.MeshStandardMaterial({ color: '#f0e7d6', roughness: .94 });
  const fixture = new T.MeshStandardMaterial({ color: '#eceee9', roughness: .38 });
  const darkGlass = new T.MeshStandardMaterial({ color: '#272c30', metalness: .25, roughness: .22 });
  materials.push(furnishing, darkWood, fabric, cushion, linen, fixture, darkGlass);

  for (const feature of geometry.features) {
    const [x, y, right, bottom] = feature.bounds;
    const w = right - x, d = bottom - y;
    if (w <= 0 || d <= 0) continue;

    if (feature.type === 'stair') {
      const horiz = w >= d;
      const spanM = (horiz ? w : d) * unit;
      const breadthM = (horiz ? d : w) * unit;
      const steps = Math.max(9, Math.min(12, Math.round(spanM / .24)));
      const maxH = overview ? .58 : .98;
      const riserH = maxH / steps;
      const treadRun = spanM / steps;
      const stairGroup = new T.Group();
      stairGroup.position.copy(local([(x + right) / 2, (y + bottom) / 2], 0));
      if (!horiz) stairGroup.rotation.y = Math.PI / 2;

      for (let i = 0; i < steps; i++) {
        const stepCenter = -spanM / 2 + (i + .5) * treadRun;
        const stepTop = (i + 1) * riserH;
        const riserTop = Math.max(0, stepTop - .032);
        if (riserTop > 0) {
          const riser = new T.Mesh(new T.BoxGeometry(treadRun * .96, riserTop, breadthM * .9), plaster);
          riser.position.set(stepCenter, riserTop / 2, 0);
          riser.castShadow = riser.receiveShadow = true;
          stairGroup.add(riser);
        }
        const tread = new T.Mesh(new T.BoxGeometry(treadRun + .02, .034, breadthM * .94), timber);
        tread.position.set(stepCenter, stepTop - .017, 0);
        tread.castShadow = tread.receiveShadow = true;
        stairGroup.add(tread);
      }

      const stringerLen = Math.hypot(spanM, maxH);
      const slopeAngle = Math.atan2(maxH, spanM);
      for (const zSide of [-(breadthM * .46), breadthM * .46]) {
        const stringer = new T.Mesh(new T.BoxGeometry(stringerLen, .04, .03), darkWood);
        stringer.position.set(0, maxH / 2 + .02, zSide);
        stringer.rotation.z = slopeAngle;
        stringer.castShadow = stringer.receiveShadow = true;
        stairGroup.add(stringer);
      }
      group.add(stairGroup);
      continue;
    }

    const side = orientFeature(feature.bounds, feature.type, plan.walls);
    const rotMap: Record<Side, number> = { top: 0, bottom: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
    const span = (side === 'top' || side === 'bottom' ? w : d) * unit;
    const depth = (side === 'top' || side === 'bottom' ? d : w) * unit;
    const fGroup = new T.Group();
    fGroup.position.copy(local([(x + right) / 2, (y + bottom) / 2], 0));
    fGroup.rotation.y = rotMap[side];
    group.add(fGroup);

    const part = (u: number, v: number, u2: number, v2: number, base: number, top: number, material: T.Material) => {
      if (top <= base || u2 <= u || v2 <= v) return;
      const mesh = new T.Mesh(new T.BoxGeometry((u2 - u) * span, top - base, (v2 - v) * depth), material);
      mesh.position.set(((u + u2) / 2 - .5) * span, (base + top) / 2, ((v + v2) / 2 - .5) * depth);
      mesh.castShadow = mesh.receiveShadow = true;
      fGroup.add(mesh);
    };
    const oval = (cu: number, cv: number, ru: number, rv: number, baseY: number, height: number, material: T.Material) => {
      const mesh = new T.Mesh(new T.CylinderGeometry(1, 1, height, 20), material);
      mesh.scale.set(Math.max(.01, ru * span), 1, Math.max(.01, rv * depth));
      mesh.position.set((cu - .5) * span, baseY + height / 2, (cv - .5) * depth);
      mesh.castShadow = mesh.receiveShadow = true;
      fGroup.add(mesh);
    };

    switch (feature.type) {
      case 'sofa':
        part(.05, .07, .10, .14, 0, .09, darkWood);
        part(.90, .07, .95, .14, 0, .09, darkWood);
        part(.05, .86, .10, .93, 0, .09, darkWood);
        part(.90, .86, .95, .93, 0, .09, darkWood);
        part(.03, .05, .97, .95, .09, .28, furnishing);
        part(.03, .05, .97, .27, .28, .73, fabric);
        part(.03, .24, .15, .95, .28, .56, fabric);
        part(.85, .24, .97, .95, .28, .56, fabric);
        for (const u of [.16, .40, .63]) part(u, .28, u + .21, .93, .28, .44, cushion);
        part(.16, .27, .25, .42, .44, .62, linen);
        part(.75, .27, .84, .42, .44, .62, linen);
        break;
      case 'bed':
        part(.03, .03, .97, .97, .05, .28, furnishing);
        part(.03, .02, .97, .08, .28, .82, darkWood);
        part(.08, .08, .92, .10, .38, .76, cushion);
        part(.05, .08, .95, .95, .28, .47, linen);
        part(.05, .44, .95, .96, .47, .53, fabric);
        for (const u of [.11, .53]) part(u, .13, u + .36, .35, .47, .58, linen);
        break;
      case 'table':
        part(.04, .12, .96, .88, .69, .74, furnishing);
        for (const u of [.08, .84]) for (const v of [.16, .76]) part(u, v, u + .08, v + .08, 0, .69, darkWood);
        if (span >= 1.15 && depth >= .75) {
          const seats = Math.min(3, Math.max(2, Math.floor(span / .58)));
          for (let s = 0; s < seats; s++) {
            const u0 = .12 + (s + .15) * (.76 / seats), u1 = .12 + (s + .85) * (.76 / seats);
            part(u0, .01, u1, .16, .42, .46, cushion);
            part(u0, 0, u1, .04, .46, .78, darkWood);
            part(u0, .84, u1, .99, .42, .46, cushion);
            part(u0, .96, u1, 1, .46, .78, darkWood);
          }
        }
        break;
      case 'kitchen_counter':
        part(.01, .06, .99, .94, 0, .06, darkWood);
        part(0, 0, 1, .98, .06, .84, furnishing);
        part(0, 0, 1, 1, .84, .90, fixture);
        part(0, 0, 1, .04, .90, 1.03, fixture);
        part(.14, .22, .40, .80, .885, .908, frame);
        oval(.27, .14, .022, .024, .90, .14, frame);
        part(.58, .18, .90, .84, .898, .914, darkGlass);
        oval(.67, .52, .055, .10, .914, .006, frame);
        oval(.81, .52, .055, .10, .914, .006, frame);
        break;
      case 'sink':
        part(.12, .06, .88, .92, .70, .82, fixture);
        oval(.5, .52, .30, .31, .815, .025, frame);
        oval(.5, .52, .25, .26, .832, .014, fixture);
        oval(.50, .14, .028, .032, .82, .16, frame);
        break;
      case 'toilet':
        part(.20, .06, .80, .36, .15, .71, fixture);
        oval(.50, .61, .23, .26, .01, .39, fixture);
        oval(.50, .61, .34, .30, .33, .13, fixture);
        oval(.50, .62, .24, .21, .455, .016, frame);
        break;
    }
  }

  for (const opening of plan.openings) {
    const wall = plan.walls.find(item => item.id === opening.wallId);
    if (!wall || geometry.issues.some(issue => issue.code === 'INVALID_OPENING' && issue.entityId === opening.id)) continue;
    const length = distance(wall.a, wall.b), half = opening.width / length / 2;
    const a = interpolate(wall.a, wall.b, opening.offset - half), b = interpolate(wall.a, wall.b, opening.offset + half);
    const middle = interpolate(a, b, .5);
    const ceiling = wallCeiling(wall);
    if (opening.type === 'window') {
      const top = Math.min(ceiling, 2.20);
      if (top < 1.12) continue;
      box(a, b, .045, 1.07, top, glass, false);
      box(a, b, .1, 1.05, 1.12, frame);
      box(a, b, .1, top - .05, Math.min(ceiling, top + .02), frame);
      const jamb = (p: Point): Point => [p[0] + (b[0] - a[0]) * .035, p[1] + (b[1] - a[1]) * .035];
      for (const p of [a, middle, interpolate(a, b, .965)]) box(p, jamb(p), .09, 1.12, top - .05, frame);
    } else {
      const jamb = (p: Point, toward: Point) => interpolate(p, toward, .055);
      const jambHeight = Math.min(ceiling, 2.1);
      box(a, jamb(a, b), wall.thickness * unit + .02, 0, jambHeight, timber);
      box(b, jamb(b, a), wall.thickness * unit + .02, 0, jambHeight, timber);
      box(a, b, wall.thickness * unit + .02, 2.04, jambHeight, timber);
      box(a, b, wall.thickness * unit, -.024, .012, cap);
      const leaf: Point = [a[0] + (b[1] - a[1]) * .88, a[1] - (b[0] - a[0]) * .88];
      box(a, leaf, .041, .035, Math.min(ceiling - .04, 2.03), timber);
      labels.push({ id: opening.id, title: opening.id, location: local(middle, Math.min(ceiling, 1.85)), kind: 'door' });
    }
  }
  function dispose() {
    group.traverse(item => { if (item instanceof T.Mesh || item instanceof T.Line) item.geometry.dispose(); });
    materials.forEach(material => material.dispose());
    finishes.dispose();
  }
  return { ...geometry, group, local, raw, size, labels, dispose };
}
