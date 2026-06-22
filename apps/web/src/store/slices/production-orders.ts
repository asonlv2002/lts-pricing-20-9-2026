import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { ProductionOrder } from '../../lib/types';
import { luuLocalStorage, LS_LSX } from '../helpers';

type LsxPatch = { status?: ProductionOrder['status']; manual?: Partial<ProductionOrder['manual']> };

export interface ProductionOrderSlice {
  productionOrders: ProductionOrder[];

  themLSX: (lenh: ProductionOrder) => void;
  capNhatLSX: (id: string, patch: LsxPatch) => void;
  xoaLSX: (id: string) => void;
}

export const createProductionOrderSlice: StateCreator<CuaHangTinhGia, [], [], ProductionOrderSlice> = (set, get) => ({
  productionOrders: [],

  themLSX: (lenh) => {
    set((state) => {
      const lenhSanXuat = [lenh, ...state.productionOrders];
      luuLocalStorage(LS_LSX, lenhSanXuat);
      return { productionOrders: lenhSanXuat };
    });
  },

  capNhatLSX: (id, banVa) => {
    set((state) => {
      const lenhSanXuat = state.productionOrders.map(o => o.id === id ? { ...o, ...banVa, manual: { ...o.manual, ...(banVa.manual ?? {}) } } : o);
      luuLocalStorage(LS_LSX, lenhSanXuat);
      return { productionOrders: lenhSanXuat };
    });
  },

  xoaLSX: (id) => {
    set((state) => {
      const lenhSanXuat = state.productionOrders.filter(o => o.id !== id);
      luuLocalStorage(LS_LSX, lenhSanXuat);
      return { productionOrders: lenhSanXuat };
    });
  },
});
