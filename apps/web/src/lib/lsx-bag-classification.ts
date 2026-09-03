// ── Phân loại sản phẩm LSX: 7 túi + màng; zipper = phụ kiện ─────────────────
// Dùng chung ModalDonLSX, lsxExport, lsxHtml, LsxPdfDocument.
// KHÔNG sửa bagType tính giá trong engine.
// Spec: session chốt — zipper không tạo loại SP; 7 dáng túi từ bagType.

import type { LSXManualFields } from './types';

/** 7 kiểu túi chuẩn + fallback nội bộ (data lạ / legacy). */
export type LsxBagTypeKey =
  | 'tui-3-bien'
  | 'tui-4-bien'
  | 'tui-dan-lung-giua'
  | 'tui-xep-hong-lung-lech'
  | 'tui-day-dung'
  | 'tui-cut-seal'
  | 'tui-cut-seal-nap-keo'
  | 'fallback';

/** Key màng (phase 1: 2 profile; legacy `mang` = mang-in). */
export type LsxFilmTypeKey = 'mang-in' | 'mang-ghep' | 'mang';

export type LsxProductKey = LsxBagTypeKey | LsxFilmTypeKey;

export interface LsxBagTypeInfo {
  key: LsxBagTypeKey;
  label: string;
  /** Field máy túi theo kiểu dáng (không gồm zipper). */
  baseFields: (keyof LSXManualFields)[];
  /** Defaults khi chọn kiểu túi. */
  defaults: Partial<LSXManualFields>;
  /** @deprecated dùng baseFields */
  extraFields: (keyof LSXManualFields)[];
}

/** Field zipper khi hasZipper (phụ kiện). Khuôn bán nguyệt không thuộc zipper — luôn hiện với túi. */
export const ZIPPER_ACCESSORY_FIELDS: (keyof LSXManualFields)[] = [
  'tamZipperCachMieng',
  'tearNotch',
  'loTreoInfo',
  'useDualCutter',
];

const BAG_TYPES: Record<LsxBagTypeKey, LsxBagTypeInfo> = {
  'tui-3-bien': {
    key: 'tui-3-bien',
    label: 'Túi 3 biên',
    baseFields: ['holePunchInfo', 'sealEdge', 'hanBien', 'hanDau', 'hanDay'],
    defaults: { hanDau: 30, sealEdge: '7mm', holePunchInfo: 'Lỗ tròn Ø8mm cách đầu túi 10mm' },
    extraFields: ['holePunchInfo', 'sealEdge', 'hanBien', 'hanDau', 'hanDay'],
  },
  'tui-4-bien': {
    key: 'tui-4-bien',
    label: 'Túi 4 biên',
    baseFields: ['xepHong', 'holePunchInfo', 'ventHoleInfo', 'hanBien', 'hanDau', 'hanDay'],
    defaults: {
      hanBien: 10,
      hanDau: 50,
      xepHong: 60,
      holePunchInfo: '3 lỗ tròn quai xách (theo Market)',
      ventHoleInfo: '6 lỗ/mặt Ø1mm',
    },
    extraFields: ['xepHong', 'holePunchInfo', 'ventHoleInfo', 'hanBien', 'hanDau', 'hanDay'],
  },
  'tui-dan-lung-giua': {
    key: 'tui-dan-lung-giua',
    label: 'Túi dán lưng giữa',
    baseFields: ['danLung', 'ventHoleInfo', 'hanDau'],
    defaults: { hanDau: 13, danLung: 13, ventHoleInfo: '2 lỗ trên/dưới' },
    extraFields: ['danLung', 'ventHoleInfo', 'hanDau'],
  },
  'tui-xep-hong-lung-lech': {
    key: 'tui-xep-hong-lung-lech',
    label: 'Túi xếp hông dán lưng lệch',
    baseFields: ['xepHong', 'danLungLech', 'danDay'],
    defaults: { xepHong: 73, danLungLech: 10, danDay: 10 },
    extraFields: ['xepHong', 'danLungLech', 'danDay'],
  },
  'tui-day-dung': {
    key: 'tui-day-dung',
    label: 'Túi đáy đứng',
    baseFields: ['sealEdge', 'foldBottom', 'hanBien', 'hanDay'],
    defaults: { sealEdge: '10mm', foldBottom: '100mm', hanBien: 10 },
    extraFields: ['sealEdge', 'foldBottom', 'hanBien', 'hanDay'],
  },
  'tui-cut-seal': {
    key: 'tui-cut-seal',
    label: 'Túi cắt seal',
    baseFields: [],
    defaults: {},
    extraFields: [],
  },
  'tui-cut-seal-nap-keo': {
    key: 'tui-cut-seal-nap-keo',
    label: 'Túi cắt seal có nắp băng keo',
    baseFields: ['nap', 'songSieuAm', 'docQuaiXach', 'danKeoNap'],
    defaults: { nap: 35, songSieuAm: 32, docQuaiXach: true, danKeoNap: true },
    extraFields: ['nap', 'songSieuAm', 'docQuaiXach', 'danKeoNap'],
  },
  fallback: {
    key: 'fallback',
    label: 'Khác (hiện tất cả field)',
    baseFields: [],
    defaults: {},
    extraFields: [],
  },
};

