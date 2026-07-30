import { docQueryParam } from './support-route';
import {
  dongBoUrlEntity,
  dongBoUrlMenu,
  MENU_MAC_DINH_KHI_DEEP_LINK,
  parsePathname,
  taoPathEntity,
} from './menu-route';

/** Path deep-link: /lsx/<orderId> */
export const LSX_QUERY = 'lsx';

export function docLsxIdTuSearchParams(
  search: string | URLSearchParams | null | undefined,
): string | null {
  return docQueryParam(search, LSX_QUERY);
}

export function docLsxIdTuPathname(
  pathname: string | null | undefined,
): string | null {
  const p = parsePathname(pathname);
  if (p.loai === 'entity' && p.entity === 'lsx') return p.id;
  return null;
}

export function ghepUrlLsx(
  href: string,
  id: string | null | undefined,
): string {
  void href;
  if (id && id.trim()) return taoPathEntity('lsx', id);
  return `/${MENU_MAC_DINH_KHI_DEEP_LINK.lsx}`;
}

export function dongBoUrlLsx(id: string | null | undefined): void {
  if (id && id.trim()) {
    dongBoUrlEntity('lsx', id, 'replace');
  } else {
    dongBoUrlMenu(MENU_MAC_DINH_KHI_DEEP_LINK.lsx, 'replace');
  }
}

/** URL tuyệt đối /lsx/<orderId> để copy chia sẻ. */
export function taoUrlChiaSeLsx(id: string | null | undefined): string | null {
  const shareId = id?.trim();
  if (!shareId) return null;
  const path = taoPathEntity('lsx', shareId);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
