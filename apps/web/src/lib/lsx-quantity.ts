export interface LsxOrderQuantityParts {
  /** Vd "100.000 túi" — đã bóc hậu tố "(±x%)" cũ nếu có. */
  base: string;
  /** Vd "10.000 túi" — số dung sai tuyệt đối tính từ số lượng đầu × %. Rỗng khi ẩn. */
  approx: string;
  /** Vd "Dung sai (10%): 10.000 túi" — Rỗng khi ẩn (tol ≤ 0 hoặc không parse được số). */
  dungSai: string;
}

const OLD_TOLERANCE_SUFFIX = /\s*\(±\d+(?:[.,]\d+)?%\)/;

/** Lấy số đầu tiên trong chuỗi (hỗ trợ dấu nghìn vi-VN: "100.000", "100,000"). */
function parseQuantityNumber(note: string): number | null {
  const m = note.match(/\d[\d.,]*/);
  if (!m) return null;
  const token = m[0];
  let cleaned: string;
  if (/^\d{1,3}(\.\d{3})+$/.test(token)) {
    cleaned = token.replace(/\./g, '');
  } else if (/^\d{1,3}(,\d{3})+$/.test(token)) {
    cleaned = token.replace(/,/g, '');
  } else if (token.includes(',') && !token.includes('.')) {
    cleaned = token.replace(',', '.');
  } else {
    cleaned = token;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function detectUnit(note: string, fallback: 'túi' | 'm²' = 'túi'): 'túi' | 'm²' {
  return /m²|m2|mét vuông/i.test(note) ? 'm²' : fallback;
}

/**
 * Tách Số lượng thành: base + dung sai tuyệt đối (~x).
 * - base: bóc hậu tố "(±x%)" cũ (LSX legacy còn dính).
 * - approx = số đầu tiên trong base × quantityTolerancePercent / 100.
 * - hide: tol ≤ 0 HOẶC không parse được số → approx/dungSai = '' (ẩn).
 */
export function formatLsxOrderQuantityParts(
  note: string,
  quantityTolerancePercent: number,
  unit?: 'túi' | 'm²',
): LsxOrderQuantityParts {
  const base = note ? note.replace(OLD_TOLERANCE_SUFFIX, '').trim() : '';
  const tol = quantityTolerancePercent || 0;
  const n = parseQuantityNumber(base);
  const u = unit ?? detectUnit(base);
  const hide = !n || !(tol > 0);
  const approx = hide
    ? ''
    : `${Math.round((n * tol) / 100).toLocaleString('vi-VN')} ${u}`;
  const dungSai = hide ? '' : `Dung sai (${tol}%): ${approx}`;
  return { base, approx, dungSai };
}

/** "Số lượng: 100.000 túi Dung sai (10%): 10.000 túi" (1 chuỗi). Ẩn phần Dung sai khi không tính được. */
export function formatLsxOrderQuantity(
  note: string,
  quantityTolerancePercent: number,
  unit?: 'túi' | 'm²',
): string {
  const p = formatLsxOrderQuantityParts(note, quantityTolerancePercent, unit);
  return p.dungSai ? `${p.base}  ${p.dungSai}` : p.base;
}