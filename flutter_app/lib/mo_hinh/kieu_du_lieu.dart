// mo_hinh/kieu_du_lieu.dart — Toàn bộ kiểu dữ liệu (port từ types.ts)
import 'package:flutter/material.dart';
// ─── Vật liệu ───────────────────────────────────────────────────────────────
class VatLieu {
  final String maVL;
  final String tenVL;
  final String? nhomVL;
  final double khoiLuongRieng; // density
  final double doDay; // thickness (mic)
  final double giaTrenKg;
  final bool laPEThoaPA;
  final bool coTheDieuChinhMic;
  final double rollLength;
  final double giaIn1Mau;
  double giaTrenM2;

  VatLieu({
    required this.maVL,
    required this.tenVL,
    this.nhomVL,
    required this.khoiLuongRieng,
    required this.doDay,
    required this.giaTrenKg,
    required this.laPEThoaPA,
    this.coTheDieuChinhMic = false,
    this.rollLength = 6000,
    this.giaIn1Mau = 0,
  }) : giaTrenM2 = giaTrenKg * doDay * khoiLuongRieng / 1000;
}

// ─── Hàng lợi nhuận ─────────────────────────────────────────────────────────
class HangLN {
  final double nguong;
  final double cot1;
  final double cot2;
  const HangLN({required this.nguong, required this.cot1, required this.cot2});
}

// ─── Đầu vào tính giá ───────────────────────────────────────────────────────
class DauVaoTinhGia {
  String tenKhachHang;
  String tenSanPham;
  String loaiSanPham; // 'tui' | 'mang' | ''
  String loaiTui;     // '3bien' | '4bien' | 'xephong_lech' | 'xephong_giua' | 'dayDung' | 'cutSeal' | ''
  String loaiMang;    // 'mangIn' | 'mangGhep' | 'mangDongGoi' | ''
  double soLuong;
  int? soMauIn;
  int soConHinh;
  String? maLop1;
  String? maLop2;
  String? maLop3;
  String? maLop4;
  String? maLop5;
  double khoTrai;     // spreadWidth
  double buocCat;     // cutStep
  double phuPhiKimTuyen; // metallicSurcharge
  double tyLePhuMuc;   // coverageRatio
  double trongLuongQuai;
  double trongLuongZipper;
  double trongLuongBangKeo;
  bool coZipper;
  bool coBangKeo;
  bool coQuai;
  bool coNhu;
  bool coMo;
  int soNgayThanhToan;
  double laiSuatThang;
  int cotLN; // profitColumn
  double tyLeHoaHong;
  double hoaHongCoDinhVND;
  String donViHoaHong; // 'percent' | 'vnd'
  double giaTriHoaHongNhap;
  double soTuiTrungThung;
  double giaDongGoi;
  double giaVanChuyen; // đ/km
  double soKmVanChuyen;
  double chieuDaiTruc; // cylLength
  double chuViTruc;    // cylCircum
  double donGiaTruc;   // cylUnitPrice
  double chieuDaiCuonMang; // filmRollLength
  Map<String, double> dieuChinhMic; // micOverrides

  DauVaoTinhGia({
    this.tenKhachHang = '',
    this.tenSanPham = '',
    this.loaiSanPham = '',
    this.loaiTui = '',
    this.loaiMang = '',
    this.soLuong = 0,
    this.soMauIn,
    this.soConHinh = 1,
    this.maLop1,
    this.maLop2,
    this.maLop3,
    this.maLop4,
    this.maLop5,
    this.khoTrai = 0,
    this.buocCat = 0,
    this.phuPhiKimTuyen = 0,
    this.tyLePhuMuc = 1,
    this.trongLuongQuai = 0,
    this.trongLuongZipper = 0,
    this.trongLuongBangKeo = 0,
    this.coZipper = false,
    this.coBangKeo = false,
    this.coQuai = false,
    this.coNhu = false,
    this.coMo = false,
    this.soNgayThanhToan = 30,
    this.laiSuatThang = 0.0025,
    this.cotLN = 2,
    this.tyLeHoaHong = 0,
    this.hoaHongCoDinhVND = 0,
    this.donViHoaHong = 'percent',
    this.giaTriHoaHongNhap = 0,
    this.soTuiTrungThung = 0,
    this.giaDongGoi = 0,
    this.giaVanChuyen = 0,
    this.soKmVanChuyen = 0,
    this.chieuDaiTruc = 0,
    this.chuViTruc = 0,
    this.donGiaTruc = 7300000,
    this.chieuDaiCuonMang = 6000,
    Map<String, double>? dieuChinhMic,
  }) : dieuChinhMic = dieuChinhMic ?? {};

