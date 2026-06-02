// ═══════════════════════════════════════════════════════════════════════════
// @lts/kieu-du-lieu — Kiểu dữ liệu dùng chung (web + mobile)
// Tất cả tên biến/type theo tiếng Việt không dấu
// ═══════════════════════════════════════════════════════════════════════════

// ── Người dùng / Xác thực ────────────────────────────────────────────────────
export interface NguoiDung {
  id: string;
  tenDangNhap: string;
  matKhauHash: string;
  tenHienThi: string;
  vaiTro: 'admin' | 'sale' | 'purchase';
  idNhanVienBan?: string;
  hoatDong: boolean;
  ngayTao: string;
}

// ── Vật liệu ─────────────────────────────────────────────────────────────────
export interface VatLieu {
  id: string;
  ten: string;
  nhom?: string;
  khoiLuongRieng: number;   // density — kg/m³
  doDay: number;             // thickness — micron
  giaMoiKg: number;
  laPEThoaPA: boolean;
  doiDuocMic?: boolean;
  chieuDaiCuon: number;
  giaMucMoiMau: number;
  giaMoiM2?: number;
}

export interface GiaVatLieuKhoNho {
  id: string;
  vatLieuId: string;
  nguongKhoMm: number;
  giaMoiKg: number;
  giaMoiM2: number;
}

export interface QuyTacCat {
  nhan: string;
  nguong: number | null;
  heSo: number;
}

export interface TyLeLoiNhuanMangIn {
  nhomKhach: 'normal' | 'large';
  soMauTu: number;
  soMauDen: number;
  tyLe: number;
}

// ── Hằng số hệ thống ─────────────────────────────────────────────────────────
export interface HangSo {
  giaKhoa: number;
  khoiLuongKhoa: number;
  giaBangKeo: number;
  khoiLuongBangKeo: number;
  giaQuaiXach: number;
  khoiLuongQuaiXach: number;
  giaThuungMacDinh: number;
  soTuiPerThuungMacDinh: number;
  laiSuatMacDinh: number;       // giữ để backward-compat, dùng laiSuatCoBan + laiSuatThem thay thế
  laiSuatCoBan: number;         // lãi suất cơ sở (% / năm, thập phân, vd 0.10 = 10%)
  laiSuatThem: number;          // lãi suất thêm / tình huống (% / năm)
  ngayThanhToanMacDinh: number;
  giaTrucDonVi: number;         // fallback
  giaTrucA: number;             // đơn giá Trục A (đ/m²)
  giaTrucB: number;             // đơn giá Trục B (đ/m²)
  cpSXGhep: number;
  hatHaoGhepA: number;
  hatHaoGhepB: number;
  hatHaoGhepC: number;
  hatHaoCatA: number;
  hatHaoCatB: number;
  hatHaoCatC: number;
  cuocVanChuyenMacDinh: number;
  soKmMacDinh: number;
  chiPhiNhanCong: number;
  cpCatCoBan: number;
  nguongCat1: number;
  nguongCat2: number;
  heSoCat1: number;
  heSoCat2: number;
  heSoCat3: number;
  quyTacCat?: QuyTacCat[];
  giaNhu: number;
  giaMo: number;
  chiPhiCaiDatMau: Record<number, number>;
  hatHaoInA: number;
  hatHaoInB: number;
  hatHaoInC: number;
  hatHaoInD: number;
  giaMucMangInBOPP?: number;
  giaMucMangInKhac?: number;
  phutSetupMangInMoiMau?: number;
  mauSoGioSetupMangIn?: number;
  nguongMetMangIn?: number;
  tocDoMangInNgan?: number;
  chiPhiGioMangIn?: number;
  nguongVanChuyenMangInM2?: number;
  chiPhiVanChuyenMangIn?: number;
  mocVanChuyenMangInM2?: number;
  laiSuatMangIn?: number;
  tyLeLoiNhuanMangIn?: TyLeLoiNhuanMangIn[];
}

// ── Bảng lợi nhuận ───────────────────────────────────────────────────────────
export interface DongLoiNhuan {
  nguong: number;
  cot1: number;
  cot2: number;
}

