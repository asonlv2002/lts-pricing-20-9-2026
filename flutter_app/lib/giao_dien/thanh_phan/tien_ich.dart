// giao_dien/thanh_phan/tien_ich.dart — Helpers: format số, widget tái sử dụng
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../khung_chinh/chu_de.dart';

// ─── Format số ───────────────────────────────────────────────────────────────
final _fmtSo = NumberFormat('#,###', 'vi_VN');
final _fmtSoCham = NumberFormat('#,###.##', 'vi_VN');

String dinhDangSo(double? n, {int chiSoThapPhan = 0}) {
  if (n == null || n.isNaN || n.isInfinite) return '—';
  if (chiSoThapPhan == 0) {
    return NumberFormat('#,###', 'vi_VN').format(n.round());
  }
  return NumberFormat('#,###.${'#' * chiSoThapPhan}', 'vi_VN').format(n);
}

String dinhDangTien(double? n) => n == null ? '—' : '${dinhDangSo(n)} đ';
String dinhDangPhan(double n) => '${(n * 100).toStringAsFixed(2)}%';
String dinhDangM2(double? n) => n == null ? '—' : '${dinhDangSo(n, chiSoThapPhan: 4)} m²';

// ─── StatCard ─────────────────────────────────────────────────────────────────
class TheThongKe extends StatelessWidget {
  final String nhan;
  final String giaTri;
  final Color mauGiaTri;
  final String? ghiChu; // sub-text nhỏ bên dưới (vd: "12 đ/túi (3%)")
  const TheThongKe({super.key, required this.nhan, required this.giaTri, required this.mauGiaTri, this.ghiChu});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4, offset: const Offset(0, 1))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(nhan, textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.5)),
          const SizedBox(height: 4),
          Text(giaTri, textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: mauGiaTri)),
          if (ghiChu != null) ...[
            const SizedBox(height: 3),
            Text(ghiChu!, textAlign: TextAlign.center,
                style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
          ],
        ],
      ),
    );
  }
}

// ─── Card thu gọn (Collapsible) ───────────────────────────────────────────────
class TheCoTheGap extends StatefulWidget {
  final Widget tieu;
  final Widget noi;
  final Object resetKey;
  final EdgeInsets? padding;
  const TheCoTheGap({super.key, required this.tieu, required this.noi, required this.resetKey, this.padding});

  @override
  State<TheCoTheGap> createState() => _TheCoTheGapState();
}

class _TheCoTheGapState extends State<TheCoTheGap> {
  bool _mo = false;

  @override
  void didUpdateWidget(TheCoTheGap old) {
    super.didUpdateWidget(old);
    if (old.resetKey != widget.resetKey) setState(() => _mo = false);
  }

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 3)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _mo = !_mo),
            borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              child: Row(children: [
                Expanded(child: widget.tieu),
                AnimatedRotation(
                  turns: _mo ? 0 : 0.5,
                  duration: const Duration(milliseconds: 250),
                  child: Icon(Icons.expand_less, size: 18, color: ChuDe.mauNhatTheo(toi)),
                ),
              ]),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: widget.padding ?? const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: widget.noi,
            ),
            crossFadeState: _mo ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 300),
          ),
        ],
      ),
    );
  }
}

// ─── Nhãn tiêu đề card ────────────────────────────────────────────────────────
class NhanTieuDeCard extends StatelessWidget {
  final String bieu;
  final String van;
  const NhanTieuDeCard({super.key, required this.bieu, required this.van});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return Row(children: [
      Text(bieu, style: const TextStyle(fontSize: 15)),
      const SizedBox(width: 8),
      Text(van, style: TextStyle(
        fontSize: 12, fontWeight: FontWeight.w700,
        color: ChuDe.mauTruc(toi), letterSpacing: 0.5,
        textBaseline: TextBaseline.alphabetic,
      )),
    ]);
  }
}

// ─── Hộp thông tin ────────────────────────────────────────────────────────────
class HopThongTin extends StatelessWidget {
  final String van;
  const HopThongTin({super.key, required this.van});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: ChuDe.mauTruc2(toi).withOpacity(0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: ChuDe.mauTruc2(toi).withOpacity(0.2)),
      ),
      child: Row(children: [
        Text('ℹ️', style: const TextStyle(fontSize: 14)),
        const SizedBox(width: 8),
        Expanded(child: Text(van, style: TextStyle(fontSize: 12, color: ChuDe.mauTruc2(toi)))),
      ]),
    );
  }
}

