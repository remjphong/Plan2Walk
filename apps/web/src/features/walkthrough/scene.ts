import * as T from 'three';
import { buildGeometry, distance, interpolate, type Plan, type Point } from '@plan2walk/floorplan';

function texture(wood: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = wood ? '#dfba89' : '#e0ddd6';
  ctx.fillRect(0, 0, 512, 512);
  let seed = 1587;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  if (wood) {
    for (let y = 0; y < 512; y += 28) {
      const offset = Math.floor(random() * 180);
      for (let x = -offset; x < 512; x += 190) {
        const light = 64 + random() * 9;
        ctx.fillStyle = 'hsl(33 46% ' + light + '%)';
        ctx.fillRect(x, y, 189, 27);
        ctx.fillStyle = '#6f52352b';
        ctx.fillRect(x, y + 26, 189, 1);
      }
    }
  }
  for (let i = 0; i < (wood ? 1700 : 3600); i++) {
    const x = random() * 512, y = random() * 512;
    ctx.fillStyle = random() > .5 ? '#fff1d233' : '#433b2b17';
    ctx.fillRect(x, y, wood ? 4 + random() * 62 : 1 + random() * 4, wood ? .7 : 1.4);
  }
  const result = new T.CanvasTexture(canvas);
  result.colorSpace = T.SRGBColorSpace;
  result.wrapS = result.wrapT = T.RepeatWrapping;
  result.anisotropy = 4;
  return result;
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
  const wood = texture(true), stone = texture(false);
  const plaster = new T.MeshStandardMaterial({ color: '#f4e7d6', roughness: .87 });
  const cap = new T.MeshStandardMaterial({ color: '#d3c1ab', roughness: .92 });
  const frame = new T.MeshStandardMaterial({ color: '#536d76', metalness: .12, roughness: .45 });
  const glass = new T.MeshStandardMaterial({ color: '#a9d5ec', transparent: true, opacity: .42, roughness: .24, side: T.DoubleSide });
  const timber = new T.MeshStandardMaterial({ color: '#b98a60', roughness: .64 });
  const materials = [plaster, cap, frame, glass, timber];
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
  for (const [index, room] of plan.rooms.entries()) {
    const shape = new T.Shape();
    room.polygon.forEach((p, i) => {
      const v = local(p);
      if (!i) shape.moveTo(v.x, -v.z); else shape.lineTo(v.x, -v.z);
    });
    shape.closePath();
    const material = new T.MeshStandardMaterial({ map: index % 2 ? stone : wood, roughness: .85 });
    materials.push(material);
    const floor = new T.Mesh(new T.ShapeGeometry(shape), material);
    const uv = floor.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * .43, uv.getY(i) * .43);
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
    group.traverse(item => { if (item instanceof T.Mesh) item.geometry.dispose(); });
    materials.forEach(material => material.dispose());
    wood.dispose();
    stone.dispose();
  }
  return { ...geometry, group, local, raw, size, labels, dispose };
}
