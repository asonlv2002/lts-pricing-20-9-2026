// ═══════════════════════════════════════════════════════════════════════════
// LichSuScreen — Lịch sử báo giá (= Danh sách tính giá, mirror web
// ModuleDanhSachTinhGia): ô tìm kiếm + pull-to-refresh + swipe-xóa.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';

class LichSuScreen extends StatefulWidget {
  const LichSuScreen({super.key});

  @override
  State<LichSuScreen> createState() => _LichSuScreenState();
}

class _LichSuScreenState extends State<LichSuScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final all = s.history;
    final scheme = Theme.of(context).colorScheme;

    final filtered = all.where((h) {
      return _query.isEmpty ||
          h.customer.toLowerCase().contains(_query.toLowerCase()) ||
          h.productName.toLowerCase().contains(_query.toLowerCase()) ||
          h.structure.toLowerCase().contains(_query.toLowerCase());
    }).toList();

    if (all.isEmpty) return _Empty();

    return Column(
      children: [
        // Search bar (thay nút "Xem dạng bảng")
        Container(
          color: scheme.surface,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Tìm khách hàng, sản phẩm…',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _query.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close, size: 18),
                            onPressed: () => setState(() => _query = ''),
                          )
                        : null,
                    isDense: true,
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
              ),
            ],
          ),
        ),

        const Divider(height: 1),

        // List
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off,
                            size: 56,
                            color:
                                scheme.onSurfaceVariant.withValues(alpha: 0.4)),
                        const SizedBox(height: 12),
                        Text('Không tìm thấy báo giá phù hợp',
                            style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 32),
                  itemCount: filtered.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, i) {
                    if (i == 0) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            Text('${filtered.length} báo giá',
                                style: Theme.of(context).textTheme.titleSmall),
                            const Spacer(),
                            Text('← Vuốt trái để xoá',
                                style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      );
                    }
                    return _SwipeableCard(item: filtered[i - 1], state: s);
                  },
                ),
        ),
      ],
    );
  }
}

