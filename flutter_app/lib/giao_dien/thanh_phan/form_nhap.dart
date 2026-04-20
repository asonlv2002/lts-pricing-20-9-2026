// giao_dien/thanh_phan/form_nhap.dart — Form nhập liệu (theo InputCard.tsx)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../../mo_hinh/du_lieu_mac_dinh.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

class FormNhap extends StatelessWidget {
  const FormNhap({super.key});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final dv = kho.dauVao;
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final hienCauTruc =
        (dv.loaiSanPham == 'tui' && dv.loaiTui.isNotEmpty) ||
        (dv.loaiSanPham == 'mang' && dv.loaiMang.isNotEmpty);

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Auto-calc badge ─────────────────────────────────────────────
            Row(children: [
              _DotNhay(),
              const SizedBox(width: 6),
              Text('Tự động tính khi thay đổi',
                  style: TextStyle(fontSize: 11, color: ChuDe.mauXanhTheo(toi))),
            ]),
            const SizedBox(height: 12),

            // ── Section 1: Thông tin đơn hàng ──────────────────────────────
            _TieuDeSection(bieu: '📝', van: 'Thông tin đơn hàng', toi: toi),
            const SizedBox(height: 10),

            // Khách hàng + Tên hàng — 2 cột
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: NhomONhap(
                nhan: 'KHÁCH HÀNG',
                child: _OVanBan(
                  giaTri: dv.tenKhachHang,
                  hint: 'Tên khách hàng',
                  khi: (v) => kho.capNhatDauVao(dv.copyWith(tenKhachHang: v)),
                ),
              )),
              const SizedBox(width: 8),
              Expanded(child: NhomONhap(
                nhan: 'TÊN HÀNG',
                child: _OVanBan(
                  giaTri: dv.tenSanPham,
                  hint: 'Tên sản phẩm',
                  khi: (v) => kho.capNhatDauVao(dv.copyWith(tenSanPham: v)),
                ),
              )),
            ]),
            const SizedBox(height: 10),

            // Loại SP + Loại túi/màng — 2 cột
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: NhomONhap(
                nhan: 'LOẠI SP',
                child: _DropdownSimple(
                  giaTri: dv.loaiSanPham.isEmpty ? null : dv.loaiSanPham,
                  items: const [
                    DropdownMenuItem(value: 'tui', child: Text('Túi')),
                    DropdownMenuItem(value: 'mang', child: Text('Màng')),
                  ],
                  khi: (v) => kho.capNhatDauVao(dv.copyWith(
                    loaiSanPham: v ?? '', loaiTui: '', loaiMang: '',
                  )),
                  toi: toi,
                ),
              )),
              const SizedBox(width: 8),
              Expanded(child: NhomONhap(
                nhan: dv.loaiSanPham == 'mang' ? 'LOẠI MÀNG' : 'LOẠI TÚI',
                child: _DropdownSimple(
                  giaTri: dv.loaiSanPham == 'tui'
                      ? (dv.loaiTui.isEmpty ? null : dv.loaiTui)
                      : (dv.loaiMang.isEmpty ? null : dv.loaiMang),
                  items: dv.loaiSanPham == 'tui'
                      ? const [
                          DropdownMenuItem(value: '3bien', child: Text('3 biên')),
                          DropdownMenuItem(value: '4bien', child: Text('4 biên')),
                          DropdownMenuItem(value: 'xephong_lech', child: Text('Xếp hông dán lưng lệch')),
                          DropdownMenuItem(value: 'xephong_giua', child: Text('Xếp hông dán lưng giữa')),
                          DropdownMenuItem(value: 'dayDung', child: Text('Đáy đứng')),
                          DropdownMenuItem(value: 'cutSeal', child: Text('Cut seal')),
                        ]
                      : const [
                          DropdownMenuItem(value: 'mangIn', child: Text('Màng in')),
                          DropdownMenuItem(value: 'mangGhep', child: Text('Màng ghép')),
                          DropdownMenuItem(value: 'mangDongGoi', child: Text('Màng đóng gói tự động')),
                        ],
                  khi: dv.loaiSanPham == 'tui'
                      ? (v) => kho.capNhatDauVao(dv.copyWith(loaiTui: v ?? ''))
                      : (v) => kho.capNhatDauVao(dv.copyWith(loaiMang: v ?? '')),
                  toi: toi,
                ),
              )),
            ]),
            const SizedBox(height: 10),

            // Số lượng / Diện tích
            NhomONhap(
              nhan: dv.loaiSanPham == 'mang' ? 'DIỆN TÍCH (m²)' : 'SỐ LƯỢNG',
              child: ONhapSo(
                giaTri: dv.soLuong,
                khi: (v) => kho.capNhatDauVao(dv.copyWith(soLuong: v)),
                giaChoPha: dv.loaiSanPham == 'mang' ? 'VD: 10000' : 'VD: 50000',
              ),
            ),

            if (dv.loaiSanPham == 'mang') ...[
              const SizedBox(height: 10),
              NhomONhap(
                nhan: 'CHIỀU DÀI CUỘN MÀNG TP (m)',
                child: ONhapSo(
                  giaTri: dv.chieuDaiCuonMang,
                  khi: (v) => kho.capNhatDauVao(dv.copyWith(chieuDaiCuonMang: v)),
                  giaChoPha: '6000',
                ),
              ),
            ],

            const DuongKe(),

            // ── Section 2: Cấu trúc ─────────────────────────────────────────
            if (hienCauTruc) ...[
              _TieuDeSection(bieu: '🏗️', van: 'Cấu trúc', toi: toi),
              const SizedBox(height: 10),

              // Khổ trải / Bước cắt / Số con hình — 3 cột
              Row(children: [
                Expanded(child: NhomONhap(
                  nhan: 'KHỔ TRẢI (m)',
                  child: ONhapThapPhan(
                    giaTri: dv.khoTrai,
                    khi: (v) => kho.capNhatDauVao(dv.copyWith(khoTrai: v)),
                    giaChoPha: '0.320',
                  ),
                )),
                const SizedBox(width: 6),
                Expanded(child: NhomONhap(
                  nhan: 'BƯỚC CẮT (m)',
                  child: ONhapThapPhan(
                    giaTri: dv.buocCat,
                    khi: (v) => kho.capNhatDauVao(dv.copyWith(buocCat: v)),
                    giaChoPha: '0.200',
                  ),
                )),
                const SizedBox(width: 6),
                Expanded(child: NhomONhap(
                  nhan: 'SỐ CON HÌNH',
                  child: ONhapThapPhan(
                    giaTri: dv.soConHinh.toDouble(),
                    khi: (v) => kho.capNhatDauVao(dv.copyWith(soConHinh: v.toInt().clamp(1, 20))),
                    giaChoPha: '1',
                  ),
                )),
              ]),
              const SizedBox(height: 10),

              NhomONhap(
                nhan: 'SỐ MÀU IN',
                child: _DropdownSimple(
                  giaTri: dv.soMauIn?.toString(),
                  items: [
                    const DropdownMenuItem(value: '0', child: Text('Không in')),
                    ...List.generate(8, (i) => DropdownMenuItem(
                      value: '${i + 1}', child: Text('${i + 1} màu'),
                    )),
                  ],
                  khi: (v) => kho.capNhatDauVao(dv.copyWith(soMauIn: v != null ? int.tryParse(v) : null)),
                  toi: toi,
                ),
              ),
              const SizedBox(height: 12),

              // Structure preview
              _CauTrucPreview(dv: dv, dsVL: kho.dsVatLieu, toi: toi),
              const SizedBox(height: 10),

              // 5 lớp vật liệu (với group + mic override)
              _ChonNguyenLieu(kho: kho, dv: dv, toi: toi),

              // ── Nâng cao (bên trong section cấu trúc như Next.js) ─────────
              const SizedBox(height: 4),
              InkWell(
                onTap: () => kho.doiNangCao(!kho.nangCaoMo),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(children: [
                    const Text('⚙️', style: TextStyle(fontSize: 14)),
                    const SizedBox(width: 6),
                    Text('Tùy chỉnh nâng cao', style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600,
                      color: ChuDe.mauNhatTheo(toi),
                    )),
                    const Spacer(),
                    AnimatedRotation(
                      turns: kho.nangCaoMo ? 0 : 0.5,
                      duration: const Duration(milliseconds: 250),
                      child: Icon(Icons.expand_less, size: 16, color: ChuDe.mauNhatTheo(toi)),
                    ),
                  ]),
                ),
              ),
              AnimatedCrossFade(
                firstChild: const SizedBox.shrink(),
                secondChild: _SectionNangCao(kho: kho, dv: dv, toi: toi),
                crossFadeState: kho.nangCaoMo ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                duration: const Duration(milliseconds: 300),
              ),

              const DuongKe(),
            ],

            // ── Buttons ─────────────────────────────────────────────────────
            NutChinh(
              nhan: '⚡ Tính Giá',
              onNhan: _coTheTinh(dv) ? () => kho.luuVaoLichSu() : null,
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: NutNho(
                nhan: '🔄 Reset',
                onNhan: () => kho.resetForm(),
              )),
              const SizedBox(width: 8),
              Expanded(child: NutNho(
                nhan: '📋 Copy',
                onNhan: kho.ketQua != null ? () => _copyKetQua(context, kho) : null,
              )),
            ]),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  bool _coTheTinh(DauVaoTinhGia dv) =>
      dv.loaiSanPham.isNotEmpty &&
      (dv.loaiSanPham != 'tui' || dv.loaiTui.isNotEmpty) &&
      (dv.loaiSanPham != 'mang' || dv.loaiMang.isNotEmpty) &&
      dv.soLuong > 0 &&
      dv.khoTrai > 0 &&
      dv.buocCat > 0 &&
      dv.soMauIn != null &&
      dv.maLop1 != null;

  void _copyKetQua(BuildContext context, KhoChinhLuuTru kho) {
    final kq = kho.ketQua;
    if (kq == null) return;
    final text = '${kq.chuoiCauTruc} | SL: ${dinhDangSo(kq.dauVao.soLuong)} | '
        'Giá: ${dinhDangTien(kq.giaBanCuoi)}';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Đã sao chép: $text'), duration: const Duration(seconds: 2)),
    );
  }
}

