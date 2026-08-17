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
 *   Máy in:   setup = số màu × lên trục + duyệt mẫu;  chạy = mét ÷ tốc độ (m/phút);
 *             phủ mờ cộng thêm matteExtraMinutes.
 *   Máy ghép: setup = lần đầu + (số lần ghép − 1) × lần tiếp; chạy = mét ÷ tốc độ.
 *   Máy chia: setup/tốc độ theo rule loại SP; chạy = mét ÷ rule.speed (ghép cuối / in).
 *   Máy túi:  setup theo loại túi + (Đầu vào NVL làm túi × số phần tử) ÷ tốc độ TB.
 *             Mét gốc = cutMeters + cutWaste (cột Đầu vào NVL Table 1 dòng làm túi).
 *             Có chia → × max(1, divideElements); không chia → ×1.
 *             KHÔNG dùng số túi, không dùng mét ghép cuối.
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
const SETUP_FALLBACK: CpsxTuiSetupRule = {
  key: '',
  label: '',
  setupMinutes: 90,
  maxStepMm: null,
  stepOp: null,
};
const SPEED_FALLBACK: CpsxTuiSpeedRule = { key: '', label: '', maxStepMm: null, speedMPerMin: 50 };

/** Rule 3/4 biên có bậc bước cắt (UI bảng 1). */
export function laSetupBienCoSize(r: CpsxTuiSetupRule): boolean {
  const k = String(r?.key ?? '');
  if (k.startsWith('3bien') || k.startsWith('4bien') || k.startsWith('3_4bien')) return true;
  return r?.stepOp === 'lte' || r?.stepOp === 'gt';
}

function nhomBienTuKey(key: string): '3bien' | '4bien' | null {
  const k = String(key ?? '').toLowerCase();
  if (k.startsWith('3bien') || k.includes('3_4bien') || k === '3bien') return '3bien';
  // 3_4bien cũ gộp cả hai — map sang 3bien khi không rõ; 4bien riêng
  if (k.startsWith('4bien')) return '4bien';
  return null;
}

function nhomBienTuBagType(bagType: string): '3bien' | '4bien' | null {
  const bt = String(bagType ?? '').toLowerCase();
  if (bt === '3bien' || bt.includes('3bien')) return '3bien';
  if (bt === '4bien' || bt.includes('4bien')) return '4bien';
  return null;
}

function ruleKhopSize(r: CpsxTuiSetupRule, mm: number): boolean {
  const op = r.stepOp;
  const max = r.maxStepMm;
  if (op == null || max == null || !Number.isFinite(Number(max))) return false;
  const m = Number(max);
  if (op === 'lte') return mm <= m;
  if (op === 'gt') return mm > m;
  return false;
}

/**
 * Mét chạy khâu chia (nâng cao):
 *   có ghép → TP + phi hao lớp ghép cuối;
 *   không ghép → TP + phi hao in.
 */
export function metChiaHoacLamTui(result: {
  printMeters?: number;
  printWaste?: number;
  layers?: { laminations?: Array<{ meters?: number; waste?: number }> };
} | null | undefined): number {
  const lams = result?.layers?.laminations ?? [];
  if (lams.length > 0) {
    const cuoi = lams[lams.length - 1];
    return Math.max(0, so(cuoi?.meters) + so(cuoi?.waste));
  }
  return Math.max(0, so(result?.printMeters) + so(result?.printWaste));
}

/**
 * Số phần tử chia cho mét chạy máy túi.
 * Có chia → max(1, divideElements); không chia / thiếu → 1.
 */
export function soPhanTuChiaLamTui(input: {
  hasDivide?: boolean;
  divideElements?: number;
} | null | undefined): number {
  if (!input?.hasDivide) return 1;
  const n = Math.floor(so(input.divideElements));
  return n >= 1 ? n : 1;
}

/**
 * Mét chạy máy làm túi (nâng cao):
 *   (Đầu vào NVL làm túi × số phần tử) = (cutMeters + cutWaste) × soPhanTuChiaLamTui
 * Có chia → nhân divideElements; không chia → ×1.
 * Không dùng mét ghép cuối / in / số túi.
 */
