import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { GroqVisionProvider, type VisionProvider } from './vision.ts';
import { AppError,inspectImage } from './image.ts';
import { FloorPlanV1Schema } from '../shared/v1.ts';
import { compileGeometry } from '../geometry/engine.ts';
export function createApp(provider:VisionProvider=new GroqVisionProvider()){
 const app=express();app.disable('x-powered-by');
 const limit=new Map<string,{count:number;reset:number}>();let active=0;
 app.get('/api/health',(_req,res)=>res.json({status:'ok',aiConfigured:!!process.env.GROQ_API_KEY}));
 app.use('/api/analyze',(req,res,next)=>{const now=Date.now();for(const [key,value] of limit)if(value.reset<now)limit.delete(key);const key=req.ip??'unknown';if(!limit.has(key)&&limit.size>=1000)return res.status(429).json({code:'RATE_LIMIT',error:'Máy chủ đang bận.'});const state=limit.get(key)??{count:0,reset:now+60000};limit.set(key,state);if(++state.count>5){res.setHeader('Retry-After','60');return res.status(429).json({code:'RATE_LIMIT',error:'Quá nhiều lượt thử. Chờ 1 phút.'});}if(active>=2)return res.status(429).json({code:'BUSY',error:'Đang xử lý ảnh khác.'});next();});
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:3*1024*1024,files:1,fields:0,parts:1},fileFilter:(_req,file,cb)=>{if(!['image/png','image/jpeg'].includes(file.mimetype))return cb(new AppError('INVALID_MIME',400,'Chỉ hỗ trợ PNG/JPEG.'));cb(null,true);}});
 app.post('/api/analyze',upload.single('floorplan'),async(req,res,next)=>{if(!req.file)return next(new AppError('MISSING_FILE',400,'Chọn ảnh JPG/PNG.'));let acquired=false;try{inspectImage(req.file.buffer,req.file.mimetype);active++;acquired=true;const plan=FloorPlanV1Schema.parse(await provider.analyze(req.file.buffer,req.file.mimetype));const geometry=compileGeometry(plan);res.json({plan,source:'groq',status:geometry.status,issues:geometry.issues});}catch(e){next(e);}finally{if(acquired)active--;}});
 app.use((e:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{if(e instanceof AppError)return res.status(e.status).json({code:e.code,error:e.publicMessage});if(e instanceof multer.MulterError)return res.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({code:e.code,error:'File vượt giới hạn hoặc upload không hợp lệ.'});return res.status(422).json({code:'INVALID_DATA',error:'Dữ liệu không hợp lệ.'});});
 const staticPath=path.resolve('dist');app.use(express.static(staticPath));app.get('*',(_req,res)=>res.sendFile(path.join(staticPath,'index.html')));return app;
}
