// giao_dien/thanh_phan/tai_khoan.dart — Module Quản Lý Tài Khoản
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../../mo_hinh/kieu_du_lieu.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

const _avColors = [Color(0xFF4F46E5), Color(0xFF0891B2), Color(0xFF059669), Color(0xFFD97706), Color(0xFFDB2777), Color(0xFF7C3AED)];
Color _avC(String s) => _avColors[s.codeUnits.first % _avColors.length];
String _avI(String name) { final p = name.trim().split(' '); return p.length >= 2 ? '${p[p.length-2][0]}${p[p.length-1][0]}'.toUpperCase() : name.isNotEmpty ? name[0].toUpperCase() : '?'; }
class _Av extends StatelessWidget {
  final String ten; final double size;
  const _Av(this.ten, {this.size = 38});
  @override Widget build(BuildContext context) => Container(
    width: size, height: size, decoration: BoxDecoration(color: _avC(ten), shape: BoxShape.circle),
    alignment: Alignment.center,
    child: Text(_avI(ten), style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: size * 0.37)),
  );
}

final _dsMockTK = <TaiKhoanNguoiDung>[
  TaiKhoanNguoiDung(id: 'U1', tenDangNhap: 'admin', tenHienThi: 'Quản Trị Viên', vaiTro: VaiTroTK.admin, ngayTao: '01/01/2025'),
  TaiKhoanNguoiDung(id: 'U2', tenDangNhap: 'an.nv', tenHienThi: 'Nguyễn Văn An', vaiTro: VaiTroTK.sale, maSellerLienKet: 'S1', ngayTao: '15/01/2025'),
  TaiKhoanNguoiDung(id: 'U3', tenDangNhap: 'binh.tt', tenHienThi: 'Trần Thị Bình', vaiTro: VaiTroTK.sale, maSellerLienKet: 'S2', ngayTao: '20/03/2025'),
  TaiKhoanNguoiDung(id: 'U4', tenDangNhap: 'purchase1', tenHienThi: 'Nhân Viên Mua', vaiTro: VaiTroTK.purchase, ngayTao: '01/04/2025'),
];

class _BadgeVaiTro extends StatelessWidget {
  final VaiTroTK vaiTro;
  const _BadgeVaiTro(this.vaiTro);
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
    decoration: BoxDecoration(color: vaiTro.mauNen, borderRadius: BorderRadius.circular(99)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(_vaiTroIcon(vaiTro), size: 12, color: vaiTro.mau),
      const SizedBox(width: 4),
      Text(vaiTro.nhan, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: vaiTro.mau)),
    ]),
  );
  IconData _vaiTroIcon(VaiTroTK vt) {
    switch (vt) {
      case VaiTroTK.admin: return Icons.shield;
      case VaiTroTK.sale: return Icons.people;
      case VaiTroTK.purchase: return Icons.shopping_cart;
    }
  }
}

class _ModalFormTK extends StatefulWidget {
  final TaiKhoanNguoiDung? suaTK;
  final ValueChanged<Map<String, dynamic>> onLuu;
  const _ModalFormTK({this.suaTK, required this.onLuu});
  @override State<_ModalFormTK> createState() => _ModalFormTKState();
}

class _ModalFormTKState extends State<_ModalFormTK> {
  late TextEditingController _tenDNCtrl, _tenHTCtrl, _pwCtrl, _sellerIdCtrl;
  late VaiTroTK _vaiTro;
  late bool _hoatDong;

  @override void initState() {
    super.initState();
    final tk = widget.suaTK;
    _tenDNCtrl = TextEditingController(text: tk?.tenDangNhap ?? '');
    _tenHTCtrl = TextEditingController(text: tk?.tenHienThi ?? '');
    _pwCtrl = TextEditingController();
    _sellerIdCtrl = TextEditingController(text: tk?.maSellerLienKet ?? '');
    _vaiTro = tk?.vaiTro ?? VaiTroTK.sale;
    _hoatDong = tk?.dangHoatDong ?? true;
  }
  @override void dispose() { _tenDNCtrl.dispose(); _tenHTCtrl.dispose(); _pwCtrl.dispose(); _sellerIdCtrl.dispose(); super.dispose(); }

