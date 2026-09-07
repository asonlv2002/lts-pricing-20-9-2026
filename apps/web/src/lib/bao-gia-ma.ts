// src/lib/bao-gia-ma.ts
// Mã báo giá dạng YYMM.STT (vd 06/09/2026 → "2609.01"), sequence RIÊNG so với LSX.
// Lưu trong quotation.inputValue.quoteCode. Sinh client-side như LSX.

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Lấy mã báo giá từ string | { quoteCode } | { inputValue: { quoteCode } }. */
export function docMaBaoGiaTuPhanTu(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (!laObject(item)) return "";
  if (typeof item.quoteCode === "string") return item.quoteCode.trim();
  const iv = laObject(item.inputValue) ? item.inputValue : undefined;
  if (iv && typeof iv.quoteCode === "string") return iv.quoteCode.trim();
  return "";
}

/** YYMM theo lịch máy (vd 9/2026 → "2609"). */
export function yymmBaoGia(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

/**
 * Sinh mã báo giá dạng YYMM.STT (vd 2609.01).
 * STT = max cùng YYMM + 1, pad tối thiểu 2 chữ số; reset mỗi tháng.
 * Sequence độc lập LSX: chỉ đếm trên danh sách các báo giá được truyền vào.
 * Bỏ qua mã không khớp dạng (vd format cũ "BG-...").
 */
export function genMaBaoGia(
  existing: readonly unknown[] = [],
  date: Date = new Date(),
): string {
  const yymm = yymmBaoGia(date);
  const re = new RegExp(`^${yymm}\\.(\\d+)$`);
  let maxSeq = 0;
  for (const item of existing) {
    const num = docMaBaoGiaTuPhanTu(item);
    const m = num.match(re);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  const next = maxSeq + 1;
  const stt = next < 100 ? String(next).padStart(2, "0") : String(next);
  return `${yymm}.${stt}`;
}
