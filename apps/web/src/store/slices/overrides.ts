import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { OverrideTable, OverrideRowKey, OverrideFields } from '../../lib/types';

export interface OverrideSlice {
  saleOverrides: OverrideTable;
  adminOverrides: OverrideTable;
  showSaleOverrides: boolean;
  showAdminOverrides: boolean;
  saleProfitRatePct: number;
  adminProfitRatePct: number;

  setSaleOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: OverrideFields[keyof OverrideFields] | undefined) => void;
  setAdminOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: OverrideFields[keyof OverrideFields] | undefined) => void;
  setShowSaleOverrides: (v: boolean) => void;
  setShowAdminOverrides: (v: boolean) => void;
  setSaleProfitRatePct: (v: number) => void;
  setAdminProfitRatePct: (v: number) => void;
  persistOverrides: (historyId: string) => void;
}

export const createOverrideSlice: StateCreator<CuaHangTinhGia, [], [], OverrideSlice> = (set, get) => ({
  saleOverrides: {},
  adminOverrides: {},
  showSaleOverrides: false,
  showAdminOverrides: false,
  saleProfitRatePct: 0,
  adminProfitRatePct: 0,

  setSaleOverride: (khoaDong, truong, giaTri) => {
    set((state) => {
      const ghiDeMoi = { ...state.saleOverrides };
      if (giaTri === undefined) {
        if (ghiDeMoi[khoaDong]) {
          const { [truong]: _, ...rest } = ghiDeMoi[khoaDong]!;
          if (Object.keys(rest).length === 0) delete ghiDeMoi[khoaDong];
          else ghiDeMoi[khoaDong] = rest;
        }
      } else {
        ghiDeMoi[khoaDong] = { ...ghiDeMoi[khoaDong], [truong]: giaTri };
      }
      return { saleOverrides: ghiDeMoi };
    });
  },

  setAdminOverride: (khoaDong, truong, giaTri) => {
    set((state) => {
      const ghiDeMoi = { ...state.adminOverrides };
      if (giaTri === undefined) {
        if (ghiDeMoi[khoaDong]) {
          const { [truong]: _, ...rest } = ghiDeMoi[khoaDong]!;
          if (Object.keys(rest).length === 0) delete ghiDeMoi[khoaDong];
          else ghiDeMoi[khoaDong] = rest;
        }
      } else {
        ghiDeMoi[khoaDong] = { ...ghiDeMoi[khoaDong], [truong]: giaTri };
      }
      return { adminOverrides: ghiDeMoi };
    });
  },

  setShowSaleOverrides:  (v) => set({ showSaleOverrides: v }),
  setShowAdminOverrides: (v) => set({ showAdminOverrides: v }),
  setSaleProfitRatePct:  (v) => set({ saleProfitRatePct: v }),
  setAdminProfitRatePct: (v) => set({ adminProfitRatePct: v }),

  persistOverrides: (idLichSu) => {
    const { saleOverrides: ghiDeSale, adminOverrides: ghiDeAdmin, saleProfitRatePct, adminProfitRatePct, history } = get();
    const ghiDeSaleDaLuu  = Object.keys(ghiDeSale).length > 0 ? ghiDeSale  : undefined;
    const ghiDeAdminDaLuu = Object.keys(ghiDeAdmin).length > 0 ? ghiDeAdmin : undefined;

    // Bảng thay đổi Sale/Admin KHÔNG tác động giá — lưu chỉ ghi lại bảng ghi đè
    // (xem trước trong tab / đối chiếu A4 / LSX), finalPrice & LN giữ nguyên giá gốc.
    const lichSuDaCapNhat = history.map(h =>
      h.id === idLichSu ? {
        ...h,
        saleOverrides: ghiDeSaleDaLuu, adminOverrides: ghiDeAdminDaLuu, saleProfitRatePct: saleProfitRatePct || undefined, adminProfitRatePct: adminProfitRatePct || undefined
      } : h
    );
    set({ history: lichSuDaCapNhat });
  },
});
