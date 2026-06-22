import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { VersionSnapshot, HistoryItem } from '../../lib/types';
import { luuLocalStorage, LS_VERSIONS, LS_HISTORY } from '../helpers';

const MAX_VERSIONS_PER_ITEM = 10;

export interface VersioningSlice {
  versions: VersionSnapshot[];

  luuPhienBan: (historyItemId: string, label?: string) => void;
  layPhienBanTheoMuc: (historyItemId: string) => VersionSnapshot[];
  khoiPhucPhienBan: (versionId: string) => void;
  taiVersions: (data: VersionSnapshot[]) => void;
}

export const createVersioningSlice: StateCreator<CuaHangTinhGia, [], [], VersioningSlice> = (set, get) => ({
  versions: [],

  luuPhienBan: (historyItemId, label) => {
    const state = get();
    const item = state.history.find(h => h.id === historyItemId);
    if (!item) return;

    const snapshot: VersionSnapshot = {
      id: crypto.randomUUID(),
      historyItemId,
      timestamp: new Date().toISOString(),
      userId: state.currentSellerId,
      userName: state.currentSellerName,
      label,
      data: structuredClone(item),
    };

    set((s) => {
      const existing = s.versions.filter(v => v.historyItemId === historyItemId);
      const others = s.versions.filter(v => v.historyItemId !== historyItemId);
      const updated = [snapshot, ...existing].slice(0, MAX_VERSIONS_PER_ITEM);
      const versions = [...updated, ...others];
      luuLocalStorage(LS_VERSIONS, versions);
      return { versions };
    });
  },

  layPhienBanTheoMuc: (historyItemId) => {
    return get().versions
      .filter(v => v.historyItemId === historyItemId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  khoiPhucPhienBan: (versionId) => {
    const state = get();
    const version = state.versions.find(v => v.id === versionId);
    if (!version) return;

    const historyItemId = version.historyItemId;

    state.luuPhienBan(historyItemId, 'Trước khi khôi phục');

    set((s) => {
      const history = s.history.map(h => {
        if (h.id !== historyItemId) return h;
        return {
          ...version.data,
          id: h.id,
          date: h.date,
          quoteCode: h.quoteCode,
        };
      });
      luuLocalStorage(LS_HISTORY, history);
      return { history };
    });
  },

  taiVersions: (data) => set({ versions: data }),
});
