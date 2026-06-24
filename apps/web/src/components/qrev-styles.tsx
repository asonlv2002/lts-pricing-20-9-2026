"use client";
import { useEffect } from 'react';

export const QREV_STYLES = `
.qrev-root {
  position: relative;
  padding: 24px;
  width: 100%;
  min-width: 0;
  font-family: inherit;
  color: var(--text, #1e293b);
}
.qrev-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 16px;
}
.qrev-header-left { display: flex; flex-direction: column; gap: 4px; }
.qrev-header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.qrev-title { font-size: 22px; font-weight: 700; margin: 0; color: var(--text, #111827); }
.qrev-title-count { font-weight: 400; color: var(--muted, #6b7280); font-size: 16px; }

.qrev-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border, #e5e7eb); background: var(--surface, #fff);
  color: var(--text, #1e293b); transition: all 0.15s;
}
.qrev-btn:hover { background: var(--surface2, #f8f9fb); }
.qrev-btn--ghost { background: transparent; }
.qrev-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.qrev-search-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 42px; margin-bottom: 14px;
  background: var(--surface, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 10px;
  transition: border-color 0.15s;
}
.qrev-search-bar:focus-within { border-color: var(--accent, #0891b2); }
.qrev-search-icon { color: var(--muted, #9ca3af); flex-shrink: 0; }
.qrev-search-input {
  flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
  font-size: 14px; color: var(--text, #1e293b);
}
.qrev-search-input::placeholder { color: var(--muted, #9ca3af); }
.qrev-search-clear { margin-left: 4px; }

.qrev-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.qrev-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border, #e5e7eb);
  background: var(--surface, #fff); color: var(--text, #374151); transition: all 0.15s;
}
.qrev-chip:hover { border-color: var(--accent, #0891b2); }
.qrev-chip--active { background: var(--accent, #0891b2); border-color: var(--accent, #0891b2); color: #fff; }
.qrev-chip-count {
  font-size: 11px; font-weight: 700; padding: 0 6px; border-radius: 999px;
  background: rgba(0,0,0,0.06); color: inherit;
}
.qrev-chip--active .qrev-chip-count { background: rgba(255,255,255,0.25); }
.qrev-chip--review { border-style: dashed; }

.qrev-alert {
  padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px;
}
.qrev-alert--ok { background: #ecfdf5; color: #047857; }
.qrev-alert--err { background: #fef2f2; color: #b91c1c; }

.qrev-table-shell { width: 100%; min-width: 0; }
.qrev-table-wrap {
  width: 100%; overflow-x: auto;
  border: 1px solid var(--border, #e5e7eb); border-radius: 12px;
  background: var(--surface, #fff);
}
.qrev-table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.qrev-table th {
  text-align: left; padding: 12px 16px; font-size: 11.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted, #6b7280);
  border-bottom: 1px solid var(--border, #e5e7eb); background: var(--surface2, #f8fafc);
}
.qrev-table td { padding: 12px 16px; border-bottom: 1px solid var(--border, #f1f5f9); vertical-align: middle; }
.qrev-table tbody tr:last-child td { border-bottom: 0; }
.qrev-row { cursor: pointer; transition: background 0.1s; }
.qrev-row:hover { background: var(--surface2, #f9fafb); }

.qrev-cell-quote { display: flex; align-items: center; gap: 10px; }
.qrev-avatar {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.qrev-cell-quote-text { display: flex; flex-direction: column; min-width: 0; }
.qrev-cell-name { font-weight: 600; color: var(--text, #111827); }
.qrev-cell-sub { font-size: 12px; color: var(--muted, #6b7280); }
.qrev-cell-sale { font-size: 12.5px; color: var(--text, #374151); font-weight: 600; white-space: nowrap; }
.qrev-cell-date { font-size: 12.5px; color: var(--muted, #6b7280); white-space: nowrap; }

.qrev-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; white-space: nowrap;
}
.qrev-badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

.qrev-row-actions { display: flex; gap: 4px; }
.qrev-btn-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--border, #e5e7eb); background: var(--surface, #fff);
  color: var(--muted, #6b7280); transition: all 0.15s;
}
.qrev-btn-icon:hover { background: var(--surface2, #f3f4f6); color: var(--text, #1e293b); }
.qrev-btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }
.qrev-btn-icon--primary { color: var(--accent, #0891b2); border-color: var(--accent, #0891b2); }
.qrev-btn-icon--ok { color: #047857; border-color: #047857; }
.qrev-btn-icon--danger { color: #b91c1c; border-color: #b91c1c; }
.qrev-btn-icon--close { border-color: transparent; }

.qrev-table-bottom-spacer { height: 8px; }

.qrev-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 72px 20px; text-align: center; color: var(--muted, #9ca3af);
  border: 1px dashed var(--border, #e5e7eb); border-radius: 12px;
}
.qrev-empty svg { opacity: 0.4; }
.qrev-empty p { font-size: 15px; font-weight: 600; color: var(--text, #374151); margin: 8px 0 0; }
.qrev-empty span { font-size: 13px; }

.qrev-pagination {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 16px;
}
.qrev-pagination-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--border, #e5e7eb); background: var(--surface, #fff);
  color: var(--text, #374151); font-size: 13px; font-weight: 600;
  transition: all 0.15s;
}
.qrev-pagination-btn:hover:not(:disabled) { background: var(--surface2, #f3f4f6); }
.qrev-pagination-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.qrev-pagination-btn--active { background: var(--accent, #0891b2); border-color: var(--accent, #0891b2); color: #fff; }
.qrev-pagination-info { font-size: 13px; color: var(--muted, #6b7280); margin: 0 8px; }

/* Slide panel chi tiet */
.qrev-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.4); z-index: 1000; }
.qrev-slide-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(520px, 100vw);
  background: var(--surface, #fff); z-index: 1001;
  display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(15,23,42,0.18);
  animation: qrev-slide-in 0.18s ease-out; overflow: hidden;
}
@keyframes qrev-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
.qrev-panel-header {
  display: flex; align-items: center; gap: 12px;
  padding: 18px 20px; border-bottom: 1px solid var(--border, #e5e7eb);
}
.qrev-panel-avatar {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.qrev-panel-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.qrev-panel-name { font-weight: 700; font-size: 15px; color: var(--text, #111827); }
.qrev-panel-meta { font-size: 12px; color: var(--muted, #6b7280); }
.qrev-panel-body { padding: 18px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
.qrev-panel-row { display: flex; align-items: center; gap: 10px; }
.qrev-panel-label { font-size: 12.5px; font-weight: 600; color: var(--muted, #6b7280); }
.qrev-panel-section-title {
  font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--muted, #6b7280); margin-top: 4px;
}
.qrev-info-grid {
  display: flex; flex-direction: column; gap: 2px;
  border: 1px solid var(--border, #e5e7eb); border-radius: 10px; overflow: hidden;
}
.qrev-info-row {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  padding: 9px 12px; border-bottom: 1px solid var(--border, #f1f5f9);
}
.qrev-info-grid .qrev-info-row:last-child { border-bottom: 0; }
.qrev-info-label { font-size: 12.5px; color: var(--muted, #6b7280); flex-shrink: 0; }
.qrev-info-value { font-size: 13px; color: var(--text, #111827); text-align: right; word-break: break-word; }
.qrev-product-line { padding: 10px 12px; border-bottom: 1px solid var(--border, #f1f5f9); }
.qrev-info-grid .qrev-product-line:last-child { border-bottom: 0; }
.qrev-product-name { font-weight: 600; font-size: 13px; color: var(--text, #111827); }
.qrev-product-struct { font-size: 12px; color: var(--muted, #6b7280); margin-bottom: 4px; }
.qrev-product-tier { font-size: 12.5px; color: var(--text, #374151); }

.qrev-panel-footer {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 14px 20px; border-top: 1px solid var(--border, #e5e7eb);
  background: var(--surface, #fff);
}
.qrev-btn--primary { background: var(--accent, #0891b2); border-color: var(--accent, #0891b2); color: #fff; }
.qrev-btn--primary:hover { background: var(--accent, #0e7490); }
.qrev-btn--ok { background: #047857; border-color: #047857; color: #fff; }
.qrev-btn--ok:hover { background: #036949; }
.qrev-btn--danger { background: #b91c1c; border-color: #b91c1c; color: #fff; }
.qrev-btn--danger:hover { background: #991b1b; }

@media (max-width: 767px) {
  .lts-shell--mobile .qrev-root { padding: 14px 12px; }
  .lts-shell--mobile .qrev-title { font-size: 18px; }
  .lts-shell--mobile .qrev-chips { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
  .lts-shell--mobile .qrev-chip { flex-shrink: 0; }

  .lts-shell--mobile .qrev-table { min-width: 0; }
  .lts-shell--mobile .qrev-table thead { display: none; }
  .lts-shell--mobile .qrev-table-wrap { border: 0; background: transparent; overflow: visible; }
  .lts-shell--mobile .qrev-table, .lts-shell--mobile .qrev-table tbody { display: block; }
  .lts-shell--mobile .qrev-row {
    display: flex; flex-direction: column; gap: 10px;
    border: 1px solid var(--border, #e5e7eb); border-radius: 14px;
    padding: 14px; margin-bottom: 10px; background: var(--surface, #fff);
    box-shadow: 0 2px 8px rgba(15,23,42,0.04);
  }
  .lts-shell--mobile .qrev-row td { display: block; padding: 0; border: 0; }
  .lts-shell--mobile .qrev-cell-sale::before { content: 'Sale: '; color: var(--muted, #9ca3af); font-weight: 500; }
  .lts-shell--mobile .qrev-cell-date::before { content: 'Cập nhật: '; color: var(--muted, #9ca3af); }
  .lts-shell--mobile .qrev-row-actions { justify-content: flex-end; }
  .lts-shell--mobile .qrev-slide-panel { width: 100vw; }
}
`;

export function QrevStyleInjector() {
  useEffect(() => {
    const id = 'qrev-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = QREV_STYLES;
    document.head.appendChild(style);
  }, []);
  return null;
}
