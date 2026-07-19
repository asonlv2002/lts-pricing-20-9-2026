import { mapOutsourceEnToVn, mapPricingModeEnToVn } from './outsource-map';

function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}

assert(mapPricingModeEnToVn('internal') === 'noi_bo', 'internal');
assert(mapPricingModeEnToVn('outsource') === 'gia_cong', 'outsource');

const vn = mapOutsourceEnToVn({
  steps: ['print', 'laminate'],
  print: { filmSource: 'lts', wastePct: 20, wasteSetupM: 1000, gcPricePerM2: 3000 },
  laminate: {
    layers: {
      layer2: { filmSource: 'lts', wastePct: 10, wasteSetupM: 200, gcPricePerM2: 1500 },
      layer3: { filmSource: 'vendor', filmBuyPricePerM2: 5500 },
    },
  },
});

assert(vn != null, 'vn defined');
assert(vn!.congDoan.includes('in') && vn!.congDoan.includes('ghep'), 'steps');
assert(vn!.in?.nguonMang === 'lts' && vn!.in?.giaGcMoiM2 === 3000, 'print');
assert(vn!.ghep?.lop?.lop2?.nguonMang === 'lts', 'l2');
assert(vn!.ghep?.lop?.lop3?.nguonMang === 'ben_ngoai', 'l3');
assert(vn!.ghep?.lop?.lop3?.giaMuaMangMoiM2 === 5500, 'buy');

console.log('outsource-map OK');
