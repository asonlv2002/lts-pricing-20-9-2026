export const AUTH_REFRESH_MARGIN_MS = 60 * 1000;
export const AUTH_REFRESH_FALLBACK_MS = 14 * 60 * 1000;

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(padded);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function docThoiDiemHetHanJwt(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const data = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
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
