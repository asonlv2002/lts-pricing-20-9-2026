/** Query param deep-link mở bảng tính giá: /?tinh-gia=<id> */
export const TINH_GIA_QUERY = 'tinh-gia';

/** Loại deep-link (mở rộng sau: báo giá, khách hàng). */
export type LoaiDeepLink = 'tinh-gia' | 'bao-gia' | 'khach-hang';

export type TrangThaiDeepLink = 'idle' | 'loading' | 'ok' | 'not_found';

export const NHAN_LOAI_DEEP_LINK: Record<LoaiDeepLink, string> = {
  'tinh-gia': 'Tính giá',
  'bao-gia': 'Báo giá',
  'khach-hang': 'Khách hàng',
};

export function tieuDeKhongTimThay(loai: LoaiDeepLink): string {
  return `Không tìm thấy dữ liệu của ${NHAN_LOAI_DEEP_LINK[loai]}`;
}

export function docIdTuSearchParams(
  search: string | URLSearchParams | null | undefined,
): string | null {
  if (!search) return null;
  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  const raw = params.get(TINH_GIA_QUERY)?.trim();
  return raw ? raw : null;
}

export function docIdTuUrl(href: string): string | null {
  try {
    return docIdTuSearchParams(new URL(href).searchParams);
  } catch {
    return null;
  }
}

/** Ưu tiên pricingSheetId (server) để link chia sẻ được giữa các user. */
export function idChiaSeBangTinh(item: {
  id: string;
  pricingSheetId?: string | null;
} | null | undefined): string | null {
  if (!item) return null;
  const serverId = item.pricingSheetId?.trim();
  if (serverId) return serverId;
  const localId = item.id?.trim();
  return localId || null;
}

export function ghepUrlTinhGia(
  href: string,
  id: string | null | undefined,
): string {
  const url = new URL(href, 'http://local.invalid');
  if (id && id.trim()) {
    url.searchParams.set(TINH_GIA_QUERY, id.trim());
  } else {
    url.searchParams.delete(TINH_GIA_QUERY);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Cập nhật thanh địa chỉ không reload (SPA shell). */
export function dongBoUrlTinhGia(id: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const next = ghepUrlTinhGia(window.location.href, id);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, '', next);
}