  DauVaoTinhGia copyWith({
    String? tenKhachHang, String? tenSanPham, String? loaiSanPham,
    String? loaiTui, String? loaiMang, double? soLuong, int? soMauIn,
    int? soConHinh, String? maLop1, String? maLop2, String? maLop3,
    String? maLop4, String? maLop5, double? khoTrai, double? buocCat,
    double? phuPhiKimTuyen, double? tyLePhuMuc, double? trongLuongQuai,
    double? trongLuongZipper, double? trongLuongBangKeo,
    bool? coZipper, bool? coBangKeo, bool? coQuai, bool? coNhu, bool? coMo,
    int? soNgayThanhToan, double? laiSuatThang, int? cotLN,
    double? tyLeHoaHong, double? hoaHongCoDinhVND, String? donViHoaHong,
    double? giaTriHoaHongNhap, double? soTuiTrungThung, double? giaDongGoi,
    double? giaVanChuyen, double? soKmVanChuyen, double? chieuDaiTruc,
    double? chuViTruc, double? donGiaTruc, double? chieuDaiCuonMang,
    Map<String, double>? dieuChinhMic,
  }) {
    return DauVaoTinhGia(
      tenKhachHang: tenKhachHang ?? this.tenKhachHang,
      tenSanPham: tenSanPham ?? this.tenSanPham,
      loaiSanPham: loaiSanPham ?? this.loaiSanPham,
      loaiTui: loaiTui ?? this.loaiTui,
      loaiMang: loaiMang ?? this.loaiMang,
      soLuong: soLuong ?? this.soLuong,
      soMauIn: soMauIn ?? this.soMauIn,
      soConHinh: soConHinh ?? this.soConHinh,
      maLop1: maLop1 ?? this.maLop1,
      maLop2: maLop2 ?? this.maLop2,
      maLop3: maLop3 ?? this.maLop3,
      maLop4: maLop4 ?? this.maLop4,
      maLop5: maLop5 ?? this.maLop5,
      khoTrai: khoTrai ?? this.khoTrai,
      buocCat: buocCat ?? this.buocCat,
      phuPhiKimTuyen: phuPhiKimTuyen ?? this.phuPhiKimTuyen,
      tyLePhuMuc: tyLePhuMuc ?? this.tyLePhuMuc,
      trongLuongQuai: trongLuongQuai ?? this.trongLuongQuai,
      trongLuongZipper: trongLuongZipper ?? this.trongLuongZipper,
      trongLuongBangKeo: trongLuongBangKeo ?? this.trongLuongBangKeo,
      coZipper: coZipper ?? this.coZipper,
      coBangKeo: coBangKeo ?? this.coBangKeo,
      coQuai: coQuai ?? this.coQuai,
      coNhu: coNhu ?? this.coNhu,
      coMo: coMo ?? this.coMo,
      soNgayThanhToan: soNgayThanhToan ?? this.soNgayThanhToan,
      laiSuatThang: laiSuatThang ?? this.laiSuatThang,
      cotLN: cotLN ?? this.cotLN,
      tyLeHoaHong: tyLeHoaHong ?? this.tyLeHoaHong,
      hoaHongCoDinhVND: hoaHongCoDinhVND ?? this.hoaHongCoDinhVND,
      donViHoaHong: donViHoaHong ?? this.donViHoaHong,
      giaTriHoaHongNhap: giaTriHoaHongNhap ?? this.giaTriHoaHongNhap,
      soTuiTrungThung: soTuiTrungThung ?? this.soTuiTrungThung,
      giaDongGoi: giaDongGoi ?? this.giaDongGoi,
      giaVanChuyen: giaVanChuyen ?? this.giaVanChuyen,
      soKmVanChuyen: soKmVanChuyen ?? this.soKmVanChuyen,
      chieuDaiTruc: chieuDaiTruc ?? this.chieuDaiTruc,
      chuViTruc: chuViTruc ?? this.chuViTruc,
      donGiaTruc: donGiaTruc ?? this.donGiaTruc,
      chieuDaiCuonMang: chieuDaiCuonMang ?? this.chieuDaiCuonMang,
      dieuChinhMic: dieuChinhMic ?? Map.from(this.dieuChinhMic),
    );
  }
}

