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

export const createProductionOrderSlice: StateCreator<CuaHangTinhGia, [], [], ProductionOrderSlice> = (set) => ({
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
      const lenhSanXuat = state.productionOrders.map(o => o.id === id ? { ...o, ...banVa } : o);
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
