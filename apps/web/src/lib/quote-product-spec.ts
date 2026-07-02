import type { CalculateInput } from './types';

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
  cylinderQuantity: number;
  cylinderUnitPrice: number;
  otherDescription: string;
  structureBack: string;
  structureSwapped: boolean;
  hasStructureBack: boolean;
  hasHandle: boolean;
  handleOptionKey: string;
}

export type BagSpecConditionalField = 'gusset' | 'backSeal' | 'standupBottom' | 'sideSeal' | 'lid';

export function shouldShowBagSpecField(bagType: string, field: BagSpecConditionalField): boolean {
  if (field === 'gusset') return ['4bien', 'xephong_lech', 'xephong_giua'].includes(bagType);
  if (field === 'backSeal') return ['xephong_lech', 'xephong_giua'].includes(bagType);
  if (field === 'sideSeal') return !['cutSeal', 'cutSealNapKeo'].includes(bagType);
  if (field === 'lid') return bagType === 'cutSealNapKeo';
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
    cylinderQuantity: input.numColors || 1,
    cylinderUnitPrice: input.cylUnitPrice || 0,
    otherDescription: '',
    structureBack: '',
    structureSwapped: false,
    hasStructureBack: false,
    hasHandle: Boolean(input.hasHandle),
    handleOptionKey: input.handleOptionKey || '',
  };
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