// ─── Hàng breakdown list ─────────────────────────────────────────────────────
class HangPhanTich extends StatelessWidget {
  final String nhan;
  final String giaTri;
  final bool laTong;
  const HangPhanTich({super.key, required this.nhan, required this.giaTri, this.laTong = false});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 7),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: ChuDe.mauVienTheo(toi))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(nhan, style: TextStyle(
            fontSize: laTong ? 13 : 12,
            color: laTong ? ChuDe.mauCamTheo(toi) : ChuDe.mauNhatTheo(toi),
            fontWeight: laTong ? FontWeight.w700 : FontWeight.normal,
          )),
          Text(giaTri, style: TextStyle(
            fontSize: laTong ? 13 : 12,
            color: laTong ? ChuDe.mauCamTheo(toi) : ChuDe.mauChuTheo(toi),
            fontWeight: FontWeight.w600,
          )),
        ],
      ),
    );
  }
}

// ─── Divider ─────────────────────────────────────────────────────────────────
class DuongKe extends StatelessWidget {
  const DuongKe({super.key});
  @override
  Widget build(BuildContext context) {
    return Divider(height: 28, thickness: 1, color: ChuDe.mauVienTheo(Theme.of(context).brightness == Brightness.dark));
  }
}

// ─── Nút chính (gradient) ─────────────────────────────────────────────────────
class NutChinh extends StatelessWidget {
  final String nhan;
  final VoidCallback? onNhan;
  final double chieuRong;
  const NutChinh({super.key, required this.nhan, this.onNhan, this.chieuRong = double.infinity});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onNhan,
      child: Container(
        width: chieuRong,
        height: 42,
        decoration: BoxDecoration(
          gradient: onNhan == null
              ? null
              : ChuDe.gradient(toi),
          color: onNhan == null ? ChuDe.mauVienTheo(toi) : null,
          borderRadius: BorderRadius.circular(10),
          boxShadow: onNhan == null ? [] : [
            BoxShadow(color: ChuDe.mauTruc(toi).withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 3))
          ],
        ),
        alignment: Alignment.center,
        child: Text(nhan, style: TextStyle(
          fontSize: 14, fontWeight: FontWeight.w600,
          color: onNhan == null ? ChuDe.mauNhatTheo(toi) : Colors.white,
        )),
      ),
    );
  }
}

// ─── Nút nhỏ ─────────────────────────────────────────────────────────────────
class NutNho extends StatelessWidget {
  final String nhan;
  final VoidCallback? onNhan;
  final Color? mauBien;
  final Color? mauChu;
  const NutNho({super.key, required this.nhan, this.onNhan, this.mauBien, this.mauChu});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final mauV = mauBien ?? ChuDe.mauVienTheo(toi);
    final mauC = mauChu ?? ChuDe.mauNhatTheo(toi);
    return OutlinedButton(
      onPressed: onNhan,
      style: OutlinedButton.styleFrom(
        foregroundColor: mauC,
        side: BorderSide(color: mauV),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      ),
      child: Text(nhan),
    );
  }
}

// ─── Ô nhập liệu với nhãn ─────────────────────────────────────────────────────
class NhomONhap extends StatelessWidget {
  final String nhan;
  final Widget child;
  const NhomONhap({super.key, required this.nhan, required this.child});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(nhan.toUpperCase(), style: TextStyle(
          fontSize: 10, fontWeight: FontWeight.w600,
          color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.4,
        )),
        const SizedBox(height: 4),
        child,
      ],
    );
  }
}

// ─── Ô nhập số (format VN) ────────────────────────────────────────────────────
class ONhapSo extends StatefulWidget {
  final double giaTri;
  final ValueChanged<double> khi;
  final String? giaChoPha;
  final bool soThapPhan;
  final bool disabled;
  const ONhapSo({super.key, required this.giaTri, required this.khi, this.giaChoPha, this.soThapPhan = false, this.disabled = false});

  @override
  State<ONhapSo> createState() => _ONhapSoState();
}

