// ── Adapter: BaoGiaApi (server) → LsxSourceData (LSX input) ──────────────────
// Dữ liệu báo giá từ server đã có sẵn finalPrice từ saleResult/masterResult,
// structure từ layer IDs trong inputValue → không cần chạy lại engine Tính giá.
import type { BaoGiaApi, PricingSheetApi, TrangThaiBaoGiaServer } from './api/service-lts';
import { chuyenTrangThaiBaoGia } from './api/service-lts';
import type { CalculateInput, LsxSourceData } from './types';
import { dungCuaHangTinhGia } from '../store/CuaHangTinhGia';
import {
  formatChatLieuNhuBaoGia,
  type ChatLieuBagSpecLite,
} from './format-structure';

function laObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function docInputBangTinh(value: unknown): Partial<CalculateInput> {
  return laObject(value) ? (value as Partial<CalculateInput>) : {};
}

function layFinalPrice(sheet: PricingSheetApi): number {
  const saleP = (sheet.saleResult as Record<string, unknown> | null | undefined)?.finalPrice;
  if (typeof saleP === 'number') return saleP;
  const masterP = (sheet.masterResult as Record<string, unknown> | null | undefined)?.finalPrice;
  if (typeof masterP === 'number') return masterP;
  return 0;
}

/** productBagSpecs trên quotation.inputValue — map theo pricingSheetId hoặc index. */
function layProductBagSpecs(inputValue: unknown): unknown[] {
  if (!laObject(inputValue)) return [];
  const specs = inputValue.productBagSpecs;
  return Array.isArray(specs) ? specs : [];
}

function layProductBagSpecEntry(
  productBagSpecs: unknown[],
  opts: { pricingSheetId?: string; index?: number },
): Record<string, unknown> | null {
  let entry: unknown;
  if (opts.pricingSheetId) {
    entry = productBagSpecs.find(
      (s) => laObject(s) && s.pricingSheetId === opts.pricingSheetId,
    );
  }
  if (entry == null && opts.index != null) {
    entry = productBagSpecs[opts.index];
  }
  return laObject(entry) ? entry : null;
}

function layBagSpecLite(entry: Record<string, unknown> | null): ChatLieuBagSpecLite | null {
  if (!entry || !laObject(entry.bagSpec)) return null;
  const b = entry.bagSpec;
  return {
    structureBack: typeof b.structureBack === 'string' ? b.structureBack : undefined,
    structureSwapped: b.structureSwapped === true,
    bottomFollows: b.bottomFollows === 'back' ? 'back' : b.bottomFollows === 'front' ? 'front' : undefined,
    bagType: typeof b.bagType === 'string' ? b.bagType : undefined,
    hasStructureBack: b.hasStructureBack === true || !!(typeof b.structureBack === 'string' && b.structureBack),
  };
}

function layHasHalfMoonBottom(entry: Record<string, unknown> | null): boolean {
  if (!entry || !laObject(entry.bagSpec)) return false;
  return entry.bagSpec.hasHalfMoonBottom === true;
}

