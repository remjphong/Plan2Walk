import type { Plan } from '../../src/schema';

export const samplePlan: Plan = {
  schemaVersion: 1, revision: 0, width: 760, height: 490, scale: { status: 'unknown' },
  rooms: [
    { id: 'R01', name: 'Xưởng', polygon: [[67, 107], [382, 107], [382, 377], [67, 377]] },
    { id: 'R02', name: 'Phòng họp', polygon: [[398, 107], [693, 107], [693, 377], [398, 377]] },
  ],
  walls: [
    { id: 'W01', a: [58, 98], b: [702, 98], thickness: 18 },
    { id: 'W02', a: [702, 98], b: [702, 386], thickness: 18 },
    { id: 'W03', a: [58, 386], b: [702, 386], thickness: 18 },
    { id: 'W04', a: [390, 98], b: [390, 386], thickness: 16 },
    { id: 'W05', a: [58, 98], b: [58, 386], thickness: 18 },
  ],
  openings: [
    { id: 'D01', type: 'door', wallId: 'W03', offset: 0.16, width: 72, reviewed: true },
    { id: 'D03', type: 'door', wallId: 'W04', offset: 0.5, width: 68, reviewed: false },
    { id: 'C01', type: 'window', wallId: 'W01', offset: 0.25, width: 122, reviewed: true },
    { id: 'C02', type: 'window', wallId: 'W01', offset: 0.76, width: 112, reviewed: true },
  ],
  issues: [{ code: 'REVIEW_OPENING', entityId: 'D03', message: 'Đối chiếu cửa D03 nối Xưởng và Phòng họp.' }],
};
