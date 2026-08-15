import type {
  CpsxUpgradeLabor,
  CpsxUpgradeLabor1May,
  CpsxUpgradeLaborTui,
} from './types';

/** Tổng lương pool */
export function tongLuong(wages: number[]): number {
  return wages.reduce((s, w) => s + (Number(w) || 0), 0);
}

/** SL người / ca (auto cho 1-máy: số CN ÷ số ca) */
export function soNguoiMoiCa1May(
  wages: number[],
  shiftCount: 1 | 2,
): number {
  if (shiftCount <= 0) return 0;
  return wages.length / shiftCount;
}

/** Số CN đếm theo dòng có lương > 0 (dùng cho tổng CN) */
export function soCongNhan(wages: number[]): number {
  return wages.filter((w) => (Number(w) || 0) > 0).length;
}

/** Tổng cơm (cả 2 buổi) cho 1 máy: (sáng + tối) × số CN ÷ 2 */
export function tienComMoiMay(
  mealMorning: number,
  mealEvening: number,
  soCN: number,
): number {
  const n = Math.max(0, Math.floor(Number(soCN) || 0));
  return ((Number(mealMorning) || 0) + (Number(mealEvening) || 0)) * n / 2;
}

/** Số giờ 1 ca — quy đổi lương giờ: lương 1 giờ = Tổng lương ÷ 8 */
export const SO_GIO_MOT_CA = 8;

/**
 * Tăng ca n giờ: (Tổng lương ÷ 8 × n) × hệ số × tỉ lệ CN tăng ca.
 * n = số giờ tăng ca (mặc định 4).
 */
export function tangCaTheoTongLuong(
  wages: number[],
  otFactor: number,
  tyLeTangCa = 1,
  otHours = 4,
): number {
  const tyLe = Math.max(0, Math.min(1, Number(tyLeTangCa) || 0));
  const n = Number(otHours) > 0 ? Number(otHours) : 0;
  return tongLuong(wages) / SO_GIO_MOT_CA * n * (Number(otFactor) || 0) * tyLe;
}

/** Phân bổ theo ca: tổng ÷ tổng CN × số CN 1 ca */
export function phanBoTheoCa(
  tong: number,
  tongCN: number,
  cn1Ca: number,
): number {
  if (tongCN <= 0) return 0;
  return (tong / tongCN) * cn1Ca;
}

// ── Làm túi ────────────────────────────────────────────────────────

/** Lương TB / ca (chia theo SL người mỗi ca, không theo wages.length) */
export function luongTbTui(
  wages: number[],
  peoplePerShift: number,
): number {
  const n = Math.max(0, Math.floor(Number(peoplePerShift) || 0));
  if (n === 0) return 0;
  return tongLuong(wages) / n;
}

/** Số công nhân thực tế (đếm dòng có lương > 0) */
export function soCongNhanTui(wages: number[]): number {
  return wages.filter((w) => (Number(w) || 0) > 0).length;
}

/** Tiền cơm ca sáng (Làm túi) = giá/người × số CN / 2 */
export function tienComSangTui(
  mealMorning: number,
  soCongNhan: number,
): number {
  const n = Math.max(0, Math.floor(Number(soCongNhan) || 0));
  return ((Number(mealMorning) || 0) * n) / 2;
}

/** Tiền cơm ca tối (Làm túi) = giá/người × số CN / 2 */
export function tienComToiTui(
  mealEvening: number,
  soCongNhan: number,
): number {
  const n = Math.max(0, Math.floor(Number(soCongNhan) || 0));
  return ((Number(mealEvening) || 0) * n) / 2;
}

/** Tiền cơm trung bình (Làm túi) = (cơm sáng + cơm tối) / số CN */
export function tienComTBTui(
  tienComSang: number,
  tienComToi: number,
  soCongNhan: number,
): number {
  const n = Math.max(0, Math.floor(Number(soCongNhan) || 0));
  if (n === 0) return 0;
  return ((Number(tienComSang) || 0) + (Number(tienComToi) || 0)) / n;
}

/** Tăng ca túi: (tổng lương ÷ 8 × n) × hệ số × tỉ lệ CN tăng ca */
export function tangCaTui(
  wages: number[],
  otFactor: number,
  tyLeTangCa = 1,
  otHours = 4,
): number {
  return tangCaTheoTongLuong(wages, otFactor, tyLeTangCa, otHours);
}

