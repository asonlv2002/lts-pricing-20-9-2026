// ═══════════════════════════════════════════════════════════════════════════
// Policy → Menu filtering utilities
// ═══════════════════════════════════════════════════════════════════════════
import type { PolicyCode } from './api/service-lts';

export type { PolicyCode } from './api/service-lts';

const NHOM_MENU_POLICIES: Record<string, PolicyCode[]> = {
  overview: [],
  pricing_quote: [],
  customers: [],
  // pricing_config: không gate ở cấp nhóm — mục "chi-phí-sx-nâng-cấp" mở cho mọi
  // người xem kết quả (read-only); các mục khác vẫn gate từng item PRICE_CONFIG_MANAGER.
  pricing_config: [],
  system: ['ACCOUNT_MANAGER', 'ROLE_MANAGER'],
};

// Policy bắt buộc cho từng mục menu cụ thể (gate ở cấp item).
// Lưu ý: "danh-sach-bao-gia" KHÔNG gate ở menu — admin/sale đều xem được danh sách báo giá.
// Chức năng Duyệt/Từ chối bên trong trang vẫn gate theo QUOTATION_REVIEWER (coQuyenDuyetBaoGia).
// Các mục cấu hình tính giá (vật tư, chi phí sản xuất, lợi nhuận, phụ phí, lãi vay,
// CPSX nâng cao) KHÔNG gate ở menu — ai cũng XEM được; người không có
// PRICE_CONFIG_MANAGER sẽ bị UI tự khóa (read-only) khi vào màn cấu hình.
const MUC_MENU_POLICIES: Record<string, PolicyCode[]> = {
  'tai-nguyen-he-thong': ['SYSTEM_MONITOR'],
};

/** Menu key nhật ký — slug VN, không còn suffix `.audit_log`. */
const MENU_KEYS_AUDIT_LOG = new Set([
  'nhat-ky-tinh-gia',
  'nhat-ky-khach-hang',
  'nhat-ky-he-thong',
]);

/** Menu key nhóm quản trị hệ thống. */
const MENU_KEYS_SYSTEM = new Set([
  'tai-khoan',
  'yeu-cau-mat-khau',
  'vai-tro',
  'phan-quyen',
  'cai-dat-he-thong',
  'tai-nguyen-he-thong',
  'nhat-ky-he-thong',
]);

function coQuyenHeThong(policies: PolicyCode[]): boolean {
  return policies.includes('ACTIVITY_MONITOR')
    || policies.includes('SYSTEM_MONITOR')
    || policies.includes('ACCOUNT_MANAGER')
    || policies.includes('ROLE_MANAGER')
    || policies.includes('USER_POLICY_GRANT')
    || policies.includes('USER_POLICY_REVOKE');
}

export function coTheXemNhomMenu(policies: PolicyCode[], nhomId: string): boolean {
  if (nhomId === 'system') return coQuyenHeThong(policies);
  const requiredPolicies = NHOM_MENU_POLICIES[nhomId];
  if (!requiredPolicies || requiredPolicies.length === 0) return true;
  return requiredPolicies.every(p => policies.includes(p));
}

export function coTheXemMucMenu(policies: PolicyCode[], menuKey: string): boolean {
  const required = MUC_MENU_POLICIES[menuKey];
  if (required && required.length > 0) return required.every(p => policies.includes(p));
  // Nhật ký: ai cũng xem được (server tự filter theo actorId)
  if (MENU_KEYS_AUDIT_LOG.has(menuKey)) return true;
  if (menuKey === 'tai-nguyen-he-thong') return policies.includes('SYSTEM_MONITOR');
  if (menuKey === 'yeu-cau-mat-khau') return policies.includes('ACCOUNT_MANAGER');
  if (menuKey === 'vai-tro') return policies.includes('ROLE_MANAGER');
  if (MENU_KEYS_SYSTEM.has(menuKey)) return coQuyenHeThong(policies);
  return true;
}

// Người dùng có quyền duyệt/từ chối báo giá đã nộp.
export function coQuyenDuyetBaoGia(policies: PolicyCode[]): boolean {
  return policies.includes('QUOTATION_REVIEWER');
}

// Người dùng có quyền duyệt/từ chối LSX (order approval).
export function coQuyenDuyetLsx(policies: PolicyCode[]): boolean {
  return policies.includes('ORDER_REVIEWER');
}

