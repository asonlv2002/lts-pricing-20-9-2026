// giao_dien/thanh_phan/quan_ly_seller.dart — Module Quản Lý Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../khung_chinh/chu_de.dart';

const _avatarColors2 = [Color(0xFF4F46E5), Color(0xFF0891B2), Color(0xFF059669), Color(0xFFD97706), Color(0xFFDB2777), Color(0xFF7C3AED)];
Color _ac2(String s) => _avatarColors2[s.codeUnits.first % _avatarColors2.length];
String _ini2(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) return '${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  return name.isNotEmpty ? name[0].toUpperCase() : '?';
}

class _Avatar2 extends StatelessWidget {
  final String ten;
  final double size;
  const _Avatar2(this.ten, {this.size = 44});
  @override
  Widget build(BuildContext context) => Container(
    width: size, height: size,
    decoration: BoxDecoration(color: _ac2(ten), shape: BoxShape.circle),
    alignment: Alignment.center,
    child: Text(_ini2(ten), style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: size * 0.36)),
  );
}

final _dsMockSellers = <Seller>[
  Seller(id: 'S1', ten: 'Nguyễn Văn An', email: 'an.nv@lts.vn', sdt: '0901 234 567', ngayThamGia: '15/01/2024'),
  Seller(id: 'S2', ten: 'Trần Thị Bình', email: 'binh.tt@lts.vn', sdt: '0912 345 678', ngayThamGia: '20/03/2024'),
  Seller(id: 'S3', ten: 'Lê Hoàng Cường', email: 'cuong.lh@lts.vn', sdt: '0987 654 321', ngayThamGia: '01/06/2024'),
];
const _soKH = {'S1': 2, 'S2': 3, 'S3': 2};

class _CardSeller extends StatefulWidget {
  final Seller seller;
  final int soKH;
  final VoidCallback onXoa;
  final ValueChanged<bool> onDoiTrangThai;
  const _CardSeller({required this.seller, required this.soKH, required this.onXoa, required this.onDoiTrangThai});

  @override
  State<_CardSeller> createState() => _CardSellerState();
}

class _CardSellerState extends State<_CardSeller> {
  bool _xacNhanXoa = false;

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final s = widget.seller;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: Row(children: [
        _Avatar2(s.ten, size: 48),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(s.ten, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi))),
          const SizedBox(height: 3),
          Row(children: [
            Icon(Icons.email_outlined, size: 12, color: ChuDe.mauNhatTheo(toi)),
            const SizedBox(width: 4),
            Text(s.email, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
          ]),
          Row(children: [
            Icon(Icons.phone_outlined, size: 12, color: ChuDe.mauNhatTheo(toi)),
            const SizedBox(width: 4),
            Text(s.sdt, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
          ]),
          const SizedBox(height: 4),
          Text('Tham gia: ${s.ngayThamGia}', style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
        ])),
        const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: ChuDe.mauInputTheo(toi), borderRadius: BorderRadius.circular(8)),
            child: Column(children: [
              Text('${widget.soKH}', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: ChuDe.mauTruc(toi))),
              Text('Khách hàng', style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
            ]),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Icon(Icons.circle, size: 8, color: s.dangHoatDong ? const Color(0xFF059669) : const Color(0xFFDC2626)),
            const SizedBox(width: 4),
            Text(s.dangHoatDong ? 'Đang HĐ' : 'Ngừng HĐ', style: TextStyle(fontSize: 11, color: s.dangHoatDong ? const Color(0xFF059669) : const Color(0xFFDC2626), fontWeight: FontWeight.w600)),
          ]),
          const SizedBox(height: 8),
          if (!_xacNhanXoa) Row(children: [
            OutlinedButton(
              onPressed: () => widget.onDoiTrangThai(!s.dangHoatDong),
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), side: BorderSide(color: ChuDe.mauVienTheo(toi))),
              child: Text(s.dangHoatDong ? 'Ngừng HĐ' : '✓ Kích hoạt', style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
            ),
            const SizedBox(width: 6),
            IconButton(
              onPressed: () => setState(() => _xacNhanXoa = true),
              icon: const Icon(Icons.delete_outline, size: 16, color: Color(0xFFDC2626)),
              padding: EdgeInsets.zero, constraints: const BoxConstraints(),
            ),
          ])
          else Row(children: [
            Text('Xóa?', style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
            const SizedBox(width: 6),
            GestureDetector(onTap: widget.onXoa, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: const Color(0xFFDC2626), borderRadius: BorderRadius.circular(6)), child: const Text('Xóa', style: TextStyle(fontSize: 11, color: Colors.white)))),
            const SizedBox(width: 4),
            GestureDetector(onTap: () => setState(() => _xacNhanXoa = false), child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: ChuDe.mauInputTheo(toi), borderRadius: BorderRadius.circular(6)), child: Text('Hủy', style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))))),
          ]),
        ]),
      ]),
    );
  }
}

class ModuleQuanLySeller extends StatefulWidget {
  const ModuleQuanLySeller({super.key});
  @override
  State<ModuleQuanLySeller> createState() => _ModuleQuanLySellerState();
}

class _ModuleQuanLySellerState extends State<ModuleQuanLySeller> {
  final _searchCtrl = TextEditingController();
  String _tuKhoa = '';
  String _filterTrangThai = 'all';
  List<Seller> _dsSeller = List.from(_dsMockSellers);
  final Map<String, int> _soKHMap = Map.from(_soKH);

  @override void dispose() { _searchCtrl.dispose(); super.dispose(); }

