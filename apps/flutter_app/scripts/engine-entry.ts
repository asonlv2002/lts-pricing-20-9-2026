// ═══════════════════════════════════════════════════════════════════════════
// Engine Entry cho Flutter App (flutter_js / QuickJS)
// Bundle file này bằng esbuild → assets/engine.bundle.js (IIFE)
// Expose globalThis.LTS = { calculate(inputJson, materialsJson, constantsJson, profitTableJson) }
// Tất cả tham số là JSON string (để tránh issue marshal phức tạp giữa Dart ↔ QuickJS).
// ═══════════════════════════════════════════════════════════════════════════
import { tinhGia, traLoiNhuan, layVatLieu, toiUuDoDay, KetQuaToiUuDoDay } from '../../../packages/bang-tinh-gia/src';
import type {
  DauVaoTinhGia,
  KetQuaTinhGia,
  VatLieu,
  HangSo,
} from '../../../packages/kieu-du-lieu/src';
import type { DongLoiNhuan } from '../../../packages/hang-so/src';

// ── Shape tiếng Anh (giống apps/web/src/lib/types.ts) ────────────────────────
interface Material {
  id: string; name: string; group?: string;
  density: number; thickness: number; pricePerKg: number;
  isPETorPA: boolean; adjustableMic?: boolean;
  rollLength: number; inkPricePerColor: number; pricePerM2?: number;
}
interface AppConstants {
  zipperPrice: number; zipperWeight: number;
  tapePrice: number; tapeWeight: number;
  handlePrice: number; handleWeight: number;
  boxPriceDefault: number; bagsPerBoxDefault: number;
  interestBase: number; interestSpread: number;
  paymentDays: number;
  cylinderPricePerUnit: number; cylPriceA: number; cylPriceB: number;
  ghepCPSX: number;
  ghepWasteA: number; ghepWasteB: number; ghepWasteC: number;
  cutWasteA: number; cutWasteB: number; cutWasteC: number;
  shippingPerKmDefault: number; shippingKmDefault: number;
  laborCost: number; cutBase: number;
  cutThreshold1: number; cutThreshold2: number;
  cutMult1: number; cutMult2: number; cutMult3: number;
  cutRules?: { label: string; threshold: number | null; multiplier: number }[];
  nhuPrice: number; moPrice: number;
  colorSetup: Record<number, number>;
  printWasteA: number; printWasteB: number; printWasteC: number; printWasteD: number;
}
interface ProfitRow { threshold: number; col1: number; col2: number; }
interface CalculateInput {
  customer: string; productName: string; productType: string;
  bagType: string; filmType: string; filmRollLength: number;
  quantity: number; numColors: number | null; numImages: number;
  layer1Id?: string | null; layer2Id?: string | null; layer3Id?: string | null;
  layer4Id?: string | null; layer5Id?: string | null;
  spreadWidth: number; cutStep: number;
  metallicSurcharge: number; coverageRatio: number;
  handleWeight: number; zipperWeight: number; tapeWeight: number;
  hasZipper: boolean; hasTape: boolean; hasHandle: boolean;
  paymentDays: number; profitColumn: number;
  commissionRate: number; commissionFixedVND: number;
  commissionUnit: 'percent' | 'vnd'; commissionInputValue: number;
  bagsPerBox: number; boxPrice: number;
  shippingPerKm: number; shippingKm: number;
  cylLength: number; cylCircum: number; cylUnitPrice: number;
  cylType: 'A' | 'B' | 'custom'; cylIncluded: boolean;
  targetThickness?: number;
  micOverrides?: Record<string, number>;
}

const PROFIT_DEFAULT = { col1: 0.04, col2: 0.11 };

// ── Adapters (copy nguyên từ apps/web/src/lib/engine.ts) ─────────────────────
function toVatLieu(m: Material): VatLieu {
  return {
    id: m.id, ten: m.name, nhom: m.group,
    khoiLuongRieng: m.density, doDay: m.thickness,
    giaMoiKg: m.pricePerKg, laPEThoaPA: m.isPETorPA,
    doiDuocMic: m.adjustableMic, chieuDaiCuon: m.rollLength,
    giaMucMoiMau: m.inkPricePerColor,
    giaMoiM2: m.pricePerM2 ?? (m.pricePerKg * m.thickness * m.density / 1000),
  };
}

