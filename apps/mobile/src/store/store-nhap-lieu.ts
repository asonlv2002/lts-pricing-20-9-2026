// ═══════════════════════════════════════════════════════════════════════════
// apps/mobile — Zustand store cho mobile
// Tái sử dụng logic từ @lts/bang-tinh-gia, không phụ thuộc Next.js
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { tinhGia } from '@lts/bang-tinh-gia';
import {
  VAT_LIEU_MAC_DINH,
  HANG_SO_MAC_DINH,
  BANG_LOI_NHUAN_MAC_DINH,
  type DongLoiNhuan,
} from '@lts/hang-so';
import type {
  DauVaoTinhGia,
  KetQuaTinhGia,
  VatLieu,
  HangSo,
  LichSuDonHang,
} from '@lts/kieu-du-lieu';

// ── Đầu vào mặc định ─────────────────────────────────────────────────────────
const DAU_VAO_MAC_DINH: DauVaoTinhGia = {
  khachHang: '',
  tenSanPham: '',
  loaiSanPham: 'tui',
  loaiTui: 'flat',
  loaiMang: '',
  chieuDaiCuonMang: 6000,
  soLuong: 10000,
  soMau: 4,
  soHinh: 1,
  idLop1: null,
  idLop2: null,
  idLop3: null,
  idLop4: null,
  idLop5: null,
  khoTrai: 0.3,
  buocCat: 0.4,
  phiKimLoai: 0,
  tyLePhuMucMuc: 1,
  khoiLuongQuaiXach: 0,
  khoiLuongKhoa: 0,
  khoiLuongBangKeo: 0,
  coKhoa: false,
  coBangKeo: false,
  coQuaiXach: false,
  ngayThanhToan: 30,
  loaiTruc: 'A' as const,
  baoTruc: false,
  // laiSuatThanhToan đã bỏ — lấy từ hangSo
  cotLoiNhuan: 2,
  tyLeHoaHong: 0,
  hoaHongCoDinhVND: 0,
  donViHoaHong: 'percent',
  giaTriHoaHongNhap: 0,
  soTuiPerThuung: 1000,
  giaThuung: 18000,
  cuocVanChuyenPerKm: 5000,
  soKmVanChuyen: 200,
  chieuDaiTruc: 0,
  chuViTruc: 0,
  giaTrucDonVi: 0,
};

// ── Kiểu Store ────────────────────────────────────────────────────────────────
interface StoreNhapLieu {
  // Dữ liệu
  dauVao: DauVaoTinhGia;
  ketQua: KetQuaTinhGia | null;
  danhSachVatLieu: VatLieu[];
  hangSo: HangSo;
  bangLoiNhuan: DongLoiNhuan[];
  lichSu: LichSuDonHang[];

  // UI
  chuDeGiao: 'sang' | 'toi';
  dangTai: boolean;
  loiKetNoi: string | null;

  // Actions
  capNhatDauVao: (truong: Partial<DauVaoTinhGia>) => void;
  datLaiDauVao: () => void;
  tinhToan: () => void;
  taiCauHinhTuMayChu: (baseUrl: string) => Promise<void>;
  luuVaoLichSu: () => void;
  doiChuDe: () => void;
}

