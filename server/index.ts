import 'dotenv/config';
import { createApp } from './app.ts';
const port=Number(process.env.PORT||8080);
createApp().listen(port,'0.0.0.0',()=>console.log(`Plan2Walk listening on :${port}`));
