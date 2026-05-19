import { create } from 'zustand';
import { CalculateInput, HistoryItem, Material, AppConstants, ProfitRow, CalculateResult, QuoteStatus, OverrideTable, OverrideRowKey, OverrideFields, ProductionOrder, SmallWidthMaterialPrice } from '../lib/types';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE, INITIAL_SMALL_WIDTH_PRICES } from '../lib/data';
import { tinhKetQuaMoq, tinhBaoGia, toiUuDoDayTheoVatLieu } from '../lib/manager-calculation';

// ── LocalStorage keys ─────────────────────────────────────────────────────────
const LS_HISTORY  = 'lts_history';
const LS_CONFIG   = 'lts_material_config';
const LS_UI_PREFS = 'lts_ui_prefs';
const LS_LSX      = 'lts_production_orders';

function luuLocalStorage(key: string, giaTri: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(giaTri)); } catch { /* quota */ }
}

function luuConfigVaoLS(materials: Material[], constants: AppConstants, profitTable: ProfitRow[], bangGiaKhoNho: SmallWidthMaterialPrice[]) {
  luuLocalStorage(LS_CONFIG, {
    materials: materials.map(m => ({ id: m.id, thickness: m.thickness, pricePerKg: m.pricePerKg, inkPricePerColor: m.inkPricePerColor })),
    smallWidthPrices: bangGiaKhoNho.map(p => ({ id: p.id, materialId: p.materialId, widthThresholdMm: p.widthThresholdMm, pricePerKg: p.pricePerKg })),
    cpsx: {
      ghepCPSX: constants.ghepCPSX, laborCost: constants.laborCost,
      cutBase: constants.cutBase, cutThreshold1: constants.cutThreshold1, cutThreshold2: constants.cutThreshold2,
      cutMult1: constants.cutMult1, cutMult2: constants.cutMult2, cutMult3: constants.cutMult3,
      cylinderPricePerUnit: constants.cylinderPricePerUnit,
      nhuPrice: constants.nhuPrice, moPrice: constants.moPrice,
      zipperPrice: constants.zipperPrice, zipperWeight: constants.zipperWeight,
      tapePrice: constants.tapePrice, tapeWeight: constants.tapeWeight,
      handlePrice: constants.handlePrice, handleWeight: constants.handleWeight, handleOptions: constants.handleOptions,
    },
    packaging: {
      boxOptions: constants.boxOptions,
      boxPriceDefault: constants.boxPriceDefault,
      bagsPerBoxDefault: constants.bagsPerBoxDefault,
    },
    printWaste: { colorSetup: constants.colorSetup, A: constants.printWasteA, B: constants.printWasteB, C: constants.printWasteC, D: constants.printWasteD },
    profitTable: profitTable.map(r => ({ col1: r.col1, col2: r.col2 })),
  });
}

// ── State interface ───────────────────────────────────────────────────────────
export interface CuaHangTinhGia {
  // Data — giữ tên tiếng Anh gốc để các component không cần đổi
  dauVao: CalculateInput;
  input: CalculateInput;
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
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

  // Small Width Prices

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
  setChotGiaForLatest: (giaTri: number) => void;
  setCurrentChotGia: (giaTri: number) => void;
  updateQuoteStatus: (id: string, status: QuoteStatus) => void;
  setMaterialParam: (id: string, partial: Partial<Material>) => void;
  setConstantParam: (key: keyof AppConstants, val: any) => void;
  recalculate: () => void;
  calculateForInput: (input: CalculateInput) => CalculateResult | null;
  calculateForQuantity: (quantity: number) => CalculateResult | null;
  optimizeCurrentThickness: () => ReturnType<typeof toiUuDoDayTheoVatLieu>;

  setSaleOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: number | undefined) => void;
  setAdminOverride: (rowKey: OverrideRowKey, field: keyof OverrideFields, value: number | undefined) => void;
  setShowSaleOverrides: (v: boolean) => void;
  setShowAdminOverrides: (v: boolean) => void;
  persistOverrides: (historyId: string) => void;

  setSmallWidthPriceParam: (id: string, partial: Partial<SmallWidthMaterialPrice>) => void;


  datManHinhDangMo: CuaHangTinhGia['setActiveView'];
  datPhanHeDangMo: CuaHangTinhGia['setActiveModule'];
  datDauVao: CuaHangTinhGia['setInput'];
  datLaiDauVao: CuaHangTinhGia['resetInput'];
  themHienTaiVaoLichSu: CuaHangTinhGia['addCurrentToHistory'];
  tinhLai: CuaHangTinhGia['recalculate'];
  tinhTheoDauVao: CuaHangTinhGia['calculateForInput'];
  tinhTheoSoLuong: CuaHangTinhGia['calculateForQuantity'];
  toiUuDoDayHienTai: CuaHangTinhGia['optimizeCurrentThickness'];

  themLSX: (lenh: ProductionOrder) => void;
  capNhatLSX: (id: string, patch: Partial<Pick<ProductionOrder, 'status' | 'manual'>>) => void;
  xoaLSX: (id: string) => void;
}

