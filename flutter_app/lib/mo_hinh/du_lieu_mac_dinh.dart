// mo_hinh/du_lieu_mac_dinh.dart — Seed data vật liệu, hằng số, bảng lợi nhuận
import 'kieu_du_lieu.dart';

class DuLieuMacDinh {
  // ─── Vật liệu mặc định ───────────────────────────────────────────────────
  static final List<VatLieu> danhSachVatLieu = [
    VatLieu(maVL: 'OPP20', tenVL: 'OPP 20mic', khoiLuongRieng: 0.91, doDay: 20, giaTrenKg: 45000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'OPP30', tenVL: 'OPP 30mic', khoiLuongRieng: 0.91, doDay: 30, giaTrenKg: 45000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'BOPP20', tenVL: 'BOPP 20mic', nhomVL: 'BOPP', khoiLuongRieng: 0.91, doDay: 20, giaTrenKg: 46000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'BOPP25', tenVL: 'BOPP 25mic', nhomVL: 'BOPP', khoiLuongRieng: 0.91, doDay: 25, giaTrenKg: 46000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'BOPP30', tenVL: 'BOPP 30mic', nhomVL: 'BOPP', khoiLuongRieng: 0.91, doDay: 30, giaTrenKg: 46000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'MattOPP20', tenVL: 'Matt OPP 20mic', nhomVL: 'Matt OPP', khoiLuongRieng: 0.91, doDay: 20, giaTrenKg: 48000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'MattOPP30', tenVL: 'Matt OPP 30mic', nhomVL: 'Matt OPP', khoiLuongRieng: 0.91, doDay: 30, giaTrenKg: 48000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'PET12', tenVL: 'PET 12mic', khoiLuongRieng: 1.40, doDay: 12, giaTrenKg: 62000, laPEThoaPA: true, giaIn1Mau: 135),
    VatLieu(maVL: 'PET15', tenVL: 'PET 15mic', khoiLuongRieng: 1.40, doDay: 15, giaTrenKg: 62000, laPEThoaPA: true, giaIn1Mau: 135),
    VatLieu(maVL: 'PET19', tenVL: 'PET 19mic', khoiLuongRieng: 1.40, doDay: 19, giaTrenKg: 62000, laPEThoaPA: true, giaIn1Mau: 135),
    VatLieu(maVL: 'NY15', tenVL: 'PA 15mic', khoiLuongRieng: 1.15, doDay: 15, giaTrenKg: 78000, laPEThoaPA: true, giaIn1Mau: 135),
    VatLieu(maVL: 'NY25', tenVL: 'PA 25mic', khoiLuongRieng: 1.15, doDay: 25, giaTrenKg: 78000, laPEThoaPA: true, giaIn1Mau: 135),
    VatLieu(maVL: 'CPP30', tenVL: 'CPP 30mic', khoiLuongRieng: 0.91, doDay: 30, giaTrenKg: 42000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'CPP40', tenVL: 'CPP 40mic', khoiLuongRieng: 0.91, doDay: 40, giaTrenKg: 42000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'CPP50', tenVL: 'CPP 50mic', khoiLuongRieng: 0.91, doDay: 50, giaTrenKg: 42000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'LLDPE60', tenVL: 'LLDPE 60mic', khoiLuongRieng: 0.92, doDay: 60, giaTrenKg: 38000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'LLDPE80', tenVL: 'LLDPE 80mic', khoiLuongRieng: 0.92, doDay: 80, giaTrenKg: 38000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'LLDPE100', tenVL: 'LLDPE 100mic', khoiLuongRieng: 0.92, doDay: 100, giaTrenKg: 38000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'PE50', tenVL: 'PE 50mic', khoiLuongRieng: 0.92, doDay: 50, giaTrenKg: 36000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'PE80', tenVL: 'PE 80mic', khoiLuongRieng: 0.92, doDay: 80, giaTrenKg: 36000, laPEThoaPA: false, giaIn1Mau: 120),
    VatLieu(maVL: 'MPET12', tenVL: 'MPET 12mic', khoiLuongRieng: 1.40, doDay: 12, giaTrenKg: 85000, laPEThoaPA: false, giaIn1Mau: 135),
    VatLieu(maVL: 'AL7', tenVL: 'AL 7mic', khoiLuongRieng: 2.70, doDay: 7, giaTrenKg: 120000, laPEThoaPA: false, giaIn1Mau: 135),
    VatLieu(maVL: 'AL9', tenVL: 'AL 9mic', khoiLuongRieng: 2.70, doDay: 9, giaTrenKg: 120000, laPEThoaPA: false, giaIn1Mau: 135),
  ];

  // ─── Hằng số hệ thống ────────────────────────────────────────────────────
  static const double cpsxGhep = 1200;
  static const double phiHaoGhepA = 3000;
  static const double phiHaoGhepB = 20;
  static const double phiHaoGhepC = 100;
  static const double phiHaoCatA = 3000;
  static const double phiHaoCatB = 20;
  static const double phiHaoCatC = 100;
  static const double cpsxCatCoSo = 971;
  static const double nguongCatNho = 0.07;
  static const double nguongCatTrung = 0.20;
  static const double heSoCatNho = 1.4;
  static const double heSoCatTrung = 1.2;
  static const double heSoCatLon = 0.8;
  static const double phiHaoInA = 6000;
  static const double phiHaoInB = 40;
  static const double phiHaoInC = 50000;
  static const double phiHaoInD = 400;
  static const double chiPhiNhanCong = 1200; // laborCost
  static const double giaNhu = 500;
  static const double giaMo = 300;
  static const double giaZipper = 378;   // đ/m
  static const double giaBangKeo = 200;  // đ/m
  static const double giaQuai = 1500;    // đ/cái
  static const double trongLuongQuaiMacDinh = 5.0;    // gr
  static const double trongLuongZipperMacDinh = 2.0;  // gr
  static const double trongLuongBangKeoMacDinh = 1.0; // gr
  static const double donGiaTrucMacDinh = 7300000;

  // Phế hao khởi máy theo số màu (colorSetup)
  static const Map<int, double> phiHaoKhoiMay = {
    0: 0, 1: 500, 2: 800, 3: 1100, 4: 1400,
    5: 1700, 6: 2000, 7: 2300, 8: 2600,
  };

  // ─── Bảng lợi nhuận ──────────────────────────────────────────────────────
  static const List<HangLN> bangLN = [
    HangLN(nguong: 5000000,   cot1: 0.35, cot2: 0.30),
    HangLN(nguong: 20000000,  cot1: 0.25, cot2: 0.20),
    HangLN(nguong: 100000000, cot1: 0.18, cot2: 0.15),
  ];
  static const double lnMacDinhCot1 = 0.12;
  static const double lnMacDinhCot2 = 0.10;
}
