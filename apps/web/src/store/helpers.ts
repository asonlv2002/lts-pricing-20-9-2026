import { CalculateInput, Material, AppConstants, ProfitRow, SmallWidthMaterialPrice } from '../lib/types';
import { INITIAL_MATERIALS } from '../lib/data';
import { dongBoCotLoiNhuan } from '../lib/engine';
import customersSeed from '../data/customers.json';

export const LS_HISTORY  = 'lts_history';
export const LS_CONFIG   = 'lts_material_config';
export const LS_UI_PREFS = 'lts_ui_prefs';
export const LS_LSX      = 'lts_production_orders';
export const LS_AUDIT    = 'lts_audit_log';
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
  filmQuantityUnit: 'm2', filmInputQuantity: 0, filmRollLength: 6000, quantity: 0, numColors: null, numImages: 0,
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

/**
 * Auto-create a minimal customer record when the entered name is not in the customer list.
 * Returns true if a new customer was created.
 */
export function autoAddCustomerIfNeeded(customerName: string, sellerId?: string, sellerName?: string): boolean {
  customerName = customerName.trim();
  if (!customerName || customerName === 'N/A') return false;
  const customers = loadCustomers();
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const tenDaChuanHoa = chuanHoaTenKhach(customerName) || norm(customerName);
  const exists = customers.some(c => chuanHoaTenKhach(String(c.companyName || c.contactName || '')) === tenDaChuanHoa);
  if (exists) return false;

  const now = new Date();
  const id = `C${now.getTime()}`;
  const newCustomer: CustomerQuick = {
    id,
    customerCode: '',
    companyName: customerName,
    taxCode: '',
    contactName: '',
    phone: '',
    email: '',
    invoiceAddress: '',
    address: '',
    region: '',
    customerGroup: '',
    sellerId: sellerId || null,
    sellerName: sellerName || '',
    secondarySellerId: null,
    secondarySellerName: '',
    contactTitle: '',
    contactNotes: '',
    assignmentHistory: [],
    assignmentNote: '',
    status: 'active',
    crmStatus: 'lead',
    isLocked: false,
    notes: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const updated = [newCustomer, ...customers];
  luuLocalStorage(LS_CUSTOMERS, updated);
  return true;
}
