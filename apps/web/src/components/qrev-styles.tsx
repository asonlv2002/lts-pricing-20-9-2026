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
.qrev-user-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  color: #fff; font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em;
}

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

.qrev-rejected-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid #fecaca; background: #fef2f2; cursor: help;
}

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
  .lts-shell--mobile .qrev-root { padding: 12px 10px; }
  .lts-shell--mobile .qrev-title { font-size: 18px; }
  .lts-shell--mobile .qrev-chips { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
  .lts-shell--mobile .qrev-chip { flex-shrink: 0; }

  .lts-shell--mobile .qrev-table { min-width: 0; }
  .lts-shell--mobile .qrev-table thead { display: none; }
  .lts-shell--mobile .qrev-table-wrap { border: 0; background: transparent; overflow: visible; }
  .lts-shell--mobile .qrev-table,
  .lts-shell--mobile .qrev-table tbody { display: block; }

  /* 3 danh sách (LSX / Tính giá / Báo giá) đã chuyển sang .qrev-mcard-list trên mobile */
  .lts-shell--mobile .qrev-table--lsx,
  .lts-shell--mobile .qrev-table--tinhgia,
  .lts-shell--mobile .qrev-table--baogia { display: none; }
  .lts-shell--mobile .qrev-mcard-list { display: block; }
  .lts-shell--mobile .qrev-chips { scrollbar-width: none; }
  .lts-shell--mobile .qrev-chips::-webkit-scrollbar { display: none; }

  .lts-shell--mobile .qrev-mcard {
    display: flex; flex-direction: column; gap: 6px;
    min-height: 116px; padding: 12px 14px;
    background: var(--surface, #fff); border: 1px solid var(--border, #e5e7eb);
    border-radius: 14px; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
    margin-bottom: 10px; cursor: pointer;
  }
  .lts-shell--mobile .qrev-mcard:active { transform: scale(0.995); }
  .lts-shell--mobile .qrev-mcard-r1 {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
  }
  .lts-shell--mobile .qrev-mcard-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 700; font-size: 14.5px; color: var(--text, #111827);
    min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .lts-shell--mobile .qrev-mcard-name {
    font-weight: 700; font-size: 14px; color: var(--text, #111827);
    min-width: 0; overflow: hidden; white-space: nowrap;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .lts-shell--mobile .qrev-mcard-name > span:first-child,
  .lts-shell--mobile .qrev-mcard-name { text-overflow: ellipsis; }
  .lts-shell--mobile .qrev-mcard-name .qrev-badge {
    font-size: 10.5px; padding: 2px 7px; flex-shrink: 0;
  }
  .lts-shell--mobile .qrev-mcard-price {
    font-weight: 800; font-size: 14px; color: var(--accent, #0891b2);
    white-space: nowrap; flex-shrink: 0; margin-left: auto;
  }
  .lts-shell--mobile .qrev-mcard-customer {
    font-size: 13px; font-weight: 600; color: var(--text, #374151);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .lts-shell--mobile .qrev-mcard-sub {
    font-size: 12px; color: var(--muted, #6b7280);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .lts-shell--mobile .qrev-mcard-foot {
    margin-top: auto; display: flex; align-items: center;
    justify-content: space-between; gap: 8px;
    border-top: 1px dashed var(--border, #e5e7eb); padding-top: 9px;
  }
  .lts-shell--mobile .qrev-mcard-left {
    display: inline-flex; align-items: center; gap: 8px; min-width: 0;
  }
  .lts-shell--mobile .qrev-mcard-time {
    font-size: 11.5px; color: var(--dim, #9ca3af);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .lts-shell--mobile .qrev-mcard-actions {
    display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  }
  .lts-shell--mobile .qrev-mcard-actions .qrev-row-actions { gap: 6px; }
  .lts-shell--mobile .qrev-mcard-actions .qrev-btn-icon { width: 38px; height: 38px; }
  .lts-shell--mobile .qrev-mavatar .qrev-user-avatar { width: 32px; height: 32px; font-size: 12px; }
  .lts-shell--mobile .qrev-mstatus {
    font-size: 11px; font-weight: 700; padding: 2px 9px;
    border-radius: 999px; white-space: nowrap; flex-shrink: 0;
  }
  .lts-shell--mobile .qrev-mstatus--ok { color: #047857; background: rgba(16, 185, 129, 0.12); }
  .lts-shell--mobile .qrev-mstatus--err { color: #b91c1c; background: rgba(239, 68, 68, 0.10); }
  .lts-shell--mobile .qrev-mstatus--pending { color: #b45309; background: rgba(217, 119, 6, 0.12); }
  .lts-shell--mobile .qrev-mstatus--none { color: var(--muted, #6b7280); background: var(--surface2, #f3f4f6); }
  .lts-shell--mobile .qrev-mcard-detail {
    border: 1px solid var(--border, #e5e7eb); border-top: 0;
    border-radius: 0 0 14px 14px; background: var(--surface2, #f8fafc);
    padding: 10px 12px; margin: -10px 0 12px; font-size: 0.82rem;
  }

  .lts-shell--mobile .qrev-slide-panel { width: 100vw; }
}

/* ── Card mobile dùng chung 3 danh sách + tooltip avatar người lập ── */
.qrev-mcard-list { display: none; }
.qrev-mavatar-wrap { position: relative; display: inline-flex; }
.qrev-mavatar-wrap.is-open { z-index: 1001; }
.qrev-mavatar {
  border: 0; background: transparent; padding: 2px; cursor: pointer;
  display: inline-flex; border-radius: 50%;
}
.qrev-mavatar:focus-visible {
  outline: 2px solid var(--accent, #0891b2); outline-offset: 2px;
}
.qrev-mavatar-empty { color: var(--muted, #6b7280); }
.qrev-mavatar-backdrop { position: fixed; inset: 0; z-index: 1000; }
.qrev-mavatar-tip {
  position: absolute; bottom: calc(100% + 10px); left: 0;
  background: #0f172a; color: #fff; font-size: 12px; font-weight: 600;
  padding: 6px 10px; border-radius: 8px; white-space: nowrap;
  max-width: 72vw; overflow: hidden; text-overflow: ellipsis;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.25);
  animation: qrevTipIn 0.14s ease-out;
}
.qrev-mavatar-tip::after {
  content: ""; position: absolute; top: 100%; left: 14px;
  border: 5px solid transparent; border-top-color: #0f172a;
}
@keyframes qrevTipIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
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
