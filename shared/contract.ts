import { z } from 'zod';

// The AI only extracts parameters. Geometry generation is deterministic.
export const FloorPlanSchema = z.object({
  room: z.object({
    width_m: z.number().min(1.8).max(12).nullable(),
    depth_m: z.number().min(1.8).max(12).nullable(),
    height_m: z.number().min(2).max(4),
    dimensions_verified: z.boolean()
  }),
  door: z.object({
    present: z.boolean(),
    wall: z.enum(['north', 'south', 'east', 'west']),
    offset_ratio: z.number().min(0).max(1),
    width_m: z.number().min(0.55).max(1.6)
  }),
  furniture: z.array(z.object({
    type: z.enum(['bunk_bed', 'desk', 'wardrobe', 'bookshelf', 'stairs']),
    x_ratio: z.number().min(0).max(1),
    z_ratio: z.number().min(0).max(1),
    rotation_deg: z.number().min(-360).max(360)
  })).max(12),
  warnings: z.array(z.string().max(220)).max(12)
});

export type FloorPlan = z.infer<typeof FloorPlanSchema>;

// Default dimensions are for preview ONLY, never presented as real measurements.
export function previewDimensions(plan: FloorPlan) {
  return {
    width: plan.room.width_m ?? 3.8,
    depth: plan.room.depth_m ?? 4.6,
    height: plan.room.height_m,
    approximate: !plan.room.dimensions_verified || plan.room.width_m === null || plan.room.depth_m === null
  };
}

export const demoFloorPlan: FloorPlan = {
  room: { width_m: null, depth_m: null, height_m: 2.8, dimensions_verified: false },
  door: { present: true, wall: 'west', offset_ratio: 0.86, width_m: 0.88 },
  furniture: [
    { type: 'bunk_bed', x_ratio: 0.58, z_ratio: 0.26, rotation_deg: 0 },
    { type: 'desk', x_ratio: 0.86, z_ratio: 0.60, rotation_deg: 90 },
    { type: 'wardrobe', x_ratio: 0.52, z_ratio: 0.89, rotation_deg: 0 },
    { type: 'bookshelf', x_ratio: 0.14, z_ratio: 0.25, rotation_deg: 90 },
    { type: 'stairs', x_ratio: 0.30, z_ratio: 0.15, rotation_deg: 0 }
  ],
  warnings: [
    'Bản demo minh họa vị trí nội thất theo hình mẫu; kích thước căn phòng chưa được xác minh.',
    'Hình học cầu thang/giường tầng là mô hình sơ bộ, không dùng cho thiết kế thi công.'
  ]
};
