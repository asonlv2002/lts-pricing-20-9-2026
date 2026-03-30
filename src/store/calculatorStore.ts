import { create } from 'zustand';
import { CalculateInput, Material, AppConstants, ProfitRow, CalculateResult } from '../lib/types';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE } from '../lib/data';
import { calculate } from '../lib/engine';

export interface CalculatorState {
  input: CalculateInput;
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  result: CalculateResult | null;
  
  // UI State
  activeView: 'manager' | 'tech' | 'history' | 'config' | 'bento';
  layoutType: 'default' | 'stacked' | 'wide' | 'bento';
  density: 'compact' | 'comfortable' | 'spacious';
  theme: 'light' | 'dark';
  advancedOpen: boolean;
  currentChotGia: number;
  history: Array<{
    id: string;
    date: string;
    customer: string;
    productName: string;
    structure: string;
    quantity: number;
    finalPrice: number;
    chotGia?: number;
    input: CalculateInput;
  }>;

  setActiveView: (v: 'manager' | 'tech' | 'history' | 'config' | 'bento') => void;
  setLayoutType: (v: 'default' | 'stacked' | 'wide' | 'bento') => void;
  setDensity: (v: 'compact' | 'comfortable' | 'spacious') => void;
  setTheme: (v: 'light' | 'dark') => void;
  setAdvancedOpen: (v: boolean) => void;
  
  setInput: (partial: Partial<CalculateInput>) => void;
  resetInput: () => void;
  addCurrentToHistory: () => void;
  removeHistoryItem: (id: string) => void;
  loadHistoryItem: (id: string) => void;
  setChotGiaForLatest: (value: number) => void;
  setCurrentChotGia: (value: number) => void;
  setMaterialParam: (id: string, partial: Partial<Material>) => void;
  setConstantParam: (key: keyof AppConstants, val: any) => void;
  recalculate: () => void;
}

