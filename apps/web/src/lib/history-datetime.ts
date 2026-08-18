import type { HistoryItem } from './types';

/** Parse ISO hoặc chuỗi ngày VN `dd/mm/yyyy` (+ tùy chọn giờ). */
export function msTuLichSu(
  value?: string | null,
): number {
  if (!value) return 0;
  const iso = Date.parse(value);
  if (Number.isFinite(iso) && iso > 0) return iso;

  // dd/mm/yyyy hoặc dd/mm/yyyy, HH:mm:ss
  const m = value.trim().match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!m) return 0;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = Number(m[4] ?? 0);
  const min = Number(m[5] ?? 0);
  const sec = Number(m[6] ?? 0);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day, hour, min, sec).getTime();
}

/** Ms để sort danh sách: ưu tiên updatedAt → createdAt → date. */
export function msSapXepLichSu(h: Pick<HistoryItem, 'updatedAt' | 'createdAt' | 'date'>): number {
  return (
    msTuLichSu(h.updatedAt)
    || msTuLichSu(h.createdAt)
    || msTuLichSu(h.date)
  );
}

/** Ngày tạo hiển thị: có giờ phút giây (vi-VN). */
export function dinhDangNgayTaoLichSu(
  h: Pick<HistoryItem, 'createdAt' | 'updatedAt' | 'date'>,
): string {
  const ms = msTuLichSu(h.createdAt) || msTuLichSu(h.date) || msTuLichSu(h.updatedAt);
  if (!ms) return h.date || '—';
  return new Date(ms).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Chuỗi date legacy (có giờ) từ Date. */
export function dinhDangDateLegacy(d: Date = new Date()): string {
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
