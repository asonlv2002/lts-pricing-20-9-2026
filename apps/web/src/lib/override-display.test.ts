/**
 * override-display.test.ts - Kiem tra hien thi thay doi Sale/Admin.
 * Chay: npx tsx src/lib/override-display.test.ts
 */

import type { Material, OverrideTable } from './types';
import { countOverrideChanges, formatMaterialOptionLabel, listOverrideChanges } from './override-display';

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

const bopp20: Material = {
  id: 'BOPP20',
  name: 'BOPP',
  density: 0.91,
  thickness: 20,
  pricePerKg: 42000,
  isPETorPA: false,
  rollLength: 6000,
  inkPricePerColor: 0,
};

const overrides: OverrideTable = {
  print: { materialId: 'BOPP20', mat: 'BOPP', matPrice: 764.4 },
  'lam-2': {
    detailOverrides: {
      0: { materialId: 'BOPP18', materialName: 'BOPP', matPrice: 688 },
      1: { width: 0.42 },
    },
  },
};

assert(
  'material option label includes thickness',
  formatMaterialOptionLabel(bopp20) === 'BOPP 20 mic',
  formatMaterialOptionLabel(bopp20),
);

assert(
  'counts visible nested override fields',
  countOverrideChanges(overrides) === 5,
  String(countOverrideChanges(overrides)),
);

const changes = listOverrideChanges(overrides);

assert(
  'lists row material changes as readable text',
  changes.some(change => change.label === 'In · Vật liệu' && change.value === 'BOPP'),
  JSON.stringify(changes),
);

assert(
  'lists nested detail material changes as readable text',
  changes.some(change => change.label === 'Ghép L2 · Dòng 1 · Vật liệu' && change.value === 'BOPP'),
  JSON.stringify(changes),
);

assert(
  'lists nested detail width changes as readable text',
  changes.some(change => change.label === 'Ghép L2 · Dòng 2 · Khổ' && change.value === '0,42'),
  JSON.stringify(changes),
);

if (failed > 0) {
  console.error(`\nFAILED: ${failed} failed, ${passed} passed`);
  process.exit(1);
}

console.log(`\nPASSED: ${passed} tests`);