/** 7 loại túi cho dropdown (không fallback). */
export const ALL_LSX_BAG_TYPES: LsxBagTypeInfo[] = (
  [
    'tui-3-bien',
    'tui-4-bien',
    'tui-dan-lung-giua',
    'tui-xep-hong-lung-lech',
    'tui-day-dung',
    'tui-cut-seal',
    'tui-cut-seal-nap-keo',
  ] as const
).map(k => BAG_TYPES[k]);

/** Map override / template key cũ → key mới. */
const LEGACY_KEY_MAP: Record<string, LsxBagTypeKey> = {
  'tui-zipper-3-bien': 'tui-3-bien',
  'tui-zipper-day-dung': 'tui-day-dung',
  'tui-zipper-cat-seal': 'tui-cut-seal',
  'tui-cat-seal-nap-keo': 'tui-cut-seal-nap-keo',
};

export function normalizeLegacyLsxKey(key: string): LsxBagTypeKey | LsxFilmTypeKey {
  if (key === 'mang' || key === 'mang-in' || key === 'mang-ghep') return key as LsxFilmTypeKey;
  if (LEGACY_KEY_MAP[key]) return LEGACY_KEY_MAP[key];
  if (key in BAG_TYPES) return key as LsxBagTypeKey;
  return 'fallback';
}

/**
 * Phân loại túi chỉ từ bagType — hasZipper KHÔNG đổi key.
 * @param _hasZipper giữ signature cũ cho callers; bị bỏ qua.
 */
export function classifyLsxBagType(bagType: string, _hasZipper?: boolean): LsxBagTypeInfo {
  void _hasZipper;
  switch (bagType) {
    case '3bien':
      return BAG_TYPES['tui-3-bien'];
    case '4bien':
      return BAG_TYPES['tui-4-bien'];
    case 'xephong_giua':
      return BAG_TYPES['tui-dan-lung-giua'];
    case 'xephong_lech':
      return BAG_TYPES['tui-xep-hong-lung-lech'];
    case 'dayDung':
      return BAG_TYPES['tui-day-dung'];
    case 'cutSeal':
      return BAG_TYPES['tui-cut-seal'];
    case 'cutSealNapKeo':
      return BAG_TYPES['tui-cut-seal-nap-keo'];
    default:
      return BAG_TYPES.fallback;
  }
}

export function classifyLsxBagTypeByKey(key: string): LsxBagTypeInfo {
  const normalized = normalizeLegacyLsxKey(key);
  if (normalized === 'mang' || normalized === 'mang-in' || normalized === 'mang-ghep') {
    return BAG_TYPES.fallback;
  }
  return BAG_TYPES[normalized] ?? BAG_TYPES.fallback;
}

export function classifyLsxFilmType(filmType?: string): LsxFilmTypeKey {
  if (filmType === 'mangGhep') return 'mang-ghep';
  if (filmType === 'mangIn') return 'mang-in';
  return 'mang';
}

/**
 * Nhãn hiển thị "Kiểu túi" ở khâu làm túi trong LSX (PDF/DOCX/HTML).
 * - Override admin (lsxBagTypeOverride) luôn thắng → giữ nhãn kiểu đã chọn.
 * - Tự suy + có zipper: đáy đứng → "Túi zipper đáy đứng", cắt seal → "Túi zipper cắt seal",
 *   các kiểu còn lại → "Túi zipper 3 biên".
 * - Không zipper → nhãn cơ sở của kiểu túi.
 * Chỉ ảnh hưởng NHÃN; không đổi key/fields (template DOCX, lưới MÁY LÀM TÚI giữ nguyên).
 */
export function bagTypeLabelHienThi(
  bagInfo: LsxBagTypeInfo,
  bagType: string,
  hasZipper: boolean,
  hasOverride: boolean,
): string {
  if (bagInfo.key === 'fallback') return bagType || 'Túi';
  if (hasOverride) return bagInfo.label;
  if (!hasZipper) return bagInfo.label;
  if (bagInfo.key === 'tui-day-dung') return 'Túi zipper đáy đứng';
  if (bagInfo.key === 'tui-cut-seal') return 'Túi zipper cắt seal';
  return 'Túi zipper 3 biên';
}

