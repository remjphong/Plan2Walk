import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { FileUp, Maximize, Minus, Plus, RotateCcw } from 'lucide-react';
import { DraftingStrip, StudioFooter } from './DrawingArt';
import { fullRegion, type PagePreview, type Region, type Source } from './source';

export function OpenScreen({ onFile, onBrowse, error, loading }: {
  onFile(file: File): void; onBrowse(): void; error: string; loading: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  return <main className="work-area">
    <div className="taskbar"><div className="task-copy">
      <h1>Mở bản vẽ</h1><p className="intro">Chọn mặt bằng kiến trúc để dựng 3D.</p>
    </div><DraftingStrip detail /></div>
    <section className="open-screen workspace-panel reveal">
    <div className="open-content">
      <div className={'drop-zone' + (dragging ? ' is-dragging' : '')}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) onFile(file); }}>
        <FileUp className="upload-symbol" aria-hidden="true" />
        <h2>Kéo thả bản vẽ</h2>
        <button className="primary upload-button" onClick={onBrowse}>{loading ? 'Đang mở tệp…' : 'Chọn tệp'}</button>
        <p className="formats">PDF · PNG · JPG</p>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
    </div>
    <div className="open-art" aria-hidden="true" />
    </section>
    <StudioFooter />
  </main>;
}

export function ZoomControls({ value, change }: { value: number; change(n: number): void }) {
  return <div className="zoom-tools">
    <button className="square" aria-label="Vừa khung" title="Vừa khung" onClick={() => change(1)}><Maximize /></button>
    <div className="zoom-group">
      <button aria-label="Thu nhỏ" disabled={value <= 0.75} onClick={() => change(Math.max(.75, value - .15))}><Minus /></button>
      <output>{Math.round(value * 100)}%</output>
      <button aria-label="Phóng to" disabled={value >= 1.75} onClick={() => change(Math.min(1.75, value + .15))}><Plus /></button>
    </div>
  </div>;
}

function Thumbnail({ source, index, active, select }: { source: Source; index: number; active: boolean; select(): void }) {
  const [image, setImage] = useState<PagePreview>();
  useEffect(() => {
    let disposed = false;
    source.page(index).then(page => { if (!disposed) setImage(page); }).catch(() => undefined);
    return () => { disposed = true; };
  }, [source, index]);
  return <button className={'thumbnail' + (active ? ' current' : '')} aria-current={active ? 'page' : undefined}
    onClick={select} aria-label={'Trang ' + index}>
    {image && <img src={image.url} alt="" />}<span>{String(index).padStart(2, '0')}</span>
  </button>;
}

type Drag = { x: number; y: number; anchorX: number; anchorY: number };
const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];

export function SourceScreen({ source, page, index, region, setRegion, setPage, focusCrop }: {
  source: Source; page?: PagePreview; index: number; region: Region; setRegion(region: Region): void;
  setPage(index: number): void; focusCrop: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const drag = useRef<Drag | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focusCrop) sheet.current?.focus(); }, [focusCrop]);
  const limited = source.pages > 6;
  const first = limited ? Math.max(1, Math.min(source.pages - 4, index - 2)) : 1;
  const pages = Array.from({ length: limited ? 5 : source.pages }, (_, i) => first + i);
  const hasRegion = region.width < .999 || region.height < .999;

  function getPoint(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  }
  function start(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const { x, y } = getPoint(event);
    const corner = (event.target as SVGElement).dataset.corner;
    const [cx, cy] = corner ? corners[Number(corner)] : [1, 1];
    drag.current = { x, y, anchorX: corner ? region.x + (1 - cx) * region.width : x,
      anchorY: corner ? region.y + (1 - cy) * region.height : y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start) return;
    const { x, y } = getPoint(event);
    if (Math.abs(x - start.x) + Math.abs(y - start.y) < .006) return;
    const width = Math.abs(x - start.anchorX), height = Math.abs(y - start.anchorY);
    if (width < .02 || height < .02) return;
    setRegion({ x: Math.min(x, start.anchorX), y: Math.min(y, start.anchorY), width, height });
  }
  return <div className={'source-screen workspace-panel' + (source.pages > 1 ? ' with-pages' : '')}>
    {source.pages > 1 && <aside className="page-rail">
      <h2>Các trang</h2>
      <div className="page-list">{pages.map(number => <Thumbnail key={source.name + number} source={source}
        index={number} active={index === number} select={() => { setZoom(1); setPage(number); }} />)}</div>
      {limited && <label className="page-jump">Đến trang <input type="number" min={1} max={source.pages} value={index}
        onChange={event => { const value = Number(event.target.value); if (value >= 1 && value <= source.pages) setPage(value); }} /></label>}
    </aside>}
    <div className="source-stage drafting-grid">
      <div className="source-scroll">
        {page ? <div className="source-sheet" ref={sheet} tabIndex={-1} style={{
          width: 'calc(min(' + Math.min(1060, page.width) + 'px, 100cqw, ' + 100 * page.width / page.height + 'cqh) * ' + zoom + ')',
          aspectRatio: page.width + ' / ' + page.height }}>
          <img src={page.url} alt={'Bản vẽ gốc, trang ' + index} draggable={false} />
          <svg className="crop-overlay" viewBox={'0 0 ' + page.width + ' ' + page.height}
            onPointerDown={start} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
            aria-label="Kéo để khoanh vùng mặt bằng">
            {hasRegion && <>
              <path className="crop-shade" fillRule="evenodd" d={'M0 0H' + page.width + 'V' + page.height + 'H0Z M' +
                (region.x * page.width) + ' ' + (region.y * page.height) + 'h' + (region.width * page.width) +
                'v' + (region.height * page.height) + 'h-' + (region.width * page.width) + 'Z'} />
              <rect className="crop-outline" x={region.x * page.width} y={region.y * page.height}
                width={region.width * page.width} height={region.height * page.height} />
              {corners.map(([x, y], i) => <rect key={i} data-corner={i} className="crop-handle" width={14} height={14}
                x={(region.x + x * region.width) * page.width - 7} y={(region.y + y * region.height) * page.height - 7} />)}
            </>}
          </svg>
        </div> : <p role="status">Đang đọc trang…</p>}
      </div>
      <div className="source-tools">
        <ZoomControls value={zoom} change={setZoom} />
        <p className="source-hint">{hasRegion ? 'Kéo các góc để chỉnh vùng' : 'Kéo trên bản vẽ để chọn một vùng'}</p>
        <button className="outline" onClick={() => setRegion(fullRegion)} disabled={!hasRegion}><RotateCcw /> Đặt lại vùng</button>
      </div>
    </div>
  </div>;
}