// ─── Dot nhấp nháy ───────────────────────────────────────────────────────────
class _DotNhay extends StatefulWidget {
  @override
  State<_DotNhay> createState() => _DotNhayState();
}
class _DotNhayState extends State<_DotNhay> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;
  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.3, end: 1.0).animate(_ctrl);
  }
  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Container(width: 7, height: 7, decoration: const BoxDecoration(color: ChuDe.mauXanh, shape: BoxShape.circle)),
    );
  }
  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }
}

// ─── Tiêu đề section ─────────────────────────────────────────────────────────
class _TieuDeSection extends StatelessWidget {
  final String bieu;
  final String van;
  final bool toi;
  const _TieuDeSection({required this.bieu, required this.van, required this.toi});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Text(bieu, style: const TextStyle(fontSize: 14)),
      const SizedBox(width: 6),
      Text(van, style: TextStyle(
        fontSize: 12, fontWeight: FontWeight.w700,
        color: ChuDe.mauTruc(toi), letterSpacing: 0.3,
      )),
    ]);
  }
}

class _TieuDeNho extends StatelessWidget {
  final String van;
  final bool toi;
  const _TieuDeNho({required this.van, required this.toi});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 6),
      child: Text(van, style: TextStyle(
        fontSize: 11, fontWeight: FontWeight.w700,
        color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.3,
      )),
    );
  }
}

