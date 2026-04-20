// kho_luu_tru/kho_chinh.dart — AppStore (ChangeNotifier)
import 'dart:math';
import 'package:flutter/material.dart';
import '../mo_hinh/kieu_du_lieu.dart';
import '../mo_hinh/du_lieu_mac_dinh.dart';
import '../may_tinh/may_tinh_gia.dart';

// ─── Role & Layout enums ──────────────────────────────────────────────────────
enum VaiTro { admin, sale, purchase }

extension VaiTroExt on VaiTro {
  String get ten {
    switch (this) {
      case VaiTro.admin:    return 'Quản trị viên';
      case VaiTro.sale:     return 'Kinh doanh';
      case VaiTro.purchase: return 'Thu mua';
    }
  }
  String get bieu {
    switch (this) {
      case VaiTro.admin:    return '👑';
      case VaiTro.sale:     return '💼';
      case VaiTro.purchase: return '🛒';
    }
  }
}

enum CheDoLayout { macDinh, xepChong, rong, bento }
enum MatDo { gon, vua, thoang }

class KhoChinhLuuTru extends ChangeNotifier {
  // ─── Dữ liệu form ────────────────────────────────────────────────────────
  DauVaoTinhGia dauVao = DauVaoTinhGia();
  KetQuaTinhGia? ketQua;
  List<VatLieu> dsVatLieu = List.from(DuLieuMacDinh.danhSachVatLieu);
  List<HangLN> bangLN = List.from(DuLieuMacDinh.bangLN);
  List<MucLichSu> lichSu = [];

  // ─── UI state ────────────────────────────────────────────────────────────
  ThemeMode cheDoGiaoDien = ThemeMode.light;
  String moduleDangXem = 'mayTinh';
  bool sidebarMo = true;
  int tabKetQua = 0; // 0=quanLy, 1=kyThuat, 2=lichSu
  double giaChotHienTai = 0;
  bool nangCaoMo = false;
  bool dangSua = false; // isDirty
  VaiTro vaiTro = VaiTro.admin;
  CheDoLayout cheDoLayout = CheDoLayout.macDinh;
  MatDo matDo = MatDo.vua;

  // ─── Tính toán lại ───────────────────────────────────────────────────────
  void _tinhLai() {
    ketQua = MayTinhGia.tinh(dauVao, dsVatLieu, bangLN);
  }

  // ─── Cập nhật đầu vào ────────────────────────────────────────────────────
  void capNhatDauVao(DauVaoTinhGia dv) {
    // Auto-tính chiều dài trục
    var dvMoi = dv.copyWith();
    final kho = dvMoi.khoTrai;
    final ni = dvMoi.soConHinh < 1 ? 1 : dvMoi.soConHinh;
    if (kho > 0) {
      dvMoi.chieuDaiTruc = double.parse(max(0.7, kho * ni + 0.1).toStringAsFixed(3));
    } else {
      dvMoi.chieuDaiTruc = 0;
    }
    // Auto-tính chu vi trục
    final bc = dvMoi.buocCat;
    if (bc > 0) {
      int n = 1;
      while (bc * n < 0.4) { n++; }
      dvMoi.chuViTruc = double.parse((bc * n).toStringAsFixed(3));
    } else {
      dvMoi.chuViTruc = 0;
    }
    // Phụ phí kim tuyến
    dvMoi = dvMoi.copyWith(
      phuPhiKimTuyen: (dvMoi.coNhu ? DuLieuMacDinh.giaNhu : 0) +
          (dvMoi.coMo ? DuLieuMacDinh.giaMo : 0),
      trongLuongQuai: dvMoi.coQuai ? DuLieuMacDinh.trongLuongQuaiMacDinh : 0,
      trongLuongZipper: dvMoi.coZipper ? DuLieuMacDinh.trongLuongZipperMacDinh : 0,
      trongLuongBangKeo: dvMoi.coBangKeo ? DuLieuMacDinh.trongLuongBangKeoMacDinh : 0,
    );
    dauVao = dvMoi;
    _tinhLai();
    dangSua = true;
    notifyListeners();
  }

