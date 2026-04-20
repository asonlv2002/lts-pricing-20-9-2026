// giao_dien/thanh_phan/khach_hang.dart — Module CRM Khách Hàng
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

// ─── Mock data ───────────────────────────────────────────────────────────────
final _dsMockKH = <KhachHang>[
  KhachHang(id: 'C01', loai: LoaiKhachHang.congTy, tenCongTy: 'Công ty TNHH Đức Phát', maSoThue: '0312345678', diaChi: 'TP. Hồ Chí Minh', emailCT: 'info@ducphat.com', sdtCT: '028 1234 5678', tenNguoiLienHe: 'Phan Văn Đức', sdt: '0909 111 222', email: 'duc@ducphat.com', maSeller: 'S1', ngayTao: '10/01/2025'),
  KhachHang(id: 'C02', loai: LoaiKhachHang.congTy, tenCongTy: 'Cty CP Giang Sơn Foods', maSoThue: '0398765432', diaChi: 'Bình Dương', emailCT: 'info@giangs.vn', sdtCT: '0274 222 3333', tenNguoiLienHe: 'Lê Thị Giang', sdt: '0908 333 444', email: 'giang@giangs.vn', maSeller: 'S1', ngayTao: '05/02/2025'),
  KhachHang(id: 'C03', loai: LoaiKhachHang.congTy, tenCongTy: 'Hiếu Long Packaging', maSoThue: '3600123456', diaChi: 'Đồng Nai', emailCT: 'info@hieulong.vn', sdtCT: '0251 333 4444', tenNguoiLienHe: 'Trần Minh Hiếu', sdt: '0901 555 666', email: 'hieu@hieulong.vn', maSeller: 'S2', ngayTao: '22/01/2025'),
  KhachHang(id: 'C04', loai: LoaiKhachHang.congTy, tenCongTy: 'Kim Ngân Trading', maSoThue: '0101234567', diaChi: 'Hà Nội', emailCT: 'info@kimngan.com', sdtCT: '024 7777 8888', tenNguoiLienHe: 'Nguyễn Thị Kim', sdt: '0911 777 888', email: 'kim@kimngan.com', maSeller: 'S2', ngayTao: '01/03/2025'),
  KhachHang(id: 'C05', loai: LoaiKhachHang.caNhan, tenNguoiLienHe: 'Võ Quốc Linh', sdt: '0933 999 000', email: 'linh@linhvu.vn', diaChi: 'Cần Thơ', maSeller: 'S2', ngayTao: '15/03/2025'),
  KhachHang(id: 'C06', loai: LoaiKhachHang.congTy, tenCongTy: 'Cty TNHH SX Thanh Mai', maSoThue: '8200654321', diaChi: 'Long An', emailCT: 'info@thanhmai.vn', sdtCT: '0272 444 5555', tenNguoiLienHe: 'Phạm Thanh Mai', sdt: '0944 123 456', email: 'mai@thanhmai.vn', maSeller: 'S3', ngayTao: '20/02/2025'),
];

final _dsMockSeller = <Seller>[
  Seller(id: 'S1', ten: 'Nguyễn Văn An', email: 'an.nv@lts.vn', sdt: '0901 234 567', ngayThamGia: '15/01/2024'),
  Seller(id: 'S2', ten: 'Trần Thị Bình', email: 'binh.tt@lts.vn', sdt: '0912 345 678', ngayThamGia: '20/03/2024'),
  Seller(id: 'S3', ten: 'Lê Hoàng Cường', email: 'cuong.lh@lts.vn', sdt: '0987 654 321', ngayThamGia: '01/06/2024'),
];

// ─── Avatar ──────────────────────────────────────────────────────────────────
const _avatarColors = [Color(0xFF4F46E5), Color(0xFF0891B2), Color(0xFF059669), Color(0xFFD97706), Color(0xFFDB2777), Color(0xFF7C3AED)];
Color _avatarColor(String s) => _avatarColors[s.codeUnits.first % _avatarColors.length];
String _initials(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) return '${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  return name.isNotEmpty ? name[0].toUpperCase() : '?';
}

class _Avatar extends StatelessWidget {
  final String ten;
  final double size;
  const _Avatar(this.ten, {this.size = 36});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(color: _avatarColor(ten), shape: BoxShape.circle),
      alignment: Alignment.center,
      child: Text(_initials(ten), style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: size * 0.36)),
    );
  }
}

