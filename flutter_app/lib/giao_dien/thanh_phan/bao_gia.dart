// giao_dien/thanh_phan/bao_gia.dart — Module Báo Giá
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../khung_chinh/chu_de.dart';

// ─── Dữ liệu mock (sẽ thay bằng store sau) ───────────────────────────────────
final _dsMockBaoGia = <MucBaoGia>[
  MucBaoGia(
    id: 'BG001', ngay: '15/04/2026', tenKhach: 'Công ty TNHH Đức Phát',
    tenSP: 'Túi PA/PE 3 biên', cauTruc: 'PA15/PE50', soLuong: 50000,
    giaBanCuoi: 850, giaChotGia: 880,
    dauVao: DauVaoTinhGia(tenKhachHang: 'Đức Phát', tenSanPham: 'Túi PA/PE 3 biên'),
    trangThai: TrangThaiBaoGia.daDuyet, tenSeller: 'Nguyễn Văn An', maSeller: 'S1',
  ),
  MucBaoGia(
    id: 'BG002', ngay: '16/04/2026', tenKhach: 'Giang Sơn Foods',
    tenSP: 'Màng OPP/PE ghép', cauTruc: 'OPP20/PE40', soLuong: 2000,
    giaBanCuoi: 12500,
    dauVao: DauVaoTinhGia(tenKhachHang: 'Giang Sơn', tenSanPham: 'Màng OPP/PE'),
    trangThai: TrangThaiBaoGia.choXetDuyet, tenSeller: 'Nguyễn Văn An', maSeller: 'S1',
  ),
  MucBaoGia(
    id: 'BG003', ngay: '17/04/2026', tenKhach: 'Hiếu Long Packaging',
    tenSP: 'Túi PA/AL/PE 4 biên', cauTruc: 'PA15/AL7/PE60', soLuong: 30000,
    giaBanCuoi: 1250,
    dauVao: DauVaoTinhGia(tenKhachHang: 'Hiếu Long', tenSanPham: 'Túi PA/AL/PE'),
    trangThai: TrangThaiBaoGia.soThao, tenSeller: 'Trần Thị Bình', maSeller: 'S2',
  ),
  MucBaoGia(
    id: 'BG004', ngay: '18/04/2026', tenKhach: 'Kim Ngân Trading',
    tenSP: 'Túi đáy đứng zipper', cauTruc: 'PET12/PE80', soLuong: 20000,
    giaBanCuoi: 1800, giaChotGia: 1750,
    dauVao: DauVaoTinhGia(tenKhachHang: 'Kim Ngân', tenSanPham: 'Túi đáy đứng'),
    trangThai: TrangThaiBaoGia.hoangThanh, tenSeller: 'Trần Thị Bình', maSeller: 'S2',
  ),
];

String _fmtSo(double n) => NumberFormat('#,###', 'vi_VN').format(n.round());

// ─── Badge trạng thái ─────────────────────────────────────────────────────────
class _BadgeTrangThai extends StatelessWidget {
  final TrangThaiBaoGia trangThai;
  const _BadgeTrangThai(this.trangThai);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: trangThai.mauNen,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: trangThai.mau.withValues(alpha: 0.4)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 6, height: 6, decoration: BoxDecoration(color: trangThai.mau, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(trangThai.nhan, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: trangThai.mau)),
      ]),
    );
  }
}

// ─── Card báo giá ─────────────────────────────────────────────────────────────
class _CardBaoGia extends StatelessWidget {
  final MucBaoGia muc;
  final bool laAdmin;
  final VoidCallback? onDoiTrangThai;

