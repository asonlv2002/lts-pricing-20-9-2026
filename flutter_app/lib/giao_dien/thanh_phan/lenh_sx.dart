// giao_dien/thanh_phan/lenh_sx.dart — Module Lệnh Sản Xuất
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

// ─── Dữ liệu mock ────────────────────────────────────────────────────────────
final _dsMockLSX = <LenhSX>[
  LenhSX(id: 'LSX001', soLSX: 'LSX-2026-001', tenKhach: 'Công ty TNHH Đức Phát', tenSP: 'Túi PA/PE 3 biên', cauTruc: 'PA15/PE50', soLuong: 50000, loaiSP: 'tui', ngayTao: '10/04/2026', trangThai: TrangThaiLSX.hoangThanh),
  LenhSX(id: 'LSX002', soLSX: 'LSX-2026-002', tenKhach: 'Giang Sơn Foods', tenSP: 'Màng OPP/PE ghép', cauTruc: 'OPP20/PE40', soLuong: 2000, loaiSP: 'mang', ngayTao: '12/04/2026', trangThai: TrangThaiLSX.dangSX),
  LenhSX(id: 'LSX003', soLSX: 'LSX-2026-003', tenKhach: 'Hiếu Long Packaging', tenSP: 'Túi PA/AL/PE 4 biên', cauTruc: 'PA15/AL7/PE60', soLuong: 30000, loaiSP: 'tui', ngayTao: '15/04/2026', trangThai: TrangThaiLSX.moiTao),
  LenhSX(id: 'LSX004', soLSX: 'LSX-2026-004', tenKhach: 'Kim Ngân Trading', tenSP: 'Túi đáy đứng zipper', cauTruc: 'PET12/PE80', soLuong: 20000, loaiSP: 'tui', ngayTao: '17/04/2026', trangThai: TrangThaiLSX.dangSX),
  LenhSX(id: 'LSX005', soLSX: 'LSX-2026-005', tenKhach: 'Siêu Thị Nam Bùi', tenSP: 'Màng PET in', cauTruc: 'PET12', soLuong: 5000, loaiSP: 'mang', ngayTao: '18/04/2026', trangThai: TrangThaiLSX.moiTao),
];

String _fmt(double n) => NumberFormat('#,###', 'vi_VN').format(n.round());

// ─── Dropdown trạng thái LSX ─────────────────────────────────────────────────
class _DropdownTrangThaiLSX extends StatefulWidget {
  final LenhSX lenh;
  final ValueChanged<TrangThaiLSX> onDoiTrangThai;
  const _DropdownTrangThaiLSX({required this.lenh, required this.onDoiTrangThai});

  @override
  State<_DropdownTrangThaiLSX> createState() => _DropdownTrangThaiLSXState();
}

class _DropdownTrangThaiLSXState extends State<_DropdownTrangThaiLSX> {
  bool _mo = false;
  final _layerLink = LayerLink();
  OverlayEntry? _overlay;

  void _dongMenu() { _overlay?.remove(); _overlay = null; _mo = false; }

