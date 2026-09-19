// ═══════════════════════════════════════════════════════════════════════════
// TinhGiaHubScreen — mirror web mobile MOBILE_HUBS.pricing_quote
// (apps/web/src/components/layout/VoTrang.tsx:538-616):
//   Section "Tính giá & Báo giá" — 7 action card:
//     1. Tạo bảng tính giá   → push ModuleRoute(TinhGiaScreen)
//     2. Tạo bảng báo giá    → push Route(TaoBaoGiaWizard)
//     3. Tạo lệnh sản xuất   → push Route(TaoLsxWizard)
//     4. Danh sách tính giá  → push ModuleRoute(LichSuScreen)
//     5. Danh sách báo giá   → push Route(DanhSachBaoGiaScreen)
//     6. Danh sách lệnh SX   → push ModuleRoute(LSXScreen)
//     7. Nhật ký thao tác    → push Route(NhatKyThaoTacScreen)
//
// Tất cả 7 card đều mở được (sprint 18/09/2026: thêm BG/LSX wizard + audit
// log + Danh sách BG). Mỗi card nền đều push 1 route thật — không còn
// `locked: true`.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../theme/lts_tokens.dart';
import '../widgets/auth/auth_header_actions.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_module_route.dart';
import '../widgets/lts/lts_surfaces.dart';
import 'danh_sach_bao_gia_screen.dart';
import 'lich_su_screen.dart';
import 'lsx_screen.dart';
import 'nhat_ky_thao_tac_screen.dart';
import 'tao_bao_gia_wizard.dart';
import 'tao_lsx_wizard.dart';

class TinhGiaHubScreen extends StatelessWidget {
  final VoidCallback onOpenTinhGia;
  const TinhGiaHubScreen({
    super.key,
    required this.onOpenTinhGia,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const LtsNavyHeader(
          hub: true,
          title: 'Tính giá & Báo giá',
          extras: [
            LtsHeaderBell(),
            SizedBox(width: 10),
            LtsHeaderAvatar(),
          ],
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
            children: [
              const LtsSectionLabel('Tính giá & Báo giá'),
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
        variant: LtsIconVariant.violet,
        icon: Icons.calculate_rounded,
        title: 'Tạo bảng tính giá',
        sub: 'Tính giá theo bảng đặc tả kỹ thuật nâng cao.',
        onTap: onOpenTinhGia,
      ),
      _Card(
        variant: LtsIconVariant.sky,
        icon: Icons.description_rounded,
        title: 'Tạo bảng báo giá',
        sub: 'Gom bảng tính + nộp duyệt cho khách hàng.',
        onTap: () => _pushRoute(
          context,
          title: 'Tạo bảng báo giá',
          child: const TaoBaoGiaWizard(),
        ),
      ),
      _Card(
        variant: LtsIconVariant.emerald,
        icon: Icons.precision_manufacturing_rounded,
        title: 'Tạo lệnh sản xuất',
        sub: 'LSX từ bảng tính đã khách duyệt.',
        onTap: () => _pushRoute(
          context,
          title: 'Tạo lệnh sản xuất',
          child: const TaoLsxWizard(),
        ),
      ),
      _Card(
        variant: LtsIconVariant.emerald,
        icon: Icons.history_rounded,
        title: 'Danh sách tính giá',
        sub: 'Lịch sử bảng tính đã lưu trên máy chủ.',
        onTap: () => _pushModule(
          context,
          title: 'Lịch sử báo giá',
          child: const LichSuScreen(),
        ),
      ),
      _Card(
        variant: LtsIconVariant.sky,
        icon: Icons.receipt_long_rounded,
        title: 'Danh sách báo giá',
        sub: 'Danh sách báo giá đã lập / chờ duyệt / đã duyệt.',
        onTap: () => _pushRoute(
          context,
          title: 'Danh sách báo giá',
          child: const DanhSachBaoGiaScreen(),
        ),
      ),
      _Card(
        variant: LtsIconVariant.slate,
        icon: Icons.list_alt_rounded,
        title: 'Danh sách lệnh sản xuất',
        sub: 'Theo dõi LSX đã tạo từ máy chủ.',
        onTap: () => _pushModule(
          context,
          title: 'Lệnh sản xuất',
          child: const LSXScreen(),
        ),
      ),
      _Card(
        variant: LtsIconVariant.orange,
        icon: Icons.manage_search_rounded,
        title: 'Nhật ký thao tác',
        sub: 'Theo dõi các thao tác trong hệ thống (auto-refresh 30s).',
        onTap: () => _pushRoute(
          context,
          title: 'Nhật ký thao tác',
          child: const NhatKyThaoTacScreen(),
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

  void _pushRoute(BuildContext context,
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