// ─── Hàng khách hàng ─────────────────────────────────────────────────────────
class _HangKhachHang extends StatelessWidget {
  final KhachHang kh;
  final List<Seller> dsSeller;
  final bool laAdmin;
  final ValueChanged<String?>? onDoiSeller;

  const _HangKhachHang({required this.kh, required this.dsSeller, required this.laAdmin, this.onDoiSeller});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final tenHienThi = kh.loai == LoaiKhachHang.congTy ? kh.tenCongTy : kh.tenNguoiLienHe;
    final tenPhu = kh.loai == LoaiKhachHang.congTy ? kh.tenNguoiLienHe : '';
    final seller = dsSeller.where((s) => s.id == kh.maSeller).firstOrNull;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: Row(children: [
        _Avatar(kh.tenNguoiLienHe),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(tenHienThi, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi))),
          if (tenPhu.isNotEmpty)
            Text(tenPhu, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
          if (kh.maSoThue.isNotEmpty)
            Text('MST: ${kh.maSoThue}', style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
          const SizedBox(height: 4),
          Row(children: [
            Icon(Icons.phone, size: 11, color: ChuDe.mauNhatTheo(toi)),
            const SizedBox(width: 3),
            Text(kh.sdt, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
          ]),
          if (kh.diaChi.isNotEmpty)
            Row(children: [
              Icon(Icons.location_on, size: 11, color: ChuDe.mauNhatTheo(toi)),
              const SizedBox(width: 3),
              Text(kh.diaChi, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
            ]),
        ])),
        if (laAdmin) Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          if (seller != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFF4F46E5).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(99)),
              child: Text(seller.ten, style: const TextStyle(fontSize: 11, color: Color(0xFF4F46E5), fontWeight: FontWeight.w600)),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(99)),
              child: const Text('Chưa phân', style: TextStyle(fontSize: 11, color: Color(0xFFD97706), fontWeight: FontWeight.w600)),
            ),
          const SizedBox(height: 6),
          _DropdownAssignSeller(kh: kh, dsSeller: dsSeller, onChon: onDoiSeller),
        ]),
      ]),
    );
  }
}

class _DropdownAssignSeller extends StatelessWidget {
  final KhachHang kh;
  final List<Seller> dsSeller;
  final ValueChanged<String?>? onChon;
  const _DropdownAssignSeller({required this.kh, required this.dsSeller, required this.onChon});

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return PopupMenuButton<String?>(
      tooltip: 'Giao cho nhân viên',
      icon: Icon(Icons.swap_horiz, size: 16, color: ChuDe.mauNhatTheo(toi)),
      onSelected: onChon,
      itemBuilder: (_) => [
        const PopupMenuItem<String?>(value: null, child: Text('— Bỏ phân công —')),
        ...dsSeller.map((s) => PopupMenuItem<String?>(
          value: s.id,
          child: Row(children: [
            _Avatar(s.ten, size: 22),
            const SizedBox(width: 8),
            Text(s.ten),
            if (kh.maSeller == s.id) ...[const Spacer(), const Icon(Icons.check, size: 14, color: Color(0xFF4F46E5))],
          ]),
        )),
      ],
    );
  }
}

// ─── Modal thêm khách hàng ───────────────────────────────────────────────────
class _ModalThemKH extends StatefulWidget {
  final List<Seller> dsSeller;
  final bool laAdmin;
  final ValueChanged<KhachHang> onThem;
  const _ModalThemKH({required this.dsSeller, required this.laAdmin, required this.onThem});

  @override
  State<_ModalThemKH> createState() => _ModalThemKHState();
}

class _ModalThemKHState extends State<_ModalThemKH> {
  LoaiKhachHang _loai = LoaiKhachHang.congTy;
  final _tenCTCtrl = TextEditingController();
  final _mstCtrl = TextEditingController();
  final _diaChiCtrl = TextEditingController();
  final _tenCtrl = TextEditingController();
  final _sdtCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  String? _maSellerChon;
  final _errors = <String, String>{};

  @override
  void dispose() {
    _tenCTCtrl.dispose(); _mstCtrl.dispose(); _diaChiCtrl.dispose();
    _tenCtrl.dispose(); _sdtCtrl.dispose(); _emailCtrl.dispose();
    super.dispose();
  }

  bool _validate() {
    _errors.clear();
    if (_loai == LoaiKhachHang.congTy && _tenCTCtrl.text.trim().isEmpty) _errors['tenCT'] = 'Vui lòng nhập tên công ty';
    if (_tenCtrl.text.trim().isEmpty) _errors['ten'] = 'Vui lòng nhập tên người liên hệ';
    if (_sdtCtrl.text.trim().isEmpty) _errors['sdt'] = 'Vui lòng nhập số điện thoại';
    return _errors.isEmpty;
  }

