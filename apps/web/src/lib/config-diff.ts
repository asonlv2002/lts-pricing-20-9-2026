import type {
  AppConstants,
  Material,
  ProfitRow,
  SmallWidthMaterialPrice,
  BoxOption,
  HandleOption,
  CutRule,
  PrintFilmProfitRate,
  CylType,
  CustomAccessory,
  PrintSurchargeOption,
  ElectricTimeSlot,
  CpsxElectricMachine,
  CpsxUpgradeElectric,
  CpsxUpgradeLabor,
  CpsxUpgradeLabor1May,
  CpsxUpgradeLaborTui,
  CpsxUpgradeInk,
  MucInTable,
  MucInRow,
  KeoTable,
  KeoRow,
  SolventAdhesiveTable,
  SolventAdhesiveRow,
  DinhMucInRow,
  DinhMucGhep,
  CpsxThoiGianMayIn,
  CpsxThoiGianMayGhep,
  CpsxThoiGianRule,
  CpsxThoiGianMayChia,
  CpsxTuiSetupRule,
  CpsxTuiSpeedRule,
  CpsxThoiGianMayTui,
  CpsxUpgradeThoiGian,
} from "./types";

// ── Bảng nhãn configName → tiếng Việt ─────────────────────────────────────
export const NHAN_CONFIG_NAME: Record<string, string> = {
  MATERIALS: "Vật liệu",
  PRODUCTION: "Chi phí sản xuất",
  PRODUCTION_UPGRADE: "Chi phí sản xuất (nâng cấp)",
  PROFIT: "Lợi nhuận",
  SURCHARGES: "Phụ phí",
  INTEREST: "Lãi vay",
  WASTE: "Hao hụt",
  OUTSOURCE: "Gia công ngoài",
};

// ── Bảng nhãn trường — ép phủ 100% key schema (thiếu/thừa = fail tsc) ──────
type KhoaNhan =
  | keyof AppConstants
  | keyof Material
  | keyof ProfitRow
  | keyof SmallWidthMaterialPrice
  | keyof BoxOption
  | keyof HandleOption
  | keyof CutRule
  | keyof PrintFilmProfitRate
  | keyof CylType
  | keyof CustomAccessory
  | keyof PrintSurchargeOption
  | keyof ElectricTimeSlot
  | keyof CpsxElectricMachine
  | keyof CpsxUpgradeElectric
  | keyof CpsxUpgradeLabor
  | keyof CpsxUpgradeLabor1May
  | keyof CpsxUpgradeLaborTui
  | keyof CpsxUpgradeInk
  | keyof MucInTable
  | keyof MucInRow
  | keyof KeoTable
  | keyof KeoRow
  | keyof SolventAdhesiveTable
  | keyof SolventAdhesiveRow
  | keyof DinhMucInRow
  | keyof DinhMucGhep
  | keyof CpsxThoiGianMayIn
  | keyof CpsxThoiGianMayGhep
  | keyof CpsxThoiGianRule
  | keyof CpsxThoiGianMayChia
  | keyof CpsxTuiSetupRule
  | keyof CpsxTuiSpeedRule
  | keyof CpsxThoiGianMayTui
  | keyof CpsxUpgradeThoiGian
  // Key riêng của blob inputValue (không thuộc type ở trên)
  | "materials"
  | "smallWidthPrices"
  | "profitTable";

