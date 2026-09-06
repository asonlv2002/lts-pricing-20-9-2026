import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { OverrideTable, OverrideRowKey, OverrideFields } from '../../lib/types';
import { lapDongSanXuat } from '../../lib/manager-calculation';
import { tinhKetQuaNangCaoHieuLuc } from '../../lib/dac-ta-nang-cao';
import { trichCpsxNangCao, apCpsxNangCaoVaoHangSo } from '../../lib/cpsx-nang-cao-pin';

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
    const old = history.find(h => h.id === idLichSu);
    const ghiDeSaleDaLuu  = Object.keys(ghiDeSale).length  > 0 ? ghiDeSale  : undefined;
    const ghiDeAdminDaLuu = Object.keys(ghiDeAdmin).length > 0 ? ghiDeAdmin : undefined;

    // Sheet nâng cao: "Lưu thay đổi" trong tab ghi đè ÁP LUÔN giá mới theo ghi đè
    // vừa lưu — đồng bộ Cập nhật/Lưu mới (giá = TỔNG bảng đặc tả nâng cao, cùng
    // nguồn pin CPSX NC; LN% ghi đè Sale/Admin chỉ preview, không áp vào giá lưu).
    // Tab thường / thương mại: giữ nguyên giá (hành vi cũ).
    const st = get();
    const laNangCap = !!st.cheDoNangCao && st.input.pricingMode !== 'commercial';
    let giaHieuLuc: { finalPrice: number; profitRate: number; profitAmount: number } | null = null;
    if (laNangCap && st.result) {
      const pinCpsx = old?.pinnedCpsxNangCao ?? trichCpsxNangCao(st.constants);
      const hangSoLuu = apCpsxNangCaoVaoHangSo(st.constants, pinCpsx);
      const ketQuaLuu = tinhKetQuaNangCaoHieuLuc({
        result: st.result,
        uniRows: lapDongSanXuat(st.result, hangSoLuu).uniRows,
        constants: hangSoLuu,
        materials: st.materials,
        saleOverrides: ghiDeSale,
        adminOverrides: ghiDeAdmin,
        saleProfitRatePct: 0,
        adminProfitRatePct: 0,
        profitTable: st.profitTable,
      }).result;
      giaHieuLuc = {
        finalPrice: ketQuaLuu.finalPrice,
        profitRate: ketQuaLuu.profitRate,
        profitAmount: ketQuaLuu.profitAmount,
      };
    }

    const lichSuDaCapNhat = history.map(h =>
      h.id === idLichSu ? {
        ...h,
        ...(giaHieuLuc
          ? { finalPrice: giaHieuLuc.finalPrice, profitRate: giaHieuLuc.profitRate, profitAmount: giaHieuLuc.profitAmount }
          : {}),
        saleOverrides: ghiDeSaleDaLuu, adminOverrides: ghiDeAdminDaLuu, saleProfitRatePct: saleProfitRatePct || undefined, adminProfitRatePct: adminProfitRatePct || undefined
      } : h
    );
    set({ history: lichSuDaCapNhat });
  },
});
