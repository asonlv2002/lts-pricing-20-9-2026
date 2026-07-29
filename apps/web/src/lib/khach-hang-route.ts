import { docQueryParam } from './support-route';
import {
  dongBoUrlEntity,
  dongBoUrlMenu,
  MENU_MAC_DINH_KHI_DEEP_LINK,
  parsePathname,
  taoPathEntity,
} from './menu-route';

/** Path deep-link: /khach-hang/<codeName> */
export const KHACH_HANG_QUERY = 'khach-hang';

export function chuanHoaMaKhachHang(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

export function khopMaKhachHang(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = chuanHoaMaKhachHang(a);
  const right = chuanHoaMaKhachHang(b);
  return !!left && left === right;
}

export function docKhachHangIdTuSearchParams(
  search: string | URLSearchParams | null | undefined,
): string | null {
  return docQueryParam(search, KHACH_HANG_QUERY);
}

export function docKhachHangIdTuPathname(
  pathname: string | null | undefined,
): string | null {
  const p = parsePathname(pathname);
  if (p.loai === 'entity' && p.entity === 'khach-hang') return p.id;
  return null;
}

export function ghepUrlKhachHang(
  href: string,
  codeName: string | null | undefined,
): string {
  void href;
  if (codeName && codeName.trim()) return taoPathEntity('khach-hang', codeName);
  return `/${MENU_MAC_DINH_KHI_DEEP_LINK['khach-hang']}`;
}

export function dongBoUrlKhachHang(codeName: string | null | undefined): void {
  if (codeName && codeName.trim()) {
    dongBoUrlEntity('khach-hang', codeName, 'replace');
  } else {
    dongBoUrlMenu(MENU_MAC_DINH_KHI_DEEP_LINK['khach-hang'], 'replace');
  }
}

/** URL tuyệt đối /khach-hang/<codeName> để copy chia sẻ. */
export function taoUrlChiaSeKhachHang(
  codeName: string | null | undefined,
): string | null {
  const ma = codeName?.trim();
  if (!ma) return null;
  const path = taoPathEntity('khach-hang', ma);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
