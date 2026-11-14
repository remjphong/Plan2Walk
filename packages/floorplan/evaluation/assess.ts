import { z } from 'zod';
import { distance, floorPlan, inRoom, interpolate, openingError, point, project } from '../src/index';

const probe = z.object({
  label: z.string().min(1),
  kind: z.enum(['floor', 'empty', 'wall', 'no-wall', 'door', 'window', 'stair', 'stair-3d']),
  at: point,
  axis: z.enum(['horizontal', 'vertical']).optional(),
});

const referencePlan = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tolerancePx: z.number().nonnegative(),
  probes: z.array(probe).min(1),
  scale: z.object({ a: point, b: point, meters: z.number().positive(), toleranceMeters: z.number().nonnegative() }).nullable().optional(),
}).superRefine((reference, context) => {
  const inside = ([x, y]: [number, number]) => x >= 0 && y >= 0 && x <= reference.width && y <= reference.height;
  reference.probes.forEach(({ at }, index) => {
    if (!inside(at)) context.addIssue({ code: 'custom', path: ['probes', index, 'at'], message: 'Point is outside the reference image.' });
  });
  if (reference.scale && (!inside(reference.scale.a) || !inside(reference.scale.b) || distance(reference.scale.a, reference.scale.b) === 0)) {
    context.addIssue({ code: 'custom', path: ['scale'], message: 'Scale requires two different points in the reference image.' });
  }
});

type Check = { label: string; status: 'pass' | 'fail' | 'unsupported'; detail?: string };

export function assessPlan(input: unknown, expected: unknown) {
  const plan = floorPlan.parse(input);
  const reference = referencePlan.parse(expected);
  if (plan.width !== reference.width || plan.height !== reference.height) {
    throw new Error('Plan and reference must use the same image dimensions and crop.');
  }

  const walls = new Map(plan.walls.map(wall => [wall.id, wall]));
  const openings = plan.openings.flatMap(opening => {
    const wall = walls.get(opening.wallId);
    if (!wall || openingError(plan, opening)) return [];
    const axis = Math.abs(wall.b[0] - wall.a[0]) >= Math.abs(wall.b[1] - wall.a[1]) ? 'horizontal' : 'vertical';
    return [{ type: opening.type, at: interpolate(wall.a, wall.b, opening.offset), axis }];
  });

  const checks = reference.probes.map(({ label, kind, at, axis }): Check => {
    let match: boolean;
    switch (kind) {
      case 'stair':
        match = Boolean(plan.features?.some(({ type, bounds: [left, top, right, bottom] }) =>
          type === 'stair' && left <= at[0] && at[0] <= right && top <= at[1] && at[1] <= bottom));
        break;
      case 'stair-3d':
        return { label, status: 'unsupported', detail: 'A 2D stair footprint does not establish stair elevations or step geometry.' };
      case 'floor':
      case 'empty':
        match = plan.rooms.some(room => inRoom(at, room.polygon)) === (kind === 'floor');
        break;
      case 'wall':
      case 'no-wall':
        match = plan.walls.some(wall => {
          const { along, across, length } = project(at, wall);
          return Math.hypot(across, Math.max(-along, along - length, 0)) <= reference.tolerancePx;
        }) === (kind === 'wall');
        break;
      case 'door':
      case 'window':
        match = openings.some(opening => opening.type === kind && (!axis || axis === opening.axis) && distance(at, opening.at) <= reference.tolerancePx);
        break;
    }
    return { label, status: match ? 'pass' : 'fail' };
  });

  if (reference.scale === null) {
    checks.push({ label: 'scale', status: plan.scale.status === 'unknown' ? 'pass' : 'fail', detail: 'The source does not establish a real-world scale.' });
  } else if (reference.scale) {
    if (plan.scale.status === 'unknown') {
      checks.push({ label: 'scale', status: 'fail', detail: 'The plan has no confirmed metric scale.' });
    } else {
      const measured = distance(reference.scale.a, reference.scale.b) * plan.scale.metersPerPixel;
      const error = Math.abs(measured - reference.scale.meters);
      checks.push({ label: 'scale', status: error <= reference.scale.toleranceMeters ? 'pass' : 'fail', detail: `Absolute error: ${error.toFixed(3)} m` });
    }
  }
  return { checks };
}
