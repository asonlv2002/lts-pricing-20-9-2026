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
const globalsCssPath = resolve(process.cwd(), 'src/app/globals.css');
const globalsCss = readFileSync(globalsCssPath, 'utf8');
const rootCss = source.match(/\.crm2-root \{[\s\S]*?\n\}/)?.[0] ?? '';
const tableSpacerCss = source.match(/\.crm2-table-bottom-spacer \{[\s\S]*?\}/)?.[0] ?? '';
const shellCrm2Css = globalsCss.match(/\.lts-shell-content:has\(\.crm2-root\)\s*\{[\s\S]*?\}/)?.[0] ?? '';

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
  /\.crm2-table-wrap \{[\s\S]*overflow:\s*auto[\s\S]*-webkit-overflow-scrolling:\s*touch/.test(source),
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
  /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-root \{[\s\S]*padding:\s*10px[\s\S]*max-width:\s*100%[\s\S]*overflow:\s*hidden/.test(source)
    && /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-header,[\s\S]*\.crm2-search-bar,[\s\S]*\.crm2-toolbar,[\s\S]*\.crm2-table-shell \{[\s\S]*max-width:\s*100%[\s\S]*overflow-x:\s*hidden/.test(source),
);

assert(
  'table shell clips wide table so the page itself cannot scroll horizontally',
  /\.crm2-table-shell \{[\s\S]*max-width:\s*100%[\s\S]*min-width:\s*0[\s\S]*overflow:\s*hidden/.test(source)
    && /\.crm2-table-wrap \{[\s\S]*display:\s*block[\s\S]*min-width:\s*0[\s\S]*overflow:\s*auto[\s\S]*overscroll-behavior:\s*contain/.test(source),
);

assert(
  'mobile controls use compact sizing above the table',
  /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-title \{[\s\S]*font-size:\s*18px/.test(source)
    && /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-chip \{[\s\S]*padding:\s*4px 8px[\s\S]*font-size:\s*12px/.test(source)
    && /@media \(max-width:\s*768px\) \{[\s\S]*\.crm2-search-input \{[\s\S]*padding:\s*8px 6px/.test(source),
);

assert(
  'customer layout separates fixed controls from the scrollable table area',
  source.includes('className="crm2-fixed-top"')
    && source.includes('className="crm2-scroll-area"')
    && /display:\s*flex/.test(rootCss)
    && /flex-direction:\s*column/.test(rootCss)
    && /overflow:\s*hidden/.test(rootCss)
    && /\.crm2-fixed-top \{[\s\S]*flex:\s*0 0 auto[\s\S]*position:\s*sticky[\s\S]*top:\s*0/.test(source)
    && /\.crm2-scroll-area \{[\s\S]*flex:\s*1 1 auto[\s\S]*min-height:\s*0[\s\S]*overflow:\s*hidden/.test(source)
    && !/overflow:\s*auto/.test(rootCss),
);

assert(
  'scrollable table area leaves breathing room at the bottom',
  source.includes('className="crm2-table-bottom-spacer"')
    && /height:\s*32px/.test(tableSpacerCss)
    && /min-height:\s*32px/.test(tableSpacerCss)
    && /pointer-events:\s*none/.test(tableSpacerCss)
    && source.includes('scroll-padding-bottom: 32px')
    && !/(^|[^-])padding-bottom:\s*32px/.test(source),
);

assert(
  'table hides the vertical scrollbar without disabling vertical scroll',
  /\.crm2-table-wrap \{[\s\S]*scrollbar-width:\s*thin[\s\S]*scrollbar-color:\s*transparent transparent/.test(source)
    && /\.crm2-table-wrap::-webkit-scrollbar:vertical \{[\s\S]*width:\s*0/.test(source)
    && /\.crm2-table-wrap::-webkit-scrollbar-thumb:vertical,[\s\S]*\.crm2-table-wrap::-webkit-scrollbar-track:vertical \{[\s\S]*background:\s*transparent/.test(source)
    && !/\.crm2-table-wrap \{[\s\S]*overflow-y:\s*hidden/.test(source),
);

assert(
  'shell hides the outer scrollbar for the customer module without disabling scroll',
  /scrollbar-width:\s*none/.test(shellCrm2Css)
    && /\.lts-shell-content:has\(\.crm2-root\)::\-webkit-scrollbar:vertical\s*\{[\s\S]*width:\s*0/.test(globalsCss)
    && /\.lts-shell-content:has\(\.crm2-root\)::\-webkit-scrollbar-thumb:vertical,\s*[\r\n]+\.lts-shell-content:has\(\.crm2-root\)::\-webkit-scrollbar-track:vertical\s*\{[\s\S]*background:\s*transparent/.test(globalsCss)
    && !/overflow-y:\s*hidden/.test(shellCrm2Css),
);

console.log('\n== Customer mobile edit form ==');

assert(
  'mobile customer form renders all wizard cards instead of gating by current step',
  source.includes('isMobileCustomerForm')
    && source.includes('{(isMobileCustomerForm || step === 0) &&')
    && source.includes('{(isMobileCustomerForm || step === 1) &&')
    && source.includes('{(isMobileCustomerForm || step === 2) &&'),
);

assert(
  'mobile customer form exposes a top save action that is disabled until the full form is valid',
  source.includes('crm2-wizard-actions--top')
    && source.includes('canSubmitCustomerForm')
    && /disabled=\{saving \|\| \(isMobileCustomerForm && !canSubmitCustomerForm\)\}/.test(source),
);

assert(
  'mobile customer form pins header and save actions in one sticky top block',
  source.includes('className="crm2-wizard-sticky-top"')
    && /\.lts-shell--mobile \.crm2-wizard-sticky-top \{[\s\S]*position:\s*sticky[\s\S]*top:\s*0[\s\S]*z-index:\s*6/.test(source)
    && !/\.lts-shell--mobile \.crm2-wizard-header \{[\s\S]*position:\s*absolute/.test(source)
    && !/\.lts-shell--mobile \.crm2-wizard-actions \{[\s\S]*position:\s*absolute/.test(source)
    && !/\.lts-shell--mobile \.crm2-edit-panel \{[\s\S]*padding-top:\s*118px/.test(source),
);

if (failed > 0) {
  console.error(`\n${failed} responsive layout checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${passed} responsive layout checks passed.`);
