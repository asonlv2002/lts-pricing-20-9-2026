import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { HistoryItem, QuoteStatus } from '../../lib/types';
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
}

export const createHistorySlice: StateCreator<CuaHangTinhGia, [], [], HistorySlice> = (set, get) => ({
  history: [],
  loadedHistoryId: null,

  addCurrentToHistory: () => {
    set((state) => {
      if (!state.result) return state;
      const now = new Date();
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
        sellerId: state.currentSellerId,
        sellerName: state.currentSellerName,
        saleOverrides: Object.keys(state.saleOverrides).length > 0 ? state.saleOverrides : undefined,
        adminOverrides: Object.keys(state.adminOverrides).length > 0 ? state.adminOverrides : undefined,
        input: { ...state.input },
      };
      const history = [item, ...state.history].slice(0, 200);
      luuLocalStorage(LS_HISTORY, history);
      return { history, isDirty: false, loadedHistoryId: item.id };
    });
  },

  removeHistoryItem: (id) => {
    set((state) => {
      const history = state.history.filter(h => h.id !== id);
      luuLocalStorage(LS_HISTORY, history);
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
      const history = state.history.map(h => h.id === id ? { ...h, quoteStatus: status } : h);
      luuLocalStorage(LS_HISTORY, history);
      return { history };
    });
  },

  themHienTaiVaoLichSu: () => get().addCurrentToHistory(),
});
