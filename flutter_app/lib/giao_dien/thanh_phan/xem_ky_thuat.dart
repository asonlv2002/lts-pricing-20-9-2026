// giao_dien/thanh_phan/xem_ky_thuat.dart — TechView (theo TechView.tsx)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

class XemKyThuat extends StatelessWidget {
  const XemKyThuat({super.key});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final kq = kho.ketQua;

    if (kq == null) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('⚙️', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text('Vui lòng tính giá để xem thông số kỹ thuật sản xuất',
              style: TextStyle(fontSize: 14, color: ChuDe.mauNhatTheo(toi)),
              textAlign: TextAlign.center),
        ]),
      );
    }

    final dv = kq.dauVao;
    final laMang = dv.loaiSanPham == 'mang';
    final ni = dv.soConHinh < 1 ? 1 : dv.soConHinh;

    // ── Build unified rows (giống TechView.tsx) ─────────────────────────────
    // IN
    final dWidthIn = dv.khoTrai * ni + 0.02;
    final dMetersIn = kq.metIn / ni;
    final dWasteIn = kq.phiHaoIn / ni;

    // GHÉP rows
    // CẮT (chỉ túi)

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Info box: Chỉ đạo sản xuất ─────────────────────────────────
            _InfoBox(text: 'Chỉ Đạo Sản Xuất  ${kq.chuoiCauTruc}', toi: toi),
            const SizedBox(height: 12),

            // ── Stat cards ─────────────────────────────────────────────────
            // Đầu Vào Khâu In | Đầu Vào Khâu Cắt | Khổ Thành Phẩm | Khổ Màng NL
            LayoutBuilder(builder: (ctx, constraints) {
              final cols = constraints.maxWidth > 500 ? (laMang ? 3 : 4) : 2;
              final cards = <Widget>[
                TheThongKe(
                  nhan: 'Đầu Vào Khâu In',
                  giaTri: '${dinhDangSo(dMetersIn + dWasteIn, chiSoThapPhan: 0)} m',
                  mauGiaTri: ChuDe.mauTruc(toi),     // accent
                ),
                if (!laMang)
                  TheThongKe(
                    nhan: 'Đầu Vào Khâu Cắt',
                    giaTri: '${dinhDangSo((kq.metCat + kq.phiHaoCat) / ni, chiSoThapPhan: 0)} m',
                    mauGiaTri: ChuDe.mauTruc2(toi),   // cyan
                  ),
                TheThongKe(
                  nhan: 'Khổ Thành Phẩm',
                  giaTri: dv.khoTrai.toStringAsFixed(3),
                  mauGiaTri: ChuDe.mauXanhTheo(toi),  // green
                ),
                TheThongKe(
                  nhan: 'Khổ Màng NL',
                  giaTri: dWidthIn.toStringAsFixed(3),
                  mauGiaTri: ChuDe.mauCamTheo(toi),   // orange
                ),
              ];
              return GridView.count(
                crossAxisCount: cols,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 2.0,
                children: cards,
              );
            }),
            const SizedBox(height: 12),

            // ── Chi tiết sản xuất & nguyên liệu ────────────────────────────
            TheCoTheGap(
              tieu: const NhanTieuDeCard(bieu: '🏭', van: 'CHI TIẾT SẢN XUẤT & NGUYÊN LIỆU'),
              noi: _BangSanXuat(kq: kq, kho: kho, ni: ni, toi: toi),
              resetKey: kq.chuoiCauTruc,
            ),

            // ── Trọng lượng & Vận chuyển ────────────────────────────────────
            TheCoTheGap(
              tieu: const NhanTieuDeCard(bieu: '⚖️', van: 'TRỌNG LƯỢNG & VẬN CHUYỂN'),
              noi: _TrongLuong(kq: kq, laMang: laMang, toi: toi),
              resetKey: kq.chuoiCauTruc,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Info box ─────────────────────────────────────────────────────────────────
class _InfoBox extends StatelessWidget {
  final String text;
  final bool toi;
  const _InfoBox({required this.text, required this.toi});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: ChuDe.mauTruc2(toi).withAlpha(18),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: ChuDe.mauTruc2(toi).withAlpha(50)),
      ),
      child: Row(children: [
        const Text('ℹ️', style: TextStyle(fontSize: 14)),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: TextStyle(fontSize: 12, color: ChuDe.mauChuTheo(toi)))),
      ]),
    );
  }
}

// ─── Bảng sản xuất (theo data-table trong TechView.tsx) ───────────────────────
class _BangSanXuat extends StatelessWidget {
  final KetQuaTinhGia kq;
  final KhoChinhLuuTru kho;
  final int ni;
  final bool toi;
  const _BangSanXuat({required this.kq, required this.kho, required this.ni, required this.toi});

