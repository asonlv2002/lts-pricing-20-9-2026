// ═══════════════════════════════════════════════════════════════════════════
// DonHangScreen — tab "Đơn hàng" mirror web mobile production group:
// hiển thị danh sách LSX đã lưu. Tái sử dụng LSXScreen (đã có search +
// FAB tạo LSX mới), bọc trong navy header đồng bộ Hub/Cấu hình.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../widgets/auth/auth_header_actions.dart';
import '../widgets/lts/lts_chrome.dart';
import 'lsx_screen.dart';

class DonHangScreen extends StatelessWidget {
  const DonHangScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        LtsNavyHeader(
          title: 'Đơn hàng',
          subtitle: 'Lệnh sản xuất đã tạo',
          extras: [
            LtsHeaderBell(),
            SizedBox(width: 10),
            LtsHeaderAvatar(),
          ],
        ),
        Expanded(child: LSXScreen()),
      ],
    );
  }
}
