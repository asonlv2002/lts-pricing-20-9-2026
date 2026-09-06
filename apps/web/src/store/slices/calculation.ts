import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { CalculateInput, Material, AppConstants, ProfitRow, CalculateResult, SmallWidthMaterialPrice } from '../../lib/types';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE, INITIAL_SMALL_WIDTH_PRICES } from '../../lib/data';
import { tinhBaoGia, toiUuDoDayTheoVatLieu, tinhKetQuaMoq } from '../../lib/manager-calculation';
import { dongBoCotLoiNhuan } from '../../lib/engine';
import { dauVaoMacDinh, dauVaoKhoiTao, luuConfigVaoLS } from '../helpers';

export type EngineConfigSnapshot = Pick<
  CalculationSlice,
  'materials' | 'constants' | 'profitTable' | 'smallWidthPrices'
>;

export interface CalculationSlice {
  dauVao: CalculateInput;
  input: CalculateInput;
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
  result: CalculateResult | null;
  currentChotGia: number;
  phanBoCongTy: number;
  donViPhanBo: 'vnd' | 'percent';
  isDirty: boolean;
  /** Latest sau bootstrap — restore khi đóng sheet pin. */
  sessionConfigSnapshot: EngineConfigSnapshot | null;
  /** priceConfigIds đang pin (sheet mở). */
  workingPriceConfigIds: string[] | null;

  setInput: (partial: Partial<CalculateInput>) => void;
  resetInput: () => void;
  /** Reset như resetInput nhưng GIỮ loại hình đang dùng (pricingMode +
   * commercialMode/outsource theo cấu hình hiện tại) — nút "Đặt lại" của form.
   */
  resetInputGiuLoaiHinh: () => void;
  setCurrentChotGia: (giaTri: number) => void;
  setPhanBoCongTy: (val: number) => void;
  setDonViPhanBo: (val: 'vnd' | 'percent') => void;
  setMaterialParam: (id: string, partial: Partial<Material>) => void;
  addMaterial: (m: Material) => void;
  removeMaterial: (id: string) => void;
  setConstantParam: (key: keyof AppConstants, val: any) => void;
  setSmallWidthPriceParam: (id: string, partial: Partial<SmallWidthMaterialPrice>) => void;
  replaceFullConfig: (config: Pick<CalculationSlice, 'materials' | 'constants' | 'profitTable' | 'smallWidthPrices'>) => void;
  /** Lưu store hiện tại làm session latest (sau bootstrap). */
  luuSessionConfigSnapshot: () => void;
  /** Apply pin từ sheet; không ghi đè session snapshot. */
  applyPinnedConfig: (config: EngineConfigSnapshot, priceConfigIds: string[]) => void;
  /** Khôi phục session latest; clear pin. */
  restoreSessionConfig: () => void;
  recalculate: () => void;
  calculateForInput: (input: CalculateInput) => CalculateResult | null;
  calculateForQuantity: (quantity: number) => CalculateResult | null;
  optimizeCurrentThickness: () => ReturnType<typeof toiUuDoDayTheoVatLieu>;
  datDauVao: (partial: Partial<CalculateInput>) => void;
  datLaiDauVao: () => void;
  datLaiDauVaoGiuLoaiHinh: () => void;
  tinhLai: () => void;
  tinhTheoDauVao: (input: CalculateInput) => CalculateResult | null;
  tinhTheoSoLuong: (soLuong: number) => CalculateResult | null;
  toiUuDoDayHienTai: () => ReturnType<typeof toiUuDoDayTheoVatLieu>;
}

const tinhPhuPhiIn = (input: CalculateInput, constants: AppConstants) => {
  const phuPhiInDaChon = new Set(input.selectedPrintSurchargeKeys ?? []);
  const tongPhuPhiInThem = (constants.customPrintSurcharges ?? []).reduce(
    (tong, option) => tong + (phuPhiInDaChon.has(option.key) ? option.price : 0),
    0
  );
  return ((input as any).hasNhu ? constants.nhuPrice : 0)
    + ((input as any).hasMo ? constants.moPrice : 0)
    + tongPhuPhiInThem;
};

