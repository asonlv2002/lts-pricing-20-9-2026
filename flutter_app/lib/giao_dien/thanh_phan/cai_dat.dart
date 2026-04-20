// giao_dien/thanh_phan/cai_dat.dart — Module Cài Đặt / Bảng Định Mức
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../../mo_hinh/du_lieu_mac_dinh.dart';
import '../khung_chinh/chu_de.dart';

class ModuleCaiDat extends StatefulWidget {
  const ModuleCaiDat({super.key});
  @override State<ModuleCaiDat> createState() => _ModuleCaiDatState();
}

class _ModuleCaiDatState extends State<ModuleCaiDat> {
  List<VatLieu> _dsVL = [];
  List<HangLN> _bangLN = [];
  bool _daDoi = false;

  @override void initState() {
    super.initState();
    _dsVL = List.from(DuLieuMacDinh.danhSachVatLieu.map((v) => VatLieu(
      maVL: v.maVL, tenVL: v.tenVL, nhomVL: v.nhomVL,
      khoiLuongRieng: v.khoiLuongRieng, doDay: v.doDay,
      giaTrenKg: v.giaTrenKg, laPEThoaPA: v.laPEThoaPA,
      coTheDieuChinhMic: v.coTheDieuChinhMic,
    )));
    _bangLN = List.from(DuLieuMacDinh.bangLN);
  }

  void _reset() {
    setState(() {
      _dsVL = List.from(DuLieuMacDinh.danhSachVatLieu.map((v) => VatLieu(
        maVL: v.maVL, tenVL: v.tenVL, nhomVL: v.nhomVL,
        khoiLuongRieng: v.khoiLuongRieng, doDay: v.doDay,
        giaTrenKg: v.giaTrenKg, laPEThoaPA: v.laPEThoaPA,
      )));
      _bangLN = List.from(DuLieuMacDinh.bangLN);
      _daDoi = false;
    });
  }

