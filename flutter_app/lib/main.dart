import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'kho_luu_tru/kho_chinh.dart';
import 'giao_dien/khung_chinh/chu_de.dart';
import 'giao_dien/thanh_phan/thanh_ben.dart';
import 'giao_dien/thanh_phan/thanh_tren.dart';
import 'giao_dien/thanh_phan/form_nhap.dart';
import 'giao_dien/thanh_phan/xem_quan_ly.dart';
import 'giao_dien/thanh_phan/xem_ky_thuat.dart';
import 'giao_dien/thanh_phan/xem_lich_su.dart';
import 'giao_dien/thanh_phan/bao_gia.dart';
import 'giao_dien/thanh_phan/lenh_sx.dart';
import 'giao_dien/thanh_phan/khach_hang.dart';
import 'giao_dien/thanh_phan/quan_ly_seller.dart';
import 'giao_dien/thanh_phan/tai_khoan.dart';
import 'giao_dien/thanh_phan/cai_dat.dart';

void main() {
  runApp(ChangeNotifierProvider(
    create: (_) => KhoChinhLuuTru(),
    child: const UngDungChinh(),
  ));
}

class UngDungChinh extends StatelessWidget {
  const UngDungChinh({super.key});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    return MaterialApp(
      title: 'LTS Pricing — Tính Giá Bao Bì',
      debugShowCheckedModeBanner: false,
      themeMode: kho.cheDoGiaoDien,
      theme: ChuDe.themeSang(),
      darkTheme: ChuDe.themeToi(),
      home: const ManHinhChinh(),
    );
  }
}

// ─── Layout chính ─────────────────────────────────────────────────────────────
class ManHinhChinh extends StatelessWidget {
  const ManHinhChinh({super.key});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final mobile = MediaQuery.of(context).size.width < 768;

    if (mobile) {
      return _LayoutMobile();
    }
    return _LayoutDesktop(sidebarMo: kho.sidebarMo);
  }
}

// ─── Desktop layout ───────────────────────────────────────────────────────────
class _LayoutDesktop extends StatelessWidget {
  final bool sidebarMo;
  const _LayoutDesktop({required this.sidebarMo});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          ThanhBen(daMo: sidebarMo),
          Expanded(
            child: Column(
              children: [
                const ThanhTren(),
                const Expanded(child: _RouterModule()),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Mobile layout (drawer + bottom nav) ─────────────────────────────────────
class _LayoutMobile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: ChuDe.mauMatTheo(toi),
        elevation: 1,
        leading: Builder(builder: (ctx) => IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        )),
        title: Text(
          _tenModuleNgan[kho.moduleDangXem] ?? 'LTS Pricing',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: ChuDe.mauChuTheo(toi)),
        ),
        actions: [
          ToggleGiaoDienNho(laToi: toi, onNhan: kho.doiGiaoDien),
          const SizedBox(width: 8),
        ],
      ),
      drawer: SizedBox(
        width: 280,
        child: ThanhBen(daMo: true),
      ),
      body: const _RouterModule(),
    );
  }
}

// ─── Router module → widget ───────────────────────────────────────────────────
class _RouterModule extends StatelessWidget {
  const _RouterModule();

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;

    switch (kho.moduleDangXem) {
      case 'lichSu':
        return const XemLichSu();
      case 'baoGia':
        return const ModuleBaoGia();
      case 'lenhSX':
        return const ModuleLenhSX();
      case 'khachHang':
        return const ModuleKhachHang();
      case 'seller':
        return const ModuleQuanLySeller();
      case 'taiKhoan':
        return const ModuleTaiKhoan();
      case 'bangDinhMuc':
      case 'caiDat':
        return const ModuleCaiDat();
      default:
        return _ManHinhMayTinh(toi: toi);
    }
  }
}


// ─── Module máy tính — layout 2 cột desktop ───────────────────────────────────
class _ManHinhMayTinh extends StatelessWidget {
  final bool toi;
  const _ManHinhMayTinh({required this.toi});

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final mobile = MediaQuery.of(context).size.width < 768;
    final layout = kho.cheDoLayout;

    // Mobile → chỉ form nhập hoặc kết quả
    if (mobile) return const _MayTinhMobile();

    // Stacked layout (1 cột max 800px)
    if (layout == CheDoLayout.xepChong) {
      return SingleChildScrollView(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Column(children: [
              Container(color: ChuDe.mauMatTheo(toi), child: const FormNhap()),
              Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
              const XemQuanLy(),
            ]),
          ),
        ),
      );
    }

    // Bento layout (TODO: full width tiles)
    if (layout == CheDoLayout.bento) {
      return _MayTinhDuaCot(toi: toi, kho: kho, leftWidth: 299);
    }

    // Default & Rộng — 2 cột
    final leftWidth = layout == CheDoLayout.rong ? 299.0 : 345.0;
    return _MayTinhDuaCot(toi: toi, kho: kho, leftWidth: leftWidth);
  }
}