function toHangSo(c: AppConstants): HangSo {
  return {
    giaKhoa: c.zipperPrice, khoiLuongKhoa: c.zipperWeight,
    giaBangKeo: c.tapePrice, khoiLuongBangKeo: c.tapeWeight,
    giaQuaiXach: c.handlePrice, khoiLuongQuaiXach: c.handleWeight,
    giaThuungMacDinh: c.boxPriceDefault, soTuiPerThuungMacDinh: c.bagsPerBoxDefault,
    laiSuatMacDinh: c.interestBase ?? 0.10,
    laiSuatCoBan: c.interestBase ?? 0.10,
    laiSuatThem: c.interestSpread ?? 0.03,
    ngayThanhToanMacDinh: c.paymentDays,
    giaTrucDonVi: c.cylinderPricePerUnit,
    giaTrucA: c.cylPriceA ?? c.cylinderPricePerUnit,
    giaTrucB: c.cylPriceB ?? 6500000,
    cpSXGhep: c.ghepCPSX,
    hatHaoGhepA: c.ghepWasteA, hatHaoGhepB: c.ghepWasteB, hatHaoGhepC: c.ghepWasteC,
    hatHaoCatA: c.cutWasteA, hatHaoCatB: c.cutWasteB, hatHaoCatC: c.cutWasteC,
    cuocVanChuyenMacDinh: c.shippingPerKmDefault, soKmMacDinh: c.shippingKmDefault,
    chiPhiNhanCong: c.laborCost, cpCatCoBan: c.cutBase,
    nguongCat1: c.cutThreshold1, nguongCat2: c.cutThreshold2,
    heSoCat1: c.cutMult1, heSoCat2: c.cutMult2, heSoCat3: c.cutMult3,
    quyTacCat: c.cutRules?.map(rule => ({ nhan: rule.label, nguong: rule.threshold, heSo: rule.multiplier })),
    giaNhu: c.nhuPrice, giaMo: c.moPrice,
    chiPhiCaiDatMau: c.colorSetup,
    hatHaoInA: c.printWasteA, hatHaoInB: c.printWasteB,
    hatHaoInC: c.printWasteC, hatHaoInD: c.printWasteD,
  } as HangSo;
}

function toDongLoiNhuan(rows: ProfitRow[]): DongLoiNhuan[] {
  return rows.map(r => ({ nguong: r.threshold, cot1: r.col1, cot2: r.col2 }));
}

function toDauVao(i: CalculateInput): DauVaoTinhGia {
  return {
    khachHang: i.customer, tenSanPham: i.productName,
    loaiSanPham: i.productType, loaiTui: i.bagType, loaiMang: i.filmType,
    chieuDaiCuonMang: i.filmRollLength || 6000,
    soLuong: i.quantity, soMau: i.numColors, soHinh: i.numImages || 1,
    idLop1: i.layer1Id, idLop2: i.layer2Id, idLop3: i.layer3Id,
    idLop4: i.layer4Id, idLop5: i.layer5Id,
    khoTrai: i.spreadWidth, buocCat: i.cutStep,
    phiKimLoai: i.metallicSurcharge || 0,
    tyLePhuMucMuc: i.coverageRatio || 1,
    khoiLuongQuaiXach: i.handleWeight || 0,
    khoiLuongKhoa: i.zipperWeight || 0,
    khoiLuongBangKeo: i.tapeWeight || 0,
    coKhoa: i.hasZipper, coBangKeo: i.hasTape, coQuaiXach: i.hasHandle,
    ngayThanhToan: i.paymentDays || 30,
    loaiTruc: i.cylType ?? 'A',
    baoTruc: i.cylIncluded ?? false,
    cotLoiNhuan: i.profitColumn || 2,
    tyLeHoaHong: i.commissionRate || 0,
    hoaHongCoDinhVND: i.commissionFixedVND || 0,
    donViHoaHong: i.commissionUnit || 'percent',
    giaTriHoaHongNhap: i.commissionInputValue || 0,
    soTuiPerThuung: i.bagsPerBox || 0,
    giaThuung: i.boxPrice || 0,
    cuocVanChuyenPerKm: i.shippingPerKm || 0,
    soKmVanChuyen: i.shippingKm || 0,
    chieuDaiTruc: i.cylLength || 0,
    chuViTruc: i.cylCircum || 0,
    giaTrucDonVi: i.cylUnitPrice || 0,
    doDayMucTieu: i.targetThickness || 0,
    ghiDeDayLop: i.micOverrides ? Object.fromEntries(
      Object.entries(i.micOverrides).map(([k, v]) => {
        const num = k.replace('layer', '').replace('Id', '');
        return [`idLop${num}`, v];
      })
    ) : {},
  } as DauVaoTinhGia;
}

