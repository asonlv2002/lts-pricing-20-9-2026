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
  'mobile cut rules stay a real table (header visible) like the Nhũ table',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-cut-rules-table,[\s\S]*html\.in-config-page \.config-page \.config-cut-rules-table \{[\s\S]*min-width:\s*360px/.test(globalsCss)
    && !/\.config-cut-rules-table thead,[\s\S]*display:\s*none/.test(globalsCss)
    && !/\.config-cut-rules-table \{[^}]*table-layout:\s*fixed/.test(globalsCss),
);

assert(
  'mobile CPSX inputs stay compact for dense configuration forms',
  /\.lts-shell--mobile \.config-page \.config-cpsx-panel \.form-input,[\s\S]*html\.in-config-page \.config-page \.config-cpsx-panel \.config-inline-input \{[\s\S]*min-height:\s*38px/.test(globalsCss)
    && /\.lts-shell--mobile \.config-page \.config-cpsx-param \.config-inline-input,[\s\S]*html\.in-config-page \.config-page \.config-cut-rules-table \.config-inline-input \{[\s\S]*min-height:\s*34px/.test(globalsCss),
);

assert(
  'mobile cut-rule delete action is an accessible icon button',
  source.includes('config-cut-rule-delete-cell')
    && source.includes('config-cut-rule-delete-btn')
    && source.includes('aria-label="Xóa quy tắc"'),
);

assert(
  'mobile print card shows inline operators instead of ::before descriptions',
  /@media \(max-width:\s*767px\) \{[\s\S]*\.lts-shell--mobile \.config-page \.config-cpsx-print-card \.config-cpsx-setup-row::before,[\s\S]*content:\s*none\s*!important[\s\S]*display:\s*none\s*!important/.test(globalsCss)
    && /\.lts-shell--mobile \.config-page \.config-cpsx-print-card \.config-cpsx-param-pair > span,[\s\S]*display:\s*inline\s*!important/.test(globalsCss),
);

assert(
  'mobile print card inputs use the shared pill style (0.88rem, input-bg)',
  /\.lts-shell--mobile \.config-page \.config-cpsx-print-card \.config-cpsx-formula-panel \.config-inline-input,[\s\S]*font-size:\s*0\.88rem\s*!important[\s\S]*background:\s*var\(--input-bg\)\s*!important/.test(globalsCss),
);

assert(
  'mobile waste formula (merge + cut) shares the inline flex-wrap layout',
  /\.lts-shell--mobile \.config-page \.config-cpsx-merge-card \.config-cpsx-waste-grid,[\s\S]*\.lts-shell--mobile \.config-page \.config-cpsx-cut-card \.config-cpsx-waste-grid,[\s\S]*display:\s*flex\s*!important[\s\S]*flex-wrap:\s*wrap\s*!important/.test(globalsCss),
);

assert(
  'mobile cut card formula inputs use the shared pill style (0.88rem)',
  /\.lts-shell--mobile \.config-page \.config-cpsx-cut-card \.config-cpsx-param \.config-inline-input,[\s\S]*font-size:\s*0\.88rem\s*!important/.test(globalsCss)
    && source.includes('config-cpsx-lead'),
);

if (failed > 0) {
  console.error(`\n${failed} responsive layout checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${passed} responsive layout checks passed.`);
