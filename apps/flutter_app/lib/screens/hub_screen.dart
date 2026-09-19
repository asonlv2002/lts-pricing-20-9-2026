// ═══════════════════════════════════════════════════════════════════════════
// HubScreen — mirror .lts-mobile-hub (web mobile): header navy tối,
// action cards 108px, nhóm section. Không có stat card / pill action —
// chỉ còn 2 section: Cấu hình tính giá và Nhật ký.
//
// Tính giá & Báo giá (18/09/2026) đã có tab riêng → bỏ section "Tính giá &
// Báo giá" khỏi hub Tổng quan.
// Khách hàng (18/09/2026) cũng đã có tab riêng (KhachHangHubScreen) → bỏ
// section "Khách hàng" khỏi hub Tổng quan.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../theme/lts_tokens.dart';
import '../widgets/auth/auth_header_actions.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_surfaces.dart';

class HubScreen extends StatelessWidget {
  final VoidCallback onGoCauHinh;
  final VoidCallback onOpenKhachHang;
  const HubScreen({
    super.key,
    required this.onGoCauHinh,
    required this.onOpenKhachHang,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const LtsNavyHeader(
          hub: true,
          title: 'Tổng quan',
          extras: [
            LtsHeaderBell(),
            SizedBox(width: 10),
            LtsHeaderAvatar(),
          ],
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
            children: [
              LtsSectionLabel('Cấu hình tính giá'),
              const SizedBox(height: 12),
              ..._cards(context, [
                _Card(
                  variant: LtsIconVariant.sky,
                  icon: Icons.people_rounded,
                  title: 'Danh sách khách hàng',
                  sub: 'Mở tab "Khách hàng" ở thanh dưới.',
                  onTap: onOpenKhachHang,
                ),
                _Card(
                  variant: LtsIconVariant.emerald,
                  icon: Icons.inventory_2_rounded,
                  title: 'Vật tư / nguyên vật liệu',
                  sub: 'Giá NVL, mực in, khổ cuộn',
                  onTap: onGoCauHinh,
                ),
                _Card(
                  variant: LtsIconVariant.violet,
                  icon: Icons.factory_rounded,
                  title: 'Chi phí sản xuất',
                  sub: 'Hằng số in / ghép / cắt, lãi vay',
                  onTap: onGoCauHinh,
                ),
                _Card(
                  variant: LtsIconVariant.orange,
                  icon: Icons.trending_up_rounded,
                  title: 'Biên lợi nhuận',
                  sub: 'Bảng ngưỡng & cột LN',
                  onTap: onGoCauHinh,
                ),
                const _Card(
                  variant: LtsIconVariant.slate,
                  icon: Icons.bolt_rounded,
                  title: 'Chi phí sản xuất (nâng cao)',
                  sub: 'Cần đồng bộ server — dùng bản web',
                  locked: true,
                ),
              ]),
              const SizedBox(height: 12),
              LtsSectionLabel('Nhật ký'),
              const SizedBox(height: 12),
              ..._cards(context, const [
                _Card(
                  variant: LtsIconVariant.slate,
                  icon: Icons.receipt_long_rounded,
                  title: 'Nhật ký thao tác',
                  sub: 'Cần đăng nhập — dùng bản web',
                  locked: true,
                ),
              ]),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _cards(BuildContext context, List<_Card> cards) => [
        for (var i = 0; i < cards.length; i++) ...[
          if (i > 0) const SizedBox(height: 16),
          LtsActionCard(
            iconBox: LtsIconBox(icon: cards[i].icon, variant: cards[i].variant),
            title: cards[i].title,
            subtitle: cards[i].sub,
            locked: cards[i].locked,
            onTap: cards[i].onTap,
          ),
        ],
      ];
}

class _Card {
  final LtsIconVariant variant;
  final IconData icon;
  final String title;
  final String sub;
  final bool locked;
  final VoidCallback? onTap;
  const _Card({
    required this.variant,
    required this.icon,
    required this.title,
    required this.sub,
    this.locked = false,
    this.onTap,
  });
}
