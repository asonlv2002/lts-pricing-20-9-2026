// ═══════════════════════════════════════════════════════════════════════════
// ChotGiaAllocation — port `apps/web/src/lib/chot-gia-allocation.ts`.
// Tính phân bổ chênh lệch giá chốt giữa Hoa hồng và Công ty (VNĐ hoặc %).
// ═══════════════════════════════════════════════════════════════════════════

enum DonViPhanBo { vnd, percent }

double _lamTronMotSo(double value) =>
    double.parse(value.toStringAsFixed(1));

class KetQuaNhapPhanBoChotGia {
  final double congTyDisplay;
  final double hoaHongDisplay;
  final double congTyAmount;
  final double hoaHongAmount;
  final bool khoaNhapCongTy;
  final List<String> loi;
  const KetQuaNhapPhanBoChotGia({
    required this.congTyDisplay,
    required this.hoaHongDisplay,
    required this.congTyAmount,
    required this.hoaHongAmount,
    required this.khoaNhapCongTy,
    required this.loi,
  });
}

/// Mirror `tinhNhapPhanBoChotGia` — chot-gia-allocation.ts:86.
KetQuaNhapPhanBoChotGia tinhNhapPhanBoChotGia({
  required bool hasChotGia,
  required double diff,
  required double hoaHongNhap,
  required double hoaHongEngine,
  DonViPhanBo donViPhanBo = DonViPhanBo.vnd,
}) {
  if (!hasChotGia) {
    return const KetQuaNhapPhanBoChotGia(
      congTyDisplay: 0,
      hoaHongDisplay: 0,
      congTyAmount: 0,
      hoaHongAmount: 0,
      khoaNhapCongTy: true,
      loi: [],
    );
  }

  final loi = <String>[];
  final hoaHongDuong = hoaHongNhap.isFinite ? hoaHongNhap : 0.0;
  final gioiHanChenhLech = diff.abs();
  final hoaHongDuongTheoTien = donViPhanBo == DonViPhanBo.percent
      ? gioiHanChenhLech * (hoaHongDuong / 100)
      : hoaHongDuong;
  if (hoaHongNhap < 0) {
    loi.add('Hoa hồng không được âm.');
  }
  if (donViPhanBo == DonViPhanBo.percent && hoaHongDuong > 100) {
    loi.add('Hoa hồng không được vượt quá 100%.');
  }
  if (hoaHongDuongTheoTien > gioiHanChenhLech) {
    loi.add(
        'Hoa hồng không được vượt quá chênh lệch ${_lamTronMotSo(gioiHanChenhLech)}đ/đơn vị.');
  }
  if (diff < 0 && hoaHongDuongTheoTien > hoaHongEngine) {
    loi.add(
        'Hoa hồng bị trừ không được vượt quá hoa hồng hiện tại ${_lamTronMotSo(hoaHongEngine)}đ/đơn vị.');
  }

  final hoaHongAmount = diff < 0 ? -hoaHongDuongTheoTien : hoaHongDuongTheoTien;
  final congTyAmount = diff - hoaHongAmount;

  return KetQuaNhapPhanBoChotGia(
    hoaHongDisplay: hoaHongDuong,
    congTyDisplay: donViPhanBo == DonViPhanBo.percent
        ? (100 - hoaHongDuong) < 0
            ? 0
            : 100 - hoaHongDuong
        : congTyAmount.abs(),
    hoaHongAmount: hoaHongAmount,
    congTyAmount: congTyAmount,
    khoaNhapCongTy: true,
    loi: loi,
  );
}
