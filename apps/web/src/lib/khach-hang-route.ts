import {
  docQueryParam,
  dongBoUrlQueryExclusive,
  ghepUrlQueryExclusive,
} from './support-route';

/** Query param deep-link panel khách hàng: /?khach-hang=<codeName> */
export const KHACH_HANG_QUERY = 'khach-hang';

/** Chuẩn hoá mã KH để so khớp list ↔ URL (trim + hoa). */
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

export function ghepUrlKhachHang(
  href: string,
  codeName: string | null | undefined,
): string {
  if (codeName && codeName.trim()) {
    return ghepUrlQueryExclusive(href, { key: KHACH_HANG_QUERY, id: codeName });
  }
  return ghepUrlQueryExclusive(href, null);
}

export function dongBoUrlKhachHang(codeName: string | null | undefined): void {
  if (codeName && codeName.trim()) {
    dongBoUrlQueryExclusive({ key: KHACH_HANG_QUERY, id: codeName });
  } else {
    dongBoUrlQueryExclusive(null);
  }
}
