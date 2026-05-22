import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { ConfigSnapshot } from '../../lib/types';
import { INITIAL_CONFIG_SNAPSHOTS } from '../../lib/data';
import { luuLocalStorage, LS_CONFIG_SNAPSHOTS } from '../helpers';

export interface ConfigVersioningSlice {
  configSnapshots: ConfigSnapshot[];
  selectedConfigSnapshotId: string | null;

  taiPhienBanDinhMuc: (data: ConfigSnapshot[]) => void;
  taoPhienBanDinhMuc: (params: { name?: string; effectiveMode: 'date' | 'month'; effectiveFrom: string }) => void;
  xoaPhienBanDinhMuc: (id: string) => void;
  apDungPhienBanDinhMuc: (id: string) => void;
  timPhienBanDinhMucTheoNgay: (date: string) => ConfigSnapshot | null;
}

const sapXepTheoHieuLuc = (snapshots: ConfigSnapshot[]) =>
  [...snapshots].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.updatedAt.localeCompare(a.updatedAt));

export const createConfigVersioningSlice: StateCreator<CuaHangTinhGia, [], [], ConfigVersioningSlice> = (set, get) => ({
  configSnapshots: INITIAL_CONFIG_SNAPSHOTS,
  selectedConfigSnapshotId: null,

  taiPhienBanDinhMuc: (data) => set({ configSnapshots: sapXepTheoHieuLuc(data) }),

  taoPhienBanDinhMuc: ({ name, effectiveMode, effectiveFrom }) => {
    const state = get();
    const now = new Date().toISOString();
    const snapshot: ConfigSnapshot = {
      id: crypto.randomUUID(),
      name: name?.trim() || undefined,
      effectiveMode,
      effectiveFrom,
      createdAt: now,
      updatedAt: now,
      materials: structuredClone(state.materials),
      smallWidthPrices: structuredClone(state.smallWidthPrices),
      constants: structuredClone(state.constants),
      profitTable: structuredClone(state.profitTable),
    };

    set((s) => {
      const configSnapshots = sapXepTheoHieuLuc([snapshot, ...s.configSnapshots]);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      return { configSnapshots, selectedConfigSnapshotId: snapshot.id };
    });
  },

  xoaPhienBanDinhMuc: (id) => {
    set((s) => {
      const configSnapshots = s.configSnapshots.filter(snapshot => snapshot.id !== id);
      luuLocalStorage(LS_CONFIG_SNAPSHOTS, configSnapshots);
      return {
        configSnapshots,
        selectedConfigSnapshotId: s.selectedConfigSnapshotId === id ? null : s.selectedConfigSnapshotId,
      };
    });
  },

  apDungPhienBanDinhMuc: (id) => {
    const snapshot = get().configSnapshots.find(item => item.id === id);
    if (!snapshot) return;

    get().replaceFullConfig({
      materials: structuredClone(snapshot.materials),
      smallWidthPrices: structuredClone(snapshot.smallWidthPrices),
      constants: structuredClone(snapshot.constants),
      profitTable: structuredClone(snapshot.profitTable),
    });
    set({ selectedConfigSnapshotId: id });
  },

  timPhienBanDinhMucTheoNgay: (date) => {
    const targetMonth = date.slice(0, 7);
    const candidates = get().configSnapshots.filter(snapshot => {
      if (snapshot.effectiveMode === 'month') return snapshot.effectiveFrom <= targetMonth;
      return snapshot.effectiveFrom <= date;
    });
    return sapXepTheoHieuLuc(candidates)[0] ?? null;
  },
});