// ── Đầu vào tính giá ─────────────────────────────────────────────────────────
export interface DauVaoTinhGia {
  khachHang: string;
  tenSanPham: string;
  loaiSanPham: string;       // 'tui' | 'mang'
  loaiTui: string;
  loaiMang: string;
  chieuDaiCuonMang: number;
  soLuong: number;
  soMau: number | null;
  soHinh: number;
  nhomKhachMangIn?: 'normal' | 'large';
  idLop1?: string | null;
  idLop2?: string | null;
  idLop2Phu?: string | null;
  chieuDaiLop2?: { vl1: number; vl2: number };
  matTruocLop2?: 'main' | 'alt';
  kieuGhepLop2?: 'bottom_to_bottom' | 'front_to_front';
  idLop3?: string | null;
  idLop4?: string | null;
  idLop5?: string | null;
  khoTrai: number;           // spreadWidth
  buocCat: number;           // cutStep
  phiKimLoai: number;
  tyLePhuMucMuc: number;
  khoiLuongQuaiXach: number;
  khoiLuongKhoa: number;
  khoiLuongBangKeo: number;
  coKhoa: boolean;
  coBangKeo: boolean;
  coQuaiXach: boolean;
  ngayThanhToan: number;
  loaiTruc: string; // loại trục: 'A', 'B', custom key, hoặc 'custom' (tự nhập)
  baoTruc: boolean;               // true = phân bổ chi phí trục vào đơn giá
  // laiSuatThanhToan đã bỏ — lãi suất lấy từ HangSo (laiSuatCoBan + laiSuatThem)
  cotLoiNhuan: number;
  tyLeHoaHong: number;
  hoaHongCoDinhVND: number;
  donViHoaHong: 'percent' | 'vnd';
  giaTriHoaHongNhap: number;
  soTuiPerThuung: number;
  giaThuung: number;
  khoiLuongThuung?: number;
  cuocVanChuyenPerKm: number;
  soKmVanChuyen: number;
  chieuDaiTruc: number;
  chuViTruc: number;
  giaTrucDonVi: number;
  doDayMucTieu?: number;
  ghiDeDayLop?: Record<string, number>;
  cauTrucNhieuVatLieu?: Record<string, string[]>;
  bangGiaKhoNho?: GiaVatLieuKhoNho[];
}

// ── Trạng thái đơn hàng ───────────────────────────────────────────────────────
export type TrangThaiDonHang =
  | 'nhap' | 'da_gui' | 'cho_duyet' | 'da_duyet' | 'hoan_thanh';

export const CAU_HINH_TRANG_THAI_DON_HANG: Record<TrangThaiDonHang, {
  nhanHien: string; nhanNgan: string; mauSac: string; nenMau: string; buoc: number; moTa: string;
}> = {
  nhap:       { nhanHien: 'Đã lập',     nhanNgan: 'Đã lập',    mauSac: '#6b7280', nenMau: 'rgba(107,114,128,0.1)', buoc: 1, moTa: 'Báo giá đã được lập' },
  da_gui:     { nhanHien: 'Đã gửi',     nhanNgan: 'Đã gửi',    mauSac: '#3b82f6', nenMau: 'rgba(59,130,246,0.1)',  buoc: 2, moTa: 'Đã gửi cho khách hàng' },
  cho_duyet:  { nhanHien: 'Chờ duyệt',  nhanNgan: 'Chờ duyệt', mauSac: '#d97706', nenMau: 'rgba(217,119,6,0.1)',   buoc: 3, moTa: 'Đang chờ phê duyệt nội bộ' },
  da_duyet:   { nhanHien: 'Đã duyệt',   nhanNgan: 'Đã duyệt',  mauSac: '#8b5cf6', nenMau: 'rgba(139,92,246,0.1)',  buoc: 4, moTa: 'Admin đã duyệt báo giá' },
  hoan_thanh: { nhanHien: 'Hoàn thành', nhanNgan: 'Xong',      mauSac: '#059669', nenMau: 'rgba(5,150,105,0.1)',   buoc: 5, moTa: 'Khách hàng đã chốt' },
};

export const MAP_TRANG_THAI_CU: Record<string, TrangThaiDonHang> = {
  drafted: 'nhap', sent: 'da_gui', pending_approval: 'cho_duyet',
  approved: 'da_duyet', completed: 'hoan_thanh',
};

