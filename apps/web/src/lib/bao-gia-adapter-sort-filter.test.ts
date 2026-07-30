/**
 * bao-gia-adapter-sort-filter.test.ts — Test sortAndFilterQuotationsForLsx
 * (sort theo ngay, filter theo kha dung cho tab "Tao LSX").
 * Chay: pnpm --filter web exec tsx src/lib/bao-gia-adapter-sort-filter.test.ts
 */
import type { BaoGiaApi, PricingSheetApi } from './api/service-lts';
import {
  sortAndFilterQuotationsForLsx,
  laBaoGiaDaDuyet,
  mapBaoGiaToLsxSources,
} from './bao-gia-adapter';

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

function taoBaoGia(
  id: string,
  updateStatus: string,
  createdAt: string,
  pricingSheets: Array<{ id: string; hasCustomerApproved?: boolean | null }>,
): BaoGiaApi {
  return {
    id,
    updateStatus,
    createdAt,
    updatedAt: createdAt,
    pricingSheets: pricingSheets.map(s => ({
      id: s.id,
      pricingSheetName: `Sheet ${s.id}`,
      customer: { codeName: 'TEST' },
      inputValue: { productType: 'tui' },
      saleResult: null,
      masterResult: null,
      quotationId: id,
      hasCustomerApproved: s.hasCustomerApproved ?? null,
      note: null,
      createdBy: null,
      updatedBy: null,
      createdAt,
      updatedAt: createdAt,
      priceConfigIds: [],
    })),
  } as unknown as BaoGiaApi;
}

const helpers = { laDaDuyet: laBaoGiaDaDuyet, mapBaoGiaToLsxSources };

console.log('\n== Sort theo createdAt (moi-nhat / cu-nhat) ==');
{
  // 3 BG: 2026-01-03, 2026-01-01, 2026-01-02 -> moi-nhat: 3, 2, 1
  const q1 = taoBaoGia('q1', 'approved', '2026-01-01T00:00:00Z', [
    { id: 's1', hasCustomerApproved: true },
  ]);
  const q2 = taoBaoGia('q2', 'approved', '2026-01-02T00:00:00Z', [
    { id: 's2', hasCustomerApproved: true },
  ]);
  const q3 = taoBaoGia('q3', 'approved', '2026-01-03T00:00:00Z', [
    { id: 's3', hasCustomerApproved: true },
  ]);
  const input = [q1, q2, q3];
  const moiNhat = sortAndFilterQuotationsForLsx(input, { boLoc: 'all', sapXep: 'moi-nhat' }, helpers);
  assert('moi-nhat: 3 BG, thu tu dung',
    moiNhat.map(q => q.id).join(',') === 'q3,q2,q1',
    moiNhat.map(q => q.id).join(','));
  const cuNhat = sortAndFilterQuotationsForLsx(input, { boLoc: 'all', sapXep: 'cu-nhat' }, helpers);
  assert('cu-nhat: 3 BG, thu tu dao',
    cuNhat.map(q => q.id).join(',') === 'q1,q2,q3',
    cuNhat.map(q => q.id).join(','));
}

console.log('\n== Filter theo kha dung (co-the-tao) ==');
{
  // q1: approved + 1 sheet duyet -> kha dung
  // q2: approved + 0 sheet duyet -> cho
  // q3: draft (chua admin duyet) -> cho
  const q1 = taoBaoGia('q1', 'approved', '2026-01-01T00:00:00Z', [
    { id: 's1', hasCustomerApproved: true },
  ]);
  const q2 = taoBaoGia('q2', 'approved', '2026-01-02T00:00:00Z', [
    { id: 's2', hasCustomerApproved: false },
  ]);
  const q3 = taoBaoGia('q3', 'draft', '2026-01-03T00:00:00Z', [
    { id: 's3', hasCustomerApproved: true },
  ]);
  const result = sortAndFilterQuotationsForLsx(
    [q1, q2, q3],
    { boLoc: 'co-the-tao', sapXep: 'moi-nhat' },
    helpers,
  );
  assert('co-the-tao chi lay 1 BG (q1)',
    result.length === 1 && result[0]?.id === 'q1',
    result.map(q => q.id).join(','));
}