// ── Tạo store ─────────────────────────────────────────────────────────────────
export const dungStore = create<StoreNhapLieu>((set, get) => ({
  dauVao: DAU_VAO_MAC_DINH,
  ketQua: null,
  danhSachVatLieu: VAT_LIEU_MAC_DINH,
  hangSo: HANG_SO_MAC_DINH,
  bangLoiNhuan: BANG_LOI_NHUAN_MAC_DINH,
  lichSu: [],
  chuDeGiao: 'sang',
  dangTai: false,
  loiKetNoi: null,

  // Cập nhật đầu vào và tự động tính lại
  capNhatDauVao: (truong) => {
    const dauVaoMoi = { ...get().dauVao, ...truong };

    // Auto-tính chieuDaiTruc khi khoTrai hoặc soHinh thay đổi
    if ('khoTrai' in truong || 'soHinh' in truong) {
      dauVaoMoi.chieuDaiTruc = Math.max(0.7, dauVaoMoi.khoTrai * dauVaoMoi.soHinh + 0.1);
    }

    const { danhSachVatLieu, hangSo, bangLoiNhuan } = get();
    const ketQuaMoi = tinhGia(dauVaoMoi, danhSachVatLieu, hangSo, bangLoiNhuan);
    set({ dauVao: dauVaoMoi, ketQua: ketQuaMoi });
  },

  datLaiDauVao: () => {
    set({ dauVao: DAU_VAO_MAC_DINH, ketQua: null });
  },

  tinhToan: () => {
    const { dauVao, danhSachVatLieu, hangSo, bangLoiNhuan } = get();
    const ketQua = tinhGia(dauVao, danhSachVatLieu, hangSo, bangLoiNhuan);
    set({ ketQua });
  },

  // Tải cấu hình (vật liệu, hằng số) từ server web
  taiCauHinhTuMayChu: async (baseUrl) => {
    set({ dangTai: true, loiKetNoi: null });
    try {
      const phan = await fetch(`${baseUrl}/api/config`);
      const json = await phan.json();
      if (json.success && json.data) {
        const { materials, constants, profitTable } = json.data;

        // Map từ tên field cũ (server) sang tên mới (packages)
        const vatLieuMoi: VatLieu[] = materials.map((m: any) => ({
          id: m.id, ten: m.name, nhom: m.group,
          khoiLuongRieng: m.density, doDay: m.thickness,
          giaMoiKg: m.pricePerKg, laPEThoaPA: m.isPETorPA,
          doiDuocMic: m.adjustableMic, chieuDaiCuon: m.rollLength,
          giaMucMoiMau: m.inkPricePerColor,
          giaMoiM2: m.pricePerKg * m.thickness * m.density / 1000,
        }));

        const hangSoMoi: HangSo = {
          giaKhoa: constants.zipperPrice, khoiLuongKhoa: constants.zipperWeight,
          giaBangKeo: constants.tapePrice, khoiLuongBangKeo: constants.tapeWeight,
          giaQuaiXach: constants.handlePrice, khoiLuongQuaiXach: constants.handleWeight,
          giaThuungMacDinh: constants.boxPriceDefault, soTuiPerThuungMacDinh: constants.bagsPerBoxDefault,
          laiSuatMacDinh:        constants.interestBase ?? constants.interestRate,
          laiSuatCoBan:          constants.interestBase  ?? 0.10,
          laiSuatThem:           constants.interestSpread ?? 0.03,
          ngayThanhToanMacDinh:  constants.paymentDays,
          giaTrucDonVi:          constants.cylinderPricePerUnit,
          giaTrucA:              constants.cylPriceA ?? constants.cylinderPricePerUnit,
          giaTrucB:              constants.cylPriceB ?? 6500000,
          cpSXGhep: constants.ghepCPSX,
          hatHaoGhepA: constants.ghepWasteA, hatHaoGhepB: constants.ghepWasteB, hatHaoGhepC: constants.ghepWasteC,
          hatHaoCatA: constants.cutWasteA, hatHaoCatB: constants.cutWasteB, hatHaoCatC: constants.cutWasteC,
          cuocVanChuyenMacDinh: constants.shippingPerKmDefault, soKmMacDinh: constants.shippingKmDefault,
          chiPhiNhanCong: constants.laborCost,
          cpCatCoBan: constants.cutBase, nguongCat1: constants.cutThreshold1, nguongCat2: constants.cutThreshold2,
          heSoCat1: constants.cutMult1, heSoCat2: constants.cutMult2, heSoCat3: constants.cutMult3,
          giaNhu: constants.nhuPrice, giaMo: constants.moPrice,
          chiPhiCaiDatMau: Object.fromEntries(
            Object.entries(constants.colorSetup as Record<string, number>).map(([k, v]) => [Number(k), v])
          ),
          hatHaoInA: constants.printWasteA, hatHaoInB: constants.printWasteB,
          hatHaoInC: constants.printWasteC, hatHaoInD: constants.printWasteD,
        };

        const bangLoiNhuanMoi: DongLoiNhuan[] = profitTable.rows.map((r: any) => ({
          nguong: r.threshold, cot1: r.col1, cot2: r.col2,
        }));

        set({ danhSachVatLieu: vatLieuMoi, hangSo: hangSoMoi, bangLoiNhuan: bangLoiNhuanMoi, dangTai: false });
        // Tính lại với cấu hình mới
        get().tinhToan();
      }
    } catch (loi) {
      set({ loiKetNoi: 'Không thể kết nối máy chủ', dangTai: false });
    }
  },

  luuVaoLichSu: () => {
    const { ketQua, dauVao } = get();
    if (!ketQua) return;
    const mucMoi: LichSuDonHang = {
      id: Date.now().toString(),
      ngay: new Date().toLocaleDateString('vi-VN'),
      khachHang: dauVao.khachHang || 'Khách',
      tenSanPham: dauVao.tenSanPham || 'Sản phẩm',
      cauTruc: ketQua.chuoiCauTruc,
      soLuong: dauVao.soLuong,
      giaCuoiCung: ketQua.giaCuoiCung,
      dauVao,
    };
    set(state => ({ lichSu: [mucMoi, ...state.lichSu] }));
  },

  doiChuDe: () => {
    set(state => ({ chuDeGiao: state.chuDeGiao === 'sang' ? 'toi' : 'sang' }));
  },
}));
