import {
  docQueryParam,
  dongBoUrlQueryExclusive,
  ghepUrlQueryExclusive,
  taoUrlChiaSeTuyetDoi,
} from './support-route';

/** Query param deep-link mở báo giá: /?bao-gia=<id> */
export const BAO_GIA_QUERY = 'bao-gia';

export function docBaoGiaIdTuSearchParams(
  search: string | URLSearchParams | null | undefined,
): string | null {
  return docQueryParam(search, BAO_GIA_QUERY);
}

export function ghepUrlBaoGia(
  href: string,
  id: string | null | undefined,
): string {
  if (id && id.trim()) {
    return ghepUrlQueryExclusive(href, { key: BAO_GIA_QUERY, id });
  }
  return ghepUrlQueryExclusive(href, null);
}

export function dongBoUrlBaoGia(id: string | null | undefined): void {
  if (id && id.trim()) {
    dongBoUrlQueryExclusive({ key: BAO_GIA_QUERY, id });
  } else {
    dongBoUrlQueryExclusive(null);
  }
}

/** URL tuyệt đối /?bao-gia=<id> để copy chia sẻ. */
export function taoUrlChiaSeBaoGia(id: string | null | undefined): string | null {
  const shareId = id?.trim();
  if (!shareId) return null;
  return taoUrlChiaSeTuyetDoi({ key: BAO_GIA_QUERY, id: shareId });
}
