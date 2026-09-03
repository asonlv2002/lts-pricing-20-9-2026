import type { LoaiDeepLink } from './support-route';
import type { HistoryItem } from './types';

export const MOBILE_HUB_PREFIX = 'mobile.hub.';
export const HUB_PATH_PREFIX = 'hub';

/** Path entity (không trùng menu slug). */
export const ENTITY_PATH_PREFIX: Record<LoaiDeepLink, string> = {
  'tinh-gia': 'tinh-gia',
  'tinh-gia-nang-cao': 'tinh-gia-nang-cao',
  'bao-gia': 'bao-gia',
  'khach-hang': 'khach-hang',
  lsx: 'lsx',
};

export type CheDoLichSu = 'push' | 'replace';

export type MaModuleMenu =
  | 'calculator'
  | 'quotations'
  | 'create_lsx'
  | 'lsx_list'
  | 'history_db'
  | 'master_data'
  | 'customers'
  | 'settings'
  | 'users'
  | 'audit_log'
  | 'system_metrics';

/** Menu key → module khi chỉ biết module (cross-nav không có key). */
export const MENU_MAC_DINH_THEO_MODULE: Record<MaModuleMenu, string> = {
  calculator: 'tao-tinh-gia',
  quotations: 'danh-sach-bao-gia',
  create_lsx: 'tao-lsx',
  lsx_list: 'danh-sach-lsx',
  history_db: 'danh-sach-tinh-gia',
  master_data: 'cau-hinh-vat-tu',
  customers: 'danh-sach-khach-hang',
  settings: 'cai-dat-he-thong',
  users: 'tai-khoan',
  audit_log: 'nhat-ky-tinh-gia',
  system_metrics: 'tai-nguyen-he-thong',
};

/** Deep-link entity → menu mặc định. */
export const MENU_MAC_DINH_KHI_DEEP_LINK: Record<LoaiDeepLink, string> = {
  'tinh-gia': 'tao-tinh-gia',
  'tinh-gia-nang-cao': 'tao-tinh-gia-nang-cap',
  'bao-gia': 'tao-bao-gia',
  'khach-hang': 'danh-sach-khach-hang',
  lsx: 'danh-sach-lsx',
};

export interface MucMenuRoute {
  key: string;
  id: MaModuleMenu;
}

export const MENU_DANH_SACH_BAO_GIA = 'danh-sach-bao-gia';

export type KetQuaParsePath =
  | { loai: 'menu'; menuKey: string }
  | { loai: 'hub'; menuKey: string; hubId: string }
  | { loai: 'entity'; entity: LoaiDeepLink; id: string; menuKey: string }
  | { loai: 'menu-detail'; menuKey: string; id: string }
  | { loai: 'root' }
  | { loai: 'unknown' };

export function laMobileHubMenuKey(key: string | null | undefined): boolean {
  return !!key && key.startsWith(MOBILE_HUB_PREFIX);
}

export function menuMacDinhKhiDeepLink(loai: LoaiDeepLink): string {
  return MENU_MAC_DINH_KHI_DEEP_LINK[loai];
}

export function menuKeyTuModule(module: MaModuleMenu): string {
  return MENU_MAC_DINH_THEO_MODULE[module];
}

/**
 * Menu key cho tab "tính giá" theo loại item:
 * - Bảng tính nâng cao (`isNangCap`) → `tao-tinh-gia-nang-cap`
 * - Bảng tính thường → `tao-tinh-gia`
 *
 * Ưu tiên `item.isNangCap` (cờ cấp HistoryItem), fallback `input.isNangCap`
 * (cờ trong input blob, mirror theo `moBangTinhVoiPin`).
 *
 * Tránh hard-code `dieuHuongModuleApp("calculator")` (luôn → `tao-tinh-gia`
 * cũ) — gây race với `VoTrang` ghi đè `cheDoNangCao` theo `menuDangChon`,
 * dẫn tới `page.tsx` reset form khi mở item nâng cao từ wizard BG / audit.
 */
export function menuKeyTinhGiaTheoItem(
  item: {
    isNangCap?: HistoryItem['isNangCap'];
    input?: HistoryItem['input'] | null;
  },
): string {
  return !!(item.isNangCap || item.input?.isNangCap)
    ? 'tao-tinh-gia-nang-cap'
    : 'tao-tinh-gia';
}

