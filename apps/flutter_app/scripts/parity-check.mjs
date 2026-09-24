// Harness đối chiếu số: web engine (tinhGiaWeb/tinhGiaThuongMai) vs flutter engine-entry.
// Chạy: node scripts/parity-check.mjs  (từ apps/flutter_app)
// Không phải test tự động — chỉ in số 2 bên để đối chiếu thủ công (luật repo: không test).
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const flutterRoot = resolve(__dirname, '..');

const mats = JSON.parse(readFileSync(resolve(repoRoot, 'data/materials.json'), 'utf8'));
const consts = JSON.parse(readFileSync(resolve(repoRoot, 'data/constants.json'), 'utf8'));
const profit = JSON.parse(readFileSync(resolve(repoRoot, 'data/profitTable.json'), 'utf8'));

// ── Bundle web adapter (engine.ts + manager-calculation.ts) thành IIFE ────────
const webEntry = `
import { tinhGiaWeb, tinhGiaThuongMai, synthesizeResultFromCommercial } from '${repoRoot.replace(/\\/g, '/')}/apps/web/src/lib/engine.ts';
import { tinhBaoGia } from '${repoRoot.replace(/\\/g, '/')}/apps/web/src/lib/manager-calculation.ts';
globalThis.WEB = { tinhGiaWeb, tinhGiaThuongMai, synthesizeResultFromCommercial, tinhBaoGia };
`;
const webBundle = await build({
  stdin: { contents: webEntry, resolveDir: repoRoot, loader: 'ts' },
  bundle: true, format: 'iife', platform: 'neutral', target: 'es2020',
  write: false, logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' },
});

// ── Bundle flutter engine-entry ──────────────────────────────────────────────
const flBundle = await build({
  entryPoints: [resolve(flutterRoot, 'scripts/engine-entry.ts')],
  bundle: true, format: 'iife', platform: 'neutral', target: 'es2020',
  write: false, logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' },
});

function runIife(code) {
  const ctx = vm.createContext({ console, structuredClone });
  vm.runInContext(code, ctx);
  return ctx;
}

const webCtx = runIife(webBundle.outputFiles[0].text);
const flCtx = runIife(flBundle.outputFiles[0].text);
const WEB = webCtx.WEB;
const LTS = flCtx.LTS;

const base = {
  customer: 'Test', productName: 'SP', productType: 'tui', bagType: '3bien', filmType: '',
  quantity: 30000, numColors: 4, numImages: 1, filmRollLength: 6000,
  layer1Id: mats[0].id, layer2Id: mats[1].id, layer3Id: null, layer4Id: null, layer5Id: null,
  spreadWidth: 0.6, cutStep: 0.4, metallicSurcharge: 0, coverageRatio: 1,
  handleWeight: 0, zipperWeight: 0, tapeWeight: 0, hasZipper: false, hasTape: false, hasHandle: false,
  paymentDays: 30, profitColumn: 1, commissionRate: 0, commissionFixedVND: 0,
  commissionUnit: 'percent', commissionInputValue: 0, bagsPerBox: 1000, boxPrice: 18000,
  shippingPerKm: 5000, shippingKm: 200, cylLength: 0.7, cylCircum: 0.4, cylUnitPrice: 7300000,
  cylType: 'A', cylIncluded: false, targetThickness: 0, pricingMode: 'internal',
  layer2AltId: null, layer2Lengths: undefined, layer2FrontPart: 'main', layer2PairingMode: 'bottom_to_bottom',
  micOverrides: {}, printFilmCustomerGroup: 'normal', firstRun: false,
};

const cases = {
  'A-noi-bo-tui': { ...base },
  'B-mang-in': { ...base, productType: 'mang', bagType: '', filmType: 'mangIn', quantity: 180000, numColors: 2, layer2Id: null, spreadWidth: 0.8, cutStep: 0.5 },
  'C-commercial-form': { ...base, pricingMode: 'commercial', commercialMode: 'form', commercialPurchasePrice: 5000, commercialProfitValue: 10, commercialProfitUnit: 'percent', commercialUnitKind: 'tui' },
  'D-commercial-desc': { ...base, pricingMode: 'commercial', commercialMode: 'description', commercialPurchasePrice: 5000, commercialProfitValue: 10, commercialProfitUnit: 'percent', commercialUnitKind: 'tui', commercialDescription: 'Mo ta tu do', commercialExtraFee: 1000000 },
  'E-gia-cong': { ...base, pricingMode: 'outsource', outsource: { steps: ['print', 'laminate', 'slit'], print: { filmSource: 'vendor', filmBuyPricePerM2: 20000 }, slit: { wastePct: 1, wasteSetupM: 100, gcPricePerM2: 500, shippingVnd: 200000 } } },
  'F-layer2-kep': { ...base, layer2AltId: mats[2].id, layer2Lengths: { mat1: 0.3, mat2: 0.3 }, layer2PairingMode: 'front_to_front' },
  'G-co-chia': { ...base, hasDivide: true, divideElements: 2, divideWidthMm: 300, numImages: 2 },
  'H-phu-phi': { ...base, hasNhu: true, hasMo: true, selectedPrintSurchargeKeys: [] },
};

const fields = ['finalPrice', 'costPerUnit', 'profitRate', 'totalProductionCost', 'revenue', 'cylinderCost', 'gcShippingPerUnit', 'gcPackagingPerUnit', 'gcOtherPerUnit'];
let fail = 0;
for (const [name, input] of Object.entries(cases)) {
  const web = WEB.tinhBaoGia(input, mats, consts, profit.rows, []);
  const flRaw = LTS.calculate(JSON.stringify(input), JSON.stringify(mats), JSON.stringify(consts), JSON.stringify(profit.rows));
  const fl = JSON.parse(flRaw);
  const diffs = [];
  for (const f of fields) {
    const w = web?.[f] ?? 0;
    const x = fl?.[f] ?? 0;
    if (Math.abs(w - x) > 1e-6) diffs.push(`${f}: web=${w} fl=${x} Δ=${(x - w).toFixed(6)}`);
  }
  const ok = diffs.length === 0;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok ? '' : '\n     ' + diffs.join('\n     ')}`);
}
console.log(`\n${Object.keys(cases).length - fail}/${Object.keys(cases).length} case khớp`);
process.exit(fail === 0 ? 0 : 1);