  void _luu() {
    if (!_validate()) { setState(() {}); return; }
    final kh = KhachHang(
      id: 'C${DateTime.now().millisecondsSinceEpoch}',
      loai: _loai,
      tenCongTy: _tenCTCtrl.text,
      maSoThue: _mstCtrl.text,
      diaChi: _diaChiCtrl.text,
      tenNguoiLienHe: _tenCtrl.text,
      sdt: _sdtCtrl.text,
      email: _emailCtrl.text,
      maSeller: _maSellerChon,
      ngayTao: '${DateTime.now().day.toString().padLeft(2,'0')}/${DateTime.now().month.toString().padLeft(2,'0')}/${DateTime.now().year}',
    );
    widget.onThem(kh);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    return AlertDialog(
      backgroundColor: ChuDe.mauMatTheo(toi),
      title: Row(children: [
        Icon(Icons.person_add, color: ChuDe.mauTruc(toi)),
        const SizedBox(width: 8),
        Text('Thêm Khách Hàng Mới', style: TextStyle(fontSize: 15, color: ChuDe.mauChuTheo(toi))),
      ]),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Toggle loại
          Row(children: [
            Expanded(child: _NutLoai('🏢 Công ty', _loai == LoaiKhachHang.congTy, () => setState(() => _loai = LoaiKhachHang.congTy), toi)),
            const SizedBox(width: 8),
            Expanded(child: _NutLoai('👤 Cá nhân', _loai == LoaiKhachHang.caNhan, () => setState(() => _loai = LoaiKhachHang.caNhan), toi)),
          ]),
          const SizedBox(height: 14),

          if (_loai == LoaiKhachHang.congTy) ...[
            _OInput('Tên công ty *', _tenCTCtrl, loi: _errors['tenCT'], toi: toi),
            _OInput('Mã số thuế', _mstCtrl, toi: toi),
            _OInput('Địa chỉ', _diaChiCtrl, toi: toi),
          ],
          _OInput(_loai == LoaiKhachHang.congTy ? 'Tên người liên hệ *' : 'Họ và tên *', _tenCtrl, loi: _errors['ten'], toi: toi),
          _OInput('Số điện thoại *', _sdtCtrl, loi: _errors['sdt'], loaiBanPhim: TextInputType.phone, toi: toi),
          _OInput('Email', _emailCtrl, loaiBanPhim: TextInputType.emailAddress, toi: toi),

          if (widget.laAdmin) ...[
            const SizedBox(height: 8),
            Text('Nhân viên đảm nhận', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi))),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(
                color: ChuDe.mauInputTheo(toi),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: ChuDe.mauVienTheo(toi)),
              ),
              child: DropdownButton<String?>(
                isExpanded: true, underline: const SizedBox(),
                value: _maSellerChon,
                hint: Text('— Chưa phân công —', style: TextStyle(color: ChuDe.mauNhatTheo(toi), fontSize: 13)),
                dropdownColor: ChuDe.mauMatTheo(toi),
                onChanged: (v) => setState(() => _maSellerChon = v),
                items: [
                  DropdownMenuItem<String?>(value: null, child: Text('— Chưa phân công —', style: TextStyle(color: ChuDe.mauNhatTheo(toi), fontSize: 13))),
                  ...widget.dsSeller.map((s) => DropdownMenuItem<String?>(value: s.id, child: Text(s.ten, style: TextStyle(color: ChuDe.mauChuTheo(toi), fontSize: 13)))),
                ],
              ),
            ),
          ],
        ]),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text('Hủy', style: TextStyle(color: ChuDe.mauNhatTheo(toi)))),
        ElevatedButton.icon(
          onPressed: _luu,
          icon: const Icon(Icons.add, size: 14),
          label: const Text('Thêm Khách Hàng'),
          style: ElevatedButton.styleFrom(backgroundColor: ChuDe.mauTruc(toi), foregroundColor: Colors.white),
        ),
      ],
    );
  }

  Widget _NutLoai(String nhan, bool active, VoidCallback onTap, bool toi) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: active ? ChuDe.mauTruc(toi) : ChuDe.mauInputTheo(toi),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? ChuDe.mauTruc(toi) : ChuDe.mauVienTheo(toi)),
        ),
        alignment: Alignment.center,
        child: Text(nhan, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: active ? Colors.white : ChuDe.mauNhatTheo(toi))),
      ),
    );
  }

  Widget _OInput(String nhan, TextEditingController ctrl, {String? loi, TextInputType? loaiBanPhim, required bool toi}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(nhan.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.3)),
        const SizedBox(height: 4),
        TextField(
          controller: ctrl,
          keyboardType: loaiBanPhim,
          style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi)),
          decoration: InputDecoration(
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            errorText: loi,
          ),
          onChanged: (_) => setState(() => _errors.remove(nhan)),
        ),
      ]),
    );
  }
}

