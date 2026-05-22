import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { HistoryItem, QuoteStatus, QuoteTerms } from '../../lib/types';
import { tinhBaoGia } from '../../lib/manager-calculation';
import { dongBoCotLoiNhuan } from '../../lib/engine';
import { luuLocalStorage, LS_HISTORY } from '../helpers';

export interface HistorySlice {
  history: HistoryItem[];
  loadedHistoryId: string | null;

  addCurrentToHistory: () => void;
  removeHistoryItem: (id: string) => void;
  loadHistoryItem: (id: string) => void;
  setChotGiaForLatest: (giaTri: number) => void;
  updateQuoteStatus: (id: string, status: QuoteStatus) => void;
  themHienTaiVaoLichSu: () => void;

  saoChepBangTinh: (id: string) => void;
  khoaBaoGia: (id: string) => void;
  moKhoaBaoGia: (id: string) => void;
  huyBaoGia: (id: string) => void;
  kiemTraHetHan: () => void;
  capNhatDieuKhoan: (id: string, terms: QuoteTerms) => void;
  phanCongBaoGia: (quoteId: string, sellerId: string, sellerName: string) => void;
  ganTiersBaoGia: (quoteId: string, tiers: { historyItemId: string; quantity: number; finalPrice: number; chotGia?: number }[]) => void;
}

