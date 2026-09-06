import type { HistoryItem, OverrideTable } from './types';

/**
 * Ghi đè đang giữ trong store còn ĐÚNG object lúc mở sheet hay chưa.
 * Mọi slice khi chỉnh ghi đè đều tạo object MỚI (không mutate) — nên so
 * tham chiếu là đủ để biết "chưa ai chỉnh ô nào".
 * (Trước đây dùng chặn đóng băng giá đề xuất — nay chỉ để hiện ghi chú
 * "có thay đổi bảng đặc tả chưa lưu" trên sheet đã lưu.)
 */
export function overridesChuaDoi(
  ghiDeHienTai: OverrideTable | undefined,
  ghiDeLuuTrongSheet: OverrideTable | undefined,
): boolean {
  const coHienTai = !!ghiDeHienTai && Object.keys(ghiDeHienTai).length > 0;
  const coTrongSheet = !!ghiDeLuuTrongSheet && Object.keys(ghiDeLuuTrongSheet).length > 0;
  if (!coHienTai && !coTrongSheet) return true;
  return coHienTai && coTrongSheet && ghiDeHienTai === ghiDeLuuTrongSheet;
}

/**
 * Điều kiện đóng băng giá đề xuất — dùng chung desktop/mobile để CHỌN NGUỒN
 * override cho phần hiển thị (đã lưu khi đóng băng, hiện tại khi không).
 *
 * Chỉ phụ thuộc input (`isDirty`) — KHÔNG phụ thuộc ô ghi đè Sale/Admin:
 * sửa bảng đặc tả trên sheet đã lưu chỉ là preview trong tab ghi đè,
 * giá màn hình giữ nguyên đến khi bấm Lưu thay đổi / Cập nhật / Lưu mới.
 */
export function coDongBangGiaDeXuat(
  nangCap: boolean,
  loadedItem: Pick<HistoryItem, 'finalPrice'> | null | undefined,
  isDirty: boolean,
): boolean {
  return !!(nangCap && loadedItem && !isDirty && (loadedItem.finalPrice ?? 0) > 0);
}

export interface GiaDeXuatHienThiParams {
  /** true = đang ở tab Tính giá nâng cao */
  nangCap: boolean;
  /** Sheet đang mở (null khi tính bảng mới / chưa lưu) */
  loadedItem:
    | Pick<HistoryItem, 'finalPrice' | 'saleOverrides' | 'adminOverrides'>
    | null
    | undefined;
  /** true = user đã chỉnh input kể từ lúc mở sheet */
  isDirty: boolean;
  /** Giá đề xuất tính lại live theo cấu hình/ghi đè hiện tại */
  giaTinhLai: number;
}

export interface GiaDeXuatHienThiKetQua {
  /** true = đang giữ giá lúc lưu sheet (chưa chỉnh input) */
  dongBang: boolean;
  /** Giá đề xuất dùng để hiển thị */
  giaDeXuat: number;
  /** true khi đóng băng và giá tính lại hiện tại đã lệch giá lưu */
  coLechCauHinh: boolean;
}

/**
 * Giá đề xuất HIỂN THỊ cho màn kết quả.
 *
 * - Bảng tính mới / đang chỉnh input: = giá tính lại live (hành vi cũ).
 * - Mở lại sheet nâng cao ĐÃ LƯU mà chưa chỉnh INPUT: giữ đúng giá snapshot
 *   lúc lưu — kể cả khi Sale/Admin sửa bảng đặc tả (preview chỉ trong tab
 *   ghi đè, có dòng chênh lệch riêng); giá mới chỉ áp sau khi Lưu/Cập nhật.
 */
export function tinhGiaDeXuatHienThi(
  p: GiaDeXuatHienThiParams,
): GiaDeXuatHienThiKetQua {
  const dongBang = coDongBangGiaDeXuat(p.nangCap, p.loadedItem, p.isDirty);
  const giaLuu = p.loadedItem?.finalPrice ?? 0;
  return {
    dongBang,
    giaDeXuat: dongBang ? giaLuu : p.giaTinhLai,
    coLechCauHinh: dongBang && Math.abs(p.giaTinhLai - giaLuu) > 0.5,
  };
}