  const _CardBaoGia({required this.muc, required this.laAdmin, this.onDoiTrangThai});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final giaHienThi = (muc.giaChotGia != null && muc.giaChotGia! > 0) ? muc.giaChotGia! : muc.giaBanCuoi;
    final tongGT = giaHienThi * muc.soLuong;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Header
          Row(children: [
            Icon(Icons.description_outlined, size: 14, color: ChuDe.mauTruc(toi)),
            const SizedBox(width: 6),
            Text(muc.ngay, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
            const Spacer(),
            _BadgeTrangThai(muc.trangThai),
          ]),
          const SizedBox(height: 10),

          // Tên SP
          Text(muc.tenSP, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi))),
          const SizedBox(height: 6),

          // Khách hàng
          Row(children: [
            Icon(Icons.business, size: 13, color: const Color(0xFF4F46E5)),
            const SizedBox(width: 5),
            Expanded(child: Text(muc.tenKhach, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ChuDe.mauChuTheo(toi)))),
          ]),
          const SizedBox(height: 8),

          // Chi tiết
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: ChuDe.mauInputTheo(toi), borderRadius: BorderRadius.circular(8)),
            child: Column(children: [
              _HangChiTiet('Chất liệu', muc.cauTruc, toi),
              const SizedBox(height: 4),
              _HangChiTiet('Số lượng', '${_fmtSo(muc.soLuong)} cái', toi),
            ]),
          ),
          const SizedBox(height: 10),

          // Giá
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Giá đề xuất / cái', style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
              Text('${_fmtSo(muc.giaBanCuoi)} đ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi))),
            ])),
            if (muc.giaChotGia != null && muc.giaChotGia! > 0)
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('Giá chốt / cái', style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
                Text('${_fmtSo(muc.giaChotGia!)} đ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF059669))),
              ])),
          ]),
          const SizedBox(height: 8),

          // Tổng giá trị
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              gradient: ChuDe.gradient(toi),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('Tổng giá trị ước tính', style: const TextStyle(fontSize: 11, color: Colors.white70)),
              Text('${_fmtSo(tongGT)} đ', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
            ]),
          ),

          // Seller (admin only)
          if (laAdmin && muc.tenSeller != null) ...[
            const SizedBox(height: 8),
            Row(children: [
              Icon(Icons.person_outline, size: 12, color: ChuDe.mauNhatTheo(toi)),
              const SizedBox(width: 4),
              Text(muc.tenSeller!, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
            ]),
          ],

          // Đổi trạng thái (admin)
          if (laAdmin) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onDoiTrangThai,
                icon: const Icon(Icons.swap_horiz, size: 13),
                label: const Text('Đổi trạng thái', style: TextStyle(fontSize: 12)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  side: BorderSide(color: ChuDe.mauVienTheo(toi)),
                  foregroundColor: ChuDe.mauNhatTheo(toi),
                ),
              ),
            ),
          ],

          // Nút gửi admin (sale, trạng thái soThao) — khớp SaleStatusControl bên Next.js.
          // Chuyển soThao → choXetDuyet khi sale bấm "Gửi Admin".
          if (!laAdmin && muc.trangThai == TrangThaiBaoGia.soThao) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onDoiTrangThai, // bấm = gửi → choXetDuyet (admin xử lý ở callback)
                icon: const Icon(Icons.send, size: 13),
                label: const Text('Gửi Admin', style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 7),
                ),
              ),
            ),
          ],
        ]),
      ),
    );
  }
}

Widget _HangChiTiet(String nhan, String giaTri, bool toi) {
  return Row(children: [
    SizedBox(width: 80, child: Text(nhan, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi)))),
    Expanded(child: Text(giaTri, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ChuDe.mauChuTheo(toi)))),
  ]);
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
class _StatsBar extends StatelessWidget {
  final List<MucBaoGia> dsMuc;
  const _StatsBar(this.dsMuc);

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final counts = <TrangThaiBaoGia, int>{};
    for (final tt in TrangThaiBaoGia.values) counts[tt] = 0;
    for (final m in dsMuc) counts[m.trangThai] = (counts[m.trangThai] ?? 0) + 1;

