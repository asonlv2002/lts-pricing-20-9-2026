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
  pricePerKg: number;
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
  coverageRatio: number;
  handleWeight: number;
  zipperWeight: number;
  tapeWeight: number;
  hasZipper: boolean;
  hasTape: boolean;
  hasHandle: boolean;
  paymentDays: number;
  // paymentInterestRate đã bỏ — lãi suất nay lấy từ AppConstants (interestBase + interestSpread)
  profitColumn: number;
  commissionRate: number;
  commissionFixedVND: number;
  commissionUnit: 'percent' | 'vnd';
  commissionInputValue: number;
  bagsPerBox: number;
  boxPrice: number;
  shippingPerKm: number;
  shippingKm: number;
  cylLength: number;
  cylCircum: number;
  cylUnitPrice: number;
  cylType: 'A' | 'B' | 'custom'; // loại trục: A (7.3tr), B (6.5tr), hoặc tự nhập
  cylIncluded: boolean;           // true = bao trục (phân bổ vào đơn giá), false = tách riêng
  targetThickness?: number;
  autoOptimizeThickness?: boolean; // tự động tối ưu độ dày (ưu tiên thấp nhất thỏa ±5 mic)
  micOverrides?: Record<string, number>;
  multiStructureLayers?: Record<string, string[]>;
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
  lamWaste: number;             // Định mức phù hao ghép (m)
  lamProductQty: number;        // Thành phẩm ghép (m²)
  lamBTP: number;               // BTP (m)
  laminateFilm2: string;        // Chi tiết phụ (vd: I.LDPE130-K640)
  laminateNotes: string;        // Ghi chú máy ghép
  lamMaterialSupplyQty: string; // Số lượng cấp vật tư (text)
  lamProductUnit: string;       // Đơn vị thành phẩm ghép (vd: "MD")
  lamBTPNote: string;           // Ghi chú BTP (vd: "ghép hết BTP in 3.300m")

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
    numColors: number | null;
    bagType: string;
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