// ─── Main Widget ─────────────────────────────────────────────────────────────
class ModuleKhachHang extends StatefulWidget {
  const ModuleKhachHang({super.key});

  @override
  State<ModuleKhachHang> createState() => _ModuleKhachHangState();
}

class _ModuleKhachHangState extends State<ModuleKhachHang> {
  final _searchCtrl = TextEditingController();
  String _tuKhoa = '';
  String _tabAdmin = 'all'; // 'all' | 'by_seller'
  List<KhachHang> _dsKH = List.from(_dsMockKH);
  final List<Seller> _dsSeller = List.from(_dsMockSeller);

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  List<KhachHang> get _khLoc {
    var ds = _dsKH.toList();
    if (_tuKhoa.isNotEmpty) {
      final q = _tuKhoa.toLowerCase();
      ds = ds.where((k) =>
        k.tenNguoiLienHe.toLowerCase().contains(q) ||
        k.tenCongTy.toLowerCase().contains(q) ||
        k.sdt.contains(q) || k.maSoThue.contains(q)
      ).toList();
    }
    return ds;
  }

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final laAdmin = kho.vaiTro == VaiTro.admin;
    final chuaPhan = _dsKH.where((k) => k.maSeller == null).length;

    return Column(children: [
      // Toolbar
      Container(
        padding: const EdgeInsets.all(12),
        color: ChuDe.mauMatTheo(toi),
        child: Row(children: [
          Expanded(
            child: Container(
              height: 36,
              decoration: BoxDecoration(color: ChuDe.mauInputTheo(toi), borderRadius: BorderRadius.circular(10), border: Border.all(color: ChuDe.mauVienTheo(toi))),
              child: TextField(
                controller: _searchCtrl,
                onChanged: (v) => setState(() => _tuKhoa = v),
                decoration: InputDecoration(
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  hintText: 'Tìm tên, công ty, SĐT, MST...',
                  hintStyle: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)),
                  prefixIcon: Icon(Icons.search, size: 16, color: ChuDe.mauNhatTheo(toi)),
                  suffixIcon: _tuKhoa.isNotEmpty ? IconButton(icon: const Icon(Icons.close, size: 14), onPressed: () { _searchCtrl.clear(); setState(() => _tuKhoa = ''); }) : null,
                ),
                style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi)),
              ),
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: () => showDialog(context: context, builder: (_) => _ModalThemKH(
              dsSeller: _dsSeller, laAdmin: laAdmin,
              onThem: (kh) => setState(() => _dsKH.add(kh)),
            )),
            icon: const Icon(Icons.add, size: 14),
            label: const Text('Thêm KH', style: TextStyle(fontSize: 12)),
            style: ElevatedButton.styleFrom(backgroundColor: ChuDe.mauTruc(toi), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
          ),
        ]),
      ),

