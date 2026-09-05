// ── Adapter: chuyển đổi EN ↔ VN rồi gọi engine chung @lts/bang-tinh-gia
// Web UI vẫn nhận schema cũ, nhưng phần xử lý ưu tiên tên tiếng Việt ở adapter.
// ═══════════════════════════════════════════════════════════════════════════
import { tinhGia, traLoiNhuan, toiUuDoDay, KetQuaToiUuDoDay } from '@lts/bang-tinh-gia';
import type { DauVaoTinhGia, KetQuaTinhGia, VatLieu, HangSo, GiaVatLieuKhoNho } from '@lts/kieu-du-lieu';
import type { DongLoiNhuan } from '@lts/hang-so';
import { CalculateInput, CalculateResult, Material, AppConstants, ProfitRow, SmallWidthMaterialPrice } from './types';
import { PROFIT_DEFAULT } from './data';
import { mapOutsourceEnToVn, mapPricingModeEnToVn } from './outsource-map';

// ── Tra lợi nhuận (giữ alias cũ cho các module chưa đổi) ──────────────────────
export function traLoiNhuanTheoBang(tongChiPhi: number, cot: number, bangLoiNhuan: ProfitRow[], nhomKhach: 'normal' | 'large' = 'normal'): number {
  const tenCot = nhomKhach === 'large'
    ? (cot === 1 ? 'largeCol1' : 'largeCol2')
    : (cot === 1 ? 'col1' : 'col2');
  let giaTri = PROFIT_DEFAULT[tenCot as keyof typeof PROFIT_DEFAULT];
  for (const dong of bangLoiNhuan) {
    if (tongChiPhi < dong.threshold) {
      giaTri = dong[tenCot as keyof typeof dong] as number;
      break;
    }
  }
  return giaTri;
}
export const lookupProfit = traLoiNhuanTheoBang;