  @override
  Widget build(BuildContext context) {
    final dv = kq.dauVao;
    final laMang = dv.loaiSanPham == 'mang';
    final vl1 = kho.dsVatLieu.where((v) => v.maVL == dv.maLop1).firstOrNull;

    // Các hàng dữ liệu: [Công đoạn, Vật liệu, Khổ, Thành phẩm, Phi hao, Đầu vào VL]
    // Đúng theo TechView.tsx:
    //   dWidth = spreadWidth * numImages + 0.02 (trừ CẮT)
    //   dMeters = row.meters / numImages
    //   dWaste = row.waste / numImages
    //   inputVL = dMeters + dWaste
    final List<_TechRow> rows = [];

    // IN
    final dWidthIn = dv.khoTrai * ni + 0.02;
    rows.add(_TechRow(
      cong: 'CPSX IN',
      vatLieu: vl1?.tenVL ?? '—',
      kho: dWidthIn,
      metTP: kq.metIn / ni,
      phiHao: kq.phiHaoIn / ni,
    ));

    // GHÉP (lớp 2-5)
    for (final lop in kq.cacLopGhep) {
      rows.add(_TechRow(
        cong: 'GHÉP (Lớp ${lop.soLop})',
        vatLieu: lop.vatLieu.tenVL,
        kho: dv.khoTrai * ni + 0.02,
        metTP: lop.metThanhPham / ni,
        phiHao: lop.phiHao / ni,
      ));
    }

    // CẮT (chỉ túi)
    if (!laMang) {
      rows.add(_TechRow(
        cong: 'CẮT',
        vatLieu: '—',
        kho: kq.khoCat,
        metTP: kq.metCat / ni,
        phiHao: kq.phiHaoCat / ni,
      ));
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowHeight: 32,
        dataRowMinHeight: 30,
        dataRowMaxHeight: 40,
        columnSpacing: 14,
        headingTextStyle: TextStyle(
          fontSize: 10, fontWeight: FontWeight.w700,
          color: ChuDe.mauNhatTheo(toi),
        ),
        dataTextStyle: TextStyle(fontSize: 11, color: ChuDe.mauChuTheo(toi)),
        columns: const [
          DataColumn(label: Text('Công đoạn')),
          DataColumn(label: Text('Vật liệu')),
          DataColumn(label: Text('Khổ (m)'), numeric: true),
          DataColumn(label: Text('Thành phẩm (m)'), numeric: true),
          DataColumn(label: Text('Phi hao'), numeric: true),
          DataColumn(label: Text('Đầu vào VL'), numeric: true),
        ],
        rows: rows.map((r) {
          final inputVL = r.metTP + r.phiHao;
          return DataRow(cells: [
            DataCell(Text(r.cong, style: const TextStyle(fontWeight: FontWeight.w600))),
            DataCell(Text(r.vatLieu)),
            DataCell(Text(r.kho.toStringAsFixed(3))),
            DataCell(Text(dinhDangSo(r.metTP, chiSoThapPhan: 0))),
            DataCell(Text(dinhDangSo(r.phiHao, chiSoThapPhan: 0))),
            DataCell(Text(
              dinhDangSo(inputVL, chiSoThapPhan: 0),
              style: TextStyle(fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi)),
            )),
          ]);
        }).toList(),
      ),
    );
  }
}

class _TechRow {
  final String cong;
  final String vatLieu;
  final double kho;
  final double metTP;
  final double phiHao;
  const _TechRow({required this.cong, required this.vatLieu, required this.kho, required this.metTP, required this.phiHao});
}

// ─── Trọng lượng ─────────────────────────────────────────────────────────────
class _TrongLuong extends StatelessWidget {
  final KetQuaTinhGia kq;
  final bool laMang;
  final bool toi;
  const _TrongLuong({required this.kq, required this.laMang, required this.toi});

  @override
  Widget build(BuildContext context) {
    final dv = kq.dauVao;
    final tongKg = kq.trongLuong * dv.soLuong / 1000;

    final items = <(String, String)>[
      (laMang ? 'Diện tích băng (m²/m dài)' : 'Diện tích 1 túi', dinhDangM2(kq.dienTich1Tui)),
      ('Tổng diện tích đơn hàng', '${dinhDangSo(kq.tongDienTich, chiSoThapPhan: 1)} m²'),
      if (!laMang) ...[
        ('Trọng lượng / túi (Tare)', '${kq.trongLuong.toStringAsFixed(2)} gr'),
        ('Tổng trọng lượng', '${dinhDangSo(tongKg, chiSoThapPhan: 1)} kg'),
        ('Trọng lượng (tấn)', '${(tongKg / 1000).toStringAsFixed(3)} tấn'),
      ] else ...[
        ('Chiều dài cuộn TP', '${dinhDangSo(kq.chieuDaiCuon)} m/cuộn'),
      ],
    ];

    return Column(
      children: items.map((item) => HangPhanTich(nhan: item.$1, giaTri: item.$2)).toList(),
    );
  }
}
