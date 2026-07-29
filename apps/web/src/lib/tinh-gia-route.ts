import { docQueryParam } from './support-route';
import {
  dongBoUrlEntity,
  dongBoUrlMenu,
  MENU_MAC_DINH_KHI_DEEP_LINK,
  parsePathname,
  taoPathEntity,
} from './menu-route';

/** Path deep-link: /tinh-gia/<id> (query ?tinh-gia= không còn hỗ trợ). */
export const TINH_GIA_QUERY = 'tinh-gia';

export function docIdTuSearchParams(
  search: string | URLSearchParams | null | undefined,
): string | null {
  return docQueryParam(search, TINH_GIA_QUERY);
}

export function docIdTuPathname(pathname: string | null | undefined): string | null {
  const p = parsePathname(pathname);
  if (p.loai === 'entity' && p.entity === 'tinh-gia') return p.id;
  return null;
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

/** Path /tinh-gia/<id> hoặc menu khi clear. */
export function ghepUrlTinhGia(
  href: string,
  id: string | null | undefined,
): string {
  void href;
  if (id && id.trim()) return taoPathEntity('tinh-gia', id);
  return `/${MENU_MAC_DINH_KHI_DEEP_LINK['tinh-gia']}`;
}

export function dongBoUrlTinhGia(id: string | null | undefined): void {
  if (id && id.trim()) {
    dongBoUrlEntity('tinh-gia', id, 'replace');
  } else {
    dongBoUrlMenu(MENU_MAC_DINH_KHI_DEEP_LINK['tinh-gia'], 'replace');
  }
}

/** URL tuyệt đối /tinh-gia/<id> để copy chia sẻ. */
export function taoUrlChiaSeTinhGia(id: string | null | undefined): string | null {
  const shareId = id?.trim();
  if (!shareId) return null;
  const path = taoPathEntity('tinh-gia', shareId);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
