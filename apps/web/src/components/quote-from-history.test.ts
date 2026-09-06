/**
 * quote-from-history.test.ts - Regression checks for creating quote drafts from pricing history.
 * Run: npx tsx src/components/quote-from-history.test.ts
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

const historySource = readFileSync(resolve(process.cwd(), 'src/components/ModuleLichSuDB.tsx'), 'utf8');
const quoteSource = readFileSync(resolve(process.cwd(), 'src/components/ModuleBaoGia.tsx'), 'utf8');
const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const shellSource = readFileSync(resolve(process.cwd(), 'src/components/layout/VoTrang.tsx'), 'utf8');

console.log('\n== Quote draft from pricing history ==');

assert(
  'history module stores selected pricing items for quote draft prefill',
  historySource.includes('QUOTE_PREFILL_STORAGE_KEY')
    && historySource.includes('selectedQuoteHistoryIds')
    && historySource.includes('quoteDraftCustomer')
    && historySource.includes('historyItemIds'),
);

assert(
  'selecting first pricing item locks the selection to the same customer',
  historySource.includes('quoteDraftCustomer')
    && /item\.customer\s*===\s*quoteDraftCustomer/.test(historySource)
    && /setQuoteDraftCustomer\(item\.customer\)/.test(historySource),
);

assert(
  'selected quote draft list supports delete icon with confirmation',
  historySource.includes('quoteDeleteTarget')
    && historySource.includes('Xóa sản phẩm khỏi báo giá?')
    && historySource.includes('<Trash2')
    && historySource.includes('confirmQuoteDelete'),
);

assert(
  'creating quote draft navigates to quotation module instead of saving immediately',
  historySource.includes('createQuoteDraftFromSelection')
    && historySource.includes("localStorage.setItem(QUOTE_PREFILL_STORAGE_KEY")
    && /khiDieuHuong\?\.\('quotations'\)/.test(historySource),
);

const voTrangWiringCount = (shellSource.match(/menuKeyTaoBaoGiaTuLichSu\(m\)/g) || []).length;

assert(
  'both history modules wire quotations → tao-bao-gia (wizard host, not danh-sach-bao-gia list)',
  voTrangWiringCount === 2
    && !shellSource.includes('menuKeyTuModule(m)'),
  ` - VoTrang wirings using helper: ${voTrangWiringCount}`,
);

assert(
  'wizard keeps prefill key until history arrives (no early delete on empty history)',
  quoteSource.includes('readQuotePrefillFromHistory(true)')
    && quoteSource.includes("historyItems.length === 0")
    && quoteSource.includes('QUOTE_PREFILL_STORAGE_KEY'),
);

assert(
  'quotation wizard consumes quote draft prefill from history',
  quoteSource.includes('QUOTE_PREFILL_STORAGE_KEY')
    && quoteSource.includes('readQuotePrefillFromHistory')
    && quoteSource.includes('historyItemIds')
    && /customer: prefillCustomer,\s*products: prefillProducts/.test(quoteSource),
);

assert(
  'quotation wizard maps prefilled history items into editable product tiers',
  quoteSource.includes('buildWizardProductFromHistoryItem')
    && quoteSource.includes('historyItem: historyItemHienThi')
    && quoteSource.includes('baoGia: item.chotGia ?? item.finalPrice'),
);

assert(
  'selected pricing rows expose a delete icon in row actions',
  historySource.includes('selectedQuoteHistoryIds.has(h.id)')
    && historySource.includes('setQuoteDeleteTarget(h)')
    && historySource.includes('Xóa khỏi danh sách tạo báo giá'),
);

assert(
  'mobile pricing history keeps all table columns visible with horizontal scroll',
  /\.lts-shell--mobile \.hist-mobile-list \.table-responsive \{[\s\S]*overflow-x:\s*auto/.test(globalsCss)
    && /\.lts-shell--mobile \.hist-data-table--pricing \{[\s\S]*min-width:\s*760px[\s\S]*table-layout:\s*auto/.test(globalsCss)
    && /\.lts-shell--mobile \.hist-data-table--pricing \.hist-col-date,[\s\S]*\.lts-shell--mobile \.hist-data-table--pricing \.hist-col-status,[\s\S]*\.lts-shell--mobile \.hist-data-table--pricing \.hist-col-price,[\s\S]*\.lts-shell--mobile \.hist-data-table--pricing \.hist-col-sale,[\s\S]*\.lts-shell--mobile \.hist-data-table--pricing \.hist-col-customer \{[\s\S]*display:\s*table-cell/.test(globalsCss),
);

assert(
  'mobile pricing history renders a compact select checkbox column',
  /\.lts-shell--mobile \.hist-data-table--pricing \.hist-col-select \{[\s\S]*width:\s*28px/.test(globalsCss)
    && /\.hist-col-select\s+input\[type="checkbox"\] \{[\s\S]*width:\s*14px[\s\S]*height:\s*14px/.test(globalsCss),
);

assert(
  'mobile pricing history leaves room for both view and delete row actions',
  /\.lts-shell--mobile \.hist-data-table--pricing \.hist-col-actions \{[\s\S]*width:\s*76px/.test(globalsCss)
    && /\.lts-shell--mobile \.hist-data-table--pricing \.hist-row-delete-quote-btn \{[\s\S]*display:\s*inline-flex/.test(globalsCss)
    && historySource.includes('<th className="hist-col-select" aria-label="Chọn">✓</th>'),
);

assert(
  'mobile shell class activates at the same 768px breakpoint used by history CSS',
  shellSource.includes('const laManHinhMobile = chieuRong <= 768;')
    && globalsCss.includes('@media (max-width: 768px)'),
);

if (failed > 0) {
  console.error(`\n${failed} quote-from-history checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${passed} quote-from-history checks passed.`);
