// ═══════════════════════════════════════════════════════════════════════════
// Policy → Menu filtering utilities
// ═══════════════════════════════════════════════════════════════════════════
import type { PolicyCode } from './api/service-lts';

const NHOM_MENU_POLICIES: Record<string, PolicyCode[]> = {
  overview: [],
  pricing_quote: [],
  customers: [],
  pricing_config: ['ACCOUNT_READ'],
  system: ['ACCOUNT_READ', 'ROLE_READ'],
};

// Policy bắt buộc cho từng mục menu cụ thể (gate ở cấp item).
// Lưu ý: "pricing.quote_review" KHÔNG gate ở menu — admin/sale đều xem được danh sách báo giá.
// Chức năng Duyệt/Từ chối bên trong trang vẫn gate theo QUOTATION_REVIEWER (coQuyenDuyetBaoGia).
const MUC_MENU_POLICIES: Record<string, PolicyCode[]> = {
  // Nhật ký thao tác: ai cũng xem được (server tự filter — không có ACTIVITY_MONITOR chỉ thấy log của mình)
};

export function coTheXemNhomMenu(policies: PolicyCode[], nhomId: string): boolean {
  if (nhomId === 'system') {
    return policies.includes('ACTIVITY_MONITOR') || policies.some(p => p.startsWith('ACCOUNT') || p.startsWith('ROLE') || p.startsWith('USER_POLICY'));
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
  if (menuKey.startsWith('system.')) return policies.some(p => p.startsWith('ACCOUNT') || p.startsWith('ROLE') || p.startsWith('USER_POLICY'));
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
    || p === 'ACTIVITY_MONITOR' || p === 'PRICE_CONFIG_MANAGER'
  );
  return laAdmin ? 'admin' : 'sale';
}
