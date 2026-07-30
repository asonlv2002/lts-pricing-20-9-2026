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

export interface SmallWidthMaterialPrice {
  id: string;
  materialId: string;
  widthThresholdMm: number;
  thickness?: number;
  pricePerKg: number;
  pricePerM2?: number;
}

export interface ProfitRow {
  threshold: number;
  col1: number;
  col2: number;
  largeCol1: number;
  largeCol2: number;
}

export type BoxOptionKey = string;
export type HandleOptionKey = string;

export interface BoxOption {
  key: BoxOptionKey;
  label: string;
  price: number;
  weight?: number;
}

export interface HandleOption {
  key: HandleOptionKey;
  label: string;
  price: number;
  weight: number;
}

export interface CutRule {
  label: string;
  threshold: number | null;
  multiplier: number;
}

export interface PrintFilmProfitRate {
  customerGroup: 'normal' | 'large';
  colorFrom: number;
  colorTo: number;
  rate: number;
}

export interface CylType {
  key: string;
  label: string;
  price: number;
}

export interface CustomAccessory {
  key: string;
  label: string;
  price: number;
  weight: number;
  unit: 'per_piece' | 'per_meter'; // đ/cái hoặc đ/m
}

export interface PrintSurchargeOption {
  key: string;
  label: string;
  price: number;
}

/** Lương NC máy in (đ/phút) — cấu hình UI; chưa nối engine */
export interface PrintPressLabor {
  wages: number[];
  mealMorning: number;
  mealEvening: number;
  otFactor: number;
  /** Mẫu số chia số công nhân theo ca, dùng chung trong các công thức lương */
  shiftDivisor: number;
}

/** Điện máy in (đ/phút) — cấu hình UI; chưa nối engine */
export interface PrintPressElectric {
  powerKw: number;
  efficiency: number; // thập phân, vd 0.55 = 55%
  pricePerKwh: number;
}

/** Tham số thời gian SX in — cấu hình UI; mét hao/TP lấy từ tính giá sau */
export interface PrintPressTime {
  mountMinutesPerColor: number;
  proofMinutes1to7: number;
  proofMinutes8: number;
  matteExtraMinutes: number;
  avgSpeedMPerMin: number;
}

/** Lương NC máy ghép (đ/phút) — luôn 4 người; độc lập với in; chưa nối engine */
export interface LaminatePressLabor {
  wages: [number, number, number, number];
  mealMorning: number;
  mealEvening: number;
  otFactor: number;
}

/** Điện máy ghép (đ/phút) — cấu hình UI; chưa nối engine */
export interface LaminatePressElectric {
  powerKw: number;
  efficiency: number;
  pricePerKwh: number;
}

/** Thời gian SX ghép — cấu hình UI; mét hao/TP lấy từ tính giá sau */
export interface LaminatePressTime {
  setupFirstMinutes: number;
  setupNextMinutes: number;
  avgSpeedMPerMin: number;
}

/** Lương NC máy chia — 1 người, 12h ca sáng; chưa nối engine */
export interface SlitPressLabor {
  wage: number;
  mealMorning: number;
}

/** Điện máy chia (đ/phút) — cấu hình UI; chưa nối engine */
export interface SlitPressElectric {
  powerKw: number;
  efficiency: number;
  pricePerKwh: number;
}

/** Rule setup/tốc độ chia theo loại SP */
export interface SlitPressTimeRule {
  key: string;
  label: string;
  setupMinutes: number;
  speedMPerMin: number;
}

/** Thời gian SX chia — bảng rule; mét hao/TP lấy từ tính giá sau */
export interface SlitPressTime {
  rules: SlitPressTimeRule[];
}

/** Lương NC máy làm túi — 2 ca, tối đa 3 CN/ca (wages flatten: sáng rồi tối); chưa nối engine */
export interface BagPressLabor {
  wages: number[];
  /** Số CN ca sáng (1–3); phần còn lại của wages là ca tối (≤3) */
  morningCount: number;
  mealMorning: number;
  mealEvening: number;
  otFactor: number;
}

/** Điện máy làm túi (đ/phút) — cấu hình UI; chưa nối engine */
export interface BagPressElectric {
  powerKw: number;
  efficiency: number;
  pricePerKwh: number;
}

