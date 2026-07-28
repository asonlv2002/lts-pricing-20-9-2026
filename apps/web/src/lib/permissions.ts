// ═══════════════════════════════════════════════════════════════════════════
// Policy → Menu filtering utilities
// ═══════════════════════════════════════════════════════════════════════════
import type { PolicyCode } from './api/service-lts';

const NHOM_MENU_POLICIES: Record<string, PolicyCode[]> = {
  overview: [],
  pricing_quote: [],
  customers: [],
  pricing_config: ['PRICE_CONFIG_MANAGER'],
  system: ['ACCOUNT_READ', 'ROLE_READ'],
};

// Policy bắt buộc cho từng mục menu cụ thể (gate ở cấp item).
// Lưu ý: "pricing.quote_review" KHÔNG gate ở menu — admin/sale đều xem được danh sách báo giá.
// Chức năng Duyệt/Từ chối bên trong trang vẫn gate theo QUOTATION_REVIEWER (coQuyenDuyetBaoGia).
const MUC_MENU_POLICIES: Record<string, PolicyCode[]> = {
  'config.materials': ['PRICE_CONFIG_MANAGER'],
  'config.production_costs': ['PRICE_CONFIG_MANAGER'],
  'config.outsource_costs': ['PRICE_CONFIG_MANAGER'],
  'config.profit_margin': ['PRICE_CONFIG_MANAGER'],
  'config.surcharges': ['PRICE_CONFIG_MANAGER'],
  'config.interest': ['PRICE_CONFIG_MANAGER'],
  'config.waste_norms': ['PRICE_CONFIG_MANAGER'],
  'config.formulas': ['PRICE_CONFIG_MANAGER'],
  'system.system_resources': ['SYSTEM_MONITOR'],
};

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
  if (menuKey.endsWith('.audit_log')) return true;
  if (menuKey === 'system.system_resources') return policies.includes('SYSTEM_MONITOR');
  if (menuKey.startsWith('system.')) {
    return policies.includes('SYSTEM_MONITOR')
      || policies.some(p => p.startsWith('ACCOUNT') || p.startsWith('ROLE') || p.startsWith('USER_POLICY'));
  }
  return true;
}

// Người dùng có quyền duyệt/từ chối báo giá đã nộp.
export function coQuyenDuyetBaoGia(policies: PolicyCode[]): boolean {
  return policies.includes('QUOTATION_REVIEWER');
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
