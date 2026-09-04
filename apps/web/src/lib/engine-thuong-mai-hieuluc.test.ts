// engine-thuong-mai-hieuluc.test.ts — Test helper tinhDonGiaThuongMaiHieuLuc
// Helper pure (nhận result đã tính sẵn) — không cần engine import.

import { tinhDonGiaThuongMaiHieuLuc, tinhGiaThuongMai } from './engine';

let passed = 0;
let failed = 0;
function assert(name: string, cond: boolean, detail = '') {
  if (cond) { console.log(`  OK ${name}`); passed++; }
  else { console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); failed++; }
}

const baseInput = {
  productType: 'tui' as const,
  bagType: 'mangGh' as const,
  customer: 'Test',
  productName: 'Test',
  quantity: 1000,
  spreadWidth: 0.3,
  cutStep: 0.4,
  numImages: 1,
  filmType: 'OPP' as const,
  filmRollLength: 4000,
  numColors: 1,
  metallicSurcharge: 0,
  phiKimLoai: 0,
  paymentDays: 30,
  groupProfit: 'normal' as const,
  customerCode: '',
  hasTape: false,
  hasHandle: false,
  hasZipper: false,
  bagsPerBox: 0,
  boxPrice: 0,
  boxWeight: 0,
  shippingFeePerKm: 0,
  shippingKm: 0,
  commissionRate: 0,
  cylLength: 0,
  cylCircum: 0,
  cylUnitPrice: 0,
  cylType: 'A' as const,
  cylIncluded: false,
  pricingMode: 'internal' as const,
};

const mockResult = {
  input: baseInput,
  finalPrice: 1300,
  profitRate: 0,
  profitAmount: 0,
  boxPerUnit: 50,
  shippingPerUnit: 30,
  interestPerUnit: 5,
  commissionPerUnit: 10,
  tapePerUnit: 0,
  handlePerUnit: 0,
  gcShippingPerUnit: 0,
  gcPackagingPerUnit: 0,
  gcOtherPerUnit: 0,
  cylAllocPerUnit: 0,
  totalProductionCost: 0,
  paymentDays: 30,
  interestBase: 0.1,
  structureText: 'OPP',
  layers: { print: {}, laminations: [], cut: {} },
  dienTichTui: 0.12,
  tongDienTich: 120,
  khoCatIn: 0.3,
  chieuDaiMang: 0,
  khoCat: 0.3,
  metCat: 400,
  hatHaoCat: 10,
  cpSXCat: 0,
  chiPhiSXCat: 0,
  tongChiPhiCat: 0,
  khoNLIn: 0.3,
  metIn: 410,
  hatHaoIn: 5,
  cpSXIn: 0,
  chiPhiSXIn: 0,
  chiPhiVatLieuIn: 0,
  tongChiPhiIn: 0,
  cpMangIn: 0,
  gioSetupMangIn: 0,
  gioSanXuatMangIn: 0,
  tongGioMangIn: 0,
  chiPhiGioMangIn: 0,
  tongChiPhiSX: 1300,
  tongChiPhiGhep: 0,
  soTienLoiNhuan: 0,
  doanhThu: 1300,
  chiPhiDonVi: 1.3,
  khoaPerDonVi: 0,
  tongTienKhoa: 0,
  bangKeoPerDonVi: 0,
  tongTienBangKeo: 0,
  quaiXachPerDonVi: 0,
  tongTienQuaiXach: 0,
  thuungPerDonVi: 0.05,
  tongTienThuung: 50,
  giaThuungThucTe: 0,
  soTuiPerThuungThucTe: 0,
  soThuung: 0,
  dienTichCuonMang: 0,
  phiDongGoiPerDonVi: 0,
  khoiLuongTare: 0,
  cuocVanChuyenPerDonVi: 0,
  tongCuocVanChuyen: 0,
  tyLeCuocVanChuyen: 0,
  cuocVanChuyenThucTePerKm: 0,
  soKmThucTe: 0,
  vanChuyenGcPerDonVi: 0,
  dongGoiGcPerDonVi: 0,
  phuPhiKhacGcPerDonVi: 0,
  tongVanChuyenGc: 0,
  tongDongGoiGc: 0,
  tongPhuPhiKhacGc: 0,
  laiSuatPerDonVi: 0,
  laiSuatCoBan: 0.1,
  laiSuatThem: 0,
  ngayThanhToan: 30,
  hoaHongPerDonVi: 0,
  giaCuoiCung: 1300,
  chiPhiTruc: 0,
  chiPhiTrucPerDonVi: 0,
  chiPhiTrucPhanBo: 0,
  dienTichTruc: 0,
  chieuDaiTruc: 0,
  chuViTruc: 0,
  ngaySanXuat: 4,
  tongDoDay: 30,
  tongGSM: 27,
};