// ─── 2-cột layout ─────────────────────────────────────────────────────────────
class _MayTinhDuaCot extends StatelessWidget {
  final bool toi;
  final KhoChinhLuuTru kho;
  final double leftWidth;
  const _MayTinhDuaCot({required this.toi, required this.kho, required this.leftWidth});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Cột trái: Form nhập
        SizedBox(
          width: leftWidth,
          child: Container(
            color: ChuDe.mauMatTheo(toi),
            child: const FormNhap(),
          ),
        ),
        VerticalDivider(width: 1, color: ChuDe.mauVienTheo(toi)),

        // Cột phải: Tab bar + nội dung
        Expanded(
          child: Column(
            children: [
              // Tab bar
              Container(
                color: ChuDe.mauMatTheo(toi),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(children: [
                  _TabItem(index: 0, nhan: 'Quản lý', kho: kho, toi: toi),
                  _TabItem(index: 1, nhan: 'Kỹ thuật', kho: kho, toi: toi),
                  _TabItem(index: 2, nhan: 'Lịch sử', kho: kho, toi: toi),
                ]),
              ),
              Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
              Expanded(child: _TabContent(tab: kho.tabKetQua)),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Mobile máy tính (tab chuyển đổi) ────────────────────────────────────────
class _MayTinhMobile extends StatefulWidget {
  const _MayTinhMobile();

  @override
  State<_MayTinhMobile> createState() => _MayTinhMobileState();
}

class _MayTinhMobileState extends State<_MayTinhMobile> {
  int _tab = 0; // 0=nhập liệu, 1=kết quả

  @override
  Widget build(BuildContext context) {
    final kho = context.watch<KhoChinhLuuTru>();
    final toi = kho.cheDoGiaoDien == ThemeMode.dark;

    return Column(
      children: [
        // Bottom-style tab switcher
        Container(
          color: ChuDe.mauMatTheo(toi),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: Row(children: [
            Expanded(child: _TabItem(index: 0, nhan: '📝 Nhập liệu', kho: kho, toi: toi,
              customActive: _tab == 0, onTap: () => setState(() => _tab = 0))),
            Expanded(child: _TabItem(index: 1, nhan: '📊 Kết quả', kho: kho, toi: toi,
              customActive: _tab == 1, onTap: () => setState(() => _tab = 1),
              showBadge: kho.ketQua != null && _tab == 0)),
          ]),
        ),
        Divider(height: 1, color: ChuDe.mauVienTheo(toi)),
        Expanded(
          child: _tab == 0
              ? Container(color: ChuDe.mauMatTheo(toi), child: const FormNhap())
              : _TabContent(tab: kho.tabKetQua),
        ),
      ],
    );
  }
}

// ─── Tab item ─────────────────────────────────────────────────────────────────
class _TabItem extends StatelessWidget {
  final int index;
  final String nhan;
  final KhoChinhLuuTru kho;
  final bool toi;
  final bool? customActive;
  final VoidCallback? onTap;
  final bool showBadge;

  const _TabItem({
    required this.index,
    required this.nhan,
    required this.kho,
    required this.toi,
    this.customActive,
    this.onTap,
    this.showBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    final active = customActive ?? (kho.tabKetQua == index);
    return GestureDetector(
      onTap: onTap ?? () => kho.doiTab(index),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            margin: const EdgeInsets.only(right: 3),
            decoration: BoxDecoration(
              color: active ? ChuDe.mauTrucSang : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              boxShadow: active
                  ? [BoxShadow(color: ChuDe.mauTrucSang.withAlpha(76), blurRadius: 8)]
                  : [],
            ),
            child: Text(
              nhan,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                color: active ? Colors.white : ChuDe.mauNhatTheo(toi),
              ),
            ),
          ),
          if (showBadge)
            Positioned(
              top: 2, right: 6,
              child: Container(
                width: 7, height: 7,
                decoration: const BoxDecoration(color: ChuDe.mauDo, shape: BoxShape.circle),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Tab content ──────────────────────────────────────────────────────────────
class _TabContent extends StatelessWidget {
  final int tab;
  const _TabContent({required this.tab});

  @override
  Widget build(BuildContext context) {
    switch (tab) {
      case 1:  return const XemKyThuat();
      case 2:  return const XemLichSu();
      default: return const XemQuanLy();
    }
  }
}

// ─── Toggle theme nhỏ (cho mobile appbar) ─────────────────────────────────────
class ToggleGiaoDienNho extends StatelessWidget {
  final bool laToi;
  final VoidCallback onNhan;
  const ToggleGiaoDienNho({super.key, required this.laToi, required this.onNhan});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(laToi ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
      onPressed: onNhan,
      iconSize: 20,
      tooltip: laToi ? 'Chuyển sáng' : 'Chuyển tối',
    );
  }
}

// ─── Tên module ngắn cho mobile appbar ───────────────────────────────────────
const _tenModuleNgan = {
  'mayTinh':     'Tính Giá',
  'baoGia':      'Báo Giá',
  'lichSu':      'Lịch Sử',
  'lenhSX':      'Lệnh SX',
  'bangDinhMuc': 'Định Mức',
  'khachHang':   'Khách Hàng',
  'seller':      'Seller',
  'taiKhoan':    'Tài Khoản',
  'caiDat':      'Cài Đặt',
};