class _Empty extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: scheme.primary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.history_edu_outlined,
                  size: 50, color: scheme.primary),
            ),
            const SizedBox(height: 20),
            Text('Chưa có báo giá nào',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Lưu báo giá từ tab Tính giá để xem ở đây',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

// ─── Swipeable card ──────────────────────────────────────────────────────────
class _SwipeableCard extends StatelessWidget {
  final HistoryItem item;
  final AppState state;
  const _SwipeableCard({required this.item, required this.state});

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(item.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        decoration: BoxDecoration(
            color: AppColors.danger.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(16)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.delete_outline, color: AppColors.danger, size: 24),
            const SizedBox(height: 4),
            Text('Xoá',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.danger)),
          ],
        ),
      ),
      confirmDismiss: (_) async {
        return await showDialog<bool>(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text('Xoá báo giá?'),
                content: Text('${item.customer} — ${item.productName}'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Huỷ')),
                  FilledButton(
                      style: FilledButton.styleFrom(
                          backgroundColor: AppColors.danger),
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Xoá')),
                ],
              ),
            ) ??
            false;
      },
      onDismissed: (_) => state.deleteHistory(item.id),
      child: _HistoryCard(item: item, state: state),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  final HistoryItem item;
  final AppState state;
  const _HistoryCard({required this.item, required this.state});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isMang = (item.input['productType'] as String?) == 'mang';
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          context.read<AppState>().loadFromHistory(item);
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Icon loại sản phẩm
                  Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: scheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isMang
                          ? Icons.view_stream_outlined
                          : Icons.shopping_bag_outlined,
                      color: scheme.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                            item.productName.isEmpty
                                ? '(chưa đặt tên)'
                                : item.productName,
                            style: const TextStyle(
                                fontSize: 14.5, fontWeight: FontWeight.w700),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text(item.customer.isEmpty ? '—' : item.customer,
                            style: Theme.of(context).textTheme.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(Fmt.vnd(item.chotGia ?? item.finalPrice),
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: scheme.primary,
                              letterSpacing: -0.3)),
                      const SizedBox(height: 2),
                      Text(
                          '/${isMang ? 'm²' : 'cái'} · ${Fmt.n(item.quantity)} đv',
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ],
              ),
              if (item.structure.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color:
                        scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.layers_outlined,
                          size: 12, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 5),
                      Flexible(
                        child: Text(item.structure,
                            style: TextStyle(
                                fontSize: 11,
                                fontStyle: FontStyle.italic,
                                color: scheme.onSurfaceVariant),
                            overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Row(children: [
                Icon(Icons.access_time,
                    size: 12, color: scheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Text(Fmt.dateTime(item.date),
                    style: Theme.of(context).textTheme.bodySmall),
                const Spacer(),
                // Xem chi tiết A4 (mirror web moXemA4).
                IconButton(
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Xem chi tiết A4',
                  icon: Icon(Icons.picture_as_pdf_outlined,
                      size: 18, color: scheme.primary),
                  onPressed: () =>
                      state.xuatChiTietA4(state.chiTietExportTuHistory(item)),
                ),
                // Nút đổi trạng thái
                GestureDetector(
                  onTap: () => _showStatusMenu(context, item, state),
                  child: item.quoteStatus != null
                      ? _StatusChip(status: item.quoteStatus!)
                      : Text('• Đặt trạng thái',
                          style: TextStyle(
                              fontSize: 11,
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w500)),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  void _showStatusMenu(BuildContext context, HistoryItem item, AppState state) {
    showModalBottomSheet(
      context: context,
      builder: (_) => _StatusSheet(item: item, state: state),
    );
  }
}

class _StatusSheet extends StatelessWidget {
  final HistoryItem item;
  final AppState state;
  const _StatusSheet({required this.item, required this.state});

  static final _statuses = [
    ('drafted', 'Đã lập', const Color(0xFF6B7280), Icons.edit_outlined),
    ('sent', 'Đã gửi', const Color(0xFF3B82F6), Icons.send_outlined),
    (
      'pending_approval',
      'Chờ duyệt',
      const Color(0xFFD97706),
      Icons.hourglass_empty
    ),
    ('approved', 'Đã duyệt', const Color(0xFF8B5CF6), Icons.verified_outlined),
    (
      'completed',
      'Hoàn thành',
      const Color(0xFF059669),
      Icons.check_circle_outline
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Đặt trạng thái báo giá',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text('${item.customer} — ${item.productName}',
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 16),
          ..._statuses.map((st) {
            final isSelected = item.quoteStatus == st.$1;
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: st.$3.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(st.$4, size: 18, color: st.$3),
              ),
              title: Text(st.$2,
                  style: TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 14, color: st.$3)),
              trailing: isSelected
                  ? Icon(Icons.check_circle, color: st.$3, size: 20)
                  : null,
              onTap: () async {
                // Update history item's quoteStatus
                final idx = state.history.indexWhere((h) => h.id == item.id);
                if (idx < 0) return;
                final updated = HistoryItem(
                  id: item.id,
                  date: item.date,
                  customer: item.customer,
                  productName: item.productName,
                  structure: item.structure,
                  quantity: item.quantity,
                  finalPrice: item.finalPrice,
                  chotGia: item.chotGia,
                  quoteStatus: st.$1,
                  input: item.input,
                );
                final newList = List<HistoryItem>.of(state.history);
                newList[idx] = updated;
                state.history = newList;
                await state.saveHistoryDirectly(newList);
                if (!context.mounted) return;
                Navigator.pop(context);
              },
            );
          }),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  static const _cfg = {
    'drafted': ('Đã lập', Color(0xFF6B7280)),
    'sent': ('Đã gửi', Color(0xFF3B82F6)),
    'pending_approval': ('Chờ duyệt', Color(0xFFD97706)),
    'approved': ('Đã duyệt', Color(0xFF8B5CF6)),
    'completed': ('Hoàn thành', Color(0xFF059669)),
  };

  @override
  Widget build(BuildContext context) {
    final cfg = _cfg[status] ?? ('—', const Color(0xFF6B7280));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: cfg.$2.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: cfg.$2.withValues(alpha: 0.3)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: cfg.$2, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(cfg.$1,
            style: TextStyle(
                fontSize: 11, fontWeight: FontWeight.w600, color: cfg.$2)),
      ]),
    );
  }
}
