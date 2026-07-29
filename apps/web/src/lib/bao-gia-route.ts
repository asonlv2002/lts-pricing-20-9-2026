import { docQueryParam } from './support-route';
import {
  dongBoUrlEntity,
  dongBoUrlMenu,
  MENU_MAC_DINH_KHI_DEEP_LINK,
  parsePathname,
  taoPathEntity,
} from './menu-route';

/** Path deep-link: /bao-gia/<id> */
export const BAO_GIA_QUERY = 'bao-gia';

export function docBaoGiaIdTuSearchParams(
  search: string | URLSearchParams | null | undefined,
): string | null {
  return docQueryParam(search, BAO_GIA_QUERY);
}

export function docBaoGiaIdTuPathname(
  pathname: string | null | undefined,
): string | null {
  const p = parsePathname(pathname);
  if (p.loai === 'entity' && p.entity === 'bao-gia') return p.id;
  return null;
}

export function ghepUrlBaoGia(
  href: string,
  id: string | null | undefined,
): string {
  void href;
  if (id && id.trim()) return taoPathEntity('bao-gia', id);
  return `/${MENU_MAC_DINH_KHI_DEEP_LINK['bao-gia']}`;
}

export function dongBoUrlBaoGia(id: string | null | undefined): void {
  if (id && id.trim()) {
    dongBoUrlEntity('bao-gia', id, 'replace');
  } else {
    dongBoUrlMenu(MENU_MAC_DINH_KHI_DEEP_LINK['bao-gia'], 'replace');
  }
}

/** URL tuyệt đối /bao-gia/<id> để copy chia sẻ. */
export function taoUrlChiaSeBaoGia(id: string | null | undefined): string | null {
  const shareId = id?.trim();
  if (!shareId) return null;
  const path = taoPathEntity('bao-gia', shareId);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
