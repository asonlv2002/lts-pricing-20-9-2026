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
 *   Máy túi:  setup theo loại túi + Đầu vào NVL làm túi ÷ tốc độ TB.
 *             ĐV = TP + PH; TP = có chia ? SL×bước : (SL×bước)÷hình.
 *             Không × divideElements.
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
  maxStepMm: 300,
  stepOp: 'lte',
};
/** Trần mm mặc định thay «không trần» / null. */
export const TOC_DO_MAX_TRAN_MM = 9_999_999;

const SPEED_FALLBACK: CpsxTuiSpeedRule = {
  key: '',
  label: '',
  minStepMm: 0,
  maxStepMm: TOC_DO_MAX_TRAN_MM,
  speedMPerMin: 50,
};

export type CpsxTuiStepOp = 'lte' | 'gte' | 'lt' | 'gt';

/** Catalog loại túi cố định (UI select + map key). */
export const CATALOG_LOAI_TUI_SETUP: ReadonlyArray<{
  bagKey: string;
  label: string;
  keyPrefixes: readonly string[];
}> = [
  { bagKey: '3bien', label: 'Túi 3 biên', keyPrefixes: ['3bien', '3_4bien'] },
  { bagKey: '4bien', label: 'Túi 4 biên', keyPrefixes: ['4bien'] },
  {
    bagKey: 'xephong_lech',
    label: 'Xếp hông dán lưng lệch',
    keyPrefixes: ['xephong_lech', 'xephong'],
  },
  {
    bagKey: 'xephong_giua',
    label: 'Xếp hông dán lưng giữa',
    keyPrefixes: ['xephong_giua'],
  },
  { bagKey: 'zipper_3bien', label: 'Zipper 3 biên', keyPrefixes: ['zipper_3bien'] },
  { bagKey: 'zipper_daydung', label: 'Zipper đáy đứng', keyPrefixes: ['zipper_daydung'] },
  { bagKey: 'nap_bangkeo', label: 'Nắp băng keo', keyPrefixes: ['nap_bangkeo'] },
  { bagKey: 'cut_seal', label: 'Túi cắt Seal', keyPrefixes: ['cut_seal', 'cutseal'] },
];

export function laStepOpHopLe(op: unknown): op is CpsxTuiStepOp {
  return op === 'lte' || op === 'gte' || op === 'lt' || op === 'gt';
}

/** @deprecated Mọi rule đều có bậc cắt sau chuẩn hoá; giữ để UI/kết quả cũ compile. */
export function laSetupBienCoSize(r: CpsxTuiSetupRule): boolean {
  return laStepOpHopLe(r?.stepOp) && r?.maxStepMm != null && Number.isFinite(Number(r.maxStepMm));
}

export function kyHieuStepOp(op: CpsxTuiStepOp | null | undefined): string {
  if (op === 'lte') return '≤';
  if (op === 'gte') return '≥';
  if (op === 'lt') return '<';
  if (op === 'gt') return '>';
  return '≤';
}

/** Nhãn bước cắt UI: "≤ 30 cm". */
export function nhanBuocCatSetupRule(rule: {
  stepOp?: string | null;
  maxStepMm?: number | null;
}): string {
  if (!laStepOpHopLe(rule.stepOp) || rule.maxStepMm == null || !Number.isFinite(Number(rule.maxStepMm))) {
    return '—';
  }
  const cm = Number(rule.maxStepMm) / 10;
  const cmTxt = Number.isInteger(cm) ? String(cm) : String(cm);
  return `${kyHieuStepOp(rule.stepOp)} ${cmTxt} cm`;
}

function nhomSetupTuKey(key: string): string | null {
  const k = String(key ?? '').toLowerCase();
  if (!k) return null;
  if (k.startsWith('zipper_daydung')) return 'zipper_daydung';
  if (k.startsWith('zipper_3bien') || k.startsWith('zipper')) return 'zipper_3bien';
  if (k.startsWith('nap_bangkeo')) return 'nap_bangkeo';
  if (k.startsWith('cut_seal') || k.includes('cutseal')) return 'cut_seal';
  if (k.startsWith('xephong_giua')) return 'xephong_giua';
  // xephong_le40 / xephong_gt40 / xephong (gộp cũ) → lệch
  if (k.startsWith('xephong')) return 'xephong_lech';
  if (k.startsWith('4bien')) return '4bien';
  if (k.startsWith('3bien') || k.startsWith('3_4bien')) return '3bien';
  return null;
}