// ── Auto-optimize thickness using engine ─────────────────────────────────
export function toiUuDoDayTheoVatLieu(
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

  const vatLieuVN = materials.map(doiSangVatLieu);
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
function doiSangVatLieu(m: Material): VatLieu {
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
function doiSangHangSo(c: AppConstants, input?: CalculateInput): HangSo {
  const luaChonQuai = c.handleOptions?.find(o => o.key === input?.handleOptionKey);
  return {
    giaKhoa: c.zipperPrice, khoiLuongKhoa: c.zipperWeight,
    giaBangKeo: c.tapePrice, khoiLuongBangKeo: c.tapeWeight,
    giaQuaiXach: luaChonQuai?.price ?? c.handlePrice, khoiLuongQuaiXach: luaChonQuai?.weight ?? c.handleWeight,
    loaiQuai: (c.handleOptions ?? []).map(option => ({
      key: option.key,
      label: option.label,
      price: option.price,
      weight: option.weight,
    })),
    giaThuungMacDinh: c.boxPriceDefault, soTuiPerThuungMacDinh: c.bagsPerBoxDefault,
    loaiThuung: (c.boxOptions ?? []).map(option => ({
      key: option.key,
      label: option.label,
      price: option.price,
      weight: option.weight,
    })),
    laiSuatMacDinh: c.interestBase || 0.10,
    laiSuatCoBan: c.interestBase || 0.10,
    laiSuatThem: c.interestSpread || 0.03,
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
    quyTacCat: c.cutRules?.map(rule => ({ nhan: rule.label, nguong: rule.threshold, heSo: rule.multiplier })),
    giaNhu: c.nhuPrice, giaMo: c.moPrice,
    chiPhiCaiDatMau: c.colorSetup,
    hatHaoInA: c.printWasteA, hatHaoInB: c.printWasteB,
    hatHaoInC: c.printWasteC, hatHaoInD: c.printWasteD,
    giaMucMangInBOPP: c.printFilmInkPriceBopp ?? (c as any).printFilmInkPriceBopp18 ?? 150,
    giaMucMangInKhac: c.printFilmInkPriceOther ?? 200,
    phutSetupMangInMoiMau: c.printFilmSetupMinutesPerColor ?? 20,
    mauSoGioSetupMangIn: c.printFilmSetupHourDivisor ?? 60,
    nguongMetMangIn: c.printFilmLengthThreshold ?? 40000,
    tocDoMangInNgan: c.printFilmShortRunSpeed ?? 7500,
    chiPhiGioMangIn: c.printFilmLaborCostPerHour ?? 1200000,
    nguongVanChuyenMangInM2: c.printFilmShippingThresholdM2 ?? 25000,
    chiPhiVanChuyenMangIn: c.printFilmShippingBaseCost ?? 500000,
    mocVanChuyenMangInM2: c.printFilmShippingLargeOrderM2 ?? 30000,
    laiSuatMangIn: c.printFilmInterestRate ?? 0.01,
    tyLeLoiNhuanMangIn: (c.printFilmProfitRates ?? []).map(row => ({
      nhomKhach: row.customerGroup,
      soMauTu: row.colorFrom,
      soMauDen: row.colorTo,
      tyLe: row.rate,
    })),
  };
}

// ── ProfitRow EN → DongLoiNhuan VN ──────────────────────────────────────────
function doiSangDongLoiNhuan(rows: ProfitRow[]): DongLoiNhuan[] {
  return rows.map(r => ({
    nguong: r.threshold,
    cot1: r.col1,
    cot2: r.col2,
    cot1KhachLon: r.largeCol1,
    cot2KhachLon: r.largeCol2,
  }));
}

function boDauTiengViet(chuoi: string): string {
  return chuoi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D');
}

export function layCotLoiNhuanTuDong(input: CalculateInput, materials: Material[]): number {
  const laMangIn = input.productType === 'mang' && input.filmType === 'mangIn';
  const cacLopVatLy = (laMangIn
    ? [input.layer1Id]
    : [input.layer1Id, input.layer2Id, input.layer3Id, input.layer4Id, input.layer5Id]
  ).filter(Boolean) as string[];
  const cacVatLieuDangDung = (laMangIn ? cacLopVatLy : [...cacLopVatLy, input.layer2AltId]).filter(Boolean) as string[];
  const soLopVatLy = cacLopVatLy.length;
  const coVatLieuDacBiet = cacVatLieuDangDung.some((id) => {
    const vatLieu = materials.find(m => m.id === id);
    const chuoiKiemTra = boDauTiengViet(`${id} ${vatLieu?.name ?? ''} ${vatLieu?.group ?? ''}`).toUpperCase();
    return chuoiKiemTra.includes('MPET')
      || /(^|[^A-Z])AL([^A-Z]|$)/.test(chuoiKiemTra)
      || chuoiKiemTra.includes('GIAY')
      || chuoiKiemTra.includes('PAPER');
  });
  const laTuiDacBiet = input.productType === 'tui' && (input.bagType === 'dayDung' || input.hasZipper);
  const laNhieuLopCanCotPhai = (input.productType === 'tui' || input.productType === 'mang') && soLopVatLy >= 3;
  return (laNhieuLopCanCotPhai || laTuiDacBiet || coVatLieuDacBiet) ? 2 : 1;
}

export function dongBoCotLoiNhuan(input: CalculateInput, materials: Material[]): CalculateInput {
  const profitColumn = layCotLoiNhuanTuDong(input, materials);
  return input.profitColumn === profitColumn ? input : { ...input, profitColumn };
}

function doiSangGiaKhoNho(rows: SmallWidthMaterialPrice[], materials: Material[]): GiaVatLieuKhoNho[] {
  return rows.map(row => {
    const material = materials.find(m => m.id === row.materialId);
    const doDay = row.thickness ?? material?.thickness ?? 0;
    const giaMoiM2 = row.pricePerM2 ?? (material ? row.pricePerKg * doDay * material.density / 1000 : 0);
    return {
      id: row.id,
      vatLieuId: row.materialId,
      nguongKhoMm: row.widthThresholdMm,
      giaMoiKg: row.pricePerKg,
      giaMoiM2,
    };
  }).filter(row => row.nguongKhoMm > 0 && row.giaMoiM2 > 0);
}

// ── CalculateInput EN → DauVaoTinhGia VN ─────────────────────────────────────
function doiSangDauVao(i: CalculateInput, bangGiaKhoNho?: GiaVatLieuKhoNho[]): DauVaoTinhGia {
  return {
    khachHang: i.customer, tenSanPham: i.productName,
    loaiSanPham: i.productType, loaiTui: i.bagType, loaiMang: i.filmType,
    chieuDaiCuonMang: i.filmRollLength || 6000,
    soLuong: i.quantity, soMau: i.numColors, soHinh: i.numImages || 1,
    nhomKhachMangIn: i.printFilmCustomerGroup ?? 'normal',
    idLop1: i.layer1Id, idLop2: i.layer2Id, idLop2Phu: i.layer2AltId,
    chieuDaiLop2: i.layer2Lengths ? { vl1: i.layer2Lengths.mat1 * 1000, vl2: i.layer2Lengths.mat2 * 1000 } : undefined,
    matTruocLop2: i.layer2FrontPart ?? 'main',
    kieuGhepLop2: i.layer2PairingMode ?? 'bottom_to_bottom',
    idLop3: i.layer3Id, idLop4: i.layer4Id, idLop5: i.layer5Id,
    khoTrai: i.spreadWidth, buocCat: i.cutStep,
    phiKimLoai: i.metallicSurcharge || 0,
    tyLePhuMucMuc: i.coverageRatio || 1,
    khoiLuongQuaiXach: i.handleWeight || 0,
    khoiLuongKhoa: i.zipperWeight || 0,
    khoiLuongBangKeo: i.tapeWeight || 0,
    coKhoa: i.hasZipper, coBangKeo: i.hasTape, coQuaiXach: i.hasHandle,
    ngayThanhToan: i.paymentDays ?? 30,
    loaiTruc: i.cylType ?? 'A',
    baoTruc: i.cylIncluded ?? false,
    cotLoiNhuan: i.profitColumn || 2,
    tyLeHoaHong: i.commissionRate || 0,
    hoaHongCoDinhVND: i.commissionFixedVND || 0,
    donViHoaHong: i.commissionUnit || 'percent',
    giaTriHoaHongNhap: i.commissionInputValue || 0,
    soTuiPerThuung: i.bagsPerBox || 0,
    giaThuung: i.boxPrice || 0,
    khoiLuongThuung: i.boxWeight || 0,
    cuocVanChuyenPerKm: i.shippingPerKm || 0,
    soKmVanChuyen: i.shippingKm || 0,
    chieuDaiTruc: i.cylLength || 0,
    chuViTruc: i.cylCircum || 0,
    giaTrucDonVi: i.cylUnitPrice || 0,
    doDayMucTieu: i.targetThickness || 0,
    // tuDongToiUuDoDay bỏ qua - xử lý bên ngoài qua optimizeThickness()
    cauTrucNhieuVatLieu: i.multiStructureLayers,
    ghiDeDayLop: i.micOverrides ? Object.fromEntries(
      Object.entries(i.micOverrides).map(([k, v]) => {
        // layer1Id → idLop1, layer2Id → idLop2, ...
        const num = k.replace('layer', '').replace('Id', '');
        return [`idLop${num}`, v];
      })
    ) : {},
    bangGiaKhoNho,
    cheDoTinhGia: mapPricingModeEnToVn(i.pricingMode),
    giaCongNgoai: mapOutsourceEnToVn(i.outsource),
  };
}

// ── KetQuaTinhGia VN → CalculateResult EN ────────────────────────────────────
	function doiSangKetQua(r: KetQuaTinhGia, originalInput: CalculateInput, materials: Material[]): CalculateResult {
  const findMat = (id: string | null | undefined) => materials.find(m => m.id === id) || null;
  const printMat = findMat(originalInput.layer1Id);
  const lamIds = [originalInput.layer2Id, originalInput.layer3Id, originalInput.layer4Id, originalInput.layer5Id];
  const layer2AltMat = findMat(originalInput.layer2AltId);
  const layer2Materials = [findMat(originalInput.layer2Id), layer2AltMat].filter(Boolean);
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
    printFilmCost: r.cpMangIn ?? 0,
    printFilmSetupHours: r.gioSetupMangIn ?? 0,
    printFilmProductionHours: r.gioSanXuatMangIn ?? 0,
    printFilmTotalHours: r.tongGioMangIn ?? 0,
    printFilmLaborCostPerHour: r.chiPhiGioMangIn ?? 0,
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
    gcShippingPerUnit: r.vanChuyenGcPerDonVi ?? 0,
    gcPackagingPerUnit: r.dongGoiGcPerDonVi ?? 0,
    gcOtherPerUnit: r.phuPhiKhacGcPerDonVi ?? 0,
    gcShippingTotal: r.tongVanChuyenGc ?? 0,
    gcPackagingTotal: r.tongDongGoiGc ?? 0,
    gcOtherTotal: r.tongPhuPhiKhacGc ?? 0,
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
        matPrice: (r.cacLop.in as any).donGia,
        total: r.cacLop.in.tongCong,
      },
      laminations: r.cacLop.ghep.map((g: any, idx: number) => ({
        layerNum: idx + 2,
        material: findMat(lamIds[idx]),
        materials: idx === 0 && layer2Materials.length > 1 ? layer2Materials : undefined,
        width: g.kho,
        meters: g.met,
        waste: g.hatHao,
        cpsx: g.cpsx,
        costCPSX: g.chiPhiSX,
        costMat: g.chiPhiVL,
        matPrice: g.donGia,
        chiTietVatLieu: g.chiTietVatLieu,
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
export function tinhGiaWeb(
  input: CalculateInput,
  materials: Material[],
  constants: AppConstants,
  profitTable: ProfitRow[],
  smallWidthPrices: SmallWidthMaterialPrice[] = []
): CalculateResult | null {
  const inputDaDongBoCot = dongBoCotLoiNhuan(input, materials);
  const bangGiaKhoNho = doiSangGiaKhoNho(smallWidthPrices, materials);
  const dauVao = doiSangDauVao(inputDaDongBoCot, bangGiaKhoNho);
  const vatLieu = materials.map(doiSangVatLieu);
  const hangSo = doiSangHangSo(constants, inputDaDongBoCot);
  // Trong commercial-form: KHÔNG áp LN của engine (đã có LN riêng từ [Thu mua]).
  // Engine vẫn chạy để lấy breakdown components (Vốn, Thùng, Vận chuyển, Lãi vay, Hoa hồng),
  // nhưng bảng lợi nhuận bị zero để engine's profitAmount = 0, profitRate = 0.
  const bangLoiNhuanCoHieuLuc = input.pricingMode === 'commercial'
    ? profitTable.map(r => ({ ...r, col1: 0, col2: 0, largeCol1: 0, largeCol2: 0 }))
    : profitTable;
  const bangLN = doiSangDongLoiNhuan(bangLoiNhuanCoHieuLuc);

  const ketQua = tinhGia(dauVao, vatLieu, hangSo, bangLN);
  if (!ketQua) return null;

  return doiSangKetQua(ketQua, inputDaDongBoCot, materials);
}

export const optimizeThickness = toiUuDoDayTheoVatLieu;
export const calculate = tinhGiaWeb;

// ── Tính giá Thương mại (mua đi bán lại) ────────────────────────────────────
// Không qua engine @lts/bang-tinh-gia — tính đơn giản:
//   purchaseTotal  = commercialPurchasePrice × quantity
//   extraFee       = phụ phí khác (tách riêng, KHÔNG ảnh hưởng LN%)
//   baseCostTotal  = purchaseTotal (KHÔNG + extraFee)
//   profitVnd (%): purchaseTotal × pct  | (VND): profitRaw × quantity (/sp × SL)
//   totalVnd       = purchaseTotal + profitVnd (KHÔNG + extraFee)
//   unitPriceVnd   = totalVnd / quantity (= mua + LN/sp, chưa gồm extraFee & chi phí engine)
//   extraFeePerUnit= extraFee / quantity (tách riêng, không chịu HH, hiển thị dòng riêng)
export interface KetQuaThuongMai {
  purchasePrice: number;   // Đơn giá mua (per unit)
  quantity: number;         // Số lượng
  purchaseTotal: number;    // Thành tiền mua = purchasePrice × quantity
  extraFee: number;         // Tổng phụ phí khác (VND) — tách riêng
  extraFeePerUnit: number;  // Phụ phí khác / đơn vị
  baseCostTotal: number;    // purchaseTotal (KHÔNG + extraFee)
  baseCostPerUnit: number;  // purchasePrice (= baseCostTotal / quantity)
  profitVnd: number;        // Lợi nhuận (VND) — (%): purchaseTotal × pct | (VND): profitRaw × SL
  profitPerUnit: number;    // Lợi nhuận / đơn vị (= LN/sp)
  totalVnd: number;         // Tổng = purchaseTotal + profitVnd (KHÔNG + extraFee)
  unitPriceVnd: number;     // Đơn giá cuối / đơn vị = totalVnd / quantity
  profitPct: number;        // Tỷ lệ lợi nhuận / purchaseTotal (decimal)
  profitUnit: 'percent' | 'vnd';
  profitRawValue: number;
  unitKind: 'tui' | 'm2' | 'm' | 'custom';
  /** Nhãn đơn vị hiển thị (vd: '/Túi', '/m²', '/m', '/thùng') */
  unitLabel: string;
  /** Trọng lượng / đơn vị (gram) — optional, cho mô tả tự do */
  unitWeightGr?: number;
}

export function tinhGiaThuongMai(input: CalculateInput): KetQuaThuongMai {
  const purchasePrice = Number(input.commercialPurchasePrice) || 0;
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const profitUnit = (input.commercialProfitUnit || 'percent') as 'percent' | 'vnd';
  const profitRaw = Number(input.commercialProfitValue) || 0;
  const unitKind = (input.commercialUnitKind || 'tui') as 'tui' | 'm2' | 'm' | 'custom';
  const customLabel = (input.commercialUnitLabel || '').trim();
  const extraFee = Math.max(0, Number(input.commercialExtraFee) || 0);
  const unitWeightGr = Math.max(0, Number(input.commercialUnitWeight) || 0);

  // Tổng mua = (giá mua × SL). Phụ phí tách riêng, KHÔNG ảnh hưởng baseCost / LN%.
  const purchaseTotal = purchasePrice * quantity;
  const baseCostTotal = purchaseTotal;
  const baseCostPerUnit = quantity > 0 ? baseCostTotal / quantity : purchasePrice;

  // Lợi nhuận:
  //   % : trên purchaseTotal (KHÔNG gồm extraFee)
  //   VND: profitRaw × quantity (mỗi sản phẩm cộng dồn)
  const profitVnd = profitUnit === 'percent' ? baseCostTotal * (profitRaw / 100) : profitRaw * quantity;
  const profitPerUnit = quantity > 0 ? profitVnd / quantity : 0;
  const extraFeePerUnit = quantity > 0 ? extraFee / quantity : 0;

  const totalVnd = baseCostTotal + profitVnd;
  const unitPriceVnd = quantity > 0 ? totalVnd / quantity : purchasePrice;
  const pct = baseCostTotal > 0 ? profitVnd / baseCostTotal : 0;

  const unitLabel =
    unitKind === 'tui' ? '/Túi' :
    unitKind === 'm2'  ? '/m²' :
    unitKind === 'm'   ? '/m' :
    customLabel ? `/${customLabel}` : '/đơn vị';

  return {
    purchasePrice,
    quantity,
    purchaseTotal,
    extraFee,
    extraFeePerUnit,
    baseCostTotal,
    baseCostPerUnit,
    profitVnd,
    profitPerUnit,
    totalVnd,
    unitPriceVnd,
    profitPct: pct,
    profitUnit,
    profitRawValue: profitRaw,
    unitKind,
    unitLabel,
    unitWeightGr,
  };
}

/**
 * Đơn giá cuối của sheet thương mại (mua + LN + Thùng/VC/Lãi vay/HH/Trục/Phụ phí).
 * Tái hiện công thức `tongBreakdown` trong ManHinhQuanLy (line 1605-1617) — dùng
 * khi lưu history / hiển thị list, đảm bảo 1 nguồn công thức với panel kết quả.
 *
 * - `input`           : input hiện tại (pricingMode/commercial*)
 * - `result`          : kết quả engine (CalculateResult) — chứa các per-unit (tape/handle/box/shipping/interest/commission/gc/cyl)
 *
 * Trả về `null` nếu input không phải commercial-form (không áp dụng).
 */
export function tinhDonGiaThuongMaiHieuLuc(
  input: CalculateInput,
  result: CalculateResult | null,
): number | null {
  if (input?.pricingMode !== 'commercial') return null;
  if ((input.commercialMode || 'form') !== 'form') return null;
  if (!result) return null;

  const ketQuaThuongMai = tinhGiaThuongMai(input);
  const r = result;
  const dauVao = r.input;

  const tong =
    ketQuaThuongMai.unitPriceVnd
    + (dauVao.hasTape ? (r.tapePerUnit ?? 0) : 0)
    + (dauVao.hasHandle ? (r.handlePerUnit ?? 0) : 0)
    + (r.boxPerUnit ?? 0)
    + (r.shippingPerUnit ?? 0)
    + (r.interestPerUnit ?? 0)
    + (r.commissionPerUnit ?? 0)
    + (r.gcShippingPerUnit ?? 0)
    + (r.gcPackagingPerUnit ?? 0)
    + (r.gcOtherPerUnit ?? 0)
    + (dauVao.cylIncluded ? (r.cylAllocPerUnit ?? 0) : 0)
    + ketQuaThuongMai.extraFeePerUnit;

  return tong;
}

/**
 * Tạo CalculateResult-shaped từ commercial input (dùng khi description mode).
 * Engine chính trả null vì description mode thiếu data kỹ thuật (khổ, bước cắt, ...).
 * Helper này để description mode dùng chung render path với form mode.
 *
 * Cost basis lấy từ `tinhGiaThuongMai` (mua + LN/sp + extraFee/sp).
 * Lãi vay & hoa hồng khớp công thức engine (tai-chinh.ts), base = đơn giá mua (giá vốn TM).
 * Box từ `hangSo.boxOptions[boxOptionKey].price` hoặc `input.boxPrice`.
 * Shipping = shippingPerKm × shippingKm, phân bổ theo `quantity`.
 */
export function synthesizeResultFromCommercial(
  input: CalculateInput,
  hangSo: AppConstants,
  _materials: Material[]
): CalculateResult {
  const tm = tinhGiaThuongMai(input);
  const qty = Math.max(0, Number(input.quantity) || 0);
  const loaiThung = (hangSo.boxOptions ?? []).find(
    (o: any) => o.key === input.boxOptionKey
  );
  const giaThung = loaiThung
    ? Number(loaiThung.price) || 0
    : Math.max(0, Number(input.boxPrice) || 0);
  const soTuiMotThung = Math.max(1, Number(input.bagsPerBox) || 1);
  const thungPerUnit = giaThung / soTuiMotThung;
  const phiVC = Math.max(0, Number(input.shippingPerKm || 0) * Number(input.shippingKm || 0));
  const vcPerUnit = qty > 0 ? phiVC / qty : 0;

  // Lãi vay — khớp tinhLaiVay (tai-chinh.ts): (CB + Them)/12 × (ngày/30) × giá vốn/sp.
  // Giá vốn thương mại = đơn giá mua.
  const ngayThanhToan = input.paymentDays ?? 30;
  const laiSuatCoBan = hangSo.interestBase ?? 0.10;
  const laiSuatThem = hangSo.interestSpread ?? 0.03;
  const laiVayPerUnit = (laiSuatCoBan + laiSuatThem) / 12 * (ngayThanhToan / 30) * tm.purchasePrice;

  // Hoa hồng — khớp tinhHoaHong (tai-chinh.ts): % trên giá vốn/sp hoặc VND cố định /sp.
  const hoaHongPerDonVi = (input.commissionUnit || 'percent') === 'vnd'
    ? (input.commissionFixedVND || 0)
    : (input.commissionRate || 0) * tm.purchasePrice;

  const finalPrice = tm.unitPriceVnd + vcPerUnit + thungPerUnit + tm.extraFeePerUnit + laiVayPerUnit + hoaHongPerDonVi;
  return {
    input,
    finalPrice,
    costPerUnit: tm.unitPriceVnd,
    profitRate: tm.profitPct,
    profitAmount: tm.profitVnd,
    interestPerUnit: laiVayPerUnit,
    interestBase: laiSuatCoBan,
    interestSpread: laiSuatThem,
    paymentDays: ngayThanhToan,
    shippingPerUnit: vcPerUnit,
    shippingTotal: phiVC,
    commissionPerUnit: hoaHongPerDonVi,
    commissionTotal: hoaHongPerDonVi * qty,
    boxPerUnit: thungPerUnit,
    boxTotal: giaThung,
    tapePerUnit: 0,
    handlePerUnit: 0,
    zipperPerUnit: 0,
    zipperTotal: 0,
    tapeTotal: 0,
    handleTotal: 0,
    cylAllocPerUnit: 0,
    cylinderCost: 0,
    cylinderCostPerUnit: 0,
    cylLength: 0,
    cylCircum: 0,
    totalThickness: 0,
    bagArea: 0,
    tareWeight: 0,
    filmRollArea: 0,
    structureText: (input.commercialDescription || '').trim() || 'Mô tả khác',
    layers: { print: null, laminations: [] },
    totalProductionCost: tm.unitPriceVnd * qty,
    gcShippingPerUnit: 0,
    gcPackagingPerUnit: 0,
    gcOtherPerUnit: 0,
    gcShippingTotal: 0,
    gcPackagingTotal: 0,
    gcOtherTotal: 0,
  } as unknown as CalculateResult;
}
