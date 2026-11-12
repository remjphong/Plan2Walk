/** Explicit opt-in CLI. Uses the caller's Groq quota. Never called by npm test/evaluate. */
import 'dotenv/config';
import {readFileSync,writeFileSync,existsSync,readdirSync,mkdirSync} from 'node:fs';
import {GroqVisionProvider,type VerifiedExample} from '../server/vision.ts';
import {FloorPlanV1Schema} from '../shared/v1.ts';
import {selectExamples} from '../shared/fewshot.ts';
if(!process.argv.includes('--allow-live'))throw Error('Live API disabled. Review quota and pass --allow-live explicitly.');
if(!process.env.GROQ_API_KEY)throw Error('Configure your current GROQ_API_KEY locally.');
mkdirSync('data/predictions',{recursive:true});
const manifest=JSON.parse(readFileSync('data/manifest.json','utf8')) as {filename:string;sha256:string;family:string;split:string;split_reviewed:boolean}[];
const examples=manifest.flatMap(r=>{const path='data/annotations/'+r.filename+'.json';if(!existsSync(path))return [];const a=JSON.parse(readFileSync(path,'utf8'));return a.review?.status==='human_verified'&&a.image_sha256===r.sha256&&a.review.reviewer&&r.split_reviewed?[{...r,plan:FloorPlanV1Schema.parse(a.plan),reviewedBy:a.review.reviewer}]:[];});
const inputs=[...manifest.map(r=>({...r,path:'data/raw/'+r.filename})),...readdirSync('data/reference').map(filename=>({filename:'reference-'+filename,path:'data/reference/'+filename,family:'reference',split:'reference'}))];
for(const r of inputs){const selected=process.argv.includes('--few-shot')?selectExamples(examples,r.family):[];
 const fewshot:VerifiedExample[]=selected.map(e=>({image:readFileSync('data/raw/'+e.filename),mime:e.filename.endsWith('.png')?'image/png':'image/jpeg',plan:e.plan,reviewedBy:e.reviewedBy,split:'development',family:e.family}));
 const provider=new GroqVisionProvider({examples:fewshot});let result:unknown;
 try{const plan=await provider.analyze(readFileSync(r.path),r.filename.endsWith('.png')?'image/png':'image/jpeg');result={plan,mode:fewshot.length?'few-shot':'zero-shot',examples:selected.map(e=>e.filename)};console.log(r.filename,'predicted_needs_review');}
 catch(e){const code=(e as {code?:string}).code??'UNKNOWN';result={error:true,code};console.log(r.filename,code);}
 writeFileSync('data/predictions/'+r.filename+'.json',JSON.stringify(result,null,2));
 await new Promise(resolve=>setTimeout(resolve,1000));
}
