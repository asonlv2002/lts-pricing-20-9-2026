// ═══════════════════════════════════════════════════════════════════════════
// Policy → Menu filtering utilities
// ═══════════════════════════════════════════════════════════════════════════
import type { PolicyCode } from './api/service-lts';

const NHOM_MENU_POLICIES: Record<string, PolicyCode[]> = {
  overview: [],
  pricing_quote: [],
  customers: [],
  // pricing_config: không gate ở cấp nhóm — mục "chi-phí-sx-nâng-cấp" mở cho mọi
  // người xem kết quả (read-only); các mục khác vẫn gate từng item PRICE_CONFIG_MANAGER.
  pricing_config: [],
  system: ['ACCOUNT_READ', 'ROLE_READ'],
};

// Policy bắt buộc cho từng mục menu cụ thể (gate ở cấp item).
// Lưu ý: "danh-sach-bao-gia" KHÔNG gate ở menu — admin/sale đều xem được danh sách báo giá.
// Chức năng Duyệt/Từ chối bên trong trang vẫn gate theo QUOTATION_REVIEWER (coQuyenDuyetBaoGia).
const MUC_MENU_POLICIES: Record<string, PolicyCode[]> = {
  'cau-hinh-vat-tu': ['PRICE_CONFIG_MANAGER'],
  'cau-hinh-chi-phi-sx': ['PRICE_CONFIG_MANAGER'],
  // 'cau-hinh-chi-phi-sx-nang-cap': KHÔNG gate — ai cũng xem được, chỉ người có
  // PRICE_CONFIG_MANAGER mới được SỬA (UI tự khóa khi không có quyền).
  'cau-hinh-gia-cong-ngoai': ['PRICE_CONFIG_MANAGER'],
  'cau-hinh-loi-nhuan': ['PRICE_CONFIG_MANAGER'],
  'cau-hinh-phu-phi': ['PRICE_CONFIG_MANAGER'],
  'cau-hinh-lai-vay': ['PRICE_CONFIG_MANAGER'],
  'cau-hinh-dinh-muc-hao-hut': ['PRICE_CONFIG_MANAGER'],
  'cau-hinh-cong-thuc': ['PRICE_CONFIG_MANAGER'],
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
  'vai-tro',
  'phan-quyen',
  'cai-dat-he-thong',
  'tai-nguyen-he-thong',
  'nhat-ky-he-thong',
]);

export function coTheXemNhomMenu(policies: PolicyCode[], nhomId: string): boolean {
  if (nhomId === 'system') {
    return policies.includes('ACTIVITY_MONITOR')
      || policies.includes('SYSTEM_MONITOR')
      || policies.some(p => p.startsWith('ACCOUNT') || p.startsWith('ROLE') || p.startsWith('USER_POLICY'));
  }
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
  if (MENU_KEYS_SYSTEM.has(menuKey)) {
    return policies.includes('SYSTEM_MONITOR')
      || policies.some(p => p.startsWith('ACCOUNT') || p.startsWith('ROLE') || p.startsWith('USER_POLICY'));
  }
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

export function laAdmin(policies: PolicyCode[]): boolean {
  return policies.length > 0;
}

export function vaiTroTuPolicies(policies: PolicyCode[]): 'admin' | 'sale' | 'purchase' {
  if (policies.length === 0) return 'sale';
  const laAdmin = policies.some(p =>
    p.startsWith('ACCOUNT') || p.startsWith('ROLE') || p.startsWith('USER_POLICY')
    || p === 'ACTIVITY_MONITOR' || p === 'SYSTEM_MONITOR' || p === 'PRICE_CONFIG_MANAGER'
  );
  return laAdmin ? 'admin' : 'sale';
}
