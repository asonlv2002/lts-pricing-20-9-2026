import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { AuditAction, ProductionOrder } from '../../lib/types';
import { luuLocalStorage, LS_LSX } from '../helpers';

type LsxPatch = { status?: ProductionOrder['status']; manual?: Partial<ProductionOrder['manual']> };

const AUDITABLE_MANUAL_FIELDS: Array<keyof ProductionOrder['manual']> = [
  'lsxNumber',
  'issuedDate',
  'deliveryDate',
  'preparedBy',
  'approvedBy',
  'notes',
];

export function buildLsxAuditChange(old: ProductionOrder, patch: LsxPatch): { action: AuditAction; before: Record<string, unknown>; after: Record<string, unknown> } {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  if (patch.status !== undefined && patch.status !== old.status) {
    before.status = old.status;
    after.status = patch.status;
  }

  for (const field of AUDITABLE_MANUAL_FIELDS) {
    if (!patch.manual || !(field in patch.manual)) continue;
    const nextValue = patch.manual[field];
    const oldValue = old.manual[field];
    if (nextValue === oldValue) continue;
    before[field] = oldValue;
    after[field] = nextValue;
  }

  return {
    action: patch.status !== undefined ? 'status_change' : 'update',
    before,
    after,
  };
}

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
      const lenhSanXuat = state.productionOrders.map(o => o.id === id ? { ...o, ...banVa, manual: { ...o.manual, ...(banVa.manual ?? {}) } } : o);
      luuLocalStorage(LS_LSX, lenhSanXuat);
      if (old) {
        setTimeout(() => {
          const auditChange = buildLsxAuditChange(old, banVa);
          get().ghiNhatKy({
            userId: state.currentSellerId,
            userName: state.currentSellerName,
            action: auditChange.action,
            targetType: 'order',
            targetId: id,
            targetName: old.snapshot.productName,
            before: auditChange.before,
            after: auditChange.after,
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
