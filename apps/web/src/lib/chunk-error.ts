/**
 * chunk-error.ts - Phát hiện lỗi tải chunk (ChunkLoadError) và quyết định UI.
 * Thay thế hành vi "tự reload trang" cũ bằng "hiện banner mềm" — không reload
 * ngầm, không phá dữ liệu đang soạn (kết hợp autosave nháp bảng báo giá).
 */

export const CHUNK_BANNER_KEY = "__lts_chunk_ban_da_hien__";

const RE_LOI_CHUNK =
  /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i;

export interface LuuTruNho {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Kiểm tra lỗi có phải lỗi tải chunk không. */
export function laLoiChunk(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return RE_LOI_CHUNK.test(msg);
}

/**
 * Quyết định xử lý lỗi chunk: hiện banner mềm 1 lần/session (không reload).
 * - Lỗi không phải chunk => 'bo-qua'
 * - Lỗi chunk mà banner chưa hiện lần nào => đánh dấu + 'hien-banner'
 * - Lỗi chunk mà banner đã hiện rồi => 'bo-qua' (tránh spam)
 */
export function xuLyLoiChunk(
  error: unknown,
  storage: LuuTruNho,
): "hien-banner" | "bo-qua" {
  if (!laLoiChunk(error)) return "bo-qua";
  if (storage.getItem(CHUNK_BANNER_KEY) === "1") return "bo-qua";
  storage.setItem(CHUNK_BANNER_KEY, "1");
  return "hien-banner";
}

/** Xóa đánh dấu banner (khi đăng nhập lại / phiên mới). */
export function xoaDanhDauLoiChunk(storage: LuuTruNho): void {
  try {
    storage.removeItem(CHUNK_BANNER_KEY);
  } catch {
    /* ignore */
  }
}