// ─── TextField văn bản ───────────────────────────────────────────────────────
class _OVanBan extends StatefulWidget {
  final String giaTri;
  final String hint;
  final ValueChanged<String> khi;
  const _OVanBan({required this.giaTri, required this.hint, required this.khi});
  @override
  State<_OVanBan> createState() => _OVanBanState();
}
class _OVanBanState extends State<_OVanBan> {
  late TextEditingController _ctrl;
  @override
  void initState() { super.initState(); _ctrl = TextEditingController(text: widget.giaTri); }
  @override
  void didUpdateWidget(_OVanBan old) {
    super.didUpdateWidget(old);
    if (old.giaTri != widget.giaTri && _ctrl.text != widget.giaTri) _ctrl.text = widget.giaTri;
  }
  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      decoration: InputDecoration(hintText: widget.hint),
      style: const TextStyle(fontSize: 13),
      onChanged: widget.khi,
    );
  }
  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }
}

// ─── Dropdown đơn giản ───────────────────────────────────────────────────────
class _DropdownSimple extends StatelessWidget {
  final String? giaTri;
  final List<DropdownMenuItem<String>> items;
  final ValueChanged<String?> khi;
  final bool toi;
  const _DropdownSimple({required this.giaTri, required this.items, required this.khi, required this.toi});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: ChuDe.mauInputTheo(toi),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: DropdownButton<String>(
        value: giaTri,
        isExpanded: true,
        underline: const SizedBox(),
        style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi), fontFamily: 'Inter'),
        hint: Text('— Chọn —', style: TextStyle(color: ChuDe.mauNhatTheo(toi), fontSize: 13)),
        onChanged: khi,
        items: items,
        dropdownColor: ChuDe.mauMatTheo(toi),
      ),
    );
  }
}