  @override Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('🏭 Bảng Định Mức Chi Phí', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi))),
            Text('Giá trị đầu vào dùng cho tính toán sản xuất', style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi))),
          ])),
          if (_daDoi) OutlinedButton.icon(
            onPressed: _reset,
            icon: const Icon(Icons.refresh, size: 14),
            label: const Text('Reset mặc định', style: TextStyle(fontSize: 12)),
            style: OutlinedButton.styleFrom(side: BorderSide(color: ChuDe.mauVienTheo(toi)), foregroundColor: ChuDe.mauNhatTheo(toi)),
          ),
        ]),
        const SizedBox(height: 16),

        // Bảng giá NVL
        _sectionHeader('📦 Giá Nguyên Vật Liệu', toi),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(color: ChuDe.mauMatTheo(toi), borderRadius: BorderRadius.circular(ChuDe.bKinhRadius), border: Border.all(color: ChuDe.mauVienTheo(toi))),
          child: Column(children: [
            // Header row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(children: [
                SizedBox(width: 30, child: Text('STT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi)))),
                Expanded(child: Text('Vật liệu', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi)))),
                SizedBox(width: 80, child: Text('Độ dày (mic)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi)), textAlign: TextAlign.right)),
                SizedBox(width: 100, child: Text('Giá/kg (đ)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi)), textAlign: TextAlign.right)),
                SizedBox(width: 90, child: Text('Giá/m² (đ)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi)), textAlign: TextAlign.right)),
              ]),
            ),
            Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
            ..._dsVL.asMap().entries.map((e) {
              final idx = e.key;
              final vl = e.value;
              return Column(children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(children: [
                    SizedBox(width: 30, child: Text('${idx + 1}', style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)))),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(vl.tenVL, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ChuDe.mauChuTheo(toi))),
                      Text(vl.maVL, style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
                    ])),
                    SizedBox(width: 80, child: _InlineNumberInput(
                      giaTri: vl.doDay,
                      onThayDoi: (v) => setState(() {
                        final m2 = v * vl.khoiLuongRieng * vl.giaTrenKg / 1000;
                        _dsVL[idx] = VatLieu(maVL: vl.maVL, tenVL: vl.tenVL, nhomVL: vl.nhomVL, khoiLuongRieng: vl.khoiLuongRieng, doDay: v, giaTrenKg: vl.giaTrenKg, laPEThoaPA: vl.laPEThoaPA, coTheDieuChinhMic: vl.coTheDieuChinhMic)..giaTrenM2 = m2;
                        _daDoi = true;
                      }),
                      toi: toi,
                    )),
                    SizedBox(width: 100, child: _InlineNumberInput(
                      giaTri: vl.giaTrenKg,
                      onThayDoi: (v) => setState(() {
                        final m2 = vl.doDay * vl.khoiLuongRieng * v / 1000;
                        _dsVL[idx] = VatLieu(maVL: vl.maVL, tenVL: vl.tenVL, nhomVL: vl.nhomVL, khoiLuongRieng: vl.khoiLuongRieng, doDay: vl.doDay, giaTrenKg: v, laPEThoaPA: vl.laPEThoaPA, coTheDieuChinhMic: vl.coTheDieuChinhMic)..giaTrenM2 = m2;
                        _daDoi = true;
                      }),
                      toi: toi,
                    )),
                    SizedBox(width: 90, child: Text(
                      vl.giaTrenM2.toStringAsFixed(0),
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi)),
                      textAlign: TextAlign.right,
                    )),
                  ]),
                ),
                if (idx < _dsVL.length - 1) Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
              ]);
            }),
          ]),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: ChuDe.mauTruc(toi).withValues(alpha: 0.06), borderRadius: BorderRadius.circular(8), border: Border.all(color: ChuDe.mauTruc(toi).withValues(alpha: 0.2))),
          child: Row(children: [
            Icon(Icons.info_outline, size: 14, color: ChuDe.mauTruc(toi)),
            const SizedBox(width: 8),
            Expanded(child: Text('Chỉnh Độ dày và Giá/kg — Giá/m² tự động tính lại. Thay đổi áp dụng cho lần tính giá tiếp theo.', style: TextStyle(fontSize: 11, color: ChuDe.mauTruc(toi)))),
          ]),
        ),
        const SizedBox(height: 24),

        const SizedBox(height: 24),

        // ── Hằng số / Constants (rút gọn — bản Next có cột màu in & bảng mực).
        //    Chỉ hiển thị tổng quan; chỉnh sửa đầy đủ ở bản desktop.
        _sectionHeader('⚙️ Hằng Số Chi Phí', toi),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: ChuDe.mauMatTheo(toi),
            borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
            border: Border.all(color: ChuDe.mauVienTheo(toi)),
          ),
          child: Row(children: [
            Icon(Icons.tune, size: 14, color: ChuDe.mauNhatTheo(toi)),
            const SizedBox(width: 8),
            Expanded(child: Text(
              'CPSX (In/Ghép/Cắt), phi hao, giá trục in, bảng màu mực — chỉnh ở bản Web để đồng bộ server.',
              style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)),
            )),
          ]),
        ),
        const SizedBox(height: 24),

        // Bảng lợi nhuận
        _sectionHeader('💰 Bảng Lợi Nhuận', toi),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(color: ChuDe.mauMatTheo(toi), borderRadius: BorderRadius.circular(ChuDe.bKinhRadius), border: Border.all(color: ChuDe.mauVienTheo(toi))),
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(children: [
                Expanded(child: Text('Ngưỡng doanh thu (đ)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi)))),
                SizedBox(width: 90, child: Text('Cột 1 (%)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi)), textAlign: TextAlign.center)),
                SizedBox(width: 90, child: Text('Cột 2 (%)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi)), textAlign: TextAlign.center)),
              ]),
            ),
            Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
            ..._bangLN.asMap().entries.map((e) {
              final idx = e.key;
              final h = e.value;
              return Column(children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(children: [
                    Expanded(child: Text(
                      h.nguong == 0 ? 'Dưới 9.900.000' : '≥ ${_fmtN(h.nguong)}',
                      style: TextStyle(fontSize: 12, color: ChuDe.mauChuTheo(toi)),
                    )),
                    SizedBox(width: 90, child: Text('${(h.cot1 * 100).toStringAsFixed(1)}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ChuDe.mauTruc(toi)), textAlign: TextAlign.center)),
                    SizedBox(width: 90, child: Text('${(h.cot2 * 100).toStringAsFixed(1)}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ChuDe.mauTruc2(toi)), textAlign: TextAlign.center)),
                  ]),
                ),
                if (idx < _bangLN.length - 1) Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
              ]);
            }),
          ]),
        ),
        const SizedBox(height: 32),
      ]),
    );
  }

  String _fmtN(double n) => n.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');

  Widget _sectionHeader(String ten, bool toi) => Text(ten, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi)));
}

class _InlineNumberInput extends StatefulWidget {
  final double giaTri;
  final ValueChanged<double> onThayDoi;
  final bool toi;
  const _InlineNumberInput({required this.giaTri, required this.onThayDoi, required this.toi});
  @override State<_InlineNumberInput> createState() => _InlineNumberInputState();
}

class _InlineNumberInputState extends State<_InlineNumberInput> {
  late TextEditingController _ctrl;
  bool _focus = false;

  @override void initState() { super.initState(); _ctrl = TextEditingController(text: widget.giaTri.toString()); }
  @override void didUpdateWidget(_InlineNumberInput old) {
    super.didUpdateWidget(old);
    if (!_focus && old.giaTri != widget.giaTri) _ctrl.text = widget.giaTri.toString();
  }
  @override void dispose() { _ctrl.dispose(); super.dispose(); }

  @override Widget build(BuildContext context) => Focus(
    onFocusChange: (f) { setState(() => _focus = f); if (!f) _ctrl.text = widget.giaTri.toString(); },
    child: TextField(
      controller: _ctrl,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textAlign: TextAlign.right,
      style: TextStyle(fontSize: 12, color: ChuDe.mauChuTheo(widget.toi)),
      decoration: InputDecoration(
        isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
      ),
      onChanged: (s) { final v = double.tryParse(s); if (v != null) widget.onThayDoi(v); },
    ),
  );
}
