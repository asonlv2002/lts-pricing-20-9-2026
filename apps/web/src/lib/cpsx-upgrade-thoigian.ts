import type {
  CpsxThoiGianMayIn,
  CpsxThoiGianMayGhep,
  CpsxThoiGianMayChia,
  CpsxThoiGianMayTui,
  CpsxThoiGianRule,
  CpsxTuiSetupRule,
  CpsxTuiSpeedRule,
  CpsxUpgradeThoiGian,
} from './types';

/**
 * Kết quả thời gian SX — QUY TOÀN BỘ RA PHÚT (không dùng giờ).
 * Mô hình giống CPSX thường:
 *   Máy in:   setup = số màu × (lên trục + duyệt mẫu);  chạy = mét ÷ tốc độ (m/phút);
 *             phủ mờ cộng thêm matteExtraMinutes.
 *   Máy ghép: setup = lần đầu + (số lần ghép − 1) × lần tiếp; chạy = mét ÷ tốc độ.
 *   Máy chia: setup/tốc độ theo rule loại SP; chạy = mét ÷ rule.speed.
 *   Máy túi:  setup theo rule loại túi; chạy = số chiếc ÷ rule.bagsPerMinute.
 */
export interface KetQuaThoiGian {
  tongPhut: number;
  chiTiet: {
    setupPhut: number;
    chayPhut: number;
  };
}