// ─── Structure Preview ───────────────────────────────────────────────────────
class _CauTrucPreview extends StatelessWidget {
  final DauVaoTinhGia dv;
  final List<VatLieu> dsVL;
  final bool toi;
  const _CauTrucPreview({required this.dv, required this.dsVL, required this.toi});

  @override
  Widget build(BuildContext context) {
    final maLops = [dv.maLop1, dv.maLop2, dv.maLop3, dv.maLop4, dv.maLop5]
        .whereType<String>().toList();

    if (maLops.isEmpty) {
      return Container(
        height: 42, margin: const EdgeInsets.only(bottom: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [const Color(0xFF94A3B8).withAlpha(50), const Color(0xFFCBD5E1).withAlpha(50)]),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text('—', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: ChuDe.mauNhatTheo(toi))),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: Row(
        children: maLops.map((ma) {
          VatLieu? vl;
          try { vl = dsVL.firstWhere((v) => v.maVL == ma); } catch (_) {}
          final mic = dv.dieuChinhMic[ma] ?? vl?.doDay ?? 0;
          return Expanded(
            child: Container(
              margin: const EdgeInsets.only(right: 4),
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
              decoration: BoxDecoration(
                color: ChuDe.mauMat2Theo(toi),
                border: Border.all(color: ChuDe.mauVienTheo(toi)),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(
                  vl?.tenVL.split(' ').first ?? ma,
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11, color: ChuDe.mauChuTheo(toi)),
                  textAlign: TextAlign.center,
                ),
                Text('${mic.toStringAsFixed(0)}mic',
                    style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
              ]),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── Chọn nguyên liệu 5 lớp (với nhóm + mic override) ───────────────────────
class _ChonNguyenLieu extends StatefulWidget {
  final KhoChinhLuuTru kho;
  final DauVaoTinhGia dv;
  final bool toi;
  const _ChonNguyenLieu({required this.kho, required this.dv, required this.toi});
  @override
  State<_ChonNguyenLieu> createState() => _ChonNguyenLieuState();
}

class _ChonNguyenLieuState extends State<_ChonNguyenLieu> {
  // Track nhóm đang chọn cho mỗi lớp: key = 'lop1'..'lop5'
  final Map<String, String> _nhomDangChon = {};

  static const List<String> _layer1OnlyGroups = ['BOPP', 'Matt OPP'];
  static const List<String> _lopKeys = ['lop1', 'lop2', 'lop3', 'lop4', 'lop5'];

  String? _maLop(int i) {
    final dv = widget.dv;
    switch (i) {
      case 0: return dv.maLop1; case 1: return dv.maLop2;
      case 2: return dv.maLop3; case 3: return dv.maLop4;
      case 4: return dv.maLop5; default: return null;
    }
  }

  DauVaoTinhGia _datLop(DauVaoTinhGia dv, int i, String? v) {
    switch (i) {
      case 0: return dv.copyWith(maLop1: v, maLop2: null, maLop3: null, maLop4: null, maLop5: null);
      case 1: return dv.copyWith(maLop2: v, maLop3: null, maLop4: null, maLop5: null);
      case 2: return dv.copyWith(maLop3: v, maLop4: null, maLop5: null);
      case 3: return dv.copyWith(maLop4: v, maLop5: null);
      case 4: return dv.copyWith(maLop5: v);
      default: return dv;
    }
  }

  // Build danh sách items cho dropdown cấp 1 (nhóm + vật liệu không nhóm)
  List<DropdownMenuItem<String>> _buildMainItems(int soLop) {
    final items = <DropdownMenuItem<String>>[];
    final dsTatCa = widget.kho.dsVatLieu;

    // Vật liệu không nhóm
    for (final vl in dsTatCa.where((v) => v.nhomVL == null || v.nhomVL!.isEmpty)) {
      if (soLop > 1 && _layer1OnlyGroups.contains(vl.nhomVL)) continue;
      items.add(DropdownMenuItem(value: vl.maVL, child: Text(vl.tenVL)));
    }

    // Nhóm
    final nhoms = dsTatCa
        .where((v) => v.nhomVL != null && v.nhomVL!.isNotEmpty)
        .map((v) => v.nhomVL!)
        .toSet().toList();

    for (final nhom in nhoms) {
      if (soLop > 1 && _layer1OnlyGroups.contains(nhom)) continue;
      items.add(DropdownMenuItem(
        value: 'GROUP_$nhom',
        child: Text(nhom, style: const TextStyle(fontWeight: FontWeight.w600)),
      ));
    }

    return items;
  }

  @override
  Widget build(BuildContext context) {
    final dv = widget.dv;
    final kho = widget.kho;
    final toi = widget.toi;

    return Column(
      children: List.generate(5, (i) {
        final soLop = i + 1;
        final disabled = i > 0 && _maLop(i - 1) == null;
        final maHienTai = _maLop(i);
        final lopKey = _lopKeys[i];

        // Xác định nhóm và vật liệu đang chọn
        VatLieu? vlHienTai;
        try { if (maHienTai != null) vlHienTai = kho.dsVatLieu.firstWhere((v) => v.maVL == maHienTai); } catch (_) {}

        final nhomHienTai = _nhomDangChon[lopKey] ??
            (vlHienTai?.nhomVL != null && vlHienTai!.nhomVL!.isNotEmpty ? 'GROUP_${vlHienTai.nhomVL}' : '');
        final mainVal = nhomHienTai.isNotEmpty ? nhomHienTai : (maHienTai ?? '');

        // Items cho dropdown cấp 2 (chọn độ dày trong nhóm)
        List<DropdownMenuItem<String>> capHaiItems = [];
        if (nhomHienTai.startsWith('GROUP_')) {
          final tenNhom = nhomHienTai.replaceFirst('GROUP_', '');
          capHaiItems = kho.dsVatLieu
              .where((v) => v.nhomVL == tenNhom)
              .map((v) => DropdownMenuItem(value: v.maVL, child: Text('${v.doDay.toStringAsFixed(0)}mic — ${v.tenVL}')))
              .toList();
        }

        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Label + xóa
              Row(children: [
                Text('LỚP $soLop', style: TextStyle(
                  fontSize: 10, fontWeight: FontWeight.w600,
                  color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.4,
                )),
                const Spacer(),
                if (maHienTai != null)
                  GestureDetector(
                    onTap: () {
                      setState(() => _nhomDangChon.remove(lopKey));
                      kho.capNhatDauVao(_datLop(dv, i, null));
                    },
                    child: Icon(Icons.close, size: 14, color: ChuDe.mauNhatTheo(toi)),
                  ),
              ]),
              const SizedBox(height: 4),

              // Dropdown cấp 1: nhóm hoặc vật liệu đơn
              _DropdownRaw<String>(
                giaTri: mainVal.isEmpty ? null : mainVal,
                items: _buildMainItems(soLop),
                disabled: disabled,
                hint: disabled ? '— Không —' : '— Chọn —',
                toi: toi,
                khi: (v) {
                  if (v == null) {
                    setState(() => _nhomDangChon.remove(lopKey));
                    kho.capNhatDauVao(_datLop(dv, i, null));
                  } else if (v.startsWith('GROUP_')) {
                    setState(() { _nhomDangChon[lopKey] = v; });
                    kho.capNhatDauVao(_datLop(dv, i, null));
                  } else {
                    setState(() => _nhomDangChon.remove(lopKey));
                    kho.capNhatDauVao(_datLop(dv, i, v));
                  }
                },
              ),

              // Dropdown cấp 2: chọn độ dày trong nhóm
              if (nhomHienTai.startsWith('GROUP_') && capHaiItems.isNotEmpty) ...[
                Container(
                  margin: const EdgeInsets.only(top: 6, left: 8),
                  padding: const EdgeInsets.only(left: 8),
                  decoration: BoxDecoration(
                    border: Border(left: BorderSide(color: ChuDe.mauVienTheo(toi), width: 2)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('ĐỘ DÀY (mic)', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi))),
                    const SizedBox(height: 4),
                    _DropdownRaw<String>(
                      giaTri: maHienTai,
                      items: capHaiItems,
                      hint: '— Chọn Độ Dày —',
                      toi: toi,
                      khi: (v) => kho.capNhatDauVao(_datLop(dv, i, v)),
                    ),
                  ]),
                ),
              ],

              // Mic override (vật liệu adjustableMic)
              if (vlHienTai != null && vlHienTai.coTheDieuChinhMic) ...[
                Container(
                  margin: const EdgeInsets.only(top: 6, left: 8),
                  padding: const EdgeInsets.only(left: 8),
                  decoration: BoxDecoration(
                    border: Border(left: BorderSide(color: ChuDe.mauVienTheo(toi), width: 2)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('ĐỘ DÀY TUỲ CHỈNH (mic)', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi))),
                    const SizedBox(height: 4),
                    ONhapThapPhan(
                      giaTri: dv.dieuChinhMic[maHienTai!] ?? vlHienTai.doDay,
                      khi: (v) {
                        final newMic = Map<String, double>.from(dv.dieuChinhMic)..[maHienTai] = v;
                        kho.capNhatDauVao(dv.copyWith(dieuChinhMic: newMic));
                      },
                    ),
                  ]),
                ),
              ],
            ],
          ),
        );
      }),
    );
  }
}