/** Setup theo loại túi (phút) */
export interface BagPressSetupRule {
  key: string;
  label: string;
  setupMinutes: number;
}

/** Tốc độ theo bước cắt (mm → cái/phút); maxStepMm null = không trần */
export interface BagPressSpeedRule {
  key: string;
  label: string;
  maxStepMm: number | null;
  bagsPerMinute: number;
}

/** Thời gian SX cắt — setup loại túi + tốc độ bước cắt */
export interface BagPressTime {
  setupRules: BagPressSetupRule[];
  speedRules: BagPressSpeedRule[];
}

export interface AppConstants {
  zipperPrice: number;
  zipperWeight: number;
  tapePrice: number;
  tapeWeight: number;
  handlePrice: number;
  handleWeight: number;
  handleOptions?: HandleOption[];
  boxPriceDefault: number;
  bagsPerBoxDefault: number;
  boxOptions: BoxOption[];
  interestBase: number;    // lãi suất cơ sở (% / năm, dạng thập phân, vd: 0.10 = 10%)
  interestSpread: number;  // lãi suất thêm / tình huống (% / năm, dạng thập phân)
  paymentDays: number;
  cylinderPricePerUnit: number; // đơn giá trục mặc định (fallback)
  cylPriceA: number;            // đơn giá Trục A (đ/m²), mặc định 7,300,000
  cylPriceB: number;            // đơn giá Trục B (đ/m²), mặc định 6,500,000
  ghepCPSX: number;
  ghepWasteA: number;  // mẫu số (3000): cứ A mét thì hao B mét
  ghepWasteB: number;  // tử số phí hao biến đổi (20)
  ghepWasteC: number;  // phi hao cố định mỗi lần ghép (100)
  cutWasteA: number;   // mẫu số phi hao cắt (3000)
  cutWasteB: number;   // hệ số phi hao biến đổi cắt (20)
  cutWasteC: number;   // phi hao cố định cắt (100)
  shippingPerKmDefault: number;
  shippingKmDefault: number;
  laborCost: number;
  cutBase: number;
  cutThreshold1: number;
  cutThreshold2: number;
  cutMult1: number;
  cutMult2: number;
  cutMult3: number;
  cutRules?: CutRule[];
  nhuPrice: number;
  moPrice: number;
  colorSetup: Record<number, number>;
  printWasteA: number;
  printWasteB: number;
  printWasteC: number;
  printWasteD: number;
  printFilmInkPriceBopp?: number;
  printFilmInkPriceOther?: number;
  printFilmSetupMinutesPerColor?: number;
  printFilmSetupHourDivisor?: number;
  printFilmLengthThreshold?: number;
  printFilmShortRunSpeed?: number;
  printFilmLaborCostPerHour?: number;
  printFilmShippingThresholdM2?: number;
  printFilmShippingBaseCost?: number;
  printFilmShippingLargeOrderM2?: number;
  printFilmInterestRate?: number;
  printFilmProfitRates?: PrintFilmProfitRate[];
  customCylTypes?: CylType[];
  customPaymentDays?: number[];
  customAccessories?: CustomAccessory[];
  customPrintSurcharges?: PrintSurchargeOption[];
  /** Lương NC máy in theo phút — chỉ lưu cấu hình, engine chưa dùng */
  printPressLabor?: PrintPressLabor;
  /** Điện máy in — chỉ lưu cấu hình, engine chưa dùng */
  printPressElectric?: PrintPressElectric;
  /** Thời gian SX in (tham số) — chỉ lưu cấu hình, engine chưa dùng */
  printPressTime?: PrintPressTime;
  /** Lương NC máy ghép — chỉ lưu cấu hình, engine chưa dùng */
  laminatePressLabor?: LaminatePressLabor;
  /** Điện máy ghép — chỉ lưu cấu hình, engine chưa dùng */
  laminatePressElectric?: LaminatePressElectric;
  /** Thời gian SX ghép — chỉ lưu cấu hình, engine chưa dùng */
  laminatePressTime?: LaminatePressTime;
  /** Lương NC máy chia — chỉ lưu cấu hình, engine chưa dùng */
  slitPressLabor?: SlitPressLabor;
  /** Điện máy chia — chỉ lưu cấu hình, engine chưa dùng */
  slitPressElectric?: SlitPressElectric;
  /** Thời gian SX chia — chỉ lưu cấu hình, engine chưa dùng */
  slitPressTime?: SlitPressTime;
  /** Lương NC máy làm túi — chỉ lưu cấu hình, engine chưa dùng */
  bagPressLabor?: BagPressLabor;
  /** Điện máy làm túi — chỉ lưu cấu hình, engine chưa dùng */
  bagPressElectric?: BagPressElectric;
  /** Thời gian SX cắt — chỉ lưu cấu hình, engine chưa dùng */
  bagPressTime?: BagPressTime;
}

