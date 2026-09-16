// ═══════════════════════════════════════════════════════════════════════════
// Cấu hình — 3 tab: Materials (search + edit), Constants (grouped), Profit table
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/form_widgets.dart';
import '../widgets/lts/lts_chrome.dart';

class CauHinhScreen extends StatelessWidget {
  const CauHinhScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          LtsNavyHeader(
            title: 'Cấu hình tính giá',
            subtitle: 'Vật liệu · Hằng số · Lợi nhuận',
            action: LtsHeaderCircleButton(
              icon: Icons.restore_rounded,
              tooltip: 'Reset về dữ liệu mặc định',
              onTap: () => _confirmReset(context),
            ),
          ),
          Container(
            color: p.surface,
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: p.inputBg,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: p.border),
              ),
              child: const TabBar(
                dividerColor: Colors.transparent,
                indicatorSize: TabBarIndicatorSize.tab,
                indicator: BoxDecoration(
                  color: Color(0xFFF0EEFF),
                  borderRadius: BorderRadius.all(Radius.circular(999)),
                ),
                labelColor: Color(0xFF5B4DFF),
                unselectedLabelColor: Color(0xFF6B7280),
                labelStyle:
                    TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                unselectedLabelStyle:
                    TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                tabs: [
                  Tab(
                      icon: Icon(Icons.inventory_2_outlined, size: 18),
                      iconMargin: EdgeInsets.only(bottom: 2),
                      height: 44,
                      text: 'Vật liệu'),
                  Tab(
                      icon: Icon(Icons.tune, size: 18),
                      iconMargin: EdgeInsets.only(bottom: 2),
                      height: 44,
                      text: 'Hằng số'),
                  Tab(
                      icon: Icon(Icons.trending_up, size: 18),
                      iconMargin: EdgeInsets.only(bottom: 2),
                      height: 44,
                      text: 'Lợi nhuận'),
                ],
              ),
            ),
          ),
          const Expanded(
            child: TabBarView(children: [
              _MaterialsTab(),
              _ConstantsTab(),
              _ProfitTab(),
            ]),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmReset(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.restore_rounded, size: 32),
        title: const Text('Reset cấu hình về mặc định?'),
        content: const Text(
          'Sẽ thay thế Vật liệu / Hằng số / Bảng lợi nhuận hiện tại '
          'bằng dữ liệu gốc đi kèm app (/data ở root repo).\n\n'
          'Lịch sử báo giá và Lệnh sản xuất KHÔNG bị ảnh hưởng.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    await context.read<AppState>().resetConfigToDefaults();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã reset về dữ liệu mặc định'),
        duration: Duration(seconds: 2),
      ),
    );
  }
}

// ── Materials ────────────────────────────────────────────────────────────────
class _MaterialsTab extends StatefulWidget {
  const _MaterialsTab();
  @override
  State<_MaterialsTab> createState() => _MaterialsTabState();
}

