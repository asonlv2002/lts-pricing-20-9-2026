import type { ProductionOrder } from './types';

/** Seed khi chưa có MSP dạng TP_###### trong danh sách LSX. */
export const MSP_DEFAULT_SEED = 77020;

/**
 * Gen MSP dạng TP_###### từ danh sách LSX hiện có.
 * Quét manual.msp khớp /^TP_(\d+)/i, lấy max + 1, pad 6 chữ số.
 */
export function genMsp(existing: ProductionOrder[]): string {
  let max = MSP_DEFAULT_SEED;
  for (const o of existing) {
    const m = (o.manual?.msp || '').trim().match(/^TP_(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `TP_${String(max + 1).padStart(6, '0')}`;
}

/** Sanitize tên file (Windows-safe). */
export function safeLsxFileName(s: string): string {
  return (s || 'unknown').replace(/[<>:"/\\|?*\s]+/g, '_').slice(0, 60);
}

/**
 * Tên file export LSX = productName (tên bảng tính / SP).
 * Fallback: tenSP → lsxNumber → order.id
 */
export function lsxExportBaseName(order: ProductionOrder): string {
  const name =
    order.snapshot?.productName?.trim() ||
    order.manual?.tenSP?.trim() ||
    order.manual?.lsxNumber?.trim() ||
    order.id ||
    'LSX';
  return safeLsxFileName(name);
}
