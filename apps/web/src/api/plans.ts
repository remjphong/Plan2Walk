import { floorPlan } from '@plan2walk/floorplan';

export class AnalysisError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export async function analyzePreview(blob: Blob, text: string, signal: AbortSignal, drawing?: Blob) {
  const form = new FormData();
  form.set('file', blob, 'preview.png');
  form.set('text', text);
  if (drawing) form.set('drawing', drawing, 'drawing.png');
  const response = await fetch('/api/plans/analyze', { method: 'POST', body: form, signal });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new AnalysisError(result.code ?? 'ANALYSIS_FAILED', result.message ?? 'Chưa thể phân tích. Hãy thử lại.');
  return floorPlan.parse(result.plan);
}
