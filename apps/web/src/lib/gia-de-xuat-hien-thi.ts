import type { HistoryItem, OverrideTable } from './types';

/**
 * Ghi đè đang giữ trong store còn ĐÚNG object lúc mở sheet hay chưa.
 * Mọi slice khi chỉnh ghi đè đều tạo object MỚI (không mutate) — nên so
 * tham chiếu là đủ để biết "chưa ai chỉnh ô nào".
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
  saleOverrides: OverrideTable;
  adminOverrides: OverrideTable;
  /** Giá đề xuất tính lại live theo cấu hình/ghi đè hiện tại */
  giaTinhLai: number;
}

export interface GiaDeXuatHienThiKetQua {
  /** true = đang giữ giá lúc lưu sheet (chưa chỉnh sửa gì) */
  dongBang: boolean;
  /** Giá đề xuất dùng để hiển thị */
  giaDeXuat: number;
  /** true khi đóng băng và giá tính lại hiện tại đã lệch giá lưu */
  coLechCauHinh: boolean;
}

/**
 * Giá đề xuất HIỂN THỊ cho màn kết quả.
 *
 * - Bảng tính mới / đang chỉnh sửa: = giá tính lại live (hành vi cũ).
 * - Mở lại sheet nâng cao ĐÃ LƯU mà chưa chỉnh gì (input + ghi đè 2 vai):
 *   giữ đúng giá snapshot lúc lưu — không bị cuốn theo đơn giá/định mức/
 *   lợi nhuận hệ thống đã đổi sau đó (kể cả khi Sale/Admin đổi trên server).
 */
export function tinhGiaDeXuatHienThi(
  p: GiaDeXuatHienThiParams,
): GiaDeXuatHienThiKetQua {
  const dongBang = !!(
    p.nangCap &&
    p.loadedItem &&
    !p.isDirty &&
    (p.loadedItem.finalPrice ?? 0) > 0 &&
    overridesChuaDoi(p.saleOverrides, p.loadedItem.saleOverrides) &&
    overridesChuaDoi(p.adminOverrides, p.loadedItem.adminOverrides)
  );
  const giaLuu = p.loadedItem?.finalPrice ?? 0;
  return {
    dongBang,
    giaDeXuat: dongBang ? giaLuu : p.giaTinhLai,
    coLechCauHinh: dongBang && Math.abs(p.giaTinhLai - giaLuu) > 0.5,
  };
}
