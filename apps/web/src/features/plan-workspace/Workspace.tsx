import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Box, ChevronLeft, ChevronRight, Crosshair, DoorOpen, FileText, Footprints, Keyboard, Layers3, MousePointer2, Move, PanelLeft, Ruler, Scan, TriangleAlert } from 'lucide-react';
import { buildGeometry, calibrate, createOpening, removeOpening, updateOpening, type Opening, type Plan, type Point } from '@plan2walk/floorplan';
import { analyzePreview, AnalysisError } from '../../api/plans';
import type { Position } from '../walkthrough/Viewer';
import { BrandMark, DraftingStrip, MaterialSamples, StudioFooter } from './DrawingArt';
import { DoorInspector, ScaleInspector } from './Inspector';
import { PlanOverlay } from './PlanOverlay';
import { OpenScreen, SourceScreen, ZoomControls } from './SourceScreen';
import { cropPreview, fullRegion, openSource, type PagePreview, type Region, type Source } from './source';

const Viewer = lazy(() => import('../walkthrough/Viewer').then(module => ({ default: module.Viewer })));

class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="viewer-unavailable">
      <p role="alert">Không thể tải mô hình 3D. Bạn vẫn có thể đối chiếu bản 2D.</p>
      <button className="outline" onClick={() => window.location.reload()}>Tải lại trang</button>
      <p>Bạn sẽ cần mở lại bản vẽ sau khi tải lại.</p>
    </div>;
  }
}

type Screen = 'open' | 'source' | 'processing' | 'error' | 'region' | 'review' | 'walk-ready' | 'walk';
type Draft = { plan: Plan; image: PagePreview };
const shortcutItems = [
  ['1', 'Nguồn'], ['2', 'Đối chiếu'], ['3', 'Chọn vị trí đi thử'],
  ['W A S D', 'Di chuyển'], ['← →', 'Xoay hướng nhìn'], ['Kéo chuột', 'Nhìn quanh'], ['Esc', 'Về tổng thể'],
];
const walkButtons = [
  { key: 'w', label: 'Đi tới' }, { key: 'a', label: 'Sang trái' },
  { key: 's', label: 'Đi lùi' }, { key: 'd', label: 'Sang phải' },
] as const;

function defaultStart(plan: Plan, geometry: ReturnType<typeof buildGeometry>): Point | null {
  for (const room of plan.rooms) {
    const xs = room.polygon.map(p => p[0]), ys = room.polygon.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
    for (const x of [.5, .25, .75]) for (const y of [.5, .25, .75]) {
      const point: Point = [minX + w * x, minY + h * y];
      if (geometry.walkable(point)) return point;
    }
  }
  return null;
}

