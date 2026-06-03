import { strict as assert } from 'assert';
import { commitProfitThresholdDraft, removeLastAddedProfitRow } from './profit-table-editor';
import type { ProfitRow } from './types';

const rows: ProfitRow[] = [
  { threshold: 100, col1: 0.1, col2: 0.2, largeCol1: 0.07, largeCol2: 0.15 },
  { threshold: 200, col1: 0.09, col2: 0.18, largeCol1: 0.06, largeCol2: 0.14 },
  { threshold: 300, col1: 0.08, col2: 0.16, largeCol1: 0.05, largeCol2: 0.13 },
];

assert.equal(commitProfitThresholdDraft(rows, 1, '').changed, false);
assert.deepEqual(commitProfitThresholdDraft(rows, 1, '').rows, rows);

assert.equal(commitProfitThresholdDraft(rows, 1, '150').rows[1].threshold, 150);
assert.equal(commitProfitThresholdDraft(rows, 1, '50').rows[1].threshold, 101);
assert.equal(commitProfitThresholdDraft(rows, 1, '350').rows[1].threshold, 299);

assert.deepEqual(removeLastAddedProfitRow(rows, 3), rows);
assert.deepEqual(removeLastAddedProfitRow([...rows, { ...rows[2], threshold: 400 }], 3), rows);

console.log('\n✅ profit-table-editor tests passed');
