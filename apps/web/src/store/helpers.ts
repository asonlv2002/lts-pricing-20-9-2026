import { CalculateInput, Material, AppConstants, ProfitRow, SmallWidthMaterialPrice } from '../lib/types';
import { INITIAL_MATERIALS } from '../lib/data';
import { dongBoCotLoiNhuan } from '../lib/engine';

export const LS_HISTORY  = 'lts_history';
export const LS_CONFIG   = 'lts_material_config';
export const LS_UI_PREFS = 'lts_ui_prefs';
export const LS_LSX      = 'lts_production_orders';
export const LS_AUDIT    = 'lts_audit_log';
export const LS_VERSIONS = 'lts_versions';
export const LS_QUOTE_COUNTER = 'lts_quote_counter';

export function luuLocalStorage(key: string, giaTri: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(giaTri)); } catch { /* quota */ }
}

export function luuConfigVaoLS(materials: Material[], constants: AppConstants, profitTable: ProfitRow[], bangGiaKhoNho: SmallWidthMaterialPrice[]) {
  luuLocalStorage(LS_CONFIG, {
    materials: materials.map(m => ({ id: m.id, thickness: m.thickness, pricePerKg: m.pricePerKg, inkPricePerColor: m.inkPricePerColor })),
    smallWidthPrices: bangGiaKhoNho.map(p => ({ id: p.id, materialId: p.materialId, widthThresholdMm: p.widthThresholdMm, thickness: p.thickness, pricePerKg: p.pricePerKg })),
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

export const dauVaoMacDinh: CalculateInput = {
  customer: '', productName: '', productType: '', bagType: '', filmType: '',
  filmQuantityUnit: 'm2', filmInputQuantity: 0, filmRollLength: 6000, quantity: 0, numColors: null, numImages: 1,
  layer1Id: null, layer2Id: null, layer2AltId: null, layer2Lengths: undefined, layer2FrontPart: 'main', layer2PairingMode: 'bottom_to_bottom', layer3Id: null, layer4Id: null, layer5Id: null,
  spreadWidth: 0, cutStep: 0, metallicSurcharge: 0, coverageRatio: 1,
  handleWeight: 0, zipperWeight: 0, tapeWeight: 0,
  hasZipper: false, hasTape: false, hasHandle: false, handleOptionKey: null,
  paymentDays: 30, profitColumn: 1,
  commissionRate: 0, commissionFixedVND: 0, commissionUnit: 'percent', commissionInputValue: 0,
  bagsPerBox: 0, boxPrice: 0, boxWeight: 0, boxOptionKey: null, shippingPerKm: 0, shippingKm: 0,
  cylLength: 0, cylCircum: 0, cylUnitPrice: 7300000, cylType: 'A' as const, cylIncluded: false, targetThickness: 0, micOverrides: {},
};

export const dauVaoKhoiTao = dongBoCotLoiNhuan(dauVaoMacDinh, INITIAL_MATERIALS);