// ─── Kết quả tính giá ───────────────────────────────────────────────────────
class KetQuaLop {
  final VatLieu vatLieu;
  final double kho;
  final double metThanhPham;
  final double phiHao;
  final double cpsx;
  final double chiPhiCPSX;
  final double chiPhiNVL;
  final double tongChiPhi;
  final int soLop;
  const KetQuaLop({
    required this.vatLieu, required this.kho,
    required this.metThanhPham, required this.phiHao,
    required this.cpsx, required this.chiPhiCPSX,
    required this.chiPhiNVL, required this.tongChiPhi,
    required this.soLop,
  });
}

class KetQuaTinhGia {
  final DauVaoTinhGia dauVao;
  final String chuoiCauTruc;
  final int doDay;
  final double gsmTong;
  final double dienTich1Tui;
  final double tongDienTich;
  final double khoCuon;
  final double chieuDaiCuon;
  // Cắt
  final double khoCat;
  final double metCat;
  final double phiHaoCat;
  final double cpsxCat;
  final double chiPhiCat;
  // Ghép
  final List<KetQuaLop> cacLopGhep;
  final double tongChiPhiGhep;
  // In
  final double khoIn;
  final double metIn;
  final double phiHaoIn;
  final double cpsxIn;
  final double chiPhiGCIn;
  final double chiPhiNVLIn;
  final double tongChiPhiIn;
  // Tổng
  final double tongCPSX;
  final double tyLeLN;
  final double soTienLN;
  final double doanhThu;
  final double giaTrenDonVi;
  // Phụ kiện
  final double giaTrenDvZipper;
  final double tongZipper;
  final double giaTrenDvBangKeo;
  final double tongBangKeo;
  final double giaTrenDvQuai;
  final double tongQuai;
  // Đóng gói
  final double giaTrenDvDongGoi;
  final double tongDongGoi;
  final double soThungCuon;
  final double dienTichCuonMang;
  // Vận chuyển
  final double giaTrenDvVanChuyen;
  final double tongVanChuyen;
  // Lãi & hoa hồng
  final double laiVayTrenDv;
  final double hoaHongTrenDv;
  // Cuối
  final double giaBanCuoi;
  // Trục in
  final double chiPhiTrucIn;
  final double chiPhiTrucTrenDv;
  final double dienTichTruc;
  // Khác
  final double trongLuong;
  final int ngaySX;

