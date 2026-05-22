import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { OverrideTable, OverrideRowKey, OverrideFields } from '../../lib/types';
import { luuLocalStorage, LS_HISTORY } from '../helpers';

export interface OverrideSlice {
  saleOverrides: OverrideTable;
  adminOverrides: OverrideTable;
  showSaleOverrides: boolean;
  showAdminOverrides: boolean;

  setSaleOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: OverrideFields[keyof OverrideFields] | undefined) => void;
  setAdminOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: OverrideFields[keyof OverrideFields] | undefined) => void;
  setShowSaleOverrides: (v: boolean) => void;
  setShowAdminOverrides: (v: boolean) => void;
  persistOverrides: (historyId: string) => void;
}

export const createOverrideSlice: StateCreator<CuaHangTinhGia, [], [], OverrideSlice> = (set, get) => ({
  saleOverrides: {},
  adminOverrides: {},
  showSaleOverrides: false,
  showAdminOverrides: false,

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

  persistOverrides: (idLichSu) => {
    const { saleOverrides: ghiDeSale, adminOverrides: ghiDeAdmin, history } = get();
    const ghiDeSaleDaLuu  = Object.keys(ghiDeSale).length  > 0 ? ghiDeSale  : undefined;
    const ghiDeAdminDaLuu = Object.keys(ghiDeAdmin).length > 0 ? ghiDeAdmin : undefined;
    const lichSuDaCapNhat = history.map(h =>
      h.id === idLichSu ? { ...h, saleOverrides: ghiDeSaleDaLuu, adminOverrides: ghiDeAdminDaLuu } : h
    );
    set({ history: lichSuDaCapNhat });
    luuLocalStorage(LS_HISTORY, lichSuDaCapNhat);
  },
});
