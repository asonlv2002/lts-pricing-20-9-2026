import { create } from 'zustand';
import { createUISlice, UISlice } from './slices/ui';
import { createCalculationSlice, CalculationSlice } from './slices/calculation';
import { createHistorySlice, HistorySlice } from './slices/history';
import { createOverrideSlice, OverrideSlice } from './slices/overrides';
import { createProductionOrderSlice, ProductionOrderSlice } from './slices/production-orders';
import { createAuditSlice, AuditSlice } from './slices/audit';
import { createVersioningSlice, VersioningSlice } from './slices/versioning';
import { createConfigVersioningSlice, ConfigVersioningSlice } from './slices/configVersioning';
import { createQuoteCodeSlice, QuoteCodeSlice } from './slices/quote-code';
import { createOrdersCacheSlice, OrdersCacheSlice } from './slices/orders-cache';
import { createAuthSlice, AuthSlice } from './slices/auth';
import { createSystemMetricsSlice, SystemMetricsSlice } from './slices/system-metrics';

export type CuaHangTinhGia = UISlice & CalculationSlice & HistorySlice & OverrideSlice & ProductionOrderSlice & AuditSlice & VersioningSlice & ConfigVersioningSlice & QuoteCodeSlice & OrdersCacheSlice & AuthSlice & SystemMetricsSlice;

export const dungCuaHangTinhGia = create<CuaHangTinhGia>((...a) => ({
  ...createUISlice(...a),
  ...createCalculationSlice(...a),
  ...createHistorySlice(...a),
  ...createOverrideSlice(...a),
  ...createProductionOrderSlice(...a),
  ...createAuditSlice(...a),
  ...createVersioningSlice(...a),
  ...createConfigVersioningSlice(...a),
  ...createQuoteCodeSlice(...a),
  ...createOrdersCacheSlice(...a),
  ...createAuthSlice(...a),
  ...createSystemMetricsSlice(...a),
}));

export const useCalculatorStore = dungCuaHangTinhGia;

/** Debug / Playwright — đọc store live */
if (typeof window !== 'undefined') {
  (window as unknown as { __LTS_STORE__?: typeof dungCuaHangTinhGia }).__LTS_STORE__ =
    dungCuaHangTinhGia;
}
