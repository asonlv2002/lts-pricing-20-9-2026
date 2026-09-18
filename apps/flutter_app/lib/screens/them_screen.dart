// ═══════════════════════════════════════════════════════════════════════════
// ThemScreen — tab "Thêm" mirror web mobile admin group:
//   Tài khoản & quyền · Cấu hình tính giá · Lịch sử báo giá · Đổi MK ·
//   Đổi ảnh đại diện · Đổi mã PIN · Đổi chữ ký · Đăng xuất.
// Mỗi mục đẩy sang ModuleRoute (cho Cấu hình / Lịch sử / Tài khoản) hoặc
// sheet inline (đổi MK, PIN, ảnh, chữ ký). HomeGate đã chặn guest —
// không cần check auth trong màn này.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../api/service_lts_client.dart';
import '../store/app_state.dart';
import '../theme/lts_tokens.dart';
import '../widgets/auth/auth_header_actions.dart';
import '../widgets/auth/pin_sheets.dart';
import '../widgets/auth/ve_chu_ky_screen.dart';
import '../widgets/lts/lts_chrome.dart';
import '../widgets/lts/lts_module_route.dart';
import '../widgets/lts/lts_toast.dart';
import 'cau_hinh_screen.dart';
import 'lich_su_screen.dart';
import 'tai_khoan_screen.dart';

class ThemScreen extends StatelessWidget {
  const ThemScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final s = context.watch<AppState>();
    final user = s.nguoiDungHienTai;

    final cacMuc = <_MucMenu>[
      _MucMenu(
        icon: Icons.people_alt_outlined,
        label: 'Tài khoản & quyền',
        sub: 'Danh sách nhân viên, vai trò, phân quyền',
        onTap: () => _pushModule(
          context,
          title: 'Tài khoản & quyền',
          child: const TaiKhoanScreen(),
        ),
      ),
      _MucMenu(
        icon: Icons.tune_rounded,
        label: 'Cấu hình tính giá',
        sub: 'Vật tư / NVL · Hằng số · Lợi nhuận',
        onTap: () => _pushModule(
          context,
          title: 'Cấu hình tính giá',
          child: const CauHinhScreen(),
        ),
      ),
      _MucMenu(
        icon: Icons.history_rounded,
        label: 'Lịch sử báo giá',
        sub: 'Danh sách tính giá đã lưu trên máy',
        onTap: () => _pushModule(
          context,
          title: 'Lịch sử báo giá',
          child: const LichSuScreen(),
        ),
      ),
    ];

    final cacMucCaNhan = <_MucMenu>[
      _MucMenu(
        icon: Icons.lock_outline_rounded,
        label: 'Đổi mật khẩu',
        onTap: () => showDoiMatKhauSheet(context),
      ),
      _MucMenu(
        icon: Icons.image_outlined,
        label: 'Đổi ảnh đại diện',
        onTap: () => _doiAnhDaiDien(context),
      ),
      _MucMenu(
        icon: Icons.key_rounded,
        label: 'Đổi mã PIN',
        onTap: () => showDoiPinSheet(context),
      ),
      _MucMenu(
        icon: Icons.draw_rounded,
        label: 'Đổi chữ ký',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const VeChuKyScreen()),
        ),
      ),
    ];

    return Column(
      children: [
        LtsNavyHeader(
          title: 'Thêm',
          subtitle: user == null
              ? 'Tài khoản & chức năng'
              : '@${user.account} · ${user.fullName}',
          extras: const [
            LtsHeaderBell(),
            SizedBox(width: 10),
            LtsHeaderAvatar(),
          ],
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              const _NhomLabel('Quản lý'),
              const SizedBox(height: 8),
              for (final m in cacMuc) ...[
                _TheMuc(item: m, palette: p),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 8),
              const _NhomLabel('Tài khoản'),
              const SizedBox(height: 8),
              for (final m in cacMucCaNhan) ...[
                _TheMuc(item: m, palette: p),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 16),
              _NutDangXuat(palette: p),
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
        s.themThongBao('Đã cập nhật ảnh đại diện.', 'Tài khoản');
        LtsToast.show(context, 'Đã cập nhật ảnh đại diện.',
            type: LtsToastType.success);
      }
    } catch (err) {
      if (context.mounted) {
        LtsToast.show(
          context,
          err is LoiServiceLts ? err.message : 'Tải ảnh đại diện thất bại.',
          type: LtsToastType.error,
        );
      }
    }
  }
}

class _MucMenu {
  final IconData icon;
  final String label;
  final String? sub;
  final VoidCallback onTap;
  const _MucMenu({
    required this.icon,
    required this.label,
    required this.onTap,
    this.sub,
  });
}

class _NhomLabel extends StatelessWidget {
  final String text;
  const _NhomLabel(this.text);
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Text(
      text,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w800,
        color: p.muted,
        letterSpacing: 0.4,
      ),
    );
  }
}

class _TheMuc extends StatelessWidget {
  final _MucMenu item;
  final dynamic palette;
  const _TheMuc({required this.item, required this.palette});

  @override
  Widget build(BuildContext context) {
    final p = palette;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: item.onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: p.bg,
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Icon(item.icon, size: 20, color: p.muted),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.label,
                        style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: p.text)),
                    if (item.sub != null) ...[
                      const SizedBox(height: 2),
                      Text(item.sub!,
                          style: TextStyle(fontSize: 12, color: p.muted)),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, size: 22, color: p.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _NutDangXuat extends StatelessWidget {
  final dynamic palette;
  const _NutDangXuat({required this.palette});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFFDC2626),
          side: const BorderSide(color: Color(0xFFFECACA)),
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        icon: const Icon(Icons.logout_rounded, size: 19),
        label: const Text('Đăng xuất',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        onPressed: () => _xacNhan(context),
      ),
    );
  }

  void _xacNhan(BuildContext context) {
    final s = context.read<AppState>();
    showDialog(
      context: context,
      builder: (dlgCtx) => AlertDialog(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn sẽ quay về màn đăng nhập.'),
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
            },
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
  }
}
