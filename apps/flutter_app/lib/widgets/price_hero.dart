// ═══════════════════════════════════════════════════════════════════════════
// Price Hero — card lớn hiển thị giá + stats grid + section breakdown
// Thiết kế: gradient hero có brand mark, typography lớn, stat cards có icon
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import '../engine/models.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';

class PriceHero extends StatelessWidget {
  final CalculateResult? result;
  final String productType;
  const PriceHero({super.key, required this.result, required this.productType});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final r = result;

    if (r == null) {
      return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: AppGradients.subtle(scheme),
          border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.5)),
        ),
        padding: const EdgeInsets.all(24),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: scheme.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.calculate_outlined,
                  color: scheme.primary, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Bắt đầu tính giá',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text('Nhập khách hàng, cấu trúc lớp, kích thước & số lượng',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final isMang = productType == 'mang';
    final finalPrice = r.finalPrice;
    final rollArea = r.d('filmRollArea');
    final pricePerRoll = rollArea > 0 ? finalPrice * rollArea : 0.0;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: AppGradients.hero(scheme),
        boxShadow: [
          BoxShadow(
            color: scheme.primary.withValues(alpha: 0.25),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Decorative circles
          Positioned(
            right: -30,
            top: -30,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            right: 40,
            bottom: -50,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.25)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isMang
                                ? Icons.view_stream_outlined
                                : Icons.shopping_bag_outlined,
                            size: 14,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            isMang ? 'MÀNG' : 'TÚI',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Icon(Icons.auto_awesome,
                        color: Colors.white.withValues(alpha: 0.7), size: 18),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  isMang ? 'Giá đề xuất / m²' : 'Giá đề xuất / cái',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                      color: Colors.white.withValues(alpha: 0.85)),
                ),
                const SizedBox(height: 2),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      Fmt.n(finalPrice.round()),
                      style: const TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        height: 1.05,
                        letterSpacing: -1.2,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text('₫',
                          style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w600,
                              color: Colors.white.withValues(alpha: 0.85))),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.layers_outlined,
                          size: 13,
                          color: Colors.white.withValues(alpha: 0.8)),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          r.structureText.isEmpty
                              ? 'Chưa có cấu trúc'
                              : r.structureText,
                          style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.2,
                              color: Colors.white.withValues(alpha: 0.9)),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    _HeroStat(
                      label: 'Giá vốn / đv',
                      value: Fmt.vnd(r.costPerUnit),
                      icon: Icons.inventory_2_outlined,
                    ),
                    const SizedBox(width: 10),
                    _HeroStat(
                      label: '% Lợi nhuận',
                      value: '${Fmt.pct(r.profitRate)}%',
                      icon: Icons.trending_up,
                    ),
                    if (isMang && rollArea > 0) ...[
                      const SizedBox(width: 10),
                      _HeroStat(
                        label: 'Giá / cuộn',
                        value: Fmt.vnd(pricePerRoll),
                        icon: Icons.album_outlined,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _HeroStat(
      {required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(children: [
              Icon(icon, size: 13, color: Colors.white.withValues(alpha: 0.75)),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                      color: Colors.white.withValues(alpha: 0.85)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ]),
            const SizedBox(height: 4),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.3),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Breakdown (các khoản chi phí) ──────────────────────────────────────────
class BreakdownPanel extends StatelessWidget {
  final CalculateResult result;
  const BreakdownPanel({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final r = result;
    final scheme = Theme.of(context).colorScheme;

    final items = <_BreakdownItem>[
      _BreakdownItem(
          icon: Icons.palette_outlined,
          label: 'Chi phí In',
          value: r.d('printTotalCost'),
          color: AppColors.info),
      _BreakdownItem(
          icon: Icons.merge_outlined,
          label: 'Chi phí Ghép',
          value: r.d('totalLamCost'),
          color: AppColors.accent),
      _BreakdownItem(
          icon: Icons.content_cut,
          label: 'Chi phí Cắt',
          value: r.d('cutTotalCost'),
          color: AppColors.warning),
      _BreakdownItem(
          icon: Icons.album_outlined,
          label: 'Chi phí Trục',
          value: r.cylinderCost,
          color: AppColors.muted),
    ];
    final maxVal = items.fold<double>(
        0, (m, it) => it.value > m ? it.value : m);

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Icon(Icons.pie_chart_outline,
                  size: 20, color: scheme.primary),
              const SizedBox(width: 8),
              Text('Phân tích chi phí',
                  style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              Text('Tổng ${Fmt.vnd(r.d('totalProductionCost'))}',
                  style: Theme.of(context)
                      .textTheme
                      .labelMedium
                      ?.copyWith(color: scheme.primary)),
            ]),
            const SizedBox(height: 16),
            ...items.map((it) => _BreakdownRow(item: it, max: maxVal)),
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),
            _KVRow(
              label: 'Lãi suất / đv',
              value: Fmt.vnd(r.d('interestPerUnit')),
              icon: Icons.percent,
            ),
            _KVRow(
              label: 'Vận chuyển / đv',
              value: Fmt.vnd(r.d('shippingPerUnit')),
              icon: Icons.local_shipping_outlined,
            ),
            _KVRow(
              label: 'Tổng diện tích',
              value: '${Fmt.d3(r.totalArea)} m²',
              icon: Icons.grid_on_outlined,
            ),
            _KVRow(
              label: 'Số ngày SX',
              value: '${Fmt.d(r.d('productionDays'))} ngày',
              icon: Icons.event_outlined,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: AppColors.success.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.trending_up, color: AppColors.success, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Lợi nhuận dự kiến',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.success)),
                        const SizedBox(height: 2),
                        Text(Fmt.vnd(r.profitAmount),
                            style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                color: AppColors.success,
                                letterSpacing: -0.3)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.success,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('${Fmt.pct(r.profitRate)}%',
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 13)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BreakdownItem {
  final IconData icon;
  final String label;
  final double value;
  final Color color;
  _BreakdownItem(
      {required this.icon,
      required this.label,
      required this.value,
      required this.color});
}

class _BreakdownRow extends StatelessWidget {
  final _BreakdownItem item;
  final double max;
  const _BreakdownRow({required this.item, required this.max});

  @override
  Widget build(BuildContext context) {
    final ratio = max > 0 ? (item.value / max).clamp(0.0, 1.0) : 0.0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: item.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(item.icon, size: 14, color: item.color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(item.label,
                    style: Theme.of(context).textTheme.bodyMedium),
              ),
              Text(Fmt.vnd(item.value),
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(color: item.color)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 4,
              backgroundColor: item.color.withValues(alpha: 0.1),
              valueColor: AlwaysStoppedAnimation(item.color),
            ),
          ),
        ],
      ),
    );
  }
}

class _KVRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _KVRow(
      {required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(icon, size: 14, color: scheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: scheme.onSurfaceVariant)),
          ),
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