class _MaterialsTabState extends State<_MaterialsTab> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final all = s.materials;
    final filtered = _query.isEmpty
        ? all
        : all.where((m) {
            final q = _query.toLowerCase();
            return m.name.toLowerCase().contains(q) ||
                m.id.toLowerCase().contains(q) ||
                (m.group ?? '').toLowerCase().contains(q);
          }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        TextField(
          decoration: InputDecoration(
            hintText: 'Tìm vật liệu…',
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
        Text('${filtered.length} / ${all.length} vật liệu',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        for (final m in filtered) ...[
          _MaterialCard(
            material: m,
            onUpdate: (updated) {
              final idx = all.indexWhere((x) => x.id == m.id);
              if (idx < 0) return;
              final next = List<MaterialDef>.of(all);
              next[idx] = updated;
              s.setMaterials(next);
            },
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _MaterialCard extends StatelessWidget {
  final MaterialDef material;
  final ValueChanged<MaterialDef> onUpdate;
  const _MaterialCard({required this.material, required this.onUpdate});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final m = material;
    return Card(
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          shape: const RoundedRectangleBorder(),
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          leading: Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('${m.thickness}μ',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: scheme.primary)),
          ),
          title: Text(m.name,
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
                '${m.id}  ·  ${Fmt.n(m.pricePerKg.round())} đ/kg  ·  ${m.group ?? "—"}',
                style: Theme.of(context).textTheme.bodySmall),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _Field(
                    label: 'Giá / kg',
                    initial: m.pricePerKg,
                    onChanged: (v) => onUpdate(m.copyWith(pricePerKg: v)),
                    suffix: 'đ',
                  ),
                  _Field(
                    label: 'Mực / màu',
                    initial: m.inkPricePerColor,
                    onChanged: (v) => onUpdate(m.copyWith(inkPricePerColor: v)),
                    suffix: 'đ',
                  ),
                  _Field(
                    label: 'Dài cuộn',
                    initial: m.rollLength,
                    onChanged: (v) => onUpdate(m.copyWith(rollLength: v)),
                    suffix: 'm',
                  ),
                  _Field(
                    label: 'Khối lượng riêng',
                    initial: m.density,
                    onChanged: (v) => onUpdate(m.copyWith(density: v)),
                    integer: false,
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

class _Field extends StatelessWidget {
  final String label;
  final double initial;
  final ValueChanged<double> onChanged;
  final String? suffix;
  final bool integer;
  const _Field({
    required this.label,
    required this.initial,
    required this.onChanged,
    this.suffix,
    this.integer = true,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 150,
      child: LabeledField(
        label: label,
        child: NumField(
          initial: initial,
          integer: integer,
          suffix: suffix,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

// ── Constants ────────────────────────────────────────────────────────────────
class _ConstantsTab extends StatelessWidget {
  const _ConstantsTab();

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final c = s.constants;

    Widget row(String k, String label,
        {bool integer = false, String? suffix, String? hint}) {
      final v = (c.raw[k] as num?)?.toDouble() ?? 0;
      return LabeledField(
        label: label,
        suffix: suffix != null ? '($suffix)' : null,
        hint: hint,
        child: NumField(
          initial: v,
          integer: integer,
          suffix: suffix,
          onChanged: (newV) => s.setConstants(c.withField(k, newV)),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        // ── Lãi suất với highlight tổng ──
        SectionCard(
          title: 'Lãi suất',
          subtitle: 'Mức cơ sở + thêm = lãi áp dụng',
          icon: Icons.percent_outlined,
          iconColor: AppColors.warning,
          children: [
            Row(children: [
              Expanded(
                child: LabeledField(
                  label: 'Lãi cơ sở',
                  hint: 'VD: 0.10 = 10%',
                  child: NumField(
                    initial: c.interestBase,
                    onChanged: (v) =>
                        s.setConstants(c.withField('interestBase', v)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: LabeledField(
                  label: 'Lãi thêm',
                  hint: 'VD: 0.03 = 3%',
                  child: NumField(
                    initial: c.interestSpread,
                    onChanged: (v) =>
                        s.setConstants(c.withField('interestSpread', v)),
                  ),
                ),
              ),
            ]),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border:
                    Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.calculate_outlined,
                      size: 16, color: AppColors.warning),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Tổng lãi áp dụng',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.warning)),
                  ),
                  Text('${Fmt.pct(c.interestBase + c.interestSpread)}% / năm',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.warning)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        SectionCard(
          title: 'Phụ kiện',
          icon: Icons.extension_outlined,
          iconColor: AppColors.success,
          children: [
            row('zipperPrice', 'Giá khoá', integer: true, suffix: 'đ'),
            row('tapePrice', 'Giá băng keo', integer: true, suffix: 'đ'),
            row('handlePrice', 'Giá quai xách', integer: true, suffix: 'đ'),
          ],
        ),
        const SizedBox(height: 14),

        SectionCard(
          title: 'Trục in',
          icon: Icons.album_outlined,
          iconColor: AppColors.muted,
          children: [
            row('cylPriceA', 'Đơn giá trục A', integer: true, suffix: 'đ/m²'),
            row('cylPriceB', 'Đơn giá trục B', integer: true, suffix: 'đ/m²'),
          ],
        ),
        const SizedBox(height: 14),

        SectionCard(
          title: 'Sản xuất — In / Ghép / Cắt',
          subtitle: 'Hệ số phi hao và chi phí cơ bản',
          icon: Icons.factory_outlined,
          iconColor: AppColors.info,
          children: [
            row('ghepCPSX', 'CPSX Ghép', integer: true, suffix: 'đ'),
            row('cutBase', 'CP Cắt cơ bản', integer: true, suffix: 'đ'),
            row('laborCost', 'CPSX khâu in', integer: true, suffix: 'đ/m²'),
            const SizedBox(height: 4),
            Text('PHI HAO IN', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: row('printWasteA', 'A', integer: true)),
              const SizedBox(width: 10),
              Expanded(child: row('printWasteB', 'B', integer: true)),
            ]),
            Row(children: [
              Expanded(child: row('printWasteC', 'C', integer: true)),
              const SizedBox(width: 10),
              Expanded(child: row('printWasteD', 'D', integer: true)),
            ]),
          ],
        ),
        const SizedBox(height: 14),

        SectionCard(
          title: 'Vận chuyển',
          icon: Icons.local_shipping_outlined,
          iconColor: AppColors.accent,
          children: [
            row('shippingPerKmDefault', 'Cước / km mặc định',
                integer: true, suffix: 'đ/km'),
            row('shippingKmDefault', 'Km mặc định',
                integer: true, suffix: 'km'),
          ],
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}

// ── Profit table ─────────────────────────────────────────────────────────────
class _ProfitTab extends StatelessWidget {
  const _ProfitTab();

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final rows = s.profitTable;
    final scheme = Theme.of(context).colorScheme;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Icon(Icons.info_outline, color: scheme.primary, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Lợi nhuận theo bậc tổng chi phí. Tổng < ngưỡng → áp dụng cột tương ứng.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(children: [
              Expanded(
                  flex: 4,
                  child: Text('Tổng chi phí <',
                      style: Theme.of(context).textTheme.labelMedium)),
              Expanded(
                  flex: 3,
                  child: Center(
                      child: Text('Cột 1',
                          style: Theme.of(context).textTheme.labelMedium))),
              Expanded(
                  flex: 3,
                  child: Center(
                      child: Text('Cột 2',
                          style: Theme.of(context).textTheme.labelMedium))),
            ]),
          ),
        ),
        const SizedBox(height: 8),
        for (int i = 0; i < rows.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Card(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(children: [
                  Expanded(
                    flex: 4,
                    child: Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: scheme.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text('${i + 1}',
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: scheme.primary)),
                        ),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(Fmt.vnd(rows[i].threshold),
                              style: const TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Center(
                      child: _PctChip(v: rows[i].col1, color: AppColors.muted),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Center(
                      child:
                          _PctChip(v: rows[i].col2, color: AppColors.success),
                    ),
                  ),
                ]),
              ),
            ),
          ),
      ],
    );
  }
}

class _PctChip extends StatelessWidget {
  final double v;
  final Color color;
  const _PctChip({required this.v, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text('${Fmt.pct(v)}%',
          style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w700, color: color)),
    );
  }
}
