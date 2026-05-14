import { create } from 'zustand';
import { CalculateInput, HistoryItem, Material, AppConstants, ProfitRow, CalculateResult, QuoteStatus, OverrideTable, OverrideRowKey, OverrideFields, ProductionOrder } from '../lib/types';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE } from '../lib/data';
import { calculateMoqResult, calculateQuote, optimizeThickness } from '../lib/manager-calculation';

// ── LocalStorage keys ─────────────────────────────────────────────────────────
const LS_HISTORY  = 'lts_history';
const LS_CONFIG   = 'lts_material_config';
const LS_UI_PREFS = 'lts_ui_prefs';
const LS_LSX      = 'lts_production_orders';

function lsSet(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function luuConfigVaoLS(materials: Material[], constants: AppConstants, profitTable: ProfitRow[]) {
  lsSet(LS_CONFIG, {
    materials: materials.map(m => ({ id: m.id, thickness: m.thickness, pricePerKg: m.pricePerKg, inkPricePerColor: m.inkPricePerColor })),
    cpsx: {
      ghepCPSX: constants.ghepCPSX, laborCost: constants.laborCost,
      cutBase: constants.cutBase, cutThreshold1: constants.cutThreshold1, cutThreshold2: constants.cutThreshold2,
      cutMult1: constants.cutMult1, cutMult2: constants.cutMult2, cutMult3: constants.cutMult3,
      cylinderPricePerUnit: constants.cylinderPricePerUnit,
      nhuPrice: constants.nhuPrice, moPrice: constants.moPrice,
      zipperPrice: constants.zipperPrice, zipperWeight: constants.zipperWeight,
      tapePrice: constants.tapePrice, tapeWeight: constants.tapeWeight,
      handlePrice: constants.handlePrice, handleWeight: constants.handleWeight,
    },
    printWaste: { colorSetup: constants.colorSetup, A: constants.printWasteA, B: constants.printWasteB, C: constants.printWasteC, D: constants.printWasteD },
    profitTable: profitTable.map(r => ({ col1: r.col1, col2: r.col2 })),
  });
}

// ── State interface ───────────────────────────────────────────────────────────
export interface CuaHangTinhGia {
  // Data — giữ tên tiếng Anh gốc để các component không cần đổi
  input: CalculateInput;
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  result: CalculateResult | null;

  // UI State
  activeView: 'manager' | 'tech' | 'history' | 'config' | 'bento';
  activeModule: 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings' | 'users' | 'production_orders';
  layoutType: 'default' | 'stacked' | 'wide' | 'bento';
  density: 'compact' | 'comfortable' | 'spacious';
  theme: 'light' | 'dark';
  advancedOpen: boolean;
  currentChotGia: number;
  currentSellerId: string;
  currentSellerName: string;
  isDirty: boolean;
  history: HistoryItem[];
  loadedHistoryId: string | null;
  role: string;

  // Override tables
  saleOverrides: OverrideTable;
  adminOverrides: OverrideTable;
  showSaleOverrides: boolean;
  showAdminOverrides: boolean;

  // Production Orders
  productionOrders: ProductionOrder[];

  // ── Actions (tên tiếng Việt) ──────────────────────────────────────────────
  setActiveView: (v: 'manager' | 'tech' | 'history' | 'config' | 'bento') => void;
  setActiveModule: (v: 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings' | 'users' | 'production_orders') => void;
  setLayoutType: (v: 'default' | 'stacked' | 'wide' | 'bento') => void;
  setDensity: (v: 'compact' | 'comfortable' | 'spacious') => void;
  setTheme: (v: 'light' | 'dark') => void;
  setAdvancedOpen: (v: boolean) => void;
  setCurrentSeller: (id: string, name: string) => void;
  setRole: (r: string) => void;

  setInput: (partial: Partial<CalculateInput>) => void;
  resetInput: () => void;
  addCurrentToHistory: () => void;
  removeHistoryItem: (id: string) => void;
  loadHistoryItem: (id: string) => void;
  setChotGiaForLatest: (value: number) => void;
  setCurrentChotGia: (value: number) => void;
  updateQuoteStatus: (id: string, status: QuoteStatus) => void;
  setMaterialParam: (id: string, partial: Partial<Material>) => void;
  setConstantParam: (key: keyof AppConstants, val: any) => void;
  recalculate: () => void;
  calculateForInput: (input: CalculateInput) => CalculateResult | null;
  calculateForQuantity: (quantity: number) => CalculateResult | null;
  optimizeCurrentThickness: () => ReturnType<typeof optimizeThickness>;

  setSaleOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: number | undefined) => void;
  setAdminOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: number | undefined) => void;
  setShowSaleOverrides: (v: boolean) => void;
  setShowAdminOverrides: (v: boolean) => void;
  persistOverrides: (historyId: string) => void;

  themLSX: (order: ProductionOrder) => void;
  capNhatLSX: (id: string, patch: Partial<Pick<ProductionOrder, 'status' | 'manual'>>) => void;
  xoaLSX: (id: string) => void;
}

