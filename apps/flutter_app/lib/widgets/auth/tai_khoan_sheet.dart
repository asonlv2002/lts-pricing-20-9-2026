// ═══════════════════════════════════════════════════════════════════════════
// TaiKhoanSheet — mirror MobileQuickActions SheetBottom "Tài khoản" + menu
// avatar web: Đổi mật khẩu · Đổi ảnh đại diện · Đổi mã Pin · Đổi chữ ký ·
// Đăng xuất (guest → nút Đăng nhập).
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../api/service_lts_client.dart';
import '../../screens/login_screen.dart';
import '../lts/lts_toast.dart';
import '../../store/app_state.dart';
import '../../theme/lts_tokens.dart';
import '../lts/lts_overlay.dart';
import 'auth_header_actions.dart' show LtsAvatar;
import 'pin_sheets.dart';
import 've_chu_ky_screen.dart';

Future<void> showTaiKhoanSheet(BuildContext context) {
  return showLtsSheet(
    context,
    title: 'Tài khoản',
    builder: (_) => const _TaiKhoanBody(),
  );
}

class _TaiKhoanBody extends StatelessWidget {
  const _TaiKhoanBody();

  Future<void> _doiAnhDaiDien(BuildContext context) async {
    final picker = ImagePicker();
    final x = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 640,
      imageQuality: 85,
    );
    if (x == null) return;
    if (!context.mounted) return;
    final s = context.read<AppState>();
    try {
      final bytes = await x.readAsBytes();
      await s.taiAnhDaiDienMoi(bytes, x.name);
      if (context.mounted) {
        Navigator.pop(context);
        s.themThongBao('Đã cập nhật ảnh đại diện.', 'Tài khoản');
      }
    } catch (err) {
      if (context.mounted) {
        Navigator.pop(context);
        LtsToast.show(
          context,
          err is LoiServiceLts ? err.message : 'Tải ảnh đại diện thất bại.',
          type: LtsToastType.error,
        );
      }
    }
  }

  void _dangXuat(BuildContext context) {
    final s = context.read<AppState>();
    showDialog(
      context: context,
      builder: (dlgCtx) => AlertDialog(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn sẽ quay về chế độ dùng offline (guest).'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dlgCtx),
            child: const Text('Hủy'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626)),
            onPressed: () {
              Navigator.pop(dlgCtx);
              s.dangXuat();
              Navigator.of(context).pop();
            },
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
  }

  void _dangNhap(BuildContext context) {
    Navigator.pop(context);
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final s = context.watch<AppState>();
    final user = s.nguoiDungHienTai;
    final muc = ({
      'icon': Icons.lock_outline_rounded,
      'label': 'Đổi mật khẩu',
      'onTap': (BuildContext c) {
        Navigator.pop(c);
        showDoiMatKhauSheet(c);
      },
    });
    final cacMuc = user == null
        ? <Map<String, dynamic>>[
            {
              'icon': Icons.login_rounded,
              'label': 'Đăng nhập',
              'onTap': _dangNhap,
            },
          ]
        : <Map<String, dynamic>>[
            muc,
            {
              'icon': Icons.image_outlined,
              'label': 'Đổi ảnh đại diện',
              'onTap': _doiAnhDaiDien,
            },
            {
              'icon': Icons.key_rounded,
              'label': 'Đổi mã Pin',
              'onTap': (BuildContext c) {
                Navigator.pop(c);
                showDoiPinSheet(c);
              },
            },
            {
              'icon': Icons.draw_rounded,
              'label': 'Đổi chữ ký',
              'onTap': (BuildContext c) {
                Navigator.pop(c);
                Navigator.of(c).push(
                  MaterialPageRoute(builder: (_) => const VeChuKyScreen()),
                );
              },
            },
            {
              'icon': Icons.logout_rounded,
              'label': 'Đăng xuất',
              'danger': true,
              'onTap': _dangXuat,
            },
          ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: p.bg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: p.border),
            ),
            child: Row(
              children: [
                const LtsAvatar(size: 44, fontSize: 16),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user?.fullName ?? 'Chưa đăng nhập',
                          style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: p.text)),
                      if (user != null)
                        Text('@${user.account}',
                            style: TextStyle(
                                fontSize: 12, color: p.muted)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          for (final m in cacMuc) ...[
            ListTile(
              dense: true,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
              leading: Icon(m['icon'] as IconData,
                  size: 20,
                  color: m['danger'] == true
                      ? const Color(0xFFDC2626)
                      : p.muted),
              title: Text(m['label'] as String,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: m['danger'] == true
                          ? const Color(0xFFDC2626)
                          : p.text)),
              onTap: () => (m['onTap'] as void Function(BuildContext))(context),
            ),
          ],
        ],
      ),
    );
  }
}
