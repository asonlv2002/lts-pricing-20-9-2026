// ═══════════════════════════════════════════════════════════════════════════
// HomeShell — mirror shell .lts-shell--mobile của web:
//   content #f4f7fb + bottom tab bar 5 mục (Hub · Tính giá · Khách hàng ·
//   Cấu hình · Tài khoản). Khách hàng/Tài khoản = khóa → sheet hướng dẫn web.
//   Lịch sử + LSX (màn có sẵn) mở từ hub qua module route (header navy).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_module_route.dart';
import '../widgets/lts/lts_overlay.dart';
import 'cau_hinh_screen.dart';
import 'hub_screen.dart';
import 'lich_su_screen.dart';
import 'lsx_screen.dart';
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
    LtsTabItem('Cấu hình', Icons.tune_outlined),
    LtsTabItem('Tài khoản', Icons.person_outline_rounded),
  ];

  void _onTab(int i) {
    if (i == 2 || i == 4) {
      _khoa(context, i == 2 ? 'Khách hàng' : 'Tài khoản & phân quyền');
      return;
    }
    setState(() => _index = i);
  }

  // AppState.requestTabSwitch dùng index hệ cũ (0=Giá,1=Lịch sử,2=Cấu hình,3=LSX)
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
          builder: (_) => ModuleRoute(title: title, child: child)),
    );
  }

  void _khoa(BuildContext context, String ten) {
    final p = LtsT.of(context);
    showLtsSheet(context,
        title: '$ten — bị khóa trên app',
        builder: (_) => Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.lock_outline_rounded,
                          size: 18, color: p.orange),
                      const SizedBox(width: 8),
                      Text(
                        'Tính năng này cần đăng nhập và đồng bộ server.',
                        style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: p.text),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Vui lòng dùng bản web để quản lý $ten: danh sách, '
                    'phân quyền và dữ liệu được đồng bộ trực tiếp với máy chủ.',
                    style:
                        TextStyle(fontSize: 12.5, color: p.muted, height: 1.5),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Đã hiểu'),
                    ),
                  ),
                ],
              ),
            ));
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
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
            onGoCauHinh: () => setState(() => _index = 3),
            onOpenLichSu: () =>
                _pushModule('Lịch sử báo giá', const LichSuScreen()),
            onOpenLSX: () => _pushModule('Lệnh sản xuất', const LSXScreen()),
          ),
          TinhGiaScreen(onGoHub: () => setState(() => _index = 0)),
          const SizedBox.shrink(), // tab khóa — không tới được
          const CauHinhScreen(),
          const SizedBox.shrink(),
        ],
      ),
    );
  }
}