  // ─── Reset form ──────────────────────────────────────────────────────────
  void resetForm() {
    dauVao = DauVaoTinhGia();
    ketQua = null;
    giaChotHienTai = 0;
    dangSua = false;
    nangCaoMo = false;
    notifyListeners();
  }

  // ─── Lưu vào lịch sử ─────────────────────────────────────────────────────
  void luuVaoLichSu() {
    if (ketQua == null) return;
    final now = DateTime.now();
    final ngay = '${now.day.toString().padLeft(2,'0')}/${now.month.toString().padLeft(2,'0')}/${now.year}';
    final muc = MucLichSu(
      id: now.millisecondsSinceEpoch.toString(),
      ngay: ngay,
      tenKhach: dauVao.tenKhachHang.isEmpty ? 'N/A' : dauVao.tenKhachHang,
      tenSP: dauVao.tenSanPham.isEmpty ? 'N/A' : dauVao.tenSanPham,
      cauTruc: ketQua!.chuoiCauTruc,
      soLuong: dauVao.soLuong,
      giaBanCuoi: ketQua!.giaBanCuoi,
      dauVao: dauVao.copyWith(),
    );
    lichSu = [muc, ...lichSu].take(200).toList();
    dangSua = false;
    notifyListeners();
  }

  // ─── Load lịch sử ────────────────────────────────────────────────────────
  void loadLichSu(String id) {
    final muc = lichSu.where((m) => m.id == id).firstOrNull;
    if (muc == null) return;
    dauVao = muc.dauVao.copyWith();
    giaChotHienTai = muc.giaChotGia ?? 0;
    _tinhLai();
    dangSua = false;
    moduleDangXem = 'mayTinh';
    notifyListeners();
  }

  // ─── Xóa lịch sử ─────────────────────────────────────────────────────────
  void xoaLichSu(String id) {
    lichSu = lichSu.where((m) => m.id != id).toList();
    notifyListeners();
  }

  // ─── Chốt giá ────────────────────────────────────────────────────────────
  void datGiaChotHienTai(double gia) {
    giaChotHienTai = gia;
    notifyListeners();
  }

  void luuGiaChot() {
    if (lichSu.isEmpty || giaChotHienTai <= 0) return;
    lichSu[0].giaChotGia = giaChotHienTai;
    notifyListeners();
  }

  // ─── UI toggles ──────────────────────────────────────────────────────────
  void doiGiaoDien() {
    cheDoGiaoDien = cheDoGiaoDien == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }

  void doiModule(String ten) {
    moduleDangXem = ten;
    notifyListeners();
  }

  void doiTab(int tab) {
    tabKetQua = tab;
    notifyListeners();
  }

  void doiSidebar(bool mo) {
    sidebarMo = mo;
    notifyListeners();
  }

  void doiNangCao(bool mo) {
    nangCaoMo = mo;
    notifyListeners();
  }

  void doiVaiTro(VaiTro vt) {
    vaiTro = vt;
    // Nếu module hiện tại không phù hợp với vai trò mới, reset về module hợp lệ đầu tiên
    final modules = modulesChoPhep;
    if (!modules.contains(moduleDangXem)) {
      moduleDangXem = modules.first;
    }
    notifyListeners();
  }

  void doiLayout(CheDoLayout layout) {
    cheDoLayout = layout;
    notifyListeners();
  }

  void doiMatDo(MatDo md) {
    matDo = md;
    notifyListeners();
  }

  // ─── Danh sách module được phép theo vai trò ─────────────────────────────
  List<String> get modulesChoPhep {
    switch (vaiTro) {
      case VaiTro.admin:
        return ['mayTinh', 'baoGia', 'lichSu', 'lenhSX', 'bangDinhMuc', 'khachHang', 'seller', 'taiKhoan', 'caiDat'];
      case VaiTro.sale:
        return ['mayTinh', 'baoGia', 'lichSu', 'khachHang'];
      case VaiTro.purchase:
        return ['lenhSX', 'bangDinhMuc'];
    }
  }
}