export function metLamTuiTuDauVaoNVL(result: {
  cutMeters?: number;
  cutWaste?: number;
  layers?: { cut?: { meters?: number; waste?: number } };
  input?: { hasDivide?: boolean; divideElements?: number };
} | null | undefined): number {
  if (!result) return 0;
  let metGoc = 0;
  if (result.cutMeters != null || result.cutWaste != null) {
    metGoc = Math.max(0, so(result.cutMeters) + so(result.cutWaste));
  } else {
    const cut = result.layers?.cut;
    metGoc = Math.max(0, so(cut?.meters) + so(cut?.waste));
  }
  return metGoc * soPhanTuChiaLamTui(result.input);
}

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

  // setup = số màu × lên trục + duyệt mẫu (duyệt mẫu chỉ 1 lần, không nhân số màu);
  // không in màu → không duyệt mẫu
  const setupPhut = mau > 0 ? mau * mount + proof : 0;
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

/**
 * TG máy làm túi (nâng cao):
 *   TG = setup(loại túi) + Đầu vào NVL làm túi / tốc độ TB (m/phút)
 * `metChay` = metLamTuiTuDauVaoNVL(result) = (cutMeters+cutWaste) × số phần tử.
 * Tốc độ: speedMPerMin; fallback bagsPerMinute (data cũ) rồi 50.
 */
export function tinhThoiGianMayTui(
  metChay: number,
  setupRule: CpsxTuiSetupRule,
  speedRule: CpsxTuiSpeedRule,
): KetQuaThoiGian {
  const met = Math.max(0, so(metChay));
  const setupPhut = Math.max(0, so(setupRule?.setupMinutes));
  const raw = speedRule as CpsxTuiSpeedRule & { bagsPerMinute?: number };
  const tocDo = Math.max(0, so(raw?.speedMPerMin))
    || Math.max(0, so(raw?.bagsPerMinute))
    || SPEED_FALLBACK.speedMPerMin
    || 1;
  const chayPhut = met / tocDo;
  return { tongPhut: setupPhut + chayPhut, chiTiet: { setupPhut, chayPhut } };
}

// ── Auto-map input → rule (dùng cho preview + bảng đặc tả) ──────────────────

/**
 * Chọn rule máy chia theo cấu trúc màng + số lần ghép.
 * Ưu tiên: ghép trước (≥2 lần ghép → laminate_3, 1 lần ghép → laminate_2);
 * 1 lớp: có MPET/PET → mpet_pet, còn lại → opp_mattopp.
 * (matte_flip chỉ chọn tay — phủ mờ không ảnh hưởng máy chia.)
 */
export function chonRuleMayChia(
  cfg: CpsxThoiGianMayChia,
  cauTrucMang: string,
  soLanGhep: number,
): CpsxThoiGianRule {
  const rules = cfg?.rules ?? [];
  const tim = (key: string) => rules.find(r => r.key === key);
  const lan = Math.floor(so(soLanGhep));
  if (lan >= 2) return tim('laminate_3') ?? rules[0] ?? RULE_FALLBACK;
  if (lan >= 1) return tim('laminate_2') ?? rules[0] ?? RULE_FALLBACK;
  const u = String(cauTrucMang ?? '').toUpperCase();
  if (u.includes('MPET') || u.includes('PET')) return tim('mpet_pet') ?? rules[0] ?? RULE_FALLBACK;
  return tim('opp_mattopp') ?? rules[0] ?? RULE_FALLBACK;
}

/**
 * Chọn rule setup máy túi theo loại túi + zipper + bước cắt (m).
 * Zipper / xếp hông / cut seal: key cố định (bảng loại khác, không size).
 * 3 biên / 4 biên: tách hàng; match stepOp + maxStepMm (≤30cm / >30cm).
 * Data cũ: 3bien / 3_4bien_gt30 / 3_4bien_gt40 vẫn fallback được.
 */
