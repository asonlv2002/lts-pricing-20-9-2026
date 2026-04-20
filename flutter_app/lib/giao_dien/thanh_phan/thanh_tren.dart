// giao_dien/thanh_phan/thanh_tren.dart — TopHeader (giống TopHeader trong AppShell.tsx)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

final _tenModules = {
  'mayTinh':     'Tính giá Sản phẩm',
  'baoGia':      'Danh sách Báo giá',
  'lichSu':      'Lịch sử tính giá',
  'lenhSX':      'Lệnh Sản Xuất',
  'bangDinhMuc': 'Bảng định mức',
  'khachHang':   'Khách hàng (CRM)',
  'seller':      'Quản lý Seller',
  'taiKhoan':    'Tài khoản hệ thống',
  'caiDat':      'Cài đặt hệ thống',
};

class ThanhTren extends StatelessWidget {
  const ThanhTren({super.key});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;
    final tenModule = _tenModules[kho.moduleDangXem] ?? '';
    final laMayTinh = kho.moduleDangXem == 'mayTinh';
    final mobile = MediaQuery.of(context).size.width < 768;

    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        border: Border(bottom: BorderSide(color: ChuDe.mauVienTheo(toi))),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(15), blurRadius: 3)],
      ),
      child: Row(
        children: [
          // ── Tiêu đề module ─────────────────────────────────────────────────
          Text(tenModule, style: TextStyle(
            fontSize: 15, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi),
          )),

          // ── Nút Mới (chỉ mayTinh) ──────────────────────────────────────────
          if (laMayTinh) ...[
            const SizedBox(width: 10),
            InkWell(
              onTap: () {
                if (kho.dangSua) {
                  // Hiện dialog xác nhận
                  showDialog(context: context, builder: (ctx) => AlertDialog(
                    title: const Text('Tạo mới?'),
                    content: const Text('Bạn có thay đổi chưa lưu. Tạo mới sẽ xóa dữ liệu hiện tại.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
                      TextButton(onPressed: () { kho.resetForm(); Navigator.pop(ctx); }, child: const Text('Tạo mới', style: TextStyle(color: Colors.red))),
                    ],
                  ));
                } else {
                  kho.resetForm();
                }
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  border: Border.all(color: ChuDe.mauVienTheo(toi)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  Icon(Icons.add, size: 14, color: ChuDe.mauNhatTheo(toi)),
                  const SizedBox(width: 4),
                  Text('Mới', style: TextStyle(fontSize: 12, color: ChuDe.mauNhatTheo(toi))),
                  if (kho.dangSua) ...[
                    const SizedBox(width: 4),
                    Container(width: 6, height: 6, decoration: const BoxDecoration(color: ChuDe.mauDo, shape: BoxShape.circle)),
                  ],
                ]),
              ),
            ),
          ],

          const Spacer(),

          // ── Layout toggles (desktop + chỉ mayTinh) ────────────────────────
          if (!mobile && laMayTinh) ...[
            _LayoutToggleGroup(kho: kho, toi: toi),
            const SizedBox(width: 10),
            _MatDoToggleGroup(kho: kho, toi: toi),
            const SizedBox(width: 10),
          ],

          // ── Theme toggle ───────────────────────────────────────────────────
          ToggleGiaoDien(laToi: toi, onNhan: kho.doiGiaoDien),
          const SizedBox(width: 12),

          // ── Nút In + Xuất (desktop) ────────────────────────────────────────
          if (!mobile) ...[
            NutNho(nhan: '🖨 In', onNhan: () {}),
            const SizedBox(width: 6),
            NutNho(nhan: '📤 Xuất', onNhan: () {}),
          ],
        ],
      ),
    );
  }
}

// ─── Layout toggle group ──────────────────────────────────────────────────────
class _LayoutToggleGroup extends StatelessWidget {
  final KhoChinhLuuTru kho;
  final bool toi;
  const _LayoutToggleGroup({required this.kho, required this.toi});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: ChuDe.mauMat2Theo(toi),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _LayoutBtn(icon: '☰', tip: 'Mặc định', layout: CheDoLayout.macDinh, kho: kho, toi: toi),
          _LayoutBtn(icon: '▤', tip: 'Xếp chồng', layout: CheDoLayout.xepChong, kho: kho, toi: toi),
          _LayoutBtn(icon: '⬚', tip: 'Rộng', layout: CheDoLayout.rong, kho: kho, toi: toi),
          _LayoutBtn(icon: '◫', tip: 'Bento', layout: CheDoLayout.bento, kho: kho, toi: toi),
        ],
      ),
    );
  }
}

class _LayoutBtn extends StatelessWidget {
  final String icon;
  final String tip;
  final CheDoLayout layout;
  final KhoChinhLuuTru kho;
  final bool toi;
  const _LayoutBtn({required this.icon, required this.tip, required this.layout, required this.kho, required this.toi});

  @override
  Widget build(BuildContext context) {
    final active = kho.cheDoLayout == layout;
    return Tooltip(
      message: tip,
      child: GestureDetector(
        onTap: () => kho.doiLayout(layout),
        child: Container(
          width: 26, height: 24,
          decoration: BoxDecoration(
            color: active ? ChuDe.mauTruc(toi) : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
          ),
          alignment: Alignment.center,
          child: Text(icon, style: TextStyle(fontSize: 12, color: active ? Colors.white : ChuDe.mauNhatTheo(toi))),
        ),
      ),
    );
  }
}

// ─── Mật độ toggle group ──────────────────────────────────────────────────────
class _MatDoToggleGroup extends StatelessWidget {
  final KhoChinhLuuTru kho;
  final bool toi;
  const _MatDoToggleGroup({required this.kho, required this.toi});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: ChuDe.mauMat2Theo(toi),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: ChuDe.mauVienTheo(toi)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _MatDoBtn(label: 'S', tip: 'Gọn', matDo: MatDo.gon, kho: kho, toi: toi),
          _MatDoBtn(label: 'M', tip: 'Vừa', matDo: MatDo.vua, kho: kho, toi: toi),
          _MatDoBtn(label: 'L', tip: 'Thoáng', matDo: MatDo.thoang, kho: kho, toi: toi),
        ],
      ),
    );
  }
}

class _MatDoBtn extends StatelessWidget {
  final String label;
  final String tip;
  final MatDo matDo;
  final KhoChinhLuuTru kho;
  final bool toi;
  const _MatDoBtn({required this.label, required this.tip, required this.matDo, required this.kho, required this.toi});

  @override
  Widget build(BuildContext context) {
    final active = kho.matDo == matDo;
    return Tooltip(
      message: tip,
      child: GestureDetector(
        onTap: () => kho.doiMatDo(matDo),
        child: Container(
          width: 26, height: 24,
          decoration: BoxDecoration(
            color: active ? ChuDe.mauTruc(toi) : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
          ),
          alignment: Alignment.center,
          child: Text(label, style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w700,
            color: active ? Colors.white : ChuDe.mauNhatTheo(toi),
          )),
        ),
      ),
    );
  }
}