// ── ₫/phút (In/Ghép/Chia/Túi) ───────────────────────────────────────

/**
 * ₫/phút = (L + cơm + TC) ÷ giờ/ngày ÷ 60 — làm tròn nguyên ₫.
 *
 * Bỏ bước "÷ tổng CN × số CN 1 ca" (theo PM). `soCN` chỉ dùng cho tiền cơm:
 * mặc định đếm mọi dòng lương; Làm túi truyền số CN có lương > 0.
 * `otHours` = số giờ tăng ca (mặc định 4).
 */
export function luongMoiPhutTinh(
  wages: number[],
  hoursPerDay: number,
  mealMorning: number,
  mealEvening: number,
  otFactor: number,
  soCN?: number,
  tyLeTangCa = 1,
  otHours = 4,
): number {
  const gio = Number(hoursPerDay) > 0 ? Number(hoursPerDay) : 24;
  const n = soCN != null ? Math.max(0, Math.floor(Number(soCN))) : wages.length;
  const tong = tongLuong(wages)
    + tienComMoiMay(mealMorning, mealEvening, n)
    + tangCaTheoTongLuong(wages, otFactor, tyLeTangCa, otHours);
  return Math.round(tong / gio / 60);
}

/** Giá áp dụng: roundedPerMin nếu hợp lệ (> 0), ngược lại giá tính ra. */
export function luongMoiPhutAp(
  giaTinh: number,
  roundedPerMin: number | null | undefined,
): number {
  if (
    roundedPerMin == null ||
    !Number.isFinite(roundedPerMin) ||
    roundedPerMin <= 0
  ) {
    return giaTinh;
  }
  return roundedPerMin;
}

/**
 * Giá áp dụng cho Làm túi (nhiều máy): giá 1 máy (có thể đã làm tròn)
 * chia tiếp cho số máy hoạt động / ngày. Số máy ≤ 0 → coi như 1.
 */
export function luongMoiPhutTuiAp(
  giaTinh: number,
  roundedPerMin: number | null | undefined,
  machinesPerDay: number,
): number {
  const gia1May = luongMoiPhutAp(giaTinh, roundedPerMin);
  const may = Math.floor(Number(machinesPerDay));
  if (!Number.isFinite(may) || may <= 0) return gia1May;
  return Math.round(gia1May / may);
}

// ── Normalize ───────────────────────────────────────────────────────

export function chuanHoa1May(
  raw: Partial<CpsxUpgradeLabor1May> | undefined,
  fallback: CpsxUpgradeLabor1May,
): CpsxUpgradeLabor1May {
  const wages = Array.isArray(raw?.wages) ? raw!.wages!.map((w) => Number(w) || 0) : [];
  const shiftCount: 1 | 2 = raw?.shiftCount === 1 || raw?.shiftCount === 2
    ? raw.shiftCount
    : fallback.shiftCount;
  const roundedRaw = raw?.roundedPerMin;
  const rounded =
    roundedRaw == null || !Number.isFinite(Number(roundedRaw))
      ? null
      : Number(roundedRaw);
  return {
    wages: wages.length > 0 ? wages : [...fallback.wages],
    mealMorning:
      raw?.mealMorning != null
        ? Number(raw.mealMorning) || 0
        : fallback.mealMorning,
    mealEvening:
      raw?.mealEvening != null
        ? Number(raw.mealEvening) || 0
        : fallback.mealEvening,
    otFactor:
      Number(raw?.otFactor) > 0 ? Number(raw?.otFactor) : fallback.otFactor,
    shiftCount,
    peoplePerShift:
      raw?.peoplePerShift != null && Number(raw.peoplePerShift) > 0
        ? Math.floor(Number(raw.peoplePerShift))
        : fallback.peoplePerShift,
    machinesPerDay:
      Number(raw?.machinesPerDay) > 0
        ? Math.floor(Number(raw?.machinesPerDay))
        : fallback.machinesPerDay,
    hoursPerDay:
      Number(raw?.hoursPerDay) > 0
        ? Number(raw?.hoursPerDay)
        : fallback.hoursPerDay,
    otHours:
      Number(raw?.otHours) > 0 ? Number(raw?.otHours) : fallback.otHours,
    tyLeTangCa: chuanHoaTyLeTangCa(raw?.tyLeTangCa, fallback.tyLeTangCa),
    roundedPerMin: rounded != null && rounded > 0 ? rounded : null,
  };
}