/**
 * Giá trị "Tâm zipper cách đầu" dùng để ghi vào LSX.
 * Thứ tự ưu tiên: admin sửa tay trong LSX manual → snapshot từ báo giá → default theo kiểu túi.
 * - !hasZipper: trả 0 (ẩn dòng zipper, không tự ý hiển thị).
 * - hasZipper + manual > 0: thắng (kể cả admin sửa khác default).
 * - hasZipper + manual = 0 + snapshot > 0: dùng snapshot.
 * - hasZipper + cả hai = 0: trả 0 (layer trên render "—").
 *
 * Lưu ý: KHÔNG còn fallback 30/25 — chỉ hiển thị khi báo giá / admin có giá trị thật.
 */
export function zipperDistanceFromOrder(
  source: {
    manual: { tamZipperCachMieng: number };
    snapshot: { zipperDistanceMm?: number };
  },
  hasZipper: boolean,
  templateKey?: LsxBagTypeKey | string,
): number {
  if (!hasZipper) return 0;
  const m = source.manual.tamZipperCachMieng;
  if (typeof m === 'number' && m > 0) return m;
  const s = source.snapshot.zipperDistanceMm;
  if (typeof s === 'number' && s > 0) return s;
  return 0;
}

/** Field máy túi visible: base kiểu + khuôn bán nguyệt (luôn) + zipper nếu bật. */
export function resolveLsxBagVisibleFields(
  bagInfo: LsxBagTypeInfo,
  hasZipper: boolean,
): (keyof LSXManualFields)[] {
  if (bagInfo.key === 'fallback') return [];
  const fields = new Set<keyof LSXManualFields>(bagInfo.baseFields);
  fields.add('useSemicircularMold');
  if (hasZipper) {
    for (const f of ZIPPER_ACCESSORY_FIELDS) fields.add(f);
  }
  return [...fields];
}

export function applyBagDefaults(
  m: LSXManualFields,
  bagInfo: LsxBagTypeInfo,
  hasZipper: boolean,
): LSXManualFields {
  void hasZipper;
  const next = { ...m };
  for (const [k, v] of Object.entries(bagInfo.defaults)) {
    if (v === undefined || v === null) continue;
    const cur = (next as Record<string, unknown>)[k];
    if (cur !== undefined && cur !== null && cur !== '' && cur !== 0 && cur !== false) {
      continue;
    }
    (next as Record<string, unknown>)[k] = v;
  }
  return next;
}

export function needsLsxDivideSection(bagType: string, hasZipper: boolean): boolean {
  void bagType;
  void hasZipper;
  return false;
}

/** Có chia chỉ khi BG bật hasDivide hoặc có khổ chia. */
export function resolveLsxHasDivide(
  input: { hasDivide?: boolean; divideWidthMm?: number },
  manualDivideWidth?: number,
): boolean {
  if (input.hasDivide === true) return true;
  if ((input.divideWidthMm ?? 0) > 0) return true;
  if ((manualDivideWidth ?? 0) > 0) return true;
  return false;
}

/**
 * Layout khâu:
 * A: tui + chia → in|ghép / chia|túi
 * B: tui + không chia → in|ghép / túi
 * F: mang + chia → in → chia
 * F_no_divide: mang + không chia → chỉ in
 */
export type LsxStageLayout = 'A' | 'B' | 'F' | 'F_no_divide';

export function resolveLsxStageLayout(opts: {
  productType: string;
  hasDivide: boolean;
  hasLaminate: boolean;
}): LsxStageLayout {
  void opts.hasLaminate;
  const isMang = opts.productType === 'mang';
  if (isMang) return opts.hasDivide ? 'F' : 'F_no_divide';
  return opts.hasDivide ? 'A' : 'B';
}

/** Cờ 4 công đoạn form LSX. */
export function resolveLsxStageFlags(input: {
  productType?: string;
  numColors?: number | null;
  layer1Id?: string | null;
  layer2Id?: string | null;
  layer3Id?: string | null;
  layer4Id?: string | null;
  layer5Id?: string | null;
  layer2AltId?: string | null;
  hasDivide?: boolean;
  divideWidthMm?: number;
}, manualDivideWidth?: number): {
  showIn: boolean;
  showGhep: boolean;
  showChia: boolean;
  showTui: boolean;
  layerCount: number;
  hasDualStructure: boolean;
} {
  const ids = [input.layer1Id, input.layer2Id, input.layer3Id, input.layer4Id, input.layer5Id].filter(Boolean);
  const layerCount = ids.length;
  const hasDualStructure = !!(input.layer2Id && input.layer2AltId);
  return {
    showIn: (input.numColors ?? 0) > 0,
    showGhep: layerCount >= 2,
    showChia: resolveLsxHasDivide(
      { hasDivide: input.hasDivide, divideWidthMm: input.divideWidthMm },
      manualDivideWidth,
    ),
    showTui: input.productType !== 'mang',
    layerCount,
    hasDualStructure,
  };
}
