import { create } from 'zustand';
import { CalculateInput, HistoryItem, Material, AppConstants, ProfitRow, CalculateResult, QuoteStatus, OverrideTable, OverrideRowKey, OverrideFields } from '../lib/types';
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
  activeModule: 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings';
  layoutType: 'default' | 'stacked' | 'wide' | 'bento';
  density: 'compact' | 'comfortable' | 'spacious';
  theme: 'light' | 'dark';
  advancedOpen: boolean;
  currentChotGia: number;
  currentSellerId: string;    // id của user đang đăng nhập (tạm thời)
  currentSellerName: string;  // tên hiển thị
  isDirty: boolean;           // true khi form đã thay đổi nhưng chưa lưu vào history
  history: HistoryItem[];

  // Override tables (Bảng 2 & 3)
  saleOverrides: OverrideTable;
  adminOverrides: OverrideTable;
  showSaleOverrides: boolean;
  showAdminOverrides: boolean;
  loadedHistoryId: string | null;  // id của HistoryItem đang được load
  role: string;                    // synced từ AppShell

  // Trạng thái đồng bộ server
  serverSyncStatus: 'idle' | 'syncing' | 'error';

  setActiveView: (v: 'manager' | 'tech' | 'history' | 'config' | 'bento') => void;
  setActiveModule: (v: 'calculator' | 'quotations' | 'history_db' | 'master_data' | 'customers' | 'sellers' | 'settings') => void;
  setLayoutType: (v: 'default' | 'stacked' | 'wide' | 'bento') => void;
  setDensity: (v: 'compact' | 'comfortable' | 'spacious') => void;
  setTheme: (v: 'light' | 'dark') => void;
  setAdvancedOpen: (v: boolean) => void;
  setCurrentSeller: (id: string, name: string) => void;

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

  // Server-sync actions
  loadHistoryFromServer: () => Promise<void>;
  loadConfigFromServer: () => Promise<void>;
  persistMaterials: () => Promise<void>;
  persistConstants: () => Promise<void>;
  persistProfitTable: () => Promise<void>;

  // Override actions
  setSaleOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: number | undefined) => void;
  setAdminOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: number | undefined) => void;
  setShowSaleOverrides: (v: boolean) => void;
  setShowAdminOverrides: (v: boolean) => void;
  persistOverrides: (historyId: string) => void;
  setRole: (r: string) => void;
}

// ── Debounce helper (tránh gọi API mỗi keystroke) ─────────────────────────────
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
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