function layLsxBagMetadata(entry: Record<string, unknown> | null): {
  bagWidthMm?: number;
  bagLengthMm?: number;
  bottomFollows?: 'front' | 'back';
  structureSwapped?: boolean;
  zipperDistanceMm?: number;
  hasSongSieuAm?: boolean;
  songSieuAmMm?: number;
  sideSealMm?: number;
  headSealMm?: number;
  hasTearNotch?: boolean;
  tearNotchFromTopMm?: number;
  hasHangHole?: boolean;
  hangHoleDescription?: string;
  hasHandleHole?: boolean;
  handleHoleDescription?: string;
  gussetMm?: number;
  lidMm?: number;
  backSealMm?: number;
  hasBottomSeal?: boolean;
  bottomSealMm?: number;
  standupBottomSideMm?: number;
  stageNotes?: { stage: 'in' | 'ghep' | 'chia' | 'lam-tui'; text: string }[];
  stageDescriptions?: { stage: 'in' | 'ghep' | 'chia' | 'lam-tui'; text: string }[];
} {
  if (!entry || !laObject(entry.bagSpec)) return {};
  const b = entry.bagSpec as Record<string, unknown>;
  const widthMm = b.widthMm;
  const lengthMm = b.lengthMm;
  const bottomFollows = b.bottomFollows;
  const zipper = b.zipperDistanceMm;
  const saFlag = b.hasSongSieuAm;
  const saMm = b.songSieuAmMm;
  const sideSeal = b.sideSealMm;
  const headSeal = b.headSealMm;
  const tearTop = b.tearNotchFromTopMm;
  const hangDesc = b.hangHoleDescription;
  const handleDesc = b.handleHoleDescription;
  const gusset = b.gussetMm;
  const lid = b.lidMm;
  const backSeal = b.backSealMm;
  const bottomSeal = b.bottomSealMm;
  const standup = b.standupBottomSideMm;
  return {
    bagWidthMm: typeof widthMm === 'number' && widthMm > 0 ? widthMm : undefined,
    bagLengthMm: typeof lengthMm === 'number' && lengthMm > 0 ? lengthMm : undefined,
    bottomFollows: bottomFollows === 'front' || bottomFollows === 'back'
      ? bottomFollows
      : undefined,
    structureSwapped: b.structureSwapped === true,
    zipperDistanceMm: typeof zipper === 'number' && zipper > 0 ? zipper : undefined,
    hasSongSieuAm: saFlag === true ? true : undefined,
    songSieuAmMm: typeof saMm === 'number' && saMm > 0 ? saMm : undefined,
    sideSealMm: typeof sideSeal === 'number' && sideSeal > 0 ? sideSeal : undefined,
    headSealMm: typeof headSeal === 'number' && headSeal > 0 ? headSeal : undefined,
    hasTearNotch: b.hasTearNotch === true ? true : undefined,
    tearNotchFromTopMm: typeof tearTop === 'number' && tearTop > 0 ? tearTop : undefined,
    hasHangHole: b.hasHangHole === true ? true : undefined,
    hangHoleDescription: typeof hangDesc === 'string' && hangDesc ? hangDesc : undefined,
    hasHandleHole: b.hasHandleHole === true ? true : undefined,
    handleHoleDescription: typeof handleDesc === 'string' && handleDesc ? handleDesc : undefined,
    gussetMm: typeof gusset === 'number' && gusset > 0 ? gusset : undefined,
    lidMm: typeof lid === 'number' && lid > 0 ? lid : undefined,
    backSealMm: typeof backSeal === 'number' && backSeal > 0 ? backSeal : undefined,
    hasBottomSeal: b.hasBottomSeal === true ? true : undefined,
    bottomSealMm: typeof bottomSeal === 'number' && bottomSeal > 0 ? bottomSeal : undefined,
    standupBottomSideMm: typeof standup === 'number' && standup > 0 ? standup : undefined,
    stageNotes: docStageNotes(b.stageNotes),
    stageDescriptions: docStageNotes(b.stageDescriptions),
  };
}

/** Đọc mảng ghi chú công đoạn từ bagSpec — bỏ phần tử không hợp lệ. */
function docStageNotes(raw: unknown): { stage: 'in' | 'ghep' | 'chia' | 'lam-tui'; text: string }[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as Record<string, unknown>;
      const stage = o.stage;
      const text = typeof o.text === 'string' ? o.text.trim() : '';
      const validStage = stage === 'in' || stage === 'ghep' || stage === 'chia' || stage === 'lam-tui';
      return validStage ? { stage, text } : null;
    })
    .filter((x): x is { stage: 'in' | 'ghep' | 'chia' | 'lam-tui'; text: string } =>
      !!x && x.text.length > 0);
  return out.length > 0 ? out : undefined;
}

function cauTrucNhuBaoGia(
  input: Partial<CalculateInput>,
  bagSpec: ChatLieuBagSpecLite | null,
): string {
  const { materials } = dungCuaHangTinhGia.getState();
  return formatChatLieuNhuBaoGia(materials, input, bagSpec);
}

function tuPricingSheet(
  quotationId: string,
  sheet: PricingSheetApi,
  productBagSpecs: unknown[],
  sheetIndex: number,
): LsxSourceData | null {
  const rawInput = docInputBangTinh(sheet.inputValue);
  if (!rawInput.productType) return null;

  const customer = rawInput.customer
    || sheet.customer?.codeName
    || sheet.customerCodeName
    || '—';

  const entry = layProductBagSpecEntry(productBagSpecs, {
    pricingSheetId: sheet.id,
    index: sheetIndex,
  });
  const bagSpec = layBagSpecLite(entry);
  const hasHalfMoonBottom = layHasHalfMoonBottom(entry);
  const bagMetadata = layLsxBagMetadata(entry);

  return {
    id: `${quotationId}:${sheet.id}`,
    customer,
    productName: sheet.pricingSheetName || rawInput.productName || '—',
    structure: cauTrucNhuBaoGia(rawInput, bagSpec),
    finalPrice: layFinalPrice(sheet),
    chotGia: rawInput.chotGia || undefined,
    input: rawInput as CalculateInput,
    hasHalfMoonBottom: hasHalfMoonBottom || undefined,
    ...bagMetadata,
  };
}

