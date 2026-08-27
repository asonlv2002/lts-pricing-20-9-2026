/**
 * pdf-deps-key.test.ts - Kiem tra depsKey rebuild khi signature thay doi.
 * Chay: pnpm --filter web exec tsx src/components/pdf-deps-key.test.ts
 *
 * Bug 2026-08-27: depsKey khong bao gom reviewerSignatureDataUrl
 * nen khi chu ky async ve, StablePdfIframe cache theo depsKey
 * => PDF iframe KHONG rebuild => van hien "(Chua duyet)".
 */

import { baoGiaPdfDepsKey } from './BaoGiaPreviewModal';
import { lsxPdfDepsKey } from './LsxPdfPreviewModal';
import type { HistoryItem, ProductionOrder } from '../lib/types';

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

console.log('\n== PDF depsKey rebuild on signature change ==');

const fakeItem: HistoryItem = {
  id: 'bg-1',
  customer: 'KH A',
  date: '2026-08-27',
  productName: 'Tui A',
  structure: 'PET//LLDPE',
  quantity: 1000,
  finalPrice: 1000,
  chotGia: 0,
  quoteCode: 'Q-001',
  isQuote: true,
  sellerName: '',
  input: {} as any,
  tiers: [],
} as unknown as HistoryItem;

const fakeOrder: ProductionOrder = {
  id: 'lsx-1',
  createdAt: '2026-08-27T00:00:00.000Z',
  manual: { lsxNumber: 'LSX-001' } as any,
  products: [],
} as unknown as ProductionOrder;

const noSig = baoGiaPdfDepsKey(fakeItem);
const withSig = baoGiaPdfDepsKey(
  fakeItem,
  undefined,
  'data:image/png;base64,iVBORw0KGgo=',
);

assert(
  'baoGiaPdfDepsKey khong signature != co signature (rebuild PDF)',
  noSig !== withSig,
  `${noSig} vs ${withSig}`,
);
assert(
  'baoGiaPdfDepsKey co signature chua "sig:1"',
  withSig.includes('sig:1'),
  withSig,
);
assert(
  'baoGiaPdfDepsKey khong signature chua "sig:0"',
  noSig.includes('sig:0'),
  noSig,
);

const noSigLsx = lsxPdfDepsKey(fakeOrder);
const withSigLsx = lsxPdfDepsKey(
  fakeOrder,
  'data:image/png;base64,iVBORw0KGgo=',
);

assert(
  'lsxPdfDepsKey khong signature != co signature (rebuild PDF)',
  noSigLsx !== withSigLsx,
  `${noSigLsx} vs ${withSigLsx}`,
);
assert(
  'lsxPdfDepsKey co signature chua "sig:1"',
  withSigLsx.includes('sig:1'),
  withSigLsx,
);
assert(
  'lsxPdfDepsKey khong signature chua "sig:0"',
  noSigLsx.includes('sig:0'),
  noSigLsx,
);

const sigA = baoGiaPdfDepsKey(
  fakeItem,
  undefined,
  'data:image/png;base64,AAAAAAAA',
);
const sigB = baoGiaPdfDepsKey(
  fakeItem,
  undefined,
  'data:image/png;base64,BBBBBBBB',
);
assert(
  'baoGiaPdfDepsKey: chuyen tu null sang data URL cung rebuild (sig:0 -> sig:1)',
  noSig !== sigA,
  `${noSig} vs ${sigA}`,
);
assert(
  'baoGiaPdfDepsKey: data URL khac nhau cung rebuild (cache-bust an toan)',
  sigA === sigB,
  `${sigA} vs ${sigB} (chi can phan biet co/khong, khong can full hash)`,
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
