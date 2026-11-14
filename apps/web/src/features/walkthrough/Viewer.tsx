import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Plan, Point } from '@plan2walk/floorplan';
import { inRoom } from '@plan2walk/floorplan';
import { createModel } from './scene';

export type Position = { point: Point; yaw: number; room: string };

export function Viewer({ plan, walking, start, top, zoom, selected, onSelect, onPosition, onExit }: {
  plan: Plan; walking: boolean; start: Point | null; top: boolean; zoom: number; selected: string | null;
  onSelect(id: string): void; onPosition(position: Position): void; onExit(): void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, HTMLElement>());
  const cameraActions = useRef<{ setView(top: boolean, zoom: number): void } | null>(null);
  const current = useRef({ onExit, onPosition, top, zoom });
  current.current = { onExit, onPosition, top, zoom };
  const [failure, setFailure] = useState(false);

  useEffect(() => {
    const container = host.current!;
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFailure(true); return; }
    setFailure(false);
    const model = createModel(plan, !walking);
    const scene = new T.Scene();
    if (walking) scene.background = new T.Color('#e1effa');
    scene.add(model.group);
    const sky = new T.HemisphereLight('#f2f7ff', '#c6b29e', 1.95);
    const sun = new T.DirectionalLight('#fff3e1', 2.45);
    sun.position.set(-5, 11, 6).normalize().multiplyScalar(Math.max(12, model.size * 1.15));
    sun.castShadow = true;
    const shadowSize = model.size * .9;
    Object.assign(sun.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, far: Math.max(45, model.size * 3) });
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 2.5;
    sun.shadow.bias = -.0006;
    sun.shadow.normalBias = .035;
    const mat = new T.ShadowMaterial({ opacity: .12 });
    const ground = new T.Mesh(new T.PlaneGeometry(model.size * 5, model.size * 5), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.07;
    ground.receiveShadow = true;
    scene.add(sky, sun, ground);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute('aria-label', walking ? 'Góc nhìn đi bộ 3D' : 'Mô hình mặt bằng 3D');
    container.prepend(renderer.domElement);

    const camera = new T.PerspectiveCamera(walking ? 69 : 36, 1, .035, 150);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = !walking;
    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2.25;
    let player = start ?? plan.rooms[0].polygon[0];
    let yaw = Math.PI / 2, pitch = -.16;
    if (walking) {
      let best = -1;
      for (let heading = 0; heading < 16; heading++) {
        const angle = heading * Math.PI / 8;
        let clear = 0;
        for (let step = .2; step <= Math.min(8, model.size); step += .2) {
          const distance = step / model.unit;
          if (!model.walkable([player[0] + Math.sin(angle) * distance, player[1] - Math.cos(angle) * distance])) break;
          clear = step;
        }
        if (clear > best) { best = clear; yaw = angle; }
      }
    }
    let roomName = plan.rooms.find(room => inRoom(player, room.polygon))?.name ?? '';
    const keys = new Set<string>();
    const pointerKeys = new Map<number, string>();
    const buttonKeys = new Set<string>();
    const stage = container.parentElement!;
    const labels = [...model.labels].reverse();
    let viewportWidth = 0, viewportHeight = 0;
    const bounds = new T.Box3().setFromObject(model.group);
    const target = bounds.getCenter(new T.Vector3());
    const corners: T.Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) corners.push(new T.Vector3(x, y, z).sub(target));
    const showPosition = () => {
      roomName = plan.rooms.find(room => inRoom(player, room.polygon))?.name ?? roomName;
      current.current.onPosition({ point: player, yaw, room: roomName });
    };

    function setView(isTop: boolean, magnification: number) {
      if (walking) return;
      const direction = new T.Vector3(isTop ? 0 : -.14, isTop ? 1.2 : 1.55, isTop ? .015 : .78).normalize();
      const right = new T.Vector3().crossVectors(camera.up, direction).normalize();
      const up = new T.Vector3().crossVectors(direction, right);
      const halfFov = Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * .89;
      const distance = Math.max(...corners.map(p => p.dot(direction) + Math.max(
        Math.abs(p.dot(right)) / (halfFov * camera.aspect),
        Math.abs(p.dot(up)) / halfFov,
      ))) / magnification;
      camera.position.copy(target).addScaledVector(direction, distance);
      controls.target.copy(target);
      camera.far = Math.max(150, distance + bounds.getSize(new T.Vector3()).length() * 2);
      camera.updateProjectionMatrix();
      controls.update();
    }
    cameraActions.current = { setView };
    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      viewportWidth = w;
      viewportHeight = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      setView(current.current.top, current.current.zoom);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let drag: { x: number; y: number } | null = null;
    const pointerDown = (event: PointerEvent) => {
      if (!walking || event.button !== 0) return;
      drag = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!drag) return;
      yaw += (event.clientX - drag.x) * .007;
      pitch = T.MathUtils.clamp(pitch - (event.clientY - drag.y) * .005, -1.18, 1.18);
      drag = { x: event.clientX, y: event.clientY };
      showPosition();
    };
    const pointerUp = () => { drag = null; };
    const reset = () => { keys.clear(); pointerKeys.clear(); buttonKeys.clear(); drag = null; };
    function movementButton(target: EventTarget | null) {
      return target instanceof HTMLElement ? target.closest<HTMLButtonElement>('button[data-walk-key]') : null;
    }
    const movementDown = (event: PointerEvent) => {
      const button = movementButton(event.target);
      if (!walking || !button?.dataset.walkKey || event.button !== 0) return;
      pointerKeys.set(event.pointerId, button.dataset.walkKey);
      button.setPointerCapture(event.pointerId);
    };
    const movementUp = (event: PointerEvent) => { pointerKeys.delete(event.pointerId); };
    const keyDown = (event: KeyboardEvent) => {
      if (!walking || event.altKey || event.ctrlKey || event.metaKey ||
        document.querySelector('dialog[open]') || (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))) return;
      if (event.key === 'Escape') { reset(); current.current.onExit(); return; }
      const button = movementButton(event.target);
      if (button?.dataset.walkKey && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault(); buttonKeys.add(button.dataset.walkKey); return;
      }
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault(); keys.add(key);
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase());
      if (event.key === ' ' || event.key === 'Enter') buttonKeys.clear();
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointercancel', pointerUp);
    stage.addEventListener('pointerdown', movementDown);
    stage.addEventListener('pointerup', movementUp);
    stage.addEventListener('pointercancel', movementUp);
    stage.addEventListener('lostpointercapture', movementUp);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', reset);
    if (walking) showPosition();
    let last = performance.now();
    let previousPosition = 0;
    const location = new T.Vector3();
    renderer.setAnimationLoop(time => {
      const delta = Math.min((time - last) / 1000, .035);
      last = time;
      if (walking) {
        if (document.querySelector('dialog[open]')) reset();
        const held = (key: string) => keys.has(key) || buttonKeys.has(key) || [...pointerKeys.values()].includes(key);
        const forward = Number(held('w') || keys.has('arrowup')) - Number(held('s') || keys.has('arrowdown'));
        const sideways = Number(held('d')) - Number(held('a'));
        yaw += (Number(keys.has('arrowright')) - Number(keys.has('arrowleft'))) * delta * 1.4;
        const step = delta * 2.5 / model.unit / Math.max(1, Math.hypot(forward, sideways));
        const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * sideways) * step;
        const dz = (-Math.cos(yaw) * forward + Math.sin(yaw) * sideways) * step;
        if (dx && model.walkable([player[0] + dx, player[1]])) player = [player[0] + dx, player[1]];
        if (dz && model.walkable([player[0], player[1] + dz])) player = [player[0], player[1] + dz];
        camera.position.copy(model.local(player, 1.57));
        camera.lookAt(camera.position.x + Math.sin(yaw) * Math.cos(pitch), camera.position.y + Math.sin(pitch), camera.position.z - Math.cos(yaw) * Math.cos(pitch));
        if ((keys.size || pointerKeys.size || buttonKeys.size) && time - previousPosition > 60) { showPosition(); previousPosition = time; }
      } else {
        controls.update();
        camera.updateMatrixWorld();
        const occupied: { x: number; y: number; width: number }[] = [];
        for (const label of labels) {
          const node = markers.current.get(label.kind + ':' + label.id);
          if (!node) continue;
          location.copy(label.location).project(camera);
          const x = (location.x + 1) * .5 * viewportWidth;
          const y = (1 - location.y) * .5 * viewportHeight;
          const width = label.title.length * 7.5 + 14;
          const outside = x < width / 2 || x > viewportWidth - width / 2 || y < 14 || y > viewportHeight - 14;
          const overlap = label.kind === 'room' && occupied.some(other =>
            Math.abs(other.y - y) < 24 && Math.abs(other.x - x) < (other.width + width) / 2 + 5);
          node.hidden = outside || overlap;
          if (node.hidden) continue;
          node.style.left = x + 'px';
          node.style.top = y + 'px';
          occupied.push({ x, y, width });
        }
      }
      renderer.render(scene, camera);
    });
    return () => {
      cameraActions.current = null;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.remove();
      stage.removeEventListener('pointerdown', movementDown);
      stage.removeEventListener('pointerup', movementUp);
      stage.removeEventListener('pointercancel', movementUp);
      stage.removeEventListener('lostpointercapture', movementUp);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', reset);
      ground.geometry.dispose(); mat.dispose(); sun.shadow.map?.dispose();
      model.dispose(); renderer.dispose();
    };
  }, [plan, walking, start]);

  useEffect(() => { cameraActions.current?.setView(top, zoom); }, [top, zoom]);

  return <div className="viewer-canvas" ref={host}>
    {failure && <p className="viewer-unavailable" role="status">Thiết bị chưa mở được WebGL. Có thể tiếp tục đối chiếu bản 2D.</p>}
    {!walking && !failure && <>
      {plan.rooms.map(room => <span className="room-label" key={room.id} ref={node => {
        if (node) markers.current.set('room:' + room.id, node); else markers.current.delete('room:' + room.id);
      }}>{room.name}</span>)}
      {plan.openings.filter(item => item.type === 'door' && (item.id === selected || !item.reviewed)).map(door =>
        <button className={'model-pin' + (door.id === selected ? ' selected' : '')} key={door.id} onClick={() => onSelect(door.id)}
          ref={node => { if (node) markers.current.set('door:' + door.id, node); else markers.current.delete('door:' + door.id); }}
          aria-label={'Chọn cửa ' + door.id + ' trên mô hình'}>{door.id}</button>)}
    </>}
  </div>;
}
