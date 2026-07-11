import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { ProductionOrder } from '../../lib/types';

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
    set((state) => ({
      productionOrders: [lenh, ...state.productionOrders],
    }));
  },

  capNhatLSX: (id, banVa) => {
    set((state) => ({
      productionOrders: state.productionOrders.map(o =>
        o.id === id ? { ...o, ...banVa, manual: { ...o.manual, ...(banVa.manual ?? {}) } } : o,
      ),
    }));
  },

  xoaLSX: (id) => {
    set((state) => ({
      productionOrders: state.productionOrders.filter(o => o.id !== id),
    }));
  },
});
