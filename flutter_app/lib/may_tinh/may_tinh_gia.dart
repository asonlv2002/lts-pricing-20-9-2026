// may_tinh/may_tinh_gia.dart — Engine tính giá (port từ engine.ts)
import '../mo_hinh/kieu_du_lieu.dart';
import '../mo_hinh/du_lieu_mac_dinh.dart';

class MayTinhGia {
  // ─── Tra bảng lợi nhuận ──────────────────────────────────────────────────
  static double traLN(double tongCPSX, int cotLN, List<HangLN> bangLN) {
    for (final hang in bangLN) {
      if (tongCPSX < hang.nguong) {
        return cotLN == 1 ? hang.cot1 : hang.cot2;
      }
    }
    return cotLN == 1 ? DuLieuMacDinh.lnMacDinhCot1 : DuLieuMacDinh.lnMacDinhCot2;
  }

  // ─── Hàm tính chính ──────────────────────────────────────────────────────
  static KetQuaTinhGia? tinh(
    DauVaoTinhGia dv,
    List<VatLieu> dsVL,
    List<HangLN> bangLN,
  ) {
    // Guard
    if (dv.maLop1 == null || dv.soLuong <= 0 || dv.khoTrai <= 0 ||
        dv.buocCat <= 0 || dv.loaiSanPham.isEmpty || dv.soMauIn == null) {
      return null;
    }
    if (dv.loaiSanPham == 'tui' && dv.loaiTui.isEmpty) return null;
    if (dv.loaiSanPham == 'mang' && dv.loaiMang.isEmpty) return null;

    final soConHinh = dv.soConHinh < 1 ? 1 : dv.soConHinh;
    final laMang = dv.loaiSanPham == 'mang';

    // ─ Tìm vật liệu theo mã ─────────────────────────────────────────────
    VatLieu? timVL(String? ma) {
      if (ma == null) return null;
      try { return dsVL.firstWhere((v) => v.maVL == ma); } catch (_) { return null; }
    }

    final lop1 = timVL(dv.maLop1);
    if (lop1 == null) return null;
    final lop2 = timVL(dv.maLop2);
    final lop3 = timVL(dv.maLop3);
    final lop4 = timVL(dv.maLop4);
    final lop5 = timVL(dv.maLop5);

    // Áp dụng micOverride
    VatLieu apDungMic(VatLieu vl, String maLopKey) {
      final mic = dv.dieuChinhMic[maLopKey];
      if (mic != null && vl.coTheDieuChinhMic && mic > 0) {
        final vNew = VatLieu(
          maVL: vl.maVL, tenVL: vl.tenVL, nhomVL: vl.nhomVL,
          khoiLuongRieng: vl.khoiLuongRieng, doDay: mic,
          giaTrenKg: vl.giaTrenKg, laPEThoaPA: vl.laPEThoaPA,
          coTheDieuChinhMic: vl.coTheDieuChinhMic,
          rollLength: vl.rollLength, giaIn1Mau: vl.giaIn1Mau,
        );
        vNew.giaTrenM2 = vNew.giaTrenKg * mic * vNew.khoiLuongRieng / 1000;
        return vNew;
      }
      return vl;
    }

    final vl1 = apDungMic(lop1, 'layer1Id');
    final vl2 = lop2 != null ? apDungMic(lop2, 'layer2Id') : null;
    final vl3 = lop3 != null ? apDungMic(lop3, 'layer3Id') : null;
    final vl4 = lop4 != null ? apDungMic(lop4, 'layer4Id') : null;
    final vl5 = lop5 != null ? apDungMic(lop5, 'layer5Id') : null;

    // ─ Chuỗi cấu trúc (theo engine.ts: "OPP 20//PET 12//PE 50") ────────────
    final dsCauTruc = [vl1, vl2, vl3, vl4, vl5]
        .where((v) => v != null)
        .map((v) => '${v!.tenVL} ${v.doDay.toInt()}')
        .toList();
    final chuoiCauTruc = dsCauTruc.join('//');

    // ─ Tổng diện tích ───────────────────────────────────────────────────
    final dienTich1Tui = dv.khoTrai * dv.buocCat;
    final tongDienTich = laMang ? dv.soLuong : dv.soLuong * dienTich1Tui;
    final khoCuon = dv.khoTrai * soConHinh + 0.02;

    // ─ Công đoạn CẮT ────────────────────────────────────────────────────
    final double metCat;
    if (laMang) {
      metCat = tongDienTich / (dv.khoTrai * soConHinh);
    } else {
      metCat = dv.buocCat * dv.soLuong / soConHinh;
    }
    final phiHaoCat = metCat / DuLieuMacDinh.phiHaoCatA * DuLieuMacDinh.phiHaoCatB + DuLieuMacDinh.phiHaoCatC;

    double cpsxCat = 0;
    double chiPhiCat = 0;
    if (!laMang) {
      if (dienTich1Tui < DuLieuMacDinh.nguongCatNho) {
        cpsxCat = DuLieuMacDinh.cpsxCatCoSo * DuLieuMacDinh.heSoCatNho;
      } else if (dienTich1Tui < DuLieuMacDinh.nguongCatTrung) {
        cpsxCat = DuLieuMacDinh.cpsxCatCoSo * DuLieuMacDinh.heSoCatTrung;
      } else {
        cpsxCat = DuLieuMacDinh.cpsxCatCoSo * DuLieuMacDinh.heSoCatLon;
      }
      chiPhiCat = cpsxCat * (metCat + phiHaoCat) * khoCuon;
    }

    // ─ Công đoạn GHÉP (layer 2→5) ───────────────────────────────────────
    final cacLopGhep = <KetQuaLop>[];
    double tongChiPhiGhep = 0;
    double tongPhiHaoGhep = 0;
    double metCanHienTai = metCat + phiHaoCat;

    for (final entry in [
      MapEntry(2, vl2), MapEntry(3, vl3),
      MapEntry(4, vl4), MapEntry(5, vl5),
    ]) {
      final vl = entry.value;
      if (vl == null) continue;
      final soLop = entry.key;
      final metDauVao = metCanHienTai;
      final phiHaoGhep = metDauVao / DuLieuMacDinh.phiHaoGhepA * DuLieuMacDinh.phiHaoGhepB + DuLieuMacDinh.phiHaoGhepC;
      final tongMet = metDauVao + phiHaoGhep;
      final cpGC = DuLieuMacDinh.cpsxGhep * tongMet * khoCuon;
      final cpNVL = vl.giaTrenM2 * tongMet * khoCuon;
      final tongCP = cpGC + cpNVL;

      cacLopGhep.add(KetQuaLop(
        vatLieu: vl, kho: khoCuon, metThanhPham: metDauVao,
        phiHao: phiHaoGhep, cpsx: DuLieuMacDinh.cpsxGhep,
        chiPhiCPSX: cpGC, chiPhiNVL: cpNVL, tongChiPhi: tongCP, soLop: soLop,
      ));
      tongChiPhiGhep += tongCP;
      tongPhiHaoGhep += phiHaoGhep;
      metCanHienTai = tongMet;
    }

    // ─ Công đoạn IN (layer 1) ────────────────────────────────────────────
    final metIn = metCat + phiHaoCat + tongPhiHaoGhep;
    final soMau = dv.soMauIn ?? 0;

    double phiHaoIn = 0;
    if (soMau > 0) {
      final setup = (DuLieuMacDinh.phiHaoKhoiMay[soMau] ?? 0).toDouble();
      final chay = metIn / DuLieuMacDinh.phiHaoInA * DuLieuMacDinh.phiHaoInB;
      final them = metIn > DuLieuMacDinh.phiHaoInC
          ? metIn / DuLieuMacDinh.phiHaoInC * DuLieuMacDinh.phiHaoInD
          : 0.0;
      phiHaoIn = setup + chay + them;
    }

    double giaIn1Mau;
    if (vl1.giaIn1Mau > 0) {
      giaIn1Mau = vl1.giaIn1Mau;
    } else if (vl1.laPEThoaPA) {
      giaIn1Mau = 135;
    } else {
      giaIn1Mau = 120;
    }

    double phuPhiKimTuyen = (dv.coNhu ? DuLieuMacDinh.giaNhu : 0) +
        (dv.coMo ? DuLieuMacDinh.giaMo : 0);

    double cpsxIn = 0;
    if (soMau > 0) {
      cpsxIn = soMau * giaIn1Mau * dv.tyLePhuMuc +
          DuLieuMacDinh.chiPhiNhanCong + phuPhiKimTuyen;
    }

    final tongMetIn = metIn + phiHaoIn;
    final cpGCIn = cpsxIn * tongMetIn * khoCuon;
    final cpNVLIn = vl1.giaTrenM2 * tongMetIn * khoCuon;
    final tongChiPhiIn = cpGCIn + cpNVLIn;

    // ─ Tổng CPSX ────────────────────────────────────────────────────────
    final tongCPSX = tongChiPhiIn + tongChiPhiGhep + chiPhiCat;

    // ─ Lợi nhuận ────────────────────────────────────────────────────────
    // Auto cotLN
    final dsLopActive = [vl1, vl2, vl3, vl4, vl5].where((v) => v != null).toList();
    final coMPEThoAL = dsLopActive.any((v) =>
        v!.maVL.toUpperCase().contains('MPET') || v.maVL.toUpperCase().contains('AL'));
    final cotLNThuc = (dsLopActive.length >= 3 || coMPEThoAL ||
        dv.loaiTui == 'dayDung' || dv.coZipper) ? 2 : 1;

    final tyLeLN = traLN(tongCPSX, cotLNThuc, bangLN);
    final soTienLN = tyLeLN * tongCPSX;
    final doanhThu = tongCPSX + soTienLN;
    final giaTrenDonVi = dv.soLuong > 0 ? doanhThu / dv.soLuong : 0;

    // ─ Phụ kiện ─────────────────────────────────────────────────────────
    final tongZipper = dv.coZipper ? dv.soLuong * dv.buocCat * DuLieuMacDinh.giaZipper : 0;
    final giaTrenDvZipper = dv.soLuong > 0 ? tongZipper / dv.soLuong : 0;
    final tongBangKeo = dv.coBangKeo ? dv.soLuong * dv.buocCat * DuLieuMacDinh.giaBangKeo : 0;
    final giaTrenDvBangKeo = dv.soLuong > 0 ? tongBangKeo / dv.soLuong : 0;
    final tongQuai = dv.coQuai ? dv.soLuong * DuLieuMacDinh.giaQuai : 0;
    final giaTrenDvQuai = dv.coQuai ? DuLieuMacDinh.giaQuai : 0;

    // ─ Đóng gói ──────────────────────────────────────────────────────────
    double giaTrenDvDongGoi = 0;
    double tongDongGoi = 0;
    double soThungCuon = 0;
    double dienTichCuonMang = 0;

    if (laMang) {
      dienTichCuonMang = dv.khoTrai * dv.chieuDaiCuonMang / soConHinh;
      if (dienTichCuonMang > 0 && dv.giaDongGoi > 0) {
        giaTrenDvDongGoi = dv.giaDongGoi / dienTichCuonMang;
        soThungCuon = dv.soLuong / dienTichCuonMang;
        tongDongGoi = giaTrenDvDongGoi * dv.soLuong;
      }
    } else {
      if (dv.soTuiTrungThung > 0) {
        soThungCuon = dv.soLuong / dv.soTuiTrungThung;
        tongDongGoi = dv.giaDongGoi * soThungCuon;
        giaTrenDvDongGoi = dv.soLuong > 0 ? tongDongGoi / dv.soLuong : 0;
      }
    }

    // ─ Vận chuyển ────────────────────────────────────────────────────────
    final tongVanChuyen = dv.giaVanChuyen * dv.soKmVanChuyen;
    final giaTrenDvVanChuyen = dv.soLuong > 0 ? tongVanChuyen / dv.soLuong : 0;

    // ─ Lãi vay ───────────────────────────────────────────────────────────
    final laiVayTrenDv = (dv.laiSuatThang / 30) * dv.soNgayThanhToan * giaTrenDonVi;

    // ─ Hoa hồng ──────────────────────────────────────────────────────────
    final hoaHongTrenDv = dv.donViHoaHong == 'vnd'
        ? dv.hoaHongCoDinhVND
        : dv.tyLeHoaHong * giaTrenDonVi;

    // ─ Giá bán cuối ──────────────────────────────────────────────────────
    final giaBanCuoi = giaTrenDonVi + giaTrenDvZipper + giaTrenDvBangKeo +
        giaTrenDvQuai + giaTrenDvDongGoi + giaTrenDvVanChuyen +
        laiVayTrenDv + hoaHongTrenDv;

    // ─ Trục in ───────────────────────────────────────────────────────────
    final chieuDaiTruc = dv.chieuDaiTruc > 0 ? dv.chieuDaiTruc : 0.0;
    final dienTichTruc = chieuDaiTruc * dv.chuViTruc;
    final chiPhiTrucIn = dienTichTruc * dv.donGiaTruc * soMau;
    final chiPhiTrucTrenDv = dv.soLuong > 0 ? chiPhiTrucIn / dv.soLuong : 0;

    // ─ Trọng lượng ───────────────────────────────────────────────────────
    final dsVLActive = [vl1, vl2, vl3, vl4, vl5].whereType<VatLieu>();
    double gsmTong = 0;
    int doDayTong = 0;
    for (final vl in dsVLActive) {
      gsmTong += vl.doDay * vl.khoiLuongRieng;
      doDayTong += vl.doDay.toInt();
    }
    final soLopGhep = cacLopGhep.length;
    final doDayKeo = soLopGhep * 3;
    final doDayCuoi = ((doDayTong + doDayKeo) / 5).round() * 5;

    double trongLuong = gsmTong / 1000 * dienTich1Tui; // g/m² × m² = g
    if (dv.coQuai) trongLuong += DuLieuMacDinh.trongLuongQuaiMacDinh;
    if (dv.coZipper) trongLuong += DuLieuMacDinh.trongLuongZipperMacDinh;
    if (dv.coBangKeo) trongLuong += DuLieuMacDinh.trongLuongBangKeoMacDinh;

    // ─ Ngày sản xuất ────────────────────────────────────────────────────
    final ngaySX = (dv.soLuong / 30000).ceil() + 4;

    return KetQuaTinhGia(
      dauVao: dv,
      chuoiCauTruc: chuoiCauTruc,
      doDay: doDayCuoi,
      gsmTong: gsmTong,
      dienTich1Tui: dienTich1Tui,
      tongDienTich: tongDienTich,
      khoCuon: khoCuon,
      chieuDaiCuon: metCat,
      khoCat: khoCuon,
      metCat: metCat,
      phiHaoCat: phiHaoCat,
      cpsxCat: cpsxCat,
      chiPhiCat: chiPhiCat,
      cacLopGhep: cacLopGhep,
      tongChiPhiGhep: tongChiPhiGhep,
      khoIn: khoCuon,
      metIn: metIn,
      phiHaoIn: phiHaoIn,
      cpsxIn: cpsxIn,
      chiPhiGCIn: cpGCIn,
      chiPhiNVLIn: cpNVLIn,
      tongChiPhiIn: tongChiPhiIn,
      tongCPSX: tongCPSX,
      tyLeLN: tyLeLN,
      soTienLN: soTienLN,
      doanhThu: doanhThu,
      giaTrenDonVi: giaTrenDonVi.toDouble(),
      giaTrenDvZipper: giaTrenDvZipper.toDouble(),
      tongZipper: tongZipper.toDouble(),
      giaTrenDvBangKeo: giaTrenDvBangKeo.toDouble(),
      tongBangKeo: tongBangKeo.toDouble(),
      giaTrenDvQuai: giaTrenDvQuai.toDouble(),
      tongQuai: tongQuai.toDouble(),
      giaTrenDvDongGoi: giaTrenDvDongGoi.toDouble(),
      tongDongGoi: tongDongGoi.toDouble(),
      soThungCuon: soThungCuon.toDouble(),
      dienTichCuonMang: dienTichCuonMang.toDouble(),
      giaTrenDvVanChuyen: giaTrenDvVanChuyen.toDouble(),
      tongVanChuyen: tongVanChuyen.toDouble(),
      laiVayTrenDv: laiVayTrenDv,
      hoaHongTrenDv: hoaHongTrenDv,
      giaBanCuoi: giaBanCuoi,
      chiPhiTrucIn: chiPhiTrucIn.toDouble(),
      chiPhiTrucTrenDv: chiPhiTrucTrenDv.toDouble(),
      dienTichTruc: dienTichTruc,
      trongLuong: trongLuong,
      ngaySX: ngaySX,
    );
  }
}
