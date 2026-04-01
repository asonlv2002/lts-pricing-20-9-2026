// ── User / Auth ───────────────────────────────────────────────────────────────
export interface AppUser {
  id: string;           // e.g. "U001"
  username: string;     // login username
  passwordHash: string; // SHA-256 hex via Node.js crypto
  displayName: string;  // tên hiển thị
  role: 'admin' | 'sale' | 'purchase';
  sellerId?: string;    // linked seller ID (for sale role)
  active: boolean;      // tài khoản có hoạt động không
  createdAt: string;
}

export interface Material {
  id: string;
  name: string;
  group?: string;
  density: number;
  thickness: number;
  pricePerKg: number;
  isPETorPA: boolean;
  adjustableMic?: boolean;
  rollLength: number;
  inkPricePerColor: number;
  pricePerM2?: number;
}

export interface ProfitRow {
  threshold: number;
  col1: number;
  col2: number;
}

export interface AppConstants {
  zipperPrice: number;
  zipperWeight: number;
  tapePrice: number;
  tapeWeight: number;
  handlePrice: number;
  handleWeight: number;
  boxPriceDefault: number;
  bagsPerBoxDefault: number;
  interestRate: number;
  paymentDays: number;
  cylinderPricePerUnit: number;
  ghepCPSX: number;
  shippingPerKmDefault: number;
  shippingKmDefault: number;
  laborCost: number;
  cutBase: number;
  cutThreshold1: number;
  cutThreshold2: number;
  cutMult1: number;
  cutMult2: number;
  cutMult3: number;
  nhuPrice: number;
  moPrice: number;
  colorSetup: Record<number, number>;
  printWasteA: number;
  printWasteB: number;
  printWasteC: number;
  printWasteD: number;
}

export interface CalculateInput {
  customer: string;
  productName: string;
  productType: string;
  bagType: string;
  filmType: string;
  filmRollLength: number; // chiều dài mỗi cuộn màng thành phẩm (m), chỉ dùng khi productType='mang'
  quantity: number;
  numColors: number | null;
  numImages: number;
  layer1Id?: string | null;
  layer2Id?: string | null;
  layer3Id?: string | null;
  layer4Id?: string | null;
  layer5Id?: string | null;
  spreadWidth: number;
  cutStep: number;
  metallicSurcharge: number;
  coverageRatio: number;
  handleWeight: number;
  zipperWeight: number;
  tapeWeight: number;
  hasZipper: boolean;
  hasTape: boolean;
  hasHandle: boolean;
  paymentDays: number;
  paymentInterestRate: number;
  profitColumn: number;
  commissionRate: number;
  commissionFixedVND: number;
  commissionUnit: string;
  commissionInputValue: number;
  bagsPerBox: number;
  boxPrice: number;
  shippingPerKm: number;
  shippingKm: number;
  cylLength: number;
  cylCircum: number;
  cylUnitPrice: number;
  micOverrides?: Record<string, number>;
}

// ── Quote Status (luồng báo giá 5 bước) ──────────────────────────────────────
export type QuoteStatus = 'drafted' | 'sent' | 'pending_approval' | 'approved' | 'completed';

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  step: number;
  description: string;
}> = {
  drafted:          { label: 'Đã lập',      shortLabel: 'Đã lập',    color: '#6b7280', bg: 'rgba(107,114,128,0.1)', step: 1, description: 'Báo giá đã được lập' },
  sent:             { label: 'Đã gửi',      shortLabel: 'Đã gửi',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  step: 2, description: 'Đã gửi cho khách hàng' },
  pending_approval: { label: 'Chờ duyệt',   shortLabel: 'Chờ duyệt', color: '#d97706', bg: 'rgba(217,119,6,0.1)',   step: 3, description: 'Đang chờ phê duyệt nội bộ' },
  approved:         { label: 'Đã duyệt',    shortLabel: 'Đã duyệt',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  step: 4, description: 'Admin đã duyệt báo giá' },
  completed:        { label: 'Hoàn thành',  shortLabel: 'Xong',      color: '#059669', bg: 'rgba(5,150,105,0.1)',   step: 5, description: 'Khách hàng đã chốt' },
};

// ── Override Tables (Bảng 2 & 3 — Sale nhập / Admin nhập) ────────────────────
export type OverrideRowKey = 'print' | 'lam-2' | 'lam-3' | 'lam-4' | 'lam-5' | 'cut';

export interface OverrideFields {
  width?: number;       // Khổ (m)
  meters?: number;      // Thành phẩm (m)
  waste?: number;       // Phi hao
  inputVL?: number;     // Đầu vào VL
  matPrice?: number;    // CP vật liệu (đ/m²)
}

export type OverrideTable = Partial<Record<OverrideRowKey, Partial<OverrideFields>>>;

// ── History ───────────────────────────────────────────────────────────────────
export interface HistoryItem {
  id: string;
  date: string;
  customer: string;
  productName: string;
  structure: string;
  quantity: number;
  finalPrice: number;
  chotGia?: number;
  quoteStatus?: QuoteStatus;
  sellerId?: string;       // id của sale đã tạo báo giá này
  sellerName?: string;     // tên hiển thị (lưu cùng để không cần join)
  saleOverrides?: OverrideTable;   // Bảng (2) — Sale chỉnh sửa
  adminOverrides?: OverrideTable;  // Bảng (3) — Admin chỉnh sửa
  input: CalculateInput;
}

export interface CalculateResult {
  input: CalculateInput;
  structureText: string;
  totalThickness: number;
  totalGSM: number;
  bagArea: number;
  totalArea: number;
  printWidth: number;
  filmLength: number;
  cutWidth: number;
  cutMeters: number;
  cutWaste: number;
  cutWastePercent: number;
  cutCPSX: number;
  cutCostCPSX: number;
  cutTotalCost: number;
  printNLWidth: number;
  printMeters: number;
  printWaste: number;
  printCPSX: number;
  printCostCPSX: number;
  printCostMaterial: number;
  printTotalCost: number;
  totalProductionCost: number;
  totalLamCost: number;
  profitRate: number;
  profitAmount: number;
  revenue: number;
  costPerUnit: number;
  zipperPerUnit: number;
  zipperTotal: number;
  tapePerUnit: number;
  tapeTotal: number;
  handlePerUnit: number;
  handleTotal: number;
  boxPerUnit: number;
  boxTotal: number;
  actualBoxPrice: number;
  actualBagsPerBox: number;
  numBoxes: number;
  filmRollArea: number;       // diện tích 1 cuộn màng TP (m²) = khổ trải × chiều dài cuộn / số con hình
  packagingPerUnit: number;   // phí đóng gói / đơn vị (đ/m² cho màng, đ/túi cho túi)
  tareWeight: number;
  shippingPerUnit: number;
  shippingTotal: number;
  shippingRate: number;
  actualShippingPerKm: number;
  actualShippingKm: number;
  interestPerUnit: number;
  interestRate30: number;
  paymentDays: number;
  commissionPerUnit: number;
  finalPrice: number;
  cylinderCost: number;
  cylinderCostPerUnit: number;
  cylArea: number;
  cylLength: number;
  cylCircum: number;
  productionDays: number;
  layers: {
    print: any;
    laminations: any[];
    cut: any;
  }
}