// Người dùng có ít nhất 1 quyền duyệt (báo giá hoặc LSX) — dùng cho PIN duyệt.
export function coQuyenDuyet(policies: PolicyCode[]): boolean {
  return coQuyenDuyetBaoGia(policies) || coQuyenDuyetLsx(policies);
}

// Người dùng có quyền cố vấn bảng tính giá (chỉ sửa Admin, không sửa Sale).
export function coQuyenCoVanBangTinh(policies: PolicyCode[]): boolean {
  return policies.includes('PRICING_SHEET_ADVISOR');
}

// Người dùng có quyền quản lý người phụ trách khách hàng (mọi khách hàng).
export function coQuyenQuanLyKhachHang(policies: PolicyCode[]): boolean {
  return policies.includes('CUSTOMER_MANAGER');
}

// Người dùng có thể xem/duyệt toàn bộ bảng tính giá trên hệ thống.
export function coQuyenXemTatCaBangTinh(policies: PolicyCode[]): boolean {
  return policies.includes('PRICING_SHEET_ADVISOR');
}

/** Duyệt yêu cầu đặt lại mật khẩu + quản lý account credentials. */
export function coQuyenQuanLyTaiKhoan(policies: PolicyCode[]): boolean {
  return policies.includes('ACCOUNT_MANAGER');
}

export function laAdmin(policies: PolicyCode[]): boolean {
  return policies.length > 0;
}

export function vaiTroTuPolicies(policies: PolicyCode[]): 'admin' | 'sale' | 'purchase' {
  if (policies.length === 0) return 'sale';
  const laAdmin = policies.some(p =>
    p === 'ACCOUNT_MANAGER'
    || p === 'ROLE_MANAGER'
    || p === 'USER_POLICY_GRANT'
    || p === 'USER_POLICY_REVOKE'
    || p === 'ACTIVITY_MONITOR'
    || p === 'SYSTEM_MONITOR'
    || p === 'PRICE_CONFIG_MANAGER'
  );
  return laAdmin ? 'admin' : 'sale';
}

// Người dùng có quyền sửa 1 mục cụ thể trong CPSX nâng cao.
export function coQuyenSuaMucCpsxUpgrade(
  policyCode: PolicyCode,
  userPolicies: PolicyCode[],
): boolean {
  return userPolicies.includes(policyCode);
}

export function coQuyenSuaMucCpsxUpgradeTuNguoiDung(
  policyCode: PolicyCode,
  nguoiDung: { policies: PolicyCode[] } | null,
): boolean {
  return !!nguoiDung?.policies.includes(policyCode);
}

// ── Quyền hiện cột Bảng 2 (đặc tả NC/điện) theo policy CPSX nâng cao ──────────
// Cột điện: chỉ cần quyền "Điện/phút mỗi máy" (không cần quyền "giá theo khung giờ").
// Cột nhân công + thời gian: cần đủ TẤT CẢ code máy trong mục (AND).

const NHOM_CPSX_LUONG_BANG2: PolicyCode[] = [
  'CPSX_UPGRADE_EDIT_LABOR_PRINT',
  'CPSX_UPGRADE_EDIT_LABOR_LAMINATE',
  'CPSX_UPGRADE_EDIT_LABOR_SLIT',
  'CPSX_UPGRADE_EDIT_LABOR_BAG',
];

const NHOM_CPSX_THOI_GIAN_BANG2: PolicyCode[] = [
  'CPSX_UPGRADE_EDIT_TIME_PRINT',
  'CPSX_UPGRADE_EDIT_TIME_LAMINATE',
  'CPSX_UPGRADE_EDIT_TIME_SLIT',
  'CPSX_UPGRADE_EDIT_TIME_BAG',
];

export interface CotBang2Cpsx {
  coDien: boolean;
  coLuong: boolean;
  coThoiGian: boolean;
}

/** Tính quyền hiện từng cụm cột của Bảng 2 từ policies CPSX nâng cao của user. */
export function cotBang2TheoQuyen(cpsxPolicies: PolicyCode[]): CotBang2Cpsx {
  const co = (c: PolicyCode) => cpsxPolicies.includes(c);
  return {
    coDien: co('CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE'),
    coLuong: NHOM_CPSX_LUONG_BANG2.every(co),
    coThoiGian: NHOM_CPSX_THOI_GIAN_BANG2.every(co),
  };
}
