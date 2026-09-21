import type { BaoGiaApi } from "./api/service-lts";
import { docMaBaoGiaTuPhanTu } from "./bao-gia-ma";
import { quoteCodeTuBaoGia, type OrderCoPhienBan } from "@lts/bang-tinh-gia";
import { normalizeDisplayText } from "./text-codec";

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function docInputBangTinh(value: unknown): Record<string, unknown> {
  return laObject(value) ? value : {};
}

function sach(value: unknown): string {
  return normalizeDisplayText(String(value ?? "")).trim();
}

/**
 * Tên khách hàng của một báo giá thương mại (server quotation).
 * Ưu tiên giống các màn BBG khác: input.customer → codeName → original.customerName.
 */
export function layTenKhachHangCuaBaoGia(bg: BaoGiaApi): string {
  const sheet = bg.pricingSheets?.[0];
  const input = docInputBangTinh(sheet?.inputValue);
  return (
    sach(input.customer) ||
    sach(sheet?.customer?.codeName) ||
    sach(sheet?.original?.customerName) ||
    ""
  );
}

/**
 * Mã báo giá hiển thị. Ưu tiên derive từ orders (YYMM(createdAt BG) . STT =
 * versionByMonth order đầu tiên — BE b6028b0); BG chưa có LSX → quoteCode cũ
 * lưu trong inputValue.quoteCode; không có → chuỗi rỗng (UI hiện "—").
 */
export function docMaBaoGiaCuaBaoGia(
  bg: BaoGiaApi,
  orders?: readonly OrderCoPhienBan[] | null,
): string {
  return sach(quoteCodeTuBaoGia(bg, orders) || docMaBaoGiaTuPhanTu(bg));
}

/**
 * Mã/định danh báo giá thương mại. Ưu tiên derive (trên), rồi quoteCode cũ,
 * rồi quotationName / description, cuối cùng fallback "BG-<8 ký tự đầu id>".
 */
export function layMaBaoGiaCuaBaoGia(
  bg: BaoGiaApi,
  orders?: readonly OrderCoPhienBan[] | null,
): string {
  return (
    docMaBaoGiaCuaBaoGia(bg, orders) ||
    sach(bg.quotationName || bg.description) ||
    `BG-${bg.id.slice(0, 8)}`
  );
}

/**
 * Ghép nhãn "Tên khách hàng (mã báo giá)" — dùng cho log nhật ký thao tác.
 * Bỏ phần khuyết; trả undefined khi cả hai đều trống.
 */
export function ghepNhanBaoGia(
  ten?: string | null,
  ma?: string | null,
): string | undefined {
  const tenSach = sach(ten);
  const maSach = sach(ma);
  if (tenSach && maSach) return `${tenSach} (${maSach})`;
  if (tenSach) return tenSach;
  if (maSach) return maSach;
  return undefined;
}

/** Nhãn hiển thị cho log nhật ký: "Tên khách hàng (mã báo giá)". */
export function layNhanBaoGiaChoLog(bg: BaoGiaApi): string | undefined {
  return ghepNhanBaoGia(layTenKhachHangCuaBaoGia(bg), layMaBaoGiaCuaBaoGia(bg));
}
