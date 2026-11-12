import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import type { FloorPlanV1 } from '../../shared/v1.ts';
import type { AssetReport } from '../../assets/resolver.ts';
import { populateScene,disposeTree } from './renderScene';

type Props = { plan: FloorPlanV1; onReports:(r:AssetReport[])=>void };
export default function RoomViewer({plan,onReports}:Props) {
  const container=useRef<HTMLDivElement>(null);
  const enterWalk=useRef<()=>void>(()=>{});
  const showOverhead=useRef<()=>void>(()=>{});
  useEffect(()=>{
    if(!container.current) return;
    const element=container.current;
    const scene=new THREE.Scene(); scene.background=new THREE.Color('#b8cbd1'); scene.fog=new THREE.Fog('#b8cbd1',18,44);
    const camera=new THREE.PerspectiveCamera(70,1,.06,10000);
    const renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);
    const model=populateScene(scene,plan,onReports);
    const room={w:Math.max(1,model.bounds.maxX-model.bounds.minX),d:Math.max(1,model.bounds.maxZ-model.bounds.minZ)};
    const cx=(model.bounds.minX+model.bounds.maxX)/2,cz=(model.bounds.minZ+model.bounds.maxZ)/2;
    camera.position.set(cx+room.w*.85,Math.max(room.w,room.d)*1.8,cz+room.d*1.5);
    const ambient=new THREE.HemisphereLight(0xffffff,0x68879a,2.15); scene.add(ambient);
    const light=new THREE.DirectionalLight(0xffebcd,2.4); light.position.set(-3,9,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);scene.add(light);
    const orbit=new OrbitControls(camera,renderer.domElement);
    orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI/2.02;orbit.target.set(cx,0.75,cz);orbit.update();
    const pointer=new PointerLockControls(camera,renderer.domElement);
    const keys=new Set<string>();
    const down=(event:KeyboardEvent)=>{if(!pointer.isLocked)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();keys.add(event.code);};
    const up=(event:KeyboardEvent)=>keys.delete(event.code);
    const clearKeys=()=>keys.clear();window.addEventListener('blur',clearKeys);pointer.addEventListener('unlock',clearKeys);
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    let walkMode=false;
    enterWalk.current=()=>{
      walkMode=true;orbit.enabled=false;
      const possibleSpawns: [number,number][]=[];
      for(let i=0;i<80;i++)for(let j=0;j<80;j++)possibleSpawns.push([model.bounds.minX+(i+.5)/80*room.w,model.bounds.minZ+(j+.5)/80*room.d]);
      const spawn=possibleSpawns.find(p=>!model.collision(p));
      if(!spawn){walkMode=false;orbit.enabled=true;return;}
      camera.position.set(spawn[0],1.6,spawn[1]);
      camera.lookAt(cx,1.6,cz);
      pointer.lock();
    };
    showOverhead.current=()=>{
      pointer.unlock();walkMode=false;orbit.enabled=true;
      camera.position.set(cx+room.w*.85,Math.max(room.w,room.d)*1.8,cz+room.d*1.5);
      orbit.target.set(cx,.75,cz);orbit.update();
    };
    const observer=new ResizeObserver(()=>{
      const rect=element.getBoundingClientRect();
      const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
      renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    });observer.observe(element);
    const clock=new THREE.Clock();
    let frame=0;
    const heading=new THREE.Vector3();const side=new THREE.Vector3();const movement=new THREE.Vector3();
    function animate(){
      frame=requestAnimationFrame(animate);
      const dt=Math.min(clock.getDelta(),.05);
      if(walkMode && pointer.isLocked) {
        camera.getWorldDirection(heading);heading.y=0;heading.normalize();
        side.crossVectors(heading,new THREE.Vector3(0,1,0)).normalize();
        movement.set(0,0,0);
        if(keys.has('KeyW')||keys.has('ArrowUp'))movement.add(heading);
        if(keys.has('KeyS')||keys.has('ArrowDown'))movement.sub(heading);
        if(keys.has('KeyD')||keys.has('ArrowRight'))movement.add(side);
        if(keys.has('KeyA')||keys.has('ArrowLeft'))movement.sub(side);
        if(movement.lengthSq()>0){
          movement.normalize().multiplyScalar(dt*2);
          const next=camera.position.clone().add(movement);
          if(!model.collision([next.x,next.z]))camera.position.copy(next);
        }
        camera.position.y=1.6;
      }else if(!walkMode)orbit.update();
      renderer.render(scene,camera);
    }
    animate();
    return()=>{
      model.dispose();window.removeEventListener('blur',clearKeys);cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);
      pointer.unlock();pointer.dispose();orbit.dispose();
      disposeTree(scene);
      renderer.dispose();element.removeChild(renderer.domElement);
    };
  },[plan,onReports]);
  return <div className="viewport"><div ref={container} style={{position:'absolute',inset:0}}/><div className="viewer-info">Bản dựng minh họa · Không dùng thi công</div><div className="controls-overlay"><button type="button" className="mode-button" onClick={()=>enterWalk.current()}>◉ Đi trong phòng (WASD)</button><button type="button" className="mode-button" onClick={()=>showOverhead.current()}>▦ Nhìn từ trên</button></div></div>;
}