// ── Default input ─────────────────────────────────────────────────────────────
const defaultInput: CalculateInput = {
  customer: '', productName: '', productType: '', bagType: '', filmType: '',
  filmRollLength: 6000, quantity: 0, numColors: null, numImages: 1,
  layer1Id: null, layer2Id: null, layer2AltId: null, layer2Lengths: undefined, layer2FrontPart: 'main', layer2PairingMode: 'bottom_to_bottom', layer3Id: null, layer4Id: null, layer5Id: null,
  spreadWidth: 0, cutStep: 0, metallicSurcharge: 0, coverageRatio: 1,
  handleWeight: 0, zipperWeight: 0, tapeWeight: 0,
  hasZipper: false, hasTape: false, hasHandle: false,
  paymentDays: 30, profitColumn: 2,
  commissionRate: 0, commissionFixedVND: 0, commissionUnit: 'percent', commissionInputValue: 0,
  bagsPerBox: 0, boxPrice: 0, shippingPerKm: 0, shippingKm: 0,
  cylLength: 0, cylCircum: 0, cylUnitPrice: 7300000, cylType: 'A' as const, cylIncluded: false, targetThickness: 0, micOverrides: {},
};

// ── Store ─────────────────────────────────────────────────────────────────────
export const dungCuaHangTinhGia = create<CuaHangTinhGia>((set, get) => ({
  input: defaultInput,
  materials: INITIAL_MATERIALS,
  constants: INITIAL_CONSTANTS,
  profitTable: INITIAL_PROFIT_TABLE,
  result: calculateQuote(defaultInput, INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE),

  activeView: 'manager',
  activeModule: 'calculator',
  layoutType: 'default',
  density: 'comfortable',
  theme: 'light',
  advancedOpen: false,
  currentChotGia: 0,
  currentSellerId: 'S1',
  currentSellerName: 'Nguyễn Văn An',
  isDirty: false,
  history: [],
  loadedHistoryId: null,
  role: 'admin',

  saleOverrides: {},
  adminOverrides: {},
  showSaleOverrides: false,
  showAdminOverrides: false,

  productionOrders: [],

  // ── UI setters ────────────────────────────────────────────────────────────────
  setActiveView:    (v) => set({ activeView: v }),
  setActiveModule:  (v) => set({ activeModule: v }),
  setLayoutType:    (v) => set({ layoutType: v }),
  setDensity:       (v) => set({ density: v }),
  setTheme:         (v) => set({ theme: v }),
  setAdvancedOpen:  (v) => set({ advancedOpen: v }),
  setCurrentSeller: (id, name) => set({ currentSellerId: id, currentSellerName: name }),
  setRole:          (r) => set({ role: r }),

  // ── Input ─────────────────────────────────────────────────────────────────────
  setInput: (partial) => {
    set((state) => {
      const newInput = { ...state.input, ...partial };

      if ('spreadWidth' in partial || 'numImages' in partial) {
        const sw = newInput.spreadWidth || 0;
        const ni = newInput.numImages || 1;
        newInput.cylLength = sw > 0 ? Number(Math.max(0.7, sw * ni + 0.1).toFixed(3)) : 0;
      }

      if ('layer2Id' in partial && !newInput.layer2Id) {
        newInput.layer2AltId = null;
        newInput.layer2Lengths = undefined;
        newInput.layer2FrontPart = 'main';
        newInput.layer2PairingMode = 'bottom_to_bottom';
      }

      if ('cutStep' in partial) {
        const cs = newInput.cutStep || 0;
        if (cs > 0) {
          let N = 1;
          while (cs * N < 0.4) N++;
          newInput.cylCircum = Number((cs * N).toFixed(3));
        } else {
          newInput.cylCircum = 0;
        }
      }

      const activeLayers = [newInput.layer1Id, newInput.layer2Id, newInput.layer3Id, newInput.layer4Id, newInput.layer5Id].filter(Boolean);
      const hasMPETorAL = activeLayers.some((id: string | null | undefined) => id && (id.toUpperCase().includes('MPET') || id.toUpperCase().includes('AL')));
      newInput.profitColumn = (activeLayers.length >= 3 || hasMPETorAL || newInput.bagType === 'dayDung' || newInput.hasZipper) ? 2 : 1;

      newInput.metallicSurcharge = ((newInput as any).hasNhu ? state.constants.nhuPrice : 0)
        + ((newInput as any).hasMo ? state.constants.moPrice : 0);

      newInput.handleWeight = newInput.hasHandle ? state.constants.handleWeight : 0;
      newInput.zipperWeight = newInput.hasZipper ? state.constants.zipperWeight : 0;
      newInput.tapeWeight   = newInput.hasTape   ? state.constants.tapeWeight   : 0;

      // Tự cập nhật cylUnitPrice khi đổi loại trục (A/B tự lấy từ constants; custom giữ giá trị nhập tay)
      if ('cylType' in partial) {
        if (newInput.cylType === 'A') newInput.cylUnitPrice = state.constants.cylPriceA ?? state.constants.cylinderPricePerUnit;
        else if (newInput.cylType === 'B') newInput.cylUnitPrice = state.constants.cylPriceB ?? 6500000;
        // custom: giữ nguyên cylUnitPrice hiện tại
      }

      return { input: newInput, result: calculateQuote(newInput, state.materials, state.constants, state.profitTable), isDirty: true };
    });
  },

  resetInput: () => {
    set((state) => ({
      input: { ...defaultInput },
      result: calculateQuote(defaultInput, state.materials, state.constants, state.profitTable),
      currentChotGia: 0, isDirty: false,
      saleOverrides: {}, adminOverrides: {},
      showSaleOverrides: false, showAdminOverrides: false,
      loadedHistoryId: null,
    }));
  },

  // ── History ───────────────────────────────────────────────────────────────────
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
      lsSet(LS_HISTORY, history);
      return { history, isDirty: false, loadedHistoryId: item.id };
    });
  },

  removeHistoryItem: (id) => {
    set((state) => {
      const history = state.history.filter(h => h.id !== id);
      lsSet(LS_HISTORY, history);
      return { history };
    });
  },

  loadHistoryItem: (id) => {
    set((state) => {
      const item = state.history.find(h => h.id === id);
      if (!item) return state;
      return {
        input: { ...item.input },
        result: calculateQuote(item.input, state.materials, state.constants, state.profitTable),
        currentChotGia: item.chotGia || 0,
        activeView: 'manager',
        isDirty: false,
        loadedHistoryId: item.id,
        saleOverrides: item.saleOverrides ?? {},
        adminOverrides: item.adminOverrides ?? {},
        showSaleOverrides: !!item.saleOverrides && Object.keys(item.saleOverrides).length > 0,
        showAdminOverrides: !!item.adminOverrides && Object.keys(item.adminOverrides).length > 0,
      };
    });
  },

  setChotGiaForLatest: (value) => {
    set((state) => {
      if (!state.history.length) return state;
      const history = [...state.history];
      history[0] = { ...history[0], chotGia: value };
      lsSet(LS_HISTORY, history);
      return { history };
    });
  },

  setCurrentChotGia: (value) => set({ currentChotGia: value }),

  updateQuoteStatus: (id, status) => {
    set((state) => {
      const history = state.history.map(h => h.id === id ? { ...h, quoteStatus: status } : h);
      lsSet(LS_HISTORY, history);
      return { history };
    });
  },

  // ── Config ────────────────────────────────────────────────────────────────────
  setMaterialParam: (id, partial) => {
    set((state) => {
      const materials = state.materials.map(m => m.id === id
        ? { ...m, ...partial, pricePerM2: (partial.pricePerKg || m.pricePerKg) * (partial.thickness || m.thickness) * m.density / 1000 }
        : m
      );
      luuConfigVaoLS(materials, state.constants, state.profitTable);
      return { materials, result: calculateQuote(state.input, materials, state.constants, state.profitTable) };
    });
  },

  setConstantParam: (key, val) => {
    set((state) => {
      const constants = { ...state.constants, [key]: val };
      luuConfigVaoLS(state.materials, constants, state.profitTable);
      return { constants, result: calculateQuote(state.input, state.materials, constants, state.profitTable) };
    });
  },

  recalculate: () => {
    set((state) => ({ result: calculateQuote(state.input, state.materials, state.constants, state.profitTable) }));
  },

  calculateForInput: (input) => {
    const state = get();
    return calculateQuote(input, state.materials, state.constants, state.profitTable);
  },

  calculateForQuantity: (quantity) => {
    const state = get();
    return calculateMoqResult(state.input, quantity, state.materials, state.constants, state.profitTable);
  },

  optimizeCurrentThickness: () => {
    const state = get();
    return optimizeThickness(state.input, state.materials);
  },

  // ── Overrides ─────────────────────────────────────────────────────────────────
  setSaleOverride: (rowKey, field, value) => {
    set((state) => {
      const newOv = { ...state.saleOverrides };
      if (value === undefined) {
        if (newOv[rowKey]) {
          const { [field]: _, ...rest } = newOv[rowKey]!;
          if (Object.keys(rest).length === 0) delete newOv[rowKey];
          else newOv[rowKey] = rest;
        }
      } else {
        newOv[rowKey] = { ...newOv[rowKey], [field]: value };
      }
      return { saleOverrides: newOv };
    });
  },

  setAdminOverride: (rowKey, field, value) => {
    set((state) => {
      const newOv = { ...state.adminOverrides };
      if (value === undefined) {
        if (newOv[rowKey]) {
          const { [field]: _, ...rest } = newOv[rowKey]!;
          if (Object.keys(rest).length === 0) delete newOv[rowKey];
          else newOv[rowKey] = rest;
        }
      } else {
        newOv[rowKey] = { ...newOv[rowKey], [field]: value };
      }
      return { adminOverrides: newOv };
    });
  },

  setShowSaleOverrides:  (v) => set({ showSaleOverrides: v }),
  setShowAdminOverrides: (v) => set({ showAdminOverrides: v }),

  persistOverrides: (historyId) => {
    const { saleOverrides, adminOverrides, history } = get();
    const saleOv  = Object.keys(saleOverrides).length  > 0 ? saleOverrides  : undefined;
    const adminOv = Object.keys(adminOverrides).length > 0 ? adminOverrides : undefined;
    const updatedHistory = history.map(h =>
      h.id === historyId ? { ...h, saleOverrides: saleOv, adminOverrides: adminOv } : h
    );
    set({ history: updatedHistory });
    lsSet(LS_HISTORY, updatedHistory);
  },

  // ── Production Orders (localStorage only) ────────────────────────────────────
  themLSX: (order) => {
    set((state) => {
      const productionOrders = [order, ...state.productionOrders];
      lsSet(LS_LSX, productionOrders);
      return { productionOrders };
    });
  },

  capNhatLSX: (id, patch) => {
    set((state) => {
      const productionOrders = state.productionOrders.map(o => o.id === id ? { ...o, ...patch } : o);
      lsSet(LS_LSX, productionOrders);
      return { productionOrders };
    });
  },

  xoaLSX: (id) => {
    set((state) => {
      const productionOrders = state.productionOrders.filter(o => o.id !== id);
      lsSet(LS_LSX, productionOrders);
      return { productionOrders };
    });
  },
}));

// Backward compat alias
export const useCalculatorStore = dungCuaHangTinhGia;