// ── Bảng ghi đè ───────────────────────────────────────────────────────────────
export type KhoaHangGhiDe = 'in' | 'ghep-2' | 'ghep-3' | 'ghep-4' | 'ghep-5' | 'cat';

export interface TruongGhiDe {
  kho?: number;
  met?: number;
  hatHao?: number;
  dauVaoVL?: number;
  giaVatLieu?: number;
}

export type BangGhiDe = Partial<Record<KhoaHangGhiDe, Partial<TruongGhiDe>>>;

// ── Lịch sử đơn hàng ─────────────────────────────────────────────────────────
export interface LichSuDonHang {
  id: string;
  ngay: string;
  khachHang: string;
  tenSanPham: string;
  cauTruc: string;
  soLuong: number;
  giaCuoiCung: number;
  giaChot?: number;
  trangThaiDon?: TrangThaiDonHang;
  idNguoiBan?: string;
  tenNguoiBan?: string;
  ghiDeSale?: BangGhiDe;
  ghiDeAdmin?: BangGhiDe;
  dauVao: DauVaoTinhGia;
}

// ── Chi tiết lớp (dùng trong KetQuaTinhGia) ──────────────────────────────────
export interface ChiTietLop {
  vatLieu: number;
  kho: number;
  met: number;
  hatHao: number;
  cpsx: number;
  chiPhiSX: number;
  chiPhiVL: number;
  tongCong: number;
}

export interface ChiTietLopCat {
  kho: number;
  met: number;
  hatHao: number;
  cpsx: number;
  chiPhiSX: number;
  tongCong: number;
}

// ── Kết quả tính giá ─────────────────────────────────────────────────────────
export interface KetQuaTinhGia {
  dauVao: DauVaoTinhGia;
  chuoiCauTruc: string;
  tongDoDay: number;
  tongGSM: number;
  dienTichTui: number;
  tongDienTich: number;
  khoCatIn: number;
  chieuDaiMang: number;
  khoCat: number;
  metCat: number;
  hatHaoCat: number;
  cpSXCat: number;
  chiPhiSXCat: number;
  tongChiPhiCat: number;
  khoNLIn: number;
  metIn: number;
  hatHaoIn: number;
  cpSXIn: number;
  chiPhiSXIn: number;
  chiPhiVatLieuIn: number;
  tongChiPhiIn: number;
  cpMangIn?: number;
  gioSetupMangIn?: number;
  gioSanXuatMangIn?: number;
  tongGioMangIn?: number;
  chiPhiGioMangIn?: number;
  tongChiPhiSX: number;
  tongChiPhiGhep: number;
  tyLeLoiNhuan: number;
  soTienLoiNhuan: number;
  doanhThu: number;
  chiPhiDonVi: number;
  khoaPerDonVi: number;
  tongTienKhoa: number;
  bangKeoPerDonVi: number;
  tongTienBangKeo: number;
  quaiXachPerDonVi: number;
  tongTienQuaiXach: number;
  thuungPerDonVi: number;
  tongTienThuung: number;
  giaThuungThucTe: number;
  soTuiPerThuungThucTe: number;
  soThuung: number;
  dienTichCuonMang: number;
  phiDongGoiPerDonVi: number;
  khoiLuongTare: number;
  cuocVanChuyenPerDonVi: number;
  tongCuocVanChuyen: number;
  tyLeCuocVanChuyen: number;
  cuocVanChuyenThucTePerKm: number;
  soKmThucTe: number;
  laiSuatPerDonVi: number;
  laiSuatCoBan: number;          // lãi cơ sở (% / năm)
  laiSuatThem: number;           // lãi thêm (% / năm)
  ngayThanhToan: number;
  hoaHongPerDonVi: number;
  giaCuoiCung: number;
  chiPhiTruc: number;
  chiPhiTrucPerDonVi: number;
  chiPhiTrucPhanBo: number;      // chi phí trục phân bổ vào đơn giá khi baoTruc=true
  dienTichTruc: number;
  chieuDaiTruc: number;
  chuViTruc: number;
  ngaySanXuat: number;
  cacLop: {
    in: ChiTietLop;
    ghep: ChiTietLop[];
    cat: ChiTietLopCat;
  };
}

// ── Trạng thái LSX ───────────────────────────────────────────────────────────
export type TrangThaiLSX = 'moi_tao' | 'dang_sx' | 'hoan_thanh' | 'da_huy';

