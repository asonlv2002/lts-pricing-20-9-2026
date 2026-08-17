import { docQueryParam } from './support-route';
import type { LoaiDeepLink } from './support-route';
import {
  dongBoUrlEntity,
  dongBoUrlMenu,
  MENU_MAC_DINH_KHI_DEEP_LINK,
  parsePathname,
  taoPathEntity,
} from './menu-route';

/** Path deep-link: /tinh-gia/<id> | /tinh-gia-nang-cao/<id> (query ?tinh-gia= legacy). */
export const TINH_GIA_QUERY = 'tinh-gia';

export type TuyChonPathTinhGia = {
  /** true → entity /tinh-gia-nang-cao ; false → /tinh-gia */
  nangCao?: boolean;
};

export function loaiTinhGiaTuNangCao(nangCao?: boolean): LoaiDeepLink {
  return nangCao ? 'tinh-gia-nang-cao' : 'tinh-gia';
}

export function docIdTuSearchParams(
  search: string | URLSearchParams | null | undefined,
): string | null {
  return docQueryParam(search, TINH_GIA_QUERY);
}

export function docIdTuPathname(pathname: string | null | undefined): string | null {
  const p = parsePathname(pathname);
  if (
    p.loai === 'entity' &&
    (p.entity === 'tinh-gia' || p.entity === 'tinh-gia-nang-cao')
  ) {
    return p.id;
  }
  return null;
}

/** true khi path entity là /tinh-gia-nang-cao/... */
export function laPathTinhGiaNangCao(pathname: string | null | undefined): boolean {
  const p = parsePathname(pathname);
  return p.loai === 'entity' && p.entity === 'tinh-gia-nang-cao';
}

export function docIdTuUrl(href: string): string | null {
  try {
    const u = new URL(href, 'http://local.invalid');
    return docIdTuPathname(u.pathname) ?? docIdTuSearchParams(u.searchParams);
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

/** Path /tinh-gia[|-nang-cao]/<id> hoặc menu khi clear. */
export function ghepUrlTinhGia(
  href: string,
  id: string | null | undefined,
  opts?: TuyChonPathTinhGia,
): string {
  void href;
  const loai = loaiTinhGiaTuNangCao(!!opts?.nangCao);
  if (id && id.trim()) return taoPathEntity(loai, id);
  return `/${MENU_MAC_DINH_KHI_DEEP_LINK[loai]}`;
}

export function dongBoUrlTinhGia(
  id: string | null | undefined,
  opts?: TuyChonPathTinhGia,
): void {
  const loai = loaiTinhGiaTuNangCao(!!opts?.nangCao);
  if (id && id.trim()) {
    dongBoUrlEntity(loai, id, 'replace');
  } else {
    dongBoUrlMenu(MENU_MAC_DINH_KHI_DEEP_LINK[loai], 'replace');
  }
}

/** URL tuyệt đối /tinh-gia[|-nang-cao]/<id> để copy chia sẻ. */
export function taoUrlChiaSeTinhGia(
  id: string | null | undefined,
  opts?: TuyChonPathTinhGia,
): string | null {
  const shareId = id?.trim();
  if (!shareId) return null;
  const path = taoPathEntity(loaiTinhGiaTuNangCao(!!opts?.nangCao), shareId);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
