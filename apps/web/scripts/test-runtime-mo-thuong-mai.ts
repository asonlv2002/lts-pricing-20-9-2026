/**
 * test-runtime-mo-thuong-mai.ts — Test runtime mở báo giá thương mại từ danh sách.
 * Run: npx tsx scripts/test-runtime-mo-thuong-mai.ts
 */

import { dungCuaHangTinhGia } from '../src/store/CuaHangTinhGia';
import { tinhGiaThuongMai } from '../src/lib/engine';
import { CalculateInput, HistoryItem } from '../src/lib/types';
import { dauVaoMacDinh } from '../src/store/helpers';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
    failures.push(name);
  }
}

console.log('\n== Runtime test: mở báo giá thương mại từ danh sách ==\n');

const inputThuongMai: CalculateInput = {
  ...dauVaoMacDinh,
  customer: 'CÔNG TY test',
  productName: 'SP test',
  pricingMode: 'commercial',
  commercialMode: 'description',
  commercialDescription: 'Báo giá SP test - điều khoản ABC',
  commercialPurchasePrice: 12500,
  commercialUnitKind: 'tui',
  commercialProfitValue: 10,
  commercialProfitUnit: 'percent',
  commercialUnitWeight: 25,
  commercialExtraFee: 0,
  quantity: 5000,
  boxOptionKey: 'thung-5-lop',
  bagsPerBox: 500,
  paymentDays: 30,
  commissionRate: 0.03,
  productType: 'tui',
  bagType: '3bien',
  spreadWidth: 0.42,
  cutStep: 0.45,
  numImages: 4,
  layer1Id: null,
  layer2Id: null,
};

const itemThuongMai: HistoryItem = {
  id: 'test-thuong-mai-1',
  date: '01/01/2025',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  customer: 'CÔNG TY test',
  productName: 'SP test',
  structure: '',
  quantity: 5000,
  finalPrice: 0,
  chotGia: undefined,
  profitRate: 0,
  profitAmount: 0,
  isQuote: false,
  isNangCap: undefined,
  isThuongMai: true,
  pricingSheetId: 'sheet-1',
  input: inputThuongMai,
};

dungCuaHangTinhGia.setState((s) => ({
  history: [itemThuongMai, ...s.history.filter((h) => h.id !== itemThuongMai.id)].slice(0, 200),
}));

(async () => {
  const opened = await dungCuaHangTinhGia.getState().moBangTinhVoiPin('test-thuong-mai-1');
  assert('moBangTinhVoiPin thành công', opened === true);

  const s = dungCuaHangTinhGia.getState();

  assert('input.pricingMode = "commercial"', s.input.pricingMode === 'commercial',
    `got: ${s.input.pricingMode}`);
  assert('input.commercialMode = "description"', s.input.commercialMode === 'description',
    `got: ${s.input.commercialMode}`);
  assert('input.commercialDescription preserved', s.input.commercialDescription === 'Báo giá SP test - điều khoản ABC',
    `got: ${JSON.stringify(s.input.commercialDescription)}`);
  assert('input.commercialPurchasePrice = 12500', s.input.commercialPurchasePrice === 12500,
    `got: ${s.input.commercialPurchasePrice}`);
  assert('input.commercialUnitKind = "tui"', s.input.commercialUnitKind === 'tui',
    `got: ${s.input.commercialUnitKind}`);
  assert('input.commercialProfitValue = 10', s.input.commercialProfitValue === 10,
    `got: ${s.input.commercialProfitValue}`);
  assert('input.commercialProfitUnit = "percent"', s.input.commercialProfitUnit === 'percent',
    `got: ${s.input.commercialProfitUnit}`);
  assert('input.commercialUnitWeight = 25', s.input.commercialUnitWeight === 25,
    `got: ${s.input.commercialUnitWeight}`);
  assert('input.quantity = 5000', s.input.quantity === 5000,
    `got: ${s.input.quantity}`);
  assert('input.commissionRate = 0.03', s.input.commissionRate === 0.03,
    `got: ${s.input.commissionRate}`);

  assert('pricingEntry = "form"', s.pricingEntry === 'form',
    `got: ${s.pricingEntry}`);
  assert('cheDoNangCao = false', s.cheDoNangCao === false,
    `got: ${s.cheDoNangCao}`);
  assert('loadedHistoryId set', s.loadedHistoryId === 'test-thuong-mai-1',
    `got: ${s.loadedHistoryId}`);

  const kqTM = tinhGiaThuongMai(s.input);
  assert('tinhGiaThuongMai.purchasePrice = 12500', kqTM.purchasePrice === 12500,
    `got: ${kqTM.purchasePrice}`);
  assert('tinhGiaThuongMai.purchaseTotal = 62,500,000', kqTM.purchaseTotal === 62_500_000,
    `got: ${kqTM.purchaseTotal}`);
  assert('tinhGiaThuongMai.unitPriceVnd = 13,750 (= 12500 + 10%)', kqTM.unitPriceVnd === 13_750,
    `got: ${kqTM.unitPriceVnd}`);
  assert('tinhGiaThuongMai.unitWeightGr = 25', kqTM.unitWeightGr === 25,
    `got: ${kqTM.unitWeightGr}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\nFailed checks:');
    for (const f of failures) console.error('  -', f);
    process.exit(1);
  }
})();
