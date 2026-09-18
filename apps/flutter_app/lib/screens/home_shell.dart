// ═══════════════════════════════════════════════════════════════════════════
// HomeShell — auth-gated shell (mirror VoTrang.tsx cùng cơ chế):
//   HomeGate chặn guest trước khi mount; trong này mọi tab mở thẳng.
//   content #f4f7fb + bottom tab bar 5 mục:
//     Tổng quan · Tính giá · Khách hàng · Đơn hàng · Thêm.
//   Lịch sử + LSX + Cấu hình (màn có sẵn) mở từ hub/thêm qua module route.
//
// Tính giá & báo giá (từ 18/09/2026): tab "Tính giá" không mở thẳng calculator
// nữa mà là hub TinhGiaHubScreen (mirror web mobile MOBILE_HUBS.pricing_quote).
// Calculator push qua ModuleRoute với PopScope confirm "Chưa lưu báo giá"
// khi isDirty — tương đương dialog cũ trên tab switch.
//
// Khách hàng (từ 18/09/2026): tab "Khách hàng" là hub KhachHangHubScreen
// (mirror web mobile MOBILE_HUBS.customers). Push KhachHangScreen (list) và
// KhachHangAuditLogScreen qua ModuleRoute — KHÔNG cần PopScope vì list KH
// không có form state đang sửa (sheet modal tự dispose).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/auth/auth_header_actions.dart';
import '../widgets/auth/bat_buoc_dat_pin.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_module_route.dart';
import 'cau_hinh_screen.dart';
import 'don_hang_screen.dart';
import 'hub_screen.dart';
import 'khach_hang_hub_screen.dart';
import 'lich_su_screen.dart';
import 'lsx_screen.dart';
import 'them_screen.dart';
import 'tinh_gia_hub_screen.dart';
import 'tinh_gia_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _tabs = [
    LtsTabItem('Tổng quan', Icons.space_dashboard_outlined),
    LtsTabItem('Tính giá', Icons.calculate_outlined),
    LtsTabItem('Khách hàng', Icons.people_outline_rounded),
    LtsTabItem('Đơn hàng', Icons.assignment_outlined),
    LtsTabItem('Thêm', Icons.more_horiz_rounded),
  ];

  void _onTab(int i) {
    setState(() => _index = i);
  }

  // Confirm rời màn calculator khi isDirty (mirror dialog web mobile).
  void _xacNhanRoiMan(BuildContext context, VoidCallback diTiep) {
    showDialog(
      context: context,
      builder: (dlgCtx) => AlertDialog(
        title: const Text('Chưa lưu báo giá'),
        content: const Text(
            'Thay đổi chưa được lưu sẽ bị mất khi rời khỏi màn tính giá.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dlgCtx),
            child: const Text('Ở lại'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626)),
            onPressed: () {
              Navigator.pop(dlgCtx);
              context.read<AppState>().isDirty = false;
              diTiep();
            },
            child: const Text('Rời khỏi màn',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // AppState.requestTabSwitch dùng index hệ cũ (0=Giá,1=Lịch sử,2=Cấu hình,3=LSX)
  // Tab "Giá" giờ là hub TinhGiaHubScreen; nếu cần vào thẳng calculator
  // thì push TinhGiaScreen(embedded:true) với PopScope.
  void _onLegacyRequest(int legacy) {
    switch (legacy) {
      case 0:
        setState(() => _index = 1);
        context.read<AppState>().requestCalcPane(0);
      case 1:
        _pushModule('Lịch sử báo giá', const LichSuScreen());
      case 2:
        _pushModule('Cấu hình tính giá', const CauHinhScreen());
      case 3:
        _pushModule('Lệnh sản xuất', const LSXScreen());
      default:
        setState(() => _index = 1);
    }
  }

  void _pushModule(String title, Widget child) {
    Navigator.of(context).push(
      MaterialPageRoute(
          builder: (_) => ModuleRoute(
              title: title,
              extras: const [
                LtsHeaderBell(),
                SizedBox(width: 10),
                LtsHeaderAvatar(),
              ],
              child: child)),
    );
  }

  // Push calculator từ hub "Tính giá" — wrap PopScope để confirm khi back
  // nếu user có thay đổi chưa lưu (mirror logic cũ trên tab switch).
  void _pushTinhGiaModule() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (routeCtx) {
          return Consumer<AppState>(
            builder: (ctx, s, _) {
              return PopScope(
                canPop: !s.isDirty,
                onPopInvokedWithResult: (didPop, _) {
                  if (didPop) return;
                  _xacNhanRoiMan(ctx, () {
                    s.isDirty = false;
                    Navigator.of(ctx).pop();
                  });
                },
                child: const TinhGiaScreen(embedded: true),
              );
            },
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    // Sau đăng nhập chưa có PIN → bắt buộc đặt PIN trước (mirror BatBuocDatPin).
    if (state.isAuthenticated && state.hasPin == false) {
      return const BatBuocDatPin();
    }
    if (state.requestedTabIndex != null) {
      final req = state.requestedTabIndex!;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        state.consumeTabRequest();
        _onLegacyRequest(req);
      });
    }

    final p = LtsT.of(context);

    return Scaffold(
      extendBody: false,
      backgroundColor: p.shellBg,
      bottomNavigationBar: LtsTabBar(
        items: _tabs,
        selected: _index,
        onSelect: _onTab,
      ),
      body: IndexedStack(
        index: _index,
        children: [
          HubScreen(
            onGoTinhGia: () => setState(() => _index = 1),
            onGoCauHinh: () =>
                _pushModule('Cấu hình tính giá', const CauHinhScreen()),
            onOpenKhachHang: () => setState(() => _index = 2),
            onOpenTaiKhoan: () => setState(() => _index = 4),
          ),
          TinhGiaHubScreen(
            onGoHub: () => setState(() => _index = 0),
            onOpenTinhGia: _pushTinhGiaModule,
          ),
          KhachHangHubScreen(
            onGoHub: () => setState(() => _index = 0),
          ),
          const DonHangScreen(),
          const ThemScreen(),
        ],
      ),
    );
  }
}
