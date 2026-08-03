import type {
  CpsxUpgradeLabor,
  CpsxUpgradeLabor1May,
  CpsxUpgradeLaborTui,
} from './types';

/** Tổng lương pool */
export function tongLuong(wages: number[]): number {
  return wages.reduce((s, w) => s + (Number(w) || 0), 0);
}

/** Lương TB theo ca (1 máy, nhiều ca: chia cho số ca) */
export function luongTb1May(
  wages: number[],
  shiftCount: 1 | 2,
): number {
  const sum = tongLuong(wages);
  if (shiftCount <= 0) return 0;
  return sum / shiftCount;
}

/** SL người / ca (auto cho 1-máy: số CN ÷ số ca) */
export function soNguoiMoiCa1May(
  wages: number[],
  shiftCount: 1 | 2,
): number {
  if (shiftCount <= 0) return 0;
  return wages.length / shiftCount;
}

/** Tổng cơm (cả 2 ca) cho 1 máy */
export function tongCom1May(
  mealMorning: number,
  mealEvening: number,
  wages: number[],
  shiftCount: 1 | 2,
): number {
  const n = wages.length;
  return (
    (Number(mealMorning) || 0) * n +
    (Number(mealEvening) || 0) * n
  );
}

/** Tăng ca cho 1 máy: tổng lương / số ca × hệ số TC */
export function tangCa1May(
  wages: number[],
  shiftCount: 1 | 2,
  otFactor: number,
): number {
  if (shiftCount <= 0) return 0;
  return (tongLuong(wages) / shiftCount) * (Number(otFactor) || 0);
}

/** ₫/phút 1 máy (In/Ghép): (tổng L + cơm + TC) ÷ 24 ÷ 60 */
export function luongMoiPhut1MayTrenNgay(
  wages: number[],
  shiftCount: 1 | 2,
  mealMorning: number,
  mealEvening: number,
  otFactor: number,
): number {
  const sum =
    tongLuong(wages) +
    tongCom1May(mealMorning, mealEvening, wages, shiftCount) +
    tangCa1May(wages, shiftCount, otFactor);
  return sum / 24 / 60;
}

/** ₫/phút 1 máy (Chia): (L + cơm) ÷ 12 ÷ 60 (1 ca = 12h sáng) */
export function luongMoiPhut1May1Ca(
  wages: number[],
  mealMorning: number,
  mealEvening: number,
): number {
  const sum = tongLuong(wages) + (Number(mealMorning) || 0) + (Number(mealEvening) || 0);
  return sum / 12 / 60;
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

/** Tổng cơm 1 ca túi */
export function tongComTui(
  mealMorning: number,
  mealEvening: number,
  peoplePerShift: number,
): number {
  const n = Math.max(0, Math.floor(Number(peoplePerShift) || 0));
  return (
    (Number(mealMorning) || 0) * n + (Number(mealEvening) || 0) * n
  );
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

/** Tăng ca túi: lương TB / ca × hệ số TC */
export function tangCaTui(
  wages: number[],
  peoplePerShift: number,
  otFactor: number,
): number {
  return luongTbTui(wages, peoplePerShift) * (Number(otFactor) || 0);
}

/** ₫/phút tính ra (chưa làm tròn) cho Làm túi */
export function luongMoiPhutTuiTinh(
  wages: number[],
  peoplePerShift: number,
  mealMorning: number,
  mealEvening: number,
  otFactor: number,
): number {
  const sum =
    luongTbTui(wages, peoplePerShift) +
    tongComTui(mealMorning, mealEvening, peoplePerShift) +
    tangCaTui(wages, peoplePerShift, otFactor);
  // 1 ca = 12h = 720 phút
  return sum / 720;
}

/** Giá áp dụng: roundedPerMin nếu hợp lệ, ngược lại giá tính */
export function luongMoiPhutTuiAp(
  wages: number[],
  peoplePerShift: number,
  mealMorning: number,
  mealEvening: number,
  otFactor: number,
  roundedPerMin: number | null,
): number {
  const tinh = luongMoiPhutTuiTinh(
    wages,
    peoplePerShift,
    mealMorning,
    mealEvening,
    otFactor,
  );
  if (roundedPerMin == null || !Number.isFinite(roundedPerMin)) return tinh;
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
    mealMorning: Number(raw?.mealMorning) || fallback.mealMorning,
    mealEvening: Number(raw?.mealEvening) || fallback.mealEvening,
    otFactor:
      Number(raw?.otFactor) > 0 ? Number(raw?.otFactor) : fallback.otFactor,
    shiftCount,
  };
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
    mealMorning: Number(raw?.mealMorning) || fallback.mealMorning,
    mealEvening: Number(raw?.mealEvening) || fallback.mealEvening,
    otFactor:
      Number(raw?.otFactor) > 0 ? Number(raw?.otFactor) : fallback.otFactor,
    peoplePerShift:
      Number(raw?.peoplePerShift) > 0
        ? Math.floor(Number(raw?.peoplePerShift))
        : fallback.peoplePerShift,
    roundedPerMin: rounded != null && rounded > 0 ? rounded : null,
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
