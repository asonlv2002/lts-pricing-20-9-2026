// ═════════════════════════════════════════════════════════════════════════════
// Pricing Sheet Sync Logic
// ═════════════════════════════════════════════════════════════════════════════
//
// Quyết định: nên POST tạo pricing sheet mới, PATCH cập nhật, hay bỏ qua?
// - skip: offline/chưa đăng nhập/thiếu dữ liệu
// - postCreate: chưa có pricingSheetId → tạo mới
// - patch: có pricingSheetId → cập nhật (có thể thêm advisor patch)

import type { HistoryItem } from './types';
import type { CapNhatPricingSheetResultInput, CapNhatPricingSheetAdvisorInput } from './api/service-lts';
import { kiemTraMaKhachHang } from './customer-api';

export type SyncAction = 'skip' | 'postCreate' | 'patch';

export interface SyncDecision {
  action: SyncAction;
  includeAdvisor: boolean; // chỉ dùng khi action === 'patch'
  reason: string;
}

// Tìm mã khách hàng (codeName) từ tên khách trong HistoryItem.
// Copy từ ManHinhQuanLy.tsx để tránh circular dependency.
function timMaKhachHang(tenKhach: string): string | null {
  try {
    const raw = localStorage.getItem('lts_customers');
    if (!raw) return null;
    const list = JSON.parse(raw) as Array<{ companyName?: string; contactName?: string; customerCode?: string; id?: string }>;
    const q = (tenKhach || '').trim().toLowerCase();
    if (!q) return null;
    const found = list.find(c => {
      const ten = (c.companyName || c.contactName || c.customerCode || c.id || '').toLowerCase();
      return ten === q || (c.customerCode || '').toLowerCase() === q;
    });
    return found?.customerCode?.trim() || null;
  } catch {
    return null;
  }
}

// Quyết định đồng bộ pricing sheet
export function quyetDinhPricingSheetSync(
  h: HistoryItem | undefined,
  isAuthenticated: boolean,
  accessToken: string | null,
  pricingSheetId?: string | null,
): SyncDecision {
  if (!h) return { action: 'skip', includeAdvisor: false, reason: 'không có history item' };
  if (process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') return { action: 'skip', includeAdvisor: false, reason: 'offline mode' };
  if (!isAuthenticated || !accessToken) return { action: 'skip', includeAdvisor: false, reason: 'chưa đăng nhập' };

  const maKH = timMaKhachHang(h.customer);
  if (!maKH) return { action: 'skip', includeAdvisor: false, reason: 'không tìm thấy mã KH' };
  const checkKH = kiemTraMaKhachHang(maKH);
  if (!checkKH.hopLe) return { action: 'skip', includeAdvisor: false, reason: 'mã KH không hợp lệ' };

  if (!pricingSheetId) {
    return { action: 'postCreate', includeAdvisor: false, reason: 'chưa có pricingSheetId' };
  }

  // Có pricingSheetId → dùng PATCH
  // includeAdvisor: chỉ patch masterResult nếu adminOverrides có dữ liệu
  const hasAdminOverrides = !!h.adminOverrides && Object.keys(h.adminOverrides).length > 0;
  return {
    action: 'patch',
    includeAdvisor: hasAdminOverrides,
    reason: 'có pricingSheetId, sẽ PATCH',
  };
}
