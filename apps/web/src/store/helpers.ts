import { CalculateInput, Material, AppConstants, ProfitRow, SmallWidthMaterialPrice } from '../lib/types';
import { INITIAL_MATERIALS } from '../lib/data';
import { dongBoCotLoiNhuan } from '../lib/engine';
import customersSeed from '../data/customers.json';

export const LS_CONFIG   = 'lts_material_config';
export const LS_UI_PREFS = 'lts_ui_prefs';
export const LS_VERSIONS = 'lts_versions';
export const LS_CONFIG_SNAPSHOTS = 'lts_config_snapshots';
export const LS_QUOTE_COUNTER = 'lts_quote_counter';
export const LS_CUSTOMERS = 'lts_customers';


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
      cutRules: constants.cutRules,
      cylinderPricePerUnit: constants.cylinderPricePerUnit,
      nhuPrice: constants.nhuPrice, moPrice: constants.moPrice,
      zipperPrice: constants.zipperPrice, zipperWeight: constants.zipperWeight,
      tapePrice: constants.tapePrice, tapeWeight: constants.tapeWeight,
      handlePrice: constants.handlePrice, handleWeight: constants.handleWeight, handleOptions: constants.handleOptions,
      customCylTypes: constants.customCylTypes,
      customPaymentDays: constants.customPaymentDays,
      customAccessories: constants.customAccessories,
      customPrintSurcharges: constants.customPrintSurcharges,
      cpsxUpgradeElectric: constants.cpsxUpgradeElectric,
      cpsxUpgradeLabor: constants.cpsxUpgradeLabor,
      cpsxUpgradeInk: constants.cpsxUpgradeInk,
      cpsxUpgradeThoiGian: constants.cpsxUpgradeThoiGian,
    },
    packaging: {
      boxOptions: constants.boxOptions,
      boxPriceDefault: constants.boxPriceDefault,
      bagsPerBoxDefault: constants.bagsPerBoxDefault,
    },
    printWaste: { colorSetup: constants.colorSetup, A: constants.printWasteA, B: constants.printWasteB, C: constants.printWasteC, D: constants.printWasteD },
    profitTable: profitTable.map(r => ({ threshold: r.threshold, col1: r.col1, col2: r.col2, largeCol1: r.largeCol1, largeCol2: r.largeCol2 })),
  });
}

export const dauVaoMacDinh: CalculateInput = {
  customer: '', productName: '', productCode: '', productType: '', bagType: '', filmType: '',
  printFilmCustomerGroup: 'normal',
  filmQuantityUnit: 'm2', filmInputQuantity: 0, filmRollLength: 6000, quantity: 0, numColors: null, numImages: 0,
  layer1Id: null, layer2Id: null, layer2AltId: null, layer2Lengths: undefined, layer2FrontPart: 'main', layer2PairingMode: 'bottom_to_bottom', layer3Id: null, layer4Id: null, layer5Id: null,
  spreadWidth: 0, cutStep: 0, metallicSurcharge: 0, coverageRatio: 1,
  hasDivide: false, originalWidthMm: 0, divideWidthMm: 0, divideElements: 1,
  selectedPrintSurchargeKeys: [],
  handleWeight: 0, zipperWeight: 0, tapeWeight: 0,
  hasZipper: false, hasTape: false, hasHandle: false, handleOptionKey: null,
  paymentDays: 30, profitColumn: 1,
  commissionRate: 0, commissionFixedVND: 0, commissionUnit: 'percent', commissionInputValue: 0,
  bagsPerBox: 0, boxPrice: 0, boxWeight: 0, boxOptionKey: null, shippingPerKm: 0, shippingKm: 0,
  cylLength: 0, cylCircum: 0, cylUnitPrice: 7300000, cylType: 'A' as const, cylIncluded: false, targetThickness: 0, micOverrides: {},
  pricingMode: 'internal',
  // Tính giá Thương mại — chỉ dùng khi pricingMode='commercial'
  commercialMode: 'form',
  commercialPurchasePrice: 0,
  commercialProfitValue: 0,
  commercialProfitUnit: 'percent',
  commercialDescription: '',
  commercialUnitKind: 'tui',
  commercialUnitLabel: '',
  commercialExtraFee: 0,
};

export const dauVaoKhoiTao = dongBoCotLoiNhuan(dauVaoMacDinh, INITIAL_MATERIALS);

// ── Auto-add customer ──────────────────────────────────────────────────────────
export interface CustomerQuick {
  id: string;
  customerCode: string;
  companyName: string;
  contactName?: string;
  sellerId?: string | null;
  sellerName?: string;
  status: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

const chuanHoaTenKhach = (s: string) => s
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export function loadCustomers(): CustomerQuick[] {
  const localCustomers = (() => {
    if (typeof window === 'undefined') return [] as CustomerQuick[];
    try {
      const raw = window.localStorage.getItem(LS_CUSTOMERS);
      return raw ? JSON.parse(raw) as CustomerQuick[] : [];
    } catch { return [] as CustomerQuick[]; }
  })();

  const seen = new Set<string>();
  return [...localCustomers, ...(customersSeed as CustomerQuick[])]
    .filter(c => {
      const key = chuanHoaTenKhach(String(c.companyName || c.contactName || c.customerCode || c.id || ''));
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ── Bổ sung vật liệu mặc định còn thiếu ────────────────────────────────────
// Dùng sau LS-hydrate và sau bootstrap apply BE:
// nếu materials hiện tại (do BE snapshot cũ / LS chưa có) thiếu id mặc định,
// append từ INITIAL_MATERIALS. Không ghi đè item đã có (giữ override LS/BE).
// Tránh re-seed xóa vật liệu admin đã xóa bằng cách trả về cùng tham chiếu
// nếu không có thay đổi (caller dùng === để skip setState).
export function boSungVatLieuMacDinhThieu(materials: Material[]): Material[] {
  const have = new Set(materials.map(m => m.id));
  const thieu = INITIAL_MATERIALS.filter(m => !have.has(m.id));
  if (thieu.length === 0) return materials;
  return [...materials, ...thieu];
}
