import type { CalculateInput, Material } from './types';
import { boSoCauTruc } from './format-structure';

/** Công đoạn sản xuất áp dụng cho ghi chú / mô tả khác. */
export type LsxStageKey = 'in' | 'ghep' | 'chia' | 'lam-tui';

export interface LsxStageNote {
  stage: LsxStageKey;
  text: string;
}

export function formatStageDescriptionsForQuote(
  descriptions: readonly LsxStageNote[],
): string[] {
  return descriptions
    .map((description) => description.text.trim())
    .filter((text) => text.length > 0);
}

export interface QuoteProductBagSpec {
  bagType: string;
  widthMm: number;
  lengthMm: number;
  sideSealMm: number;
  hasHeadSeal: boolean;
  headSealMm: number;
  gussetMm: number;
  backSealMm: number;
  hasZipper: boolean;
  zipperDistanceMm: number;
  standupBottomSideMm: number;
  hasTearNotch: boolean;
  tearNotchFromTopMm: number;
  tearNotchFromBottomMm: number;
  hasHalfMoonBottom: boolean;
  hasHangHole: boolean;
  hangHoleDescription: string;
  hasHandleHole: boolean;
  handleHoleDescription: string;
  hasBottomSeal: boolean;
  bottomSealMm: number;
  lidMm: number;
  hasCylinder: boolean;
  includeCylinderInQuote: boolean;
  includeBagInQuote: boolean;
  cylinderQuantity: number;
  cylinderUnitPrice: number;
  cylinderNote?: string;
  otherDescription: string;
  /** Ghi chú công đoạn — nhiều dòng (dropdown công đoạn + text mỗi dòng). */
  stageNotes: LsxStageNote[];
  /** Mô tả khác theo công đoạn — nhiều dòng. */
  stageDescriptions: LsxStageNote[];
  structureBack: string;
  structureSwapped: boolean;
  hasStructureBack: boolean;
  bottomFollows: 'front' | 'back';
  hasHandle: boolean;
  handleOptionKey: string;
  hasSongSieuAm: boolean;
  songSieuAmMm: number;
  /** Màng: chiều dài mỗi cuộn màng TP (m) — prefill từ input.filmRollLength, sửa tay được. */
  rollLengthM: number;
  /** Màng: chiều ra cuộn màng (text, vd "Mặt in ra ngoài") — chuyển sang LSX ô thông tin sản phẩm, máy in/chia để trống. */
  chieuRaCuonMang: string;
}

export type BagSpecConditionalField = 'gusset' | 'backSeal' | 'standupBottom' | 'sideSeal' | 'lid' | 'songSieuAm';

export function shouldShowBagSpecField(bagType: string, field: BagSpecConditionalField): boolean {
  if (field === 'gusset') return ['4bien', 'xephong_lech', 'xephong_giua'].includes(bagType);
  if (field === 'backSeal') return ['xephong_lech', 'xephong_giua'].includes(bagType);
  if (field === 'sideSeal') return !['cutSeal', 'cutSealNapKeo', 'xephong_lech', 'xephong_giua'].includes(bagType);
  if (field === 'lid') return bagType === 'cutSealNapKeo';
  if (field === 'songSieuAm') return bagType === 'cutSealNapKeo';
  return bagType === 'dayDung';
}

export function buildDefaultBagSpec(input: CalculateInput): QuoteProductBagSpec {
  return {
    bagType: input.bagType || '',
    widthMm: input.spreadWidth ? Math.round(input.spreadWidth * 1000) : 0,
    lengthMm: input.cutStep ? Math.round(input.cutStep * 1000) : 0,
    sideSealMm: 0,
    hasHeadSeal: false,
    headSealMm: 0,
    gussetMm: 0,
    backSealMm: 0,
    hasZipper: Boolean(input.hasZipper),
    zipperDistanceMm: 0,
    standupBottomSideMm: input.bagType === 'dayDung' ? 50 : 0,
    hasTearNotch: false,
    tearNotchFromTopMm: 0,
    tearNotchFromBottomMm: 0,
    hasHalfMoonBottom: false,
    hasHangHole: false,
    hangHoleDescription: '',
    hasHandleHole: false,
    handleHoleDescription: '',
    hasBottomSeal: false,
    bottomSealMm: 0,
    lidMm: 0,
    hasCylinder: false,
    includeCylinderInQuote: true,
    includeBagInQuote: true,
    cylinderQuantity: input.numColors || 1,
    // Không lấy cylUnitPrice (đơn giá A/B đ/m², vd 7.3tr) — wizard fill từ cylinderCostPerUnit (giá 1 trục)
    cylinderUnitPrice: 0,
    cylinderNote: '',
    otherDescription: '',
    stageNotes: [],
    stageDescriptions: [],
    structureBack: '',
    structureSwapped: false,
    hasStructureBack: Boolean(input.layer2AltId),
    bottomFollows: 'front',
    hasHandle: Boolean(input.hasHandle),
    handleOptionKey: input.handleOptionKey || '',
    hasSongSieuAm: false,
    songSieuAmMm: 0,
    rollLengthM:
      input.productType === 'mang' ? input.filmRollLength || 6000 : 0,
    chieuRaCuonMang: '',
  };
}