export function chonSetupMayTui(
  cfg: CpsxThoiGianMayTui,
  bagType: string,
  hasZipper: boolean,
  cutStepM: number,
): CpsxTuiSetupRule {
  const rules = cfg?.setupRules ?? [];
  const tim = (key: string) => rules.find((r) => r.key === key);
  const bt = String(bagType ?? "").toLowerCase();
  const buoc = so(cutStepM);
  const mm = buoc * 1000;

  if (hasZipper) {
    if (bt.includes("daydung")) {
      return (
        tim("zipper_daydung") ??
        tim("zipper_3bien") ??
        rules[0] ??
        SETUP_FALLBACK
      );
    }
    return tim("zipper_3bien") ?? rules[0] ?? SETUP_FALLBACK;
  }
  if (bt.includes("xephong")) {
    if (buoc > 0.4) {
      return tim("xephong_gt40") ?? tim("xephong") ?? rules[0] ?? SETUP_FALLBACK;
    }
    return tim("xephong") ?? rules[0] ?? SETUP_FALLBACK;
  }
  if (bt.includes("cutseal")) {
    return tim("cut_seal") ?? rules[0] ?? SETUP_FALLBACK;
  }

  const nhom = nhomBienTuBagType(bagType) ?? "3bien";
  const bienRules = rules.filter((r) => {
    if (!laSetupBienCoSize(r)) return false;
    const n = nhomBienTuKey(r.key);
    if (n === nhom) return true;
    // Key cũ 3_4bien_* áp cho cả 3 và 4 biên
    if (String(r.key).startsWith("3_4bien")) return true;
    // Key phẳng "3bien" / "4bien" không có suffix size
    if (r.key === nhom) return true;
    return false;
  });

  const theoSize = bienRules.find((r) => ruleKhopSize(r, mm));
  if (theoSize) return theoSize;

  // Fallback key mới
  if (mm <= 300) {
    return (
      tim(`${nhom}_le30`) ??
      tim(nhom) ??
      (nhom === "4bien" ? tim("4bien") : tim("3bien")) ??
      bienRules[0] ??
      rules[0] ??
      SETUP_FALLBACK
    );
  }
  // > 30cm: ưu tiên gt30; data cũ gt40 cũng >30
  return (
    tim(`${nhom}_gt30`) ??
    tim("3_4bien_gt30") ??
    tim("3_4bien_gt40") ??
    tim(nhom) ??
    bienRules[0] ??
    rules[0] ??
    SETUP_FALLBACK
  );
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

function cloneSetupRule(r: CpsxTuiSetupRule): CpsxTuiSetupRule {
  return {
    key: r.key,
    label: r.label,
    setupMinutes: r.setupMinutes,
    maxStepMm: r.maxStepMm === undefined ? null : r.maxStepMm,
    stepOp: r.stepOp === undefined ? null : r.stepOp,
  };
}

/**
 * Chuẩn hoá setupRules túi.
 * - Đã có stepOp (lte/gt) trên dòng 3/4 biên → giữ + clamp.
 * - Data cũ (3bien, 4bien, 3_4bien_gt30, 3_4bien_gt40 không stepOp) →
 *   bung thành 4 dòng le30/gt30 cho 3 biên và 4 biên (phút lấy từ dòng tương ứng).
 * - Loại khác: maxStepMm/stepOp = null.
 */
export function chuanHoaSetupRulesTui(
  raw: CpsxTuiSetupRule[] | undefined,
  defaults: CpsxTuiSetupRule[],
): CpsxTuiSetupRule[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaults.map(cloneSetupRule);
  }

  const mapped: CpsxTuiSetupRule[] = raw.map((rule, i) => {
    const fb = defaults[i] ?? SETUP_FALLBACK;
    const key = String(rule?.key || fb.key || `setup_${i + 1}`);
    const label = String(rule?.label || fb.label || `Loại túi ${i + 1}`);
    const setupMinutes =
      so(rule?.setupMinutes) > 0 ? so(rule.setupMinutes) : fb.setupMinutes;
    let stepOp: CpsxTuiSetupRule["stepOp"] =
      rule?.stepOp === "lte" || rule?.stepOp === "gt" ? rule.stepOp : null;
    let maxStepMm: number | null =
      rule?.maxStepMm == null || rule?.maxStepMm === undefined
        ? null
        : Number(rule.maxStepMm);
    if (maxStepMm != null && !Number.isFinite(maxStepMm)) maxStepMm = null;

    // Suy ra từ key mới nếu thiếu stepOp
    if (!stepOp) {
      if (/_le30$/i.test(key) || /_lte?30$/i.test(key)) {
        stepOp = "lte";
        maxStepMm = maxStepMm ?? 300;
      } else if (/_gt30$/i.test(key) || key.includes("gt30")) {
        stepOp = "gt";
        maxStepMm = maxStepMm ?? 300;
      } else if (key.includes("gt40")) {
        // gt40 cũ → coi như >30 khi migrate bung
        stepOp = null;
        maxStepMm = null;
      }
    }

    return { key, label, setupMinutes, maxStepMm, stepOp };
  });

  const hasNewBien = mapped.some(
    (r) =>
      (r.key.startsWith("3bien_") || r.key.startsWith("4bien_")) &&
      (r.stepOp === "lte" || r.stepOp === "gt"),
  );
  if (hasNewBien) {
    return mapped.map((r) => {
      if (laSetupBienCoSize(r) && (r.stepOp === "lte" || r.stepOp === "gt")) {
        return {
          ...r,
          maxStepMm: r.maxStepMm ?? 300,
          stepOp: r.stepOp,
        };
      }
      // Loại khác: strip size
      if (!laSetupBienCoSize(r)) {
        return { ...r, maxStepMm: null, stepOp: null };
      }
      return r;
    });
  }

  // Migrate data cũ → bung 3/4 biên
  const phut = (keys: string[], fallback: number) => {
    for (const k of keys) {
      const hit = mapped.find((r) => r.key === k);
      if (hit && hit.setupMinutes > 0) return hit.setupMinutes;
    }
    return fallback;
  };
  const p3le = phut(["3bien", "3bien_le30"], 90);
  const p3gt = phut(["3_4bien_gt30", "3_4bien_gt40", "3bien_gt30"], p3le);
  const p4le = phut(["4bien", "4bien_le30"], p3le);
  const p4gt = phut(["3_4bien_gt30", "3_4bien_gt40", "4bien_gt30"], p4le);

  const bienMoi: CpsxTuiSetupRule[] = [
    {
      key: "3bien_le30",
      label: "Túi 3 biên",
      setupMinutes: p3le,
      maxStepMm: 300,
      stepOp: "lte",
    },
    {
      key: "3bien_gt30",
      label: "Túi 3 biên",
      setupMinutes: p3gt,
      maxStepMm: 300,
      stepOp: "gt",
    },
    {
      key: "4bien_le30",
      label: "Túi 4 biên",
      setupMinutes: p4le,
      maxStepMm: 300,
      stepOp: "lte",
    },
    {
      key: "4bien_gt30",
      label: "Túi 4 biên",
      setupMinutes: p4gt,
      maxStepMm: 300,
      stepOp: "gt",
    },
  ];

  const khac = mapped
    .filter((r) => !laSetupBienCoSize(r))
    .map((r) => ({ ...r, maxStepMm: null as number | null, stepOp: null as null }));

  // Nếu migrate mất hết loại khác → lấy default phần khác
  if (khac.length === 0) {
    const defKhac = defaults
      .filter((r) => !laSetupBienCoSize(r))
      .map(cloneSetupRule);
    return [...bienMoi, ...defKhac];
  }
  return [...bienMoi, ...khac];
}

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
    matteExtraMinutes: rPrint.matteExtraMinutes == null
      ? defaults.print.matteExtraMinutes
      : Math.max(0, so(rPrint.matteExtraMinutes)),
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
    setupRules: chuanHoaSetupRulesTui(
      Array.isArray(rBag.setupRules) ? (rBag.setupRules as CpsxTuiSetupRule[]) : undefined,
      defaults.bag.setupRules,
    ),
    // speedMPerMin (m/phút). Data cũ/copy từ bagPressTime có bagsPerMinute → map sang.
    speedRules: Array.isArray(rBag.speedRules) && rBag.speedRules.length > 0
      ? rBag.speedRules.map((rule: CpsxTuiSpeedRule & { bagsPerMinute?: number }, i: number) => {
          const fb = defaults.bag.speedRules[i] ?? SPEED_FALLBACK;
          const tocDo = so(rule?.speedMPerMin) > 0
            ? so(rule.speedMPerMin)
            : so(rule?.bagsPerMinute) > 0
              ? so(rule.bagsPerMinute)
              : fb.speedMPerMin;
          return {
            key: String(rule?.key || fb.key || `speed_${i + 1}`),
            label: String(rule?.label || fb.label || `Bậc ${i + 1}`),
            maxStepMm: rule?.maxStepMm == null ? (fb.maxStepMm ?? null) : (Number(rule.maxStepMm) || null),
            speedMPerMin: tocDo,
          };
        })
      : defaults.bag.speedRules.map((rule) => ({ ...rule })),
  };

  return { print, laminate, slit, bag };
}