function nhomSetupTuBagType(bagType: string, hasZipper: boolean): string {
  const bt = String(bagType ?? '').toLowerCase();
  if (hasZipper) {
    if (bt.includes('daydung')) return 'zipper_daydung';
    return 'zipper_3bien';
  }
  if (bt.includes('cutseal') || bt === 'cut_seal') return 'cut_seal';
  if (bt.includes('nap') && bt.includes('keo')) return 'nap_bangkeo';
  if (bt.includes('xephong_giua') || bt.includes('xephonggiua')) return 'xephong_giua';
  if (bt.includes('xephong')) return 'xephong_lech';
  if (bt === '4bien' || bt.includes('4bien')) return '4bien';
  if (bt === '3bien' || bt.includes('3bien')) return '3bien';
  return '3bien';
}

function ruleThuocNhom(r: CpsxTuiSetupRule, nhom: string): boolean {
  const n = nhomSetupTuKey(r.key);
  if (n === nhom) return true;
  // Key cũ 3_4bien_* áp cho cả 3 và 4 biên
  if ((nhom === '3bien' || nhom === '4bien') && String(r.key).toLowerCase().startsWith('3_4bien')) {
    return true;
  }
  // xephong gộp cũ (key đúng "xephong") thuộc lệch; giữa chỉ match khi không có rule giua riêng
  if (nhom === 'xephong_giua' && String(r.key).toLowerCase() === 'xephong') {
    return true;
  }
  return false;
}

