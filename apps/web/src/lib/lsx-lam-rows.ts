/**
 * Nguồn CHUNG các dòng MÁY GHÉP cho cả PDF / DOCX / preview HTML.
 * Trước đây mỗi renderer tự quyết cách vẽ pass ghép nên dễ lệch nhau.
 *
 * - 'single' = 1 vật liệu → 2 ô: "Màng ghép N: <tên>" | "Khổ: <khổ>"
 * - 'dual'   = 2 vật liệu (dual-structure) → 5 ô: ô label lớn
 *              + (tên, khổ) cho từng vật liệu con
 */

import type { LsxLamExportRow } from './lsxExport';

export interface LsxLamGridPart {
  name: string;
  khoText: string;
}

export type LsxLamGridRow =
  | { kind: 'single'; label: string; name: string; khoText: string }
  | { kind: 'dual'; label: string; parts: LsxLamGridPart[] };

/** Khổ dạng số thuần "480"; thiếu → "…". Renderer tự thêm tiền tố "Khổ ". */
function khoText(widthMm: number, defaultKho: number): string {
  const w = widthMm > 0 ? widthMm : defaultKho;
  return w > 0 ? String(w) : '…';
}

/**
 * Chia khổ nửa MÁY GHÉP (đơn vị DXA cho DOCX, hoặc % nếu quy đổi).
 * - dual: 3 cột — ô label gộp dọc | tên vật liệu | khổ (mỗi vật liệu 1 hàng).
 * - single: tên + khổ = 2 ô.
 * Tổng luôn khớp `totalWidth` để kẻ dọc không lệch.
 */
export function splitLsxLamBlockWidths(totalWidth: number): {
  label: number;
  name: number;
  kho: number;
  single: { name: number; kho: number };
} {
  const label = Math.round(totalWidth * 0.42);
  const name = Math.round(totalWidth * 0.33);
  const kho = totalWidth - label - name;

  const singleName = Math.round(totalWidth * 0.62);
  return {
    label,
    name,
    kho,
    single: { name: singleName, kho: totalWidth - singleName },
  };
}

/**
 * Chuyển các dòng ghép export thành dòng lưới để render.
 * `defaultKho` = khổ màng (mm) dùng khi pass không có khổ riêng.
 */
export function buildLsxLamGridRows(
  lamRows: LsxLamExportRow[],
  defaultKho: number,
): LsxLamGridRow[] {
  return lamRows.map((lr) => {
    const parts = (lr.parts || []).filter((p) => p.name || p.widthMm);
    if (parts.length > 1) {
      return {
        kind: 'dual' as const,
        label: lr.label,
        parts: parts.map((p) => ({
          name: p.name || '',
          khoText: khoText(p.widthMm || 0, defaultKho),
        })),
      };
    }
    return {
      kind: 'single' as const,
      label: lr.label,
      name: parts[0]?.name || lr.name || '',
      khoText: khoText(parts[0]?.widthMm || lr.widthMm || 0, defaultKho),
    };
  });
}
