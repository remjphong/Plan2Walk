import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { FloorPlanV1 } from '../../shared/v1.ts';
import { compileGeometry } from '../../geometry/engine.ts';
import { resolveAsset,loadWithFallback,type AssetReport } from '../../assets/resolver.ts';
const cache=new Map<string,Promise<THREE.Group>>();
function load(path:string){if(!cache.has(path))cache.set(path,new GLTFLoader().loadAsync(path).then(g=>g.scene).catch(e=>{cache.delete(path);throw e;}));return cache.get(path)!;}
function box(size:[number,number,number],color:string){return new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.85}));}
function label(text:string){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const c=canvas.getContext('2d')!;c.fillStyle='#172633';c.fillRect(0,0,256,64);c.fillStyle='#ffffff';c.font='20px sans-serif';c.fillText(text.slice(0,22),8,40);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));sprite.scale.set(1.5,.375,1);return sprite;}
export function populateScene(scene:THREE.Scene,plan:FloorPlanV1,onReports:(r:AssetReport[])=>void){
 const geometry=compileGeometry(plan);let disposed=false;
 const reports=plan.objects.map(o=>resolveAsset(o).report);const emit=()=>{if(!disposed)onReports(reports.map(r=>({...r})));};
 const update=(id:string,patch:Partial<AssetReport>)=>{const row=reports.find(r=>r.id===id);if(row)Object.assign(row,patch);emit();};
 for(const o of plan.objects)if(o.level_id!==geometry.level)update(o.id,{status:'skipped_invalid',reason:'Tầng chưa được dựng trong V1',action:'Chọn/tách tầng trước khi dựng'});
 for(const r of geometry.rooms){const shape=new THREE.Shape(r.polygon.map(([x,z])=>new THREE.Vector2(x,-z)));const floor=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:r.type==='bathroom'?'#9db6ba':'#ba9b79',side:THREE.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);}
 for(const w of geometry.pieces){const len=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);const mesh=box([len,w.height,w.thickness],'#e6e8df');mesh.position.set((w.a[0]+w.b[0])/2,w.bottom+w.height/2,(w.a[1]+w.b[1])/2);mesh.rotation.y=-Math.atan2(w.b[1]-w.a[1],w.b[0]-w.a[0]);mesh.castShadow=true;scene.add(mesh);}
 for(const o of geometry.objects){
 if(!o.center||!o.width||!o.depth)continue;
 const {asset}=resolveAsset(o),group=new THREE.Group();group.position.set(o.center[0],0,o.center[1]);group.rotation.y=-(o.rotation_deg??0)*Math.PI/180;scene.add(group);
 const height=o.height_m??.75,placeholder=box([o.width,height,o.depth],'#c78b52');placeholder.position.y=height/2;group.add(placeholder);const tag=label(o.label);tag.position.y=height+.3;group.add(tag);
 if(asset)void loadWithFallback(async()=>{const model=clone(await load(asset.path));model.traverse(n=>{if(n instanceof THREE.Mesh){n.geometry=n.geometry.clone();n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();}});model.rotation.y=asset.rotationY;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());if(Math.min(size.x,size.y,size.z)<=0)throw Error('empty asset');const wrapper=new THREE.Group();model.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));wrapper.add(model);const sy=o.height_m?o.height_m/size.y:Math.min(o.width!/size.x,o.depth!/size.z);wrapper.scale.set(o.width!/size.x,sy,o.depth!/size.z);return wrapper;},()=>new THREE.Group()).then(({value,failed})=>{if(disposed){disposeTree(value);return;}if(failed){update(o.id,{status:'procedural_fallback',reason:'GLB không tải/giải mã được (404, mạng hoặc dữ liệu lỗi)',action:'Giữ placeholder có nhãn'});return;}group.remove(placeholder);placeholder.geometry.dispose();(placeholder.material as THREE.Material).dispose();group.add(value);update(o.id,{status:'exact_asset',reason:'Đúng class; kích thước theo footprint. Chiều cao/hướng cần kiểm tra.',action:'GLB; không chứng thực kiểu dáng ngoài đời'});});
 }
 emit();return {...geometry,dispose:()=>{disposed=true;}};
}
export function disposeTree(root:THREE.Object3D){root.traverse(n=>{if(n instanceof THREE.Mesh){n.geometry.dispose();(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());}if(n instanceof THREE.Sprite){n.material.map?.dispose();n.material.dispose();}});}
