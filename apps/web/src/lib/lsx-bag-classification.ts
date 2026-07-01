// ── Phân loại kiểu túi LSX từ (bagType, hasZipper) ──────────────────────────
// Dùng chung cho ModalDonLSX (form nhập) và lsxExport.ts (xuất DOCX/PDF).
// KHÔNG sửa bagType tính giá trong engine.
// Tham chiếu: .claude/training/LSX-References.md Section 13.

import type { LSXManualFields } from './types';

export type LsxBagTypeKey =
  | 'tui-3-bien'
  | 'tui-zipper-3-bien'
  | 'tui-4-bien'
  | 'tui-dan-lung-giua'
  | 'tui-xep-hong-lung-lech'
  | 'tui-zipper-day-dung'
  | 'tui-zipper-cat-seal'
  | 'tui-cat-seal-nap-keo'
  | 'fallback';

export interface LsxBagTypeInfo {
  key: LsxBagTypeKey;
  label: string;
  extraFields: (keyof LSXManualFields)[];
  defaults: Partial<LSXManualFields>;
}

const BAG_TYPES: Record<LsxBagTypeKey, LsxBagTypeInfo> = {
  'tui-3-bien': {
    key: 'tui-3-bien',
    label: 'Túi 3 biên',
    extraFields: ['holePunchInfo'],
    defaults: { hanDau: 30, sealEdge: '7mm', holePunchInfo: 'Lỗ tròn Ø8mm cách đầu túi 10mm' },
  },
  'tui-zipper-3-bien': {
    key: 'tui-zipper-3-bien',
    label: 'Túi zipper 3 biên',
    extraFields: ['useDualCutter', 'useSemicircularMold'],
    defaults: { hanBien: 10, useDualCutter: true, useSemicircularMold: true },
  },
  'tui-4-bien': {
    key: 'tui-4-bien',
    label: 'Túi 4 biên',
    extraFields: ['xepHong', 'holePunchInfo', 'ventHoleInfo'],
    defaults: { hanBien: 10, hanDau: 50, xepHong: 60, holePunchInfo: '3 lỗ tròn quai xách (theo Market)', ventHoleInfo: '6 lỗ/mặt Ø1mm' },
  },
  'tui-dan-lung-giua': {
    key: 'tui-dan-lung-giua',
    label: 'Túi dán lưng giữa',
    extraFields: ['danLung', 'ventHoleInfo'],
    defaults: { hanDau: 13, danLung: 13, ventHoleInfo: '2 lỗ trên/dưới' },
  },
  'tui-xep-hong-lung-lech': {
    key: 'tui-xep-hong-lung-lech',
    label: 'Túi xếp hông dán lưng lệch',
    extraFields: ['xepHong', 'danLungLech', 'danDay'],
    defaults: { xepHong: 73, danLungLech: 10, danDay: 10 },
  },
  'tui-zipper-day-dung': {
    key: 'tui-zipper-day-dung',
    label: 'Túi zipper đáy đứng',
    extraFields: ['tamZipperCachMieng', 'tearNotch', 'sealEdge', 'foldBottom'],
    defaults: { tamZipperCachMieng: 30, tearNotch: '2 bên cách miệng 15mm', sealEdge: '10mm', foldBottom: '100mm' },
  },
  'tui-zipper-cat-seal': {
    key: 'tui-zipper-cat-seal',
    label: 'Túi zipper cắt seal',
    extraFields: ['tamZipperCachMieng', 'loTreoInfo'],
    defaults: { tamZipperCachMieng: 25, loTreoInfo: 'Ø8mm ở giữa khoảng cách miệng túi và tâm zipper' },
  },
  'tui-cat-seal-nap-keo': {
    key: 'tui-cat-seal-nap-keo',
    label: 'Túi cắt seal có nắp băng keo',
    extraFields: ['nap', 'songSieuAm', 'docQuaiXach', 'danKeoNap'],
    defaults: { nap: 35, songSieuAm: 32, docQuaiXach: true, danKeoNap: true },
  },
  'fallback': {
    key: 'fallback',
    label: 'Khác (hiện tất cả field)',
    extraFields: [],
    defaults: {},
  },
};

export const ALL_LSX_BAG_TYPES: LsxBagTypeInfo[] = Object.values(BAG_TYPES);

export function classifyLsxBagType(bagType: string, hasZipper: boolean): LsxBagTypeInfo {
  switch (bagType) {
    case '3bien':
      return hasZipper ? BAG_TYPES['tui-zipper-3-bien'] : BAG_TYPES['tui-3-bien'];
    case '4bien':
      return BAG_TYPES['tui-4-bien'];
    case 'xephong_giua':
      return BAG_TYPES['tui-dan-lung-giua'];
    case 'xephong_lech':
      return BAG_TYPES['tui-xep-hong-lung-lech'];
    case 'dayDung':
      return hasZipper ? BAG_TYPES['tui-zipper-day-dung'] : BAG_TYPES['fallback'];
    case 'cutSeal':
      return hasZipper ? BAG_TYPES['tui-zipper-cat-seal'] : BAG_TYPES['tui-cat-seal-nap-keo'];
    default:
      return BAG_TYPES['fallback'];
  }
}

export function classifyLsxBagTypeByKey(key: string): LsxBagTypeInfo {
  return BAG_TYPES[key as LsxBagTypeKey] ?? BAG_TYPES['fallback'];
}

export function needsLsxDivideSection(bagType: string, hasZipper: boolean): boolean {
  const info = classifyLsxBagType(bagType, hasZipper);
  return info.key === 'tui-zipper-cat-seal';
}
