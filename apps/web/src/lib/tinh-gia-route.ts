import {
  docQueryParam,
  dongBoUrlQueryExclusive,
  ghepUrlQueryExclusive,
  taoUrlChiaSeTuyetDoi,
} from './support-route';

/** Query param deep-link mở bảng tính giá: /?tinh-gia=<id> */
export const TINH_GIA_QUERY = 'tinh-gia';

export function docIdTuSearchParams(
  search: string | URLSearchParams | null | undefined,
): string | null {
  return docQueryParam(search, TINH_GIA_QUERY);
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
  if (id && id.trim()) {
    return ghepUrlQueryExclusive(href, { key: TINH_GIA_QUERY, id });
  }
  return ghepUrlQueryExclusive(href, null);
}

export function dongBoUrlTinhGia(id: string | null | undefined): void {
  if (id && id.trim()) {
    dongBoUrlQueryExclusive({ key: TINH_GIA_QUERY, id });
  } else {
    dongBoUrlQueryExclusive(null);
  }
}

/** URL tuyệt đối /?tinh-gia=<id> để copy chia sẻ. */
export function taoUrlChiaSeTinhGia(id: string | null | undefined): string | null {
  const shareId = id?.trim();
  if (!shareId) return null;
  return taoUrlChiaSeTuyetDoi({ key: TINH_GIA_QUERY, id: shareId });
}
