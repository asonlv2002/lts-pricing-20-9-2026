/**
 * TrangCauHinh.responsive.test.ts - Regression checks for config mobile layout.
 * Run: npx tsx src/components/TrangCauHinh.responsive.test.ts
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

const sourcePath = resolve(process.cwd(), 'src/components/TrangCauHinh.tsx');
const source = readFileSync(sourcePath, 'utf8');
const globalsCssPath = resolve(process.cwd(), 'src/app/globals.css');
const globalsCss = readFileSync(globalsCssPath, 'utf8');
const finalAddButtonRuleIndex = globalsCss.lastIndexOf('.lts-shell--mobile .config-page .config-interest-card .config-interest-days-add-action .btn');
const legacyCompactButtonRuleIndex = globalsCss.lastIndexOf('.lts-shell--mobile .config-page .config-interest-days-add .btn');

console.log('\n== Config interest mobile layout ==');

assert(
  'interest add row exposes mobile-specific action, input, and preview hooks',
  source.includes('config-interest-days-add-action')
    && source.includes('config-interest-days-add-input')
    && source.includes('config-interest-days-add-preview'),
);

assert(
  'mobile interest add row is scoped to config interest card only',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-interest-card \.config-interest-days-add \{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*1fr auto/.test(globalsCss),
);

assert(
  'mobile interest add button has a touch-friendly target',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-interest-card \.config-interest-days-add-action \.btn \{[\s\S]*min-height:\s*44px/.test(globalsCss),
);

assert(
  'final mobile interest add button rule wins over legacy compact rule',
  finalAddButtonRuleIndex > legacyCompactButtonRuleIndex,
);

console.log('\n== Config CPSX mobile layout ==');

assert(
  'CPSX sections expose mobile layout hooks for print, merge, and cut',
  source.includes('config-cpsx-print-card')
    && source.includes('config-cpsx-merge-card')
    && source.includes('config-cpsx-cut-card')
    && source.includes('config-cpsx-split')
    && source.includes('config-cpsx-param-pair'),
);

assert(
  'mobile CPSX split layout becomes one column under config scope',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-cpsx-split,[\s\S]*html\.in-config-page \.config-page \.config-cpsx-split \{[\s\S]*display:\s*grid\s*!important[\s\S]*grid-template-columns:\s*1fr\s*!important/.test(globalsCss),
);

assert(
  'mobile CPSX short formula pairs stay horizontally aligned',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-cpsx-param-pair,[\s\S]*html\.in-config-page \.config-page \.config-cpsx-param-pair \{[\s\S]*display:\s*grid\s*!important[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/.test(globalsCss),
);

assert(
  'mobile cut rules render as cards instead of a cramped table',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-cut-rules-table thead,[\s\S]*html\.in-config-page \.config-page \.config-cut-rules-table thead \{[\s\S]*display:\s*none/.test(globalsCss)
    && /\.lts-shell--mobile \.config-page \.config-cut-rules-table tr,[\s\S]*html\.in-config-page \.config-page \.config-cut-rules-table tr \{[\s\S]*display:\s*grid/.test(globalsCss),
);

assert(
  'mobile CPSX inputs stay compact for dense configuration forms',
  /\.lts-shell--mobile \.config-page \.config-cpsx-panel \.form-input,[\s\S]*html\.in-config-page \.config-page \.config-cpsx-panel \.config-inline-input \{[\s\S]*min-height:\s*38px/.test(globalsCss)
    && /\.lts-shell--mobile \.config-page \.config-cpsx-param \.config-inline-input,[\s\S]*html\.in-config-page \.config-page \.config-cut-rules-table \.config-inline-input \{[\s\S]*min-height:\s*34px/.test(globalsCss),
);

assert(
  'mobile cut-rule delete action is labeled and not a floating x',
  source.includes('config-cut-rule-delete-cell')
    && source.includes('config-cut-rule-delete-btn')
    && /\.lts-shell--mobile \.config-page \.config-cut-rule-delete-btn::before,[\s\S]*html\.in-config-page \.config-page \.config-cut-rule-delete-btn::before \{[\s\S]*content:\s*"Xóa quy tắc"/.test(globalsCss),
);

if (failed > 0) {
  console.error(`\n${failed} responsive layout checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${passed} responsive layout checks passed.`);