export const CAU_HINH_TRANG_THAI_LSX: Record<TrangThaiLSX, {
  nhanHien: string; mauSac: string; nenMau: string;
}> = {
  moi_tao:    { nhanHien: 'Mới tạo',    mauSac: '#6b7280', nenMau: 'rgba(107,114,128,0.1)' },
  dang_sx:    { nhanHien: 'Đang SX',    mauSac: '#d97706', nenMau: 'rgba(217,119,6,0.1)'   },
  hoan_thanh: { nhanHien: 'Hoàn thành', mauSac: '#059669', nenMau: 'rgba(5,150,105,0.1)'   },
  da_huy:     { nhanHien: 'Đã huỷ',     mauSac: '#dc2626', nenMau: 'rgba(220,38,38,0.1)'   },
};

export const MAP_TRANG_THAI_LSX_CU: Record<string, TrangThaiLSX> = {
  created: 'moi_tao', in_production: 'dang_sx',
  completed: 'hoan_thanh', cancelled: 'da_huy',
};

export interface TruongThuCongLSX {
  soLSX: string; ngayXuong: string; nguoiLap: string; nguoiDuyet: string;
  ngayGiaoHang: string; ghiChu: string;
  maSanPham: string; tenSanPham: string; maMucNhu: string;
  quyCachChiTiet: string; quyCachCuon: string; chieuRaCuonSP: string; ghiChuSoLuongDH: string;
  tenMangIn: string; dinhMucHatHaoIn: number; thanhPhamIn: number;
  soTruc: number; duongKinhTruc: number; chieuDaiTruc: number;
  chieuRaCuonSauIn: number; soLuongCapVatTu: number; ghiChuMayIn: string;
  thongTinTruc: string; chieuIn: string; mstTrucIn: string; donViThanhPhamIn: string;
  khoCia: number; chieuDaiQuanCuon: number; chieuRaCuonSauChia: number;
  yeuCauGiaoHangChia: string; ghiChuMayChia: string;
  tenMangGhep: string; khoMangGhep: number; dinhMucHatHaoGhep: number;
  thanhPhamGhep: number; btpGhep: number; chiTietMangGhep2: string;
  ghiChuMayGhep: string; soLuongCapVatTuGhep: string; donViThanhPhamGhep: string; ghiChuBTP: string;
  thongTinDongGoi: string; ghiChuDongGoi: string; yeuCauGiaoHang: string;
  danBien: string; xepDayHanDay: string; nhAnXeVo: string;
  hanTruoc: number; hanSau: number; hanBien: number; hanDau: number; xepHong: number;
  thongTinDucLo: string; loThongHoi: string; dinhMucHatHaoMayTui: number;
  luuYMayTui: string; dungKhuonBanNguyet: boolean; dungDaoCat2Nhip: boolean;
  hatHaoMayTui: number; yeuCauGiaoHangMayTui: string; ghiChuMayLamTui: string;
}

export interface LenhSanXuat {
  id: string;
  idDonHang: string;
  ngayTao: string;
  trangThai: TrangThaiLSX;
  thuCong: TruongThuCongLSX;
  anhChup: {
    khachHang: string; tenSanPham: string; loaiSanPham: string;
    cauTruc: string; soLuong: number; khoTrai: number; buocCat: number;
    soMau: number | null; loaiTui: string; chieuDaiTruc: number;
    chuViTruc: number; chieuDaiCuonMang: number;
    tenLop1: string; tenLop2: string; tenLop3: string; tenLop4: string; tenLop5: string;
    giaChot: number; tongDienTich: number;
  };
}

// ── Khách hàng ───────────────────────────────────────────────────────────────
export interface KhachHang {
  id: string;
  loai: 'cong_ty' | 'ca_nhan';
  // Thông tin công ty (chỉ dùng khi loai === 'cong_ty')
  tenCongTy: string;
  maSoThue: string;
  diaChiCongTy: string;
  emailCongTy: string;
  sdtCongTy: string;
  // Người liên hệ (luôn có) — hoặc tên cá nhân
  tenLienHe: string;
  sdt: string;
  email: string;
  // Phân công
  idNhanVienBan: string | null;
  ngayTao: string;
}