/** Tỉ lệ tăng ca (0–1); data cũ thiếu → fallback (mặc định 0.5) */
function chuanHoaTyLeTangCa(
  raw: number | undefined,
  fallback: number,
): number {
  const v = Number(raw);
  if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
  const fb = Number(fallback);
  return Number.isFinite(fb) && fb >= 0 && fb <= 1 ? fb : 0.5;
}

export function chuanHoaTui(
  raw: Partial<CpsxUpgradeLaborTui> | undefined,
  fallback: CpsxUpgradeLaborTui,
): CpsxUpgradeLaborTui {
  const wages = Array.isArray(raw?.wages) ? raw!.wages!.map((w) => Number(w) || 0) : [];
  const rounded =
    raw?.roundedPerMin == null || !Number.isFinite(Number(raw.roundedPerMin))
      ? null
      : Number(raw.roundedPerMin);
  return {
    wages: wages.length > 0 ? wages : [...fallback.wages],
    mealMorning:
      raw?.mealMorning != null
        ? Number(raw.mealMorning) || 0
        : fallback.mealMorning,
    mealEvening:
      raw?.mealEvening != null
        ? Number(raw.mealEvening) || 0
        : fallback.mealEvening,
    otFactor:
      Number(raw?.otFactor) > 0 ? Number(raw?.otFactor) : fallback.otFactor,
    peoplePerShift:
      Number(raw?.peoplePerShift) > 0
        ? Math.floor(Number(raw?.peoplePerShift))
        : fallback.peoplePerShift,
    roundedPerMin: rounded != null && rounded > 0 ? rounded : null,
    hoursPerDay:
      Number(raw?.hoursPerDay) > 0
        ? Number(raw?.hoursPerDay)
        : fallback.hoursPerDay,
    machinesPerDay: chuanHoaMayTui(raw?.machinesPerDay, fallback.machinesPerDay),
    otHours:
      Number(raw?.otHours) > 0 ? Number(raw?.otHours) : fallback.otHours,
    tyLeTangCa: chuanHoaTyLeTangCa(raw?.tyLeTangCa, fallback.tyLeTangCa),
  };
}

/**
 * Số máy hoạt động / ngày cho máy làm túi — mặc định mới là 3.
 * Giá trị cũ = 1 (default trước khi thêm trường này) được migrate về
 * mặc định mới (3); thiếu / ≤ 0 cũng dùng fallback.
 */
function chuanHoaMayTui(raw: number | undefined, fallback: number): number {
  const v = Number(raw);
  if (Number.isFinite(v) && v > 0 && v !== 1) return Math.floor(v);
  return fallback;
}

export function chuanHoaCpsxUpgradeLabor(
  raw: Partial<CpsxUpgradeLabor> | undefined,
  fallback: CpsxUpgradeLabor,
): CpsxUpgradeLabor {
  return {
    print: chuanHoa1May(raw?.print, fallback.print),
    laminate: chuanHoa1May(raw?.laminate, fallback.laminate),
    slit: chuanHoa1May(raw?.slit, fallback.slit),
    bag: chuanHoaTui(raw?.bag, fallback.bag),
  };
}

// ── Máy tính tham khảo (không dùng eval) ────────────────────────────

type TinhToken =
  | { loai: "so"; giaTri: number }
  | { loai: "toan"; kyTu: string };

/**
 * Tên số hạng — chữ Unicode, khoảng trắng và dấu "/" giữa các từ
 * (VD "SL người / ca", "Số giờ máy / ngày"), không đụng × ÷ ( ) %.
 */
export const TEN_SO_HANG_RE = /[\p{L}]+(?:(?:\s+|\s*\/\s*)[\p{L}]+)*/gu;

/**
 * Bỏ dấu tiếng Việt + lowercase + bỏ khoảng trắng và "/":
 * "Cơm Ca Sáng" → "comcasang", "SL người / ca" → "slnguoica".
 */
export function boDau(str: string): string {
  return (str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[\/\s]/g, "");
}

