import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import type { QuoteCodeConfig } from '../../lib/types';
import { luuLocalStorage, LS_QUOTE_COUNTER } from '../helpers';

export interface QuoteCodeSlice {
  quoteCodeConfig: QuoteCodeConfig;

  taoMaBaoGia: () => string;
  datCauHinhMaBaoGia: (prefix: string) => void;
  taiQuoteCodeConfig: (data: QuoteCodeConfig) => void;
}

export const createQuoteCodeSlice: StateCreator<CuaHangTinhGia, [], [], QuoteCodeSlice> = (set, get) => ({
  quoteCodeConfig: { prefix: 'BG', currentMonth: '', counter: 0 },

  taoMaBaoGia: () => {
    const now = new Date();
    const thangHienTai = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    let config = get().quoteCodeConfig;
    if (config.currentMonth !== thangHienTai) {
      config = { ...config, currentMonth: thangHienTai, counter: 0 };
    }

    const counter = config.counter + 1;
    const newConfig: QuoteCodeConfig = { ...config, counter };
    set({ quoteCodeConfig: newConfig });
    luuLocalStorage(LS_QUOTE_COUNTER, newConfig);

    return `${newConfig.prefix}-${thangHienTai}-${String(counter).padStart(3, '0')}`;
  },

  datCauHinhMaBaoGia: (prefix) => {
    set((state) => {
      const newConfig = { ...state.quoteCodeConfig, prefix };
      luuLocalStorage(LS_QUOTE_COUNTER, newConfig);
      return { quoteCodeConfig: newConfig };
    });
  },

  taiQuoteCodeConfig: (data) => set({ quoteCodeConfig: data }),
});