export function buildSideStructure(
  materials: Material[],
  layer1Id: string | null | undefined,
  layer2Id: string | null | undefined,
  layer3Id: string | null | undefined,
  layer4Id: string | null | undefined,
  layer5Id: string | null | undefined,
): string {
  const parts: string[] = [];
  const l1 = materials.find((m) => m.id === layer1Id);
  if (l1) parts.push(`${l1.name} ${l1.thickness}`);
  const l2 = materials.find((m) => m.id === layer2Id);
  if (l2) parts.push(`${l2.name} ${l2.thickness}`);
  for (const id of [layer3Id, layer4Id, layer5Id]) {
    if (id) {
      const m = materials.find((mat) => mat.id === id);
      if (m) parts.push(`${m.name} ${m.thickness}`);
    }
  }
  return parts.join('//');
}

export interface StructureBackOption {
  label: string;
  structureBack: string;
  bottomFollows: 'front' | 'back';
  structureSwapped: boolean;
}

export function generateStructureBackOptions(
  input: CalculateInput,
  bagType: string,
  materials: Material[],
): StructureBackOption[] {
  const frontMatId = input.layer2Id!;
  const backMatId = input.layer2AltId!;
  const frontStructure = buildSideStructure(
    materials, input.layer1Id, frontMatId,
    input.layer3Id, input.layer4Id, input.layer5Id,
  );
  const backStructure = buildSideStructure(
    materials, input.layer1Id, backMatId,
    input.layer3Id, input.layer4Id, input.layer5Id,
  );
  const clean = boSoCauTruc;

  if (bagType === 'dayDung') {
    return [
      { label: `Mặt trước + Đáy: ${clean(frontStructure)}, Mặt sau: ${clean(backStructure)}`, structureBack: backStructure, bottomFollows: 'front', structureSwapped: false },
      { label: `Mặt trước + Đáy: ${clean(backStructure)}, Mặt sau: ${clean(frontStructure)}`, structureBack: backStructure, bottomFollows: 'front', structureSwapped: true },
      { label: `Mặt sau + Đáy: ${clean(backStructure)}, Mặt trước: ${clean(frontStructure)}`, structureBack: backStructure, bottomFollows: 'back', structureSwapped: false },
      { label: `Mặt sau + Đáy: ${clean(frontStructure)}, Mặt trước: ${clean(backStructure)}`, structureBack: backStructure, bottomFollows: 'back', structureSwapped: true },
    ];
  }

  return [
    { label: `Mặt trước: ${clean(frontStructure)}, Mặt sau: ${clean(backStructure)}`, structureBack: backStructure, bottomFollows: 'front', structureSwapped: false },
    { label: `Mặt trước: ${clean(backStructure)}, Mặt sau: ${clean(frontStructure)}`, structureBack: backStructure, bottomFollows: 'front', structureSwapped: true },
  ];
}

export function generateOrderDescription(
  productName: string,
  structure: string,
  bagType: string,
  widthMm: number,
  lengthMm: number,
  numColors: number,
  hasZipper: boolean,
  hasHandle: boolean,
  spec: QuoteProductBagSpec,
): string {
  const toleranceW = 2;
  const toleranceL = 3;

  const bagTypeLabels: Record<string, string> = {
    '3bien': 'Túi 3 biên',
    '4bien': 'Túi 4 biên',
    'xephong_lech': 'Túi xếp hông lưng lệch',
    'xephong_giua': 'Túi xếp hông lưng giữa',
    'dayDung': 'Túi đáy đứng',
    'cutSeal': 'Túi cut seal',
    'cutSealNapKeo': 'Túi cut seal mở miệng có nắp keo',
  };

  const parts: string[] = [];

  if (productName) parts.push(productName);

  const btLabel = bagTypeLabels[bagType] || (bagType ? `Loại: ${bagType}` : '');
  if (btLabel) parts.push(btLabel);

  if (structure) parts.push(structure);

  if (widthMm > 0 && lengthMm > 0) {
    const dims = spec.gussetMm > 0
      ? `${widthMm}×${lengthMm}+${spec.gussetMm}mm`
      : `${widthMm}×${lengthMm}mm`;
    parts.push(`KT: ${dims} (±${toleranceW}mm / ±${toleranceL}mm)`);
  }

  if (numColors > 0) parts.push(`In ${numColors} màu`);

  if (hasZipper) parts.push('Có zipper');
  if (hasHandle) parts.push('Có quai');

  const opts: string[] = [];
  if (spec.hasHangHole) opts.push('đục lỗ treo');
  if (spec.hasTearNotch) opts.push('nhấn xé V');
  if (spec.hasHandleHole) opts.push('đục lỗ quai xách');
  if (spec.hasHalfMoonBottom) opts.push('đáy bán nguyệt');
  if (spec.hasBottomSeal) opts.push('hàn đáy');
  if (opts.length) parts.push(opts.join(', '));

  if (spec.otherDescription) parts.push(spec.otherDescription);

  return parts.join(' – ');
}
