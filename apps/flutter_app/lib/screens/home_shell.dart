// ═══════════════════════════════════════════════════════════════════════════
// HomeShell — auth-gated shell (mirror VoTrang.tsx cùng cơ chế):
//   HomeGate chặn guest trước khi mount; trong này mọi tab mở thẳng.
//   content #f4f7fb + bottom tab bar 5 mục:
//     Tổng quan · Tính giá · Khách hàng · Cấu hình · Quản trị.
//   Lịch sử + LSX mở từ hub Tính giá qua module route.
//
// Đổi 26/09/2026: tab 4 "Đơn hàng" (vỏ LSXScreen) → "Cấu hình" (CauHinhScreen)
// cho khớp web mobile (MOBILE_HUBS.pricing_config). LSX vẫn vào từ hub Tính giá.
// Tab 5 "Thêm" → "Quản trị" (màn Quản trị hệ thống = nhóm system web).
//
// Tính giá & báo giá (từ 18/09/2026): tab "Tính giá" không mở thẳng calculator
// nữa mà là hub TinhGiaHubScreen (mirror web mobile MOBILE_HUBS.pricing_quote).
// Calculator push qua ModuleRoute với PopScope confirm "Chưa lưu báo giá"
// khi isDirty — tương đương dialog cũ trên tab switch.
//
// Khách hàng (từ 18/09/2026): tab "Khách hàng" là hub KhachHangHubScreen
// (mirror web mobile MOBILE_HUBS.customers). Push KhachHangScreen (list) và
// KhachHangHubScreen qua ModuleRoute — KHÔNG cần PopScope vì list KH
// không có form state đang sửa (sheet modal tự dispose).
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/auth/auth_header_actions.dart';
import '../widgets/auth/bat_buoc_dat_pin.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_module_route.dart';
import 'cau_hinh_screen.dart';
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

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  int _index = 0;
  Timer? _lamMoiPhienTimer;
  AppState? _appState;
  String? _tokenDaHen;

  static const _tabs = [
    LtsTabItem('Tổng quan', Icons.space_dashboard_outlined),
    LtsTabItem('Tính giá', Icons.calculate_outlined),
    LtsTabItem('Khách hàng', Icons.people_outline_rounded),
    LtsTabItem('Cấu hình', Icons.tune_rounded),
    LtsTabItem('Quản trị', Icons.more_horiz_rounded),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final s = context.read<AppState>();
      _appState = s;
      s.addListener(_datLaiTimerLamMoi);
      _datLaiTimerLamMoi();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _lamMoiPhienTimer?.cancel();
    _appState?.removeListener(_datLaiTimerLamMoi);
    super.dispose();
  }

  /// Làm mới phiên chủ động theo `exp` JWT (mirror VoTrang.tsx timer web).
  /// Chỉ hẹn lại khi access token ĐỔI — tránh reset timer mỗi notifyListeners.
  void _datLaiTimerLamMoi() {
    final s = _appState;
    final token = s?.accessToken;
    if (s == null || !s.isAuthenticated || token == null || token.isEmpty) {
      _lamMoiPhienTimer?.cancel();
      _lamMoiPhienTimer = null;
      _tokenDaHen = null;
      return;
    }
    if (token == _tokenDaHen) return;
    _tokenDaHen = token;
    _lamMoiPhienTimer?.cancel();
    final cho = thoiGianChoLamMoiPhien(token);
    _lamMoiPhienTimer = Timer(Duration(milliseconds: cho), () {
      if (!mounted) return;
      _tokenDaHen = null;
      s.lamMoiPhien();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    final s = _appState;
    final token = s?.accessToken;
    // Timer có thể bị treo khi app suspend → luôn hẹn lại khi quay lại.
    _tokenDaHen = null;
    if (s != null &&
        s.isAuthenticated &&
        token != null &&
        token.isNotEmpty &&
        canLamMoiNgay(token)) {
      s.lamMoiPhien();
    }
    _datLaiTimerLamMoi();
  }

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
        setState(() => _index = 3);
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
  // PHẢI bọc ModuleRoute (Scaffold): MaterialPageRoute không cung cấp Material —
  // thiếu nó thì mọi TextField/InkWell trong màn tính giá văng
  // "No Material widget found" khi nhập liệu.
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
                child: const ModuleRoute(
                  title: 'Tạo bảng tính giá',
                  child: TinhGiaScreen(embedded: true),
                ),
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
            onGoCauHinh: () => setState(() => _index = 3),
            onOpenKhachHang: () => setState(() => _index = 2),
          ),
          TinhGiaHubScreen(
            onOpenTinhGia: _pushTinhGiaModule,
          ),
          const KhachHangHubScreen(),
          const CauHinhScreen(),
          const ThemScreen(),
        ],
      ),
    );
  }
}
