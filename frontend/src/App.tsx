import { useMemo, useState, useCallback, type ChangeEvent } from 'react';
import { demoFloorPlan } from '../../shared/contract.ts';
import RoomViewer from './RoomViewer';
import { adaptLegacy,parsePlan,type FloorPlanV1 } from '../../shared/v1.ts';
import { compileGeometry } from '../../geometry/engine.ts';
import { csvReport,type AssetReport } from '../../assets/resolver.ts';
import ReviewPanel,{download} from './ReviewPanel';

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export default function App() {
  const [plan, setPlan] = useState<FloorPlanV1>(adaptLegacy(demoFloorPlan));
  const [editor, setEditor] = useState(pretty(adaptLegacy(demoFloorPlan)));
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [source, setSource] = useState('Dữ liệu mẫu (chưa gọi AI)');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const geometry=useMemo(()=>compileGeometry(plan),[plan]);
  const dims={width:geometry.bounds.maxX-geometry.bounds.minX,depth:geometry.bounds.maxZ-geometry.bounds.minZ,approximate:!plan.scale.verified};
  const [reports,setReports]=useState<AssetReport[]>([]);
  const [fileHash,setFileHash]=useState<string|null>(null);
  const onReports=useCallback((r:AssetReport[])=>setReports(r),[]);
  const updatePlan=(p:FloorPlanV1)=>{setPlan(p);setEditor(pretty(p));};

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;
    setFileHash(null);
    if(next && (!['image/png','image/jpeg'].includes(next.type)||next.size>3*1024*1024)){setError('Chỉ nhận PNG/JPEG dưới 3 MB');return;}
    setFile(next);
    setError('');
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(next ? URL.createObjectURL(next) : null);
    if(next){try{const img=new Image();const url=URL.createObjectURL(next);img.src=url;await img.decode();URL.revokeObjectURL(url);setFileHash(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await next.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join(''));
    updatePlan({schemaVersion:'1.0',imageMetadata:{width:img.naturalWidth,height:img.naturalHeight,name:next.name},scale:{metersPerPixel:null,verified:false,evidence:null},levels:[{id:'level-0',elevation_m:null}],rooms:[],walls:[],openings:[],objects:[],warnings:[],unknowns:[],unsupportedFeatures:[],processingStatus:'needs_review'});setSource('Ảnh mới — chưa nhận diện');}catch{setError('Không giải mã được ảnh đã chọn.');setFile(null);setImageUrl(null);}}
  }

  async function runAnalysis() {
    if (!file) { setError('Vui lòng chọn ảnh JPG hoặc PNG trước.'); return; }
    setBusy(true); setError('');
    const form = new FormData(); form.append('floorplan', file);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      const validated = parsePlan(body.plan);
      setPlan(validated);
      setEditor(pretty(validated));
      setSource('Groq API — cần kiểm tra lại kích thước và vị trí');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Có lỗi xảy ra.');
    } finally { setBusy(false); }
  }

  function useSample() {
    setPlan(adaptLegacy(demoFloorPlan)); setEditor(pretty(adaptLegacy(demoFloorPlan))); setImageUrl(null); setFile(null);setFileHash(null);
    setSource('Dữ liệu mẫu (chưa gọi AI)'); setError('');
  }

  function applyManualJson() {
    try {
      const value = parsePlan(JSON.parse(editor));
      setPlan(value); setSource('JSON đã chỉnh sửa thủ công'); setError(''); setEditing(false);
    } catch {
      setError('JSON chưa hợp lệ. Kiểm tra cấu trúc và các giá trị ratio từ 0 đến 1.');
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-icon">P<span>2</span>W</div><div><strong>Plan2Walk</strong><small>AI-assisted 2D → 3D</small></div></div>
        <div className="pill"><span className="dot"/> V1 · Human review</div>
      </header>
      <main className="main-grid">
        <aside className="sidepanel">
          <div className="section-marker">01 / INPUT</div>
          <h1>Từ bản vẽ đến <em>không gian thật.</em></h1>
          <p>Chọn bản vẽ <strong>phòng đa giác hoặc nhiều phòng</strong>. Groq đọc thông số, thuật toán Three.js dựng hình để bạn đi lại và quan sát.</p>
          <label className="upload-box">
            <input type="file" accept="image/png,image/jpeg" onChange={handleFile}/>
            <span className="upload-symbol">⇧</span>
            <b>{file ? file.name : 'Chọn ảnh bản vẽ 2D'}</b>
            <small>JPG / PNG · tối đa 3 MB</small>
          </label>
          {imageUrl && <div className="preview"><img src={imageUrl} alt="Bản vẽ đã tải lên" /></div>}
          <button className="primary" disabled={busy || !file} onClick={runAnalysis}>{busy ? 'Đang đọc bản vẽ…' : '✦ Phân tích & tạo 3D'}</button>
          <button className="secondary" onClick={useSample}>Xem phòng 3D mẫu ngay</button>
          <div className="data-status"><span className="dot"/><div><b>Nguồn dữ liệu</b><small>{source}</small></div></div>
          <div className="facts"><div><small>Chiều ngang</small><b>{dims.width.toFixed(1)} m</b></div><div><small>Chiều sâu</small><b>{dims.depth.toFixed(1)} m</b></div></div>
          {dims.approximate && <div className="notice">⚠ Kích thước đang là <strong>ước lượng để xem trước</strong>, không dùng làm số đo thi công.</div>}
          {plan.warnings.length > 0 && <details className="warnings"><summary>Ghi chú kiểm tra ({plan.warnings.length})</summary>{plan.warnings.map((text, i) => <p key={i}>• {text}</p>)}</details>}
          {error && <div className="error" role="alert">{error}</div>}
          <button className="text-button" onClick={() => setEditing(!editing)}>{editing ? 'Ẩn JSON' : '⌘ Xem / sửa dữ liệu AI (JSON)'}</button>
          {editing && <div className="editor"><textarea spellCheck={false} value={editor} onChange={(e)=>setEditor(e.target.value)} /><button className="secondary" onClick={applyManualJson}>Áp dụng JSON vào 3D</button></div>}
        </aside>
        <section className="viewer-panel">
          <div className="viewer-top"><div><div className="section-marker">02 / IMMERSIVE VIEW</div><h2>Không gian 3D</h2></div><div className="viewer-chip">Three.js · Real-time</div></div>
          <RoomViewer plan={plan} onReports={onReports}/>
          <div className="viewer-footer"><span>W A S D — di chuyển</span><span>CHUỘT — xoay nhìn</span><span>ESC — thoát</span></div>
          <div className="notice">Trạng thái: {geometry.status} · {plan.rooms.length} phòng · {plan.openings.length} cửa · {plan.objects.length} đồ vật</div>
          <details><summary>Lỗi / giả định hình học ({geometry.issues.length})</summary>{geometry.issues.map((e,i)=><p key={i}>{e.code} · {e.id}: {e.message}</p>)}</details>
          <ReviewPanel key={fileHash??'sample'} plan={plan} imageUrl={plan.imageMetadata.name==='legacy-synthetic'?null:imageUrl} onChange={updatePlan} fileHash={fileHash}/>
          <section className="render-report"><h2>Đồ vật chưa có mô hình / Báo cáo dựng hình</h2><p>{reports.filter(r=>r.status!=='exact_asset').length}/{reports.length} đối tượng cần kiểm tra</p><button onClick={()=>download('asset-report.json',pretty(reports))}>Xuất JSON</button><button onClick={()=>download('asset-report.csv',csvReport(reports),'text/csv;charset=utf-8')}>Xuất CSV</button><div className="table-scroll"><table><thead><tr><th>Đồ vật / phòng</th><th>Vị trí / độ tin cậy</th><th>Trạng thái / nguyên nhân</th><th>Xử lý</th></tr></thead><tbody>{reports.map(r=><tr key={r.id}><td>{r.label}<small>{r.room??'Chưa gán phòng'} · {r.category}</small></td><td>{JSON.stringify(r.bbox)}<small>{r.confidence??'unknown'}</small></td><td>{r.status}<small>{r.reason}</small></td><td>{r.action}</td></tr>)}</tbody></table></div></section>
        </section>
      </main>
      <footer className="app-footer">Prototype nghiên cứu · AI là công cụ nhận diện dữ liệu, không tự thiết kế hoặc xác nhận kích thước kiến trúc.</footer>
    </div>
  );
}