  @override Widget build(BuildContext context) {
    final toi = Theme.of(context).brightness == Brightness.dark;
    final suaMode = widget.suaTK != null;
    return AlertDialog(
      backgroundColor: ChuDe.mauMatTheo(toi),
      title: Text(suaMode ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới', style: TextStyle(fontSize: 15, color: ChuDe.mauChuTheo(toi))),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        _oI('Tên đăng nhập *', _tenDNCtrl, toi, disabled: suaMode),
        _oI('Tên hiển thị *', _tenHTCtrl, toi),
        _oI(suaMode ? 'Mật khẩu mới (trống = giữ)' : 'Mật khẩu *', _pwCtrl, toi, isPass: true),
        const SizedBox(height: 8),
        Text('VAI TRÒ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ChuDe.mauNhatTheo(toi), letterSpacing: 0.5)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
          decoration: BoxDecoration(color: ChuDe.mauInputTheo(toi), borderRadius: BorderRadius.circular(10), border: Border.all(color: ChuDe.mauVienTheo(toi))),
          child: DropdownButton<VaiTroTK>(
            isExpanded: true, underline: const SizedBox(), value: _vaiTro,
            dropdownColor: ChuDe.mauMatTheo(toi),
            onChanged: (v) => setState(() => _vaiTro = v!),
            items: VaiTroTK.values.map((vt) => DropdownMenuItem(value: vt, child: Text('${_vaiTroEmoji(vt)} ${vt.nhan}', style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi))))).toList(),
          ),
        ),
        if (_vaiTro == VaiTroTK.sale) ...[const SizedBox(height: 10), _oI('Seller ID liên kết', _sellerIdCtrl, toi)],
        if (suaMode) ...[
          const SizedBox(height: 10),
          Row(children: [
            Checkbox(value: _hoatDong, onChanged: (v) => setState(() => _hoatDong = v!), activeColor: ChuDe.mauTruc(toi)),
            Text('Tài khoản đang hoạt động', style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi))),
          ]),
        ],
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text('Hủy', style: TextStyle(color: ChuDe.mauNhatTheo(toi)))),
        ElevatedButton(
          onPressed: () {
            widget.onLuu({
              'tenDangNhap': _tenDNCtrl.text, 'tenHienThi': _tenHTCtrl.text,
              'matKhau': _pwCtrl.text, 'vaiTro': _vaiTro,
              'maSellerLienKet': _vaiTro == VaiTroTK.sale ? _sellerIdCtrl.text : null,
              'dangHoatDong': _hoatDong,
            });
            Navigator.pop(context);
          },
          style: ElevatedButton.styleFrom(backgroundColor: ChuDe.mauTruc(toi), foregroundColor: Colors.white),
          child: Text(suaMode ? 'Lưu thay đổi' : 'Tạo tài khoản'),
        ),
      ],
    );
  }
  String _vaiTroEmoji(VaiTroTK vt) { switch (vt) { case VaiTroTK.admin: return '👑'; case VaiTroTK.sale: return '💼'; case VaiTroTK.purchase: return '🛒'; } }
  Widget _oI(String nhan, TextEditingController ctrl, bool toi, {bool isPass = false, bool disabled = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      controller: ctrl, obscureText: isPass, enabled: !disabled,
      style: TextStyle(fontSize: 13, color: ChuDe.mauChuTheo(toi)),
      decoration: InputDecoration(labelText: nhan, labelStyle: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi)), isDense: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
    ),
  );
}

class ModuleTaiKhoan extends StatefulWidget {
  const ModuleTaiKhoan({super.key});
  @override State<ModuleTaiKhoan> createState() => _ModuleTaiKhoanState();
}

class _ModuleTaiKhoanState extends State<ModuleTaiKhoan> {
  List<TaiKhoanNguoiDung> _dsTK = List.from(_dsMockTK);

