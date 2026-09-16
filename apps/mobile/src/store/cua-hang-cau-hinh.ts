// ═══════════════════════════════════════════════════════════════════════════
// Cửa hàng — Cấu hình định mức (vật liệu, hằng số, bảng lợi nhuận)
// Persist qua AsyncStorage. Là single source of truth cho engine tính giá.
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VAT_LIEU_MAC_DINH,
  HANG_SO_MAC_DINH,
  BANG_LOI_NHUAN_MAC_DINH,
} from '@lts/hang-so';
import type { VatLieu, HangSo, DongLoiNhuan } from '@lts/kieu-du-lieu';

interface CuaHangCauHinh {
  vatLieu: VatLieu[];
  hangSo: HangSo;
  loiNhuan: DongLoiNhuan[];

  // Vật liệu
  themVatLieu: (vl: Omit<VatLieu, 'id'>) => void;
  capNhatVatLieu: (id: string, vl: Partial<VatLieu>) => void;
  xoaVatLieu: (id: string) => void;
  datLaiVatLieu: () => void;

  // Hằng số
  capNhatHangSo: (truong: Partial<HangSo>) => void;
  datLaiHangSo: () => void;

  // Lợi nhuận
  capNhatLoiNhuan: (idx: number, dong: Partial<DongLoiNhuan>) => void;
  themDongLoiNhuan: () => void;
  xoaDongLoiNhuan: (idx: number) => void;
  datLaiLoiNhuan: () => void;
}

export const dungCuaHangCauHinh = create<CuaHangCauHinh>()(
  persist(
    (set) => ({
      vatLieu: VAT_LIEU_MAC_DINH,
      hangSo: HANG_SO_MAC_DINH,
      loiNhuan: BANG_LOI_NHUAN_MAC_DINH,

      themVatLieu: (vl) =>
        set((s) => ({
          vatLieu: [...s.vatLieu, { ...vl, id: `VL-${Date.now()}` }],
        })),
      capNhatVatLieu: (id, vl) =>
        set((s) => ({
          vatLieu: s.vatLieu.map((x) => (x.id === id ? { ...x, ...vl } : x)),
        })),
      xoaVatLieu: (id) =>
        set((s) => ({ vatLieu: s.vatLieu.filter((x) => x.id !== id) })),
      datLaiVatLieu: () => set({ vatLieu: VAT_LIEU_MAC_DINH }),

      capNhatHangSo: (truong) =>
        set((s) => ({ hangSo: { ...s.hangSo, ...truong } })),
      datLaiHangSo: () => set({ hangSo: HANG_SO_MAC_DINH }),

      capNhatLoiNhuan: (idx, dong) =>
        set((s) => ({
          loiNhuan: s.loiNhuan.map((d, i) => (i === idx ? { ...d, ...dong } : d)),
        })),
      themDongLoiNhuan: () =>
        set((s) => ({
          loiNhuan: [...s.loiNhuan, { nguong: 0, cot1: 0, cot2: 0, cot1KhachLon: 0, cot2KhachLon: 0 }],
        })),
      xoaDongLoiNhuan: (idx) =>
        set((s) => ({ loiNhuan: s.loiNhuan.filter((_, i) => i !== idx) })),
      datLaiLoiNhuan: () => set({ loiNhuan: BANG_LOI_NHUAN_MAC_DINH }),
    }),
    {
      name: 'lts-cau-hinh',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