console.log('\n== Filter theo kha dung (dang-cho) ==');
{
  const q1 = taoBaoGia('q1', 'approved', '2026-01-01T00:00:00Z', [
    { id: 's1', hasCustomerApproved: true },
  ]);
  const q2 = taoBaoGia('q2', 'approved', '2026-01-02T00:00:00Z', [
    { id: 's2', hasCustomerApproved: false },
  ]);
  const q3 = taoBaoGia('q3', 'draft', '2026-01-03T00:00:00Z', [
    { id: 's3', hasCustomerApproved: true },
  ]);
  const result = sortAndFilterQuotationsForLsx(
    [q1, q2, q3],
    { boLoc: 'dang-cho', sapXep: 'moi-nhat' },
    helpers,
  );
  assert('dang-cho lay 2 BG (q3 + q2), moi nhat truoc',
    result.map(q => q.id).join(',') === 'q3,q2',
    result.map(q => q.id).join(','));
}

console.log('\n== Filter theo kha dung (all) ==');
{
  const q1 = taoBaoGia('q1', 'approved', '2026-01-01T00:00:00Z', []);
  const q2 = taoBaoGia('q2', 'draft', '2026-01-02T00:00:00Z', []);
  const result = sortAndFilterQuotationsForLsx(
    [q1, q2],
    { boLoc: 'all', sapXep: 'moi-nhat' },
    helpers,
  );
  assert('all lay tat ca 2 BG',
    result.length === 2,
    result.map(q => q.id).join(','));
}

console.log('\n== Edge cases ==');
{
  // Danh sach rong
  const empty = sortAndFilterQuotationsForLsx([], { boLoc: 'all', sapXep: 'moi-nhat' }, helpers);
  assert('danh sach rong -> rong', empty.length === 0);

  // createdAt khong hop le (NaN) - khong crash, fallback 0
  const bad = taoBaoGia('q-bad', 'approved', 'invalid-date', [
    { id: 's1', hasCustomerApproved: true },
  ]);
  const good = taoBaoGia('q-good', 'approved', '2026-01-01T00:00:00Z', [
    { id: 's2', hasCustomerApproved: true },
  ]);
  const result = sortAndFilterQuotationsForLsx(
    [bad, good],
    { boLoc: 'all', sapXep: 'moi-nhat' },
    helpers,
  );
  assert('createdAt invalid khong crash, tra ve 2 BG', result.length === 2);

  // BG khong co pricingSheets (mapBaoGiaToLsxSources co the tra rong)
  const noSheets = taoBaoGia('q-no', 'approved', '2026-01-01T00:00:00Z', []);
  const result2 = sortAndFilterQuotationsForLsx(
    [noSheets],
    { boLoc: 'co-the-tao', sapXep: 'moi-nhat' },
    helpers,
  );
  assert('BG approved khong co pricingSheets -> kha dung = false -> khong thuoc co-the-tao',
    result2.length === 0);
}

console.log('\n== Combined: filter + sort ==');
{
  // q1: draft (cho) - 2026-01-01
  // q2: approved + 0 sheet (cho) - 2026-01-04
  // q3: approved + 1 sheet (kha dung) - 2026-01-02
  // q4: approved + 1 sheet (kha dung) - 2026-01-03
  // Filter "co-the-tao" + sort "moi-nhat" -> q4, q3
  // Filter "dang-cho" + sort "cu-nhat" -> q1, q2
  const q1 = taoBaoGia('q1', 'draft', '2026-01-01T00:00:00Z', []);
  const q2 = taoBaoGia('q2', 'approved', '2026-01-04T00:00:00Z', [
    { id: 's2', hasCustomerApproved: false },
  ]);
  const q3 = taoBaoGia('q3', 'approved', '2026-01-02T00:00:00Z', [
    { id: 's3', hasCustomerApproved: true },
  ]);
  const q4 = taoBaoGia('q4', 'approved', '2026-01-03T00:00:00Z', [
    { id: 's4', hasCustomerApproved: true },
  ]);
  const r1 = sortAndFilterQuotationsForLsx(
    [q1, q2, q3, q4],
    { boLoc: 'co-the-tao', sapXep: 'moi-nhat' },
    helpers,
  );
  assert('co-the-tao + moi-nhat -> q4, q3',
    r1.map(q => q.id).join(',') === 'q4,q3',
    r1.map(q => q.id).join(','));
  const r2 = sortAndFilterQuotationsForLsx(
    [q1, q2, q3, q4],
    { boLoc: 'dang-cho', sapXep: 'cu-nhat' },
    helpers,
  );
  assert('dang-cho + cu-nhat -> q1, q2',
    r2.map(q => q.id).join(',') === 'q1,q2',
    r2.map(q => q.id).join(','));
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
