// ═══════════════════════════════════════════════════════════════════════════
// HubScreen — mirror .lts-mobile-hub (web mobile): header navy tối,
// action cards 108px, nhóm section, stat card tính từ dữ liệu local.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../store/app_state.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_overlay.dart';

class HubScreen extends StatelessWidget {
  final VoidCallback onGoTinhGia;
  final VoidCallback onGoCauHinh;
  final VoidCallback onOpenLichSu;
  final VoidCallback onOpenLSX;
  const HubScreen({
    super.key,
    required this.onGoTinhGia,
    required this.onGoCauHinh,
    required this.onOpenLichSu,
    required this.onOpenLSX,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final s = context.watch<AppState>();

    final doanhThu = s.history.fold<double>(
        0, (sum, h) => sum + (h.finalPrice.toDouble() * h.quantity.toDouble()));
    final daDuyet = s.history
        .where(
            (h) => h.quoteStatus == 'approved' || h.quoteStatus == 'completed')
        .length;

    return Column(
      children: [
        LtsNavyHeader(
          hub: true,
          title: 'LTS Pricing',
          subtitle: 'Báo giá & tính giá bao bì',
          leading: LtsHeaderCircleButton(
            icon: Icons.menu_rounded,
            tooltip: 'Danh sách chức năng',
            onTap: () => _menu(context, s),
          ),
          action: LtsHeaderPillAction(
            label: 'Mới',
            icon: Icons.add_rounded,
            onTap: onGoTinhGia,
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
            children: [
              Row(
                children: [
                  _HubStat(
                      label: 'Tổng bảng tính',
                      value: Fmt.n(s.history.length.toDouble())),
                  const SizedBox(width: 10),
                  _HubStat(
                      label: 'Doanh thu ước tính', value: Fmt.vnd(doanhThu)),
                  const SizedBox(width: 10),
                  _HubStat(label: 'Đã duyệt', value: '$daDuyet'),
                ],
              ),
              const SizedBox(height: 24),
              _GroupLabel('Tính giá & Báo giá', color: p.muted),
              const SizedBox(height: 12),
              ..._cards(context, [
                _Card(
                  variant: LtsIconVariant.violet,
                  icon: Icons.calculate_rounded,
                  title: 'Tạo bảng tính giá',
                  sub: 'Nhập đặc tả sản phẩm — tính đơn giá tức thì',
                  onTap: onGoTinhGia,
                ),
                _Card(
                  variant: LtsIconVariant.slate,
                  icon: Icons.history_rounded,
                  title: 'Danh sách tính giá',
                  sub: 'Lịch sử báo giá đã lưu trên máy',
                  onTap: onOpenLichSu,
                ),
                _Card(
                  variant: LtsIconVariant.orange,
                  icon: Icons.assignment_rounded,
                  title: 'Lệnh sản xuất (LSX)',
                  sub: 'Tạo & theo dõi lệnh từ báo giá đã duyệt',
                  onTap: onOpenLSX,
                ),
                const _Card(
                  variant: LtsIconVariant.sky,
                  icon: Icons.description_rounded,
                  title: 'Tạo bảng báo giá',
                  sub: 'Cần đăng nhập — dùng bản web',
                  locked: true,
                ),
                const _Card(
                  variant: LtsIconVariant.rose,
                  icon: Icons.task_alt_rounded,
                  title: 'Duyệt báo giá',
                  sub: 'Cần đăng nhập — dùng bản web',
                  locked: true,
                ),
              ]),
              const SizedBox(height: 24),
              _GroupLabel('Khách hàng', color: p.muted),
              const SizedBox(height: 12),
              ..._cards(context, const [
                _Card(
                  variant: LtsIconVariant.sky,
                  icon: Icons.people_rounded,
                  title: 'Danh sách khách hàng',
                  sub: 'Cần đăng nhập — dùng bản web',
                  locked: true,
                ),
              ]),
              const SizedBox(height: 24),
              _GroupLabel('Cấu hình tính giá', color: p.muted),
              const SizedBox(height: 12),
              ..._cards(context, [
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
              const SizedBox(height: 24),
              _GroupLabel('Nhật ký', color: p.muted),
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

  void _menu(BuildContext context, AppState s) {
    final p = LtsT.of(context);
    showLtsSheet(context,
        title: 'Chức năng',
        builder: (sheetCtx) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ListTile(
                  dense: true,
                  leading: Icon(
                      s.themeMode == ThemeMode.dark
                          ? Icons.light_mode_outlined
                          : Icons.dark_mode_outlined,
                      size: 20,
                      color: p.muted),
                  title: Text(
                      s.themeMode == ThemeMode.dark
                          ? 'Chuyển sang giao diện sáng'
                          : 'Chuyển sang giao diện tối',
                      style: TextStyle(fontSize: 14, color: p.text)),
                  onTap: () {
                    s.setThemeMode(s.themeMode == ThemeMode.dark
                        ? ThemeMode.light
                        : ThemeMode.dark);
                    Navigator.pop(context);
                  },
                ),
                Divider(height: 1, thickness: 1, color: p.border),
                for (final m in [
                  ('Tính giá & Báo giá', false),
                  ('Cấu hình tính giá', false),
                  ('Tài khoản & phân quyền', true),
                  ('Quản trị hệ thống', true),
                ]) ...[
                  ListTile(
                    dense: true,
                    leading: Icon(
                        m.$2
                            ? Icons.lock_outline_rounded
                            : Icons.folder_rounded,
                        size: 20,
                        color: p.muted),
                    title: Text(m.$1,
                        style: TextStyle(fontSize: 14, color: p.text)),
                    trailing: m.$2
                        ? const Text('Web',
                            style: TextStyle(
                                fontSize: 11, fontWeight: FontWeight.w800))
                        : Icon(Icons.chevron_right_rounded,
                            size: 20, color: p.dim),
                    onTap: () => Navigator.pop(context),
                  ),
                  Divider(height: 1, thickness: 1, color: p.border),
                ],
                const SizedBox(height: 8),
              ],
            ));
  }
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

class _GroupLabel extends StatelessWidget {
  final String text;
  final Color color;
  const _GroupLabel(this.text, {required this.color});
  @override
  Widget build(BuildContext context) {
    return Text(text.toUpperCase(),
        style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.7,
            color: color));
  }
}

class _HubStat extends StatelessWidget {
  final String label;
  final String value;
  const _HubStat({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: p.border),
          boxShadow: LtsT.shadowSm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                    color: p.muted)),
            const SizedBox(height: 4),
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w800, color: p.text)),
          ],
        ),
      ),
    );
  }
}
