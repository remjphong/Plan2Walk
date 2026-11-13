import { useState } from 'react';
import { CheckCircle2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import type { Opening, Plan, Point } from '@plan2walk/floorplan';

export function DoorInspector({ plan, door, change, apply, error, adding, cancel, remove, add }: {
  plan: Plan; door: Opening; change(door: Opening): void; apply(): void; error: string; adding: boolean;
  cancel(): void; remove(): void; add(): void;
}) {
  const scale = plan.scale.status === 'verified' ? plan.scale.metersPerPixel : null;
  const displayed = scale ? Math.round(door.width * scale * 1000) : Math.round(door.width);
  return <div className="inspector-inner">
    <h2>{adding ? 'Thêm cửa' : 'Cửa ' + door.id}</h2>
    <label>Tường chủ <select value={door.wallId} onChange={event => change({ ...door, wallId: event.target.value })}>
      {plan.walls.map(wall => <option key={wall.id}>{wall.id}</option>)}
    </select></label>
    <label>Vị trí trên tường <input type="range" min={0} max={1000} value={Math.round(door.offset * 1000)}
      onChange={event => change({ ...door, offset: Number(event.target.value) / 1000 })} /></label>
    <label>Chiều rộng <span className="input-unit"><input type="number" min={1} value={displayed || ''}
      onChange={event => change({ ...door, width: Number(event.target.value) / (scale ? scale * 1000 : 1) })} />
      <span>{scale ? 'mm' : 'px'}</span></span></label>
    {!scale && adding && <p className="field-help scale-hint"><TriangleAlert aria-hidden="true" />Chưa xác nhận tỉ lệ</p>}
    {error && <p role="alert" className="inline-error">{error}</p>}
    <button className="primary full" onClick={apply} disabled={adding && door.width <= 0}>{adding ? 'Lưu cửa' : 'Áp dụng'}</button>
    {adding ? <button className="text-button" onClick={cancel}>Hủy</button> : <>
      <div className="inspector-actions">
        <button className="text-button" onClick={add}><Plus aria-hidden="true" />Thêm cửa</button>
        <button className="text-button danger-button" onClick={remove}><Trash2 aria-hidden="true" />Xóa cửa</button>
      </div>
    </>}
  </div>;
}

export function ScaleInspector({ marks, reset, confirm, cancel }: {
  marks: Point[]; reset(): void; confirm(meters: number): void; cancel(): void;
}) {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('mm');
  const [error, setError] = useState('');
  return <form className="inspector-inner" onSubmit={event => {
    event.preventDefault();
    try {
      const number = Number(value.trim().replace(/[\s\u00a0]/g, '').replace(',', '.'));
      confirm(number / (unit === 'mm' ? 1000 : 1));
    } catch (caught) { setError((caught as Error).message); }
  }}>
    <h2>Xác nhận tỉ lệ</h2>
    <p className={marks.length === 2 ? 'field-help scale-ready' : 'field-help'} aria-live="polite">{marks.length === 2 && <CheckCircle2 aria-hidden="true" />}{marks.length === 0 ? 'Chọn mốc A trên bản gốc.' :
      marks.length === 1 ? 'Đã chọn A. Chọn tiếp mốc B.' : 'Đã chọn đủ mốc A và B.'}</p>
    <label>Khoảng cách thực <span className="input-unit"><input inputMode="decimal" value={value}
      onChange={event => { setValue(event.target.value); setError(''); }} />
      <select aria-label="Đơn vị" value={unit} onChange={event => setUnit(event.target.value)}><option>mm</option><option>m</option></select>
    </span></label>
    {error && <p role="alert" className="inline-error">{error}</p>}
    <button className="primary full" disabled={marks.length !== 2} type="submit">Xác nhận</button>
    <div className="inspector-actions scale-actions">
      <button className="outline full" type="button" onClick={cancel}>Hủy</button>
      {marks.length > 0 && <button className="outline full" type="button" onClick={reset}>Đặt lại mốc</button>}
    </div>
  </form>;
}