  void _moMenu() {
    final renderBox = context.findRenderObject() as RenderBox;
    final size = renderBox.size;
    final offset = renderBox.localToGlobal(Offset.zero);

    _overlay = OverlayEntry(builder: (_) => Stack(children: [
      Positioned.fill(child: GestureDetector(onTap: _dongMenu, child: Container(color: Colors.transparent))),
      Positioned(
        left: offset.dx,
        top: offset.dy + size.height + 4,
        width: 160,
        child: Material(
          elevation: 8,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF1E1E2E) : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: TrangThaiLSX.values.map((tt) {
                final isActive = tt == widget.lenh.trangThai;
                return InkWell(
                  onTap: () { _dongMenu(); widget.onDoiTrangThai(tt); },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(children: [
                      Container(width: 7, height: 7, decoration: BoxDecoration(color: tt.mau, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Text(tt.nhan, style: TextStyle(fontSize: 12, fontWeight: isActive ? FontWeight.w700 : FontWeight.normal, color: isActive ? tt.mau : null)),
                      if (isActive) ...[const Spacer(), const Icon(Icons.check, size: 13, color: Color(0xFF059669))],
                    ]),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
    ]));
    Overlay.of(context).insert(_overlay!);
    setState(() => _mo = true);
  }

  @override
  void dispose() { _dongMenu(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final tt = widget.lenh.trangThai;
    return CompositedTransformTarget(
      link: _layerLink,
      child: GestureDetector(
        onTap: _mo ? _dongMenu : _moMenu,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: tt.mauNen,
            borderRadius: BorderRadius.circular(99),
            border: Border.all(color: tt.mau.withValues(alpha: 0.4)),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 6, height: 6, decoration: BoxDecoration(color: tt.mau, shape: BoxShape.circle)),
            const SizedBox(width: 5),
            Text(tt.nhan, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: tt.mau)),
            const SizedBox(width: 3),
            Icon(Icons.keyboard_arrow_down, size: 13, color: tt.mau),
          ]),
        ),
      ),
    );
  }
}

// ─── Card LSX (dùng trên mobile) ─────────────────────────────────────────────
class _CardLenhSX extends StatelessWidget {
  final LenhSX lenh;
  final ValueChanged<TrangThaiLSX> onDoiTrangThai;
  final VoidCallback onXoa;

  const _CardLenhSX({required this.lenh, required this.onDoiTrangThai, required this.onXoa});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final laMang = lenh.loaiSP == 'mang';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(lenh.soLSX, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi))),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: laMang ? const Color(0xFF3B82F6).withValues(alpha: 0.1) : const Color(0xFF8B5CF6).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text(laMang ? 'Màng' : 'Túi', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: laMang ? const Color(0xFF3B82F6) : const Color(0xFF8B5CF6))),
          ),
        ]),
        const SizedBox(height: 8),
        Text(lenh.tenSP, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: ChuDe.mauChuTheo(toi))),
        Text(lenh.cauTruc, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
        const SizedBox(height: 6),
        Row(children: [
          Icon(Icons.business, size: 12, color: ChuDe.mauNhatTheo(toi)),
          const SizedBox(width: 4),
          Expanded(child: Text(lenh.tenKhach, style: TextStyle(fontSize: 12, color: ChuDe.mauChuTheo(toi)))),
        ]),
        const SizedBox(height: 6),
        Row(children: [
          Text('${_fmt(lenh.soLuong)} ${laMang ? 'm²' : 'cái'}', style: TextStyle(fontSize: 12, color: ChuDe.mauTruc(toi), fontWeight: FontWeight.w600)),
          const Spacer(),
          Text(lenh.ngayTao, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          _DropdownTrangThaiLSX(lenh: lenh, onDoiTrangThai: onDoiTrangThai),
          const Spacer(),
          IconButton(
            onPressed: onXoa,
            icon: const Icon(Icons.delete_outline, size: 18),
            color: const Color(0xFFDC2626),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ]),
      ]),
    );
  }
}

// ─── Main Widget ─────────────────────────────────────────────────────────────
class ModuleLenhSX extends StatefulWidget {
  const ModuleLenhSX({super.key});

  @override
  State<ModuleLenhSX> createState() => _ModuleLenhSXState();
}

class _ModuleLenhSXState extends State<ModuleLenhSX> {
  final _searchCtrl = TextEditingController();
  String _tuKhoa = '';
  String _filterLoai = 'all'; // 'all' | 'mang' | 'tui'
  TrangThaiLSX? _filterTrangThai;
  List<LenhSX> _dsLenh = List.from(_dsMockLSX);

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  List<LenhSX> get _lenhLoc {
    var ds = _dsLenh.toList();
    if (_filterLoai != 'all') ds = ds.where((l) => l.loaiSP == _filterLoai).toList();
    if (_filterTrangThai != null) ds = ds.where((l) => l.trangThai == _filterTrangThai).toList();
    if (_tuKhoa.isNotEmpty) {
      final q = _tuKhoa.toLowerCase();
      ds = ds.where((l) =>
        l.tenKhach.toLowerCase().contains(q) ||
        l.tenSP.toLowerCase().contains(q) ||
        l.soLSX.toLowerCase().contains(q)
      ).toList();
    }
    return ds;
  }

