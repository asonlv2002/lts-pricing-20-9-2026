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

/**
 * Tăng ca theo tổng lương: (L ÷ 2) × hệ số × tỉ lệ CN tăng ca.
 * ÷2 = 4h tăng ca = nửa ca; tỉ lệ = % CN thực sự tăng ca (mặc định 50%).
 */
export function tangCaTheoTongLuong(
  wages: number[],
  otFactor: number,
  tyLeTangCa = 1,
): number {
  const tyLe = Math.max(0, Math.min(1, Number(tyLeTangCa) || 0));
  return tongLuong(wages) * (Number(otFactor) || 0) / 2 * tyLe;
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

/** Tăng ca túi: (tổng lương ÷ 2) × hệ số × tỉ lệ CN tăng ca */
export function tangCaTui(
  wages: number[],
  otFactor: number,
  tyLeTangCa = 1,
): number {
  return tangCaTheoTongLuong(wages, otFactor, tyLeTangCa);
}

// ── ₫/phút (In/Ghép/Chia/Túi) ───────────────────────────────────────

/**
 * ₫/phút = (L + cơm + TC) ÷ giờ/ngày ÷ 60 — làm tròn nguyên ₫.
 *
 * Bỏ bước "÷ tổng CN × số CN 1 ca" (theo PM). `soCN` chỉ dùng cho tiền cơm:
 * mặc định đếm mọi dòng lương; Làm túi truyền số CN có lương > 0.
 */
export function luongMoiPhutTinh(
  wages: number[],
  hoursPerDay: number,
  mealMorning: number,
  mealEvening: number,
  otFactor: number,
  soCN?: number,
  tyLeTangCa = 1,
): number {
  const gio = Number(hoursPerDay) > 0 ? Number(hoursPerDay) : 24;
  const n = soCN != null ? Math.max(0, Math.floor(Number(soCN))) : wages.length;
  const tong = tongLuong(wages)
    + tienComMoiMay(mealMorning, mealEvening, n)
    + tangCaTheoTongLuong(wages, otFactor, tyLeTangCa);
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

// ── Normalize ───────────────────────────────────────────────────────

export function chuanHoa1May(
  raw: Partial<CpsxUpgradeLabor1May> | undefined,
  fallback: CpsxUpgradeLabor1May,
): CpsxUpgradeLabor1May {
  const wages = Array.isArray(raw?.wages) ? raw!.wages!.map((w) => Number(w) || 0) : [];
  const shiftCount: 1 | 2 = raw?.shiftCount === 1 || raw?.shiftCount === 2
    ? raw.shiftCount
    : fallback.shiftCount;
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
    hoursPerDay:
      Number(raw?.hoursPerDay) > 0
        ? Number(raw?.hoursPerDay)
        : fallback.hoursPerDay,
    tyLeTangCa: chuanHoaTyLeTangCa(raw?.tyLeTangCa, fallback.tyLeTangCa),
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
    tyLeTangCa: chuanHoaTyLeTangCa(raw?.tyLeTangCa, fallback.tyLeTangCa),
  };
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