export const createHistorySlice: StateCreator<CuaHangTinhGia, [], [], HistorySlice> = (set, get) => ({
  history: [],
  loadedHistoryId: null,

  addCurrentToHistory: () => {
    set((state) => {
      if (!state.result) return state;
      const now = new Date();
      const quoteCode = state.taoMaBaoGia();
      const item: HistoryItem = {
        id: String(now.getTime()),
        date: now.toLocaleDateString('vi-VN'),
        customer: state.input.customer || 'N/A',
        productName: state.input.productName || 'N/A',
        structure: state.result.structureText,
        quantity: state.input.quantity,
        finalPrice: state.result.finalPrice,
        chotGia: state.currentChotGia || undefined,
        quoteStatus: 'drafted',
        quoteCode,
        sellerId: state.currentSellerId,
        sellerName: state.currentSellerName,
        saleOverrides: Object.keys(state.saleOverrides).length > 0 ? state.saleOverrides : undefined,
        adminOverrides: Object.keys(state.adminOverrides).length > 0 ? state.adminOverrides : undefined,
        input: { ...state.input },
      };
      const history = [item, ...state.history].slice(0, 200);
      luuLocalStorage(LS_HISTORY, history);

      setTimeout(() => {
        get().ghiNhatKy({
          userId: state.currentSellerId,
          userName: state.currentSellerName,
          action: 'create',
          targetType: 'history',
          targetId: item.id,
          targetName: item.productName,
        });
      }, 0);

      return { history, isDirty: false, loadedHistoryId: item.id };
    });
  },

  removeHistoryItem: (id) => {
    set((state) => {
      const item = state.history.find(h => h.id === id);
      const history = state.history.filter(h => h.id !== id);
      luuLocalStorage(LS_HISTORY, history);

      if (item) {
        setTimeout(() => {
          get().ghiNhatKy({
            userId: state.currentSellerId,
            userName: state.currentSellerName,
            action: 'delete',
            targetType: 'history',
            targetId: id,
            targetName: item.productName,
          });
        }, 0);
      }

      return { history };
    });
  },

  loadHistoryItem: (id) => {
    set((state) => {
      const item = state.history.find(h => h.id === id);
      if (!item) return state;
      return {
        dauVao: dongBoCotLoiNhuan({ ...item.input }, state.materials),
        input: dongBoCotLoiNhuan({ ...item.input }, state.materials),
        result: tinhBaoGia(dongBoCotLoiNhuan(item.input, state.materials), state.materials, state.constants, state.profitTable, state.smallWidthPrices),
        currentChotGia: item.chotGia || 0,
        activeView: 'manager' as const,
        isDirty: false,
        loadedHistoryId: item.id,
        saleOverrides: item.saleOverrides ?? {},
        adminOverrides: item.adminOverrides ?? {},
        showSaleOverrides: !!item.saleOverrides && Object.keys(item.saleOverrides).length > 0,
        showAdminOverrides: !!item.adminOverrides && Object.keys(item.adminOverrides).length > 0,
      };
    });
  },

  setChotGiaForLatest: (giaTri) => {
    set((state) => {
      if (!state.history.length) return state;
      const history = [...state.history];
      history[0] = { ...history[0], chotGia: giaTri };
      luuLocalStorage(LS_HISTORY, history);
      return { history };
    });
  },

  updateQuoteStatus: (id, status) => {
    set((state) => {
      const old = state.history.find(h => h.id === id);
      const history = state.history.map(h => h.id === id ? { ...h, quoteStatus: status } : h);
      luuLocalStorage(LS_HISTORY, history);

      if (old) {
        setTimeout(() => {
          get().luuPhienBan(id, `Trước đổi trạng thái → ${status}`);
          get().ghiNhatKy({
            userId: state.currentSellerId,
            userName: state.currentSellerName,
            action: 'status_change',
            targetType: 'quote',
            targetId: id,
            targetName: old.productName,
            before: { quoteStatus: old.quoteStatus },
            after: { quoteStatus: status },
          });
        }, 0);
      }

      return { history };
    });
  },

  themHienTaiVaoLichSu: () => get().addCurrentToHistory(),

  saoChepBangTinh: (id) => {
    set((state) => {
      const item = state.history.find(h => h.id === id);
      if (!item) return state;

      const now = new Date();
      const quoteCode = state.taoMaBaoGia();
      const clone: HistoryItem = {
        ...structuredClone(item),
        id: String(now.getTime()),
        date: now.toLocaleDateString('vi-VN'),
        quoteStatus: 'drafted',
        quoteCode,
        locked: false,
        lockedBy: undefined,
        lockedAt: undefined,
        sellerId: state.currentSellerId,
        sellerName: state.currentSellerName,
      };
      const history = [clone, ...state.history].slice(0, 200);
      luuLocalStorage(LS_HISTORY, history);

      setTimeout(() => {
        get().ghiNhatKy({
          userId: state.currentSellerId,
          userName: state.currentSellerName,
          action: 'duplicate',
          targetType: 'history',
          targetId: clone.id,
          targetName: clone.productName,
          note: `Sao chép từ ${item.quoteCode || item.id}`,
        });
      }, 0);

      return { history };
    });
  },

  khoaBaoGia: (id) => {
    set((state) => {
      const history = state.history.map(h => h.id === id
        ? { ...h, locked: true, lockedBy: state.currentSellerId, lockedAt: new Date().toISOString() }
        : h
      );
      luuLocalStorage(LS_HISTORY, history);
      const item = state.history.find(h => h.id === id);

      setTimeout(() => {
        get().ghiNhatKy({
          userId: state.currentSellerId,
          userName: state.currentSellerName,
          action: 'lock',
          targetType: 'quote',
          targetId: id,
          targetName: item?.productName,
        });
      }, 0);

      return { history };
    });
  },

  moKhoaBaoGia: (id) => {
    set((state) => {
      const history = state.history.map(h => h.id === id
        ? { ...h, locked: false, lockedBy: undefined, lockedAt: undefined }
        : h
      );
      luuLocalStorage(LS_HISTORY, history);
      const item = state.history.find(h => h.id === id);

      setTimeout(() => {
        get().ghiNhatKy({
          userId: state.currentSellerId,
          userName: state.currentSellerName,
          action: 'unlock',
          targetType: 'quote',
          targetId: id,
          targetName: item?.productName,
        });
      }, 0);

      return { history };
    });
  },

  huyBaoGia: (id) => {
    set((state) => {
      const old = state.history.find(h => h.id === id);
      const history = state.history.map(h => h.id === id ? { ...h, quoteStatus: 'cancelled' as QuoteStatus } : h);
      luuLocalStorage(LS_HISTORY, history);

      setTimeout(() => {
        get().ghiNhatKy({
          userId: state.currentSellerId,
          userName: state.currentSellerName,
          action: 'status_change',
          targetType: 'quote',
          targetId: id,
          targetName: old?.productName,
          before: { quoteStatus: old?.quoteStatus },
          after: { quoteStatus: 'cancelled' },
        });
      }, 0);

      return { history };
    });
  },

  kiemTraHetHan: () => {
    set((state) => {
      const now = Date.now();
      let changed = false;
      const history = state.history.map(h => {
        if (!h.validUntil) return h;
        if (h.quoteStatus === 'cancelled' || h.quoteStatus === 'expired' || h.quoteStatus === 'completed') return h;
        if (new Date(h.validUntil).getTime() < now) {
          changed = true;
          return { ...h, quoteStatus: 'expired' as QuoteStatus };
        }
        return h;
      });
      if (changed) {
        luuLocalStorage(LS_HISTORY, history);
        return { history };
      }
      return state;
    });
  },

  capNhatDieuKhoan: (id, terms) => {
    set((state) => {
      const validUntil = terms.validityDays > 0
        ? new Date(Date.now() + terms.validityDays * 86400000).toISOString()
        : undefined;
      const history = state.history.map(h => h.id === id ? { ...h, terms, validUntil } : h);
      luuLocalStorage(LS_HISTORY, history);

      const item = state.history.find(h => h.id === id);
      setTimeout(() => {
        get().luuPhienBan(id, 'Trước cập nhật điều khoản');
        get().ghiNhatKy({
          userId: state.currentSellerId,
          userName: state.currentSellerName,
          action: 'update',
          targetType: 'quote',
          targetId: id,
          targetName: item?.productName,
          after: { terms },
          note: 'Cập nhật điều khoản báo giá',
        });
      }, 0);

      return { history };
    });
  },

  phanCongBaoGia: (quoteId, sellerId, sellerName) => {
    set((state) => {
      const old = state.history.find(h => h.id === quoteId);
      const history = state.history.map(h => h.id === quoteId ? { ...h, sellerId, sellerName } : h);
      luuLocalStorage(LS_HISTORY, history);

      setTimeout(() => {
        get().ghiNhatKy({
          userId: state.currentSellerId,
          userName: state.currentSellerName,
          action: 'assign',
          targetType: 'quote',
          targetId: quoteId,
          targetName: old?.productName,
          before: { sellerId: old?.sellerId, sellerName: old?.sellerName },
          after: { sellerId, sellerName },
        });
      }, 0);

      return { history };
    });
  },

  ganTiersBaoGia: (quoteId, tiers) => {
    set((state) => {
      const history = state.history.map(h => h.id === quoteId ? { ...h, tiers } : h);
      luuLocalStorage(LS_HISTORY, history);
      return { history };
    });
  },
});