/**
 * Resolve module từ menu key.
 * Hub mobile → null (không đổi module).
 */
export function moduleTuMenuKey(
  key: string | null | undefined,
  danhSachMuc: readonly MucMenuRoute[],
): MaModuleMenu | null {
  if (!key?.trim()) return null;
  if (laMobileHubMenuKey(key)) return null;
  const muc = danhSachMuc.find((m) => m.key === key);
  return muc?.id ?? null;
}

/** Chuẩn hoá pathname: bỏ trailing slash (trừ root). */
export function chuanHoaPathname(pathname: string | null | undefined): string {
  if (!pathname || pathname === '/') return '/';
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return p.replace(/\/+$/, '') || '/';
}

/** Tách segments không rỗng. */
export function tachPathSegments(pathname: string | null | undefined): string[] {
  const p = chuanHoaPathname(pathname);
  if (p === '/') return [];
  return p.slice(1).split('/').filter(Boolean).map((s) => decodeURIComponent(s));
}

/**
 * Path menu: /tao-tinh-gia
 * Path hub: /hub/overview  (từ menuKey mobile.hub.overview)
 * Path entity: /tinh-gia/<id> | /tinh-gia-nang-cao/<id>
 */
export function taoPathMenu(menuKey: string | null | undefined): string {
  const key = menuKey?.trim() ?? '';
  if (!key) return '/';
  if (laMobileHubMenuKey(key)) {
    const hubId = key.slice(MOBILE_HUB_PREFIX.length);
    return hubId ? `/${HUB_PATH_PREFIX}/${encodeURIComponent(hubId)}` : '/';
  }
  return `/${encodeURIComponent(key)}`;
}

export function taoPathEntity(loai: LoaiDeepLink, id: string | null | undefined): string {
  const raw = id?.trim() ?? '';
  if (!raw) return taoPathMenu(menuMacDinhKhiDeepLink(loai));
  return `/${ENTITY_PATH_PREFIX[loai]}/${encodeURIComponent(raw)}`;
}

export function parsePathname(pathname: string | null | undefined): KetQuaParsePath {
  const segs = tachPathSegments(pathname);
  if (segs.length === 0) return { loai: 'root' };

  // /hub/<hubId>
  if (segs[0] === HUB_PATH_PREFIX) {
    if (segs.length >= 2 && segs[1]) {
      const hubId = segs[1];
      return {
        loai: 'hub',
        hubId,
        menuKey: `${MOBILE_HUB_PREFIX}${hubId}`,
      };
    }
    return { loai: 'unknown' };
  }

  // /tinh-gia/<id> | /tinh-gia-nang-cao/<id> | /bao-gia/<id> | /khach-hang/<id>
  // Sort dài → ngắn để "tinh-gia-nang-cao" không bị nuốt bởi "tinh-gia"
  const entityEntries = (Object.entries(ENTITY_PATH_PREFIX) as [LoaiDeepLink, string][])
    .slice()
    .sort((a, b) => b[1].length - a[1].length);
  for (const [loai, prefix] of entityEntries) {
    if (segs[0] === prefix) {
      if (segs.length >= 2 && segs[1]) {
        return {
          loai: 'entity',
          entity: loai,
          id: segs[1],
          menuKey: menuMacDinhKhiDeepLink(loai),
        };
      }
      // /tinh-gia không id → coi như menu tương ứng
      return { loai: 'menu', menuKey: menuMacDinhKhiDeepLink(loai) };
    }
  }

  // /danh-sach-bao-gia/<id> — chi tiết báo giá trong màn danh sách
  if (segs[0] === MENU_DANH_SACH_BAO_GIA && segs.length === 2 && segs[1]) {
    return {
      loai: 'menu-detail',
      menuKey: MENU_DANH_SACH_BAO_GIA,
      id: segs[1],
    };
  }

  // /<menuKey> — một segment (slug kebab)
  if (segs.length === 1 && segs[0]) {
    return { loai: 'menu', menuKey: segs[0] };
  }

  return { loai: 'unknown' };
}

/** Đọc entity deep-link từ pathname (thay query ?tinh-gia=). */
export function docDeepLinkTuPathname(
  pathname: string | null | undefined,
): { loai: LoaiDeepLink; id: string } | null {
  const p = parsePathname(pathname);
  if (p.loai !== 'entity') return null;
  return { loai: p.entity, id: p.id };
}