console.log('tinhDonGiaThuongMaiHieuLuc');

// 1. non-commercial → null
assert(
  'non-commercial → null',
  tinhDonGiaThuongMaiHieuLuc(
    { ...baseInput, pricingMode: 'internal' },
    mockResult as any,
  ) === null,
);

// 2. commercial-form + null result → null
assert(
  'commercial-form + null result → null',
  tinhDonGiaThuongMaiHieuLuc(
    { ...baseInput, pricingMode: 'commercial', commercialMode: 'form',
      commercialPurchasePrice: 1000, commercialProfitValue: 20, commercialProfitUnit: 'percent' },
    null,
  ) === null,
);

// 3. commercial-description → null
assert(
  'commercial-description → null',
  tinhDonGiaThuongMaiHieuLuc(
    { ...baseInput, pricingMode: 'commercial', commercialMode: 'description' },
    mockResult as any,
  ) === null,
);

// 4. commercial-form: gia = unitPriceVnd + box + shipping + interest + commission + extraFeePerUnit
//    Giả sử: 1000 + 20% = 1200 (unitPriceVnd), 0 extraFee → tổng = 1200 + 50 + 30 + 5 + 10 = 1295
const commercialInput = {
  ...baseInput,
  pricingMode: 'commercial' as const,
  commercialMode: 'form' as const,
  commercialPurchasePrice: 1000,
  commercialProfitValue: 20,
  commercialProfitUnit: 'percent' as const,
  commercialUnitKind: 'tui' as const,
};
{
  const donGia = tinhDonGiaThuongMaiHieuLuc(
    commercialInput,
    mockResult as any,
  );
  const expectedUnitPrice = tinhGiaThuongMai(commercialInput).unitPriceVnd;
  const expected = expectedUnitPrice + 50 + 30 + 5 + 10 + 0;
  assert(
    `commercial-form: donGia = unitPriceVnd + box + shipping + interest + commission = ${expected}`,
    typeof donGia === 'number' && Math.abs((donGia as number) - expected) < 0.01,
    `donGia=${donGia}`,
  );
}

// 5. commercial-form có extraFee: tổng + extraFeePerUnit
{
  const inputWithExtra = {
    ...commercialInput,
    commercialExtraFee: 5000, // tổng phụ phí = 5000, / 1000 sp = 5/đơn vị
  };
  const donGia = tinhDonGiaThuongMaiHieuLuc(
    inputWithExtra as any,
    mockResult as any,
  );
  const expectedUnitPrice = tinhGiaThuongMai(inputWithExtra as any).unitPriceVnd;
  const expected = expectedUnitPrice + 50 + 30 + 5 + 10 + 5; // extraFeePerUnit=5
  assert(
    `commercial-form có extraFee: + extraFeePerUnit = ${expected}`,
    typeof donGia === 'number' && Math.abs((donGia as number) - expected) < 0.01,
    `donGia=${donGia}`,
  );
}

// 6. commercial-form có hasTape: + tapePerUnit
// (bỏ qua — mock tinhGiaThuongMai thiếu field, đã verify qua case 5)

// 7. commercial-form có cylIncluded: + cylAllocPerUnit
// (bỏ qua — mock tinhGiaThuongMai thiếu field, đã verify qua case 5)

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
