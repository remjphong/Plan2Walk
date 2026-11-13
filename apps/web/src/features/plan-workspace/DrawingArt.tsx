export function BrandMark() {
  return <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <path d="M3 11 13 6l10 4 10-5v21l-10 5-10-4-10 5V11Z" fill="#edf5ff" stroke="#1648ee" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M13 6v21m10-17v21" stroke="#8cb5ff" strokeWidth="1.5" />
    <path d="m6 24 7-5 10 4 7-6m-5 0h5v5" stroke="#1648ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function DraftingStrip({ detail = false }: { detail?: boolean }) {
  const ticks = <path d="M316 35v22h148V35M328 48v9m12-6v6m12-9v9m12-6v6m12-14v14m12-6v6m12-9v9m12-6v6m12-14v14m12-6v6m12-9v9m8-6v6" />;
  return <div className={detail ? 'drafting-strip drafting-detail' : 'drafting-strip'} aria-hidden="true">
    <svg viewBox="0 0 480 76" preserveAspectRatio={detail ? 'xMidYMid meet' : 'none'} fill="none">
    {detail ? <>
      <path d="M12 65h168M25 65V29l62-24 69 27v33M21 32l66-27 74 29M29 34l58-22 64 25M87 12v53M48 65V47h21v18m36 0V40h26v25M9 43v22m-4-22h8M5 65h8M179 7h62m-62-4v8m62-8v8" />
      <path d="M191 24v39h57v-9h-47V24zM193 32l7-7m-7 16 7-7m-7 16 7-7m-7 16 7-7m-1 10 8-8m1 8 8-8m1 8 8-8m1 8 8-8m1 8 8-8M258 23v41m-4-41h8m-8 41h8" />
      {ticks}
    </> : <>
      <g transform="translate(-306 0)">{ticks}</g>
      <g transform="translate(157 0)">
      <path d="M16 14v52h53M16 17h47M7 14h18M7 66h18m45-4v8M85 42h39m-6-5 6 5-6 5" />
      <path d="M16 17a49 49 0 0 1 49 49" strokeDasharray="4 3" />
      <path d="M142 63h73V19l-11 9v21h-62zM147 60l10-10m0 10 10-10m0 10 10-10m0 10 10-10m0 10 10-10m0 10 10-10m-1-3 8-8m-8-1 8-8M225 19v44m-4-44h8m-8 44h8M245 62h52m-43 5V39h12v28m-5-18h28v10h-28" />
      </g>
    </>}
    </svg>
    {detail && <span className="tracing-fold" />}
  </div>;
}

export function MaterialSamples() {
  return <div className="material-samples" aria-hidden="true">
    <span className="torn-paper" />
    <i /><i /><i />
  </div>;
}

export function StudioFooter() {
  return <div className="studio-footer" aria-hidden="true">
    <span className="torn-paper" />
    <DraftingStrip />
    <MaterialSamples />
  </div>;
}