function toResult(r: KetQuaTinhGia, originalInput: CalculateInput): any {
  return {
    input: originalInput,
    structureText: r.chuoiCauTruc,
    totalThickness: r.tongDoDay,
    totalGSM: r.tongGSM,
    bagArea: r.dienTichTui,
    totalArea: r.tongDienTich,
    printWidth: r.khoCatIn,
    filmLength: r.chieuDaiMang,
    cutWidth: r.khoCat,
    cutMeters: r.metCat,
    cutWaste: r.hatHaoCat,
    cutCPSX: r.cpSXCat,
    cutCostCPSX: r.chiPhiSXCat,
    cutTotalCost: r.tongChiPhiCat,
    printNLWidth: r.khoNLIn,
    printMeters: r.metIn,
    printWaste: r.hatHaoIn,
    printCPSX: r.cpSXIn,
    printCostCPSX: r.chiPhiSXIn,
    printCostMaterial: r.chiPhiVatLieuIn,
    printTotalCost: r.tongChiPhiIn,
    totalProductionCost: r.tongChiPhiSX,
    totalLamCost: r.tongChiPhiGhep,
    profitRate: r.tyLeLoiNhuan,
    profitAmount: r.soTienLoiNhuan,
    revenue: r.doanhThu,
    costPerUnit: r.chiPhiDonVi,
    zipperPerUnit: r.khoaPerDonVi,
    zipperTotal: r.tongTienKhoa,
    tapePerUnit: r.bangKeoPerDonVi,
    tapeTotal: r.tongTienBangKeo,
    handlePerUnit: r.quaiXachPerDonVi,
    handleTotal: r.tongTienQuaiXach,
    boxPerUnit: r.thuungPerDonVi,
    boxTotal: r.tongTienThuung,
    actualBoxPrice: r.giaThuungThucTe,
    actualBagsPerBox: r.soTuiPerThuungThucTe,
    numBoxes: r.soThuung,
    filmRollArea: r.dienTichCuonMang,
    packagingPerUnit: r.phiDongGoiPerDonVi,
    tareWeight: r.khoiLuongTare,
    shippingPerUnit: r.cuocVanChuyenPerDonVi,
    shippingTotal: r.tongCuocVanChuyen,
    shippingRate: r.tyLeCuocVanChuyen,
    actualShippingPerKm: r.cuocVanChuyenThucTePerKm,
    actualShippingKm: r.soKmThucTe,
    interestPerUnit: r.laiSuatPerDonVi,
    interestBase: r.laiSuatCoBan ?? 0,
    interestSpread: r.laiSuatThem ?? 0,
    paymentDays: r.ngayThanhToan,
    commissionPerUnit: r.hoaHongPerDonVi,
    finalPrice: r.giaCuoiCung,
    cylinderCost: r.chiPhiTruc,
    cylinderCostPerUnit: r.chiPhiTrucPerDonVi,
    cylAllocPerUnit: r.chiPhiTrucPhanBo ?? 0,
    cylArea: r.dienTichTruc,
    cylLength: r.chieuDaiTruc,
    cylCircum: r.chuViTruc,
    productionDays: r.ngaySanXuat,
    layers: {
      print: {
        width: r.cacLop.in.kho, meters: r.cacLop.in.met,
        waste: r.cacLop.in.hatHao, cpsx: r.cacLop.in.cpsx,
        costCPSX: r.cacLop.in.chiPhiSX, costMat: r.cacLop.in.chiPhiVL,
        total: r.cacLop.in.tongCong,
      },
      laminations: r.cacLop.ghep.map((g: any) => ({
        width: g.kho, meters: g.met, waste: g.hatHao, cpsx: g.cpsx,
        costCPSX: g.chiPhiSX, costMat: g.chiPhiVL, total: g.tongCong,
      })),
      cut: {
        width: r.cacLop.cat.kho, meters: r.cacLop.cat.met,
        waste: r.cacLop.cat.hatHao, cpsx: r.cacLop.cat.cpsx,
        costCPSX: r.cacLop.cat.chiPhiSX, total: r.cacLop.cat.tongCong,
      },
    },
  };
}