      // Stats (admin)
      if (laAdmin) Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: Row(children: [
          _TheStatKH('Tổng KH', _dsKH.length, null, toi),
          const SizedBox(width: 8),
          _TheStatKH('Nhân viên', _dsSeller.length, null, toi),
          const SizedBox(width: 8),
          _TheStatKH('Chưa phân', chuaPhan, const Color(0xFFD97706), toi),
        ]),
      ),

      // Tabs (admin)
      if (laAdmin) Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: Row(children: [
          _NutTab('👥 Tất cả', _tabAdmin == 'all', () => setState(() => _tabAdmin = 'all'), _khLoc.length, toi),
          const SizedBox(width: 8),
          _NutTab('💼 Theo NV', _tabAdmin == 'by_seller', () => setState(() => _tabAdmin = 'by_seller'), null, toi),
        ]),
      ),

      // Danh sách
      const SizedBox(height: 8),
      Expanded(
        child: _khLoc.isEmpty
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Text('👥', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              Text('Chưa có khách hàng nào', style: TextStyle(color: ChuDe.mauNhatTheo(toi))),
            ]))
          : laAdmin && _tabAdmin == 'by_seller'
            // View theo seller
            ? ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  ..._dsSeller.map((s) {
                    final khcuaSeller = _dsKH.where((k) => k.maSeller == s.id).toList();
                    return _NhomSellerKH(
                      seller: s, dsKH: khcuaSeller,
                      dsSeller: _dsSeller,
                      onDoiSeller: (kId, sId) => setState(() { _dsKH.firstWhere((k) => k.id == kId).maSeller = sId; }),
                    );
                  }),
                  // Chưa phân
                  if (chuaPhan > 0) _NhomSellerKH(
                    seller: Seller(id: '', ten: 'Chưa phân công', email: '', sdt: '', ngayThamGia: ''),
                    dsKH: _dsKH.where((k) => k.maSeller == null).toList(),
                    dsSeller: _dsSeller,
                    onDoiSeller: (kId, sId) => setState(() { _dsKH.firstWhere((k) => k.id == kId).maSeller = sId; }),
                  ),
                ],
              )
            // View flat list
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: _khLoc.length,
                itemBuilder: (_, i) => _HangKhachHang(
                  kh: _khLoc[i], dsSeller: _dsSeller, laAdmin: laAdmin,
                  onDoiSeller: (sId) => setState(() { _khLoc[i].maSeller = sId; }),
                ),
              ),
      ),
    ]);
  }

  Widget _TheStatKH(String nhan, int so, Color? mau, bool toi) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(vertical: 10),
    decoration: BoxDecoration(color: ChuDe.mauMatTheo(toi), borderRadius: BorderRadius.circular(10), border: Border.all(color: ChuDe.mauVienTheo(toi))),
    child: Column(children: [
      Text('$so', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: mau ?? ChuDe.mauChuTheo(toi))),
      Text(nhan, style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
    ]),
  ));

  Widget _NutTab(String nhan, bool active, VoidCallback onTap, int? so, bool toi) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: active ? ChuDe.mauTruc(toi).withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: active ? ChuDe.mauTruc(toi) : ChuDe.mauVienTheo(toi)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(nhan, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: active ? ChuDe.mauTruc(toi) : ChuDe.mauNhatTheo(toi))),
        if (so != null) ...[
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(color: ChuDe.mauTruc(toi), borderRadius: BorderRadius.circular(99)),
            child: Text('$so', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ]),
    ),
  );
}

class _NhomSellerKH extends StatefulWidget {
  final Seller seller;
  final List<KhachHang> dsKH;
  final List<Seller> dsSeller;
  final void Function(String khId, String? sellerId) onDoiSeller;
  const _NhomSellerKH({required this.seller, required this.dsKH, required this.dsSeller, required this.onDoiSeller});

  @override
  State<_NhomSellerKH> createState() => _NhomSellerKHState();
}

class _NhomSellerKHState extends State<_NhomSellerKH> {
  bool _mo = true;

  @override
  Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final laChuaPhan = widget.seller.id.isEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(border: Border.all(color: ChuDe.mauVienTheo(toi)), borderRadius: BorderRadius.circular(ChuDe.bKinhRadius)),
      child: Column(children: [
        InkWell(
          onTap: () => setState(() => _mo = !_mo),
          borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(children: [
              if (!laChuaPhan) _Avatar(widget.seller.ten, size: 32) else const Icon(Icons.warning_amber, color: Color(0xFFD97706)),
              const SizedBox(width: 10),
              Expanded(child: Text(widget.seller.ten, style: TextStyle(fontWeight: FontWeight.w700, color: laChuaPhan ? const Color(0xFFD97706) : ChuDe.mauChuTheo(toi)))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(color: ChuDe.mauInputTheo(toi), borderRadius: BorderRadius.circular(99)),
                child: Text('${widget.dsKH.length} KH', style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi))),
              ),
              const SizedBox(width: 8),
              AnimatedRotation(turns: _mo ? 0 : -0.25, duration: const Duration(milliseconds: 200),
                child: Icon(Icons.keyboard_arrow_down, color: ChuDe.mauNhatTheo(toi))),
            ]),
          ),
        ),
        if (_mo) ...[
          Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
          Padding(
            padding: const EdgeInsets.all(10),
            child: widget.dsKH.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text('Chưa có khách hàng nào được phân công.', style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi))),
                )
              : Column(children: widget.dsKH.map((kh) => _HangKhachHang(
                  kh: kh, dsSeller: widget.dsSeller, laAdmin: true,
                  onDoiSeller: (sId) => widget.onDoiSeller(kh.id, sId),
                )).toList()),
          ),
        ],
      ]),
    );
  }
}