  const KetQuaTinhGia({
    required this.dauVao,
    required this.chuoiCauTruc,
    required this.doDay,
    required this.gsmTong,
    required this.dienTich1Tui,
    required this.tongDienTich,
    required this.khoCuon,
    required this.chieuDaiCuon,
    required this.khoCat,
    required this.metCat,
    required this.phiHaoCat,
    required this.cpsxCat,
    required this.chiPhiCat,
    required this.cacLopGhep,
    required this.tongChiPhiGhep,
    required this.khoIn,
    required this.metIn,
    required this.phiHaoIn,
    required this.cpsxIn,
    required this.chiPhiGCIn,
    required this.chiPhiNVLIn,
    required this.tongChiPhiIn,
    required this.tongCPSX,
    required this.tyLeLN,
    required this.soTienLN,
    required this.doanhThu,
    required this.giaTrenDonVi,
    required this.giaTrenDvZipper,
    required this.tongZipper,
    required this.giaTrenDvBangKeo,
    required this.tongBangKeo,
    required this.giaTrenDvQuai,
    required this.tongQuai,
    required this.giaTrenDvDongGoi,
    required this.tongDongGoi,
    required this.soThungCuon,
    required this.dienTichCuonMang,
    required this.giaTrenDvVanChuyen,
    required this.tongVanChuyen,
    required this.laiVayTrenDv,
    required this.hoaHongTrenDv,
    required this.giaBanCuoi,
    required this.chiPhiTrucIn,
    required this.chiPhiTrucTrenDv,
    required this.dienTichTruc,
    required this.trongLuong,
    required this.ngaySX,
  });
}

// ─── Lịch sử ─────────────────────────────────────────────────────────────────
class MucLichSu {
  final String id;
  final String ngay;
  final String tenKhach;
  final String tenSP;
  final String cauTruc;
  final double soLuong;
  final double giaBanCuoi;
  double? giaChotGia;
  final DauVaoTinhGia dauVao;

  MucLichSu({
    required this.id,
    required this.ngay,
    required this.tenKhach,
    required this.tenSP,
    required this.cauTruc,
    required this.soLuong,
    required this.giaBanCuoi,
    this.giaChotGia,
    required this.dauVao,
  });
}

// ─── Trạng thái báo giá ─────────────────────────────────────────────────────
enum TrangThaiBaoGia { soThao, daDGui, choXetDuyet, daDuyet, hoangThanh }

extension TrangThaiBaoGiaExt on TrangThaiBaoGia {
  String get nhan {
    switch (this) {
      case TrangThaiBaoGia.soThao:       return 'Đang soạn';
      case TrangThaiBaoGia.daDGui:       return 'Đã gửi';
      case TrangThaiBaoGia.choXetDuyet:  return 'Chờ duyệt';
      case TrangThaiBaoGia.daDuyet:      return 'Đã duyệt';
      case TrangThaiBaoGia.hoangThanh:   return 'Hoàn thành';
    }
  }
  Color get mau {
    switch (this) {
      case TrangThaiBaoGia.soThao:       return const Color(0xFF6B7280);
      case TrangThaiBaoGia.daDGui:       return const Color(0xFF0891B2);
      case TrangThaiBaoGia.choXetDuyet:  return const Color(0xFFD97706);
      case TrangThaiBaoGia.daDuyet:      return const Color(0xFF4F46E5);
      case TrangThaiBaoGia.hoangThanh:   return const Color(0xFF059669);
    }
  }
  Color get mauNen {
    return Color.fromRGBO(mau.red, mau.green, mau.blue, 0.12);
  }
}

// ─── Mục lịch sử mở rộng (có trạng thái báo giá) ────────────────────────────
class MucBaoGia extends MucLichSu {
  TrangThaiBaoGia trangThai;
  String? tenSeller;
  String? maSeller;
  double? tongGiaTri;

  MucBaoGia({
    required super.id,
    required super.ngay,
    required super.tenKhach,
    required super.tenSP,
    required super.cauTruc,
    required super.soLuong,
    required super.giaBanCuoi,
    super.giaChotGia,
    required super.dauVao,
    this.trangThai = TrangThaiBaoGia.soThao,
    this.tenSeller,
    this.maSeller,
  }) : tongGiaTri = (giaChotGia != null && giaChotGia > 0 ? giaChotGia : giaBanCuoi) * soLuong;
}

// ─── Trạng thái Lệnh SX ─────────────────────────────────────────────────────
enum TrangThaiLSX { moiTao, dangSX, hoangThanh, huiBo }