export const NHAN_TRUONG_CAU_HINH: Record<KhoaNhan, string> = {
  // Key gốc của blob cấu hình
  materials: "Vật liệu",
  smallWidthPrices: "Giá khổ nhỏ",
  profitTable: "Bảng lợi nhuận",
  // Material / SmallWidthMaterialPrice
  id: "Mã",
  name: "Tên màng",
  group: "Nhóm vật liệu",
  density: "Tỉ trọng (g/cm³)",
  thickness: "Độ dày (mic)",
  pricePerKg: "Giá (₫/kg)",
  isPETorPA: "isPETorPA",
  adjustableMic: "Cho chỉnh mic",
  rollLength: "Chiều dài cuộn (m)",
  inkPricePerColor: "Giá mực mỗi màu (₫)",
  pricePerM2: "Giá (₫/m²)",
  materialId: "Mã vật liệu",
  widthThresholdMm: "Ngưỡng khổ (mm)",
  // ProfitRow
  threshold: "Ngưỡng (₫)",
  col1: "Cột 1 (%)",
  col2: "Cột 2 (%)",
  largeCol1: "Cột 1 khách lớn (%)",
  largeCol2: "Cột 2 khách lớn (%)",
  // Option / rule chung (BoxOption, HandleOption, CylType, CutRule, CustomAccessory, PrintSurchargeOption)
  key: "Khóa",
  label: "Tên",
  price: "Giá (₫)",
  weight: "Trọng lượng (g)",
  unit: "Đơn vị",
  multiplier: "Hệ số",
  // PrintFilmProfitRate
  customerGroup: "Nhóm khách hàng",
  colorFrom: "Số màu từ",
  colorTo: "Số màu đến",
  rate: "Tỷ lệ",
  // ElectricTimeSlot
  start: "Giờ bắt đầu",
  end: "Giờ kết thúc",
  hours: "Thời lượng (giờ)",
  pricePerKwh: "Giá (₫/kWh)",
  // AppConstants — materials scope
  zipperPrice: "Giá Zipper (₫/m)",
  zipperWeight: "Trọng lượng Zipper (g/m)",
  // production
  laborCost: "Lao động CPSX (₫/m²)",
  ghepCPSX: "Ghép · CPSX (₫/m²)",
  cutBase: "Cắt · Giá cơ bản (₫/m)",
  cutThreshold1: "Cắt · Ngưỡng 1 (m)",
  cutThreshold2: "Cắt · Ngưỡng 2 (m)",
  cutMult1: "Cắt · Hệ số 1",
  cutMult2: "Cắt · Hệ số 2",
  cutMult3: "Cắt · Hệ số 3",
  cutRules: "Quy tắc cắt",
  cylinderPricePerUnit: "Đơn giá trục mặc định (₫)",
  cylPriceA: "Trục A (₫)",
  cylPriceB: "Trục B (₫)",
  nhuPrice: "Giá nhũ (₫/m²)",
  moPrice: "Giá phủ mờ (₫/m²)",
  colorSetup: "Giá in theo số màu",
  // surcharges
  tapePrice: "Giá băng keo (₫/m)",
  tapeWeight: "Trọng lượng băng keo (g/m)",
  handlePrice: "Giá quai mặc định (₫/cái)",
  handleWeight: "Trọng lượng quai (g)",
  handleOptions: "Loại quai",
  boxPriceDefault: "Giá thùng mặc định (₫/cái)",
  bagsPerBoxDefault: "Số túi/thùng mặc định",
  boxOptions: "Loại thùng",
  shippingPerKmDefault: "Vận chuyển (₫/km)",
  shippingKmDefault: "Vận chuyển · Km mặc định",
  // interest
  interestBase: "Lãi cơ bản (%/năm)",
  interestSpread: "Lãi thêm/tình huống (%/năm)",
  paymentDays: "Công nợ mặc định (ngày)",
  customPaymentDays: "Mốc công nợ thêm (ngày)",
  // waste
  printWasteA: "In · Hao hụt A",
  printWasteB: "In · Hao hụt B",
  printWasteC: "In · Hao hụt C",
  printWasteD: "In · Hao hụt D",
  ghepWasteA: "Ghép · Hao hụt A (m)",
  ghepWasteB: "Ghép · Hao hụt B (m/20m)",
  ghepWasteC: "Ghép · Hao hụt cố định (m)",
  cutWasteA: "Cắt · Hao hụt A (m)",
  cutWasteB: "Cắt · Hao hụt B (m/20m)",
  cutWasteC: "Cắt · Hao hụt cố định (m)",
  // mục in màng (printFilm*)
  printFilmInkPriceBopp: "Mục in màng · Mực BOPP (₫/m²)",
  printFilmInkPriceOther: "Mục in màng · Mực other (₫/m²)",
  printFilmSetupMinutesPerColor: "Mục in màng · Setup/màu (phút)",
  printFilmSetupHourDivisor: "Mục in màng · Chia giờ setup",
  printFilmLengthThreshold: "Mục in màng · Ngưỡng chạy chậm (m)",
  printFilmShortRunSpeed: "Mục in màng · Tốc độ chạy chậm (m/phút)",
  printFilmLaborCostPerHour: "Mục in màng · Lao động (₫/giờ)",
  printFilmShippingThresholdM2: "Mục in màng · Vận chuyển · Ngưỡng (m²)",
  printFilmShippingBaseCost: "Mục in màng · Vận chuyển · Cơ bản (₫)",
  printFilmShippingLargeOrderM2: "Mục in màng · Vận chuyển · Đơn lớn (m²)",
  printFilmInterestRate: "Mục in màng · Lãi vay (%)",
  printFilmProfitRates: "Lợi nhuận màng in",
  // danh sách tùy chọn
  customCylTypes: "Loại trục tùy chọn",
  customAccessories: "Phụ kiện tùy chọn",
  customPrintSurcharges: "Phụ phí in tùy chọn",
  // CPSX nâng cao — nhóm gốc
  cpsxUpgradeElectric: "Điện",
  cpsxUpgradeLabor: "Lương",
  cpsxUpgradeInk: "Mực",
  cpsxUpgradeThoiGian: "Thời gian SX",
  // Điện
  slots: "Khung giờ",
  appliedSource: "Nguồn giá",
  appliedPricePerKwh: "Giá áp dụng (₫/kWh)",
  machines: "Máy",
  print: "Máy in",
  laminate: "Máy ghép",
  slit: "Máy chia (tách)",
  bag: "Máy làm túi",
  powerKw: "Công suất (kW)",
  efficiency: "Hiệu suất",
  // Lương
  wages: "Bảng lương (₫/ca)",
  mealMorning: "Cơm sáng (₫/người)",
  mealEvening: "Cơm tối (₫/người)",
  otFactor: "Hệ số tăng ca",
  shiftCount: "Số ca",
  peoplePerShift: "SL người/ca",
  machinesPerDay: "Số máy/ngày",
  hoursPerDay: "Giờ máy/ngày",
  otHours: "Giờ tăng ca",
  tyLeTangCa: "Tỉ lệ CN tăng ca",
  roundedPerMin: "Giá làm tròn (₫/phút)",
  mayTinh: "Máy tính tham khảo",
  // Mực
  opp: "Mực OPP",
  pet: "Mực PET",
  pe: "Mực PE",
  solventAdhesive: "Dung môi & keo ghép",
  dungMoi: "Dung môi",
  keo: "Keo ghép",
  rows: "Danh sách dòng",
  appliedPrice: "Giá áp dụng (₫/kg)",
  ma: "Mã vật tư",
  ten: "Tên",
  dvt: "Đơn vị tính",
  donGia: "Đơn giá (₫)",
  slDung: "SL dùng",
  ghiChu: "Ghi chú",
  congDoan: "Công đoạn",
  loaiMangKeys: "Loại màng áp dụng",
  dinhMucIn: "Định mức in",
  dinhMucGhep: "Định mức ghép",
  soMau: "Số màu",
  dmMucG: "Định mức mực (g/m²)",
  dmDungMoiG: "Định mức dung môi (g/m²)",
  keoKhoG: "Keo khô (g/m²)",
  dungMoiPhaKeoG: "Dung môi pha keo (g/m²)",
  // Thời gian SX — máy in
  mountMinutesPerColor: "Lên trục (phút/màu)",
  proofMinutes1to7: "Duyệt mẫu 1-7 màu (phút)",
  proofMinutes8: "Duyệt mẫu 8 màu (phút)",
  matteExtraMinutes: "In phủ mờ thêm (phút)",
  avgSpeedMPerMin: "Tốc độ trung bình (m/phút)",
  // Thời gian SX — máy ghép
  setupFirstMinutes: "Setup lần đầu (phút)",
  setupNextMinutes: "Setup các lần sau (phút)",
  // Thời gian SX — máy chia
  rules: "Bảng rule",
  setupMinutes: "Setup (phút)",
  speedMPerMin: "Tốc độ (m/phút)",
  // Thời gian SX — máy làm túi
  maxStepMm: "Bước cắt tối đa (mm)",
  stepOp: "So sánh bước cắt",
  minStepMm: "Bước cắt tối thiểu (mm)",
  setupRules: "Bảng setup theo loại túi",
  speedRules: "Bảng tốc độ theo bước cắt",
};

