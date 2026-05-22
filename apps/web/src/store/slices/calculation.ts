import type { StateCreator } from 'zustand';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';
import { CalculateInput, Material, AppConstants, ProfitRow, CalculateResult, SmallWidthMaterialPrice } from '../../lib/types';
import { INITIAL_MATERIALS, INITIAL_CONSTANTS, INITIAL_PROFIT_TABLE, INITIAL_SMALL_WIDTH_PRICES } from '../../lib/data';
import { tinhBaoGia, toiUuDoDayTheoVatLieu, tinhKetQuaMoq } from '../../lib/manager-calculation';
import { dongBoCotLoiNhuan } from '../../lib/engine';
import { dauVaoMacDinh, dauVaoKhoiTao, luuConfigVaoLS } from '../helpers';

export interface CalculationSlice {
  dauVao: CalculateInput;
  input: CalculateInput;
  materials: Material[];
  constants: AppConstants;
  profitTable: ProfitRow[];
  smallWidthPrices: SmallWidthMaterialPrice[];
  result: CalculateResult | null;
  currentChotGia: number;
  isDirty: boolean;

  setInput: (partial: Partial<CalculateInput>) => void;
  resetInput: () => void;
  setCurrentChotGia: (giaTri: number) => void;
  setMaterialParam: (id: string, partial: Partial<Material>) => void;
  setConstantParam: (key: keyof AppConstants, val: any) => void;
  setSmallWidthPriceParam: (id: string, partial: Partial<SmallWidthMaterialPrice>) => void;
  recalculate: () => void;
  calculateForInput: (input: CalculateInput) => CalculateResult | null;
  calculateForQuantity: (quantity: number) => CalculateResult | null;
  optimizeCurrentThickness: () => ReturnType<typeof toiUuDoDayTheoVatLieu>;
  datDauVao: (partial: Partial<CalculateInput>) => void;
  datLaiDauVao: () => void;
  tinhLai: () => void;
  tinhTheoDauVao: (input: CalculateInput) => CalculateResult | null;
  tinhTheoSoLuong: (soLuong: number) => CalculateResult | null;
  toiUuDoDayHienTai: () => ReturnType<typeof toiUuDoDayTheoVatLieu>;
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
  isDirty: false,

  setInput: (partial) => {
    set((state) => {
      const dauVaoMoi = { ...state.input, ...partial };

      if ('spreadWidth' in partial || 'numImages' in partial) {
        const khoTrai = dauVaoMoi.spreadWidth || 0;
        const soHinh = dauVaoMoi.numImages || 1;
        dauVaoMoi.cylLength = khoTrai > 0 ? Number(Math.max(0.7, khoTrai * soHinh + 0.1).toFixed(3)) : 0;
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

      if ('cylType' in partial) {
        if (dauVaoMoi.cylType === 'A') dauVaoMoi.cylUnitPrice = state.constants.cylPriceA ?? state.constants.cylinderPricePerUnit;
        else if (dauVaoMoi.cylType === 'B') dauVaoMoi.cylUnitPrice = state.constants.cylPriceB ?? 6500000;
      }

      return { dauVao: dauVaoMoi, input: dauVaoMoi, result: tinhBaoGia(dauVaoMoi, state.materials, state.constants, state.profitTable, state.smallWidthPrices), isDirty: true };
    });
  },

  resetInput: () => {
    set((state) => ({
      dauVao: dongBoCotLoiNhuan({ ...dauVaoMacDinh }, state.materials),
      input: dongBoCotLoiNhuan({ ...dauVaoMacDinh }, state.materials),
      result: tinhBaoGia(dongBoCotLoiNhuan(dauVaoMacDinh, state.materials), state.materials, state.constants, state.profitTable, state.smallWidthPrices),
      currentChotGia: 0, isDirty: false,
      saleOverrides: {}, adminOverrides: {},
      showSaleOverrides: false, showAdminOverrides: false,
      loadedHistoryId: null,
    }));
  },

  setCurrentChotGia: (giaTri) => set({ currentChotGia: giaTri }),

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
      luuConfigVaoLS(state.materials, constants, state.profitTable, state.smallWidthPrices);
      return { constants, result: tinhBaoGia(dongBoCotLoiNhuan(state.input, state.materials), state.materials, constants, state.profitTable, state.smallWidthPrices) };
    });
  },

  recalculate: () => {
    set((state) => ({ input: dongBoCotLoiNhuan(state.input, state.materials), dauVao: dongBoCotLoiNhuan(state.input, state.materials), result: tinhBaoGia(dongBoCotLoiNhuan(state.input, state.materials), state.materials, state.constants, state.profitTable, state.smallWidthPrices) }));
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
  tinhLai: () => get().recalculate(),
  tinhTheoDauVao: (input) => get().calculateForInput(input),
  tinhTheoSoLuong: (soLuong) => get().calculateForQuantity(soLuong),
  toiUuDoDayHienTai: () => get().optimizeCurrentThickness(),
});