// ─── Dropdown raw (không dùng Container wrapper) ─────────────────────────────
class _DropdownRaw<T> extends StatelessWidget {
  final T? giaTri;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> khi;
  final bool toi;
  final bool disabled;
  final String hint;
  const _DropdownRaw({
    required this.giaTri, required this.items, required this.khi, required this.toi,
    this.disabled = false, this.hint = '— Chọn —',
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: disabled ? ChuDe.mauVienTheo(toi).withAlpha(60) : ChuDe.mauInputTheo(toi),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: DropdownButton<T>(
        value: giaTri,
        isExpanded: true,
        underline: const SizedBox(),
        style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi), fontFamily: 'Inter'),
        hint: Text(hint, style: TextStyle(color: ChuDe.mauNhatTheo(toi), fontSize: 13)),
        onChanged: disabled ? null : khi,
        items: items,
        dropdownColor: ChuDe.mauMatTheo(toi),
      ),
    );
  }
}

// ─── Section nâng cao ────────────────────────────────────────────────────────
class _SectionNangCao extends StatelessWidget {
  final KhoChinhLuuTru kho;
  final DauVaoTinhGia dv;
  final bool toi;
  const _SectionNangCao({required this.kho, required this.dv, required this.toi});

  @override
  Widget build(BuildContext context) {
    final laTui = dv.loaiSanPham == 'tui';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),