// ── Format giá trị hiển thị (pre-format → chuỗi vi-VN) ────────────────────
const KHOA_PHAN_TRAM = new Set([
  "interestBase",
  "interestSpread",
  "printFilmInterestRate",
  "rate",
  "tyLeTangCa",
]);

const GIA_TRI_ENUM: Record<string, Record<string, string>> = {
  customerGroup: { normal: "Bình thường", large: "Khách lớn" },
  appliedSource: {
    average: "Trung bình cộng",
    weighted: "Trung bình trọng số",
    manual: "Nhập tay",
  },
  congDoan: { in: "In", ghep: "Ghép" },
  unit: { per_piece: "₫/cái", per_meter: "₫/m" },
  stepOp: { lte: "≤", gte: "≥", lt: "<", gt: ">" },
};

function dinhDangSo(n: number): string {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 6 });
}

function dinhDangPhanTram(n: number): string {
  const phanTram = n * 100;
  const lamTron = Math.round(phanTram * 100) / 100;
  return `${dinhDangSo(lamTron)}%`;
}

function dinhDangGiaTri(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") {
    if (KHOA_PHAN_TRAM.has(key)) return dinhDangPhanTram(value);
    return dinhDangSo(value);
  }
  if (typeof value === "string") {
    const enumMap = GIA_TRI_ENUM[key];
    if (enumMap && enumMap[value]) return enumMap[value];
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => dinhDangGiaTri(key, item)).join(", ");
  }
  return "(thông tin chi tiết)";
}