extension TrangThaiLSXExt on TrangThaiLSX {
  String get nhan {
    switch (this) {
      case TrangThaiLSX.moiTao:      return 'Mới tạo';
      case TrangThaiLSX.dangSX:      return 'Đang SX';
      case TrangThaiLSX.hoangThanh:  return 'Hoàn thành';
      case TrangThaiLSX.huiBo:       return 'Huỷ bỏ';
    }
  }
  Color get mau {
    switch (this) {
      case TrangThaiLSX.moiTao:      return const Color(0xFF6B7280);
      case TrangThaiLSX.dangSX:      return const Color(0xFFD97706);
      case TrangThaiLSX.hoangThanh:  return const Color(0xFF059669);
      case TrangThaiLSX.huiBo:       return const Color(0xFFDC2626);
    }
  }
  Color get mauNen => Color.fromRGBO(mau.red, mau.green, mau.blue, 0.12);
}

// ─── Lệnh Sản Xuất ─────────────────────────────────────────────────────────
class LenhSX {
  final String id;
  final String soLSX;
  final String tenKhach;
  final String tenSP;
  final String cauTruc;
  final double soLuong;
  final String loaiSP; // 'tui' | 'mang'
  final String ngayTao;
  TrangThaiLSX trangThai;

  LenhSX({
    required this.id,
    required this.soLSX,
    required this.tenKhach,
    required this.tenSP,
    required this.cauTruc,
    required this.soLuong,
    required this.loaiSP,
    required this.ngayTao,
    this.trangThai = TrangThaiLSX.moiTao,
  });
}

// ─── Khách hàng ─────────────────────────────────────────────────────────────
enum LoaiKhachHang { congTy, caNhan }

class KhachHang {
  final String id;
  final LoaiKhachHang loai;
  final String tenCongTy;
  final String maSoThue;
  final String diaChi;
  final String emailCT;
  final String sdtCT;
  final String tenNguoiLienHe;
  final String sdt;
  final String email;
  String? maSeller;
  final String ngayTao;

  KhachHang({
    required this.id,
    required this.loai,
    this.tenCongTy = '',
    this.maSoThue = '',
    this.diaChi = '',
    this.emailCT = '',
    this.sdtCT = '',
    required this.tenNguoiLienHe,
    required this.sdt,
    this.email = '',
    this.maSeller,
    required this.ngayTao,
  });
}

// ─── Seller ─────────────────────────────────────────────────────────────────
class Seller {
  final String id;
  String ten;
  String email;
  String sdt;
  final String ngayThamGia;
  bool dangHoatDong;

  Seller({
    required this.id,
    required this.ten,
    required this.email,
    required this.sdt,
    required this.ngayThamGia,
    this.dangHoatDong = true,
  });
}

// ─── Tài khoản người dùng ────────────────────────────────────────────────────
enum VaiTroTK { admin, sale, purchase }

extension VaiTroTKExt on VaiTroTK {
  String get nhan {
    switch (this) {
      case VaiTroTK.admin:    return 'Quản trị';
      case VaiTroTK.sale:     return 'Kinh doanh';
      case VaiTroTK.purchase: return 'Thu mua';
    }
  }
  Color get mau {
    switch (this) {
      case VaiTroTK.admin:    return const Color(0xFF7C3AED);
      case VaiTroTK.sale:     return const Color(0xFF0891B2);
      case VaiTroTK.purchase: return const Color(0xFF059669);
    }
  }
  Color get mauNen => Color.fromRGBO(mau.red, mau.green, mau.blue, 0.12);
}

class TaiKhoanNguoiDung {
  final String id;
  final String tenDangNhap;
  String tenHienThi;
  VaiTroTK vaiTro;
  String? maSellerLienKet;
  bool dangHoatDong;
  final String ngayTao;

  TaiKhoanNguoiDung({
    required this.id,
    required this.tenDangNhap,
    required this.tenHienThi,
    required this.vaiTro,
    this.maSellerLienKet,
    this.dangHoatDong = true,
    required this.ngayTao,
  });
}
