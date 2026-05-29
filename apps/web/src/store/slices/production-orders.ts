import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { ProductionOrder } from '../../lib/types';
import { luuLocalStorage, LS_LSX } from '../helpers';

export interface ProductionOrderSlice {
  productionOrders: ProductionOrder[];

  themLSX: (lenh: ProductionOrder) => void;
  capNhatLSX: (id: string, patch: Partial<Pick<ProductionOrder, 'status' | 'manual'>>) => void;
  xoaLSX: (id: string) => void;
}

export const createProductionOrderSlice: StateCreator<CuaHangTinhGia, [], [], ProductionOrderSlice> = (set, get) => ({
  productionOrders: [],

  themLSX: (lenh) => {
    set((state) => {
      const lenhSanXuat = [lenh, ...state.productionOrders];
      luuLocalStorage(LS_LSX, lenhSanXuat);
      setTimeout(() => {
        get().ghiNhatKy({
          userId: state.currentSellerId,
          userName: state.currentSellerName,
          action: 'create_lsx',
          targetType: 'order',
          targetId: lenh.id,
          targetName: lenh.snapshot.productName,
          after: { status: lenh.status, quoteId: lenh.quoteId },
        });
      }, 0);
      return { productionOrders: lenhSanXuat };
    });
  },

  capNhatLSX: (id, banVa) => {
    set((state) => {
      const old = state.productionOrders.find(o => o.id === id);
      const lenhSanXuat = state.productionOrders.map(o => o.id === id ? { ...o, ...banVa } : o);
      luuLocalStorage(LS_LSX, lenhSanXuat);
      if (old) {
        setTimeout(() => {
          get().ghiNhatKy({
            userId: state.currentSellerId,
            userName: state.currentSellerName,
            action: 'update',
            targetType: 'order',
            targetId: id,
            targetName: old.snapshot.productName,
            before: Object.fromEntries(Object.keys(banVa).map(k => [k, (old as unknown as Record<string, unknown>)[k]])),
            after: banVa as Record<string, unknown>,
          });
        }, 0);
      }
      return { productionOrders: lenhSanXuat };
    });
  },

  xoaLSX: (id) => {
    set((state) => {
      const old = state.productionOrders.find(o => o.id === id);
      const lenhSanXuat = state.productionOrders.filter(o => o.id !== id);
      luuLocalStorage(LS_LSX, lenhSanXuat);
      if (old) {
        setTimeout(() => {
          get().ghiNhatKy({
            userId: state.currentSellerId,
            userName: state.currentSellerName,
            action: 'delete',
            targetType: 'order',
            targetId: id,
            targetName: old.snapshot.productName,
            before: { status: old.status, quoteId: old.quoteId },
          });
        }, 0);
      }
      return { productionOrders: lenhSanXuat };
    });
  },
});