// ── Segment nhãn cho phần tử mảng ─────────────────────────────────────────
function layTenHienThiItem(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as Record<string, unknown>;
  for (const k of ["ten", "label", "name"]) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (typeof rec.customerGroup === "string" && rec.colorFrom != null) {
    const nhom =
      GIA_TRI_ENUM.customerGroup[rec.customerGroup] ?? rec.customerGroup;
    const tu = dinhDangSo(Number(rec.colorFrom));
    const den = rec.colorTo != null ? dinhDangSo(Number(rec.colorTo)) : tu;
    return `${nhom} · ${tu}-${den} màu`;
  }
  if (rec.soMau != null) return `Số màu ${dinhDangSo(Number(rec.soMau))}`;
  return null;
}

const KHOA_DINH_DANH = ["id", "ma", "key"] as const;

function layKhoaDinhDanh(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as Record<string, unknown>;
  for (const k of KHOA_DINH_DANH) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return `${k}:${v.trim()}`;
  }
  const ten = layTenHienThiItem(item);
  if (ten) return `ten:${ten}`;
  return null;
}

function segmentChoKey(key: string, chaKey: string | null): string {
  if (chaKey === "colorSetup" && /^\d+$/.test(key)) return `Màu in ${key}`;
  const nhan = NHAN_TRUONG_CAU_HINH as Record<string, string>;
  return nhan[key] ?? key;
}

// ── Two-sided walk ────────────────────────────────────────────────────────
const GIOI_HAN_PATH = 500;
const DA_XOA = "(đã xóa)";

/** Key meta của blob gốc — đã thể hiện ở dòng chính của log, không đưa vào diff. */
const KHOA_META_GOC = new Set(["name", "effectiveFrom", "effectiveMode"]);

