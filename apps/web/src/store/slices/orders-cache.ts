import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import {
  listQuotationPricingSheetOrdersService,
  type QuotationPricingSheetOrdersByQuotationApi,
} from '../../lib/api/service-lts';
import type { OrderCoPhienBan } from '@lts/bang-tinh-gia';

/**
 * Cache danh sách orders (LSX) theo quotationId — dùng derive quoteCode báo giá
 * (quoteCode = YYMM(createdAt BG) . versionByMonth order đầu tiên, BE b6028b0).
 * 1 request/phiên: GET /quotations/orders trả nhóm theo quotation.
 */
export interface OrdersCacheSlice {
  ordersTheoQuotation: Record<string, OrderCoPhienBan[]>;
  dangTaiOrdersCache: boolean;
  daTaiOrdersCache: boolean;
  taiOrdersCache: (accessToken: string | null | undefined) => Promise<void>;
}

export const createOrdersCacheSlice: StateCreator<CuaHangTinhGia, [], [], OrdersCacheSlice> = (set, get) => ({
  ordersTheoQuotation: {},
  dangTaiOrdersCache: false,
  daTaiOrdersCache: false,

  taiOrdersCache: async (accessToken) => {
    if (get().dangTaiOrdersCache || get().daTaiOrdersCache) return;
    set({ dangTaiOrdersCache: true });
    try {
      const data = await listQuotationPricingSheetOrdersService(accessToken ?? undefined);
      const map: Record<string, OrderCoPhienBan[]> = {};
      for (const q of (data ?? []) as QuotationPricingSheetOrdersByQuotationApi[]) {
        map[q.id] = (q.orders ?? []).map((o) => ({
          createdAt: o.createdAt,
          versionByMonth: o.versionByMonth,
        }));
      }
      set({ ordersTheoQuotation: map, daTaiOrdersCache: true });
    } catch {
      // Lỗi mạng/chưa login → không đánh dấu đã tải để lần sau retry.
    } finally {
      set({ dangTaiOrdersCache: false });
    }
  },
});
