import type { PointerEvent } from 'react';
import { distance, interpolate, project, type Opening, type Plan, type Point } from '@plan2walk/floorplan';
import type { PagePreview } from './source';
import type { Position } from '../walkthrough/Viewer';

type Props = {
  image: PagePreview; plan?: Plan; selected?: string | null; pending?: Opening | null;
  mode?: 'select' | 'measure' | 'start'; marks?: Point[]; start?: Point | null; position?: Position | null;
  onSelect?(id: string): void; onPoint?(point: Point): void; onWidth?(width: number): void;
  mini?: boolean; visible?: boolean; zoom?: number;
};

const featureNames = {
  stair: 'Cầu thang', sofa: 'Sofa', bed: 'Giường', table: 'Bàn',
  kitchen_counter: 'Quầy bếp', sink: 'Chậu rửa', toilet: 'Bồn cầu',
  unclassified: 'Vật thể chưa phân loại',
};

export function PlanOverlay({ image, plan, selected, pending, mode = 'select', marks = [], start, position, onSelect, onPoint, onWidth, mini, visible = true, zoom = 1 }: Props) {
  const w = plan?.width ?? image.width, h = plan?.height ?? image.height;
  const vector = Math.max(w, h) / 760;
  const viewBox = '0 0 ' + w + ' ' + h;
  const matching = plan?.openings.find(item => item.id === selected);
  const active = pending ?? matching;
  const activeWall = plan?.walls.find(wall => wall.id === active?.wallId);
  function pointer(event: PointerEvent<SVGSVGElement | SVGCircleElement>): Point {
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement!;
    const rect = svg.getBoundingClientRect();
    return [(event.clientX - rect.left) * w / rect.width, (event.clientY - rect.top) * h / rect.height];
  }
  const camera = position?.point ?? start;
  const heading = position?.yaw ?? Math.PI / 2;
  return <div className={'plan-image' + (mini ? ' mini-image' : '')} style={{
    aspectRatio: w + ' / ' + h, width: mini ? '100%' : 'calc(min(100%, ' + 58 * w / h + 'vh) * ' + zoom + ')',
  }}>
    <img src={image.url} alt={mini ? '' : 'Bản vẽ gốc 2D'} draggable={false} />
    {(plan || mode !== 'select') && <svg viewBox={viewBox} className={'plan-overlay ' + mode}
      aria-label={mini ? 'Sơ đồ vị trí' : 'Lớp đối chiếu bản vẽ'}
      onPointerDown={event => { if (mode !== 'select' && event.button === 0) onPoint?.(pointer(event)); }}>
      {visible && mode === 'select' && !mini && plan?.walls.map(wall =>
        <line key={wall.id} x1={wall.a[0]} y1={wall.a[1]} x2={wall.b[0]} y2={wall.b[1]} className="detected-wall" strokeWidth={2 * vector} />)}
      {visible && mode === 'select' && !mini && plan?.features?.map(({ id, type, label, bounds: [x, y, right, bottom] }) => {
        const name = type === 'unclassified' && label ? featureNames[type] + ' · ' + label : label || featureNames[type];
        return <g key={id} role="img" aria-label={name + ' · vùng nhận diện'} className={'detected-feature ' + type}>
          <title>{name + ' · vùng nhận diện'}</title>
          <rect x={x} y={y} width={right - x} height={bottom - y} rx={3 * vector} strokeWidth={1.5 * vector} />
          {(type === 'stair' || type === 'unclassified') && <text x={x + 3 * vector} y={y - 3 * vector} fontSize={13 * vector}>{featureNames[type]}</text>}
        </g>;
      })}
      {visible && mode === 'select' && !mini && plan?.openings.filter(item => item.type === 'window').map(window => {
        const wall = plan.walls.find(item => item.id === window.wallId);
        if (!wall) return null;
        const length = distance(wall.a, wall.b);
        if (!length) return null;
        const halfSpan = window.width / length / 2;
        const [x1, y1] = interpolate(wall.a, wall.b, window.offset - halfSpan);
        const [x2, y2] = interpolate(wall.a, wall.b, window.offset + halfSpan);
        return <line key={window.id} className="detected-window" x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={3 * vector}>
          <title>{'Cửa sổ ' + window.id}</title>
        </line>;
      })}
      {visible && mode === 'select' && plan && [...plan.openings.filter(item => item.type === 'door'),
        ...(!mini && pending && !pending.id ? [pending] : [])].map(opening => {
        const door = active?.id === opening.id ? active : opening;
        const wall = plan.walls.find(item => item.id === door.wallId);
        if (!wall) return null;
        const length = distance(wall.a, wall.b);
        if (!length) return null;
        const point = interpolate(wall.a, wall.b, door.offset);
        const a = interpolate(wall.a, wall.b, door.offset - door.width / length / 2);
        const b = interpolate(wall.a, wall.b, door.offset + door.width / length / 2);
        const isActive = door.id === selected || !door.id;
        const [x, y] = point;
        const shift = 36 * vector, labelWidth = Math.max(43, door.id.length * 9 + 14) * vector;
        return <g key={door.id} className={isActive ? 'opening active' : 'opening'} role={mini || !door.id ? undefined : 'button'}
          tabIndex={mini || !door.id ? undefined : 0} aria-label={mini || !door.id ? undefined : 'Chọn cửa ' + door.id + ' trên bản vẽ'}
          onClick={() => { if (door.id) onSelect?.(door.id); }} onKeyDown={event => {
            if (door.id && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect?.(door.id); }
          }}>
          {isActive && <rect className="door-focus" x={Math.min(a[0], b[0]) - 12 * vector} y={Math.min(a[1], b[1]) - 12 * vector}
            width={Math.abs(a[0] - b[0]) + 24 * vector} height={Math.abs(a[1] - b[1]) + 24 * vector} />}
          {!mini && <line className="door-target" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={24 * vector} />}
          <line className="door-gap" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={(isActive ? 4 : 2) * vector} />
          {!mini && (isActive || !door.reviewed) && <g className="door-tag" transform={'translate(' + x + ' ' + y + ')'}>
            <path className="leader" pathLength="1" d={'M0 0L' + shift + ' ' + (-shift * 1.35)} />
            <rect x={shift - 2 * vector} y={-shift * 1.35 - 21 * vector} width={labelWidth} height={23 * vector} rx={4 * vector} />
            <text x={shift - 2 * vector + labelWidth / 2} y={-shift * 1.35 - 5 * vector} fontSize={14 * vector}>{door.id || '+'}</text>
          </g>}
          {!mini && isActive && activeWall && [a, b].map((p, i) =>
            <circle key={i} className="door-handle" cx={p[0]} cy={p[1]} r={6 * vector}
              onPointerDown={event => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); }}
              onClick={event => event.stopPropagation()}
              onPointerMove={event => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                const along = project(pointer(event), activeWall).along;
                onWidth?.(Math.max(6 * vector, 2 * Math.abs(along - door.offset * length)));
              }} />)}
        </g>;
      })}
      {marks.length === 2 && <line className="measure-line" pathLength="1" x1={marks[0][0]} y1={marks[0][1]} x2={marks[1][0]} y2={marks[1][1]} />}
      {marks.map(([x, y], index) => <g key={index} className="measure-mark" transform={'translate(' + x + ' ' + y + ')'}>
        <circle r={7 * vector} /><text y={-14 * vector} fontSize={18 * vector}>{index === 0 ? 'A' : 'B'}</text>
      </g>)}
      {camera && <g transform={'translate(' + camera.join(' ') + ') rotate(' + heading * 180 / Math.PI + ')'} className="camera-pin">
        {position && <path d={'M0 0L' + (-38 * vector) + ' ' + (-58 * vector) + 'L' + (38 * vector) + ' ' + (-58 * vector) + 'Z'} />}
        <circle r={8 * vector} />
      </g>}
    </svg>}
  </div>;
}
