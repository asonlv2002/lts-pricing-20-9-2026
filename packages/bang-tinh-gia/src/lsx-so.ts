/**
 * lsx-so.ts — Sinh số LSX / mã báo giá từ dữ liệu server (versionByMonth).
 *
 * BE commit b6028b0: QuotationPricingSheetOrder.versionByMonth — STT cấp theo
 * tháng UTC của created_at (advisory lock chống race, backfill dữ liệu cũ).
 * FE KHÔNG còn gen số client-side: derive số hiển thị từ createdAt + STT.
 *
 * Quy ước hiển thị (chốt 21/09/2026):
 * - Số LSX  = YYMM(giờ VN của order.createdAt) + "." + pad2(versionByMonth)
 * - quoteCode BG = YYMM(giờ VN của quotation.createdAt) + "." + pad2(versionByMonth
 *   của order ĐẦU TIÊN tạo từ BG đó); BG chưa có LSX nào → chuỗi rỗng.
 * - Ép derive làm chân lý: bỏ qua inputValue.lsxNumber khi đọc.
 * - Timezone: giờ máy (VN UTC+7). Đơn tạo 00:00–06:59 sáng ngày mùng 1 sẽ lệch
 *   tháng so với partition UTC của BE — đã được chấp nhận.
 */

/** Dữ liệu tối thiểu của 1 order (LSX) để derive số. */
export interface OrderCoPhienBan {
  createdAt: string;
  versionByMonth: number;
}

/** Dữ liệu tối thiểu của 1 báo giá để derive quoteCode. */
export interface BaoGiaCoPhienBan {
  createdAt?: string | null;
}

/** YYMM theo giờ máy (VN UTC+7) từ chuỗi ISO. Vd 21/09/2026 → "2609". Lỗi parse → "". */
export function yymmLocal(createdAt: string): string {
  const d = new Date(createdAt);
  if (!createdAt || Number.isNaN(d.getTime())) return "";
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

/** STT pad tối thiểu 2 chữ số (2607.01); từ 100 trở lên in nguyên. */
function padStt(versionByMonth: number): string {
  const n = Math.trunc(Number(versionByMonth));
  if (!Number.isFinite(n) || n <= 0) return "";
  return n < 100 ? String(n).padStart(2, "0") : String(n);
}

/**
 * Số LSX dạng YYMM.STT derive từ order server (vd "2609.05").
 * Trả "" nếu createdAt không parse được (UI fallback orderId).
 */
export function soLsxTuOrder(order: OrderCoPhienBan | null | undefined): string {
  if (!order || typeof order.createdAt !== "string") return "";
  const yymm = yymmLocal(order.createdAt);
  if (!yymm) return "";
  return `${yymm}.${padStt(order.versionByMonth)}`;
}

/**
 * Mã báo giá dạng YYMM.STT derive từ quotation + orders (vd "2609.02").
 * STT lấy theo versionByMonth của order ĐẦU TIÊN (createdAt sớm nhất) của BG.
 * BG chưa có order nào → "" (UI hiện "—", điền sau khi tạo LSX đầu tiên).
 */
export function quoteCodeTuBaoGia(
  bg: BaoGiaCoPhienBan | null | undefined,
  orders?: readonly OrderCoPhienBan[] | null,
): string {
  if (!bg || typeof bg.createdAt !== "string" || !orders || orders.length === 0) return "";
  const first = [...orders]
    .filter((o) => o && typeof o.createdAt === "string")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
  if (!first) return "";
  const yymm = yymmLocal(bg.createdAt);
  if (!yymm) return "";
  return `${yymm}.${padStt(first.versionByMonth)}`;
}