const dongBoPhuPhiIn = (input: CalculateInput, constants: AppConstants): CalculateInput => ({
  ...input,
  metallicSurcharge: tinhPhuPhiIn(input, constants),
});

/**
 * Trạng thái sau "Đặt lại": input về mặc định (có thể giữ lại vài field loại hình),
 * xóa sạch dữ liệu đơn hàng / override / phiên sheet. Dùng chung cho resetInput
 * (reset toàn bộ) và resetInputGiuLoaiHinh (chỉ giữ loại hình đang chọn).
 */
function trangThaiSauReset(
  state: CalculationSlice,
  giu: Partial<CalculateInput> = {},
): Partial<CuaHangTinhGia> {
  const dauVaoMoi = dongBoCotLoiNhuan({ ...dauVaoMacDinh, ...giu }, state.materials);
  return {
    dauVao: dauVaoMoi,
    input: dauVaoMoi,
    result: tinhBaoGia(dauVaoMoi, state.materials, state.constants, state.profitTable, state.smallWidthPrices),
    currentChotGia: 0, phanBoCongTy: 0, donViPhanBo: 'vnd', isDirty: false,
    saleOverrides: {}, adminOverrides: {},
    showSaleOverrides: false, showAdminOverrides: false,
    loadedHistoryId: null,
    workingPriceConfigIds: null,
  };
}

/** Loại hình được giữ khi bấm "Đặt lại" — không đổi option của bảng tính. */
function loaiHinhGiuLai(input: CalculateInput): Partial<CalculateInput> {
  if (input.pricingMode === 'commercial') {
    return {
      pricingMode: 'commercial',
      commercialMode: input.commercialMode ?? 'form',
    };
  }
  if (input.pricingMode === 'outsource') {
    // Giữ loại "Gia công" nhưng xóa luôn tick công đoạn + config GC.
    return { pricingMode: 'outsource' };
  }
  return { pricingMode: 'internal' };
}