class _ONhapSoState extends State<ONhapSo> {
  late TextEditingController _ctrl;
  bool _focus = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: _hienThi(widget.giaTri));
  }

  @override
  void didUpdateWidget(ONhapSo old) {
    super.didUpdateWidget(old);
    if (!_focus && old.giaTri != widget.giaTri) {
      _ctrl.text = _hienThi(widget.giaTri);
    }
  }

  String _hienThi(double v) {
    if (v == 0) return '';
    if (widget.soThapPhan) return v.toString();
    return NumberFormat('#,###', 'vi_VN').format(v.round());
  }

  double _phanTich(String s) {
    final clean = s.replaceAll(',', '').replaceAll('.', '');
    return double.tryParse(clean) ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (f) {
        setState(() => _focus = f);
        if (!f) _ctrl.text = _hienThi(widget.giaTri);
      },
      child: TextField(
        controller: _ctrl,
        enabled: !widget.disabled,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(hintText: widget.giaChoPha),
        style: const TextStyle(fontSize: 13),
        onChanged: (s) {
          final v = _phanTich(s);
          widget.khi(v);
        },
      ),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }
}

// ─── Ô nhập thập phân ─────────────────────────────────────────────────────────
class ONhapThapPhan extends StatefulWidget {
  final double giaTri;
  final ValueChanged<double> khi;
  final String? giaChoPha;
  final bool disabled;
  const ONhapThapPhan({super.key, required this.giaTri, required this.khi, this.giaChoPha, this.disabled = false});

  @override
  State<ONhapThapPhan> createState() => _ONhapThapPhanState();
}

class _ONhapThapPhanState extends State<ONhapThapPhan> {
  late TextEditingController _ctrl;
  bool _focus = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.giaTri == 0 ? '' : widget.giaTri.toString());
  }

  @override
  void didUpdateWidget(ONhapThapPhan old) {
    super.didUpdateWidget(old);
    if (!_focus && old.giaTri != widget.giaTri) {
      _ctrl.text = widget.giaTri == 0 ? '' : widget.giaTri.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (f) {
        setState(() => _focus = f);
        if (!f && widget.giaTri == 0) _ctrl.text = '';
      },
      child: TextField(
        controller: _ctrl,
        enabled: !widget.disabled,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(hintText: widget.giaChoPha),
        style: const TextStyle(fontSize: 13),
        onChanged: (s) {
          final norm = s.replaceAll(',', '.');
          widget.khi(double.tryParse(norm) ?? 0);
        },
      ),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }
}

// ─── Dropdown chọn vật liệu ──────────────────────────────────────────────────
class ChonLuaTheoNhom extends StatelessWidget {
  final List<DropdownMenuItem<String>> items;
  final String? giaTri;
  final ValueChanged<String?> khi;
  final bool disabled;
  const ChonLuaTheoNhom({super.key, required this.items, this.giaTri, required this.khi, this.disabled = false});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: disabled ? ChuDe.mauVienTheo(toi).withOpacity(0.3) : ChuDe.mauInputTheo(toi),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: DropdownButton<String>(
        value: giaTri,
        isExpanded: true,
        underline: const SizedBox(),
        style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi), fontFamily: 'Inter'),
        hint: Text('— Chọn —', style: TextStyle(color: ChuDe.mauNhatTheo(toi), fontSize: 13)),
        onChanged: disabled ? null : khi,
        items: items,
        dropdownColor: ChuDe.mauMatTheo(toi),
      ),
    );
  }
}

// ─── Toggle switch theme ──────────────────────────────────────────────────────
class ToggleGiaoDien extends StatelessWidget {
  final bool laToi;
  final VoidCallback onNhan;
  const ToggleGiaoDien({super.key, required this.laToi, required this.onNhan});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onNhan,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 280),
        width: 40, height: 22,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: laToi ? ChuDe.mauTrucToi : ChuDe.mauMoSang,
        ),
        child: Stack(children: [
          AnimatedPositioned(
            duration: const Duration(milliseconds: 280),
            left: laToi ? 20 : 2, top: 2,
            child: Container(
              width: 18, height: 18,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: Center(child: Text(laToi ? '🌙' : '☀️', style: const TextStyle(fontSize: 9))),
            ),
          ),
        ]),
      ),
    );
  }
}