        // Phủ mực
        Row(children: [
          Expanded(child: NhomONhap(
            nhan: 'PHỦ MỰC (%)',
            child: ONhapThapPhan(
              giaTri: dv.tyLePhuMuc >= 1 ? 0 : (dv.tyLePhuMuc * 100).roundToDouble(),
              khi: (v) => kho.capNhatDauVao(dv.copyWith(tyLePhuMuc: v == 0 ? 1.0 : (v / 100).clamp(0, 1))),
              giaChoPha: '100',
            ),
          )),
        ]),
        const SizedBox(height: 8),

        // Nhũ + Phủ mờ
        Row(children: [
          _CheckItem(nhan: 'Nhũ', giaTri: dv.coNhu, khi: (v) => kho.capNhatDauVao(dv.copyWith(coNhu: v))),
          const SizedBox(width: 16),
          _CheckItem(nhan: 'Phủ mờ', giaTri: dv.coMo, khi: (v) => kho.capNhatDauVao(dv.copyWith(coMo: v))),
        ]),

        // Phụ kiện túi
        if (laTui) ...[
          _TieuDeNho(van: '🎀 Phụ kiện', toi: toi),
          Row(children: [
            _CheckItem(nhan: 'Zipper (${DuLieuMacDinh.giaZipper.toStringAsFixed(0)}đ/m)', giaTri: dv.coZipper, khi: (v) => kho.capNhatDauVao(dv.copyWith(coZipper: v))),
            const SizedBox(width: 12),
            _CheckItem(nhan: 'Băng keo', giaTri: dv.coBangKeo, khi: (v) => kho.capNhatDauVao(dv.copyWith(coBangKeo: v))),
            const SizedBox(width: 12),
            _CheckItem(nhan: 'Quai', giaTri: dv.coQuai, khi: (v) => kho.capNhatDauVao(dv.copyWith(coQuai: v))),
          ]),
        ],