    final doanhthu = dsMuc
        .where((m) => m.trangThai == TrangThaiBaoGia.hoangThanh)
        .fold<double>(0, (s, m) => s + (m.giaChotGia ?? m.giaBanCuoi) * m.soLuong);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [
        ...TrangThaiBaoGia.values.map((tt) => _TheThongKe(
          so: counts[tt] ?? 0,
          nhan: tt.nhan,
          mau: tt.mau,
          toi: toi,
        )),
        _TheThongKe(
          so: (doanhthu / 1000000).round(),
          nhan: 'Doanh thu (Tr)',
          mau: const Color(0xFF059669),
          toi: toi,
        ),
      ]),
    );
  }
}

class _TheThongKe extends StatelessWidget {
  final int so;
  final String nhan;
  final Color mau;
  final bool toi;
  const _TheThongKe({required this.so, required this.nhan, required this.mau, required this.toi});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: Column(children: [
        Text('$so', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: mau)),
        const SizedBox(height: 2),
        Text(nhan, style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
      ]),
    );
  }
}

// ─── Dialog đổi trạng thái ────────────────────────────────────────────────────
// Admin chỉ thao tác trong 3 bước (chờ duyệt → đã duyệt → hoàn thành) — khớp ADMIN_STEPS bên Next.js.
Future<TrangThaiBaoGia?> _hienDialogDoiTrangThai(BuildContext context, TrangThaiBaoGia hienTai) {
  final toi = Theme.of(context).brightness == Brightness.dark;
  const adminSteps = [TrangThaiBaoGia.choXetDuyet, TrangThaiBaoGia.daDuyet, TrangThaiBaoGia.hoangThanh];
  return showDialog<TrangThaiBaoGia>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: ChuDe.mauMatTheo(toi),
      title: Text('Đổi trạng thái', style: TextStyle(color: ChuDe.mauChuTheo(toi), fontSize: 16)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: adminSteps.map((tt) =>
          ListTile(
            dense: true,
            leading: Container(width: 10, height: 10, decoration: BoxDecoration(color: tt.mau, shape: BoxShape.circle)),
            title: Text(tt.nhan, style: TextStyle(color: ChuDe.mauChuTheo(toi), fontSize: 13)),
            trailing: tt == hienTai ? Icon(Icons.check, size: 16, color: ChuDe.mauTruc(toi)) : null,
            onTap: () => Navigator.pop(ctx, tt),
          ),
        ).toList(),
      ),
    ),
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────
class ModuleBaoGia extends StatefulWidget {
  const ModuleBaoGia({super.key});

  @override
  State<ModuleBaoGia> createState() => _ModuleBaoGiaState();
}

class _ModuleBaoGiaState extends State<ModuleBaoGia> {
  final _searchCtrl = TextEditingController();
  String _tuKhoa = '';
  List<MucBaoGia> _dsMuc = List.from(_dsMockBaoGia);

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  List<MucBaoGia> get _mucsLoc {
    if (_tuKhoa.isEmpty) return _dsMuc;
    final q = _tuKhoa.toLowerCase();
    return _dsMuc.where((m) =>
      m.tenKhach.toLowerCase().contains(q) ||
      m.tenSP.toLowerCase().contains(q) ||
      m.cauTruc.toLowerCase().contains(q)
    ).toList();
  }

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final laAdmin = kho.vaiTro == VaiTro.admin;

    // Nhóm theo seller nếu admin — admin chỉ thấy item đã gửi (!= soThao), khớp isSentToAdmin bên Next.
    final Map<String, List<MucBaoGia>> nhomSeller = {};
    for (final m in _mucsLoc) {
      if (laAdmin && m.trangThai == TrangThaiBaoGia.soThao) continue;
      final key = m.maSeller ?? 'unknown';
      nhomSeller.putIfAbsent(key, () => []).add(m);
    }