export function Workspace() {
  const [screen, setScreen] = useState<Screen>('open');
  const [source, setSource] = useState<Source>();
  const [index, setIndex] = useState(1);
  const [page, setPage] = useState<PagePreview>();
  const [regions, setRegions] = useState<Record<number, Region>>({});
  const [preview, setPreview] = useState<PagePreview>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<Opening | null>(null);
  const [measure, setMeasure] = useState(false);
  const [marks, setMarks] = useState<Point[]>([]);
  const [showIssues, setShowIssues] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const [top, setTop] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [planZoom, setPlanZoom] = useState(1);
  const [pan, setPan] = useState(false);
  const panOrigin = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [startError, setStartError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusCrop, setFocusCrop] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const shortcuts = useRef<HTMLDialogElement>(null);
  const overviewButton = useRef<HTMLButtonElement>(null);
  const walkExit = useRef<HTMLButtonElement>(null);
  const active = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const tab = screen === 'review' ? 1 : screen.startsWith('walk') ? 2 : 0;
  const region = regions[index] ?? fullRegion;
  const plan = draft?.plan;
  const geometry = useMemo(() => plan ? buildGeometry(plan) : null, [plan]);
  const verified = plan?.scale.status === 'verified';

  function cancelWork() {
    active.current?.abort();
    active.current = null;
    return ++sequence.current;
  }

  function resetReview() {
    setDraft(null); setSelected(null); setPending(null); setMeasure(false); setMarks([]); setShowIssues(false);
    setPosition(null); setStart(null); setEditError(''); setStartError(''); setOverlay(true); setTop(false); setZoom(1); setPlanZoom(1);
    setPan(false);
  }

  async function openFile(file: File) {
    const request = cancelWork();
    source?.close();
    setSource(undefined); setPage(undefined); setScreen('open'); setError(''); setLoading(true); setFocusCrop(false);
    setRegions({}); setPreview(undefined); resetReview();
    let next: Source | undefined;
    try {
      next = await openSource(file);
      const first = await next.page(1);
      if (request !== sequence.current) { next.close(); return; }
      setIndex(1); setPage(first); setSource(next); setScreen('source');
    } catch (caught) {
      next?.close();
      if (request === sequence.current) setError((caught as Error).message);
    } finally { if (request === sequence.current) setLoading(false); }
  }

  async function choosePage(next: number) {
    if (!source || next === index) return;
    const request = cancelWork();
    setIndex(next); setPage(undefined); setError(''); resetReview();
    try {
      const nextPage = await source.page(next);
      if (sequence.current === request) setPage(nextPage);
    } catch {
      if (sequence.current === request) setError('Không đọc được trang này. Hãy chọn trang khác.');
    }
  }

  function setRegion(next: Region) {
    setRegions(value => ({ ...value, [index]: next }));
    if (draft) resetReview();
  }

  function showDraft(next: Plan, image: PagePreview) {
    setDraft({ plan: next, image });
    const door = next.openings.find(item => item.type === 'door' && !item.reviewed) ?? next.openings.find(item => item.type === 'door');
    setSelected(door?.id ?? null);
    setPending(door ?? null);
    setScreen('review');
  }

  async function analyze() {
    if (!source || !page) return;
    const request = cancelWork();
    const controller = new AbortController();
    active.current = controller;
    setPreview(page); setScreen('processing'); setError('');
    setShowIssues(false); setMeasure(false); setMarks([]); setEditError('');
    try {
      const cropped = await cropPreview(page, region);
      if (request !== sequence.current) return;
      const image = { ...cropped, text: [] };
      setPreview(image);
      const next = await analyzePreview(cropped.blob, cropped.text, controller.signal, cropped.drawing);
      if (request === sequence.current) showDraft(next, image);
    } catch (caught) {
      if (request !== sequence.current) return;
      setError(caught instanceof TypeError ? 'Mất kết nối với dịch vụ. Hãy thử lại.' : (caught as Error).message);
      setScreen(caught instanceof AnalysisError && caught.code === 'NEEDS_REGION' ? 'region' : 'error');
    } finally { if (active.current === controller) active.current = null; }
  }

  function sourceTab() {
    if (screen === 'processing') cancelWork();
    setError(''); setFocusCrop(false); setScreen(source ? 'source' : 'open');
  }

  function selectDoor(id: string) {
    setSelected(id); setPending(plan?.openings.find(item => item.id === id) ?? null);
    setMeasure(false); setEditError(''); setShowIssues(false); setOverlay(true);
    setPan(false);
  }

  function applyDoor() {
    if (!plan || !draft || !pending) return;
    try {
      const updated = pending.id ? updateOpening(plan, pending.id, pending) : createOpening(plan, pending);
      const door = pending.id ? updated.openings.find(item => item.id === pending.id)! : updated.openings.at(-1)!;
      setDraft({ ...draft, plan: updated });
      setSelected(door.id); setPending(door);
      setEditError('');
    } catch (caught) { setEditError((caught as Error).message); }
  }

  function addDoor() {
    const wall = plan?.walls.find(item => item.id === pending?.wallId) ?? plan?.walls[0];
    if (!wall) return;
    setSelected(null); setMeasure(false); setShowIssues(false); setEditError(''); setOverlay(true);
    setPan(false);
    setPending({ id: '', type: 'door', wallId: wall.id, width: 0, offset: .5, reviewed: false });
  }

  function removeDoor() {
    if (!plan || !draft || !pending?.id) return;
    setDraft({ ...draft, plan: removeOpening(plan, pending.id) });
    setPending(null); setSelected(null); setEditError('');
  }

  function enterWalk() {
    if (!plan || !geometry) return;
    setStart(start && geometry.walkable(start) ? start : defaultStart(plan, geometry));
    setPosition(null); setStartError(''); setMeasure(false); setScreen('walk-ready');
    setPan(false);
  }

  function returnOverview() {
    setPosition(null); setScreen('review');
    requestAnimationFrame(() => overviewButton.current?.focus());
  }

  useEffect(() => { if (screen === 'walk') walkExit.current?.focus(); }, [screen]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || shortcuts.current?.open ||
        (event.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(event.target.tagName))) return;
      if (event.key === '1') sourceTab();
      if (event.key === '2' && draft) returnOverview();
      if (event.key === '3' && draft && screen !== 'walk') enterWalk();
      if (event.key === '?' && !shortcuts.current?.open) shortcuts.current?.showModal();
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });

  const stage = ['review', 'walk-ready', 'walk'].includes(screen) && draft && plan && geometry;
  const busy = screen === 'processing';
  const statusScreen = busy || screen === 'error' || screen === 'region';
  const title = screen === 'source' ? 'Chọn trang và vùng' : screen === 'review' ? 'Đối chiếu mặt bằng' :
    screen.startsWith('walk') ? 'Đi thử mặt bằng' : busy ? 'Đang phân tích' : 'Phân tích bản vẽ';
  const scaleText = verified ? 'Tỉ lệ theo mốc A–B · Chiều cao minh họa' : 'Bố cục tương đối · Chưa hiệu chuẩn';
  const incompleteFloor = geometry?.issues.some(issue => issue.code === 'INCOMPLETE_FLOOR_EVIDENCE');
  const doorIssues = geometry?.issues.filter(issue => issue.code === 'REVIEW_OPENING' &&
    plan?.openings.some(opening => opening.id === issue.entityId && opening.type === 'door')).length ?? 0;
  const issueCount = geometry?.issues.length ?? 0;
  const issueLabel = issueCount === doorIssues ? doorIssues + ' cửa cần kiểm tra' : issueCount + ' vấn đề cần kiểm tra';

  function beginMeasure() {
    if (!plan) return;
    setMeasure(true); setShowIssues(false); setPan(false);
    setMarks(plan.scale.status === 'verified' ? [plan.scale.a, plan.scale.b] : []);
  }

  return <div className="app-shell">
    <header className="app-header">
      <button className="brand" onClick={sourceTab} aria-label="Plan2Walk · Nguồn"><BrandMark /><span>Plan2Walk</span></button>
      <nav className="tabs" aria-label="Quy trình" style={{ '--active-tab': tab } as React.CSSProperties}>
        <span className="tab-indicator" aria-hidden="true" />
        <button aria-current={tab === 0 ? 'step' : undefined} onClick={sourceTab}><FileText aria-hidden="true" />Nguồn</button>
        <button aria-current={tab === 1 ? 'step' : undefined} disabled={!draft} onClick={returnOverview}><Layers3 aria-hidden="true" />Đối chiếu</button>
        <button aria-current={tab === 2 ? 'step' : undefined} disabled={!draft} onClick={enterWalk}><Footprints aria-hidden="true" />Đi thử</button>
      </nav>
      <button className="shortcut-button" onClick={() => shortcuts.current?.showModal()}><Keyboard /> <span>Phím tắt</span></button>
    </header>
    <input ref={input} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
      onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void openFile(file); }} />
    <dialog ref={shortcuts} className="shortcut-dialog" onClick={event => { if (event.target === event.currentTarget) shortcuts.current?.close(); }}>
      <h2>Phím tắt</h2>
      <dl>{shortcutItems.map(([key, label]) => <div key={key}><dt>{label}</dt><dd><kbd>{key}</kbd></dd></div>)}</dl>
      <button className="primary full" onClick={() => shortcuts.current?.close()}>Đóng</button>
    </dialog>
    {screen === 'open' ? <OpenScreen onFile={openFile} onBrowse={() => input.current?.click()} error={error} loading={loading} /> :
      <main className="work-area">
        <div className="taskbar">
          <div className="task-copy"><h1>{title}</h1><p className="metadata" title={source?.name}>
            <span>{source?.name}</span>{source && <><i /><span>{source.pages > 1 ? 'Trang ' + index + ' / ' + source.pages : 'Trang ' + index}</span></>}</p></div>
          <DraftingStrip detail />
          <div className="task-actions">
            {screen === 'source' && <><button className="outline" onClick={() => input.current?.click()}>Đổi bản vẽ</button>
              <button className="primary" onClick={analyze} disabled={!page}>Phân tích bản vẽ</button></>}
            {statusScreen && <button className="outline" onClick={() => input.current?.click()}>Đổi bản vẽ</button>}
            {screen === 'review' && <>{issueCount > 0 && <button className="issue-toggle" aria-expanded={showIssues} onClick={() => {
              setShowIssues(!showIssues); setMeasure(false);
            }}><AlertCircle />{issueLabel}</button>}
              <button className="primary" ref={overviewButton} onClick={enterWalk}>Đi thử <ArrowRight /></button></>}
            {tab === 2 && <button className="outline" onClick={returnOverview}><ChevronLeft /> Về tổng thể</button>}
          </div>
        </div>
        {screen === 'source' && source && <>{error && <p role="alert" className="page-error">{error}</p>}<SourceScreen
          source={source} page={page} index={index} region={region} setRegion={setRegion} setPage={choosePage} focusCrop={focusCrop} /></>}
        {statusScreen && preview && <section className="review-workspace status-workspace reveal">
          <div className="pane original"><h2>Bản gốc · 2D</h2><div className="plan-stage paper-grid"><div className="corner-frame" /><PlanOverlay image={screen === 'region' && page ? page : preview} /></div></div>
          <div className="pane result"><h2>Mô hình · 3D</h2><div className="status-stage drafting-grid" role={busy ? 'status' : 'alert'}>
            <div className={'status-content' + (busy ? ' analyzing' : '')}>
              <div className="status-icon">{screen === 'error' ? <TriangleAlert aria-hidden="true" /> : <Scan aria-hidden="true" />}</div>
              <h3>{busy ? 'Đang phân tích bản vẽ' : screen === 'region' ? 'Cần chọn vùng mặt bằng' : 'Chưa thể phân tích'}</h3>
              {busy && <p>Bạn có thể đổi bản vẽ trong lúc chờ.</p>}
              {!busy && <><p>{error}</p>
                <button className="primary" onClick={screen === 'region' ? () => { setFocusCrop(true); setScreen('source'); } : analyze}>
                  {screen === 'region' ? 'Chọn vùng' : 'Thử lại'}</button>
                {screen === 'error' && <button className="text-button" onClick={() => { setFocusCrop(true); setScreen('source'); }}>Về chọn trang và vùng</button>}
              </>}
            </div>
          </div></div>
        </section>}
        {(screen === 'source' || statusScreen) && <StudioFooter />}
        {stage && draft && plan && geometry && <section className={'review-workspace ' + (screen === 'walk' ? 'walking' : '')}>
          <div className="pane original" hidden={screen === 'walk'}>
            <h2>Bản gốc · 2D</h2>
            <div className="plan-stage paper-grid">
              <div className="corner-frame" />
              {screen === 'review' && <div className="plan-mode-tools" role="group" aria-label="Công cụ bản gốc">
                <button className="square" aria-label="Chọn trên bản gốc" title="Chọn trên bản gốc" aria-pressed={!pan && !measure && pending?.id !== ''}
                  onClick={() => { setPan(false); setMeasure(false); setMarks([]); setOverlay(true); if (pending?.id === '') setPending(null); }}><MousePointer2 aria-hidden="true" /></button>
                <button className="square" aria-label="Kéo bản vẽ" title="Kéo bản vẽ đã phóng to" aria-pressed={pan}
                  onClick={() => { setPan(!pan); setMeasure(false); }}><Move aria-hidden="true" /></button>
                <button className="square" aria-label="Đo tỉ lệ trên bản gốc" title="Đo tỉ lệ" aria-pressed={measure} onClick={beginMeasure}><Ruler aria-hidden="true" /></button>
                <button className="square overlay-toggle" aria-label="Lớp đối chiếu 2D" title="Lớp đối chiếu 2D" aria-pressed={overlay}
                  onClick={() => setOverlay(!overlay)}><PanelLeft aria-hidden="true" /></button>
                <button className="square" aria-label="Thêm cửa trên bản gốc" title="Thêm cửa" aria-pressed={!pan && !measure && pending?.id === ''}
                  onClick={addDoor}><DoorOpen aria-hidden="true" /></button>
              </div>}
              <div className={'plan-scroll' + (pan ? ' panning' : '')}
                onPointerDown={event => {
                  if (!pan || event.button !== 0 || !event.isPrimary) return;
                  const node = event.currentTarget;
                  panOrigin.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
                  node.setPointerCapture(event.pointerId);
                }}
                onPointerMove={event => {
                  const origin = panOrigin.current;
                  if (!origin || origin.id !== event.pointerId) return;
                  event.currentTarget.scrollTo(origin.left + origin.x - event.clientX, origin.top + origin.y - event.clientY);
                }}
                onLostPointerCapture={event => { if (panOrigin.current?.id === event.pointerId) panOrigin.current = null; }}>
                <PlanOverlay image={draft.image} plan={plan} selected={selected} pending={pending} visible={overlay} zoom={planZoom}
                  mode={screen === 'walk-ready' ? 'start' : measure ? 'measure' : 'select'}
                  marks={measure ? marks : verified && plan.scale.status === 'verified' ? [plan.scale.a, plan.scale.b] : []}
                  start={screen === 'walk-ready' ? start : null} onSelect={selectDoor}
                  onWidth={width => { if (pending) { setPending({ ...pending, width }); setEditError(''); } }}
                  onPoint={point => {
                    if (screen === 'walk-ready') {
                      if (geometry.walkable(point)) { setStart(point); setStartError(''); }
                      else setStartError('Chọn điểm trong phòng, cách xa tường.');
                    } else setMarks(points => points.length === 2 ? [point] : [...points, point]);
                  }} />
              </div>
            </div>
            {screen !== 'walk' && <div className="plan-tools"><ZoomControls value={planZoom} change={setPlanZoom} /></div>}
          </div>
          <div className="pane result">
            {screen !== 'walk' && <h2>Mô hình · 3D</h2>}
              <div className={'model-stage drafting-grid' + (screen === 'walk' ? ' immersive' : '')}>
                <ViewerBoundary>
                  <Suspense fallback={<p className="viewer-unavailable" role="status">Đang mở mô hình 3D…</p>}>
                    <Viewer plan={plan} walking={screen === 'walk'} start={screen === 'walk' ? start : null} top={top} zoom={zoom}
                      selected={selected} onSelect={selectDoor} onPosition={setPosition} onExit={returnOverview} />
                  </Suspense>
                </ViewerBoundary>
                {screen !== 'walk' && <>
                  <div className="model-tools">
                    <button className="square" aria-pressed={top} title="Nhìn từ trên" aria-label="Nhìn từ trên" onClick={() => setTop(!top)}><Box /></button>
                  </div>
                  <div className="model-bottom"><ZoomControls value={zoom} change={setZoom} />
                    <div className="axes" title="Trục mô hình"><svg viewBox="0 0 66 58" aria-hidden="true"><path d="M27 43V12m0 31h28M27 43l-15 10"/><path d="m23 17 4-5 4 5m19 22 5 4-5 4"/><text x="22" y="10">Z</text><text x="56" y="47">X</text></svg></div>
                  </div>
                </>}
                {screen === 'walk' && <>
                  <p className="room-chip">{position?.room || 'Đi thử'}</p><div className="crosshair" aria-hidden="true"><Crosshair /></div>
                  <div className="minimap"><PlanOverlay image={draft.image} plan={plan} selected={selected} mini position={position} start={start} /></div>
                  <div className="walk-controls" role="group" aria-label="Di chuyển">
                    {walkButtons.map(({ key, label }) => <button type="button" key={key} aria-label={label} data-walk-key={key}>{key.toUpperCase()}</button>)}
                  </div>
                  <button className="outline walk-exit" ref={walkExit} onClick={returnOverview}><strong>Esc</strong> · Thoát</button>
                </>}
              </div>
          </div>
          {screen !== 'walk' && <aside className="inspector">
                {screen === 'walk-ready' ? <div className="inspector-inner">
                  <h2>Chọn điểm đứng</h2><p className="field-help">Bấm một điểm trong phòng ở bản gốc. Dùng WASD để đi và kéo chuột để nhìn quanh.</p>
                  {incompleteFloor && <p className="field-help"><TriangleAlert aria-hidden="true" size={15} /> Một số vùng sàn còn thiếu nét đối chiếu. Lượt đi này dùng bản nháp.</p>}
                  {startError && <p className="inline-error" role="alert">{startError}</p>}
                  <button className="primary full" onClick={() => { if (start) setScreen('walk'); }} disabled={!start}>Bắt đầu đi</button>
                  <button className="outline full" onClick={() => setStart(defaultStart(plan, geometry))}>Đặt lại vị trí</button>
                </div> : measure ? <ScaleInspector marks={marks} reset={() => setMarks([])}
                  cancel={() => { setMeasure(false); setMarks([]); }} confirm={meters => {
                    if (marks.length !== 2) throw new Error('Chọn đủ hai mốc trên bản gốc.');
                    setDraft({ ...draft, plan: calibrate(plan, marks[0], marks[1], meters) }); setMeasure(false);
                  }} /> : showIssues ? <div className="inspector-inner"><h2>Cần đối chiếu</h2>
                  <ul className="issue-list">{geometry.issues.map((issue, i) => <li key={i}>
                    {plan.openings.some(item => item.id === issue.entityId && item.type === 'door') ?
                      <button className="issue-row" onClick={() => selectDoor(issue.entityId!)}><TriangleAlert aria-hidden="true" /><span>{issue.message}</span><ChevronRight aria-hidden="true" /></button> :
                      <div className="issue-row"><AlertCircle aria-hidden="true" /><span>{issue.message}</span></div>}
                  </li>)}</ul>
                </div> : pending ? <DoorInspector plan={plan} door={pending} error={editError} adding={!pending.id}
                  change={door => { setPending(door); setEditError(''); }} apply={applyDoor}
                  add={addDoor} cancel={() => { setPending(null); setEditError(''); }} remove={removeDoor} /> :
                  <div className="inspector-inner"><h2>Đối chiếu</h2><p className="field-help">Chọn một cửa trên bản gốc để kiểm tra tường chủ và khẩu độ.</p>
                    <button className="outline full" onClick={addDoor}>Thêm cửa</button></div>}
          </aside>}
          <footer className="workspace-status">
            <span className="torn-paper" aria-hidden="true" />
            <div className="scale-status">
              <span>{(!verified || incompleteFloor) && <TriangleAlert aria-hidden="true" />}{scaleText}{incompleteFloor ? ' · Sàn cần đối chiếu' : ''}</span>
              {screen === 'review' && !measure && <button className="primary scale-button" onClick={beginMeasure}>{verified ? 'Đo lại tỉ lệ' : 'Xác nhận tỉ lệ'}</button>}
            </div>
            <DraftingStrip />
            {screen !== 'walk' && <MaterialSamples />}
          </footer>
        </section>}
      </main>}
  </div>;
}
