/**
 * bao-gia-draft.ts - Lưu nháp tự động bảng báo giá (autosave) vào localStorage.
 * Clue: khi user đang soạn bảng báo giá mà bị reload (deploy/hết phiên/mạng),
 * ta khôi phục lại bản nháp thay vì bắt gõ lại từ đầu.
 */

export const LUU_TRU_BAO_GIA_KEY = "lts_bao_gia_draft";
const HIEU_LUC_NHAP_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

export interface LuuTruNho {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface TuDayCuaNhapBaoGia<T> {
  savedAt: number;
  state: T;
}

/** Lưu nháp bảng báo giá. Trả false nếu storage lỗi (vd quota / disabled). */
export function luuNhapBaoGia<T>(
  storage: LuuTruNho,
  state: T,
  now = Date.now(),
): boolean {
  try {
    const gout: TuDayCuaNhapBaoGia<T> = { savedAt: now, state };
    storage.setItem(LUU_TRU_BAO_GIA_KEY, JSON.stringify(gout));
    return true;
  } catch {
    return false;
  }
}

/** Đọc nháp còn hạn (<= 7 ngày). Trả null nếu không có / hỏng / đã quá hạn. */
export function docNhapBaoGia<T>(storage: LuuTruNho, now = Date.now()): TuDayCuaNhapBaoGia<T> | null {
  try {
    const raw = storage.getItem(LUU_TRU_BAO_GIA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TuDayCuaNhapBaoGia<T>;
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      typeof parsed.savedAt !== "number" ||
      parsed.state === undefined ||
      parsed.state === null
    ) {
      return null;
    }
    if (now - parsed.savedAt > HIEU_LUC_NHAP_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Xóa nháp (người dùng đã lưu bảng báo giá thật / yêu cầu bỏ qua). */
export function xoaNhapBaoGia(storage: LuuTruNho): void {
  try {
    storage.removeItem(LUU_TRU_BAO_GIA_KEY);
  } catch {
    /* ignore */
  }
}

/** Kiểm tra có nháp còn hạn không. */
export function coNhapBaoGia(storage: LuuTruNho, now = Date.now()): boolean {
  return docNhapBaoGia(storage, now) !== null;
}