  Widget _nutFilter(String nhan, bool active, VoidCallback onTap, bool toi) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active ? ChuDe.mauTruc(toi) : ChuDe.mauInputTheo(toi),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: active ? ChuDe.mauTruc(toi) : ChuDe.mauVienTheo(toi)),
        ),
        child: Text(nhan, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: active ? Colors.white : ChuDe.mauNhatTheo(toi))),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final lenhLoc = _lenhLoc;

    final tongLenh = _dsLenh.length;
    final moiTao = _dsLenh.where((l) => l.trangThai == TrangThaiLSX.moiTao).length;
    final dangSX = _dsLenh.where((l) => l.trangThai == TrangThaiLSX.dangSX).length;
    final hoangThanh = _dsLenh.where((l) => l.trangThai == TrangThaiLSX.hoangThanh).length;

    return Column(children: [
      // Toolbar
      Container(
        padding: const EdgeInsets.all(12),
        color: ChuDe.mauMatTheo(toi),
        child: Column(children: [
          // Search
          Container(
            height: 36,
            decoration: BoxDecoration(
              color: ChuDe.mauInputTheo(toi),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: ChuDe.mauVienTheo(toi)),
            ),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _tuKhoa = v),
              decoration: InputDecoration(
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                hintText: 'Tìm số LSX, khách hàng, sản phẩm...',
                hintStyle: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)),
                prefixIcon: Icon(Icons.search, size: 16, color: ChuDe.mauNhatTheo(toi)),
                suffixIcon: _tuKhoa.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.close, size: 14), onPressed: () { _searchCtrl.clear(); setState(() => _tuKhoa = ''); })
                  : null,
              ),
              style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi)),
            ),
          ),
          const SizedBox(height: 8),
          // Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              _nutFilter('Tất cả', _filterLoai == 'all', () => setState(() => _filterLoai = 'all'), toi),
              _nutFilter('Màng', _filterLoai == 'mang', () => setState(() => _filterLoai = 'mang'), toi),
              _nutFilter('Túi', _filterLoai == 'tui', () => setState(() => _filterLoai = 'tui'), toi),
              const SizedBox(width: 12),
              _nutFilter('Tất cả TT', _filterTrangThai == null, () => setState(() => _filterTrangThai = null), toi),
              ...TrangThaiLSX.values.map((tt) => _nutFilter(tt.nhan, _filterTrangThai == tt, () => setState(() => _filterTrangThai = tt), toi)),
            ]),
          ),
        ]),
      ),

      // Stats
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: Row(children: [
          Expanded(child: _TheStatLSX('Tổng lệnh', tongLenh, null, toi)),
          const SizedBox(width: 8),
          Expanded(child: _TheStatLSX('Mới tạo', moiTao, const Color(0xFF6B7280), toi)),
          const SizedBox(width: 8),
          Expanded(child: _TheStatLSX('Đang SX', dangSX, const Color(0xFFD97706), toi)),
          const SizedBox(width: 8),
          Expanded(child: _TheStatLSX('Hoàn thành', hoangThanh, const Color(0xFF059669), toi)),
        ]),
      ),

      // List
      const SizedBox(height: 8),
      Expanded(
        child: lenhLoc.isEmpty
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Text('📋', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              Text(
                _dsLenh.isEmpty ? 'Chưa có lệnh sản xuất nào' : 'Không tìm thấy kết quả',
                style: TextStyle(color: ChuDe.mauNhatTheo(toi)),
              ),
            ]))
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              itemCount: lenhLoc.length,
              itemBuilder: (_, i) {
                final lenh = lenhLoc[i];
                return _CardLenhSX(
                  lenh: lenh,
                  onDoiTrangThai: (tt) => setState(() { lenh.trangThai = tt; }),
                  onXoa: () => setState(() {
                    _dsLenh.removeWhere((l) => l.id == lenh.id);
                  }),
                );
              },
            ),
      ),
    ]);
  }
}

class _TheStatLSX extends StatelessWidget {
  final String nhan;
  final int so;
  final Color? mau;
  final bool toi;
  const _TheStatLSX(this.nhan, this.so, this.mau, this.toi);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: Column(children: [
        Text('$so', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: mau ?? ChuDe.mauChuTheo(toi))),
        Text(nhan, style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi)), textAlign: TextAlign.center),
      ]),
    );
  }
}