export const createCalculationSlice: StateCreator<CuaHangTinhGia, [], [], CalculationSlice> = (set, get) => ({
  dauVao: dauVaoKhoiTao,
  input: dauVaoKhoiTao,
  materials: INITIAL_MATERIALS,
  constants: INITIAL_CONSTANTS,
  profitTable: INITIAL_PROFIT_TABLE,
  smallWidthPrices: INITIAL_SMALL_WIDTH_PRICES,
  result: tinhBaoGia(dauVaoKhoiTao, INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE, INITIAL_SMALL_WIDTH_PRICES),
  currentChotGia: 0,
  phanBoCongTy: 0,
  donViPhanBo: 'vnd',
  isDirty: false,
  sessionConfigSnapshot: null,
  workingPriceConfigIds: null,

  setInput: (partial) => {
    set((state) => {
      const dauVaoMoi = { ...state.input, ...partial };

      if ('numImages' in partial && dauVaoMoi.numImages) {
        dauVaoMoi.numImages = Math.max(1, Math.round(dauVaoMoi.numImages));
      }

      if ('spreadWidth' in partial || 'numImages' in partial) {
        const khoTrai = dauVaoMoi.spreadWidth || 0;
        const soHinh = dauVaoMoi.numImages || 1;
        dauVaoMoi.cylLength = khoTrai > 0 ? Number(Math.max(0.7, khoTrai * soHinh + 0.1).toFixed(3)) : 0;
      }

      // "Có chia" là công tắc tường minh (checkbox); khổ chia = gợi ý tự tính, user sửa được.
      if ('hasDivide' in partial) {
        if (!dauVaoMoi.hasDivide) {
          dauVaoMoi.hasDivide = false;
          dauVaoMoi.divideElements = 1;
          dauVaoMoi.divideWidthMm = 0;
        } else {
          const soPt = Math.max(1, Math.round(dauVaoMoi.divideElements || 1));
          dauVaoMoi.divideElements = soPt;
          if ((dauVaoMoi.spreadWidth || 0) > 0) {
            const soHinh = Math.max(1, dauVaoMoi.numImages || 1);
            dauVaoMoi.divideWidthMm = Math.round((dauVaoMoi.spreadWidth || 0) * 1000 * soHinh / soPt);
          }
        }
      } else if (dauVaoMoi.hasDivide && ('divideElements' in partial || 'spreadWidth' in partial || 'numImages' in partial)) {
        const soPt = Math.max(1, Math.round(dauVaoMoi.divideElements || 1));
        dauVaoMoi.divideElements = soPt;
        if ((dauVaoMoi.spreadWidth || 0) > 0) {
          const soHinh = Math.max(1, dauVaoMoi.numImages || 1);
          dauVaoMoi.divideWidthMm = Math.round((dauVaoMoi.spreadWidth || 0) * 1000 * soHinh / soPt);
        }
      }

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

      if (dauVaoMoi.productType === 'mang' && dauVaoMoi.filmType === 'mangIn') {
        dauVaoMoi.coverageRatio = 1;
        dauVaoMoi.printFilmCustomerGroup = dauVaoMoi.printFilmCustomerGroup ?? 'normal';
        dauVaoMoi.layer2Id = null;
        dauVaoMoi.layer2AltId = null;
        dauVaoMoi.layer2Lengths = undefined;
        dauVaoMoi.layer2FrontPart = 'main';
        dauVaoMoi.layer2PairingMode = 'bottom_to_bottom';
        dauVaoMoi.layer3Id = null;
        dauVaoMoi.layer4Id = null;
        dauVaoMoi.layer5Id = null;
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

      Object.assign(dauVaoMoi, dongBoCotLoiNhuan(dauVaoMoi, state.materials));

      dauVaoMoi.metallicSurcharge = tinhPhuPhiIn(dauVaoMoi, state.constants);

      const luaChonQuai = state.constants.handleOptions?.find(o => o.key === dauVaoMoi.handleOptionKey);
      if (dauVaoMoi.hasHandle && luaChonQuai) {
        dauVaoMoi.handleWeight = luaChonQuai.weight;
      } else {
        dauVaoMoi.handleWeight = dauVaoMoi.hasHandle ? state.constants.handleWeight : 0;
      }
      dauVaoMoi.zipperWeight = dauVaoMoi.hasZipper ? state.constants.zipperWeight : 0;
      dauVaoMoi.tapeWeight   = dauVaoMoi.hasTape   ? state.constants.tapeWeight   : 0;

      if ('cylType' in partial) {
        if (dauVaoMoi.cylType === 'A') dauVaoMoi.cylUnitPrice = state.constants.cylPriceA ?? state.constants.cylinderPricePerUnit;
        else if (dauVaoMoi.cylType === 'B') dauVaoMoi.cylUnitPrice = state.constants.cylPriceB ?? 6500000;
        else {
          const customCyl = (state.constants.customCylTypes ?? []).find(c => c.key === dauVaoMoi.cylType);
          if (customCyl) dauVaoMoi.cylUnitPrice = customCyl.price;
        }
      }

      // Đổi loại túi / zipper / lớp → bỏ ghim % LN Sale/Admin để LN theo lại bảng (cột đúng SP)
      const doiCotLoiNhuan =
        'bagType' in partial
        || 'hasZipper' in partial
        || 'productType' in partial
        || 'filmType' in partial
        || 'layer1Id' in partial
        || 'layer2Id' in partial
        || 'layer2AltId' in partial
        || 'layer3Id' in partial
        || 'layer4Id' in partial
        || 'layer5Id' in partial;

      return {
        dauVao: dauVaoMoi,
        input: dauVaoMoi,
        result: tinhBaoGia(dauVaoMoi, state.materials, state.constants, state.profitTable, state.smallWidthPrices),
        isDirty: true,
        ...(doiCotLoiNhuan ? { saleProfitRatePct: 0, adminProfitRatePct: 0 } : {}),
      };
    });
  },

  resetInput: () => {
    get().restoreSessionConfig();
    set((state) => trangThaiSauReset(state));
  },

  resetInputGiuLoaiHinh: () => {
    const giu = loaiHinhGiuLai(get().input);
    get().restoreSessionConfig();
    set((state) => trangThaiSauReset(state, giu));
  },

  setCurrentChotGia: (giaTri) => set((state) => ({ currentChotGia: giaTri, input: { ...state.input, chotGia: giaTri || undefined } })),
  setPhanBoCongTy: (val) => set((state) => ({ phanBoCongTy: val, input: { ...state.input, phanBoCongTy: val || undefined } })),
  setDonViPhanBo: (val) => set((state) => ({ donViPhanBo: val, input: { ...state.input, donViPhanBo: val || undefined } })),

  setMaterialParam: (id, partial) => {
    set((state) => {
      const materials = state.materials.map(m => m.id === id
        ? { ...m, ...partial, pricePerM2: (partial.pricePerKg || m.pricePerKg) * (partial.thickness || m.thickness) * m.density / 1000 }
        : m
      );
      const vatLieuDaDoi = materials.find(m => m.id === id);
      const bangGiaKhoNho = vatLieuDaDoi
        ? state.smallWidthPrices.map(p => p.materialId === id
          ? { ...p, thickness: p.thickness ?? vatLieuDaDoi.thickness, pricePerM2: p.pricePerKg * (p.thickness ?? vatLieuDaDoi.thickness) * vatLieuDaDoi.density / 1000 }
          : p
        )
        : state.smallWidthPrices;
      luuConfigVaoLS(materials, state.constants, state.profitTable, bangGiaKhoNho);
      return { materials, smallWidthPrices: bangGiaKhoNho, input: dongBoCotLoiNhuan(state.input, materials), dauVao: dongBoCotLoiNhuan(state.input, materials), result: tinhBaoGia(dongBoCotLoiNhuan(state.input, materials), materials, state.constants, state.profitTable, bangGiaKhoNho) };
    });
  },

  addMaterial: (m) => {
    set((state) => {
      const pricePerM2 = m.pricePerKg * m.thickness * m.density / 1000;
      const materials = [...state.materials, { ...m, pricePerM2 }];
      const newRow: SmallWidthMaterialPrice = {
        id: `${m.id}_400`,
        materialId: m.id,
        widthThresholdMm: 400,
        thickness: m.thickness,
        pricePerKg: m.pricePerKg,
        pricePerM2,
      };
      const smallWidthPrices = [...state.smallWidthPrices, newRow];
      luuConfigVaoLS(materials, state.constants, state.profitTable, smallWidthPrices);
      return { materials, smallWidthPrices, result: tinhBaoGia(dongBoCotLoiNhuan(state.input, materials), materials, state.constants, state.profitTable, smallWidthPrices) };
    });
  },

  removeMaterial: (id) => {
    set((state) => {
      const materials = state.materials.filter(m => m.id !== id);
      const smallWidthPrices = state.smallWidthPrices.filter(p => p.materialId !== id);
      luuConfigVaoLS(materials, state.constants, state.profitTable, smallWidthPrices);
      return { materials, smallWidthPrices, result: tinhBaoGia(dongBoCotLoiNhuan(state.input, materials), materials, state.constants, state.profitTable, smallWidthPrices) };
    });
  },

  setSmallWidthPriceParam: (id, partial) => {
    set((state) => {
      const bangGiaKhoNho = state.smallWidthPrices.map(p => {
        if (p.id !== id) return p;
        const material = state.materials.find(m => m.id === p.materialId);
        if (!material) return p;
        const giaMoiKgMoi = partial.pricePerKg ?? p.pricePerKg;
        const doDayMoi = partial.thickness ?? p.thickness ?? material.thickness;
        return { ...p, ...partial, thickness: doDayMoi, pricePerM2: giaMoiKgMoi * doDayMoi * material.density / 1000 };
      });
      luuConfigVaoLS(state.materials, state.constants, state.profitTable, bangGiaKhoNho);
      return { smallWidthPrices: bangGiaKhoNho, result: tinhBaoGia(dongBoCotLoiNhuan(state.input, state.materials), state.materials, state.constants, state.profitTable, bangGiaKhoNho) };
    });
  },

  setConstantParam: (key, val) => {
    set((state) => {
      const constants = { ...state.constants, [key]: val };
      const input = dongBoPhuPhiIn(state.input, constants);
      // Session draft luôn theo constants mới (kể cả khi đang mở sheet pin —
      // sheet NC đọc overlay pin từ HistoryItem, không phụ thuộc constants live).
      const snap = state.sessionConfigSnapshot;
      const sessionConfigSnapshot = snap
        ? { ...snap, constants: structuredClone(constants) }
        : snap;
      luuConfigVaoLS(state.materials, constants, state.profitTable, state.smallWidthPrices);
      return {
        constants,
        input,
        dauVao: input,
        sessionConfigSnapshot,
        result: tinhBaoGia(dongBoCotLoiNhuan(input, state.materials), state.materials, constants, state.profitTable, state.smallWidthPrices),
      };
    });
  },

  replaceFullConfig: (config) => {
    set((state) => {
      const input = dongBoCotLoiNhuan(dongBoPhuPhiIn(state.input, config.constants), config.materials);
      luuConfigVaoLS(config.materials, config.constants, config.profitTable, config.smallWidthPrices);
      return {
        materials: config.materials,
        constants: config.constants,
        profitTable: config.profitTable,
        smallWidthPrices: config.smallWidthPrices,
        input,
        dauVao: input,
        result: tinhBaoGia(input, config.materials, config.constants, config.profitTable, config.smallWidthPrices),
      };
    });
  },

  luuSessionConfigSnapshot: () => {
    const state = get();
    set({
      sessionConfigSnapshot: {
        materials: structuredClone(state.materials),
        constants: structuredClone(state.constants),
        profitTable: structuredClone(state.profitTable),
        smallWidthPrices: structuredClone(state.smallWidthPrices),
      },
    });
  },

  applyPinnedConfig: (config, priceConfigIds) => {
    set((state) => {
      const input = dongBoCotLoiNhuan(dongBoPhuPhiIn(state.input, config.constants), config.materials);
      return {
        materials: config.materials,
        constants: config.constants,
        profitTable: config.profitTable,
        smallWidthPrices: config.smallWidthPrices,
        input,
        dauVao: input,
        result: tinhBaoGia(input, config.materials, config.constants, config.profitTable, config.smallWidthPrices),
        workingPriceConfigIds: [...priceConfigIds],
      };
    });
  },

  restoreSessionConfig: () => {
    const snap = get().sessionConfigSnapshot;
    if (!snap) {
      set({ workingPriceConfigIds: null });
      return;
    }
    set((state) => {
      const input = dongBoCotLoiNhuan(dongBoPhuPhiIn(state.input, snap.constants), snap.materials);
      return {
        materials: structuredClone(snap.materials),
        constants: structuredClone(snap.constants),
        profitTable: structuredClone(snap.profitTable),
        smallWidthPrices: structuredClone(snap.smallWidthPrices),
        input,
        dauVao: input,
        result: tinhBaoGia(input, snap.materials, snap.constants, snap.profitTable, snap.smallWidthPrices),
        workingPriceConfigIds: null,
      };
    });
  },

  recalculate: () => {
    set((state) => {
      const input = dongBoCotLoiNhuan(dongBoPhuPhiIn(state.input, state.constants), state.materials);
      return { input, dauVao: input, result: tinhBaoGia(input, state.materials, state.constants, state.profitTable, state.smallWidthPrices) };
    });
  },

  calculateForInput: (input) => {
    const state = get();
    return tinhBaoGia(dongBoCotLoiNhuan(input, state.materials), state.materials, state.constants, state.profitTable, state.smallWidthPrices);
  },

  calculateForQuantity: (soLuong) => {
    const state = get();
    return tinhKetQuaMoq(dongBoCotLoiNhuan(state.input, state.materials), soLuong, state.materials, state.constants, state.profitTable, state.smallWidthPrices);
  },

  optimizeCurrentThickness: () => {
    const state = get();
    return toiUuDoDayTheoVatLieu(state.input, state.materials);
  },

  datDauVao: (partial) => get().setInput(partial),
  datLaiDauVao: () => get().resetInput(),
  datLaiDauVaoGiuLoaiHinh: () => get().resetInputGiuLoaiHinh(),
  tinhLai: () => get().recalculate(),
  tinhTheoDauVao: (input) => get().calculateForInput(input),
  tinhTheoSoLuong: (soLuong) => get().calculateForQuantity(soLuong),
  toiUuDoDayHienTai: () => get().optimizeCurrentThickness(),
});