  List<Seller> get _sellerLoc {
    var ds = _dsSeller.toList();
    if (_filterTrangThai == 'active') ds = ds.where((s) => s.dangHoatDong).toList();
    if (_filterTrangThai == 'inactive') ds = ds.where((s) => !s.dangHoatDong).toList();
    if (_tuKhoa.isNotEmpty) {
      final q = _tuKhoa.toLowerCase();
      ds = ds.where((s) => s.ten.toLowerCase().contains(q) || s.email.toLowerCase().contains(q) || s.sdt.contains(q)).toList();
    }
    return ds;
  }

  void _themSeller(String ten, String email, String sdt) {
    setState(() => _dsSeller.add(Seller(id: 'S${_dsSeller.length + 1}', ten: ten, email: email, sdt: sdt, ngayThamGia: '${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}')));
  }

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final sellerLoc = _sellerLoc;
    final tongKH = _soKHMap.values.fold(0, (a, b) => a + b);

    return Column(children: [
      Container(
        padding: const EdgeInsets.all(12),
        color: ChuDe.mauMatTheo(toi),
        child: Column(children: [
          Row(children: [
            Expanded(child: Container(
              height: 36,
              decoration: BoxDecoration(color: ChuDe.mauInputTheo(toi), borderRadius: BorderRadius.circular(10), border: Border.all(color: ChuDe.mauVienTheo(toi))),
              child: TextField(
                controller: _searchCtrl,
                onChanged: (v) => setState(() => _tuKhoa = v),
                decoration: InputDecoration(
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  hintText: 'Tìm tên, email, SĐT...',
                  hintStyle: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)),
                  prefixIcon: Icon(Icons.search, size: 16, color: ChuDe.mauNhatTheo(toi)),
                ),
                style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi)),
              ),
            )),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              onPressed: () => _hienModalThemSeller(context, toi),
              icon: const Icon(Icons.add, size: 14),
              label: const Text('Thêm Seller', style: TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(backgroundColor: ChuDe.mauTruc(toi), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
            ),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: Row(children: [
              _theStatSeller('Tổng', _dsSeller.length, null, toi),
              const SizedBox(width: 6),
              _theStatSeller('Đang HĐ', _dsSeller.where((s) => s.dangHoatDong).length, const Color(0xFF059669), toi),
              const SizedBox(width: 6),
              _theStatSeller('Tổng KH', tongKH, null, toi),
            ])),
            const SizedBox(width: 8),
            ...[('all', 'Tất cả'), ('active', '● Đang HĐ'), ('inactive', '○ Ngừng')].map(((String, String) e) =>
              GestureDetector(
                onTap: () => setState(() => _filterTrangThai = e.$1),
                child: Container(
                  margin: const EdgeInsets.only(left: 5),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: _filterTrangThai == e.$1 ? ChuDe.mauTruc(toi) : ChuDe.mauInputTheo(toi),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(color: _filterTrangThai == e.$1 ? ChuDe.mauTruc(toi) : ChuDe.mauVienTheo(toi)),
                  ),
                  child: Text(e.$2, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _filterTrangThai == e.$1 ? Colors.white : ChuDe.mauNhatTheo(toi))),
                ),
              )
            ),
          ]),
        ]),
      ),
      Expanded(
        child: sellerLoc.isEmpty
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Text('💼', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              Text('Không tìm thấy seller nào', style: TextStyle(color: ChuDe.mauNhatTheo(toi))),
            ]))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: sellerLoc.length,
              itemBuilder: (_, i) => _CardSeller(
                seller: sellerLoc[i],
                soKH: _soKHMap[sellerLoc[i].id] ?? 0,
                onXoa: () => setState(() => _dsSeller.removeWhere((s) => s.id == sellerLoc[i].id)),
                onDoiTrangThai: (v) => setState(() => sellerLoc[i].dangHoatDong = v),
              ),
            ),
      ),
    ]);
  }

  Widget _theStatSeller(String nhan, int so, Color? mau, bool toi) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(vertical: 6),
    decoration: BoxDecoration(color: ChuDe.mauMatTheo(toi), borderRadius: BorderRadius.circular(8), border: Border.all(color: ChuDe.mauVienTheo(toi))),
    child: Column(children: [
      Text('$so', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: mau ?? ChuDe.mauChuTheo(toi))),
      Text(nhan, style: TextStyle(fontSize: 9, color: ChuDe.mauNhatTheo(toi))),
    ]),
  ));

  void _hienModalThemSeller(BuildContext context, bool toi) {
    final tenCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final sdtCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: ChuDe.mauMatTheo(toi),
        title: Text('Thêm Seller Mới', style: TextStyle(fontSize: 15, color: ChuDe.mauChuTheo(toi))),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          _oInputSeller('Họ và tên *', tenCtrl, toi),
          _oInputSeller('Email *', emailCtrl, toi, loai: TextInputType.emailAddress),
          _oInputSeller('Điện thoại *', sdtCtrl, toi, loai: TextInputType.phone),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('Hủy', style: TextStyle(color: ChuDe.mauNhatTheo(toi)))),
          ElevatedButton(
            onPressed: () { _themSeller(tenCtrl.text, emailCtrl.text, sdtCtrl.text); Navigator.pop(context); },
            style: ElevatedButton.styleFrom(backgroundColor: ChuDe.mauTruc(toi), foregroundColor: Colors.white),
            child: const Text('Thêm'),
          ),
        ],
      ),
    );
  }

  Widget _oInputSeller(String nhan, TextEditingController ctrl, bool toi, {TextInputType? loai}) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      controller: ctrl, keyboardType: loai,
      style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi)),
      decoration: InputDecoration(
        labelText: nhan,
        labelStyle: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)),
        isDense: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
  );
}
