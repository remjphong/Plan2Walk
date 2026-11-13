import { z } from 'zod';

const coordinate = z.number().finite();
export const point = z.tuple([coordinate, coordinate]);
export const issue = z.object({ code: z.string(), message: z.string(), entityId: z.string().optional() });
export const opening = z.object({
  id: z.string(), type: z.enum(['door', 'window']), wallId: z.string(),
  offset: z.number().min(0).max(1), width: z.number().positive(), reviewed: z.boolean(),
});
export const floorPlan = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().nonnegative(),
  width: z.number().int().positive(), height: z.number().int().positive(),
  rooms: z.array(z.object({ id: z.string(), name: z.string(), polygon: z.array(point).min(3) })),
  walls: z.array(z.object({ id: z.string(), a: point, b: point, thickness: z.number().positive() })),
  openings: z.array(opening), issues: z.array(issue),
  scale: z.discriminatedUnion('status', [
    z.object({ status: z.literal('unknown') }),
    z.object({ status: z.literal('verified'), a: point, b: point, meters: z.number().positive(), metersPerPixel: z.number().positive() }),
  ]),
});

export type Point = z.infer<typeof point>;
export type Plan = z.infer<typeof floorPlan>;
export type Wall = Plan['walls'][number];
export type Opening = z.infer<typeof opening>;
export type Issue = z.infer<typeof issue>;

const normalized = z.number().min(0).max(1000);
export const visionCandidates = z.object({
  status: z.enum(['ok', 'needs_region', 'unsupported']),
  sourceKind: z.enum(['architectural_plan', 'mixed_sheet', 'render_or_photo', 'other', 'unclear']),
  rooms: z.array(z.object({
    name: z.string().max(100),
    bounds: z.tuple([normalized, normalized, normalized, normalized]),
  })).max(24),
  openings: z.array(z.object({
    name: z.string().max(30), type: z.enum(['door', 'window']),
    x: normalized, y: normalized, span: normalized.positive(), axis: z.enum(['horizontal', 'vertical']),
  })).max(64),
});

export type Candidates = z.infer<typeof visionCandidates>;
