import { decodeBase64UrlUtf8 } from './text-codec';

export const AUTH_REFRESH_MARGIN_MS = 60 * 1000;
export const AUTH_REFRESH_FALLBACK_MS = 14 * 60 * 1000;

export function docThoiDiemHetHanJwt(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const data = JSON.parse(decodeBase64UrlUtf8(payload)) as { exp?: unknown };
    return typeof data.exp === 'number' ? data.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function tinhThoiGianChoLamMoiPhien(token: string, nowMs = Date.now()): number {
  const expiresAt = docThoiDiemHetHanJwt(token);
  if (!expiresAt) return AUTH_REFRESH_FALLBACK_MS;
  return Math.max(0, expiresAt - nowMs - AUTH_REFRESH_MARGIN_MS);
}

export function tokenCanLamMoiNgay(token: string, nowMs = Date.now()): boolean {
  const expiresAt = docThoiDiemHetHanJwt(token);
  if (!expiresAt) return false;
  return expiresAt - nowMs <= AUTH_REFRESH_MARGIN_MS;
}

export function laLoiRefreshHetPhien(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as { status?: unknown }).status === 401;
}

// ── Đồng bộ phiên giữa các tab (storage event) ────────────────────────────
// localStorage dùng chung giữa các tab nhưng token trong memory (zustand) là
// bản copy riêng của từng tab. Khi tab khác rotate refresh token (refresh
// token chỉ dùng 1 lần trên BE), tab này phải nhận token mới hoặc sẽ bị 401.

export type QuyetDinhDongBoToken =
  | { hanhDong: 'boQua' }
  | { hanhDong: 'apDung'; accessToken: string; refreshToken: string }
  | { hanhDong: 'dangXuat' };

export function quyetDinhDongBoTokenThongQuaStorage(args: {
  refreshTokenLs: string | null;
  accessTokenLs: string | null;
  refreshTokenHienTai: string | null;
}): QuyetDinhDongBoToken {
  const { refreshTokenLs, accessTokenLs, refreshTokenHienTai } = args;
  // Tab này chưa có phiên → không tự nhận session hộ (tránh UI thiếu profile).
  if (!refreshTokenHienTai) return { hanhDong: 'boQua' };
  // Tab khác đã xoá token (đăng xuất / hết phiên) → đăng xuất theo.
  if (!refreshTokenLs) return { hanhDong: 'dangXuat' };
  // Không có gì thay đổi so với memory.
  if (refreshTokenLs === refreshTokenHienTai) return { hanhDong: 'boQua' };
  // Ghi dở (access chưa kịp ghi) → bỏ qua, đợi storage event kế tiếp.
  if (!accessTokenLs) return { hanhDong: 'boQua' };
  return { hanhDong: 'apDung', accessToken: accessTokenLs, refreshToken: refreshTokenLs };
}
