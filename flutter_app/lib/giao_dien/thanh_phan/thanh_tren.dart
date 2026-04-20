// giao_dien/thanh_phan/thanh_tren.dart — Topbar (đồng bộ TopHeader trong AppShell.tsx)
// Khớp:
//   .lts-topbar          → height 60, surface bg, border-bottom var(--border), shadow-sm
//   .lts-topbar-title    → 0.95rem, weight 600
//   .lts-new-btn         → border accent, bg accent 7%, pill 20px
//   .toolbar-group       → bg surface2, border, padding 3
//   .theme-toggle        → 40×22 pill
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../kho_luu_tru/kho_chinh.dart';
import '../khung_chinh/chu_de.dart';
import 'tien_ich.dart';

const _tenModules = {
  'mayTinh':     'Tính giá Sản phẩm',
  'baoGia':      'Danh sách Báo giá',
  'lichSu':      'Lịch sử tính giá',
  'lenhSX':      'Danh sách Lệnh Sản Xuất',
  'bangDinhMuc': 'Bảng định mức chung',
  'khachHang':   'Quản lý Khách hàng',
  'seller':      'Báo cáo Nhân sự',
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
      height: ChuDe.chieuCaoTopbar, // 60 — khớp với chiều cao logo sidebar
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: ChuDe.mauMatTheo(toi),
        border: Border(bottom: BorderSide(color: ChuDe.mauVienTheo(toi))),
        boxShadow: ChuDe.bongNho(toi),
      ),
      child: Row(
        children: [
          // ── Tiêu đề module (.lts-topbar-title) ──────────────────────────
          Flexible(
            child: Text(
              tenModule,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14, // 0.95rem ≈ 13.3 — chọn 14 cho dễ đọc
                fontWeight: FontWeight.w600,
                color: ChuDe.mauChuTheo(toi),
              ),
            ),
          ),

          // ── Nút "Mới" (.lts-new-btn) — chỉ ở module mayTinh ────────────
          if (laMayTinh) ...[
            const SizedBox(width: 10),
            _NutMoi(kho: kho, toi: toi),
          ],

          const Spacer(),

          // ── Toolbar layout & mật độ (chỉ desktop + mayTinh) ────────────
          if (!mobile && laMayTinh) ...[
            _LayoutToggleGroup(kho: kho, toi: toi),
            const SizedBox(width: 8),
            _MatDoToggleGroup(kho: kho, toi: toi),
            const SizedBox(width: 8),
          ],

          // ── Theme toggle (.theme-toggle 40×22) ─────────────────────────
          ToggleGiaoDien(laToi: toi, onNhan: kho.doiGiaoDien),

          // ── Nút In + Xuất (desktop) ────────────────────────────────────
          if (!mobile) ...[
            const SizedBox(width: 8),
            NutNho(nhan: '🖨 In', onNhan: () {}),
            const SizedBox(width: 6),
            NutNho(nhan: '📥 Xuất', onNhan: () {}),
          ],
        ],
      ),
    );
  }
}

// ─── Nút "+ Mới" (.lts-new-btn) ──────────────────────────────────────────────
class _NutMoi extends StatefulWidget {
  final KhoChinhLuuTru kho;
  final bool toi;
  const _NutMoi({required this.kho, required this.toi});

  @override
  State<_NutMoi> createState() => _NutMoiState();
}

class _NutMoiState extends State<_NutMoi> {
  bool _hover = false;

  void _onTap(BuildContext context) {
    if (widget.kho.dangSua) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Chưa lưu báo giá'),
          content: const Text(
              'Bảng tính hiện tại có thay đổi chưa được lưu vào lịch sử.\nTạo mới sẽ xóa toàn bộ dữ liệu đang nhập.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Quay lại')),
            TextButton(
              onPressed: () { widget.kho.resetForm(); Navigator.pop(ctx); },
              child: const Text('Tạo mới (không lưu)', style: TextStyle(color: Color(0xFFEF4444))),
            ),
          ],
        ),
      );
    } else {
      widget.kho.resetForm();
    }
  }

  @override
  Widget build(BuildContext context) {
    final accent = ChuDe.mauTruc(widget.toi);
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      cursor: SystemMouseCursors.click,
      child: Tooltip(
        message: 'Tạo bảng tính giá mới',
        child: GestureDetector(
          onTap: () => _onTap(context),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              border: Border.all(color: accent, width: 1.5),
              color: accent.withValues(alpha: _hover ? 0.15 : 0.07),
              borderRadius: BorderRadius.circular(20), // pill
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.add, size: 15, color: accent),
                const SizedBox(width: 5),
                Text('Mới', style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w700, color: accent,
                )),
                if (widget.kho.dangSua) ...[
                  const SizedBox(width: 5),
                  Container(
                    width: 7, height: 7,
                    decoration: const BoxDecoration(
                      color: Color(0xFFEF4444), shape: BoxShape.circle,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Layout toggle group (.toolbar-group) ────────────────────────────────────
class _LayoutToggleGroup extends StatelessWidget {
  final KhoChinhLuuTru kho;
  final bool toi;
  const _LayoutToggleGroup({required this.kho, required this.toi});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Bố cục',
      child: Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: ChuDe.mauMat2Theo(toi),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: ChuDe.mauVienTheo(toi)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _LayoutBtn(icon: '☰', tip: 'Mặc định', layout: CheDoLayout.macDinh, kho: kho, toi: toi),
            _LayoutBtn(icon: '▤', tip: 'Xếp chồng', layout: CheDoLayout.xepChong, kho: kho, toi: toi),
            _LayoutBtn(icon: '⬚', tip: 'Rộng',     layout: CheDoLayout.rong,     kho: kho, toi: toi),
            _LayoutBtn(icon: '◫', tip: 'Bento',    layout: CheDoLayout.bento,    kho: kho, toi: toi),
          ],
        ),
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
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: active ? ChuDe.mauMatTheo(toi) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: active ? ChuDe.bongNho(toi) : const [],
          ),
          alignment: Alignment.center,
          child: Text(
            icon,
            style: TextStyle(
              fontSize: 12,
              fontWeight: active ? FontWeight.w600 : FontWeight.w500,
              color: active ? ChuDe.mauTruc(toi) : ChuDe.mauNhatTheo(toi),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Mật độ toggle group (.toolbar-group) ────────────────────────────────────
class _MatDoToggleGroup extends StatelessWidget {
  final KhoChinhLuuTru kho;
  final bool toi;
  const _MatDoToggleGroup({required this.kho, required this.toi});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Mật độ',
      child: Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: ChuDe.mauMat2Theo(toi),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: ChuDe.mauVienTheo(toi)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _MatDoBtn(label: 'S', tip: 'Gọn',    matDo: MatDo.gon,    kho: kho, toi: toi),
            _MatDoBtn(label: 'M', tip: 'Vừa',    matDo: MatDo.vua,    kho: kho, toi: toi),
            _MatDoBtn(label: 'L', tip: 'Thoáng', matDo: MatDo.thoang, kho: kho, toi: toi),
          ],
        ),
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
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: active ? ChuDe.mauMatTheo(toi) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: active ? ChuDe.bongNho(toi) : const [],
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: active ? ChuDe.mauTruc(toi) : ChuDe.mauNhatTheo(toi),
            ),
          ),
        ),
      ),
    );
  }
}
