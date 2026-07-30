"use client";
// src/components/wizard/wizard-styles.ts
// ─────────────────────────────────────────────────────────────────────────────
// CSS chung cho các wizard (ModuleBaoGia, TaoLsxWizard, ...) — tránh duplicate.
// Inject qua <style>{WIZARD_STYLES}</style> trong từng wizard component để CSS
// chỉ apply khi wizard mount (tránh global pollution).
// ─────────────────────────────────────────────────────────────────────────────

export const WIZARD_STYLES = `
.wiz-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; }
.wiz-modal { background: var(--background, #fff); border-radius: 14px; width: 100%; max-width: 860px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); display: flex; flex-direction: column; min-height: 500px; }
.wiz-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px 14px; border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-title { font-size: 1.05rem; font-weight: 700; color: var(--foreground, #111); }
.wiz-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: var(--muted, #6b7280); transition: background 0.15s; }
.wiz-close:hover { background: var(--surface, #f3f4f6); }
.wiz-steps { display: flex; align-items: center; padding: 16px 24px; gap: 0; border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-step { display: flex; align-items: center; gap: 8px; flex: 1; }
.wiz-step-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; transition: all 0.2s; }
.wiz-step-num--done { background: var(--accent, #0891b2); color: #fff; }
.wiz-step-num--active { background: var(--accent, #0891b2); color: #fff; box-shadow: 0 0 0 3px rgba(8,145,178,0.2); }
.wiz-step-num--pending { background: var(--border, #e5e7eb); color: var(--muted, #9ca3af); }
.wiz-step-label { font-size: 0.8rem; font-weight: 500; color: var(--muted, #6b7280); white-space: nowrap; }
.wiz-step-label--active { color: var(--accent, #0891b2); font-weight: 600; }
.wiz-step-sep { flex: 1; height: 1px; background: var(--border, #e5e7eb); margin: 0 8px; }
.wiz-body { flex: 1; padding: 24px; overflow-y: auto; }
.wiz-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid var(--border, #e5e7eb); gap: 12px; }
.wiz-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
.wiz-btn--primary { background: var(--accent, #0891b2); color: #fff; }
.wiz-btn--primary:hover { opacity: 0.9; }
.wiz-btn--secondary { background: var(--surface, #f3f4f6); color: var(--foreground, #111); border: 1px solid var(--border, #e5e7eb); }
.wiz-btn--secondary:hover { background: var(--border, #e5e7eb); }
.wiz-btn--ghost { background: transparent; color: var(--muted, #6b7280); }
.wiz-btn--ghost:hover { color: var(--foreground, #111); }
.wiz-btn--danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.wiz-btn--danger:hover { background: #fee2e2; }
.wiz-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.wiz-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted, #6b7280); margin-bottom: 10px; }
.wiz-search-box { position: relative; margin-bottom: 12px; }
.wiz-search-input { width: 100%; padding: 9px 12px 9px 36px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; font-size: 0.88rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; box-sizing: border-box; }
.wiz-search-input:focus { border-color: var(--accent, #0891b2); box-shadow: 0 0 0 2px rgba(8,145,178,0.12); }
.wiz-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted, #9ca3af); pointer-events: none; }
.wiz-customer-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
.wiz-customer-card { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1.5px solid var(--border, #e5e7eb); border-radius: 10px; cursor: pointer; transition: all 0.15s; background: var(--background, #fff); }
.wiz-customer-card:hover { border-color: var(--accent, #0891b2); background: rgba(8,145,178,0.04); }
.wiz-customer-card--selected { border-color: var(--accent, #0891b2); background: rgba(8,145,178,0.07); }
.wiz-customer-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(8,145,178,0.1); display: flex; align-items: center; justify-content: center; color: var(--accent, #0891b2); flex-shrink: 0; }
.wiz-customer-name { font-size: 0.9rem; font-weight: 600; color: var(--foreground, #111); }
.wiz-customer-meta { font-size: 0.76rem; color: var(--muted, #6b7280); margin-top: 1px; }
.wiz-customer-check { margin-left: auto; color: var(--accent, #0891b2); flex-shrink: 0; }
.wiz-customer-summary { border: 1.5px solid var(--border, #e5e7eb); border-radius: 12px; padding: 16px; background: var(--background, #fff); margin-bottom: 14px; }
.wiz-customer-summary--selected { border-color: var(--accent, #0891b2); background: rgba(8,145,178,0.05); }
.wiz-customer-summary-main { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.wiz-customer-picker-trigger { width: 100%; justify-content: center; min-height: 44px; }
.wiz-customer-sheet-backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(15,23,42,0.45); display: flex; align-items: flex-end; justify-content: center; }
.wiz-customer-sheet { width: 100%; max-width: 520px; max-height: 82dvh; border-radius: 24px 24px 0 0; background: var(--background, #fff); box-shadow: 0 -18px 44px rgba(15,23,42,0.22); display: flex; flex-direction: column; overflow: hidden; }
.wiz-customer-sheet-handle { width: 42px; height: 4px; border-radius: 999px; background: var(--border, #e5e7eb); margin: 10px auto 4px; }
.wiz-customer-sheet-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 18px 12px; border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-customer-sheet-title { font-size: 1rem; font-weight: 800; color: var(--foreground, #111); }
.wiz-customer-sheet-body { padding: 14px 18px 18px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.wiz-recent-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.wiz-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 500; border: 1px solid var(--border, #e5e7eb); background: var(--surface, #f9fafb); color: var(--foreground, #111); cursor: pointer; transition: all 0.15s; }
.wiz-chip:hover { border-color: var(--accent, #0891b2); color: var(--accent, #0891b2); }
.wiz-selected-customer { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1.5px solid var(--accent, #0891b2); border-radius: 10px; background: rgba(8,145,178,0.06); margin-bottom: 16px; }
.wiz-product-card { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
.wiz-product-header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface, #f9fafb); border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-product-title { font-size: 0.88rem; font-weight: 600; color: var(--foreground, #111); flex: 1; }
.wiz-product-meta { font-size: 0.75rem; color: var(--muted, #6b7280); }
.wiz-tier-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.wiz-tier-table th { padding: 7px 10px; text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted, #6b7280); background: var(--surface, #f9fafb); border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-tier-table td { padding: 7px 10px; border-bottom: 1px solid var(--border, #e5e7eb); vertical-align: middle; }
.wiz-tier-table tr:last-child td { border-bottom: none; }
.wiz-tier-input { width: 100%; padding: 5px 8px; border: 1px solid var(--border, #e5e7eb); border-radius: 6px; font-size: 0.82rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; box-sizing: border-box; }
.wiz-tier-input:focus { border-color: var(--accent, #0891b2); }
.wiz-tier-input--warn { border-color: #f59e0b; background: #fffbeb; }
.wiz-tier-ref { font-size: 0.75rem; color: var(--muted, #9ca3af); margin-top: 2px; }
.wiz-tier-diff { font-size: 0.72rem; margin-top: 1px; }
.wiz-tier-diff--pos { color: #059669; }
.wiz-tier-diff--neg { color: #dc2626; }
.wiz-tier-warn { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #d97706; margin-top: 2px; }
.wiz-add-tier { display: flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 0.8rem; color: var(--accent, #0891b2); background: transparent; border: none; cursor: pointer; }
.wiz-add-tier:hover { text-decoration: underline; }
.wiz-add-product { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1.5px dashed var(--border, #e5e7eb); border-radius: 10px; font-size: 0.85rem; color: var(--accent, #0891b2); background: transparent; cursor: pointer; width: 100%; justify-content: center; transition: all 0.15s; margin-top: 4px; }
.wiz-add-product:hover { border-color: var(--accent, #0891b2); background: rgba(8,145,178,0.04); }
.wiz-spec-toggle { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--border, #e5e7eb); background: var(--background, #fff); color: var(--foreground, #111); border-radius: 7px; padding: 4px 9px; font-size: 0.76rem; font-weight: 650; cursor: pointer; }
.wiz-spec-toggle:hover { border-color: var(--accent, #0891b2); color: var(--accent, #0891b2); }
.wiz-bag-spec { padding: 12px 14px 14px; border-bottom: 1px solid var(--border, #e5e7eb); background: linear-gradient(180deg, rgba(8,145,178,0.045), rgba(8,145,178,0.015)); }
.wiz-bag-spec-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; font-size: 0.78rem; font-weight: 800; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: 0.045em; }
.wiz-bag-spec-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.wiz-bag-field { display: flex; flex-direction: column; gap: 4px; }
.wiz-bag-label { font-size: 0.72rem; font-weight: 700; color: var(--muted, #6b7280); }
.wiz-bag-input, .wiz-bag-select { width: 100%; min-height: 34px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px; padding: 5px 8px; background: var(--background, #fff); color: var(--foreground, #111); font-size: 0.82rem; box-sizing: border-box; outline: none; }
.wiz-bag-input:focus, .wiz-bag-select:focus { border-color: var(--accent, #0891b2); box-shadow: 0 0 0 2px rgba(8,145,178,0.12); }
.wiz-bag-checks { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 12px; }
.wiz-bag-check { display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 650; color: var(--foreground, #111); }
.wiz-bag-hint { font-size: 0.72rem; color: var(--muted, #6b7280); margin-top: 4px; }
.wiz-bag-total { min-height: 34px; display: flex; align-items: center; border: 1px dashed var(--border, #e5e7eb); border-radius: 7px; padding: 5px 8px; background: rgba(255,255,255,0.55); font-size: 0.82rem; font-weight: 700; }
.wiz-desc-block { margin-top: 12px; padding: 10px 12px; background: var(--surface, #f9fafb); border-radius: 8px; border: 1px solid var(--border, #e5e7eb); }
.wiz-desc-title { font-size: 0.72rem; font-weight: 800; color: var(--muted, #6b7280); text-transform: uppercase; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-desc-row { display: flex; align-items: baseline; gap: 6px; padding: 3px 0; font-size: 0.82rem; line-height: 1.45; }
.wiz-desc-label { flex-shrink: 0; width: 120px; font-weight: 650; color: var(--muted, #6b7280); font-size: 0.78rem; }
.wiz-desc-value { color: var(--foreground, #111); word-break: break-word; }
.wiz-spec-section { margin-top: 8px; border-top: 1px solid var(--border, #e5e7eb); padding-top: 8px; }
.wiz-spec-row { display: flex; align-items: center; gap: 5px; padding: 3px 0; min-height: 30px; flex-wrap: wrap; }
.wiz-spec-row-group { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; }
.wiz-spec-toggle-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; margin-top: 2px; }
.wiz-spec-check-label { display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem; font-weight: 650; color: var(--foreground, #111); cursor: pointer; white-space: nowrap; }
.wiz-spec-check-label input { margin: 0; }
.wiz-spec-badge { font-size: 0.78rem; font-weight: 650; color: var(--accent, #0891b2); white-space: nowrap; }
.wiz-spec-inline-input { width: 52px; height: 26px; border: 1px solid var(--border, #e5e7eb); border-radius: 5px; padding: 2px 4px; font-size: 0.78rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; box-sizing: border-box; text-align: right; }
.wiz-spec-inline-input:focus { border-color: var(--accent, #0891b2); }
.wiz-spec-inline-text { flex: 1; min-width: 130px; height: 26px; border: 1px solid var(--border, #e5e7eb); border-radius: 5px; padding: 2px 6px; font-size: 0.78rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; box-sizing: border-box; }
.wiz-spec-inline-text:focus { border-color: var(--accent, #0891b2); }
.wiz-spec-unit { font-size: 0.72rem; color: var(--muted, #6b7280); white-space: nowrap; }
.wiz-spec-inline-select { height: 26px; border: 1px solid var(--border, #e5e7eb); border-radius: 5px; padding: 1px 4px; font-size: 0.78rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; }
.wiz-product-search-dropdown { border: 1px solid var(--border, #e5e7eb); border-radius: 8px; max-height: 260px; overflow-y: auto; background: var(--background, #fff); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.wiz-product-option { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--border, #e5e7eb); transition: background 0.1s; }
.wiz-product-option:last-child { border-bottom: none; }
.wiz-product-option:hover { background: var(--surface, #f9fafb); }
.wiz-product-option--disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.wiz-confirm-section { background: var(--surface, #f9fafb); border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.wiz-confirm-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 0.85rem; }
.wiz-confirm-row:last-child { margin-bottom: 0; }
.wiz-confirm-label { color: var(--muted, #6b7280); min-width: 120px; flex-shrink: 0; }
.wiz-confirm-value { color: var(--foreground, #111); font-weight: 500; }
.wiz-confirm-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.wiz-confirm-table th { padding: 7px 10px; text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted, #6b7280); border-bottom: 1px solid var(--border, #e5e7eb); }
.wiz-confirm-table td { padding: 8px 10px; border-bottom: 1px solid var(--border, #e5e7eb); vertical-align: top; }
.wiz-confirm-table tr:last-child td { border-bottom: none; }
.wiz-terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.wiz-terms-field { display: flex; flex-direction: column; gap: 4px; }
.wiz-terms-label { font-size: 0.76rem; font-weight: 600; color: var(--muted, #6b7280); }
.wiz-terms-input { padding: 7px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px; font-size: 0.85rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; }
.wiz-terms-input:focus { border-color: var(--accent, #0891b2); }
.wiz-terms-textarea { padding: 7px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px; font-size: 0.85rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; resize: vertical; min-height: 60px; }
.wiz-terms-textarea:focus { border-color: var(--accent, #0891b2); }
.wiz-cb { position: relative; width: 100%; }
.wiz-cb-trigger { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px; font-size: 0.85rem; background: var(--background, #fff); color: var(--foreground, #111); cursor: pointer; min-height: 36px; user-select: none; transition: border-color 0.15s; }
.wiz-cb-trigger:hover { border-color: var(--accent, #0891b2); }
.wiz-cb-trigger--open { border-color: var(--accent, #0891b2); box-shadow: 0 0 0 2px rgba(8,145,178,0.12); }
.wiz-cb-value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wiz-cb-placeholder { color: var(--muted, #9ca3af); }
.wiz-cb-arrow { flex-shrink: 0; color: var(--muted, #6b7280); transition: transform 0.2s; }
.wiz-cb-arrow--open { transform: rotate(180deg); }
.wiz-cb-dropdown { position: absolute; top: 100%; left: 0; right: 0; z-index: 50; margin-top: 4px; background: var(--background, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 260px; overflow-y: auto; }
.wiz-cb-option { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 12px; border: none; background: transparent; cursor: pointer; font-size: 0.84rem; color: var(--foreground, #111); text-align: left; transition: background 0.1s; }
.wiz-cb-option:hover { background: var(--surface, #f3f4f6); }
.wiz-cb-option--selected { background: rgba(8,145,178,0.06); color: var(--accent, #0891b2); font-weight: 600; }
.wiz-cb-option--other { color: var(--muted, #6b7280); font-style: italic; }
.wiz-cb-check { flex-shrink: 0; color: var(--accent, #0891b2); }
.wiz-cb-separator { height: 1px; margin: 4px 8px; background: var(--border, #e5e7eb); }
.wiz-cb-custom { display: flex; align-items: center; gap: 6px; padding: 6px 12px; }
.wiz-cb-custom-input { flex: 1; padding: 6px 8px; border: 1px solid var(--border, #e5e7eb); border-radius: 6px; font-size: 0.84rem; background: var(--background, #fff); color: var(--foreground, #111); outline: none; }
.wiz-cb-custom-input:focus { border-color: var(--accent, #0891b2); }
.wiz-cb-custom-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: 6px; background: var(--accent, #0891b2); color: #fff; cursor: pointer; flex-shrink: 0; }
.wiz-cb-custom-btn:hover { opacity: 0.85; }
.wiz-error { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 7px; font-size: 0.82rem; color: #dc2626; margin-bottom: 12px; }
.wiz-empty { text-align: center; padding: 32px 16px; color: var(--muted, #9ca3af); font-size: 0.88rem; }
.sp-sticky-header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--border, #e5e7eb); background: var(--surface, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.sp-section { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; position: relative; transition: border-color 0.2s, opacity 0.2s; }
.sp-section-title { font-size: 0.92rem; font-weight: 700; margin: 0 0 16px; color: var(--foreground, #111); display: flex; align-items: center; gap: 8px; }
.sp-section-num { width: 24px; height: 24px; border-radius: 50%; background: var(--accent, #0891b2); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; }
.sp-section--disabled { opacity: 0.4; pointer-events: none; user-select: none; }
.sp-disabled-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.88rem; color: var(--muted, #6b7280); font-weight: 500; z-index: 2; background: rgba(255,255,255,0.5); border-radius: 10px; }
.sp-section--error { border-color: #fca5a5; box-shadow: 0 0 0 2px rgba(252,165,165,0.3); }
.quote-wizard-title { font-size: 1.1rem; font-weight: 700; color: var(--text, #1e293b); margin: 0; }
.quote-wizard-subtitle { display: none; }
.quote-wizard-mobile-action { display: none; }
@media (max-width: 768px) {
  .quote-wizard-root { height: auto !important; min-height: 100%; background: #f4f7fb; }
  .quote-wizard-header { position: sticky; top: 0; z-index: 40; min-height: 64px; padding: calc(8px + env(safe-area-inset-top)) 16px 10px; background: #ffffff; border-bottom: 1px solid rgba(15,23,42,0.08); box-shadow: 0 1px 0 rgba(15,23,42,0.03); }
  .quote-wizard-header-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .quote-wizard-title-stack { display: flex; flex-direction: column; min-width: 0; }
  .quote-wizard-title { margin: 0; color: #111827; font-size: 16px; line-height: 1.25; font-weight: 800; }
  .quote-wizard-subtitle { display: block; color: #64748b; font-size: 12px; line-height: 1.35; font-weight: 600; }
  .quote-wizard-header-actions { display: flex; align-items: center; gap: 8px; }
  .quote-wizard-header-actions .wiz-btn--secondary,
  .quote-wizard-header-actions .wiz-btn--primary { display: none; }
  .quote-wizard-close { width: 44px; height: 44px; padding: 0 !important; border-radius: 999px; background: #f8fafc; }
  .quote-wizard-content { flex: none !important; overflow: visible !important; padding: 14px 14px calc(156px + env(safe-area-inset-bottom)) !important; }
  .sp-section { margin-bottom: 14px; padding: 16px 14px; border-radius: 18px; background: #ffffff; box-shadow: 0 4px 14px rgba(15,23,42,0.045); }
  .sp-section-title { margin-bottom: 14px; font-size: 15px; }
  .sp-section-num { width: 28px; height: 28px; }
  .wiz-section-title { margin-bottom: 8px; color: #64748b; font-size: 12px; }
  .wiz-search-input { min-height: 48px; padding-left: 42px; border-radius: 14px; font-size: 16px; background: #ffffff; }
  .wiz-search-icon { left: 14px; }
  .wiz-recent-chips { flex-wrap: nowrap; gap: 8px; margin: 0 -14px 16px; padding: 0 14px 2px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .wiz-recent-chips::-webkit-scrollbar { display: none; }
  .wiz-chip { min-height: 44px; padding: 8px 12px; border-radius: 14px; white-space: nowrap; }
  .wiz-customer-list { max-height: none; overflow: visible; gap: 10px; }
  .wiz-customer-card { min-height: 72px; align-items: flex-start; padding: 12px; border-width: 1px; border-radius: 16px; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
  .wiz-customer-icon { width: 40px; height: 40px; border-radius: 12px; }
  .wiz-customer-name { font-size: 15px; line-height: 1.25; }
  .wiz-customer-meta { display: flex; flex-wrap: wrap; gap: 4px 8px; margin-top: 4px; font-size: 12px; line-height: 1.35; }
  .wiz-customer-meta span { margin-left: 0 !important; }
  .quote-wizard-mobile-action { position: fixed; left: 0; right: 0; bottom: calc(72px + env(safe-area-inset-bottom)); z-index: 70; display: flex; gap: 10px; padding: 10px 14px; background: rgba(255,255,255,0.96); border-top: 1px solid rgba(15,23,42,0.08); box-shadow: 0 -8px 24px rgba(15,23,42,0.08); backdrop-filter: blur(12px); }
  .quote-wizard-mobile-action .wiz-btn { min-height: 46px; justify-content: center; border-radius: 14px; font-size: 14px; }
  .quote-wizard-mobile-action .wiz-btn--primary { flex: 1; background: #4f46e5; }
  .quote-wizard-mobile-action .wiz-btn--secondary { width: 104px; }
  .wiz-bag-spec-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wiz-bag-spec { padding: 12px; }
  .wiz-spec-toggle-grid { grid-template-columns: repeat(2, 1fr); gap: 4px 10px; }
  .wiz-customer-summary { padding: 14px; border-radius: 18px; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
  .wiz-customer-picker-trigger { border-radius: 14px; }
  .wiz-customer-sheet { max-height: 82dvh; }
  .wiz-customer-sheet-body .wiz-customer-list { max-height: none; overflow: visible; }
}
`;
