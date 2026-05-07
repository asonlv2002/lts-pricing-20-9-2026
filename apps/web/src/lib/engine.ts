// ── Adapter: chuyển đổi EN ↔ VN rồi gọi engine chung @lts/bang-tinh-gia
// Web UI giữ tên biến tiếng Anh, engine core dùng tiếng Việt.
// ═══════════════════════════════════════════════════════════════════════════
import { tinhGia, traLoiNhuan, toiUuDoDay, KetQuaToiUuDoDay } from '@lts/bang-tinh-gia';
import type { DauVaoTinhGia, KetQuaTinhGia, VatLieu, HangSo } from '@lts/kieu-du-lieu';
import type { DongLoiNhuan } from '@lts/hang-so';
import { CalculateInput, CalculateResult, Material, AppConstants, ProfitRow } from './types';
import { PROFIT_DEFAULT } from './data';

// ── Lookup Profit (giữ nguyên API cũ cho ManHinhQuanLy) ──────────────────────
export function lookupProfit(totalCost: number, column: number, profitTable: ProfitRow[]): number {
  const col = column === 1 ? 'col1' : 'col2';
  let val = PROFIT_DEFAULT[col as keyof typeof PROFIT_DEFAULT];
  for (const row of profitTable) {
    if (totalCost < row.threshold) {
      val = row[col as keyof typeof row] as number;
      break;
    }
  }
  return val;
}

// ── Auto-optimize thickness using engine ─────────────────────────────────
export function optimizeThickness(
  input: CalculateInput,
  materials: Material[]
): {
  optimizedLayerIds: Record<string, string>;
  optimizedMicOverrides: Record<string, number>;
  result: ReturnType<typeof toiUuDoDay>;
} | null {
  if (!input.targetThickness || input.targetThickness <= 0) return null;

  const vatLieuDangChon: { id: string; materialId?: string; doDay: number; laLLDPE: boolean }[] = [
    (() => {
      const m = materials.find(mm => mm.id === input.layer1Id);
      return {
        id: 'layer1Id',
        materialId: m?.id,
        doDay: (input.micOverrides?.layer1Id ?? m?.thickness ?? 0),
        laLLDPE: !!m && (m.name.toLowerCase().includes('lldpe') || (m.group?.toLowerCase().includes('lldpe') ?? false)),
      };
    })(),
    ...[2,3,4,5].map(i => {
      const key = `layer${i}Id` as keyof typeof input;
      const m = materials.find(mm => mm.id === input[key]);
      return m ? {
        id: key,
        materialId: m.id,
        doDay: input.micOverrides?.[key as string] ?? m.thickness,
        laLLDPE: m.name.toLowerCase().includes('lldpe') || (m.group?.toLowerCase().includes('lldpe') ?? false),
      } : null;
    }).filter((item): item is NonNullable<typeof item> => item !== null)
  ].filter(item => item.doDay > 0);

  const vatLieuVN = materials.map(toVatLieu);
  const ketQua = toiUuDoDay(input.targetThickness, vatLieuDangChon, vatLieuVN);

  const optimizedLayerIds: Record<string, string> = {};
  const optimizedMicOverrides: Record<string, number> = {};
  ketQua.ketQua.forEach(k => {
    const m = materials.find(mm => mm.id === input[k.layerId as keyof typeof input]);
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

// ── Material EN → VatLieu VN ─────────────────────────────────────────────────
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

// ── AppConstants EN → HangSo VN ──────────────────────────────────────────────
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
    chiPhiNhanCong: c.laborCost,
    cpCatCoBan: c.cutBase,
    nguongCat1: c.cutThreshold1, nguongCat2: c.cutThreshold2,
    heSoCat1: c.cutMult1, heSoCat2: c.cutMult2, heSoCat3: c.cutMult3,
    giaNhu: c.nhuPrice, giaMo: c.moPrice,
    chiPhiCaiDatMau: c.colorSetup,
    hatHaoInA: c.printWasteA, hatHaoInB: c.printWasteB,
    hatHaoInC: c.printWasteC, hatHaoInD: c.printWasteD,
  };
}

// ── ProfitRow EN → DongLoiNhuan VN ──────────────────────────────────────────
function toDongLoiNhuan(rows: ProfitRow[]): DongLoiNhuan[] {
  return rows.map(r => ({ nguong: r.threshold, cot1: r.col1, cot2: r.col2 }));
}

// ── CalculateInput EN → DauVaoTinhGia VN ─────────────────────────────────────
function toDauVao(i: CalculateInput): DauVaoTinhGia {
  return {
    khachHang: i.customer, tenSanPham: i.productName,
    loaiSanPham: i.productType, loaiTui: i.bagType, loaiMang: i.filmType,
    chieuDaiCuonMang: i.filmRollLength || 6000,
    soLuong: i.quantity, soMau: i.numColors, soHinh: i.numImages || 1,
    idLop1: i.layer1Id, idLop2: i.layer2Id, idLop3: i.layer3Id, idLop4: i.layer4Id, idLop5: i.layer5Id,
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
    // tuDongToiUuDoDay bỏ qua - xử lý bên ngoài qua optimizeThickness()
    ghiDeDayLop: i.micOverrides ? Object.fromEntries(
      Object.entries(i.micOverrides).map(([k, v]) => {
        // layer1Id → idLop1, layer2Id → idLop2, ...
        const num = k.replace('layer', '').replace('Id', '');
        return [`idLop${num}`, v];
      })
    ) : {},
  };
}

// ── KetQuaTinhGia VN → CalculateResult EN ────────────────────────────────────
	function toResult(r: KetQuaTinhGia, originalInput: CalculateInput, materials: Material[]): CalculateResult {
  const findMat = (id: string | null | undefined) => materials.find(m => m.id === id) || null;
  const printMat = findMat(originalInput.layer1Id);
  const lamIds = [originalInput.layer2Id, originalInput.layer3Id, originalInput.layer4Id, originalInput.layer5Id];
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
        material: printMat, // resolve by layer1Id from materials catalog
        width: r.cacLop.in.kho,
        meters: r.cacLop.in.met,
        waste: r.cacLop.in.hatHao,
        cpsx: r.cacLop.in.cpsx,
        costCPSX: r.cacLop.in.chiPhiSX,
        costMat: r.cacLop.in.chiPhiVL,
        total: r.cacLop.in.tongCong,
      },
      laminations: r.cacLop.ghep.map((g: any, idx: number) => ({
        layerNum: idx + 2,
        material: findMat(lamIds[idx]),
        width: g.kho,
        meters: g.met,
        waste: g.hatHao,
        cpsx: g.cpsx,
        costCPSX: g.chiPhiSX,
        costMat: g.chiPhiVL,
        total: g.tongCong,
      })),
      cut: {
        width: r.cacLop.cat.kho,
        meters: r.cacLop.cat.met,
        waste: r.cacLop.cat.hatHao,
        cpsx: r.cacLop.cat.cpsx,
        costCPSX: r.cacLop.cat.chiPhiSX,
        total: r.cacLop.cat.tongCong,
      },
    },
  };
}

// ── Main calculate — API giữ nguyên cho web ──────────────────────────────────
export function calculate(
  input: CalculateInput,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[]
): CalculateResult | null {
  const dauVao = toDauVao(input);
  const vatLieu = materials.map(toVatLieu);
  const hangSo = toHangSo(constants);
  const bangLN = toDongLoiNhuan(profitTable);

  const ketQua = tinhGia(dauVao, vatLieu, hangSo, bangLN);
  if (!ketQua) return null;

  return toResult(ketQua, input, materials);
}