export const useCalculatorStore = create<CalculatorState>((set, get) => {

  // Debounced persist — tạo một lần khi khởi tạo store
  const debouncedPersistMaterials = debounce(async () => {
    await get().persistMaterials();
  }, 800);

  const debouncedPersistConstants = debounce(async () => {
    await get().persistConstants();
  }, 800);

  return {
    input: defaultInput,
    materials: INITIAL_MATERIALS,
    constants: INITIAL_CONSTANTS,
    profitTable: INITIAL_PROFIT_TABLE,
    result: calculate(defaultInput, INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE),

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
    // Khởi đầu rỗng — hydrate từ server hoặc localStorage khi page mount
    history: [],
    serverSyncStatus: 'idle',

    // Override tables
    saleOverrides: {},
    adminOverrides: {},
    showSaleOverrides: false,
    showAdminOverrides: false,
    loadedHistoryId: null,
    role: 'admin',

    setActiveView: (v) => set({ activeView: v }),
    setActiveModule: (v) => set({ activeModule: v }),
    setLayoutType: (v) => set({ layoutType: v }),
    setDensity: (v) => set({ density: v }),
    setTheme: (v) => set({ theme: v }),
    setAdvancedOpen: (v) => set({ advancedOpen: v }),
    setCurrentSeller: (id, name) => set({ currentSellerId: id, currentSellerName: name }),

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

        return { input: newInput, result: calculate(newInput, state.materials, state.constants, state.profitTable), isDirty: true };
      });
    },

    resetInput: () => {
      set((state) => ({
        input: { ...defaultInput },
        result: calculate(defaultInput, state.materials, state.constants, state.profitTable),
        currentChotGia: 0,
        isDirty: false,
        saleOverrides: {},
        adminOverrides: {},
        showSaleOverrides: false,
        showAdminOverrides: false,
        loadedHistoryId: null,
      }));
    },

    // ── History mutations ─────────────────────────────────────────────────────

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
          quoteStatus: 'drafted',       // Luôn bắt đầu ở trạng thái "Đã lập"
          sellerId: state.currentSellerId,
          sellerName: state.currentSellerName,
          saleOverrides: Object.keys(state.saleOverrides).length > 0 ? state.saleOverrides : undefined,
          adminOverrides: Object.keys(state.adminOverrides).length > 0 ? state.adminOverrides : undefined,
          input: { ...state.input },
        };
        const history = [item, ...state.history].slice(0, 200);

        // 1. Cập nhật localStorage ngay lập tức (offline fallback)
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('lts_history', JSON.stringify(history)); } catch { /* quota */ }
        }

        // 2. Ghi lên server (fire-and-forget)
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }).catch(err => console.warn('[history] Server persist failed:', err));

        return { history, isDirty: false, loadedHistoryId: item.id };
      });
    },

    removeHistoryItem: (id) => {
      set((state) => {
        const history = state.history.filter((h) => h.id !== id);

        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('lts_history', JSON.stringify(history)); } catch { /* quota */ }
        }

        fetch(`/api/history/${id}`, { method: 'DELETE' })
          .catch(err => console.warn('[history] Server delete failed:', err));

        return { history };
      });
    },

    loadHistoryItem: (id) => {
      set((state) => {
        const item = state.history.find((h) => h.id === id);
        if (!item) return state;
        const hasSaleOv = !!item.saleOverrides && Object.keys(item.saleOverrides).length > 0;
        const hasAdminOv = !!item.adminOverrides && Object.keys(item.adminOverrides).length > 0;
        return {
          input: { ...item.input },
          result: calculate(item.input, state.materials, state.constants, state.profitTable),
          currentChotGia: item.chotGia || 0,
          activeView: 'manager',
          isDirty: false,
          loadedHistoryId: item.id,
          saleOverrides: item.saleOverrides ?? {},
          adminOverrides: item.adminOverrides ?? {},
          showSaleOverrides: hasSaleOv,
          showAdminOverrides: hasAdminOv,
        };
      });
    },

    setChotGiaForLatest: (value) => {
      set((state) => {
        if (!state.history.length) return state;
        const history = [...state.history];
        const latest = { ...history[0], chotGia: value };
        history[0] = latest;

        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('lts_history', JSON.stringify(history)); } catch { /* quota */ }
        }

        fetch(`/api/history/${latest.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chotGia: value }),
        }).catch(err => console.warn('[history] Server patch failed:', err));

        return { history };
      });
    },

    setCurrentChotGia: (value) => set({ currentChotGia: value }),

    updateQuoteStatus: (id, status) => {
      set((state) => {
        const history = state.history.map(h =>
          h.id === id ? { ...h, quoteStatus: status } : h
        );
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem('lts_history', JSON.stringify(history)); } catch { /* quota */ }
        }
        // Fire-and-forget PATCH lên server khi có backend
        fetch(`/api/history/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteStatus: status }),
        }).catch(() => { /* offline ok */ });
        return { history };
      });
    },

    // ── Config mutations (với debounced server persist) ────────────────────────

    setMaterialParam: (id, partial) => {
      set((state) => {
        const newMats = state.materials.map(m => m.id === id
          ? { ...m, ...partial, pricePerM2: (partial.pricePerKg || m.pricePerKg) * (partial.thickness || m.thickness) * m.density / 1000 }
          : m
        );
        return { materials: newMats, result: calculate(state.input, newMats, state.constants, state.profitTable) };
      });
      debouncedPersistMaterials();
    },

    setConstantParam: (key, val) => {
      set((state) => {
        const newConst = { ...state.constants, [key]: val };
        return { constants: newConst, result: calculate(state.input, state.materials, newConst, state.profitTable) };
      });
      debouncedPersistConstants();
    },

    recalculate: () => {
      set((state) => ({ result: calculate(state.input, state.materials, state.constants, state.profitTable) }));
    },

    // ── Override actions ─────────────────────────────────────────────────────

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

    setShowSaleOverrides: (v) => set({ showSaleOverrides: v }),
    setShowAdminOverrides: (v) => set({ showAdminOverrides: v }),
    setRole: (r) => set({ role: r }),

    persistOverrides: (historyId) => {
      const { saleOverrides, adminOverrides, history } = get();
      const saleOv = Object.keys(saleOverrides).length > 0 ? saleOverrides : undefined;
      const adminOv = Object.keys(adminOverrides).length > 0 ? adminOverrides : undefined;
      const updatedHistory = history.map(h =>
        h.id === historyId ? { ...h, saleOverrides: saleOv, adminOverrides: adminOv } : h
      );
      set({ history: updatedHistory });
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem('lts_history', JSON.stringify(updatedHistory)); } catch { /* quota */ }
      }
      fetch(`/api/history/${historyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleOverrides: saleOv, adminOverrides: adminOv }),
      }).catch(err => console.warn('[overrides] Server persist failed:', err));
    },

    // ── Server-sync actions ───────────────────────────────────────────────────

    loadHistoryFromServer: async () => {
      try {
        const res = await fetch('/api/history');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { success: boolean; data: HistoryItem[] };
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          // Backfill: item cũ trên server chưa có quoteStatus → gán 'drafted'
          const patched = json.data.map(h => ({
            ...h,
            quoteStatus: h.quoteStatus ?? 'drafted' as QuoteStatus,
          }));
          set({ history: patched });
          // Cập nhật localStorage cache để hoạt động offline
          if (typeof window !== 'undefined') {
            try { window.localStorage.setItem('lts_history', JSON.stringify(patched)); } catch { /* quota */ }
          }
        }
      } catch (err) {
        console.warn('[history] Could not load from server, giữ nguyên local state:', err);
      }
    },

    loadConfigFromServer: async () => {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as {
          success: boolean;
          data: {
            materials: Material[];
            constants: AppConstants;
            profitTable: ProfitRow[];
          };
        };
        if (json.success && json.data) {
          const { materials, constants, profitTable } = json.data;
          set((state) => ({
            materials,
            constants,
            profitTable,
            result: calculate(state.input, materials, constants, profitTable),
          }));
          // Cập nhật localStorage config cache (offline fallback)
          if (typeof window !== 'undefined') {
            try {
              const configCache = {
                materials: materials.map(m => ({
                  id: m.id,
                  thickness: m.thickness,
                  pricePerKg: m.pricePerKg,
                  inkPricePerColor: m.inkPricePerColor,
                })),
                cpsx: {
                  ghepCPSX: constants.ghepCPSX,
                  laborCost: constants.laborCost,
                  cutBase: constants.cutBase,
                  cutThreshold1: constants.cutThreshold1,
                  cutThreshold2: constants.cutThreshold2,
                  cutMult1: constants.cutMult1,
                  cutMult2: constants.cutMult2,
                  cutMult3: constants.cutMult3,
                  cylinderPricePerUnit: constants.cylinderPricePerUnit,
                  nhuPrice: constants.nhuPrice,
                  moPrice: constants.moPrice,
                  zipperPrice: constants.zipperPrice,
                  zipperWeight: constants.zipperWeight,
                  tapePrice: constants.tapePrice,
                  tapeWeight: constants.tapeWeight,
                  handlePrice: constants.handlePrice,
                  handleWeight: constants.handleWeight,
                },
                printWaste: {
                  colorSetup: constants.colorSetup,
                  A: constants.printWasteA,
                  B: constants.printWasteB,
                  C: constants.printWasteC,
                  D: constants.printWasteD,
                },
                profitTable: profitTable.map(row => ({ col1: row.col1, col2: row.col2 })),
              };
              window.localStorage.setItem('lts_material_config', JSON.stringify(configCache));
            } catch { /* quota */ }
          }
        }
      } catch (err) {
        console.warn('[config] Could not load from server, giữ nguyên local state:', err);
      }
    },

    persistMaterials: async () => {
      const { materials } = get();
      try {
        await fetch('/api/config/materials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            materials.map(m => ({
              id: m.id,
              thickness: m.thickness,
              pricePerKg: m.pricePerKg,
              inkPricePerColor: m.inkPricePerColor,
            }))
          ),
        });
      } catch (err) {
        console.warn('[materials] Server persist failed:', err);
      }
    },

    persistConstants: async () => {
      const { constants } = get();
      try {
        await fetch('/api/config/constants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(constants),
        });
      } catch (err) {
        console.warn('[constants] Server persist failed:', err);
      }
    },

    persistProfitTable: async () => {
      const { profitTable } = get();
      try {
        await fetch('/api/config/profit-table', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: profitTable }),
        });
      } catch (err) {
        console.warn('[profitTable] Server persist failed:', err);
      }
    },
  };
});
