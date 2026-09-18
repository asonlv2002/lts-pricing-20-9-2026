// ═══════════════════════════════════════════════════════════════════════════
// ThongBaoSheet — mirror MobileQuickActions SheetBottom "Thông báo":
//   danh sách thông báo local, dot chưa đọc, "Đánh dấu tất cả đã đọc".
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../store/app_state.dart';
import '../../theme/lts_tokens.dart';
import '../lts/lts_overlay.dart';

Future<void> showThongBaoSheet(BuildContext context) {
  return showLtsSheet(
    context,
    title: 'Thông báo',
    builder: (_) => const _ThongBaoList(),
  );
}

class _ThongBaoList extends StatelessWidget {
  const _ThongBaoList();

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final s = context.watch<AppState>();
    if (s.thongBaoList.isEmpty) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.notifications_none_rounded, size: 34, color: p.dim),
            const SizedBox(height: 8),
            Text('Các cập nhật mới sẽ hiện ở đây.',
                style: TextStyle(fontSize: 13, color: p.muted)),
          ],
        ),
      );
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
          child: Row(
            children: [
              const Spacer(),
              TextButton(
                onPressed: s.soThongBaoChuaDoc == 0
                    ? null
                    : () => s.danhDauTatCaDaDoc(),
                child: const Text('Đánh dấu tất cả đã đọc',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
        Flexible(
          child: ListView.builder(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
            itemCount: s.thongBaoList.length,
            itemBuilder: (ctx, i) {
              final t = s.thongBaoList[i];
              String thoiGian;
              try {
                thoiGian = DateFormat('dd/MM HH:mm')
                    .format(DateTime.parse(t.thoiGian).toLocal());
              } catch (_) {
                thoiGian = t.thoiGian;
              }
              return ListTile(
                dense: true,
                onTap: t.daDoc ? null : () => s.danhDauDaDoc(t.id),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                leading: Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(top: 6),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: t.daDoc ? p.border : const Color(0xFF5B4DFF),
                  ),
                ),
                title: Text(t.tieuDe,
                    style: TextStyle(
                        fontSize: 13.5,
                        fontWeight:
                            t.daDoc ? FontWeight.w500 : FontWeight.w700,
                        color: p.text)),
                subtitle: Text('$thoiGian · ${t.loai}',
                    style: TextStyle(fontSize: 11.5, color: p.muted)),
              );
            },
          ),
        ),
      ],
    );
  }
}