export type PricingMode = 'internal' | 'outsource';

export type OutsourceStep =
  | 'print'
  | 'laminate'
  | 'slit'
  | 'bag'
  | 'handle'
  | 'pp_bag';

export type OutsourceFilmSource = 'lts' | 'vendor';

export interface OutsourceExtraFees {
  /** VNĐ tổng / đơn — vận chuyển gia công theo CD */
  shippingVnd?: number;
  packagingVnd?: number;
  otherVnd?: number;
}

export interface OutsourceLayerConfig extends OutsourceExtraFees {
  filmSource: OutsourceFilmSource;
  wastePct?: number;
  wasteSetupM?: number;
  gcPricePerM2?: number;
  filmBuyPricePerM2?: number;
}

export interface OutsourceConfig {
  steps: OutsourceStep[];
  print?: OutsourceLayerConfig;
  laminate?: {
    layers: Partial<Record<'layer2' | 'layer3' | 'layer4' | 'layer5', OutsourceLayerConfig>>;
  } & OutsourceExtraFees;
  slit?: { wastePct: number; wasteSetupM: number; gcPricePerM2: number } & OutsourceExtraFees;
  bag?: {
    wastePct: number;
    wasteSetupM: number;
    gcPricePerBag: number;
    zipperMode?: 'included' | 'excluded';
    /** VNĐ/m — dùng khi zipperMode = excluded */
    zipperPricePerM?: number;
    tapeMode?: 'included' | 'excluded';
    /** VNĐ/m — dùng khi tapeMode = excluded */
    tapePricePerM?: number;
  } & OutsourceExtraFees;
  handle?: { wastePct: number; gcPricePerBag: number; handleUnitPrice: number } & OutsourceExtraFees;
  pp_bag?: { variant: 'pp' | 'pp_pe'; wastePct: number; wasteSetupM: number; gcPricePerUnit: number; ppMaterialPricePerUnit?: number } & OutsourceExtraFees;
}

export interface CalculateInput {
  customer: string;
  productName: string;
  productCode?: string;
  productType: string;
  bagType: string;
  filmType: string;
  filmQuantityUnit?: 'm2' | 'meter'; // đơn vị nhập SL màng; engine vẫn nhận quantity là m²
  filmInputQuantity?: number; // SL màng gốc user nhập
  filmRollLength: number; // chiều dài mỗi cuộn màng thành phẩm (m), chỉ dùng khi productType='mang'
  quantity: number;
  numColors: number | null;
  numImages: number;
  hasDivide?: boolean;
  originalWidthMm?: number;
  divideWidthMm?: number;
  divideElements?: number;
  printFilmCustomerGroup?: 'normal' | 'large';
  layer1Id?: string | null;
  layer2Id?: string | null;
  layer2AltId?: string | null;
  layer2Lengths?: { mat1: number; mat2: number };
  layer2FrontPart?: 'main' | 'alt';
  layer2PairingMode?: 'bottom_to_bottom' | 'front_to_front';
  layer3Id?: string | null;
  layer4Id?: string | null;
  layer5Id?: string | null;
  spreadWidth: number;
  cutStep: number;
  metallicSurcharge: number;
  selectedPrintSurchargeKeys?: string[];
  coverageRatio: number;
  handleWeight: number;
  zipperWeight: number;
  tapeWeight: number;
  hasZipper: boolean;
  hasTape: boolean;
  hasHandle: boolean;
  handleOptionKey?: HandleOptionKey | 'custom' | null;
  paymentDays: number;
  // paymentInterestRate đã bỏ — lãi suất nay lấy từ AppConstants (interestBase + interestSpread)
  profitColumn: number;
  commissionRate: number;
  commissionFixedVND: number;
  commissionUnit: 'percent' | 'vnd';
  commissionInputValue: number;
  bagsPerBox: number;
  boxPrice: number;
  boxWeight?: number;
  boxOptionKey?: BoxOptionKey | 'custom' | null;
  shippingPerKm: number;
  shippingKm: number;
  cylLength: number;
  cylCircum: number;
  cylUnitPrice: number;
  cylType: string; // loại trục: 'A', 'B', custom key, hoặc 'custom' (tự nhập)
  cylIncluded: boolean;           // true = bao trục (phân bổ vào đơn giá), false = tách riêng
  targetThickness?: number;
  autoOptimizeThickness?: boolean; // tự động tối ưu độ dày (ưu tiên thấp nhất thỏa ±5 mic)
  micOverrides?: Record<string, number>;
  multiStructureLayers?: Record<string, string[]>;
  chotGia?: number;
  phanBoCongTy?: number;
  donViPhanBo?: 'vnd' | 'percent';
  pricingMode?: PricingMode;
  outsource?: OutsourceConfig;
}