function ruleKhopSize(r: CpsxTuiSetupRule, mm: number): boolean {
  const op = r.stepOp;
  if (!laStepOpHopLe(op)) return false;
  const max = r.maxStepMm;
  if (max == null || !Number.isFinite(Number(max))) return false;
  const m = Number(max);
  if (op === 'lte') return mm <= m;
  if (op === 'gte') return mm >= m;
  if (op === 'lt') return mm < m;
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
 * Mét chạy máy làm túi (nâng cao) = Đầu vào NVL làm túi = TP + PH.
 * TP: có chia → SL×bước; không chia → (SL×bước)÷hình (fallback cutMeters).
 * PH = cutWasteA/B/C trên TP (fallback cutWaste / layers.cut.waste).
 * Không nhân divideElements. Không dùng mét ghép cuối / in / số túi.
 */
export function metLamTuiTuDauVaoNVL(result: {
  cutMeters?: number;
  cutWaste?: number;
  layers?: { cut?: { meters?: number; waste?: number } };
  input?: {
    hasDivide?: boolean;
    divideElements?: number;
    quantity?: number;
    cutStep?: number;
    numImages?: number;
    productType?: string;
  };
  /** Hằng số phi hao cắt (tùy chọn; thiếu → 3000/20/100) */
  cutWasteA?: number;
  cutWasteB?: number;
  cutWasteC?: number;
} | null | undefined): number {
  if (!result) return 0;
  const input = result.input;
  const qty = so(input?.quantity);
  const buoc = so(input?.cutStep);
  const soHinh = Math.max(1, so(input?.numImages) || 1);
  let tp = 0;
  if (input?.productType !== 'mang' && qty > 0 && buoc > 0) {
    tp = input?.hasDivide === true ? qty * buoc : (qty * buoc) / soHinh;
  } else if (result.cutMeters != null) {
    tp = Math.max(0, so(result.cutMeters));
  } else {
    tp = Math.max(0, so(result.layers?.cut?.meters));
  }
  if (tp <= 0) {
    // fallback cũ: TP+PH đã cộng sẵn
    if (result.cutMeters != null || result.cutWaste != null) {
      return Math.max(0, so(result.cutMeters) + so(result.cutWaste));
    }
    const cut = result.layers?.cut;
    return Math.max(0, so(cut?.meters) + so(cut?.waste));
  }
  const a = so(result.cutWasteA) || 3000;
  const b = so(result.cutWasteB) || 20;
  const c = so(result.cutWasteC) || 100;
  // Nếu có cutWaste tường minh và TP = cutMeters → dùng waste engine; không thì định mức trên TP
  let ph = tp / a * b + c;
  if (result.cutMeters != null && Math.abs(so(result.cutMeters) - tp) < 0.001 && result.cutWaste != null) {
    ph = Math.max(0, so(result.cutWaste));
  } else if (
    result.cutMeters == null
    && result.layers?.cut?.meters != null
    && Math.abs(so(result.layers.cut.meters) - tp) < 0.001
    && result.layers?.cut?.waste != null
  ) {
    ph = Math.max(0, so(result.layers.cut.waste));
  }
  return tp + ph;
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

/** Nhãn chuẩn rule chia 1 lớp — dùng dấu phẩy, không dùng dấu /. */
const NHAN_RULE_CHIA_1_LOP: Record<string, string> = {
  opp_mattopp: 'Màng OPP, MattOPP',
  mpet_pet: 'Màng MPET, PET',
};

/**
 * Chọn rule máy chia theo cấu trúc màng + số lần ghép.
 * Ưu tiên: ghép trước (≥2 lần ghép → laminate_3, 1 lần ghép → laminate_2);
 * 1 lớp: có MPET, PET → mpet_pet, còn lại → opp_mattopp.
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
 * Mọi loại: lọc nhóm → match stepOp + maxStepMm (first match theo thứ tự mảng).
 * Data cũ không op: fallback theo key phẳng trong nhóm.
 */
export function chonSetupMayTui(
  cfg: CpsxThoiGianMayTui,
  bagType: string,
  hasZipper: boolean,
  cutStepM: number,
): CpsxTuiSetupRule {
  const rules = cfg?.setupRules ?? [];
  const tim = (key: string) => rules.find((r) => r.key === key);
  const mm = so(cutStepM) * 1000;
  const nhom = nhomSetupTuBagType(bagType, hasZipper);

  let candidates = rules.filter((r) => ruleThuocNhom(r, nhom));
  // Xếp hông giữa thiếu rule riêng → fallback lệch (data cũ gộp)
  if (candidates.length === 0 && nhom === 'xephong_giua') {
    candidates = rules.filter((r) => ruleThuocNhom(r, 'xephong_lech'));
  }
  const theoSize = candidates.find((r) => ruleKhopSize(r, mm));
  if (theoSize) return theoSize;

  // Fallback key thường gặp (data chưa chuẩn hoá / thiếu op)
  const fallbackKeys: string[] = [];
  if (nhom === '3bien') {
    fallbackKeys.push(mm <= 300 ? '3bien_le30' : '3bien_gt30', '3bien', '3_4bien_gt30', '3_4bien_gt40');
  } else if (nhom === '4bien') {
    fallbackKeys.push(mm <= 300 ? '4bien_le30' : '4bien_gt30', '4bien', '3_4bien_gt30', '3_4bien_gt40');
  } else if (nhom === 'xephong_lech' || nhom === 'xephong_giua') {
    if (mm > 400) {
      fallbackKeys.push(
        nhom === 'xephong_giua' ? 'xephong_giua_gt40' : 'xephong_gt40',
        'xephong_gt40',
        'xephong_giua_gt40',
        'xephong',
      );
    } else {
      fallbackKeys.push(
        nhom === 'xephong_giua' ? 'xephong_giua_le40' : 'xephong_le40',
        'xephong_le40',
        'xephong_giua_le40',
        'xephong', // gộp cũ = bậc ≤40
      );
    }
  } else {
    fallbackKeys.push(nhom);
  }

  for (const k of fallbackKeys) {
    const hit = tim(k);
    if (hit) return hit;
  }

  return candidates[0] ?? rules[0] ?? SETUP_FALLBACK;
}

/** Nhãn khoảng tốc độ: "0 ≤ … ≤ 200 mm" / "200 < … ≤ 300 mm". */
export function nhanKhoangTocDoBuocCat(rule: {
  minStepMm?: number | null;
  maxStepMm?: number | null;
  label?: string;
}): string {
  const min = so(rule.minStepMm);
  const maxRaw = rule.maxStepMm;
  const max =
    maxRaw == null || !Number.isFinite(Number(maxRaw))
      ? TOC_DO_MAX_TRAN_MM
      : Number(maxRaw);
  const opMin = min <= 0 ? '≤' : '<';
  return `${min} ${opMin} … ≤ ${max} mm`;
}

function ruleKhopTocDoBuocCat(r: CpsxTuiSpeedRule, mm: number): boolean {
  const min = so(r.minStepMm);
  const maxRaw = r.maxStepMm;
  if (maxRaw == null || !Number.isFinite(Number(maxRaw))) {
    // Data cũ không trần: chỉ khớp nếu mm > min (và không bị bậc trước bắt)
    return min <= 0 ? mm >= 0 : mm > min;
  }
  const max = Number(maxRaw);
  if (max < min) return false;
  // Bậc đầu (min=0): min ≤ mm ≤ max; bậc sau: min < mm ≤ max (khớp hành vi cũ)
  if (min <= 0) return mm >= 0 && mm <= max;
  return mm > min && mm <= max;
}

/**
 * Chọn bậc tốc độ máy túi theo bước cắt (m).
 * Match khoảng [minStepMm, maxStepMm]: bậc đầu inclusive min; bậc sau exclusive min.
 */
export function chonTocDoMayTui(
  cfg: CpsxThoiGianMayTui,
  cutStepM: number,
): CpsxTuiSpeedRule {
  const rules = cfg?.speedRules ?? [];
  const mm = so(cutStepM) * 1000;

  // Ưu tiên data đã có minStepMm
  const theoKhoang = rules.find((r) => ruleKhopTocDoBuocCat(r, mm));
  if (theoKhoang) return theoKhoang;

  // Fallback data cũ chỉ maxStepMm (xếp tăng dần)
  const legacy = rules.find(
    (r) => r.maxStepMm != null && Number.isFinite(Number(r.maxStepMm)) && mm <= Number(r.maxStepMm),
  );
  if (legacy) return legacy;

  return (
    rules.find((r) => r.maxStepMm == null) ??
    rules[rules.length - 1] ??
    rules[0] ??
    SPEED_FALLBACK
  );
}

/** Chuẩn hoá speedRules: gán minStepMm từ dãy max cũ; null max → 9999999. */
export function chuanHoaSpeedRulesTui(
  raw: CpsxTuiSpeedRule[] | undefined,
  defaults: CpsxTuiSpeedRule[],
): CpsxTuiSpeedRule[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaults.map((r) => ({
      key: r.key,
      label: r.label,
      minStepMm: so(r.minStepMm),
      maxStepMm:
        r.maxStepMm == null || !Number.isFinite(Number(r.maxStepMm))
          ? TOC_DO_MAX_TRAN_MM
          : Number(r.maxStepMm),
      speedMPerMin: so(r.speedMPerMin) > 0 ? so(r.speedMPerMin) : 50,
    }));
  }

  type RawSpeed = CpsxTuiSpeedRule & { bagsPerMinute?: number };
  const rows = raw.map((rule, i) => {
    const fb = defaults[i] ?? SPEED_FALLBACK;
    const r = rule as RawSpeed;
    const tocDo =
      so(r?.speedMPerMin) > 0
        ? so(r.speedMPerMin)
        : so(r?.bagsPerMinute) > 0
          ? so(r.bagsPerMinute)
          : fb.speedMPerMin;
    let maxStepMm: number | null =
      r?.maxStepMm == null || r?.maxStepMm === undefined
        ? null
        : Number(r.maxStepMm);
    if (maxStepMm != null && !Number.isFinite(maxStepMm)) maxStepMm = null;
    const hasMin = r?.minStepMm != null && Number.isFinite(Number(r.minStepMm));
    return {
      key: String(r?.key || fb.key || `speed_${i + 1}`),
      label: String(r?.label || fb.label || `Bậc ${i + 1}`),
      minStepMm: hasMin ? Math.max(0, so(r.minStepMm)) : null as number | null,
      maxStepMm,
      speedMPerMin: tocDo,
    };
  });

  // Suy min: nếu thiếu, min_i = max_{i-1} (thứ tự mảng); max null → TRAN
  let prevMax = 0;
  return rows.map((r) => {
    let max =
      r.maxStepMm == null || !Number.isFinite(Number(r.maxStepMm))
        ? TOC_DO_MAX_TRAN_MM
        : Number(r.maxStepMm);
    const min =
      r.minStepMm != null && Number.isFinite(Number(r.minStepMm))
        ? Math.max(0, Number(r.minStepMm))
        : prevMax;
    if (max < min) max = min;
    const label = `${min} – ${max} mm`;
    prevMax = max;
    return {
      key: r.key,
      label,
      minStepMm: min,
      maxStepMm: max,
      speedMPerMin: r.speedMPerMin,
    };
  });
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

function suyStepOpTuKey(key: string): { stepOp: CpsxTuiStepOp; maxStepMm: number } | null {
  const k = String(key ?? '').toLowerCase();
  if (/_le30$/i.test(k) || /_lte?30$/i.test(k)) return { stepOp: 'lte', maxStepMm: 300 };
  if (/_gt30$/i.test(k) || k.includes('gt30')) return { stepOp: 'gt', maxStepMm: 300 };
  if (/_le40$/i.test(k)) return { stepOp: 'lte', maxStepMm: 400 };
  if (/_gt40$/i.test(k) || k.includes('gt40')) return { stepOp: 'gt', maxStepMm: 400 };
  return null;
}

function chuanHoaMotSetupRule(
  rule: CpsxTuiSetupRule,
  fb: CpsxTuiSetupRule,
  i: number,
): CpsxTuiSetupRule {
  const key = String(rule?.key || fb.key || `setup_${i + 1}`);
  const label = String(rule?.label || fb.label || `Loại túi ${i + 1}`);
  const setupMinutes =
    so(rule?.setupMinutes) > 0 ? so(rule.setupMinutes) : fb.setupMinutes;

  let stepOp: CpsxTuiSetupRule['stepOp'] = laStepOpHopLe(rule?.stepOp)
    ? rule.stepOp
    : null;
  let maxStepMm: number | null =
    rule?.maxStepMm == null || rule?.maxStepMm === undefined
      ? null
      : Number(rule.maxStepMm);
  if (maxStepMm != null && !Number.isFinite(maxStepMm)) maxStepMm = null;

  if (!stepOp) {
    const suy = suyStepOpTuKey(key);
    if (suy) {
      stepOp = suy.stepOp;
      maxStepMm = maxStepMm ?? suy.maxStepMm;
    }
  }

  // Loại không size cũ / zipper / cut seal → > 0 cm
  if (!stepOp) {
    const nhom = nhomSetupTuKey(key);
    if (
      nhom === 'zipper_3bien' ||
      nhom === 'zipper_daydung' ||
      nhom === 'nap_bangkeo' ||
      nhom === 'cut_seal'
    ) {
      stepOp = 'gt';
      maxStepMm = maxStepMm ?? 0;
    } else if (nhom === 'xephong_lech' || nhom === 'xephong_giua') {
      // xephong gộp 1 dòng không op — giữ null để bung phía dưới
      stepOp = null;
      maxStepMm = null;
    } else if (key === '3bien' || key === '4bien') {
      stepOp = null;
      maxStepMm = null;
    } else {
      // Dòng lạ: mặc định > 0
      stepOp = 'gt';
      maxStepMm = maxStepMm ?? 0;
    }
  }

  if (stepOp && maxStepMm == null) {
    maxStepMm = stepOp === 'gt' || stepOp === 'gte' ? 0 : 300;
  }

  return { key, label, setupMinutes, maxStepMm, stepOp };
}

/**
 * Chuẩn hoá setupRules túi — mọi dòng có stepOp + maxStepMm sau chuẩn hoá.
 * - Đã có op hợp lệ → giữ.
 * - Data cũ 3/4 biên phẳng → bung le30/gt30.
 * - xephong gộp → bung lệch ≤40/>40 (+ giữa nếu thiếu).
 * - zipper / cut seal / nắp → gt + 0 mm.
 */
export function chuanHoaSetupRulesTui(
  raw: CpsxTuiSetupRule[] | undefined,
  defaults: CpsxTuiSetupRule[],
): CpsxTuiSetupRule[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaults.map(cloneSetupRule);
  }

  const mapped: CpsxTuiSetupRule[] = raw.map((rule, i) =>
    chuanHoaMotSetupRule(rule, defaults[i] ?? SETUP_FALLBACK, i),
  );

  const daCoBienMoi = mapped.some(
    (r) =>
      (r.key.startsWith('3bien_') || r.key.startsWith('4bien_')) &&
      laStepOpHopLe(r.stepOp),
  );

  const phut = (keys: string[], fallback: number) => {
    for (const k of keys) {
      const hit = mapped.find((r) => r.key === k);
      if (hit && hit.setupMinutes > 0) return hit.setupMinutes;
    }
    return fallback;
  };

  let result: CpsxTuiSetupRule[];

  if (daCoBienMoi) {
    result = mapped.map((r) => {
      if (laStepOpHopLe(r.stepOp)) {
        return {
          ...r,
          maxStepMm: r.maxStepMm ?? 0,
          stepOp: r.stepOp,
        };
      }
      // Còn dòng biên phẳng lẫn trong data mới
      if (r.key === '3bien' || r.key === '4bien') {
        return { ...r, stepOp: 'lte' as const, maxStepMm: 300 };
      }
      return { ...r, stepOp: 'gt' as const, maxStepMm: r.maxStepMm ?? 0 };
    });
  } else {
    // Migrate data cũ → bung 3/4 biên
    const p3le = phut(['3bien', '3bien_le30'], 90);
    const p3gt = phut(['3_4bien_gt30', '3_4bien_gt40', '3bien_gt30'], p3le);
    const p4le = phut(['4bien', '4bien_le30'], p3le);
    const p4gt = phut(['3_4bien_gt30', '3_4bien_gt40', '4bien_gt30'], p4le);

    const bienMoi: CpsxTuiSetupRule[] = [
      { key: '3bien_le30', label: 'Túi 3 biên', setupMinutes: p3le, maxStepMm: 300, stepOp: 'lte' },
      { key: '3bien_gt30', label: 'Túi 3 biên', setupMinutes: p3gt, maxStepMm: 300, stepOp: 'gt' },
      { key: '4bien_le30', label: 'Túi 4 biên', setupMinutes: p4le, maxStepMm: 300, stepOp: 'lte' },
      { key: '4bien_gt30', label: 'Túi 4 biên', setupMinutes: p4gt, maxStepMm: 300, stepOp: 'gt' },
    ];

    const khac = mapped.filter((r) => {
      const n = nhomSetupTuKey(r.key);
      if (n === '3bien' || n === '4bien') return false;
      if (r.key.startsWith('3_4bien')) return false;
      return true;
    });

    result = [
      ...bienMoi,
      ...(khac.length > 0
        ? khac
        : defaults
            .filter((r) => {
              const n = nhomSetupTuKey(r.key);
              return n !== '3bien' && n !== '4bien';
            })
            .map(cloneSetupRule)),
    ];
  }

  // Bung xephong gộp (xephong / xephong+xephong_gt40 cũ) → 4 dòng lệch+giữa
  const coXephongGopLegacy = result.some((r) => {
    const k = String(r.key).toLowerCase();
    return k === 'xephong' || (k === 'xephong_gt40' && !laStepOpHopLe(r.stepOp));
  });
  // Cặp cũ: xephong (≤) + xephong_gt40 (suy op từ key) vẫn coi là legacy
  const coCapXephongCu =
    result.some((r) => String(r.key).toLowerCase() === 'xephong') &&
    result.some((r) => String(r.key).toLowerCase() === 'xephong_gt40');

  const canBungXephong = coXephongGopLegacy || coCapXephongCu;
  const KEY_XEP_HONG_SAU_BUNG = new Set([
    'xephong',
    'xephong_le40',
    'xephong_gt40',
    'xephong_giua_le40',
    'xephong_giua_gt40',
  ]);

  const out: CpsxTuiSetupRule[] = [];
  let daBungXephong = false;
  for (const r of result) {
    const k = String(r.key).toLowerCase();

    if (canBungXephong && KEY_XEP_HONG_SAU_BUNG.has(k)) {
      if (daBungXephong) continue;
      const pLe = phut(['xephong', 'xephong_le40'], 120);
      const pGt = phut(['xephong_gt40'], pLe);
      out.push(
        {
          key: 'xephong_le40',
          label: 'Xếp hông dán lưng lệch',
          setupMinutes: pLe,
          maxStepMm: 400,
          stepOp: 'lte',
        },
        {
          key: 'xephong_gt40',
          label: 'Xếp hông dán lưng lệch',
          setupMinutes: pGt,
          maxStepMm: 400,
          stepOp: 'gt',
        },
        {
          key: 'xephong_giua_le40',
          label: 'Xếp hông dán lưng giữa',
          setupMinutes: pLe,
          maxStepMm: 400,
          stepOp: 'lte',
        },
        {
          key: 'xephong_giua_gt40',
          label: 'Xếp hông dán lưng giữa',
          setupMinutes: pGt,
          maxStepMm: 400,
          stepOp: 'gt',
        },
      );
      daBungXephong = true;
      continue;
    }

    // Dòng xephong lẻ không op (không bắt được ở trên)
    const laXephongGop =
      k.startsWith('xephong') &&
      !k.startsWith('xephong_giua') &&
      !k.startsWith('xephong_le') &&
      k !== 'xephong_gt40' &&
      !laStepOpHopLe(r.stepOp);
    if (laXephongGop) {
      if (daBungXephong) continue;
      const pLe = phut(['xephong', 'xephong_le40'], r.setupMinutes || 120);
      const pGt = phut(['xephong_gt40'], pLe);
      out.push(
        {
          key: 'xephong_le40',
          label: 'Xếp hông dán lưng lệch',
          setupMinutes: pLe,
          maxStepMm: 400,
          stepOp: 'lte',
        },
        {
          key: 'xephong_gt40',
          label: 'Xếp hông dán lưng lệch',
          setupMinutes: pGt,
          maxStepMm: 400,
          stepOp: 'gt',
        },
        {
          key: 'xephong_giua_le40',
          label: 'Xếp hông dán lưng giữa',
          setupMinutes: pLe,
          maxStepMm: 400,
          stepOp: 'lte',
        },
        {
          key: 'xephong_giua_gt40',
          label: 'Xếp hông dán lưng giữa',
          setupMinutes: pGt,
          maxStepMm: 400,
          stepOp: 'gt',
        },
      );
      daBungXephong = true;
      continue;
    }

    if (!laStepOpHopLe(r.stepOp)) {
      out.push({ ...r, stepOp: 'gt', maxStepMm: r.maxStepMm ?? 0 });
    } else {
      out.push({ ...r, maxStepMm: r.maxStepMm ?? 0 });
    }
  }

  // Dedupe key (giữ dòng đầu) — tránh React key trùng + match engine lệch
  const seen = new Set<string>();
  const unique: CpsxTuiSetupRule[] = [];
  for (const r of out) {
    const k = String(r.key || '');
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    unique.push(r);
  }

  // Đảm bảo có xếp hông nếu defaults có mà out thiếu
  const coXephong = unique.some((r) => nhomSetupTuKey(r.key)?.startsWith('xephong'));
  if (!coXephong) {
    for (const d of defaults) {
      if (nhomSetupTuKey(d.key)?.startsWith('xephong')) unique.push(cloneSetupRule(d));
    }
  }

  return unique;
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
      ? rSlit.rules.map((rule: CpsxThoiGianRule) => {
          const key = String(rule?.key ?? '');
          const nhanChuan = NHAN_RULE_CHIA_1_LOP[key];
          return {
            ...rule,
            // Ép nhãn 1 lớp: "Màng OPP, MattOPP" / "Màng MPET, PET" (không dùng dấu /)
            label: nhanChuan ?? rule.label,
          };
        })
      : defaults.slit.rules.map((rule) => ({ ...rule })),
  };

  const bag: CpsxThoiGianMayTui = {
    setupRules: chuanHoaSetupRulesTui(
      Array.isArray(rBag.setupRules) ? (rBag.setupRules as CpsxTuiSetupRule[]) : undefined,
      defaults.bag.setupRules,
    ),
    // speedMPerMin (m/phút) + min/max mm. Data cũ bagsPerMinute / chỉ max → chuanHoa.
    speedRules: chuanHoaSpeedRulesTui(
      Array.isArray(rBag.speedRules)
        ? (rBag.speedRules as CpsxTuiSpeedRule[])
        : undefined,
      defaults.bag.speedRules,
    ),
  };

  return { print, laminate, slit, bag };
}
