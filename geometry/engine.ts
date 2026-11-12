import type { FloorPlanV1, XY } from '../shared/v1.ts';
export type Issue={code:string;id:string;message:string};
export type WallPiece={id:string;a:XY;b:XY;thickness:number;bottom:number;height:number};
const EPS=1e-7;
export const distance=(a:XY,b:XY)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const cross=(a:XY,b:XY,c:XY)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function area(p:XY[]){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;}
export function pointInPolygon(q:XY,p:XY[]){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a[1]>q[1])!==(b[1]>q[1]))&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function segmentDistance(p:XY,a:XY,b:XY){const l=distance(a,b)**2;if(!l)return distance(p,a);const t=Math.max(0,Math.min(1,((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/l));return distance(p,[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
function intersects(a:XY,b:XY,c:XY,d:XY){return cross(a,b,c)*cross(a,b,d)<-EPS&&cross(c,d,a)*cross(c,d,b)<-EPS;}
export function simplePolygon(raw:XY[]){const p=closedPolygon(raw);if(p.length<3||area(p)<EPS)return false;for(let i=0;i<p.length;i++){if(distance(p[i],p[(i+1)%p.length])<EPS)return false;for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;const a=p[i],b=p[(i+1)%p.length],c=p[j],d=p[(j+1)%p.length];if(intersects(a,b,c,d)||segmentDistance(a,c,d)<EPS||segmentDistance(b,c,d)<EPS||segmentDistance(c,a,b)<EPS)return false;}}return true;}
export function closedPolygon(p:XY[]){return p.length>3&&distance(p[0],p[p.length-1])<EPS?p.slice(0,-1):p;}
export function compileGeometry(plan:FloorPlanV1){
 const issues:Issue[]=[],issue=(code:string,id:string,message:string)=>issues.push({code,id,message});
 const scale=plan.scale.metersPerPixel??(10/Math.max(plan.imageMetadata.width,plan.imageMetadata.height));
 const origin:XY=[plan.imageMetadata.width/2,plan.imageMetadata.height/2];
 const world=(p:XY):XY=>[(p[0]-origin[0])*scale,(p[1]-origin[1])*scale];
 if(!plan.scale.verified||!plan.scale.metersPerPixel||!plan.scale.evidence)issue('UNVERIFIED_SCALE','scale','Tỉ lệ minh họa / chưa được xác nhận');
 const level=plan.levels[0].id;
 if(plan.levels.length>1)issue('MULTI_LEVEL_PARTIAL',level,'Chỉ dựng tầng đầu; các tầng khác cần chọn/tách');
 if(plan.unsupportedFeatures.length)issue('UNSUPPORTED_FEATURES','plan',plan.unsupportedFeatures.join('; '));
 const ids=new Set<string>();for(const item of [...plan.rooms,...plan.walls,...plan.openings,...plan.objects]){if(ids.has(item.id))issue('DUPLICATE_ID',item.id,'ID không duy nhất');ids.add(item.id);}
 const rooms=plan.rooms.filter(r=>{if(r.level_id!==level)return false;if(!simplePolygon(r.polygon)){issue('INVALID_POLYGON',r.id,'Đa giác tự cắt / suy biến');return false;}return true;}).map(r=>({...r,polygon:closedPolygon(r.polygon).map(world)}));
 for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){
 const a=rooms[i].polygon,b=rooms[j].polygon;
 if(a.some(p=>pointInPolygon(p,b)&&b.every((v,k)=>segmentDistance(p,v,b[(k+1)%b.length])>EPS))||b.some(p=>pointInPolygon(p,a)&&a.every((v,k)=>segmentDistance(p,v,a[(k+1)%a.length])>EPS))||a.some((v,k)=>b.some((q,l)=>intersects(v,a[(k+1)%a.length],q,b[(l+1)%b.length])))||JSON.stringify(a)===JSON.stringify(b))issue('ROOM_OVERLAP',rooms[j].id,'Phòng chồng lấn; cần sửa polygon');
 }
 const pieces:WallPiece[]=[],accepted:FloorPlanV1['walls']=[];
 for(const wall of plan.walls){
 if(wall.level_id!==level)continue;
 const length=distance(wall.a,wall.b);if(length<EPS){issue('ZERO_WALL',wall.id,'Tường dài bằng 0');continue;}
 const duplicate=accepted.find(w=>Math.abs(cross(w.a,w.b,wall.a))<EPS&&Math.abs(cross(w.a,w.b,wall.b))<EPS&& (()=>{const l=distance(w.a,w.b),project=(p:XY)=>((p[0]-w.a[0])*(w.b[0]-w.a[0])+(p[1]-w.a[1])*(w.b[1]-w.a[1]))/l;const a=project(wall.a),b=project(wall.b);return Math.min(l,Math.max(a,b))-Math.max(0,Math.min(a,b))>EPS;})());
 if(duplicate){issue('OVERLAPPING_WALL',wall.id,'Tường trùng/chồng: bỏ bản sau, cần hợp nhất cửa');continue;}
 accepted.push(wall);
 const height=wall.height_m??2.8,thickness=(wall.thickness_px??(0.12/scale))*scale;
 if(wall.height_m===null||wall.thickness_px===null)issue('ASSUMED_WALL_SIZE',wall.id,'Chiều cao 2.8m / độ dày 0.12m minh họa khi thiếu');
 const openings=plan.openings.filter(o=>o.wall_id===wall.id).map(o=>({...o,start:o.offset*length-o.width_px/2,end:o.offset*length+o.width_px/2})).sort((a,b)=>a.start-b.start);
 let previous=-Infinity;
 const valid=openings.filter(o=>{const sill=o.type==='door'?0:o.sill_m??.9,h=o.height_m??(o.type==='door'?2.1:1.2);if(o.start<0||o.end>length||sill+h>height||o.start<previous){issue('INVALID_OPENING',o.id,'Cửa vượt tường hoặc chồng lấn');return false;}previous=o.end;if(o.height_m===null||o.sill_m===null)issue('ASSUMED_OPENING_HEIGHT',o.id,'Cao độ cửa minh họa');return true;});
 const at=(t:number):XY=>world([wall.a[0]+(wall.b[0]-wall.a[0])*t/length,wall.a[1]+(wall.b[1]-wall.a[1])*t/length]);
 const add=(a:number,b:number,bottom:number,h:number)=>{if(b-a>EPS&&h>EPS)pieces.push({id:wall.id,a:at(a),b:at(b),thickness,bottom,height:h});};
 let cursor=0;for(const o of valid){add(cursor,o.start,0,height);const sill=o.type==='door'?0:o.sill_m??.9,h=o.height_m??(o.type==='door'?2.1:1.2);add(o.start,o.end,0,sill);add(o.start,o.end,sill+h,height-sill-h);cursor=o.end;}add(cursor,length,0,height);
 }
 for(const o of plan.openings)if(!plan.walls.some(w=>w.id===o.wall_id))issue('MISSING_HOST_WALL',o.id,'Không có tường chủ');
 const objects=plan.objects.filter(o=>o.level_id===level).map(o=>{const b=o.bbox;return {...o,center:b?world([b[0]+b[2]/2,b[1]+b[3]/2]):null,width:b?b[2]*scale:null,depth:b?b[3]*scale:null};});
 for(const o of objects){if(!o.center){issue('MISSING_OBJECT_BBOX',o.id,'Không tự tạo vị trí đồ vật');continue;}if(o.room_id&&!rooms.some(r=>r.id===o.room_id&&pointInPolygon(o.center!,r.polygon)))issue('OBJECT_OUTSIDE_ROOM',o.id,'Đồ vật không nằm trong phòng đã gán');}
 for(const door of plan.openings.filter(o=>o.type==='door')){
  const wall=accepted.find(w=>w.id===door.wall_id);if(!wall)continue;
  const center=world([wall.a[0]+door.offset*(wall.b[0]-wall.a[0]),wall.a[1]+door.offset*(wall.b[1]-wall.a[1])]);
  for(const o of objects){if(!o.center||!o.width||!o.depth)continue;const angle=-(o.rotation_deg??0)*Math.PI/180,dx=center[0]-o.center[0],dz=center[1]-o.center[1];if(Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle))<o.width/2+.18&&Math.abs(dx*Math.sin(angle)+dz*Math.cos(angle))<o.depth/2+.18)issue('DOOR_BLOCKED',o.id,`Đồ vật chắn tâm lối cửa ${door.id}; cần kiểm tra vùng mở`);}
 }
 const collision=(p:XY,radius=.18)=>!rooms.some(r=>pointInPolygon(p,r.polygon))||pieces.some(w=>w.bottom<1.7&&w.bottom+w.height>.1&&segmentDistance(p,w.a,w.b)<w.thickness/2+radius)||objects.some(o=>{if(!o.center||!o.width||!o.depth)return false;const t=-(o.rotation_deg??0)*Math.PI/180,dx=p[0]-o.center[0],dy=p[1]-o.center[1];return Math.abs(dx*Math.cos(t)-dy*Math.sin(t))<o.width/2+radius&&Math.abs(dx*Math.sin(t)+dy*Math.cos(t))<o.depth/2+radius;});
 const points=rooms.flatMap(r=>r.polygon),bounds=points.length?{minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))}:{minX:-5,maxX:5,minZ:-5,maxZ:5};
 return {rooms,pieces,objects,issues,world,scale,bounds,collision,level,status:rooms.length?(issues.length||plan.processingStatus!=='reviewed'?'partial_needs_review':'rendered'):'unsupported'};
}
