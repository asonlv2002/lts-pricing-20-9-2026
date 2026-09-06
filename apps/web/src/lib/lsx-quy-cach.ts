/**
 * Khối "Quy cách" trên LSX — nguồn nhập duy nhất cho các thông số túi
 * (dung sai R/D, tâm zipper cách đầu, xếp đáy, dán biên, nhấn xé).
 * Máy làm túi chỉ đọc lại các giá trị này.
 */

export interface LsxQuyCachManual {
  quyCachNote: string;
  quyCachToleranceWidthMm?: number;
  quyCachToleranceLengthMm?: number;
  tamZipperCachMieng: number;
  foldBottom: string;
  sealEdge: string;
  tearNotch: string;
}

export interface LsxQuyCachSnapshot {
  productType: string;
  spreadWidth: number;
  cutStep: number;
  bagWidthMm?: number;
  bagLengthMm?: number;
  hasZipper?: boolean;
  /** Tâm zipper cách đầu (mm) từ báo giá; prefill khi LSX admin chưa nhập. */
  zipperDistanceMm?: number;
}

/** Dung sai mặc định chiều rộng (R) quy cách LSX. */
export const LSX_TOLERANCE_WIDTH_DEFAULT_MM = 2;
/** Dung sai mặc định chiều dài (D) quy cách LSX. */
export const LSX_TOLERANCE_LENGTH_DEFAULT_MM = 3;

/** Nguồn kích thước túi: ưu tiên kích thước thành phẩm từ báo giá (bagSpec), fallback khổ trải/bước cắt (cuộn). */
export function lsxBagSizeMm(snapshot: {
  bagWidthMm?: number;
  bagLengthMm?: number;
  spreadWidth?: number;
  cutStep?: number;
}): { widthMm: number; lengthMm: number } {
  const widthMm =
    snapshot.bagWidthMm && snapshot.bagWidthMm > 0
      ? Math.round(snapshot.bagWidthMm)
      : Math.round((snapshot.spreadWidth || 0) * 1000);
  const lengthMm =
    snapshot.bagLengthMm && snapshot.bagLengthMm > 0
      ? Math.round(snapshot.bagLengthMm)
      : Math.round((snapshot.cutStep || 0) * 1000);
  return { widthMm, lengthMm };
}

/** "R:220mm (±2mm) x D:320mm (±2mm)" — bỏ ngoặc khi dung sai = 0. */
export function formatLsxQuyCach(opts: {
  widthMm: number;
  lengthMm: number;
  tolWidthMm?: number;
  tolLengthMm?: number;
}): string {
  const tol = (value?: number) => (value && value > 0 ? ` (±${value}mm)` : '');
  const left = `R:${opts.widthMm}mm${tol(opts.tolWidthMm)}`;
  const right = `D:${opts.lengthMm}mm${tol(opts.tolLengthMm)}`;
  return `${left} x ${right}`;
}

/** "100mm" → "100mm (50mm/biên)"; giữ nguyên khi không đọc được số. */
export function formatLsxFoldBottom(foldBottom: string): string {
  const raw = (foldBottom || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(?:mm)?$/i);
  if (!match) return raw;
  const total = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(total) || total <= 0) return raw;
  const perSide = total / 2;
  const fmt = (n: number) => String(Number(n.toFixed(2)));
  return `${fmt(total)}mm (${fmt(perSide)}mm/biên)`;
}

/** Các dòng khối Quy cách in trên LSX; bỏ field trống. */
export function buildLsxQuyCachLines(
  manual: LsxQuyCachManual,
  snapshot: LsxQuyCachSnapshot,
): string[] {
  const isTui = snapshot.productType !== 'mang';
  const { widthMm, lengthMm } = lsxBagSizeMm(snapshot);
  const autoSpec =
    isTui && widthMm && lengthMm
      ? formatLsxQuyCach({
          widthMm,
          lengthMm,
          tolWidthMm: manual.quyCachToleranceWidthMm ?? LSX_TOLERANCE_WIDTH_DEFAULT_MM,
          tolLengthMm: manual.quyCachToleranceLengthMm ?? LSX_TOLERANCE_LENGTH_DEFAULT_MM,
        })
      : '';
  const spec = manual.quyCachNote?.trim() || autoSpec;

  const lines: string[] = [];
  if (spec) lines.push(`Quy cách: ${spec}`);
  if (!isTui) return lines;

  const showZipper = Boolean(snapshot.hasZipper || manual.tamZipperCachMieng || snapshot.zipperDistanceMm);
  if (showZipper) {
    const tam = manual.tamZipperCachMieng > 0
      ? manual.tamZipperCachMieng
      : (snapshot.zipperDistanceMm && snapshot.zipperDistanceMm > 0 ? snapshot.zipperDistanceMm : 0);
    lines.push(`Tâm zipper cách đầu: ${tam > 0 ? `${tam}mm` : '—'}`);
  }
  const foldBottom = formatLsxFoldBottom(manual.foldBottom);
  if (foldBottom) lines.push(`Xếp đáy: ${foldBottom}`);
  if (manual.sealEdge?.trim()) lines.push(`Hàn biên: ${manual.sealEdge.trim()}`);
  if (manual.tearNotch?.trim()) lines.push(`Nhấn xé "v" ${manual.tearNotch.trim()}`);
  return lines;
}
