import type {FloorPlanV1,XY} from './v1.ts';
import {pointInPolygon,segmentDistance,distance} from '../geometry/engine.ts';
export function bboxIoU(a:[number,number,number,number],b:[number,number,number,number]){const intersection=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));return intersection/(a[2]*a[3]+b[2]*b[3]-intersection);}
// Rasterized polygon IoU (128² samples over joint bounds), explicitly approximate.
export function polygonIoU(a:XY[],b:XY[]){const all=[...a,...b];const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));if(maxX===minX||maxY===minY)return 0;let both=0,either=0;for(let i=0;i<128;i++)for(let j=0;j<128;j++){const p:XY=[minX+(i+.5)/128*(maxX-minX),minY+(j+.5)/128*(maxY-minY)],x=pointInPolygon(p,a),y=pointInPolygon(p,b);if(x||y)either++;if(x&&y)both++;}return either?both/either:0;}
function match<A,B>(pred:A[],gt:B[],score:(a:A,b:B)=>number,threshold:number){const candidates=pred.flatMap((a,i)=>gt.map((b,j)=>({i,j,s:score(a,b)}))).sort((a,b)=>b.s-a.s),usedP=new Set<number>(),usedG=new Set<number>(),pairs:typeof candidates=[];for(const c of candidates)if(c.s>=threshold&&!usedP.has(c.i)&&!usedG.has(c.j)){pairs.push(c);usedP.add(c.i);usedG.add(c.j);}return {pairs,tp:pairs.length,fp:pred.length-pairs.length,fn:gt.length-pairs.length,precision:pred.length?pairs.length/pred.length:null,recall:gt.length?pairs.length/gt.length:null};}
const mean=(a:number[])=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
export function evaluate(pred:FloorPlanV1,gt:FloorPlanV1){
 const rooms=match(pred.rooms,gt.rooms,(a,b)=>a.level_id===b.level_id?polygonIoU(a.polygon,b.polygon):0,.5);
 const objects=match(pred.objects,gt.objects,(a,b)=>a.category===b.category&&a.level_id===b.level_id&&a.bbox&&b.bbox?bboxIoU(a.bbox,b.bbox):0,.5);
 const position=objects.pairs.map(({i,j})=>{const a=pred.objects[i].bbox!,b=gt.objects[j].bbox!;return distance([a[0]+a[2]/2,a[1]+a[3]/2],[b[0]+b[2]/2,b[1]+b[3]/2]);});
 const wallError=mean(gt.walls.flatMap(w=>{const peers=pred.walls.filter(p=>p.level_id===w.level_id);if(!peers.length)return [];return [w.a,w.b].map(p=>Math.min(...peers.map(a=>segmentDistance(p,a.a,a.b))));}));
 const openings=(p:FloorPlanV1)=>p.openings.flatMap(o=>{const w=p.walls.find(w=>w.id===o.wall_id);return w?[{...o,level:w.level_id,point:[w.a[0]+o.offset*(w.b[0]-w.a[0]),w.a[1]+o.offset*(w.b[1]-w.a[1])] as XY}]:[];});
 const doors=match(openings(pred),openings(gt),(a,b)=>a.type===b.type&&a.level===b.level?1-distance(a.point,b.point)/20:0,.5);
 return {rooms,objects,openings:doors,meanObjectCenterError_px:mean(position),meanMatchedRoomIoU:mean(rooms.pairs.map(p=>p.s)),meanMatchedObjectIoU:mean(objects.pairs.map(p=>p.s)),wallEndpointToPredictionDistance_px:wallError,roomCountError:pred.rooms.length-gt.rooms.length,wallCountError:pred.walls.length-gt.walls.length,openingCountError:pred.openings.length-gt.openings.length,relativeScaleError:gt.scale.verified&&gt.scale.metersPerPixel&&pred.scale.metersPerPixel?Math.abs(pred.scale.metersPerPixel/gt.scale.metersPerPixel-1):null};
}
