// ═══════════════════════════════════════════════════════════════════════════
// ThemScreen — tab "Quản trị" (nhóm "Quản trị hệ thống" mirror web
// CAC_NHOM_MENU id "system", VoTrang.tsx:330-378):
//   Tài khoản & quyền · Yêu cầu đặt lại MK · Vai trò · Bảng phân quyền ·
//   Nhật ký hệ thống.
// 4 mục user mở TaiKhoanScreen(view:) đúng màn riêng (mirror web tách card).
// Bỏ khỏi tab (26/09/2026): Lịch sử báo giá (đã có ở hub Tính giá), Cài đặt
// hệ thống (chưa có màn), Quản lý tài nguyên hệ thống (chưa có màn), nhóm
// Tài khoản + Đăng xuất (đã có ở avatar sheet).
// HomeGate đã chặn guest — không cần check auth trong màn này.
//
// Đổi 28/09/2026: đồng bộ UI theo hub thẻ giống TinhGiaHubScreen /
// KhachHangHubScreen — LtsNavyHeader(hub: true) cao 112px + LtsSectionLabel +
// LtsActionCard (icon box 56px, tone violet/rose/emerald/orange như web).
// Bỏ _NhomLabel/_TheMuc tự chế (nền trắng hard-code, sai dark mode).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../theme/lts_tokens.dart';
import '../widgets/auth/auth_header_actions.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_module_route.dart';
import '../widgets/lts/lts_surfaces.dart';
import 'nhat_ky/nhat_ky_scope.dart';
import 'nhat_ky_thao_tac_screen.dart';
import 'tai_khoan_screen.dart';

class ThemScreen extends StatelessWidget {
  const ThemScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cacMuc = <_MucMenu>[
      _MucMenu(
        icon: Icons.shield_outlined,
        variant: LtsIconVariant.violet,
        label: 'Tài khoản & quyền',
        sub: 'Quản lý người dùng và quyền truy cập.',
        onTap: () => _pushModule(
          context,
          title: 'Tài khoản & quyền',
          child: const TaiKhoanScreen(),
        ),
      ),
      _MucMenu(
        icon: Icons.key_rounded,
        variant: LtsIconVariant.rose,
        label: 'Yêu cầu đặt lại MK',
        sub: 'Duyệt yêu cầu đặt lại mật khẩu của người dùng.',
        onTap: () => _pushModule(
          context,
          title: 'Yêu cầu đặt lại MK',
          child: const TaiKhoanScreen(view: TaiKhoanView.yeuCauMK),
        ),
      ),
      _MucMenu(
        icon: Icons.groups_outlined,
        variant: LtsIconVariant.emerald,
        label: 'Vai trò',
        sub: 'Thiết lập nhóm vai trò trong hệ thống.',
        onTap: () => _pushModule(
          context,
          title: 'Vai trò',
          child: const TaiKhoanScreen(view: TaiKhoanView.vaiTro),
        ),
      ),
      _MucMenu(
        icon: Icons.checklist_rounded,
        variant: LtsIconVariant.orange,
        label: 'Bảng phân quyền',
        sub: 'Kiểm tra ma trận quyền theo chức năng.',
        onTap: () => _pushModule(
          context,
          title: 'Bảng phân quyền',
          child: const TaiKhoanScreen(view: TaiKhoanView.bangPhanQuyen),
        ),
      ),
      _MucMenu(
        icon: Icons.manage_search_rounded,
        variant: LtsIconVariant.orange,
        label: 'Nhật ký hệ thống',
        sub: 'Theo dõi hoạt động quản trị.',
        onTap: () => _pushModule(
          context,
          title: 'Nhật ký hệ thống',
          child: const NhatKyThaoTacScreen(scope: PhamViNhatKy.heThong),
        ),
      ),
    ];

    return Column(
      children: [
        const LtsNavyHeader(
          hub: true,
          title: 'Quản trị hệ thống',
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
              const LtsSectionLabel('Quản trị hệ thống'),
              const SizedBox(height: 12),
              for (var i = 0; i < cacMuc.length; i++) ...[
                if (i > 0) const SizedBox(height: 16),
                LtsActionCard(
                  iconBox: LtsIconBox(
                    icon: cacMuc[i].icon,
                    variant: cacMuc[i].variant,
                  ),
                  title: cacMuc[i].label,
                  subtitle: cacMuc[i].sub,
                  onTap: cacMuc[i].onTap,
                ),
              ],
            ],
          ),
        ),
      ],
    );
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

class _MucMenu {
  final IconData icon;
  final LtsIconVariant variant;
  final String label;
  final String? sub;
  final VoidCallback onTap;
  const _MucMenu({
    required this.icon,
    required this.variant,
    required this.label,
    required this.onTap,
    this.sub,
  });
}
