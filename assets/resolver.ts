import manifest from './manifest.json';
import type { DetectedObject } from '../shared/v1.ts';
export type Asset=typeof manifest[number];
export type AssetReport={id:string;label:string;category:string;room:string|null;bbox:DetectedObject['bbox'];confidence:number|null;status:'exact_asset'|'substitute_asset'|'procedural_fallback'|'missing_asset'|'skipped_invalid';reason:string;action:string;assetId:string|null};
const normalize=(s:string)=>s.trim().toLowerCase().normalize('NFC');
export function resolveAsset(o:DetectedObject):{asset:Asset|null;report:AssetReport}{
 const asset=manifest.find(a=>a.aliases.some(s=>normalize(s)===normalize(o.category)||normalize(s)===normalize(o.label)))??null;
 const invalid=!o.bbox;
 return {asset,report:{id:o.id,label:o.label,category:o.category,room:o.room_id,bbox:o.bbox,confidence:o.confidence,status:invalid?'skipped_invalid':asset?'procedural_fallback':'missing_asset',reason:invalid?'Thiếu bbox; không tự tạo vị trí':asset?'Đang tải GLB; hiển thị khối tạm':'Không có ánh xạ model phù hợp',action:invalid?'Sửa bbox trong JSON':'Placeholder theo footprint, có nhãn',assetId:asset?.id??null}};
}
export async function loadWithFallback<T>(load:()=>Promise<T>,fallback:()=>T):Promise<{value:T;failed:boolean}>{try{return {value:await load(),failed:false};}catch{return {value:fallback(),failed:true};}}
export function csvReport(rows:AssetReport[]){const keys=['id','label','category','room','bbox','confidence','status','reason','action','assetId'] as const;const quote=(v:unknown)=>{let s=typeof v==='object'?JSON.stringify(v):String(v??'');if(/^[=+@\-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return [keys.join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\n');}
