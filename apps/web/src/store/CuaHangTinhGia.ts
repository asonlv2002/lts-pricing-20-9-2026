import { create } from 'zustand';
import { createUISlice, UISlice } from './slices/ui';
import { createCalculationSlice, CalculationSlice } from './slices/calculation';
import { createHistorySlice, HistorySlice } from './slices/history';
import { createOverrideSlice, OverrideSlice } from './slices/overrides';
import { createProductionOrderSlice, ProductionOrderSlice } from './slices/production-orders';
import { createAuditSlice, AuditSlice } from './slices/audit';
import { createVersioningSlice, VersioningSlice } from './slices/versioning';
import { createQuoteCodeSlice, QuoteCodeSlice } from './slices/quote-code';

export type CuaHangTinhGia = UISlice & CalculationSlice & HistorySlice & OverrideSlice & ProductionOrderSlice & AuditSlice & VersioningSlice & QuoteCodeSlice;

export const dungCuaHangTinhGia = create<CuaHangTinhGia>((...a) => ({
  ...createUISlice(...a),
  ...createCalculationSlice(...a),
  ...createHistorySlice(...a),
  ...createOverrideSlice(...a),
  ...createProductionOrderSlice(...a),
  ...createAuditSlice(...a),
  ...createVersioningSlice(...a),
  ...createQuoteCodeSlice(...a),
}));

export const useCalculatorStore = dungCuaHangTinhGia;
