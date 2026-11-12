import { z } from 'zod';
import { FloorPlanSchema, previewDimensions, type FloorPlan } from './contract.ts';
const id=z.string().min(1).max(100), text=z.string().max(500);
const number=z.number().finite();
export const Point=z.tuple([number,number]);
export const BBox=z.tuple([number,number,number.positive(),number.positive()]);
const confidence=z.number().min(0).max(1).nullable();
export const FloorPlanV1Schema=z.object({
 schemaVersion:z.literal('1.0'),
 imageMetadata:z.object({width:number.positive().max(10000),height:number.positive().max(10000),name:text}),
 scale:z.object({metersPerPixel:number.positive().max(10).nullable(),verified:z.boolean(),evidence:text.nullable()}),
 levels:z.array(z.object({id,elevation_m:number.nullable()})).min(1).max(20),
 rooms:z.array(z.object({id,level_id:id,name:text,type:text,polygon:z.array(Point).min(3).max(200),confidence})).max(200),
 walls:z.array(z.object({id,level_id:id,a:Point,b:Point,thickness_px:number.positive().nullable(),height_m:number.positive().max(20).nullable(),confidence})).max(1000),
 openings:z.array(z.object({id,wall_id:id,type:z.enum(['door','window']),offset:z.number().min(0).max(1),width_px:number.positive(),sill_m:number.nonnegative().nullable(),height_m:number.positive().nullable(),swing:text.nullable(),confidence})).max(500),
 objects:z.array(z.object({id,room_id:id.nullable(),level_id:id,label:text,category:text,bbox:BBox.nullable(),rotation_deg:number.min(-360).max(360).nullable(),height_m:number.positive().max(20).nullable(),confidence,source_bbox:BBox.nullable()})).max(500),
 warnings:z.array(text).max(100),unknowns:z.array(text).max(100),unsupportedFeatures:z.array(text).max(100),
 processingStatus:z.enum(['needs_review','partial_render','unsupported','reviewed'])
});
export type FloorPlanV1=z.infer<typeof FloorPlanV1Schema>;
export type XY=[number,number];
export type DetectedObject=FloorPlanV1['objects'][number];
// Legacy positions are room-relative, NOT aligned to source image. Explicitly synthetic canvas.
export function adaptLegacy(p:FloorPlan):FloorPlanV1 {
 const d=previewDimensions(p),s=100,w=d.width*s,h=d.depth*s;
 const wall=(id:string,a:XY,b:XY)=>({id,level_id:'level-0',a,b,thickness_px:12,height_m:d.height,confidence:null});
 const walls=[wall('north',[0,0],[w,0]),wall('south',[0,h],[w,h]),wall('west',[0,0],[0,h]),wall('east',[w,0],[w,h])];
 const sizes:Record<string,XY>={bunk_bed:[198,115],desk:[80,100],wardrobe:[170,56],bookshelf:[35,85],stairs:[72,90]};
 return {schemaVersion:'1.0',imageMetadata:{width:w,height:h,name:'legacy-synthetic'},scale:{metersPerPixel:.01,verified:false,evidence:'Legacy preview; image alignment unavailable'},levels:[{id:'level-0',elevation_m:0}],rooms:[{id:'room-0',level_id:'level-0',name:'Phòng mẫu',type:'bedroom',polygon:[[0,0],[w,0],[w,h],[0,h]],confidence:null}],walls,
 openings:p.door.present?[{id:'door-0',wall_id:p.door.wall,type:'door',offset:p.door.offset_ratio,width_px:p.door.width_m*s,sill_m:0,height_m:2.15,swing:null,confidence:null}]:[],
 objects:p.furniture.map((o,i)=>({id:`object-${i}`,level_id:'level-0',room_id:'room-0',label:o.type,category:o.type,bbox:[o.x_ratio*w-sizes[o.type][0]/2,o.z_ratio*h-sizes[o.type][1]/2,...sizes[o.type]] as [number,number,number,number],rotation_deg:o.rotation_deg,height_m:null,confidence:null,source_bbox:null})),warnings:[...p.warnings,'Kích thước đồ vật và chiều cao từ bản mẫu, chưa xác minh.'],unknowns:['legacy image transform'],unsupportedFeatures:[],processingStatus:'needs_review'};
}
export function parsePlan(input:unknown){const v=FloorPlanV1Schema.safeParse(input);return v.success?v.data:adaptLegacy(FloorPlanSchema.parse(input));}
