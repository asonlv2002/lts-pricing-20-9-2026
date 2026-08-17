/** Deep-link helpers dùng chung cho các domain route (tính giá, báo giá, ...). */

export type LoaiDeepLink =
  | 'tinh-gia'
  | 'tinh-gia-nang-cao'
  | 'bao-gia'
  | 'khach-hang'
  | 'lsx';

export type TrangThaiDeepLink =
  | 'idle'
  | 'loading'
  | 'ok'
  | 'not_found'
  | 'rate_limited'
  | 'forbidden'
  | 'error';

/** Query keys deep-link hiện có — clear mutual exclusive khi set 1 key. */
export const DEEP_LINK_QUERY_KEYS = ['tinh-gia', 'bao-gia', 'khach-hang', 'lsx'] as const;

export const NHAN_LOAI_DEEP_LINK: Record<LoaiDeepLink, string> = {
  'tinh-gia': 'Tính giá',
  'tinh-gia-nang-cao': 'Tính giá nâng cao',
  'bao-gia': 'Báo giá',
  'khach-hang': 'Khách hàng',
  lsx: 'LSX',
};

export function tieuDeKhongTimThay(loai: LoaiDeepLink): string {
  return `Không tìm thấy dữ liệu của ${NHAN_LOAI_DEEP_LINK[loai]}`;
}

export function tieuDeDeepLinkLoi(
  loai: LoaiDeepLink,
  trangThai: TrangThaiDeepLink,
): string {
  if (trangThai === 'rate_limited') {
    return 'Máy chủ đang giới hạn truy cập. Vui lòng thử lại sau vài giây.';
  }
  if (trangThai === 'forbidden') {
    return `Bạn không có quyền xem ${NHAN_LOAI_DEEP_LINK[loai].toLowerCase()} này.`;
  }
  if (trangThai === 'error') {
    return 'Không tải được dữ liệu. Vui lòng thử lại.';
  }
  return tieuDeKhongTimThay(loai);
}

/** true khi empty-state deep-link nên hiện (không phải loading/ok/idle). */
export function laLoiDeepLink(trangThai: TrangThaiDeepLink): boolean {
  return (
    trangThai === 'not_found' ||
    trangThai === 'rate_limited' ||
    trangThai === 'forbidden' ||
    trangThai === 'error'
  );
}

export function toSearchParams(
  search: string | URLSearchParams | null | undefined,
): URLSearchParams | null {
  if (!search) return null;
  if (typeof search !== 'string') return search;
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

export function docQueryParam(
  search: string | URLSearchParams | null | undefined,
  key: string,
): string | null {
  const params = toSearchParams(search);
  if (!params) return null;
  const raw = params.get(key)?.trim();
  return raw ? raw : null;
}

/**
 * Một deep-link tại một thời điểm.
 * `candidates` theo thứ tự ưu tiên (phần tử đầu thắng).
 */
export function docDeepLinkTuSearchParams(
  search: string | URLSearchParams | null | undefined,
  candidates: { loai: LoaiDeepLink; key: string }[],
): { loai: LoaiDeepLink; id: string } | null {
  for (const c of candidates) {
    const id = docQueryParam(search, c.key);
    if (id) return { loai: c.loai, id };
  }
  return null;
}

/**
 * Set 1 query (nếu có) và xóa các deep-link query khác.
 * `set = null` → chỉ clear.
 */
export function ghepUrlQueryExclusive(
  href: string,
  set: { key: string; id: string } | null,
  clearKeys: readonly string[] = DEEP_LINK_QUERY_KEYS,
): string {
  const url = new URL(href, 'http://local.invalid');
  for (const key of clearKeys) {
    url.searchParams.delete(key);
  }
  if (set?.key && set.id.trim()) {
    url.searchParams.set(set.key, set.id.trim());
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Cập nhật thanh địa chỉ không reload (SPA shell). */
export function dongBoUrlQueryExclusive(
  set: { key: string; id: string } | null,
  clearKeys: readonly string[] = DEEP_LINK_QUERY_KEYS,
): void {
  if (typeof window === 'undefined') return;
  const next = ghepUrlQueryExclusive(window.location.href, set, clearKeys);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, '', next);
}

/**
 * Clear deep-link: bỏ query entity cũ (nếu còn) và về root path
 * khi đang đứng trên path entity /tinh-gia|/tinh-gia-nang-cao|/bao-gia|/khach-hang.
 * Menu path giữ nguyên.
 */
export function dongBoUrlDeepLinkClear(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const segs = path === '/' ? [] : path.slice(1).split('/');
  const entityRoots = new Set([
    'tinh-gia',
    'tinh-gia-nang-cao',
    'bao-gia',
    'khach-hang',
    'lsx',
  ]);
  let nextPath = path;
  if (segs.length >= 1 && entityRoots.has(segs[0])) {
    // rời entity → root; caller thường gọi dieuHuongMenu ngay sau
    nextPath = '/';
  }
  // Xóa query deep-link legacy
  const url = new URL(window.location.href);
  for (const key of DEEP_LINK_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
  const next = `${nextPath}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, '', next);
}

/** URL tuyệt đối để copy/chia sẻ (origin + path + query exclusive). */
export function taoUrlChiaSeTuyetDoi(
  set: { key: string; id: string } | null,
  clearKeys: readonly string[] = DEEP_LINK_QUERY_KEYS,
): string {
  if (typeof window === 'undefined') {
    return ghepUrlQueryExclusive('/', set, clearKeys);
  }
  const pathQuery = ghepUrlQueryExclusive(window.location.href, set, clearKeys);
  return `${window.location.origin}${pathQuery}`;
}

/** Copy text vào clipboard. Trả true nếu thành công. */
export async function saoChepVaoClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fallback bên dưới */
  }
  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