    return Column(children: [
      // Toolbar
      Container(
        padding: const EdgeInsets.all(12),
        color: ChuDe.mauMatTheo(toi),
        child: Row(children: [
          Expanded(
            child: Container(
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
                  hintText: laAdmin ? 'Tìm seller, khách hàng, sản phẩm...' : 'Tìm khách hàng, sản phẩm...',
                  hintStyle: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)),
                  prefixIcon: Icon(Icons.search, size: 16, color: ChuDe.mauNhatTheo(toi)),
                  suffixIcon: _tuKhoa.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.close, size: 14), onPressed: () { _searchCtrl.clear(); setState(() => _tuKhoa = ''); })
                    : null,
                ),
                style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi)),
              ),
            ),
          ),
        ]),
      ),

      // Stats
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: _StatsBar(_dsMuc),
      ),

      // List
      Expanded(
        child: _mucsLoc.isEmpty
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Text('📋', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              Text('Chưa có báo giá nào', style: TextStyle(color: ChuDe.mauNhatTheo(toi))),
            ]))
          : laAdmin
            // Admin: nhóm theo seller
            ? ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: nhomSeller.entries.map((e) {
                  final tenSeller = e.value.first.tenSeller ?? e.key;
                  return _NhomSeller(
                    tenSeller: tenSeller,
                    dsMuc: e.value,
                    onDoiTrangThai: (muc) async {
                      final tt = await _hienDialogDoiTrangThai(context, muc.trangThai);
                      if (tt != null) setState(() { muc.trangThai = tt; });
                    },
                  );
                }).toList(),
              )
            // Sale: flat list — nút "Gửi Admin" chuyển trực tiếp sang choXetDuyet.
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: _mucsLoc.length,
                itemBuilder: (_, i) => _CardBaoGia(
                  muc: _mucsLoc[i], laAdmin: false,
                  onDoiTrangThai: _mucsLoc[i].trangThai == TrangThaiBaoGia.soThao
                    ? () => setState(() { _mucsLoc[i].trangThai = TrangThaiBaoGia.choXetDuyet; })
                    : null,
                ),
              ),
      ),
    ]);
  }
}

// ─── Nhóm Seller (accordion) ─────────────────────────────────────────────────
class _NhomSeller extends StatefulWidget {
  final String tenSeller;
  final List<MucBaoGia> dsMuc;
  final void Function(MucBaoGia) onDoiTrangThai;
  const _NhomSeller({required this.tenSeller, required this.dsMuc, required this.onDoiTrangThai});

  @override
  State<_NhomSeller> createState() => _NhomSellerState();
}

class _NhomSellerState extends State<_NhomSeller> {
  bool _mo = true;

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final soCho = widget.dsMuc.where((m) => m.trangThai == TrangThaiBaoGia.choXetDuyet).length;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
        borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
      ),
      child: Column(children: [
        // Header
        InkWell(
          onTap: () => setState(() => _mo = !_mo),
          borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(children: [
              Icon(Icons.group, size: 16, color: ChuDe.mauTruc(toi)),
              const SizedBox(width: 8),
              Text(widget.tenSeller, style: TextStyle(fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi))),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(color: ChuDe.mauInputTheo(toi), borderRadius: BorderRadius.circular(99)),
                child: Text('${widget.dsMuc.length}', style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
              ),
              if (soCho > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(99)),
                  child: Text('$soCho chờ duyệt', style: const TextStyle(fontSize: 11, color: Color(0xFFD97706), fontWeight: FontWeight.w600)),
                ),
              ],
              const Spacer(),
              AnimatedRotation(
                turns: _mo ? 0 : -0.25,
                duration: const Duration(milliseconds: 200),
                child: Icon(Icons.keyboard_arrow_down, color: ChuDe.mauNhatTheo(toi)),
              ),
            ]),
          ),
        ),
        if (_mo) ...[
          Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(children: widget.dsMuc.map((m) => _CardBaoGia(
              muc: m, laAdmin: true,
              onDoiTrangThai: () => widget.onDoiTrangThai(m),
            )).toList()),
          ),
        ],
      ]),
    );
  }
}