function lookupProfit(totalCost: number, column: number, profitTable: ProfitRow[]): number {
  const col = column === 1 ? 'col1' : 'col2';
  let val = PROFIT_DEFAULT[col as 'col1' | 'col2'];
  for (const row of profitTable) {
    if (totalCost < row.threshold) {
      val = row[col as 'col1' | 'col2'] as number;
      break;
    }
  }
  return val;
}

function optimizeThickness(
  input: CalculateInput,
  materials: Material[],
): any {
  if (!input.targetThickness || input.targetThickness <= 0) return null;

  const vatLieuDangChon = [
    (() => {
      const m = input.layer1Id ? materials.find(mm => mm.id === input.layer1Id) : undefined;
      return {
        id: 'layer1Id',
        materialId: m?.id,
        doDay: input.layer1Id ? (input.micOverrides?.['layer1Id'] ?? m?.thickness ?? 0) : 0,
        laLLDPE: !!m && (m.name.toLowerCase().includes('lldpe') || (m.group?.toLowerCase().includes('lldpe') ?? false)),
      };
    })(),
    ...([2, 3, 4, 5].map(idx => {
      const key = `layer${idx}Id` as keyof CalculateInput;
      const id = input[key] as string | null | undefined;
      if (!id) return null;
      const m = materials.find(mm => mm.id === id);
      return m ? {
        id: key,
        materialId: m.id,
        doDay: input.micOverrides?.[key] ?? m.thickness,
        laLLDPE: m.name.toLowerCase().includes('lldpe') || (m.group?.toLowerCase().includes('lldpe') ?? false),
      } : null;
    }).filter(Boolean) as { id: string; materialId?: string; doDay: number; laLLDPE: boolean }[])
  ].filter(layer => layer.doDay > 0);

  const vatLieuVN = materials.map(toVatLieu);
  const ketQua = toiUuDoDay(input.targetThickness, vatLieuDangChon, vatLieuVN);

  const optimizedLayerIds: Record<string, string> = {};
  const optimizedMicOverrides: Record<string, number> = {};
  ketQua.ketQua.forEach(k => {
    const m = materials.find(mm => mm.id === (input as any)[k.layerId]);
    if (k.materialId && k.materialId !== m?.id) {
      optimizedLayerIds[k.layerId] = k.materialId;
    }
    const selected = materials.find(mm => mm.id === (k.materialId ?? m?.id));
    if (selected && k.adjustedThickness !== selected.thickness) {
      optimizedMicOverrides[k.layerId] = k.adjustedThickness;
    }
  });

  return { optimizedLayerIds, optimizedMicOverrides, result: ketQua };
}

// ── Public API: tất cả nhận JSON string, trả JSON string ─────────────────────
function calculate(
  inputJson: string,
  materialsJson: string,
  constantsJson: string,
  profitTableJson: string,
): string {
  try {
    const input: CalculateInput = JSON.parse(inputJson);
    const materials: Material[] = JSON.parse(materialsJson);
    const constants: AppConstants = JSON.parse(constantsJson);
    const profitTable: ProfitRow[] = JSON.parse(profitTableJson);
    const ketQua = tinhGia(
      toDauVao(input),
      materials.map(toVatLieu),
      toHangSo(constants),
      toDongLoiNhuan(profitTable),
    );
    if (!ketQua) return JSON.stringify({ error: 'null_result' });
    return JSON.stringify(toResult(ketQua, input));
  } catch (e: any) {
    return JSON.stringify({ error: String(e && e.message ? e.message : e) });
  }
}

// ── Expose sang globalThis (QuickJS-safe) ────────────────────────────────────
(globalThis as any).LTS = {
  calculate,
  lookupProfit: (totalCost: number, column: number, profitTableJson: string) => {
    const rows: ProfitRow[] = JSON.parse(profitTableJson);
    return lookupProfit(totalCost, column, rows);
  },
  optimizeThickness: (inputJson: string, materialsJson: string) => {
    try {
      const input: CalculateInput = JSON.parse(inputJson);
      const materials: Material[] = JSON.parse(materialsJson);
      return JSON.stringify(optimizeThickness(input, materials));
    } catch (e: any) {
      return JSON.stringify({ error: String(e && e.message ? e.message : e) });
    }
  },
  toiUuDoDay: (target: number, layers: any[], materials: Material[]) => {
    try {
      return JSON.stringify(toiUuDoDay(target, layers, materials.map(toVatLieu)));
    } catch (e: any) {
      return JSON.stringify({ error: String(e && e.message ? e.message : e) });
    }
  },
  version: '0.1.0',
};
