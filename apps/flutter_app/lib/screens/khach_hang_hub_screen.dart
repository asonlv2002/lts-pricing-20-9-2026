// ═══════════════════════════════════════════════════════════════════════════
// KhachHangHubScreen — mirror web mobile MOBILE_HUBS.customers
// (apps/web/src/components/layout/VoTrang.tsx:618-642):
//   Section "Khách hàng" — 2 action card:
//     1. Danh sách khách hàng → push ModuleRoute(KhachHangScreen)
//     2. Nhật ký thao tác      → push ModuleRoute(KhachHangAuditLogScreen)
//
// Pattern y hệt TinhGiaHubScreen (xem apps/flutter_app/lib/screens/
// tinh_gia_hub_screen.dart). Hub KH không có card nào locked vì cả 2
// module đều có sẵn trong Flutter.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../theme/lts_tokens.dart';
import '../widgets/auth/auth_header_actions.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_module_route.dart';
import '../widgets/lts/lts_surfaces.dart';
import 'khach_hang_audit_log_screen.dart';
import 'khach_hang_screen.dart';

class KhachHangHubScreen extends StatelessWidget {
  final VoidCallback onGoHub;
  const KhachHangHubScreen({super.key, required this.onGoHub});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        LtsNavyHeader(
          hub: true,
          title: 'Khách hàng',
          subtitle: 'Hồ sơ, liên hệ, phân công',
          leading: LtsHeaderCircleButton(
            icon: Icons.space_dashboard_outlined,
            tooltip: 'Tổng quan',
            onTap: onGoHub,
          ),
          extras: const [
            LtsHeaderBell(),
            SizedBox(width: 10),
            LtsHeaderAvatar(),
          ],
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
            children: [
              const LtsSectionLabel('Khách hàng'),
              const SizedBox(height: 12),
              ..._cards(context),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _cards(BuildContext context) {
    final cards = <_Card>[
      _Card(
        variant: LtsIconVariant.sky,
        icon: Icons.people_rounded,
        title: 'Danh sách khách hàng',
        sub: 'Quản lý hồ sơ, liên hệ và phân công.',
        onTap: () => _pushModule(
          context,
          title: 'Khách hàng',
          child: const KhachHangScreen(),
        ),
      ),
      _Card(
        variant: LtsIconVariant.orange,
        icon: Icons.manage_search_rounded,
        title: 'Nhật ký thao tác',
        sub: 'Theo dõi thay đổi liên quan đến khách hàng.',
        onTap: () => _pushModule(
          context,
          title: 'Nhật ký khách hàng',
          child: const KhachHangAuditLogScreen(),
        ),
      ),
    ];
    return [
      for (var i = 0; i < cards.length; i++) ...[
        if (i > 0) const SizedBox(height: 16),
        LtsActionCard(
          iconBox:
              LtsIconBox(icon: cards[i].icon, variant: cards[i].variant),
          title: cards[i].title,
          subtitle: cards[i].sub,
          onTap: cards[i].onTap,
        ),
      ],
    ];
  }

  void _pushModule(BuildContext context,
      {required String title, required Widget child}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ModuleRoute(
          title: title,
          extras: const [
            LtsHeaderBell(),
            SizedBox(width: 10),
            LtsHeaderAvatar(),
          ],
          child: child,
        ),
      ),
    );
  }
}

class _Card {
  final LtsIconVariant variant;
  final IconData icon;
  final String title;
  final String sub;
  final VoidCallback? onTap;
  const _Card({
    required this.variant,
    required this.icon,
    required this.title,
    required this.sub,
    this.onTap,
  });
}
