// ═══════════════════════════════════════════════════════════════════════════
// Lịch sử — dashboard stats + search + filter + cards swipe
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

    final filtered = _query.isEmpty
        ? all
        : all.where((h) {
            final q = _query.toLowerCase();
            return h.customer.toLowerCase().contains(q) ||
                h.productName.toLowerCase().contains(q) ||
                h.structure.toLowerCase().contains(q);
          }).toList();

    final totalRev =
        all.fold<double>(0, (sum, h) => sum + h.finalPrice.toDouble() * h.quantity.toDouble());
    final approvedCount = all
        .where((h) =>
            h.quoteStatus == 'approved' || h.quoteStatus == 'completed')
        .length;

    if (all.isEmpty) {
      return _Empty();
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        _StatsRow(
          totalQuotes: all.length,
          totalRevenue: totalRev,
          approved: approvedCount,
        ),
        const SizedBox(height: 16),
        TextField(
          decoration: InputDecoration(
            hintText: 'Tìm khách hàng, sản phẩm, cấu trúc…',
            prefixIcon: const Icon(Icons.search, size: 20),
            suffixIcon: _query.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => setState(() => _query = ''),
                  )
                : null,
          ),
          onChanged: (v) => setState(() => _query = v),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Text('${filtered.length} báo giá',
                style: Theme.of(context).textTheme.titleSmall),
            const Spacer(),
            Text('Vuốt sang trái để xoá',
                style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        const SizedBox(height: 8),
        if (filtered.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 32),
            child: Center(
                child: Text('Không tìm thấy báo giá phù hợp',
                    style: Theme.of(context).textTheme.bodyMedium)),
          ),
        for (final h in filtered) ...[
          _SwipeableCard(item: h, state: s),
          const SizedBox(height: 10),
        ],
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
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: scheme.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.history_edu_outlined,
                  size: 48, color: scheme.primary),
            ),
            const SizedBox(height: 20),
            Text('Chưa có báo giá nào',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text('Lưu báo giá từ tab Tính giá để xem ở đây',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

// ─── Stats row ───────────────────────────────────────────────────────────────
class _StatsRow extends StatelessWidget {
  final int totalQuotes;
  final double totalRevenue;
  final int approved;
  const _StatsRow({
    required this.totalQuotes,
    required this.totalRevenue,
    required this.approved,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _StatCard(
          label: 'Tổng báo giá',
          value: totalQuotes.toString(),
          icon: Icons.receipt_long,
          color: AppColors.info,
          bg: AppColors.bgInfo,
        ),
        const SizedBox(width: 10),
        _StatCard(
          label: 'Doanh thu ước tính',
          value: '${Fmt.n((totalRevenue / 1000000).round())}tr',
          icon: Icons.payments_outlined,
          color: AppColors.success,
          bg: AppColors.bgSuccess,
        ),
        const SizedBox(width: 10),
        _StatCard(
          label: 'Đã duyệt',
          value: approved.toString(),
          icon: Icons.check_circle_outline,
          color: AppColors.warning,
          bg: AppColors.bgWarning,
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final Color bg;
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.bg,
  });

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: dark ? color.withValues(alpha: 0.1) : bg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(height: 10),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(value,
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: color,
                      letterSpacing: -0.3)),
            ),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: color.withValues(alpha: 0.85))),
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
            color: AppColors.danger.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(16)),
        child: Icon(Icons.delete_outline, color: AppColors.danger, size: 26),
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
      child: _HistoryCard(item: item),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  final HistoryItem item;
  const _HistoryCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          context.read<AppState>().loadFromHistory(item);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Row(children: const [
              Icon(Icons.swap_horiz, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text('Đã nạp vào form — chuyển tab Tính giá'),
            ]),
            duration: const Duration(seconds: 2),
          ));
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: scheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.receipt_long,
                        color: scheme.primary, size: 22),
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
                        Text(item.customer,
                            style: Theme.of(context).textTheme.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(Fmt.vnd(item.finalPrice),
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: scheme.primary,
                              letterSpacing: -0.3)),
                      const SizedBox(height: 2),
                      Text('${Fmt.n(item.quantity)} đv',
                          style:
                              Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ],
              ),
              if (item.structure.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainerHighest
                        .withValues(alpha: 0.5),
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
                if (item.quoteStatus != null)
                  _StatusChip(status: item.quoteStatus!),
              ]),
            ],
          ),
        ),
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
