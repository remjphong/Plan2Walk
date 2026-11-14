import { readFileSync } from 'node:fs';
import { assessPlan } from './assess';

const [predictionFile, referenceFile] = process.argv.slice(2);

try {
  if (!predictionFile || !referenceFile) throw new Error('Usage: tsx check.ts <prediction.json> <reference.json>');
  const prediction = JSON.parse(readFileSync(predictionFile, 'utf8'));
  const reference = JSON.parse(readFileSync(referenceFile, 'utf8'));
  const report = assessPlan(prediction?.plan ?? prediction, reference);
  console.log(JSON.stringify(report, null, 2));
  if (report.checks.some(check => check.status !== 'pass')) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
