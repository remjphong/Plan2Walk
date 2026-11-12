import { adaptLegacy, type FloorPlanV1 } from '../shared/v1.ts';
import { demoFloorPlan } from '../shared/contract.ts';
export const bunk=()=>adaptLegacy(demoFloorPlan);
export function ensuite():FloorPlanV1 {
 const p=bunk();p.imageMetadata={width:600,height:500,name:'synthetic-ensuite'};p.objects=[];
 p.rooms=[{id:'bedroom',name:'Bedroom',type:'bedroom',level_id:'level-0',polygon:[[0,0],[400,0],[400,500],[0,500]],confidence:1},{id:'wc',name:'WC',type:'bathroom',level_id:'level-0',polygon:[[400,0],[600,0],[600,500],[400,500]],confidence:1}];
 p.walls=[[[0,0],[600,0]],[[600,0],[600,500]],[[600,500],[0,500]],[[0,500],[0,0]],[[400,0],[400,500]]].map(([a,b],i)=>({id:`w${i}`,level_id:'level-0',a:a as [number,number],b:b as [number,number],thickness_px:12,height_m:2.8,confidence:1}));
 p.openings=[{id:'entry',wall_id:'w2',type:'door',offset:.7,width_px:90,sill_m:0,height_m:2.1,swing:null,confidence:1},{id:'bath-door',wall_id:'w4',type:'door',offset:.5,width_px:90,sill_m:0,height_m:2.1,swing:null,confidence:1},{id:'window',wall_id:'w0',type:'window',offset:.5,width_px:100,sill_m:.9,height_m:1.2,swing:null,confidence:1}];return p;
}
export function lShape(){const p=ensuite();p.rooms=[{...p.rooms[0],polygon:[[0,0],[600,0],[600,200],[200,200],[200,500],[0,500]]}];p.walls=p.rooms[0].polygon.map((a,i,ps)=>({id:`w${i}`,level_id:'level-0',a,b:ps[(i+1)%ps.length],height_m:2.8,thickness_px:12,confidence:1}));p.openings=[];return p;}
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZl8AAAAASUVORK5CYII=','base64');