function so(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

const RULE_FALLBACK: CpsxThoiGianRule = { key: '', label: '', setupMinutes: 20, speedMPerMin: 100 };
const SETUP_FALLBACK: CpsxTuiSetupRule = { key: '', label: '', setupMinutes: 90 };
const SPEED_FALLBACK: CpsxTuiSpeedRule = { key: '', label: '', maxStepMm: null, bagsPerMinute: 50 };

export function tinhThoiGianMayIn(
  metIn: number,
  soMau: number,
  cfg: CpsxThoiGianMayIn,
  phuMo = false,
): KetQuaThoiGian {
  const met = Math.max(0, so(metIn));
  const mau = Math.max(0, Math.floor(so(soMau)));
  const mount = Math.max(0, so(cfg.mountMinutesPerColor));
  const proof = mau >= 8 ? Math.max(0, so(cfg.proofMinutes8)) : Math.max(0, so(cfg.proofMinutes1to7));
  const tocDo = Math.max(0, so(cfg.avgSpeedMPerMin)) || 1;
  const matte = phuMo ? Math.max(0, so(cfg.matteExtraMinutes)) : 0;

  const setupPhut = mau * (mount + proof);
  const chayPhut = met / tocDo;
  return { tongPhut: setupPhut + chayPhut + matte, chiTiet: { setupPhut, chayPhut } };
}

export function tinhThoiGianMayGhep(
  metGhep: number,
  soLanGhep: number,
  cfg: CpsxThoiGianMayGhep,
): KetQuaThoiGian {
  const met = Math.max(0, so(metGhep));
  const lan = Math.max(1, Math.floor(so(soLanGhep)) || 1);
  const first = Math.max(0, so(cfg.setupFirstMinutes));
  const next = Math.max(0, so(cfg.setupNextMinutes));
  const tocDo = Math.max(0, so(cfg.avgSpeedMPerMin)) || 1;

  const setupPhut = first + Math.max(0, lan - 1) * next;
  const chayPhut = met / tocDo;
  return { tongPhut: setupPhut + chayPhut, chiTiet: { setupPhut, chayPhut } };
}

export function tinhThoiGianMayChia(
  metChia: number,
  rule: CpsxThoiGianRule,
): KetQuaThoiGian {
  const met = Math.max(0, so(metChia));
  const setupPhut = Math.max(0, so(rule?.setupMinutes));
  const tocDo = Math.max(0, so(rule?.speedMPerMin)) || 1;
  const chayPhut = met / tocDo;
  return { tongPhut: setupPhut + chayPhut, chiTiet: { setupPhut, chayPhut } };
}

export function tinhThoiGianMayTui(
  soTui: number,
  setupRule: CpsxTuiSetupRule,
  speedRule: CpsxTuiSpeedRule,
): KetQuaThoiGian {
  const sl = Math.max(0, so(soTui));
  const setupPhut = Math.max(0, so(setupRule?.setupMinutes));
  const tocDo = Math.max(0, so(speedRule?.bagsPerMinute)) || 1;
  const chayPhut = sl / tocDo;
  return { tongPhut: setupPhut + chayPhut, chiTiet: { setupPhut, chayPhut } };
}

// ── Auto-map input → rule (dùng cho preview + bảng đặc tả) ──────────────────

/**
 * Chọn rule máy chia theo cấu trúc màng + số lần ghép + phủ mờ.
 * Ưu tiên: phủ mờ → matte_flip; có PET/MPET → mpet_pet; ≥2 lần ghép → laminate_3;
 * 1 lần ghép → laminate_2; còn lại → opp_mattopp / rule đầu.
 */
export function chonRuleMayChia(
  cfg: CpsxThoiGianMayChia,
  cauTrucMang: string,
  soLanGhep: number,
  phuMo: boolean,
): CpsxThoiGianRule {
  const rules = cfg?.rules ?? [];
  const tim = (key: string) => rules.find(r => r.key === key);
  if (phuMo) return tim('matte_flip') ?? rules[0] ?? RULE_FALLBACK;
  const u = String(cauTrucMang ?? '').toUpperCase();
  if (u.includes('MPET') || u.includes('PET')) return tim('mpet_pet') ?? rules[0] ?? RULE_FALLBACK;
  const lan = Math.floor(so(soLanGhep));
  if (lan >= 2) return tim('laminate_3') ?? rules[0] ?? RULE_FALLBACK;
  if (lan >= 1) return tim('laminate_2') ?? rules[0] ?? RULE_FALLBACK;
  return tim('opp_mattopp') ?? rules[0] ?? RULE_FALLBACK;
}

/**
 * Chọn rule setup máy túi theo loại túi + zipper + bước cắt (m).
 * Zipper: đáy đứng → zipper_daydung, còn lại → zipper_3bien.
 * Xếp hông: > 40cm → xephong_gt40, còn lại → xephong.
 * Cut seal: → cut_seal. 3/4 biên: > 40cm → 3_4bien_gt40, > 30cm → 3_4bien_gt30,
 * còn lại → 3bien.
 */
export function chonSetupMayTui(
  cfg: CpsxThoiGianMayTui,
  bagType: string,
  hasZipper: boolean,
  cutStepM: number,
): CpsxTuiSetupRule {
  const rules = cfg?.setupRules ?? [];
  const tim = (key: string) => rules.find(r => r.key === key);
  const bt = String(bagType ?? '').toLowerCase();
  const buoc = so(cutStepM);

  if (hasZipper) {
    if (bt.includes('daydung')) return tim('zipper_daydung') ?? tim('zipper_3bien') ?? rules[0] ?? SETUP_FALLBACK;
    return tim('zipper_3bien') ?? rules[0] ?? SETUP_FALLBACK;
  }
  if (bt.includes('xephong')) {
    if (buoc > 0.4) return tim('xephong_gt40') ?? tim('xephong') ?? rules[0] ?? SETUP_FALLBACK;
    return tim('xephong') ?? rules[0] ?? SETUP_FALLBACK;
  }
  if (bt.includes('cutseal')) return tim('cut_seal') ?? rules[0] ?? SETUP_FALLBACK;
  if (buoc > 0.4) return tim('3_4bien_gt40') ?? tim('3bien') ?? tim('4bien') ?? rules[0] ?? SETUP_FALLBACK;
  if (buoc > 0.3) return tim('3_4bien_gt30') ?? tim('3bien') ?? tim('4bien') ?? rules[0] ?? SETUP_FALLBACK;
  return tim('3bien') ?? tim('4bien') ?? rules[0] ?? SETUP_FALLBACK;
}

/**
 * Chọn bậc tốc độ máy túi theo bước cắt (m). Các rule xếp tăng dần maxStepMm;
 * rule đầu có maxStepMm ≥ bước cắt (mm) là bậc đúng; không có → rule không trần / đầu tiên.
 */
export function chonTocDoMayTui(
  cfg: CpsxThoiGianMayTui,
  cutStepM: number,
): CpsxTuiSpeedRule {
  const rules = cfg?.speedRules ?? [];
  const mm = so(cutStepM) * 1000;
  return (
    rules.find(r => r.maxStepMm != null && mm <= r.maxStepMm)
    ?? rules.find(r => r.maxStepMm == null)
    ?? rules[0]
    ?? SPEED_FALLBACK
  );
}

// ── Chuẩn hoá / migrate dữ liệu cũ ──────────────────────────────────────────

/**
 * Chuẩn hoá cấu hình mục 4. Dữ liệu cũ (model cũ: tocDoMetPerHour/phutSetupMoiMau/
 * mauSoGioSetup/nguongMet/tocDoPerHour/phutSetup) được migrate:
 *   - Máy in: tocDoMetPerHour → avgSpeedMPerMin (÷60); bỏ bonus/ngưỡng.
 *   - Máy ghép: tocDoPerHour → avgSpeedMPerMin (÷60); phutSetup → setupFirstMinutes.
 *   - Máy chia/túi: không map được → dùng bảng rule mặc định (giống CPSX thường).
 */
export function chuanHoaCpsxUpgradeThoiGian(
  raw: Partial<CpsxUpgradeThoiGian> | undefined,
  defaults: CpsxUpgradeThoiGian,
): CpsxUpgradeThoiGian {
  const r = (raw ?? {}) as Partial<CpsxUpgradeThoiGian> & Record<string, any>;
  const rPrint = (r.print ?? {}) as Record<string, unknown>;
  const rLam = (r.laminate ?? {}) as Record<string, unknown>;
  const rSlit = (r.slit ?? {}) as Record<string, unknown>;
  const rBag = (r.bag ?? {}) as Record<string, unknown>;

  const print: CpsxThoiGianMayIn = {
    mountMinutesPerColor: so(rPrint.mountMinutesPerColor) > 0
      ? so(rPrint.mountMinutesPerColor)
      : defaults.print.mountMinutesPerColor,
    proofMinutes1to7: so(rPrint.proofMinutes1to7) > 0
      ? so(rPrint.proofMinutes1to7)
      : defaults.print.proofMinutes1to7,
    proofMinutes8: so(rPrint.proofMinutes8) > 0
      ? so(rPrint.proofMinutes8)
      : defaults.print.proofMinutes8,
    matteExtraMinutes: so(rPrint.matteExtraMinutes) >= 0
      ? so(rPrint.matteExtraMinutes)
      : defaults.print.matteExtraMinutes,
    avgSpeedMPerMin: so(rPrint.avgSpeedMPerMin) > 0
      ? so(rPrint.avgSpeedMPerMin)
      : so(rPrint.tocDoMetPerHour) > 0
        ? so(rPrint.tocDoMetPerHour) / 60
        : defaults.print.avgSpeedMPerMin,
  };

  const laminate: CpsxThoiGianMayGhep = {
    setupFirstMinutes: so(rLam.setupFirstMinutes) > 0
      ? so(rLam.setupFirstMinutes)
      : so(rLam.phutSetup) > 0
        ? so(rLam.phutSetup)
        : defaults.laminate.setupFirstMinutes,
    setupNextMinutes: so(rLam.setupNextMinutes) > 0
      ? so(rLam.setupNextMinutes)
      : defaults.laminate.setupNextMinutes,
    avgSpeedMPerMin: so(rLam.avgSpeedMPerMin) > 0
      ? so(rLam.avgSpeedMPerMin)
      : so(rLam.tocDoPerHour) > 0
        ? so(rLam.tocDoPerHour) / 60
        : defaults.laminate.avgSpeedMPerMin,
  };

  const slit: CpsxThoiGianMayChia = {
    rules: Array.isArray(rSlit.rules) && rSlit.rules.length > 0
      ? rSlit.rules.map((rule: CpsxThoiGianRule) => ({ ...rule }))
      : defaults.slit.rules.map((rule) => ({ ...rule })),
  };

  const bag: CpsxThoiGianMayTui = {
    setupRules: Array.isArray(rBag.setupRules) && rBag.setupRules.length > 0
      ? rBag.setupRules.map((rule: CpsxTuiSetupRule) => ({ ...rule }))
      : defaults.bag.setupRules.map((rule) => ({ ...rule })),
    speedRules: Array.isArray(rBag.speedRules) && rBag.speedRules.length > 0
      ? rBag.speedRules.map((rule: CpsxTuiSpeedRule) => ({ ...rule }))
      : defaults.bag.speedRules.map((rule) => ({ ...rule })),
  };

  return { print, laminate, slit, bag };
}