// ── Quote Status (luồng báo giá local + server) ──────────────────────────────
// Server chi co 4 trang thai: draft | submitted | approved | rejected (xem
// backend/src/quotations/quotation_status.ts va schema.prisma).
//
// 4 gia tri local-only (sent/cancelled/completed/expired) la cac trang thai
// lifecycle cua luong local-engine: "gui cho khach", "huy", "da tao LSX",
// "het han". Chung KHONG dong bo len server; chi dung cho UI va store local.
//
// Khi goi server (submit/duyet/tao/sua), luon mapping ve 4 gia tri server
// qua `quoteStatusToServer` trong lib/api/service-lts.ts.
export type QuoteStatus =
  | 'drafted'
  | 'pending_approval'  // local: mapping sang 'submitted' khi goi server
  | 'approved'
  | 'sent'              // local-only: "da gui cho khach"
  | 'rejected'
  | 'cancelled'         // local-only: "da huy"
  | 'completed'         // local-only: "da tao LSX"
  | 'expired';          // local-only: "het han"

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  step: number;
  description: string;
}> = {
  drafted:          { label: 'Khởi tạo',        shortLabel: 'Khởi tạo',  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', step: 1, description: 'Báo giá đang được soạn' },
  pending_approval: { label: 'Chờ duyệt',        shortLabel: 'Chờ duyệt',  color: '#d97706', bg: 'rgba(217,119,6,0.1)',   step: 2, description: 'Đang chờ phê duyệt nội bộ' },
  approved:         { label: 'Đã duyệt',         shortLabel: 'Đã duyệt',   color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   step: 3, description: 'Admin đã duyệt báo giá' },
  sent:             { label: 'Đã gửi khách',     shortLabel: 'Đã gửi',     color: '#4f46e5', bg: 'rgba(79,70,229,0.1)',   step: 4, description: 'Đã gửi báo giá cho khách hàng' },
  rejected:         { label: 'Bị từ chối',       shortLabel: 'Từ chối',    color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   step: -1, description: 'Báo giá bị từ chối hoặc trả về' },
  cancelled:        { label: 'Đã hủy',           shortLabel: 'Hủy',        color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', step: -2, description: 'Báo giá đã bị hủy' },
  completed:        { label: 'Đã chốt đơn SX',   shortLabel: 'Chốt SX',    color: '#059669', bg: 'rgba(5,150,105,0.1)',   step: 5, description: 'Khách hàng đã chốt đơn sản xuất' },
  expired:          { label: 'Hết hạn',          shortLabel: 'Hết hạn',    color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', step: -3, description: 'Báo giá đã hết hiệu lực' },
};
// ── Override Tables (Bảng 2 & 3 — Sale nhập / Admin nhập) ────────────────────
export type OverrideRowKey = 'print' | 'lam-2' | 'lam-3' | 'lam-4' | 'lam-5' | 'cut';

export interface OverrideFields {
  stage?: string;
  mat?: string;
  materialId?: string;
  width?: number;
  meters?: number;
  waste?: number;
  inputVL?: number;
  cpsx?: number;
  costCPSX?: number;
  matPrice?: number;
  costMat?: number;
  rawMatPrice?: number;
  detailOverrides?: Record<number, { width?: number; matPrice?: number; rawMatPrice?: number; materialId?: string; materialName?: string }>;
}
export type OverrideTable = Partial<Record<OverrideRowKey, Partial<OverrideFields>>>;

// ── Audit Log ─────────────────────────────────────────────────────────────────
export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'lock' | 'unlock'
  | 'status_change' | 'override_change'
  | 'assign' | 'version_restore' | 'duplicate'
  | 'send_approval' | 'approve' | 'reject' | 'send_customer' | 'create_lsx' | 'restore';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  targetType: 'history' | 'quote' | 'customer' | 'order' | 'config' | 'permission';
  targetId: string;
  targetName?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  note?: string;
  ipAddress?: string;
  device?: string;
}

export type ConfigScope =
  | 'materials'    // Vật tư: materials + smallWidthPrices
  | 'production'   // Chi phí SX: laborCost, ghep, cat, trục, mực
  | 'profit'       // Biên lợi nhuận: profitTable
  | 'surcharges'   // Phụ phí: phụ kiện, thùng
  | 'interest'     // Lãi vay: interestBase, interestSpread
  | 'waste'        // Hao hụt: printWaste, ghepWaste, cutWaste
  | 'outsource';   // Gia công ngoài (dự phòng)

export interface ConfigSnapshot {
  id: string;
  scope: ConfigScope;
  name?: string;
  effectiveMode: 'date' | 'month';
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
  materials: Material[];
  smallWidthPrices: SmallWidthMaterialPrice[];
  constants: AppConstants;
  profitTable: ProfitRow[];
}

// ── Versioning ────────────────────────────────────────────────────────────────
export interface VersionSnapshot {
  id: string;
  historyItemId: string;
  timestamp: string;
  userId: string;
  userName: string;
  label?: string;
  data: HistoryItem;
}

// ── Quote Code ────────────────────────────────────────────────────────────────
export interface QuoteCodeConfig {
  prefix: string;
  currentMonth: string;
  counter: number;
}

// ── VAT & Điều khoản báo giá ─────────────────────────────────────────────────
export interface QuoteTerms {
  vatRate: number;
  vatCustom?: number;
  vatCylinderRate?: number;
  validityDays: number;
  paymentTerms: string;
  deliveryTime: string;
  deliveryAddress?: string;
  notes: string;
  quantityTolerance?: number;
  techRequirement?: string;
}

// ── Multi-tier (nhiều mốc số lượng) ──────────────────────────────────────────
export interface QuoteTier {
  historyItemId: string;
  quantity: number;
  finalPrice: number;
  chotGia?: number;
  profitRate?: number;
}

export interface QuoteProductLine {
  sourceHistoryItemId: string;
  productName: string;
  structure: string;
  quantity: number;
  finalPrice: number;
  chotGia?: number;
  profitRate?: number;
  input: CalculateInput;
  bagSpec?: {
    bagType: string;
    widthMm: number;
    lengthMm: number;
    sideSealMm: number;
    hasHeadSeal: boolean;
    headSealMm: number;
    gussetMm: number;
    backSealMm: number;
    hasZipper: boolean;
    zipperDistanceMm: number;
    standupBottomSideMm: number;
    hasTearNotch: boolean;
    tearNotchFromTopMm: number;
    tearNotchFromBottomMm: number;
    hasHalfMoonBottom: boolean;
    hasHangHole: boolean;
    hangHoleDescription: string;
    hasHandleHole: boolean;
    handleHoleDescription: string;
    hasBottomSeal: boolean;
    bottomSealMm: number;
    lidMm: number;
    hasCylinder: boolean;
    cylinderQuantity: number;
    cylinderUnitPrice: number;
    otherDescription: string;
    structureBack: string;
    structureSwapped: boolean;
    hasStructureBack: boolean;
    bottomFollows: 'front' | 'back';
    hasHandle: boolean;
    handleOptionKey: string;
  };
  tiers: QuoteTier[];
}

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
  profitRate?: number;
  quoteStatus?: QuoteStatus;
  quoteCode?: string;
  isQuote?: boolean;
  sellerId?: string;
  sellerName?: string;
  saleOverrides?: OverrideTable;
  adminOverrides?: OverrideTable;
  saleProfitRatePct?: number;
  adminProfitRatePct?: number;
  locked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
  terms?: QuoteTerms;
  tiers?: QuoteTier[];
  quoteProducts?: QuoteProductLine[];
  validUntil?: string;
  quotationId?: string;      // ID của quotation trên server (nếu đã sync)
  pricingSheetId?: string;    // ID của pricing sheet trên server (nếu đã sync)
  priceConfigIds?: string[];   // IDs của price config đã link trên server
  originalCustomer?: string;  // Mã khách hàng gốc khi load từ lịch sử (để so sánh)
  deletable?: boolean;        // Cho phép xóa trên server (từ Original.deletable)
  canUpdate?: boolean;        // Cho phép cập nhật trên server (từ Original.canUpdate)
  canAdminUpdate?: boolean;   // Cho phép admin cập nhật trên server (từ Original.canAdminUpdate)
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
  printFilmCost?: number;
  printFilmSetupHours?: number;
  printFilmProductionHours?: number;
  printFilmTotalHours?: number;
  printFilmLaborCostPerHour?: number;
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
  /** Phụ phí GC / đơn vị (đã × (1+LN+r)) */
  gcShippingPerUnit?: number;
  gcPackagingPerUnit?: number;
  gcOtherPerUnit?: number;
  gcShippingTotal?: number;
  gcPackagingTotal?: number;
  gcOtherTotal?: number;
  shippingRate: number;
  actualShippingPerKm: number;
  actualShippingKm: number;
  interestPerUnit: number;
  interestBase: number;    // lãi cơ sở (% / năm)
  interestSpread: number;  // lãi thêm (% / năm)
  paymentDays: number;
  commissionPerUnit: number;
  finalPrice: number;
  cylinderCost: number;
  cylinderCostPerUnit: number;
  cylAllocPerUnit: number;  // chi phí trục phân bổ vào đơn giá (> 0 khi cylIncluded=true)
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

// ── LSX Source Data (dữ liệu đầu vào cho Modal LSX) ─────────────────────────
export interface LsxSourceData {
  id: string;
  customer: string;
  productName: string;
  structure: string;
  finalPrice: number;
  chotGia?: number;
  input: CalculateInput;
  /** Từ bagSpec báo giá — prefill khuôn đáy bán nguyệt trên LSX */
  hasHalfMoonBottom?: boolean;
  /** Kích thước thành phẩm túi từ bagSpec báo giá (không phải khổ trải/bước cắt). */
  bagWidthMm?: number;
  bagLengthMm?: number;
  /** Mặt nào đi cùng đáy và trạng thái đảo mặt từ bagSpec báo giá. */
  bottomFollows?: 'front' | 'back';
  structureSwapped?: boolean;
}

// ── Production Order (Lệnh Sản Xuất) ─────────────────────────────────────────
export type LSXStatus = 'created' | 'in_production' | 'completed' | 'cancelled';

export const LSX_STATUS_CONFIG: Record<LSXStatus, {
  label: string;
  color: string;
  bg: string;
}> = {
  created:       { label: 'Mới tạo',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  in_production: { label: 'Đang SX',     color: '#d97706', bg: 'rgba(217,119,6,0.1)'   },
  completed:     { label: 'Hoàn thành',  color: '#059669', bg: 'rgba(5,150,105,0.1)'   },
  cancelled:     { label: 'Đã huỷ',      color: '#dc2626', bg: 'rgba(220,38,38,0.1)'   },
};

export interface LSXManualFields {
  // Chung (cả màng và túi)
  lsxNumber: string;            // Số LSX (auto-generated, có thể sửa)
  issuedDate: string;           // Ngày xuống LSX (dd/mm/yyyy)
  preparedBy: string;           // Người lập
  approvedBy: string;           // Người duyệt
  deliveryDate: string;         // Ngày giao hàng yêu cầu
  notes: string;                // Ghi chú chung

  // Thông tin sản phẩm bổ sung
  msp: string;                  // Mã sản phẩm (vd: TP_077020TU)
  tenSP: string;                // Tên sản phẩm (vd: TÚI GẠO THƠM SUM VẦY 5KG)
  maMucNhu: string;             // Mã mực nhủ (vd: Q-Chromax Pet GD-Z07)
  quyCachNote: string;          // Quy cách chi tiết (vd: R:250mm x D:500mm (±2mm))
  quyCachCuon: string;          // Quy cách cuộn (vd: "K500mm x 1000m") — chỉ dùng cho màng
  chieuRaCuonSP: string;        // Chiều ra cuộn (section thông tin SP) — chỉ dùng cho màng
  soLuongDHNote: string;        // Ghi chú số lượng đơn hàng (vd: 5.400 túi -6.000 túi)
  quantityTolerancePercent?: number; // Dung sai số lượng đơn hàng (%)
  quyCachToleranceWidthMm?: number;  // Dung sai chiều rộng quy cách (mm)
  quyCachToleranceLengthMm?: number; // Dung sai chiều dài quy cách (mm)

  // Máy In
  printFilmName: string;        // Tên màng in
  printWastePercent: number;    // Định mức phi hao in (m)
  printProductQty: number;      // Thành phẩm in (m²)
  numCylinders: number;         // Số trục
  cylDiameter: number;          // Đường kính trục (mm) — hiện trên form: D:760
  cylWidth: number;             // Chiều dài trục (mm) — hiện: × 600mm
  rollOutWidth: number;         // Chiều ra cuộn sau in (mm)
  materialQtySupplied: number;  // Số lượng cấp VT (m)
  printNotes: string;           // Ghi chú máy in
  cylInfo: string;              // Trục in (vd: "23/3 vế")
  printDirection: string;       // Chiều in (vd: "Đầu chữ ra trước")
  printMST: string;             // MST trục in
  printProductUnit: string;     // Đơn vị thành phẩm in (vd: "MD", "M²")

  // Máy Chia
  divideWidth: number;          // Khổ chia (mm)
  rollLength: number;           // Chiều dài quấn cuộn (m)
  divideRollOutWidth: number;   // Chiều ra cuộn sau chia (mm)
  divideDeliveryReq: string;    // Yêu cầu giao hàng máy chia
  divideNotes: string;          // Ghi chú máy chia

  // Máy Ghép (chỉ túi)
  laminateFilm1: string;        // Màng ghép (tên/mã, vd: I.LDPE130)
  laminateFilm1Width: number;   // Khổ màng ghép (mm)
  lamWaste: number;             // Định mức phù hao ghép lần 1 (m) — legacy
  lamProductQty: number;        // Thành phẩm ghép (m²)
  lamBTP: number;               // BTP (m)
  laminateFilm2: string;        // Màng ghép 2 (legacy string)
  laminateNotes: string;        // Ghi chú máy ghép
  lamMaterialSupplyQty: string; // Số lượng cấp vật tư (text)
  lamProductUnit: string;       // Đơn vị thành phẩm ghép (vd: "MD")
  lamBTPNote: string;           // Ghi chú BTP (vd: "ghép hết BTP in 3.300m")
  /** Các lớp ghép động (L2…Ln); mỗi phần tử 1 dòng form. Dual-structure: nhiều parts. */
  laminateLayers?: Array<{
    layerIndex: number;
    label: string;
    parts: Array<{ name: string; widthMm: number }>;
    wasteMeters: number;
  }>;
  /** Số phần tử chia (sửa trên form LSX). */
  divideElements?: number;
  /** Khổ riêng từng phần tử (mm); không có nghĩa là dùng chia đều legacy. */
  divideWidths?: number[];


  // Phần giữa — SL đóng gói & yêu cầu giao hàng
  packagingInfo: string;        // Thông tin đóng gói (vd: "2 cái × 4.000 túi")
  packagingNotes: string;       // Ghi chú đóng gói (vd: "Đón băng: Không được thiếu")
  deliveryNotes: string;        // Yêu cầu giao hàng (vd: "PHÁT HIỆN LỖI BÁO CẤP TRÊN ĐỂ...")

  // Máy Làm Túi (chỉ túi)
  sealEdge: string;             // Dán biên
  foldBottom: string;           // Xếp đáy / Hàn đáy
  tearNotch: string;            // Nhấn xé vở
  hanTruoc: number;             // Hàn trước (mm)
  hanSau: number;               // Hàn sau (mm)
  hanBien: number;              // Hàn biên (mm)
  hanDau: number;               // Hàn đáu (mm)
  xepHong: number;              // Xếp hông (mm)
  holePunchInfo: string;        // Đục lỗ (vd: "Đục 3 lỗ trên quai xách (Theo Market)")
  ventHoleInfo: string;         // Lỗ thông hơi (vd: "6 lỗ/mặt: Ø1mm")
  bagWasteMeters: number;       // Định mức phi hao máy túi (m)
  bagLuuY: string;              // Lưu ý máy túi
  useSemicircularMold: boolean; // Dùng khuôn đáy bán nguyệt
  useDualCutter: boolean;       // Dùng dao cắt 2 nhịp
  bagMachineWaste: number;      // Định mức phi hao máy túi (%)
  bagDeliveryReq: string;       // Yêu cầu giao hàng
  bagMachineNotes: string;      // Ghi chú máy làm túi

  // Field mới cho 8 kiểu túi LSX (Section 13)
  tamZipperCachMieng: number;   // Tâm zipper cách miệng (mm) — zipper cắt seal, đáy đứng
  loTreoInfo: string;           // Lỗ treo (text) — zipper cắt seal
  danLung: number;              // Dán lưng (mm) — dán lưng giữa
  danLungLech: number;          // Dán lưng lệch (mm) — xếp hông lưng lệch
  danDay: number;               // Dán đáy (mm) — xếp hông lưng lệch
  nap: number;                  // Nắp (mm) — cắt seal nắp băng keo
  songSieuAm: number;           // Sóng siêu âm (mm) — cắt seal nắp băng keo
  docQuaiXach: boolean;         // Đọc quai xách — cắt seal nắp băng keo
  danKeoNap: boolean;           // Dán keo nắp — cắt seal nắp băng keo

  lsxBagTypeOverride?: string;  // Admin override kiểu túi LSX
}

export interface ProductionOrder {
  id: string;                   // Auto: "LSX-YYYYMMDD-XXX"
  quoteId: string;              // ID của HistoryItem gốc
  createdAt: string;            // ISO timestamp
  status: LSXStatus;
  manual: LSXManualFields;      // Các trường admin điền tay
  // Snapshot dữ liệu báo giá tại thời điểm tạo LSX (immutable)
  snapshot: {
    customer: string;
    productName: string;
    productType: string;        // 'tui' | 'mang'
    structure: string;
    quantity: number;
    spreadWidth: number;        // Khổ trải (m → hiển thị mm)
    cutStep: number;            // Bước cắt (m → hiển thị mm)
    /** Rộng/dài thành phẩm từ bagSpec báo giá; optional để đọc LSX legacy. */
    bagWidthMm?: number;
    bagLengthMm?: number;
    bottomFollows?: 'front' | 'back';
    structureSwapped?: boolean;
    numColors: number | null;
    bagType: string;
    hasZipper: boolean;          // Có zipper hay không (để phân loại LSX khi export)
    hasDivide: boolean;          // Báo giá bật "Có chia" → hiện MÁY CHIA trên LSX
    divideWidthMm?: number;      // Khổ chia từ báo giá (mm)
    originalWidthMm?: number;    // Khổ màng (mm) = spreadWidth×1000; giữ field cho LSX/legacy
    numImages?: number;          // Số con hình
    cylLength: number;          // Chiều dài trục (m)
    cylCircum: number;          // Chu vi trục (m)
    filmRollLength: number;     // Chiều dài cuộn màng (m)
    layer1Name: string;         // Tên vật liệu lớp 1 (in)
    layer2Name: string;
    layer3Name: string;
    layer4Name: string;
    layer5Name: string;
    chotGia: number;            // Giá chốt hoặc finalPrice
    totalArea: number;          // Tổng diện tích đơn hàng (m²)
  };
}
