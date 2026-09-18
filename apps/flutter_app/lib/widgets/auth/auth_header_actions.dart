// ═══════════════════════════════════════════════════════════════════════════
// AuthHeaderActions — mirror MobileQuickActions.tsx (web mobile):
//   - LtsHeaderBell   : nút chuông + badge số chưa đọc → sheet Thông báo
//   - LtsHeaderAvatar : nút avatar tròn (ảnh/2 chữ cái) → sheet Tài khoản
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../store/app_state.dart';
import 'thong_bao_sheet.dart';
import 'tai_khoan_sheet.dart';

/// Avatar dùng chung: ảnh server nếu có, else 2 chữ cái đầu tên.
class LtsAvatar extends StatelessWidget {
  final double size;
  final double fontSize;
  const LtsAvatar({super.key, this.size = 34, this.fontSize = 13});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().nguoiDungHienTai;
    final ten = (user?.fullName.isNotEmpty ?? false)
        ? user!.fullName
        : (user?.account ?? '');
    final chu = ten.trim().isNotEmpty
        ? ten.trim().split(RegExp(r'\s+')).take(2).map((w) => w[0]).join()
            .toUpperCase()
        : '?';
    final bytes = user?.avatarBytes;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFF5B4DFF),
        image: bytes != null
            ? DecorationImage(image: MemoryImage(bytes), fit: BoxFit.cover)
            : null,
      ),
      alignment: Alignment.center,
      child: bytes == null
          ? Text(chu,
              style: TextStyle(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w800,
                  color: Colors.white))
          : null,
    );
  }
}

class LtsHeaderBell extends StatelessWidget {
  const LtsHeaderBell({super.key});

  @override
  Widget build(BuildContext context) {
    final soChuaDoc = context
        .select<AppState, int>((s) => s.soThongBaoChuaDoc);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () => showThongBaoSheet(context),
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withValues(alpha: 0.08),
            ),
            child: const Icon(Icons.notifications_outlined,
                size: 21, color: Colors.white),
          ),
        ),
        if (soChuaDoc > 0)
          Positioned(
            top: 4,
            right: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              constraints: const BoxConstraints(minWidth: 17),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(soChuaDoc > 9 ? '9+' : '$soChuaDoc',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: Colors.white)),
            ),
          ),
      ],
    );
  }
}

class LtsHeaderAvatar extends StatelessWidget {
  const LtsHeaderAvatar({super.key});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: () => showTaiKhoanSheet(context),
      child: Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.16),
        ),
        child: const LtsAvatar(size: 36, fontSize: 13),
      ),
    );
  }
}
