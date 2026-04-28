// ═══════════════════════════════════════════════════════════════════════════
// LichSuScreen — Lịch sử báo giá
// Cải tiến: Filter tabs theo trạng thái + pull-to-refresh + better cards
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../widgets/expandable_table.dart';

class LichSuScreen extends StatefulWidget {
  const LichSuScreen({super.key});

  @override
  State<LichSuScreen> createState() => _LichSuScreenState();
}

class _LichSuScreenState extends State<LichSuScreen>
    with SingleTickerProviderStateMixin {
  String _query = '';
  String? _filterStatus; // null = tất cả
  late TabController _tabCtrl;

  static const _tabs = [
    (null, 'Tất cả'),
    ('drafted', 'Đã lập'),
    ('approved', 'Đã duyệt'),
    ('completed', 'Hoàn thành'),
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
    _tabCtrl.addListener(() {
      if (!_tabCtrl.indexIsChanging) return;
      setState(() => _filterStatus = _tabs[_tabCtrl.index].$1);
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  void _openHistoryTable(BuildContext context, List<HistoryItem> items) {
    final scheme = Theme.of(context).colorScheme;
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => Scaffold(
          backgroundColor: scheme.surface,
          appBar: AppBar(
            title: const Text('Lịch sử báo giá — dạng bảng'),
            actions: [
              IconButton(
                tooltip: 'Đóng',
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          body: SafeArea(
            child: OrientationBuilder(
              builder: (context, orient) {
                return Padding(
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    children: [
                      if (orient == Orientation.portrait)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          margin: const EdgeInsets.only(bottom: 6),
                          decoration: BoxDecoration(
                            color: scheme.primary.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(children: [
                            Icon(Icons.screen_rotation,
                                size: 16, color: scheme.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Xoay ngang máy để xem rộng hơn (cuộn ngang nếu cần)',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: scheme.primary,
                                    fontWeight: FontWeight.w600),
                              ),
                            ),
                          ]),
                        ),
                      Expanded(
                        child: ExpandableTableCard(
                          title: '${items.length} báo giá',
                          icon: Icons.history_rounded,
                          iconColor: AppColors.info,
                          columns: const [
                            TableColumn('Ngày', minWidth: 90),
                            TableColumn('Khách hàng', minWidth: 140),
                            TableColumn('Sản phẩm', minWidth: 160),
                            TableColumn('Cấu trúc', minWidth: 140),
                            TableColumn('SL', minWidth: 70, align: TextAlign.right),
                            TableColumn('Giá / đv', minWidth: 100, align: TextAlign.right),
                            TableColumn('Doanh thu', minWidth: 120, align: TextAlign.right),
                            TableColumn('Trạng thái', minWidth: 100),
                          ],
                          rows: items.map((h) {
                            final dt = DateTime.tryParse(h.date);
                            final dateStr = dt == null
                                ? h.date
                                : '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
                            return [
                              TableCellData(dateStr),
                              TableCellData(h.customer.isEmpty ? '—' : h.customer),
                              TableCellData(h.productName.isEmpty ? '—' : h.productName),
                              TableCellData(h.structure),
                              TableCellData(h.quantity.toString(),
                                  align: TextAlign.right),
                              TableCellData(Fmt.vnd(h.finalPrice.toDouble()),
                                  align: TextAlign.right,
                                  style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.success)),
                              TableCellData(
                                  Fmt.vnd(h.finalPrice.toDouble() *
                                      h.quantity.toDouble()),
                                  align: TextAlign.right,
                                  style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600)),
                              TableCellData(_statusLabel(h.quoteStatus)),
                            ];
                          }).toList(),
                          dense: true,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'drafted':
        return 'Đã lập';
      case 'pending_approval':
        return 'Chờ duyệt';
      case 'approved':
        return 'Đã duyệt';
      case 'completed':
        return 'Hoàn thành';
      case 'rejected':
        return 'Từ chối';
      default:
        return status ?? '—';
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final all = s.history;
    final scheme = Theme.of(context).colorScheme;

    final filtered = all.where((h) {
      final matchQuery = _query.isEmpty ||
          h.customer.toLowerCase().contains(_query.toLowerCase()) ||
          h.productName.toLowerCase().contains(_query.toLowerCase()) ||
          h.structure.toLowerCase().contains(_query.toLowerCase());
      final matchStatus = _filterStatus == null ||
          h.quoteStatus == _filterStatus ||
          (_filterStatus == 'approved' &&
              (h.quoteStatus == 'approved' || h.quoteStatus == 'pending_approval'));
      return matchQuery && matchStatus;
    }).toList();

    final totalRev = all.fold<double>(
        0, (sum, h) => sum + h.finalPrice.toDouble() * h.quantity.toDouble());
    final approvedCount = all
        .where((h) =>
            h.quoteStatus == 'approved' || h.quoteStatus == 'completed')
        .length;

    if (all.isEmpty) return _Empty();

    return Column(
      children: [
        // Stats
        Container(
          color: scheme.surface,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: _StatsRow(
            totalQuotes: all.length,
            totalRevenue: totalRev,
            approved: approvedCount,
          ),
        ),

        // Search bar
        Container(
          color: scheme.surface,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
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
              const SizedBox(width: 8),
              IconButton(
                tooltip: 'Xem dạng bảng (phóng to)',
                icon: const Icon(Icons.table_chart_outlined),
                style: IconButton.styleFrom(
                  backgroundColor:
                      scheme.surfaceContainerHighest.withValues(alpha: 0.6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: filtered.isEmpty
                    ? null
                    : () => _openHistoryTable(context, filtered),
              ),
            ],
          ),
        ),

        // Tab bar filter
        Container(
          color: scheme.surface,
          child: TabBar(
            controller: _tabCtrl,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: scheme.primary,
            unselectedLabelColor: scheme.onSurfaceVariant,
            indicatorColor: scheme.primary,
            indicatorWeight: 2.5,
            indicatorSize: TabBarIndicatorSize.label,
            labelStyle: const TextStyle(
                fontWeight: FontWeight.w700, fontSize: 12.5),
            unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w500, fontSize: 12.5),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            tabs: _tabs.map((t) {
              final count = t.$1 == null
                  ? all.length
                  : all.where((h) => h.quoteStatus == t.$1).length;
              return Tab(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(t.$2),
                    if (count > 0) ...[
                      const SizedBox(width: 5),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: scheme.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(count.toString(),
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: scheme.primary)),
                      ),
                    ],
                  ],
                ),
              );
            }).toList(),
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
                            size: 56, color: scheme.onSurfaceVariant.withValues(alpha: 0.4)),
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
                                style:
                                    Theme.of(context).textTheme.titleSmall),
                            const Spacer(),
                            Text('← Vuốt trái để xoá',
                                style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      );
                    }
                    return _SwipeableCard(
                        item: filtered[i - 1], state: s);
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

  void _showStatusMenu(
      BuildContext context, HistoryItem item, AppState state) {
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
    ('pending_approval', 'Chờ duyệt', const Color(0xFFD97706), Icons.hourglass_empty),
    ('approved', 'Đã duyệt', const Color(0xFF8B5CF6), Icons.verified_outlined),
    ('completed', 'Hoàn thành', const Color(0xFF059669), Icons.check_circle_outline),
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
                final idx =
                    state.history.indexWhere((h) => h.id == item.id);
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
