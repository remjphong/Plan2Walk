import { z } from 'zod';
import { FloorPlanV1Schema, type FloorPlanV1 } from '../shared/v1.ts';
import { inspectImage, AppError } from './image.ts';
export interface VisionProvider {analyze(image:Buffer,mime:string):Promise<FloorPlanV1>}
export type VerifiedExample={image:Buffer;mime:string;plan:FloorPlanV1;reviewedBy:string;split:'development';family:string};
const schema=z.toJSONSchema(FloorPlanV1Schema);
const PROMPT=`Extract a floorplan as JSON using the attached schema. Image x right, y down in PIXELS of the ORIGINAL image. Rooms are polygons; do not force rectangular outlines. Explicit wall centerlines only, deduplicate shared walls. Openings attach to wall IDs with center offset in [0,1], width in pixels. Object bbox is [left,top,local footprint width,local footprint depth] before clockwise rotation about its center; source_bbox is the axis-aligned observed image box. Preserve original labels, include unknown categories. Use null for missing locations/dimensions, never invent center positions. Geometry is produced by deterministic code downstream. Do not invent rooms, furniture, walls or OCR. Scale requires legible dimension evidence; verified=false always until human review. Elevations/heights/thickness/swing unknown => null. Use levels for separate floors. Multiple drawings on one page => unsupportedFeatures and needs_review; do not join them as one house. Empty arrays allowed when nothing is supported. processingStatus always needs_review or unsupported. Warnings in Vietnamese. Return every required field. JSON schema: ${JSON.stringify(schema)}`;
export class GroqVisionProvider implements VisionProvider {
 constructor(private options:{fetcher?:typeof fetch;key?:string;model?:string;timeoutMs?:number;examples?:VerifiedExample[]}={}){}
 async analyze(image:Buffer,mime:string){
 const metadata=inspectImage(image,mime),key=this.options.key??process.env.GROQ_API_KEY?.trim();
 if(!key)throw new AppError('MISSING_GROQ_KEY',503,'Chưa cấu hình GROQ_API_KEY. Có thể dùng dữ liệu mẫu.');
 const fetcher=this.options.fetcher??fetch;
 const examples=(this.options.examples??[]).filter(e=>e.reviewedBy.trim()&&e.split==='development'&&e.plan.processingStatus==='reviewed').slice(0,2);
 const messages:unknown[]=[];
 for(const e of examples){if(JSON.stringify(e.plan).length>20000||e.image.length>1024*1024)continue;messages.push({role:'user',content:[{type:'text',text:'Human-reviewed example, pixel coordinates. '+JSON.stringify(e.plan.imageMetadata)},{type:'image_url',image_url:{url:`data:${e.mime};base64,${e.image.toString('base64')}`}}]},{role:'assistant',content:JSON.stringify(e.plan)});}
 messages.push({role:'user',content:[{type:'text',text:PROMPT+` Actual image size: ${metadata.width}x${metadata.height}.`},{type:'image_url',image_url:{url:`data:${mime};base64,${image.toString('base64')}`}}]});
 for(let attempt=0;attempt<2;attempt++){
 let response:Response;
 try {response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:this.options.model??process.env.GROQ_MODEL??'qwen/qwen3.8-27b',messages,response_format:{type:'json_object'},reasoning_effort:'none',temperature:.1,max_completion_tokens:12000}),signal:AbortSignal.timeout(this.options.timeoutMs??60000)});}
 catch(e){throw new AppError(e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'PROVIDER_TIMEOUT':'PROVIDER_NETWORK',504,'Không kết nối được hoặc Groq hết thời gian.');}
 if(response.status>=500&&attempt===0){await new Promise(r=>setTimeout(r,250));continue;}
 if(!response.ok){const status=response.status;throw new AppError(status===429?'PROVIDER_QUOTA':status===401||status===403?'PROVIDER_AUTH':status===400?'PROVIDER_CONFIG':'PROVIDER_HTTP',status===429?429:502,status===429?'Groq giới hạn quota. Thử lại sau.':status===401||status===403?'Groq từ chối API key. Kiểm tra cấu hình backend.':'Groq không xử lý được yêu cầu; kiểm tra model và định dạng.');}
 try {const data=await response.json();if(data.choices?.[0]?.finish_reason==='length')throw Error('truncated');const raw=data.choices?.[0]?.message?.content;const p=FloorPlanV1Schema.parse(JSON.parse(raw));p.imageMetadata={...metadata,name:'uploaded-image'};p.scale.verified=false;p.processingStatus=p.processingStatus==='unsupported'?'unsupported':'needs_review';return p;}
 catch {throw new AppError('INVALID_PROVIDER_JSON',422,'JSON nhận diện thiếu hoặc sai trường. Hãy chỉnh dữ liệu / thử ảnh rõ hơn.');}
 }
 throw new AppError('PROVIDER_HTTP',502,'Groq không khả dụng.');
 }
}