  @override Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    return Column(children: [
      // Header
      Container(
        padding: const EdgeInsets.all(16),
        color: ChuDe.mauMatTheo(toi),
        child: Row(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Quản lý tài khoản', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi))),
            Text('${_dsTK.length} tài khoản trong hệ thống', style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi))),
          ]),
          const Spacer(),
          ElevatedButton.icon(
            onPressed: () => showDialog(context: context, builder: (_) => _ModalFormTK(onLuu: (data) => setState(() {
              _dsTK.add(TaiKhoanNguoiDung(
                id: 'U${_dsTK.length + 1}', tenDangNhap: data['tenDangNhap'],
                tenHienThi: data['tenHienThi'], vaiTro: data['vaiTro'],
                maSellerLienKet: data['maSellerLienKet'],
                dangHoatDong: data['dangHoatDong'] ?? true,
                ngayTao: '${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
              ));
            }))),
            icon: const Icon(Icons.add, size: 14),
            label: const Text('Thêm tài khoản', style: TextStyle(fontSize: 12)),
            style: ElevatedButton.styleFrom(backgroundColor: ChuDe.mauTruc(toi), foregroundColor: Colors.white),
          ),
        ]),
      ),
      Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
      Expanded(
        child: ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: _dsTK.length,
          itemBuilder: (_, i) {
            final tk = _dsTK[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: tk.dangHoatDong ? ChuDe.mauMatTheo(toi) : ChuDe.mauInputTheo(toi),
                borderRadius: BorderRadius.circular(ChuDe.bKinhRadius),
                border: Border.all(color: ChuDe.mauVienTheo(toi)),
              ),
              child: Row(children: [
                _Av(tk.tenHienThi),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(tk.tenHienThi, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: ChuDe.mauChuTheo(toi))),
                  Row(children: [
                    Icon(Icons.code, size: 11, color: ChuDe.mauNhatTheo(toi)),
                    const SizedBox(width: 3),
                    Text(tk.tenDangNhap, style: TextStyle(fontSize: 11, color: ChuDe.mauNhatTheo(toi), fontFamily: 'monospace')),
                  ]),
                  const SizedBox(height: 4),
                  Row(children: [
                    _BadgeVaiTro(tk.vaiTro),
                    const SizedBox(width: 8),
                    Row(children: [
                      Container(width: 6, height: 6, decoration: BoxDecoration(color: tk.dangHoatDong ? const Color(0xFF059669) : const Color(0xFF9CA3AF), shape: BoxShape.circle)),
                      const SizedBox(width: 4),
                      Text(tk.dangHoatDong ? 'Hoạt động' : 'Đã tắt', style: TextStyle(fontSize: 11, color: tk.dangHoatDong ? const Color(0xFF059669) : ChuDe.mauNhatTheo(toi))),
                    ]),
                  ]),
                  Text('Ngày tạo: ${tk.ngayTao}', style: TextStyle(fontSize: 10, color: ChuDe.mauNhatTheo(toi))),
                ])),
                Row(children: [
                  IconButton(
                    onPressed: () => showDialog(context: context, builder: (_) => _ModalFormTK(suaTK: tk, onLuu: (data) => setState(() {
                      tk.tenHienThi = data['tenHienThi']; tk.vaiTro = data['vaiTro'];
                      tk.maSellerLienKet = data['maSellerLienKet']; tk.dangHoatDong = data['dangHoatDong'];
                    }))),
                    icon: Icon(Icons.edit_outlined, size: 16, color: ChuDe.mauNhatTheo(toi)),
                    tooltip: 'Chỉnh sửa',
                  ),
                  IconButton(
                    onPressed: () => showDialog(context: context, builder: (_) => AlertDialog(
                      backgroundColor: ChuDe.mauMatTheo(toi),
                      title: Text('Xác nhận xóa', style: TextStyle(color: ChuDe.mauChuTheo(toi))),
                      content: Text('Xóa tài khoản "${tk.tenHienThi}"?', style: TextStyle(color: ChuDe.mauChuTheo(toi))),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
                        ElevatedButton(onPressed: () { setState(() => _dsTK.removeWhere((u) => u.id == tk.id)); Navigator.pop(context); },
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)), child: const Text('Xóa', style: TextStyle(color: Colors.white))),
                      ],
                    )),
                    icon: const Icon(Icons.delete_outline, size: 16, color: Color(0xFFDC2626)),
                    tooltip: 'Xóa',
                  ),
                ]),
              ]),
            );
          },
        ),
      ),
    ]);
  }
}