        // Trục in
        _TieuDeNho(van: '🖨️ Trục in', toi: toi),
        Row(children: [
          Expanded(child: NhomONhap(
            nhan: 'DÀI (m)',
            child: ONhapThapPhan(giaTri: dv.chieuDaiTruc, khi: (_) {}, disabled: true, giaChoPha: '—'),
          )),
          const SizedBox(width: 6),
          Expanded(child: NhomONhap(
            nhan: 'CHU VI (m)',
            child: ONhapThapPhan(giaTri: dv.chuViTruc, khi: (_) {}, disabled: true, giaChoPha: '—'),
          )),
          const SizedBox(width: 6),
          Expanded(child: NhomONhap(
            nhan: 'ĐƠN GIÁ (đ/m²)',
            child: ONhapSo(
              giaTri: dv.donGiaTruc,
              khi: (v) => kho.capNhatDauVao(dv.copyWith(donGiaTruc: v)),
              giaChoPha: '7.300.000',
            ),
          )),
        ]),
        // Cylinder warnings
        if (dv.chieuDaiTruc > 0 && dv.chieuDaiTruc < 0.7)
          _CanhBao(van: '⚠️ Dài trục dưới tối thiểu (0.7m)', toi: toi),
        if (dv.chieuDaiTruc > 1.25)
          _CanhBao(van: '⚠️ Dài trục vượt tối đa (1.25m) — không in được', toi: toi),
        if (dv.chuViTruc > 0 && dv.chuViTruc < 0.4)
          _CanhBao(van: '⚠️ Chu vi trục dưới tối thiểu (0.4m)', toi: toi),
        if (dv.chuViTruc > 0.9)
          _CanhBao(van: '⚠️ Chu vi trục vượt tối đa (0.9m)', toi: toi),

        // Cylinder preview
        const SizedBox(height: 4),
        _CylPreview(dv: dv, toi: toi),
        const SizedBox(height: 10),

        // Đóng gói & Vận chuyển
        _TieuDeNho(van: '📦 Đóng gói & Vận chuyển', toi: toi),
        if (dv.loaiSanPham == 'mang') ...[
          NhomONhap(
            nhan: 'ĐÓNG GÓI (đ/cuộn)',
            child: ONhapSo(giaTri: dv.giaDongGoi, khi: (v) => kho.capNhatDauVao(dv.copyWith(giaDongGoi: v))),
          ),
        ] else ...[
          Row(children: [
            Expanded(child: NhomONhap(
              nhan: 'TÚI/THÙNG',
              child: ONhapSo(giaTri: dv.soTuiTrungThung, khi: (v) => kho.capNhatDauVao(dv.copyWith(soTuiTrungThung: v))),
            )),
            const SizedBox(width: 6),
            Expanded(child: NhomONhap(
              nhan: 'GIÁ THÙNG (đ)',
              child: ONhapSo(giaTri: dv.giaDongGoi, khi: (v) => kho.capNhatDauVao(dv.copyWith(giaDongGoi: v))),
            )),
          ]),
        ],
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: NhomONhap(
            nhan: 'VẬN CHUYỂN (đ/km)',
            child: ONhapSo(giaTri: dv.giaVanChuyen, khi: (v) => kho.capNhatDauVao(dv.copyWith(giaVanChuyen: v))),
          )),
          const SizedBox(width: 6),
          Expanded(child: NhomONhap(
            nhan: 'KM',
            child: ONhapThapPhan(giaTri: dv.soKmVanChuyen, khi: (v) => kho.capNhatDauVao(dv.copyWith(soKmVanChuyen: v))),
          )),
        ]),

        // Thanh toán
        _TieuDeNho(van: '⏳ Thanh toán', toi: toi),
        ...[
          (ngay: 14, laiMacDinh: 0.10),
          (ngay: 30, laiMacDinh: 0.25),
          (ngay: 90, laiMacDinh: 0.75),
        ].map((term) {
          final active = dv.soNgayThanhToan == term.ngay;
          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(children: [
              Radio<int>(
                value: term.ngay,
                groupValue: dv.soNgayThanhToan,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                onChanged: (v) => kho.capNhatDauVao(dv.copyWith(
                  soNgayThanhToan: v ?? 30,
                  laiSuatThang: active ? dv.laiSuatThang : (term.laiMacDinh / 100),
                )),
              ),
              Text('${term.ngay} ngày', style: const TextStyle(fontSize: 13)),
              const Spacer(),
              SizedBox(
                width: 70,
                child: ONhapThapPhan(
                  giaTri: active
                      ? double.parse((dv.laiSuatThang * 100).toStringAsFixed(2))
                      : term.laiMacDinh,
                  disabled: !active,
                  khi: (v) => active ? kho.capNhatDauVao(dv.copyWith(laiSuatThang: v / 100)) : null,
                  giaChoPha: '${term.laiMacDinh}',
                ),
              ),
              Text(' %', style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi))),
            ]),
          );
        }),

        // Hoa hồng
        _TieuDeNho(van: '💵 Hoa hồng', toi: toi),
        Row(children: [
          Expanded(child: ONhapSo(
            giaTri: dv.giaTriHoaHongNhap,
            khi: (v) {
              final hh = dv.donViHoaHong == 'percent' ? v / 100 : 0.0;
              kho.capNhatDauVao(dv.copyWith(
                giaTriHoaHongNhap: v,
                tyLeHoaHong: hh,
                hoaHongCoDinhVND: dv.donViHoaHong == 'vnd' ? v : 0,
              ));
            },
            giaChoPha: '0',
          )),
          const SizedBox(width: 8),
          SizedBox(
            width: 90,
            child: _DropdownSimple(
              giaTri: dv.donViHoaHong,
              items: const [
                DropdownMenuItem(value: 'percent', child: Text('%')),
                DropdownMenuItem(value: 'vnd', child: Text('VND')),
              ],
              khi: (v) => kho.capNhatDauVao(dv.copyWith(donViHoaHong: v ?? 'percent')),
              toi: toi,
            ),
          ),
        ]),
        // Commission hint
        _HoaHongHint(kho: kho, dv: dv, toi: toi),
        const SizedBox(height: 12),
      ],
    );
  }
}