/** Tách chuỗi thành token số / ký tự (0-9 . + − × ÷ ( ) %). */
export function tokenHoaBieuThuc(raw: string): TinhToken[] | null {
  const s = (raw ?? "").replace(/\s+/g, "");
  if (!s) return [];
  const tokens: TinhToken[] = [];
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    if (/[0-9]/.test(ch)) {
      const m = s.slice(i).match(/^[0-9]+(?:\.[0-9]+)?/);
      if (!m) return null;
      tokens.push({ loai: "so", giaTri: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if ("+−×÷()%".includes(ch)) {
      tokens.push({ loai: "toan", kyTu: ch });
      i++;
      continue;
    }
    return null;
  }
  return tokens;
}

/** Recursive descent: + − (thấp) → × ÷ (cao) → ngoặc → % hậu tố. */
class ParserBieuThuc {
  private pos = 0;
  constructor(private tokens: TinhToken[]) {}

  private peek(): TinhToken | undefined {
    return this.tokens[this.pos];
  }
  private next(): TinhToken | undefined {
    return this.tokens[this.pos++];
  }

  private parseFactor(): number | null {
    const t = this.peek();
    if (!t) return null;
    if (t.loai === "so") {
      this.next();
      let gtri = t.giaTri;
      const sau = this.peek();
      if (sau && sau.loai === "toan" && sau.kyTu === "%") {
        this.next();
        gtri /= 100;
      }
      return gtri;
    }
    if (t.loai === "toan" && t.kyTu === "(") {
      this.next();
      const gtri = this.parseExpr();
      const dong = this.next();
      if (gtri === null || !dong || dong.loai !== "toan" || dong.kyTu !== ")") {
        return null;
      }
      return gtri;
    }
    return null;
  }

  private parseTerm(): number | null {
    let gtri = this.parseFactor();
    if (gtri === null) return null;
    for (;;) {
      const t = this.peek();
      if (!t || t.loai !== "toan" || (t.kyTu !== "×" && t.kyTu !== "÷")) break;
      this.next();
      const rhs = this.parseFactor();
      if (rhs === null) return null;
      if (t.kyTu === "×") gtri *= rhs;
      else {
        if (rhs === 0) return null;
        gtri /= rhs;
      }
    }
    return gtri;
  }

  private parseExpr(): number | null {
    let gtri = this.parseTerm();
    if (gtri === null) return null;
    for (;;) {
      const t = this.peek();
      if (!t || t.loai !== "toan" || (t.kyTu !== "+" && t.kyTu !== "−")) break;
      this.next();
      const rhs = this.parseTerm();
      if (rhs === null) return null;
      gtri = t.kyTu === "+" ? gtri + rhs : gtri - rhs;
    }
    return gtri;
  }

  parse(): number | null {
    if (this.tokens.length === 0) return 0;
    const gtri = this.parseExpr();
    if (gtri === null || this.pos < this.tokens.length) return null;
    return gtri;
  }
}

/**
 * Tính biểu thức tham khảo — không dùng eval.
 * Hỗ trợ: số, `+ − × ÷`, `%` (hậu tố, VD `50%` = 0.5), ngoặc `( )`.
 * Tên số hạng tiếng Việt (có dấu / hoa / cách đều được) thay bằng số thật;
 * tên không khớp → null.
 */
export function tinhBieuThuc(
  raw: string,
  soHang: Record<string, number> = {},
): number | null {
  const s = (raw ?? "").replace(/\s+/g, "");
  if (!s) return 0;
  let ok = true;
  const thaySo = s.replace(TEN_SO_HANG_RE, (ten) => {
    const key = boDau(ten);
    if (!key) return "";
    if (key in soHang) return String(soHang[key]);
    ok = false;
    return "0";
  });
  if (!ok) return null;
  const tokens = tokenHoaBieuThuc(thaySo);
  if (tokens === null) return null;
  return new ParserBieuThuc(tokens).parse();
}

// ── Máy tính tham khảo — thao tác token box (1 bấm = 1 cái) ───────

/** 1 đơn vị trong biểu thức token box (số hạng / toán tử / ô số thực). */
export type DonViCalc =
  | { loai: "chuoi"; s: string }
  | { loai: "so"; giaTri: string };

export function donViChuoi(s: string): DonViCalc {
  return { loai: "chuoi", s };
}

export function donViSo(giaTri = ""): DonViCalc {
  return { loai: "so", giaTri };
}

/**
 * Số hợp lệ để đưa vào parser: chỉ chữ số + tối đa một dấu chấm thập phân.
 * Không cho số âm trong ô (dùng toán tử −). Chuỗi rỗng / "12." → false.
 */
export function laSoHopLe(s: string): boolean {
  return /^\d+(?:\.\d+)?$/.test(s ?? "");
}

/**
 * Ghép token → chuỗi biểu thức cho `tinhBieuThuc`.
 * Có ô số rỗng/invalid → null (UI hiện —).
 */
export function bieuThucTuDonVi(donVi: DonViCalc[]): string | null {
  let out = "";
  for (const d of donVi) {
    if (d.loai === "chuoi") {
      out += d.s;
      continue;
    }
    if (!laSoHopLe(d.giaTri)) return null;
    out += d.giaTri;
  }
  return out;
}

/**
 * Lọc ký tự khi gõ ô số: chỉ 0-9 và một dấu `.`.
 * Cho phép intermediate `"12."` (invalid cho tính, nhưng giữ trong input).
 */
export function locNhapSoThuc(raw: string): string {
  const s = (raw ?? "").replace(/[^\d.]/g, "");
  const i = s.indexOf(".");
  if (i < 0) return s;
  return s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "");
}

/** Cập nhật `giaTri` của token số tại `i` (không-op nếu không phải ô số). */
export function capNhatDonViSo(
  donVi: DonViCalc[],
  i: number,
  giaTri: string,
): DonViCalc[] {
  const idx = Math.floor(i);
  if (idx < 0 || idx >= donVi.length) return donVi;
  const cur = donVi[idx];
  if (cur.loai !== "so") return donVi;
  const next = locNhapSoThuc(giaTri);
  if (cur.giaTri === next) return donVi;
  const mang = donVi.slice();
  mang[idx] = { loai: "so", giaTri: next };
  return mang;
}

/**
 * Chèn 1 đơn vị tại khe `cursor` (0..donVi.length).
 * Trả về mảng mới + khe mới (sau đơn vị vừa chèn).
 */
export function chenDonVi<T>(
  donVi: T[],
  cursor: number,
  s: T,
): { mang: T[]; cursorMoi: number } {
  const viTri = Math.max(0, Math.min(donVi.length, Math.floor(cursor)));
  const mang = [...donVi.slice(0, viTri), s, ...donVi.slice(viTri)];
  return { mang, cursorMoi: viTri + 1 };
}

/**
 * Xóa đơn vị tại chỉ số `i`. Trả về mảng mới + khe mới
 * (khe trước vị trí vừa xóa, không vượt quá độ dài mới).
 */
export function xoaDonViTai<T>(
  donVi: T[],
  i: number,
): { mang: T[]; cursorMoi: number } {
  if (donVi.length === 0) return { mang: [], cursorMoi: 0 };
  const idx = Math.max(0, Math.min(donVi.length - 1, Math.floor(i)));
  const mang = [...donVi.slice(0, idx), ...donVi.slice(idx + 1)];
  return { mang, cursorMoi: Math.min(idx, mang.length) };
}

// ── Máy tính tham khảo — tham số tùy chỉnh (phiên) ────────────────

/** 1 tham số user tự tạo trong máy tính tham khảo (không persist). */
export type ThamSoTuyChinh = {
  id: string;
  ten: string;
  giaTri: number;
};

/** Key nội bộ = boDau(tên), dùng trong soHang / tinhBieuThuc. */
export function keyThamSo(ten: string): string {
  return boDau(ten);
}

/**
 * Tên hợp lệ để làm số hạng: trim, khớp TEN_SO_HANG_RE toàn chuỗi,
 * key không rỗng, không trùng built-in / tham số / công thức (dsTenThem).
 */
export function hopLeTenThamSo(
  ten: string,
  soHangBuiltIn: Record<string, number>,
  dsThamSo: readonly { ten: string }[],
  dsTenThem: readonly { ten: string }[] = [],
): { ok: true; ten: string; key: string } | { ok: false; lyDo: string } {
  const tenTrim = (ten ?? "").trim().replace(/\s+/g, " ");
  if (!tenTrim) return { ok: false, lyDo: "Tên trống" };

  TEN_SO_HANG_RE.lastIndex = 0;
  const m = TEN_SO_HANG_RE.exec(tenTrim);
  if (!m || m[0] !== tenTrim || m.index !== 0) {
    return { ok: false, lyDo: "Tên không hợp lệ" };
  }

  const key = keyThamSo(tenTrim);
  if (!key) return { ok: false, lyDo: "Tên không hợp lệ" };

  if (Object.prototype.hasOwnProperty.call(soHangBuiltIn, key)) {
    return { ok: false, lyDo: "Trùng số hạng có sẵn" };
  }
  for (const t of dsThamSo) {
    if (keyThamSo(t.ten) === key) {
      return { ok: false, lyDo: "Trùng tham số đã thêm" };
    }
  }
  for (const t of dsTenThem) {
    if (keyThamSo(t.ten) === key) {
      return { ok: false, lyDo: "Trùng tên đã dùng" };
    }
  }
  return { ok: true, ten: tenTrim, key };
}

/** Merge built-in + tham số tùy chỉnh → soHang hiệu lực. */
export function gopSoHang(
  soHangBuiltIn: Record<string, number>,
  dsThamSo: readonly ThamSoTuyChinh[],
): Record<string, number> {
  const out: Record<string, number> = { ...soHangBuiltIn };
  for (const t of dsThamSo) {
    const key = keyThamSo(t.ten);
    if (!key) continue;
    const n = Number(t.giaTri);
    if (!Number.isFinite(n)) continue;
    out[key] = n;
  }
  return out;
}

/**
 * Parse giá trị tham số từ chuỗi nhập (dấu `.`).
 * Hợp lệ → number; không → null.
 */
export function parseGiaTriThamSo(raw: string): number | null {
  const s = locNhapSoThuc(raw);
  if (!laSoHopLe(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ── Máy tính tham khảo — công thức đặt tên (phiên) ────────────────

/** 1 công thức user đặt tên trong máy tính tham khảo (không persist). */
export type CongThucTuyChinh = {
  id: string;
  ten: string;
  donVi: DonViCalc[];
};

/**
 * Tên công thức hợp lệ: cùng rule số hạng, không trùng built-in /
 * tham số / công thức khác (excludeId bỏ qua chính nó khi đổi tên).
 */
export function hopLeTenCongThuc(
  ten: string,
  soHangBuiltIn: Record<string, number>,
  dsThamSo: readonly { ten: string }[],
  dsCongThuc: readonly { id: string; ten: string }[],
  excludeId?: string,
): { ok: true; ten: string; key: string } | { ok: false; lyDo: string } {
  const khac = dsCongThuc.filter((c) => c.id !== excludeId);
  const r = hopLeTenThamSo(ten, soHangBuiltIn, dsThamSo, khac);
  if (!r.ok) {
    if (r.lyDo === "Trùng tham số đã thêm") {
      return { ok: false, lyDo: "Trùng tham số đã thêm" };
    }
    if (r.lyDo === "Trùng tên đã dùng") {
      return { ok: false, lyDo: "Trùng tính toán phụ đã có" };
    }
    return r;
  }
  return r;
}

/**
 * Tính toàn bộ công thức (hỗ trợ lồng nhau theo phụ thuộc tên).
 * Chu trình / thiếu tên / cú pháp sai → `null` cho CT đó.
 * Key kết quả = `id` công thức.
 */
export function tinhDsCongThuc(
  ds: readonly CongThucTuyChinh[],
  soHangBase: Record<string, number>,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  type Muc = { id: string; key: string; bieuThuc: string };
  const hangDoi: Muc[] = [];

  for (const ct of ds) {
    const bt = bieuThucTuDonVi(ct.donVi);
    const tenTrim = (ct.ten ?? "").trim().replace(/\s+/g, " ");
    const key = tenTrim ? keyThamSo(tenTrim) : "";
    if (bt == null || !key) {
      out[ct.id] = null;
      continue;
    }
    hangDoi.push({ id: ct.id, key, bieuThuc: bt });
  }

  const soHang: Record<string, number> = { ...soHangBase };
  let tienBo = true;
  while (tienBo && hangDoi.length > 0) {
    tienBo = false;
    const conLai: Muc[] = [];
    for (const m of hangDoi) {
      const gtri = tinhBieuThuc(m.bieuThuc, soHang);
      if (gtri == null || !Number.isFinite(gtri)) {
        conLai.push(m);
        continue;
      }
      out[m.id] = gtri;
      soHang[m.key] = gtri;
      tienBo = true;
    }
    hangDoi.length = 0;
    hangDoi.push(...conLai);
  }
  for (const m of hangDoi) {
    out[m.id] = null;
  }
  return out;
}
