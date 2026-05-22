import { create } from 'zustand';
import { createUISlice, UISlice } from './slices/ui';
import { createCalculationSlice, CalculationSlice } from './slices/calculation';
import { createHistorySlice, HistorySlice } from './slices/history';
import { createOverrideSlice, OverrideSlice } from './slices/overrides';
import { createProductionOrderSlice, ProductionOrderSlice } from './slices/production-orders';

export type CuaHangTinhGia = UISlice & CalculationSlice & HistorySlice & OverrideSlice & ProductionOrderSlice;

export const dungCuaHangTinhGia = create<CuaHangTinhGia>((...a) => ({
  ...createUISlice(...a),
  ...createCalculationSlice(...a),
  ...createHistorySlice(...a),
  ...createOverrideSlice(...a),
  ...createProductionOrderSlice(...a),
}));

export const useCalculatorStore = dungCuaHangTinhGia;
