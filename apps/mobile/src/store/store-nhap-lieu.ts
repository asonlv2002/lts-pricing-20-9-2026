// ═══════════════════════════════════════════════════════════════════════════
// apps/mobile — Zustand store cho TÍNH GIÁ + LỊCH SỬ
// Offline-first: đọc cấu hình từ cua-hang-cau-hinh, lưu lịch sử AsyncStorage
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tinhGia } from '@lts/bang-tinh-gia';
import type {
  DauVaoTinhGia,
  KetQuaTinhGia,
  LichSuDonHang,
  TrangThaiDonHang,
} from '@lts/kieu-du-lieu';
import { dungCuaHangCauHinh } from './cua-hang-cau-hinh';

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

interface StoreNhapLieu {
  dauVao: DauVaoTinhGia;
  ketQua: KetQuaTinhGia | null;
  lichSu: LichSuDonHang[];

  capNhatDauVao: (truong: Partial<DauVaoTinhGia>) => void;
  datLaiDauVao: () => void;
  tinhToan: () => void;

  // Lịch sử (phiên bản nhanh, lưu local) — KHÁC với báo giá có workflow
  luuVaoLichSu: () => string | null;
  xoaLichSu: (id: string) => void;
  taiTuLichSu: (id: string) => void;
  capNhatTrangThaiLichSu: (id: string, trangThai: TrangThaiDonHang) => void;
}

// Helper tính giá đọc cấu hình mới nhất từ store cấu hình
function tinhVoiCauHinh(dauVao: DauVaoTinhGia): KetQuaTinhGia | null {
  const { vatLieu, hangSo, loiNhuan } = dungCuaHangCauHinh.getState();
  return tinhGia(dauVao, vatLieu, hangSo, loiNhuan);
}

export const dungStore = create<StoreNhapLieu>()(
  persist(
    (set, get) => ({
      dauVao: DAU_VAO_MAC_DINH,
      ketQua: null,
      lichSu: [],

      capNhatDauVao: (truong) => {
        const dauVaoMoi = { ...get().dauVao, ...truong };
        // Auto-tính chieuDaiTruc khi khoTrai hoặc soHinh thay đổi
        if ('khoTrai' in truong || 'soHinh' in truong) {
          dauVaoMoi.chieuDaiTruc = Math.max(
            0.7,
            dauVaoMoi.khoTrai * dauVaoMoi.soHinh + 0.1
          );
        }
        const ketQuaMoi = tinhVoiCauHinh(dauVaoMoi);
        set({ dauVao: dauVaoMoi, ketQua: ketQuaMoi });
      },

      datLaiDauVao: () => set({ dauVao: DAU_VAO_MAC_DINH, ketQua: null }),

      tinhToan: () => {
        const ketQua = tinhVoiCauHinh(get().dauVao);
        set({ ketQua });
      },

      luuVaoLichSu: () => {
        const { ketQua, dauVao } = get();
        if (!ketQua) return null;
        const id = `H-${Date.now()}`;
        const mucMoi: LichSuDonHang = {
          id,
          ngay: new Date().toLocaleDateString('vi-VN'),
          khachHang: dauVao.khachHang || 'Khách',
          tenSanPham: dauVao.tenSanPham || 'Sản phẩm',
          cauTruc: ketQua.chuoiCauTruc,
          soLuong: dauVao.soLuong,
          giaCuoiCung: ketQua.giaCuoiCung,
          trangThaiDon: 'nhap',
          dauVao,
        };
        set((state) => ({ lichSu: [mucMoi, ...state.lichSu] }));
        return id;
      },

      xoaLichSu: (id) =>
        set((state) => ({ lichSu: state.lichSu.filter((h) => h.id !== id) })),

      taiTuLichSu: (id) => {
        const muc = get().lichSu.find((h) => h.id === id);
        if (!muc) return;
        const ketQuaMoi = tinhVoiCauHinh(muc.dauVao);
        set({ dauVao: muc.dauVao, ketQua: ketQuaMoi });
      },

      capNhatTrangThaiLichSu: (id, trangThai) =>
        set((state) => ({
          lichSu: state.lichSu.map((h) =>
            h.id === id ? { ...h, trangThaiDon: trangThai } : h
          ),
        })),
    }),
    {
      name: 'lts-nhap-lieu',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lichSu: state.lichSu }), // chỉ persist lịch sử
    }
  )
);

// Subscribe: khi cấu hình đổi → tính lại
dungCuaHangCauHinh.subscribe(() => {
  const { dauVao } = dungStore.getState();
  if (dauVao) {
    dungStore.setState({ ketQua: tinhVoiCauHinh(dauVao) });
  }
});