// ── Default input ─────────────────────────────────────────────────────────────
const dauVaoMacDinh: CalculateInput = {
  customer: '', productName: '', productType: '', bagType: '', filmType: '',
  filmQuantityUnit: 'm2', filmInputQuantity: 0, filmRollLength: 6000, quantity: 0, numColors: null, numImages: 1,
  layer1Id: null, layer2Id: null, layer2AltId: null, layer2Lengths: undefined, layer2FrontPart: 'main', layer2PairingMode: 'bottom_to_bottom', layer3Id: null, layer4Id: null, layer5Id: null,
  spreadWidth: 0, cutStep: 0, metallicSurcharge: 0, coverageRatio: 1,
  handleWeight: 0, zipperWeight: 0, tapeWeight: 0,
  hasZipper: false, hasTape: false, hasHandle: false, handleOptionKey: null,
  paymentDays: 30, profitColumn: 2,
  commissionRate: 0, commissionFixedVND: 0, commissionUnit: 'percent', commissionInputValue: 0,
  bagsPerBox: 0, boxPrice: 0, boxOptionKey: null, shippingPerKm: 0, shippingKm: 0,
  cylLength: 0, cylCircum: 0, cylUnitPrice: 7300000, cylType: 'A' as const, cylIncluded: false, targetThickness: 0, micOverrides: {},
};

