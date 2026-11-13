import { visionCandidates } from '@plan2walk/floorplan';

export async function readVisionCandidates(generate: (hint?: string) => Promise<string | undefined>) {
  const read = (output: string | undefined) => {
    const value = JSON.parse(output ?? '');
    if (value?.status === 'supported') value.status = 'ok';
    return visionCandidates.parse(value);
  };
  const first = await generate();
  try {
    return read(first);
  } catch {
    return read(await generate('The last response failed validation. Return only a JSON object matching the specified keys, types and coordinate ranges.'));
  }
}
