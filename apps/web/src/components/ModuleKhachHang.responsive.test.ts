/**
 * ModuleKhachHang.responsive.test.ts - Regression checks for customer list mobile layout.
 * Run: npx tsx src/components/ModuleKhachHang.responsive.test.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

const sourcePath = resolve(process.cwd(), 'src/components/ModuleKhachHang.tsx');
const source = readFileSync(sourcePath, 'utf8');

console.log('\n== Customer list responsive layout ==');

assert(
  'removes CRM breadcrumb from customer list header',
  !source.includes('<div className="crm2-breadcrumb">') && !source.includes('<span>CRM</span>'),
);

assert(
  'keeps export and create buttons in the same header as the customer title',
  /<header className="crm2-header">[\s\S]*<h1 className="crm2-title">[\s\S]*<div className="crm2-header-right">[\s\S]*Xuất CSV[\s\S]*Thêm mới[\s\S]*<\/header>/.test(source),
);

assert(
  'customer root no longer forces desktop min width',
  !/\.crm2-root \{[\s\S]*min-width:\s*1120px/.test(source),
);

assert(
  'table wrapper supports horizontal scrolling on mobile web',
  /\.crm2-table-wrap \{[\s\S]*overflow-x:\s*auto[\s\S]*-webkit-overflow-scrolling:\s*touch/.test(source),
);

assert(
  'mobile header keeps title and actions compact',
  /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-header \{[\s\S]*flex-direction:\s*row[\s\S]*\.crm2-search-kbd \{\s*display:\s*none;\s*\}/.test(source),
);

assert(
  'mobile filter chips wrap instead of scrolling horizontally',
  /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-chips \{[\s\S]*flex-wrap:\s*wrap[\s\S]*overflow-x:\s*visible/.test(source)
    && !/\.crm2-chips \{[\s\S]*flex-wrap:\s*nowrap[\s\S]*overflow-x:\s*auto/.test(source),
);

assert(
  'mobile page prevents horizontal overflow outside the customer table',
  /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-root \{[\s\S]*padding:\s*10px[\s\S]*overflow-x:\s*hidden/.test(source)
    && /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-toolbar \{[\s\S]*overflow-x:\s*hidden/.test(source),
);

assert(
  'mobile controls use compact sizing above the table',
  /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-title \{[\s\S]*font-size:\s*18px/.test(source)
    && /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-chip \{[\s\S]*padding:\s*4px 8px[\s\S]*font-size:\s*12px/.test(source)
    && /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-search-input \{[\s\S]*padding:\s*8px 6px/.test(source),
);

if (failed > 0) {
  console.error(`\n${failed} responsive layout checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${passed} responsive layout checks passed.`);