// ── Store ─────────────────────────────────────────────────────────────────────
export const dungCuaHangTinhGia = create<CuaHangTinhGia>((set, get) => ({
  dauVao: dauVaoMacDinh,
  input: dauVaoMacDinh,
  materials: INITIAL_MATERIALS,
  constants: INITIAL_CONSTANTS,
  profitTable: INITIAL_PROFIT_TABLE,
  smallWidthPrices: INITIAL_SMALL_WIDTH_PRICES,
  result: tinhBaoGia(dauVaoMacDinh, INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE, INITIAL_SMALL_WIDTH_PRICES),

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

  datManHinhDangMo: (v) => get().setActiveView(v),
  datPhanHeDangMo: (v) => get().setActiveModule(v),
  datDauVao: (partial) => get().setInput(partial),
  datLaiDauVao: () => get().resetInput(),
  themHienTaiVaoLichSu: () => get().addCurrentToHistory(),
  tinhLai: () => get().recalculate(),
  tinhTheoDauVao: (input) => get().calculateForInput(input),
  tinhTheoSoLuong: (soLuong) => get().calculateForQuantity(soLuong),
  toiUuDoDayHienTai: () => get().optimizeCurrentThickness(),

  // ── Input ─────────────────────────────────────────────────────────────────────
  setInput: (partial) => {
    set((state) => {
      const dauVaoMoi = { ...state.input, ...partial };

      if ('spreadWidth' in partial || 'numImages' in partial) {
        const khoTrai = dauVaoMoi.spreadWidth || 0;
        const soHinh = dauVaoMoi.numImages || 1;
        dauVaoMoi.cylLength = khoTrai > 0 ? Number(Math.max(0.7, khoTrai * soHinh + 0.1).toFixed(3)) : 0;
      }

      // Màng: user nhập m² hoặc mét dài; engine luôn tính theo quantity = m².
      if (dauVaoMoi.productType === 'mang' && (
        'filmInputQuantity' in partial || 'filmQuantityUnit' in partial ||
        'spreadWidth' in partial || 'productType' in partial
      )) {
        const slGoc = dauVaoMoi.filmInputQuantity ?? dauVaoMoi.quantity ?? 0;
        dauVaoMoi.filmInputQuantity = slGoc;
        dauVaoMoi.quantity = dauVaoMoi.filmQuantityUnit === 'meter'
          ? Number((slGoc * (dauVaoMoi.spreadWidth || 0)).toFixed(3))
          : slGoc;
      }

      if ('layer2Id' in partial && !dauVaoMoi.layer2Id) {
        dauVaoMoi.layer2AltId = null;
        dauVaoMoi.layer2Lengths = undefined;
        dauVaoMoi.layer2FrontPart = 'main';
        dauVaoMoi.layer2PairingMode = 'bottom_to_bottom';
      }

      if ('cutStep' in partial) {
        const buocCat = dauVaoMoi.cutStep || 0;
        if (buocCat > 0) {
          let N = 1;
          while (buocCat * N < 0.4) N++;
          dauVaoMoi.cylCircum = Number((buocCat * N).toFixed(3));
        } else {
          dauVaoMoi.cylCircum = 0;
        }
      }

      const cacLopDangDung = [dauVaoMoi.layer1Id, dauVaoMoi.layer2Id, dauVaoMoi.layer3Id, dauVaoMoi.layer4Id, dauVaoMoi.layer5Id].filter(Boolean);
      const coMPETHoacAL = cacLopDangDung.some((id: string | null | undefined) => id && (id.toUpperCase().includes('MPET') || id.toUpperCase().includes('AL')));
      dauVaoMoi.profitColumn = (cacLopDangDung.length >= 3 || coMPETHoacAL || dauVaoMoi.bagType === 'dayDung' || dauVaoMoi.hasZipper) ? 2 : 1;

      dauVaoMoi.metallicSurcharge = ((dauVaoMoi as any).hasNhu ? state.constants.nhuPrice : 0)
        + ((dauVaoMoi as any).hasMo ? state.constants.moPrice : 0);

      const luaChonQuai = state.constants.handleOptions?.find(o => o.key === dauVaoMoi.handleOptionKey);
      if (dauVaoMoi.hasHandle && luaChonQuai) {
        dauVaoMoi.handleWeight = luaChonQuai.weight;
      } else {
        dauVaoMoi.handleWeight = dauVaoMoi.hasHandle ? state.constants.handleWeight : 0;
      }
      dauVaoMoi.zipperWeight = dauVaoMoi.hasZipper ? state.constants.zipperWeight : 0;
      dauVaoMoi.tapeWeight   = dauVaoMoi.hasTape   ? state.constants.tapeWeight   : 0;

      // Tự cập nhật cylUnitPrice khi đổi loại trục (A/B tự lấy từ constants; custom giữ giá trị nhập tay)
      if ('cylType' in partial) {
        if (dauVaoMoi.cylType === 'A') dauVaoMoi.cylUnitPrice = state.constants.cylPriceA ?? state.constants.cylinderPricePerUnit;
        else if (dauVaoMoi.cylType === 'B') dauVaoMoi.cylUnitPrice = state.constants.cylPriceB ?? 6500000;
        // custom: giữ nguyên cylUnitPrice hiện tại
      }

      return { dauVao: dauVaoMoi, input: dauVaoMoi, result: tinhBaoGia(dauVaoMoi, state.materials, state.constants, state.profitTable, state.smallWidthPrices), isDirty: true };
    });
  },

  resetInput: () => {
    set((state) => ({
      dauVao: { ...dauVaoMacDinh },
      input: { ...dauVaoMacDinh },
      result: tinhBaoGia(dauVaoMacDinh, state.materials, state.constants, state.profitTable, state.smallWidthPrices),
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
        dauVao: { ...item.input },
        input: { ...item.input },
        result: tinhBaoGia(item.input, state.materials, state.constants, state.profitTable, state.smallWidthPrices),
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

  setChotGiaForLatest: (giaTri) => {
    set((state) => {
      if (!state.history.length) return state;
      const history = [...state.history];
      history[0] = { ...history[0], chotGia: giaTri };
      luuLocalStorage(LS_HISTORY, history);
      return { history };
    });
  },

  setCurrentChotGia: (giaTri) => set({ currentChotGia: giaTri }),

  updateQuoteStatus: (id, status) => {
    set((state) => {
      const history = state.history.map(h => h.id === id ? { ...h, quoteStatus: status } : h);
      luuLocalStorage(LS_HISTORY, history);
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
      const vatLieuDaDoi = materials.find(m => m.id === id);
      const bangGiaKhoNho = vatLieuDaDoi
        ? state.smallWidthPrices.map(p => p.materialId === id
          ? { ...p, pricePerM2: p.pricePerKg * vatLieuDaDoi.thickness * vatLieuDaDoi.density / 1000 }
          : p
        )
        : state.smallWidthPrices;
      luuConfigVaoLS(materials, state.constants, state.profitTable, bangGiaKhoNho);
      return { materials, smallWidthPrices: bangGiaKhoNho, result: tinhBaoGia(state.input, materials, state.constants, state.profitTable, bangGiaKhoNho) };
    });
  },

  setSmallWidthPriceParam: (id, partial) => {
    set((state) => {
      const bangGiaKhoNho = state.smallWidthPrices.map(p => {
        if (p.id !== id) return p;
        const material = state.materials.find(m => m.id === p.materialId);
        if (!material) return p;
        const giaMoiKgMoi = partial.pricePerKg ?? p.pricePerKg;
        const nguongKhoMmMoi = partial.widthThresholdMm ?? p.widthThresholdMm;
        return {
          ...p,
          ...partial,
          pricePerM2: giaMoiKgMoi * material.thickness * material.density / 1000,
        };
      });
      luuConfigVaoLS(state.materials, state.constants, state.profitTable, bangGiaKhoNho);
      return { smallWidthPrices: bangGiaKhoNho, result: tinhBaoGia(state.input, state.materials, state.constants, state.profitTable, bangGiaKhoNho) };
    });
  },

  setConstantParam: (key, val) => {
    set((state) => {
      const constants = { ...state.constants, [key]: val };
      luuConfigVaoLS(state.materials, constants, state.profitTable, state.smallWidthPrices);
      return { constants, result: tinhBaoGia(state.input, state.materials, constants, state.profitTable, state.smallWidthPrices) };
    });
  },

  recalculate: () => {
    set((state) => ({ result: tinhBaoGia(state.input, state.materials, state.constants, state.profitTable, state.smallWidthPrices) }));
  },

  calculateForInput: (input) => {
    const state = get();
    return tinhBaoGia(input, state.materials, state.constants, state.profitTable, state.smallWidthPrices);
  },

  calculateForQuantity: (soLuong) => {
    const state = get();
    return tinhKetQuaMoq(state.input, soLuong, state.materials, state.constants, state.profitTable, state.smallWidthPrices);
  },

  optimizeCurrentThickness: () => {
    const state = get();
    return toiUuDoDayTheoVatLieu(state.input, state.materials);
  },

  // ── Overrides ─────────────────────────────────────────────────────────────────
  setSaleOverride: (khoaDong, truong, giaTri) => {
    set((state) => {
      const ghiDeMoi = { ...state.saleOverrides };
      if (giaTri === undefined) {
        if (ghiDeMoi[khoaDong]) {
          const { [truong]: _, ...rest } = ghiDeMoi[khoaDong]!;
          if (Object.keys(rest).length === 0) delete ghiDeMoi[khoaDong];
          else ghiDeMoi[khoaDong] = rest;
        }
      } else {
        ghiDeMoi[khoaDong] = { ...ghiDeMoi[khoaDong], [truong]: giaTri };
      }
      return { saleOverrides: ghiDeMoi };
    });
  },

  setAdminOverride: (khoaDong, truong, giaTri) => {
    set((state) => {
      const ghiDeMoi = { ...state.adminOverrides };
      if (giaTri === undefined) {
        if (ghiDeMoi[khoaDong]) {
          const { [truong]: _, ...rest } = ghiDeMoi[khoaDong]!;
          if (Object.keys(rest).length === 0) delete ghiDeMoi[khoaDong];
          else ghiDeMoi[khoaDong] = rest;
        }
      } else {
        ghiDeMoi[khoaDong] = { ...ghiDeMoi[khoaDong], [truong]: giaTri };
      }
      return { adminOverrides: ghiDeMoi };
    });
  },

  setShowSaleOverrides:  (v) => set({ showSaleOverrides: v }),
  setShowAdminOverrides: (v) => set({ showAdminOverrides: v }),

  persistOverrides: (idLichSu) => {
    const { saleOverrides: ghiDeSale, adminOverrides: ghiDeAdmin, history } = get();
    const ghiDeSaleDaLuu  = Object.keys(ghiDeSale).length  > 0 ? ghiDeSale  : undefined;
    const ghiDeAdminDaLuu = Object.keys(ghiDeAdmin).length > 0 ? ghiDeAdmin : undefined;
    const lichSuDaCapNhat = history.map(h =>
      h.id === idLichSu ? { ...h, saleOverrides: ghiDeSaleDaLuu, adminOverrides: ghiDeAdminDaLuu } : h
    );
    set({ history: lichSuDaCapNhat });
    luuLocalStorage(LS_HISTORY, lichSuDaCapNhat);
  },

  // ── Production Orders (localStorage only) ────────────────────────────────────
  themLSX: (lenh) => {
    set((state) => {
      const lenhSanXuat = [lenh, ...state.productionOrders];
      luuLocalStorage(LS_LSX, lenhSanXuat);
      return { productionOrders: lenhSanXuat };
    });
  },

  capNhatLSX: (id, banVa) => {
    set((state) => {
      const lenhSanXuat = state.productionOrders.map(o => o.id === id ? { ...o, ...banVa } : o);
      luuLocalStorage(LS_LSX, lenhSanXuat);
      return { productionOrders: lenhSanXuat };
    });
  },

  xoaLSX: (id) => {
    set((state) => {
      const lenhSanXuat = state.productionOrders.filter(o => o.id !== id);
      luuLocalStorage(LS_LSX, lenhSanXuat);
      return { productionOrders: lenhSanXuat };
    });
  },
}));

// Backward compat alias
export const useCalculatorStore = dungCuaHangTinhGia;