function laDoiTuong(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function boKhoaMetaGoc(v: unknown): unknown {
  if (!laDoiTuong(v)) return v;
  const ketQua: Record<string, unknown> = {};
  for (const [k, giaTri] of Object.entries(v)) {
    if (!KHOA_META_GOC.has(k)) ketQua[k] = giaTri;
  }
  return ketQua;
}

function diChuyen(
  truoc: unknown,
  sau: unknown,
  path: string,
  chaKey: string | null,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  dem: { count: number },
): void {
  if (dem.count >= GIOI_HAN_PATH) return;

  // Hai mảng → ghép phần tử
  if (Array.isArray(truoc) && Array.isArray(sau)) {
    const tatCaObject = truoc.every(laDoiTuong) && sau.every(laDoiTuong);
    if (tatCaObject && truoc.length + sau.length > 0) {
      const mapTruoc = new Map<string, unknown>();
      truoc.forEach((item, i) => {
        mapTruoc.set(layKhoaDinhDanh(item) ?? `idx:${i}`, item);
      });
      const daDung: Set<number> = new Set();
      const ghep = (item: unknown, i: number) => {
        const khoa = layKhoaDinhDanh(item) ?? `idx:${i}`;
        const match = mapTruoc.get(khoa);
        if (match !== undefined) {
          truoc.forEach((t, ti) => {
            if (t === match) daDung.add(ti);
          });
        }
        const seg =
          layTenHienThiItem(item) ?? segmentChoKey(khoa.split(":")[0], chaKey);
        diChuyen(match, item, path ? `${path} · ${seg}` : seg, null, before, after, dem);
      };
      sau.forEach(ghep);
      truoc.forEach((item, i) => {
        if (daDung.has(i)) return;
        const seg = layTenHienThiItem(item) ?? `#${i + 1}`;
        diChuyen(item, undefined, path ? `${path} · ${seg}` : seg, null, before, after, dem);
      });
      return;
    }
    // Mảng primitive → so sánh nguyên mảng thành 1 dòng
    const khoaKey = chaKey ?? "";
    const chuoiTruoc = truoc.length ? dinhDangGiaTri(khoaKey, truoc) : DA_XOA;
    const chuoiSau = sau.length ? dinhDangGiaTri(khoaKey, sau) : DA_XOA;
    if (chuoiTruoc !== chuoiSau) {
      dem.count += 1;
      before[path] = chuoiTruoc;
      after[path] = chuoiSau;
    }
    return;
  }

  if (laDoiTuong(truoc) && laDoiTuong(sau)) {
    const keys = Array.from(
      new Set([...Object.keys(truoc), ...Object.keys(sau)]),
    );
    for (const k of keys) {
      // Key có ở blob cũ nhưng FE không còn gửi ở blob mới (nâng cấp schema,
      // tách scope...) — luôn là nhiễu, không phải thay đổi của user → bỏ.
      if (path === "" && truoc[k] !== undefined && sau[k] === undefined) {
        continue;
      }
      const seg = segmentChoKey(k, chaKey);
      diChuyen(truoc[k], sau[k], path ? `${path} · ${seg}` : seg, k, before, after, dem);
    }
    return;
  }

  // Leaf (hoặc 1 bên thiếu)
  const coTruoc = truoc !== undefined;
  const coSau = sau !== undefined;
  if (coTruoc === coSau && truoc === sau) return;

  const chuoiTruoc = coTruoc
    ? laDoiTuong(truoc) || Array.isArray(truoc)
      ? "(thông tin chi tiết)"
      : dinhDangGiaTri(chaKey ?? "", truoc)
    : DA_XOA;
  const chuoiSau = coSau
    ? laDoiTuong(sau) || Array.isArray(sau)
      ? "(thông tin chi tiết)"
      : dinhDangGiaTri(chaKey ?? "", sau)
    : DA_XOA;
  if (chuoiTruoc === chuoiSau) return;

  dem.count += 1;
  if (coTruoc) before[path] = chuoiTruoc;
  if (coSau) after[path] = chuoiSau;
  // Bị xóa: DiffView chế độ "giá trị mới" sẽ hiện "nhãn: (đã xóa)"
  if (coTruoc && !coSau) after[path] = DA_XOA;
}

/**
 * So sánh 2 blob cấu hình (inputValue) — trả về CHỈ các leaf khác nhau /
 * thêm mới / bị xóa. Key = nhãn tiếng Việt đầy đủ; value = chuỗi vi-VN.
 * Side bị xóa = "(đã xóa)"; side thêm mới = không có key (DiffView hiện "+").
 */
export function diffConfigBlobs(
  truoc: unknown,
  sau: unknown,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  if (truoc == null && sau == null) return { before, after };
  const dem = { count: 0 };
  diChuyen(
    boKhoaMetaGoc(truoc ?? {}),
    boKhoaMetaGoc(sau ?? {}),
    "",
    null,
    before,
    after,
    dem,
  );
  return { before, after };
}
