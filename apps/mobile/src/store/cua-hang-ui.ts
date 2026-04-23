// ═══════════════════════════════════════════════════════════════════════════
// Cửa hàng — UI preferences (theme, etc.)
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CuaHangUI {
  chuDe: 'sang' | 'toi';
  doiChuDe: () => void;
}

export const dungCuaHangUI = create<CuaHangUI>()(
  persist(
    (set) => ({
      chuDe: 'sang',
      doiChuDe: () =>
        set((s) => ({ chuDe: s.chuDe === 'sang' ? 'toi' : 'sang' })),
    }),
    {
      name: 'lts-ui',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