const defaultInput: CalculateInput = {
  customer: '',
  productName: '',
  productType: '',
  bagType: '',
  filmType: '',
  quantity: 0,
  numColors: null,
  numImages: 1,
  layer1Id: null,
  layer2Id: null,
  layer3Id: null,
  layer4Id: null,
  layer5Id: null,
  spreadWidth: 0,
  cutStep: 0,
  metallicSurcharge: 0,
  coverageRatio: 1,
  handleWeight: 0,
  zipperWeight: 0,
  tapeWeight: 0,
  hasZipper: false,
  hasTape: false,
  hasHandle: false,
  paymentDays: 30,
  paymentInterestRate: 0.0025,
  profitColumn: 2,
  commissionRate: 0,
  commissionFixedVND: 0,
  commissionUnit: 'percent',
  commissionInputValue: 0,
  bagsPerBox: 0,
  boxPrice: 0,
  shippingPerKm: 0,
  shippingKm: 0,
  cylLength: 0,
  cylCircum: 0,
  cylUnitPrice: 7300000,
  micOverrides: {},
};

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  input: defaultInput,
  materials: INITIAL_MATERIALS,
  constants: INITIAL_CONSTANTS,
  profitTable: INITIAL_PROFIT_TABLE,
  // We compute the initial result immediately
  result: calculate(defaultInput, INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE),

  activeView: 'manager',
  layoutType: 'default',
  density: 'comfortable',
  theme: 'light',
  advancedOpen: false,
  currentChotGia: 0,
  history: [],

  setActiveView: (v) => set({ activeView: v }),
  setLayoutType: (v) => set({ layoutType: v }),
  setDensity: (v) => set({ density: v }),
  setTheme: (v) => set({ theme: v }),
  setAdvancedOpen: (v) => set({ advancedOpen: v }),

  setInput: (partial) => {
    set((state) => {
      const newInput = { ...state.input, ...partial };
      
      // Auto-calculate Cylinder Size if spreadWidth, cutStep or numImages changed
      if ('spreadWidth' in partial || 'numImages' in partial) {
        const sw = newInput.spreadWidth || 0;
        const ni = newInput.numImages || 1;
        if (sw > 0) {
          const base = sw * ni;
          let nCalc = 1;
          while (base * nCalc + 0.1 < 0.7) nCalc++;
          newInput.cylLength = Number((base * nCalc + 0.1).toFixed(3));
        } else {
          newInput.cylLength = 0;
        }
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

      // Auto-calculate profitColumn based on business logic
      const activeLayers = [newInput.layer1Id, newInput.layer2Id, newInput.layer3Id, newInput.layer4Id, newInput.layer5Id].filter(Boolean);
      const numLayers = activeLayers.length;
      const hasMPETorAL = activeLayers.some((id: string | null | undefined) => id && (id.toUpperCase().includes('MPET') || id.toUpperCase().includes('AL')));
      newInput.profitColumn = (numLayers >= 3 || hasMPETorAL || newInput.bagType === 'dayDung' || newInput.hasZipper) ? 2 : 1;

      // Auto-compute metallicSurcharge from hasNhu/hasMo checkboxes
      newInput.metallicSurcharge = ((newInput as any).hasNhu ? state.constants.nhuPrice : 0) 
        + ((newInput as any).hasMo ? state.constants.moPrice : 0);

      // Auto-assign accessory weights from constants when checkbox is toggled
      newInput.handleWeight = newInput.hasHandle ? state.constants.handleWeight : 0;
      newInput.zipperWeight = newInput.hasZipper ? state.constants.zipperWeight : 0;
      newInput.tapeWeight = newInput.hasTape ? state.constants.tapeWeight : 0;

      return { input: newInput, result: calculate(newInput, state.materials, state.constants, state.profitTable) };
    });
  },
  resetInput: () => {
    set((state) => ({
      input: { ...defaultInput },
      result: calculate(defaultInput, state.materials, state.constants, state.profitTable),
      currentChotGia: 0,
    }));
  },
  addCurrentToHistory: () => {
    set((state) => {
      if (!state.result) return state;
      const now = new Date();
      const item = {
        id: String(now.getTime()),
        date: now.toLocaleDateString('vi-VN'),
        customer: state.input.customer || 'N/A',
        productName: state.input.productName || 'N/A',
        structure: state.result.structureText,
        quantity: state.input.quantity,
        finalPrice: state.result.finalPrice,
        chotGia: state.currentChotGia || undefined,
        input: { ...state.input },
      };
      const history = [item, ...state.history].slice(0, 50);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lts_history', JSON.stringify(history));
      }
      return { history };
    });
  },
  removeHistoryItem: (id) => {
    set((state) => {
      const history = state.history.filter((h) => h.id !== id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lts_history', JSON.stringify(history));
      }
      return { history };
    });
  },
  loadHistoryItem: (id) => {
    set((state) => {
      const item = state.history.find((h) => h.id === id);
      if (!item) return state;
      return {
        input: { ...item.input },
        result: calculate(item.input, state.materials, state.constants, state.profitTable),
        currentChotGia: item.chotGia || 0,
        activeView: 'manager',
      };
    });
  },
  setChotGiaForLatest: (value) => {
    set((state) => {
      if (!state.history.length) return state;
      const history = [...state.history];
      history[0] = { ...history[0], chotGia: value };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lts_history', JSON.stringify(history));
      }
      return { history };
    });
  },
  setCurrentChotGia: (value) => set({ currentChotGia: value }),

  setMaterialParam: (id, partial) => {
    set((state) => {
      const newMats = state.materials.map(m => m.id === id ? { ...m, ...partial, pricePerM2: (partial.pricePerKg || m.pricePerKg) * (partial.thickness || m.thickness) * m.density / 1000 } : m);
      return { materials: newMats, result: calculate(state.input, newMats, state.constants, state.profitTable) };
    });
  },

  setConstantParam: (key, val) => {
    set((state) => {
      const newConst = { ...state.constants, [key]: val };
      return { constants: newConst, result: calculate(state.input, state.materials, newConst, state.profitTable) };
    });
  },

  recalculate: () => {
    set((state) => ({ result: calculate(state.input, state.materials, state.constants, state.profitTable) }));
  }
}));