/** Menu key từ pathname (menu / hub / entity / menu-detail). */
export function docMenuKeyTuPathname(
  pathname: string | null | undefined,
): string | null {
  const p = parsePathname(pathname);
  if (
    p.loai === 'menu' ||
    p.loai === 'hub' ||
    p.loai === 'entity' ||
    p.loai === 'menu-detail'
  ) {
    return p.menuKey;
  }
  return null;
}

/** Id chi tiết báo giá từ /danh-sach-bao-gia/<id>. */
export function docIdChiTietDanhSachBaoGia(
  pathname: string | null | undefined,
): string | null {
  const p = parsePathname(pathname);
  if (p.loai === 'menu-detail' && p.menuKey === MENU_DANH_SACH_BAO_GIA) {
    return p.id;
  }
  return null;
}

/** Path list hoặc /danh-sach-bao-gia/<id>. */
export function taoPathChiTietDanhSachBaoGia(
  id: string | null | undefined,
): string {
  const raw = id?.trim() ?? '';
  if (!raw) return taoPathMenu(MENU_DANH_SACH_BAO_GIA);
  return `/${MENU_DANH_SACH_BAO_GIA}/${encodeURIComponent(raw)}`;
}

/** Đồng bộ URL chi tiết trong màn danh sách báo giá. */
export function dongBoUrlChiTietDanhSachBaoGia(
  id: string | null | undefined,
  mode: CheDoLichSu = 'push',
): void {
  if (typeof window === 'undefined') return;
  apDungUrl(taoPathChiTietDanhSachBaoGia(id), mode);
}

/** @deprecated Dùng docMenuKeyTuPathname — giữ alias tạm nếu còn import. */
export function docMenuKeyTuSearchParams(
  _search: string | URLSearchParams | null | undefined,
): string | null {
  if (typeof window === 'undefined') return null;
  return docMenuKeyTuPathname(window.location.pathname);
}

/** So path+search+hash; no-op nếu giống. */
export function apDungUrl(pathQuery: string, mode: CheDoLichSu): void {
  if (typeof window === 'undefined') return;
  const next = pathQuery.startsWith('/')
    ? pathQuery
    : `/${pathQuery.replace(/^\/*/, '')}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  if (mode === 'push') {
    window.history.pushState(window.history.state, '', next);
  } else {
    window.history.replaceState(window.history.state, '', next);
  }
}

/**
 * Đồng bộ path menu trên thanh địa chỉ.
 * push khi đổi menu; replace khi bootstrap.
 * Xóa query string (không còn ?m= / deep-link query).
 */
export function dongBoUrlMenu(
  menuKey: string | null | undefined,
  mode: CheDoLichSu = 'push',
): void {
  if (typeof window === 'undefined') return;
  const path = taoPathMenu(menuKey);
  apDungUrl(path, mode);
}

/** Đồng bộ path entity (replace mặc định — không spam history). */
export function dongBoUrlEntity(
  loai: LoaiDeepLink,
  id: string | null | undefined,
  mode: CheDoLichSu = 'replace',
): void {
  if (typeof window === 'undefined') return;
  apDungUrl(taoPathEntity(loai, id), mode);
}

/** Clear entity → về menu path tương ứng (hoặc menuKey cho trước). */
export function dongBoUrlVeMenu(
  menuKey: string | null | undefined,
  mode: CheDoLichSu = 'replace',
): void {
  dongBoUrlMenu(menuKey, mode);
}

export const LTS_NAVIGATE_EVENT = 'lts:navigate';

export type LtsNavigateDetail = {
  menuKey: string;
  mode?: CheDoLichSu;
};

export function dieuHuongMenuApp(
  menuKey: string,
  mode: CheDoLichSu = 'push',
): void {
  if (typeof window === 'undefined') return;
  const key = menuKey.trim();
  if (!key) return;
  window.dispatchEvent(
    new CustomEvent<LtsNavigateDetail>(LTS_NAVIGATE_EVENT, {
      detail: { menuKey: key, mode },
    }),
  );
}

export function dieuHuongModuleApp(
  module: MaModuleMenu,
  mode: CheDoLichSu = 'push',
): void {
  dieuHuongMenuApp(menuKeyTuModule(module), mode);
}
