import { visionCandidates } from '@plan2walk/floorplan';

const feature = visionCandidates.shape.features.unwrap().element;

function read(output: string | undefined) {
  const value: unknown = JSON.parse(output ?? '');
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...visionCandidates.parse(value), rejectedFeatures: 0 };
  const source = value as Record<string, unknown>;
  if (source.status === 'supported') source.status = 'ok';
  if (Array.isArray(source.rooms)) {
    source.rooms = source.rooms.map(room => {
      if (!room || typeof room !== 'object' || Array.isArray(room) || room.name != null) return room;
      return { ...room, name: typeof room.label === 'string' ? room.label : '' };
    });
  }
  let rejectedFeatures = 0;
  if (Array.isArray(source.features)) {
    const limit = 40;
    rejectedFeatures = Math.max(0, source.features.length - limit);
    source.features = source.features.slice(0, limit).flatMap(candidate => {
      if (candidate && typeof candidate.type === 'string' && !feature.shape.type.safeParse(candidate.type).success) {
        candidate = { ...candidate, type: 'unclassified' };
      }
      const result = feature.safeParse(candidate);
      if (result.success) return [result.data];
      rejectedFeatures++;
      return [];
    });
  } else if (source.features !== undefined) {
    rejectedFeatures++;
    delete source.features;
  }
  return { ...visionCandidates.parse(source), rejectedFeatures };
}

export async function readVisionCandidates(generate: (hint?: string) => Promise<string | undefined>) {
  const first = await generate();
  try {
    return read(first);
  } catch {
    return read(await generate('The last response failed validation. Return only a JSON object matching the specified keys, types and coordinate ranges. Each room uses name and bounds. Each feature uses type, label and bounds.'));
  }
}
