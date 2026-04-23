// ═══════════════════════════════════════════════════════════════════════════
// Cửa hàng (Zustand) — Phiên làm việc theo VAI TRÒ
// Chế độ offline cá nhân: KHÔNG có mật khẩu, chỉ chọn vai trò admin/sale/purchase
// Persist qua expo-secure-store (giữ phiên qua các lần mở app)
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type VaiTro = 'admin' | 'sale' | 'purchase';

export const NHAN_VAI_TRO: Record<VaiTro, string> = {
  admin: 'Quản trị viên',
  sale: 'Kinh doanh',
  purchase: 'Thu mua',
};

// Adapter cho zustand persist dùng SecureStore
const luuTruBaoMat = {
  getItem: async (ten: string) => (await SecureStore.getItemAsync(ten)) ?? null,
  setItem: async (ten: string, gt: string) => SecureStore.setItemAsync(ten, gt),
  removeItem: async (ten: string) => SecureStore.deleteItemAsync(ten),
};

interface CuaHangAuth {
  vaiTroHienTai: VaiTro | null;
  daRehydrate: boolean;

  chonVaiTro: (vt: VaiTro) => void;
  thoatVaiTro: () => void;
}

export const dungCuaHangAuth = create<CuaHangAuth>()(
  persist(
    (set) => ({
      vaiTroHienTai: null,
      daRehydrate: false,

      chonVaiTro: (vt) => set({ vaiTroHienTai: vt }),
      thoatVaiTro: () => set({ vaiTroHienTai: null }),
    }),
    {
      name: 'lts-vai-tro',
      storage: createJSONStorage(() => luuTruBaoMat),
      partialize: (state) => ({ vaiTroHienTai: state.vaiTroHienTai }),
      onRehydrateStorage: () => (state) => {
        // Đánh dấu đã rehydrate xong để gate biết khi nào an toàn redirect
        if (state) state.daRehydrate = true;
      },
    }
  )
);