function tuInputValueTrucTiep(
  quotationId: string,
  inputValue: unknown,
): LsxSourceData | null {
  const rawInput = docInputBangTinh(inputValue);
  if (!rawInput.productType) return null;

  const productBagSpecs = layProductBagSpecs(inputValue);
  const entry = layProductBagSpecEntry(productBagSpecs, { index: 0 });
  const bagSpec = layBagSpecLite(entry);
  const hasHalfMoonBottom = layHasHalfMoonBottom(entry);
  const bagMetadata = layLsxBagMetadata(entry);

  return {
    id: quotationId,
    customer: rawInput.customer || '—',
    productName: rawInput.productName || '—',
    structure: cauTrucNhuBaoGia(rawInput, bagSpec),
    finalPrice: rawInput.chotGia ?? 0,
    chotGia: rawInput.chotGia || undefined,
    input: rawInput as CalculateInput,
    hasHalfMoonBottom: hasHalfMoonBottom || undefined,
    ...bagMetadata,
  };
}

export function mapBaoGiaToLsxSources(baoGia: BaoGiaApi): LsxSourceData[] {
  const results: LsxSourceData[] = [];
  const productBagSpecs = layProductBagSpecs(baoGia.inputValue);

  const pricingSheets = baoGia.pricingSheets ?? [];
  if (pricingSheets.length > 0) {
    pricingSheets.forEach((sheet, index) => {
      const mapped = tuPricingSheet(baoGia.id, sheet, productBagSpecs, index);
      if (mapped) results.push(mapped);
    });
    return results;
  }

  const mapped = tuInputValueTrucTiep(baoGia.id, baoGia.inputValue);
  if (mapped) results.push(mapped);
  return results;
}

export function laBaoGiaDaDuyet(updateStatus?: string | null): boolean {
  const tt = chuyenTrangThaiBaoGia(updateStatus);
  // Server chỉ trả 4 status; chỉ 'approved' được coi là đã duyệt.
  return tt === 'approved';
}

export function layNhanTrangThai(updateStatus?: string | null): TrangThaiBaoGiaServer {
  return chuyenTrangThaiBaoGia(updateStatus);
}

// ── Sort + filter cho tab "Tạo LSX" ────────────────────────────────────────
// Tách riêng để test được và tránh phình to component.

// 3 chip lọc: 'all' = tất cả, 'co-the-tao' = approved + có sheet khách duyệt,
// 'dang-cho' = ngược lại (chưa admin duyệt HOẶC approved nhưng 0 sheet khả dụng).
export type BoLocKhaDung = 'all' | 'co-the-tao' | 'dang-cho';

// 2 lựa chọn sắp xếp theo createdAt của quotation.
export type SapXepLsx = 'moi-nhat' | 'cu-nhat';

export interface SortFilterOptions {
  boLoc: BoLocKhaDung;
  sapXep: SapXepLsx;
}

/** Kiem tra 1 BG co "san sang tao LSX" hay khong. */
export function laBgKhaDungChoLsx(
  bg: BaoGiaApi,
  helpers: {
    laDaDuyet: (s: string | null | undefined) => boolean;
    mapBaoGiaToLsxSources: (q: BaoGiaApi) => LsxSourceData[];
  },
): boolean {
  if (!helpers.laDaDuyet(bg.updateStatus)) return false;
  const sources = helpers.mapBaoGiaToLsxSources(bg);
  if (sources.length === 0) return false;
  const sheets = bg.pricingSheets ?? [];
  // source.id co dinh dang `${quotationId}:${sheet.id}` (xem tuPricingSheet).
  return sources.some((source) => {
    const sheetId = source.id.includes(':') ? source.id.split(':').slice(1).join(':') : source.id;
    const sheet = sheets.find((s) => s.id === sheetId);
    return sheet?.hasCustomerApproved === true;
  });
}

/**
 * Sort theo createdAt + filter theo kha dung.
 * Tra ve mang moi (khong mutate input).
 */
export function sortAndFilterQuotationsForLsx(
  quotations: BaoGiaApi[],
  options: SortFilterOptions,
  helpers: {
    laDaDuyet: (s: string | null | undefined) => boolean;
    mapBaoGiaToLsxSources: (q: BaoGiaApi) => LsxSourceData[];
  },
): BaoGiaApi[] {
  // Filter
  const filtered = quotations.filter((q) => {
    if (options.boLoc === 'all') return true;
    const isReady = laBgKhaDungChoLsx(q, helpers);
    return options.boLoc === 'co-the-tao' ? isReady : !isReady;
  });

  // Sort theo createdAt; fallback 0 khi Date.parse tra NaN.
  const sorted = [...filtered].sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    return options.sapXep === 'moi-nhat' ? tb - ta : ta - tb;
  });

  return sorted;
}
