/**
 * production-orders.test.ts - Kiem tra audit payload cho LSX.
 * Chay: npx tsx src/store/slices/production-orders.test.ts
 */

import type { ProductionOrder } from '../../lib/types';
import { buildLsxAuditChange } from './production-orders';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

const order: ProductionOrder = {
  id: 'LSX-20260607-001',
  quoteId: 'BG-001',
  createdAt: '2026-06-07T08:00:00.000Z',
  status: 'created',
  manual: {
    lsxNumber: 'LSX-001', issuedDate: '07/06/2026', preparedBy: 'Nguyen Minh An', approvedBy: 'Tran Van B', deliveryDate: '20/06/2026', notes: 'Ghi chu cu',
    msp: '', tenSP: '', maMucNhu: '', quyCachNote: '', quyCachCuon: '', chieuRaCuonSP: '', soLuongDHNote: '',
    printFilmName: '', printWastePercent: 0, printProductQty: 0, numCylinders: 0, cylDiameter: 0, cylWidth: 0, rollOutWidth: 0, materialQtySupplied: 0, printNotes: '', cylInfo: '', printDirection: '', printMST: '', printProductUnit: '',
    divideWidth: 0, rollLength: 0, divideRollOutWidth: 0, divideDeliveryReq: '', divideNotes: '',
    laminateFilm1: '', laminateFilm1Width: 0, lamWaste: 0, lamProductQty: 0, lamBTP: 0, laminateFilm2: '', laminateNotes: '', lamMaterialSupplyQty: '', lamProductUnit: '', lamBTPNote: '',
    packagingInfo: '', packagingNotes: '', deliveryNotes: '',
    sealEdge: '', foldBottom: '', tearNotch: '', hanTruoc: 0, hanSau: 0, hanBien: 0, hanDau: 0, xepHong: 0, holePunchInfo: '', ventHoleInfo: '', bagWasteMeters: 0, bagLuuY: '', useSemicircularMold: false, useDualCutter: false, bagMachineWaste: 0, bagDeliveryReq: '', bagMachineNotes: '',
  },
  snapshot: {
    customer: 'Cong ty Gao Viet Xanh', productName: 'Tui gao ST25', productType: 'tui', structure: 'PET//MPET//LLDPE', quantity: 10000,
    spreadWidth: 0.32, cutStep: 0.48, numColors: 4, bagType: '3bien', cylLength: 0.7, cylCircum: 0.48, filmRollLength: 6000,
    layer1Name: 'PET', layer2Name: 'MPET', layer3Name: 'LLDPE', layer4Name: '', layer5Name: '', chotGia: 25000, totalArea: 1536,
  },
};

console.log('\n== LSX audit change ==');
const statusChange = buildLsxAuditChange(order, { status: 'in_production' });
assert('status patch maps to status_change', statusChange.action === 'status_change');
assert('status diff includes old and new status', statusChange.before.status === 'created' && statusChange.after.status === 'in_production');

const manualChange = buildLsxAuditChange(order, { manual: { notes: 'Ghi chu moi', deliveryDate: '21/06/2026' } });
assert('manual-only patch maps to update', manualChange.action === 'update');
assert('manual diff is flattened', manualChange.before.notes === 'Ghi chu cu' && manualChange.after.notes === 'Ghi chu moi' && manualChange.before.deliveryDate === '20/06/2026');
assert('manual diff does not include unchanged manual fields', !('lsxNumber' in manualChange.before));

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