// ─── Cylinder preview ────────────────────────────────────────────────────────
class _CylPreview extends StatelessWidget {
  final DauVaoTinhGia dv;
  final bool toi;
  const _CylPreview({required this.dv, required this.toi});
  @override
  Widget build(BuildContext context) {
    final dt = dv.chieuDaiTruc * dv.chuViTruc;
    final motTruc = dt * dv.donGiaTruc;
    final caBo = motTruc * (dv.soMauIn ?? 0);
    return Text(
      'DT: ${dt.toStringAsFixed(4)} m²  ·  1 trục: ${dinhDangTien(motTruc)}  ·  Cả bộ (${dv.soMauIn ?? 0} màu): ${dinhDangTien(caBo)}',
      style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi)),
    );
  }
}

// ─── Commission hint ─────────────────────────────────────────────────────────
class _HoaHongHint extends StatelessWidget {
  final KhoChinhLuuTru kho;
  final DauVaoTinhGia dv;
  final bool toi;
  const _HoaHongHint({required this.kho, required this.dv, required this.toi});
  @override
  Widget build(BuildContext context) {
    final kq = kho.ketQua;
    final val = dv.giaTriHoaHongNhap;
    if (kq == null || val == 0) return const SizedBox(height: 4);
    final donVi = dv.loaiSanPham == 'mang' ? 'm²' : 'túi';
    String hint;
    if (dv.donViHoaHong == 'percent') {
      final vndPerUnit = (val / 100) * kq.tongCPSX;
      hint = '= ${dinhDangSo(vndPerUnit, chiSoThapPhan: 1)} đ/$donVi';
    } else {
      final pct = kq.tongCPSX > 0 ? (val / kq.tongCPSX * 100) : 0;
      hint = '= ${pct.toStringAsFixed(2)}% (trên giá vốn+LN)';
    }
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(hint, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
    );
  }
}

// ─── Cảnh báo ────────────────────────────────────────────────────────────────
class _CanhBao extends StatelessWidget {
  final String van;
  final bool toi;
  const _CanhBao({required this.van, required this.toi});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(van, style: const TextStyle(fontSize: 11, color: ChuDe.mauDo)),
    );
  }
}

// ─── Checkbox item ───────────────────────────────────────────────────────────
class _CheckItem extends StatelessWidget {
  final String nhan;
  final bool giaTri;
  final ValueChanged<bool> khi;
  const _CheckItem({required this.nhan, required this.giaTri, required this.khi});
  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(
        width: 24, height: 24,
        child: Checkbox(
          value: giaTri,
          onChanged: (v) => khi(v ?? false),
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ),
      const SizedBox(width: 4),
      Text(nhan, style: const TextStyle(fontSize: 13)),
    ]);
  }
}
