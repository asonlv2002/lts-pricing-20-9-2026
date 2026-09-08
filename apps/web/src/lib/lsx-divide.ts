import type { ProductionOrder } from './types';
import { layDongTheoCongDoan } from './lsx-nang-cao';

export interface LsxDivideSpec {
  filmWidthMm: number;
  elementCount: number;
  defaultWidthMm: number;
  widths: number[];
  totalWidthMm: number;
  custom: boolean;
  valid: boolean;
  error: string;
}

/**
 * Khổ trước chia từ dòng "Chia" của bảng đặc tả nâng cao — `khoMangLabel`
 * dạng "0,820 → 0,400" → lấy phần trước mũi tên (feedback 2026-09-05 ý 6:
 * "máy chia lấy công đoạn chia của đặc tả kỹ thuật"). 0 nếu không có.
 */
function layKhoTruocTuDongChia(order: ProductionOrder): number {
  const chia = layDongTheoCongDoan(order, 'Chia');
  const label = chia?.khoMangLabel;
  if (!label) return 0;
  const truoc = label.split('→')[0]?.trim().replace(',', '.') ?? '';
  const n = Number.parseFloat(truoc);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : 0;
}

/** Khổ dòng "In" của đặc tả nâng cao (mm); 0 nếu không có. */
function layKhoTuDongIn(order: ProductionOrder): number {
  const dongIn = layDongTheoCongDoan(order, 'In');
  const kho = dongIn?.khoMang;
  return typeof kho === 'number' && kho > 0 ? Math.round(kho * 1000) : 0;
}

export function resolveLsxDivideSpec(order: ProductionOrder): LsxDivideSpec {
  const { manual, snapshot } = order;
  // Ưu tiên đặc tả nâng cao: dòng Chia (khổ trước) → dòng In → snapshot.originalWidthMm.
  const filmWidthMm =
    layKhoTruocTuDongChia(order)
    || layKhoTuDongIn(order)
    || Math.round(snapshot.originalWidthMm || (snapshot.spreadWidth || 0) * 1000);
  const elementCount = Math.max(0, Math.round(manual.divideElements || 0));
  // Khổ chia (slit width) — ưu tiên manual-first, fallback `Chia.khoMang` từ đặc
  // tả, rồi `snapshot.divideWidthMm` (legacy). Không fallback `spreadWidth`.
  const chiaSpec = layDongTheoCongDoan(order, 'Chia');
  const chiaSpecMm = chiaSpec && typeof chiaSpec.khoMang === 'number' && chiaSpec.khoMang > 0
    ? Math.round(chiaSpec.khoMang * 1000)
    : 0;
  const defaultWidthMm =
    manual.divideWidth || chiaSpecMm || snapshot.divideWidthMm || 0;
  const customWidths = Array.isArray(manual.divideWidths) ? manual.divideWidths : [];
  const custom = customWidths.length > 0;
  const widths = custom
    ? Array.from(
        { length: elementCount },
        (_, index) => Number(customWidths[index] ?? defaultWidthMm) || 0,
      )
    : Array.from({ length: elementCount }, () => defaultWidthMm);
  const totalWidthMm = widths.reduce((sum, width) => sum + width, 0);

  let error = '';
  if (elementCount <= 0) {
    error = 'Vui lòng nhập số phần tử chia.';
  } else if (!custom && defaultWidthMm <= 0) {
    error = 'Vui lòng nhập khổ chia.';
  } else if (custom && customWidths.length !== elementCount) {
    error = `Vui lòng nhập đủ ${elementCount} phần tử.`;
  } else if (widths.some((width) => width <= 0)) {
    error = 'Khổ mỗi phần tử phải lớn hơn 0mm.';
  } else if (filmWidthMm > 0 && totalWidthMm > filmWidthMm) {
    error = `Tổng khổ chia không được vượt quá ${filmWidthMm}mm.`;
  }

  return {
    filmWidthMm,
    elementCount,
    defaultWidthMm,
    widths,
    totalWidthMm,
    custom,
    valid: error === '',
    error,
  };
}

export function formatLsxDivideSummary(spec: LsxDivideSpec): string {
  if (spec.custom) return spec.widths.map((width) => `${width}mm`).join(' + ');
  return `${spec.defaultWidthMm}mm × ${spec.elementCount}`;
}

/**
 * Phi hao máy chia (mét) hiển thị trên LSX — dòng "Định mức phi hao chia".
 *
 * Nguồn: dòng "Chia" của bảng đặc tả kỹ thuật nâng cao (taoDongChiaNangCao ở
 * dac-ta-nang-cao.ts) — hiện cố định `phiHao: 0` nên helper trả 0, khớp 10 LSX
 * tham chiếu (LSX-References.md §3) đều ghi 0m. Khi dòng Chia có phi hao thực,
 * chỉ cần cập nhật dòng chia và helper này tự theo giá trị đó.
 */
export function layPhiHaoChia(_order: ProductionOrder): number {
  return 0;
}
