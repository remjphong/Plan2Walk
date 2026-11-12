// Compatibility entry point; the active provider is Groq, not Gemini.
import { GroqVisionProvider } from './vision.ts';
export const analyzeFloorplan=(image:Buffer,mime:string)=>new GroqVisionProvider().analyze(image,mime);
