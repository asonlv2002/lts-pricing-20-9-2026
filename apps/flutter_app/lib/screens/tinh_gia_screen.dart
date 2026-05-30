// ═══════════════════════════════════════════════════════════════════════════
// TinhGiaScreen — Redesign full mobile-first
// Flow: Thông tin cơ bản → Chọn loại → Cấu trúc lớp → Kích thước → Nâng cao
// Sticky bottom bar với nút Lưu + Reset
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../engine/models.dart';
import '../engine/js_runtime.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/detail_tables.dart';
import '../widgets/form_widgets.dart';
import '../widgets/material_picker.dart';
import '../widgets/price_hero.dart';

class TinhGiaScreen extends StatelessWidget {
  const TinhGiaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final twoCol = width >= 900;
    final s = context.watch<AppState>();

    if (twoCol) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 6,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: _InputForm(state: s),
            ),
          ),
          const SizedBox(width: 0),
          Expanded(
            flex: 4,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(0, 20, 20, 20),
              child: _ResultPanel(state: s),
            ),
          ),
        ],
      );
    }

    return _MobilePricingWorkspace(state: s);

  }
}

// ─── Sticky bottom action bar ────────────────────────────────────────────────

class _MobilePricingWorkspace extends StatefulWidget {
  final AppState state;
  const _MobilePricingWorkspace({required this.state});
  @override
  State<_MobilePricingWorkspace> createState() => _MobilePricingWorkspaceState();
}

class _MobilePricingWorkspaceState extends State<_MobilePricingWorkspace> with SingleTickerProviderStateMixin {
  late final TabController _controller;
  AppState get state => widget.state;
  @override
  void initState() { super.initState(); _controller = TabController(length: 2, vsync: this); }
  @override
  void didUpdateWidget(covariant _MobilePricingWorkspace oldWidget) {
    super.didUpdateWidget(oldWidget);
    final requested = state.requestedTabIndex;
    if (requested != null && requested >= 0 && requested < _controller.length) {
      _controller.animateTo(requested);
      state.consumeTabRequest();
    }
  }
  @override
  void dispose() { _controller.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(children: [
      Material(color: scheme.surface, child: SafeArea(bottom: false, child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
        child: Column(children: [
          _LiveQuoteStrip(state: state, onOpenResult: () => _controller.animateTo(1)),
          const SizedBox(height: 10),
          Container(height: 52, padding: const EdgeInsets.all(4), decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.35)),
          ), child: TabBar(controller: _controller, indicatorSize: TabBarIndicatorSize.tab,
            dividerColor: Colors.transparent, labelColor: scheme.onPrimary,
            unselectedLabelColor: scheme.onSurfaceVariant,
            indicator: BoxDecoration(color: scheme.primary, borderRadius: BorderRadius.circular(12)),
            tabs: const [
              Tab(child: _CompactTabLabel(icon: Icons.edit_note_outlined, text: 'Nhập liệu')),
              Tab(child: _CompactTabLabel(icon: Icons.analytics_outlined, text: 'Kết quả')),
            ])),
        ]),
      ))),
      Expanded(child: TabBarView(controller: _controller, children: [
        SingleChildScrollView(padding: const EdgeInsets.fromLTRB(12, 8, 12, 0), child: _InputForm(state: state)),
        SingleChildScrollView(padding: const EdgeInsets.fromLTRB(12, 8, 12, 96), child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [_MobileResultQuickActions(result: state.currentResult), const SizedBox(height: 12), _ResultPanel(state: state)],
        )),
      ])),
      _StickyBottomBar(state: state),
    ]);
  }
}

class _CompactTabLabel extends StatelessWidget {
  final IconData icon;
  final String text;
  const _CompactTabLabel({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18),
        const SizedBox(width: 6),
        Flexible(child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
class _LiveQuoteStrip extends StatelessWidget {
  final AppState state;
  final VoidCallback onOpenResult;
  const _LiveQuoteStrip({required this.state, required this.onOpenResult});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final input = state.currentInput;
    final raw = input.raw;
    final result = state.currentResult;
    final isMang = input.productType == 'mang';
    final unit = isMang ? 'm²' : 'túi';
    final qty = (raw['quantity'] as num?)?.toDouble() ?? 0;
    final title = input.productName.isEmpty ? 'Báo giá mới' : input.productName;
    final subtitle = [input.customer.isEmpty ? null : input.customer, result?.structureText.isNotEmpty == true ? result!.structureText : null].whereType<String>().join(' · ');
    return InkWell(borderRadius: BorderRadius.circular(18), onTap: result == null ? null : onOpenResult, child: Container(
      padding: const EdgeInsets.all(14), decoration: BoxDecoration(
        gradient: LinearGradient(colors: [scheme.primaryContainer.withValues(alpha: 0.95), scheme.tertiaryContainer.withValues(alpha: 0.62)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(18), border: Border.all(color: scheme.primary.withValues(alpha: 0.12)),
      ), child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(subtitle.isEmpty ? 'Nhập thông tin để xem giá trực tiếp' : subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 6, children: [
            _MiniPill(icon: Icons.inventory_2_outlined, text: isMang ? 'Màng' : 'Túi'),
            _MiniPill(icon: Icons.format_list_numbered, text: '${_fmt(qty)} $unit'),
            if (result != null) _MiniPill(icon: Icons.straighten, text: '${result.d('tongDoDay').toStringAsFixed(1)} mic'),
          ]),
        ])),
        const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(result == null ? 'Chưa có giá' : '${_fmt(result.finalPrice)} đ', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900, color: result == null ? scheme.onSurfaceVariant : AppColors.success)),
          Text('/$unit', style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
          if (result != null) ...[const SizedBox(height: 6), Icon(Icons.arrow_forward_ios_rounded, size: 14, color: scheme.onSurfaceVariant)],
        ]),
      ]),
    ));
  }
}

class _MiniPill extends StatelessWidget {
  final IconData icon; final String text;
  const _MiniPill({required this.icon, required this.text});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: scheme.surface.withValues(alpha: 0.72), borderRadius: BorderRadius.circular(999)), child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 13, color: scheme.primary), const SizedBox(width: 4), Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))]));
  }
}

class _MobileResultQuickActions extends StatelessWidget {
  final CalculateResult? result;
  const _MobileResultQuickActions({required this.result});
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final r = result;
    return Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [Icon(Icons.table_chart_outlined, size: 18, color: scheme.primary), const SizedBox(width: 8), Expanded(child: Text('Bảng tính nhanh', style: Theme.of(context).textTheme.titleSmall)), Text('Xoay ngang', style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant))]),
      const SizedBox(height: 12),
      GridView.count(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), crossAxisCount: 2, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 2.9, children: [
        _TableAction(label: 'Tổng quan', icon: Icons.account_balance_wallet_outlined, enabled: r != null, onTap: () => showOverviewTable(context, r!)),
        _TableAction(label: 'Chi phí', icon: Icons.pie_chart_outline, enabled: r != null, onTap: () => showCostTable(context, r!)),
        _TableAction(label: 'Sản xuất', icon: Icons.precision_manufacturing_outlined, enabled: r != null, onTap: () => showProductionTable(context, r!)),
        _TableAction(label: 'Trục in', icon: Icons.album_outlined, enabled: r != null, onTap: () => showCylinderTable(context, r!)),
      ]),
    ])));
  }
}

class _TableAction extends StatelessWidget {
  final String label; final IconData icon; final bool enabled; final VoidCallback onTap;
  const _TableAction({required this.label, required this.icon, required this.enabled, required this.onTap});
  @override
  Widget build(BuildContext context) => OutlinedButton.icon(onPressed: enabled ? onTap : null, icon: Icon(icon, size: 16), label: Text(label), style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10), textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)));
}

String _fmt(num v) => v.round().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');

class _StickyBottomBar extends StatelessWidget {
  final AppState state;
  const _StickyBottomBar({required this.state});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: EdgeInsets.fromLTRB(
          14, 10, 14, 10 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.3))),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _tinhGia(context),
              icon: const Icon(Icons.calculate_outlined, size: 18),
              label: const Text('Tính giá'),
              style: FilledButton.styleFrom(
                backgroundColor: scheme.primary,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: FilledButton.tonalIcon(
              onPressed: state.currentResult == null
                  ? null
                  : () async {
                      await state.saveCurrentToHistory();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Row(children: const [
                              Icon(Icons.check_circle,
                                  color: Colors.white, size: 18),
                              SizedBox(width: 8),
                              Text('Đã lưu vào lịch sử'),
                            ]),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    },
              icon: const Icon(Icons.bookmark_add_outlined, size: 18),
              label: const Text('Lưu'),
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            onPressed: () => state.setInput(CalculateInput.defaults()),
            child: const Text('Reset'),
          ),
          if (state.currentResult != null) ...[
            const SizedBox(width: 8),
            IconButton.outlined(
              tooltip: 'Copy kết quả',
              icon: const Icon(Icons.copy_outlined, size: 18),
              onPressed: () => _copyResult(context, state),
            ),
          ],
        ],
      ),
    );
  }

  /// Validate + trigger recompute + show errors
  void _tinhGia(BuildContext context) {
    final i = state.currentInput.raw;
    final productType = (i['productType'] as String?) ?? '';
    final bagType = (i['bagType'] as String?) ?? '';
    final filmType = (i['filmType'] as String?) ?? '';
    final quantity = (i['quantity'] as num?)?.toDouble() ?? 0;
    final spreadWidth = (i['spreadWidth'] as num?)?.toDouble() ?? 0;
    final cutStep = (i['cutStep'] as num?)?.toDouble() ?? 0;
    final numColors = (i['numColors'] as num?)?.toInt();

    final errors = <String>[];
    if (productType.isEmpty) errors.add('Chưa chọn loại sản phẩm');
    if (productType == 'tui' && bagType.isEmpty) errors.add('Chưa chọn loại túi');
    if (productType == 'mang' && filmType.isEmpty) errors.add('Chưa chọn loại màng');
    if (quantity <= 0) errors.add('Chưa nhập số lượng');
    if (spreadWidth <= 0) errors.add('Chưa nhập khổ trải');
    if (cutStep <= 0) errors.add('Chưa nhập bước cắt');
    if (numColors == null) errors.add('Chưa chọn số màu in');

    if (errors.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(errors.join('\n'),
                    style: const TextStyle(fontSize: 13)),
              ),
            ],
          ),
          backgroundColor: AppColors.danger,
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    state.recomputeNow();
    if (state.lastError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text('Lỗi: ${state.lastError}')),
            ],
          ),
          backgroundColor: AppColors.danger,
          duration: const Duration(seconds: 3),
        ),
      );
    } else if (state.currentResult != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text('Đã tính xong'),
            ],
          ),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _copyResult(BuildContext context, AppState state) async {
    final r = state.currentResult;
    if (r == null) return;
    final i = state.currentInput;
    final isMang = i.productType == 'mang';
    final filmRollLength = i.get<num>('filmRollLength')?.toInt() ?? 6000;
    final fmtPct = (double n) =>
        '${(n * 100).toStringAsFixed(2)}%';
    final fmtVnd = (double v) => v
        .round()
        .toString()
        .replaceAllMapped(
            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
    final text = [
      '${i.customer.isEmpty ? 'N/A' : i.customer} — ${i.productName.isEmpty ? 'N/A' : i.productName}',
      'Cấu trúc: ${r.structureText} | Độ dày: ${r.d('totalThickness').toStringAsFixed(1)}mic',
      isMang
          ? 'Diện tích: ${fmtVnd(i.quantity.toDouble())} m² | KT: ${(r.d('spreadWidth') * 1000).toStringAsFixed(0)}×${(r.d('cutStep') * 1000).toStringAsFixed(0)} mm² | Cuộn: ${fmtVnd(filmRollLength.toDouble())}m/cuộn'
          : 'SL: ${fmtVnd(i.quantity.toDouble())} túi | KT: ${(r.d('spreadWidth') * 1000).toStringAsFixed(0)}×${(r.d('cutStep') * 1000).toStringAsFixed(0)} mm²',
      isMang
          ? 'GIÁ ĐỀ XUẤT: ${fmtVnd(r.finalPrice)} đ/m² (chưa VAT)'
          : 'GIÁ ĐỀ XUẤT: ${fmtVnd(r.finalPrice)} đ/túi (chưa VAT)',
      'Giá vốn: ${fmtVnd(r.costPerUnit)} đ | LN: ${fmtPct(r.profitRate)} | DT: ${(r.revenue / 1000000).toStringAsFixed(1)}tr',
      'Trục in: ${(r.cylinderCost / 1000000).toStringAsFixed(1)}tr (riêng)',
    ].join('\n');

    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Đã copy kết quả vào clipboard'),
        duration: Duration(seconds: 2),
      ));
    }
  }


}

// ─── Result Panel ────────────────────────────────────────────────────────────
class _ResultPanel extends StatelessWidget {
  final AppState state;
  const _ResultPanel({required this.state});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.lastError != null)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.08),
              border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: AppColors.danger, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Lỗi: ${state.lastError}',
                      style: TextStyle(
                          color: AppColors.danger,
                          fontSize: 12,
                          fontWeight: FontWeight.w500)),
                ),
              ],
            ),
          ),
        PriceHero(
            result: state.currentResult,
            productType: state.currentInput.productType),
        if (state.currentResult != null) ...[
          const SizedBox(height: 12),
          BreakdownPanel(result: state.currentResult!),
        ],
      ],
    );
  }
}

// ─── Input Form — mobile scrollable ──────────────────────────────────────────
class _InputForm extends StatefulWidget {
  final AppState state;
  const _InputForm({required this.state});

  @override
  State<_InputForm> createState() => _InputFormState();
}

class _InputFormState extends State<_InputForm> {
  bool _advancedOpen = false;

  AppState get s => widget.state;
  Map<String, dynamic> get i => s.currentInput.raw;

  void u(String key, dynamic value) => s.updateInput(key, value);

  String get _productType => (i['productType'] as String?) ?? 'tui';
  bool get _isMang => _productType == 'mang';
  String get _bagType => (i['bagType'] as String?) ?? '';
  String get _filmType => (i['filmType'] as String?) ?? '';

  // Cấu trúc chỉ hiện khi chọn loại cụ thể
  bool get _showStructure =>
      (_productType == 'tui' && _bagType.isNotEmpty) ||
      (_productType == 'mang' && _filmType.isNotEmpty);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── 1. Sản phẩm ───────────────────────────────────────────────────
        SectionCard(
          title: 'Thông tin sản phẩm',
          icon: Icons.description_outlined,
          iconColor: AppColors.info,
          children: [
            LabeledField(
              label: 'Khách hàng',
              icon: Icons.person_outline,
              child: TxtField(
                initial: (i['customer'] as String?) ?? '',
                hintText: 'Tên khách hàng…',
                onChanged: (v) => u('customer', v),
              ),
            ),
            LabeledField(
              label: 'Tên sản phẩm',
              icon: Icons.inventory_2_outlined,
              child: TxtField(
                initial: (i['productName'] as String?) ?? '',
                hintText: 'VD: Túi gạo 5kg',
                onChanged: (v) => u('productName', v),
              ),
            ),
            LabeledField(
              label: 'Loại sản phẩm',
              child: ChipSelect<String>(
                options: const [('tui', '🛍️ Túi'), ('mang', '📜 Màng')],
                selected: _productType,
                onChanged: (v) {
                  u('productType', v);
                  u('bagType', '');
                  u('filmType', '');
                },
              ),
            ),
            if (_productType == 'tui')
              LabeledField(
                label: 'Loại túi',
                child: DropdownField<String>(
                  options: const [
                    (null, 'Chọn loại túi'),
                    ('3bien', '3 biên'),
                    ('4bien', '4 biên'),
                    ('xephong_lech', 'Xếp hông dán lưng lệch'),
                    ('xephong_giua', 'Xếp hông dán lưng giữa'),
                    ('dayDung', 'Đáy đứng'),
                    ('cutSeal', 'Cut seal'),
                  ],
                  selected: _bagType.isEmpty ? null : _bagType,
                  onChanged: (v) => u('bagType', v ?? ''),
                ),
              ),
            if (_productType == 'mang')
              LabeledField(
                label: 'Loại màng',
                child: DropdownField<String>(
                  options: const [
                    (null, 'Chọn loại màng'),
                    ('mangIn', 'Màng in'),
                    ('mangGhep', 'Màng ghép'),
                    ('mangDongGoi', 'Màng đóng gói tự động'),
                  ],
                  selected: _filmType.isEmpty ? null : _filmType,
                  onChanged: (v) => u('filmType', v ?? ''),
                ),
              ),
            LabeledField(
              label: _isMang ? 'Diện tích' : 'Số lượng',
              suffix: _isMang ? '(m²)' : '(cái)',
              icon: Icons.numbers,
              child: NumField(
                initial: (i['quantity'] as num?) ?? 0,
                integer: !_isMang,
                suffix: _isMang ? 'm²' : 'cái',
                onChanged: (v) => u('quantity', v),
              ),
            ),
            if (_isMang)
              LabeledField(
                label: 'Chiều dài mỗi cuộn màng TP',
                suffix: '(m)',
                child: NumField(
                  initial: (i['filmRollLength'] as num?) ?? 6000,
                  integer: true,
                  suffix: 'm',
                  onChanged: (v) => u('filmRollLength', v),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),

        // ── 2. Cấu trúc + Kích thước (chỉ hiện khi đã chọn loại) ─────────
        if (_showStructure) ...[
          SectionCard(
            title: 'Cấu trúc lớp',
            subtitle: 'Tối đa 5 lớp · Chọn từ trên xuống',
            icon: Icons.layers_outlined,
            iconColor: AppColors.accent,
            children: [
              LabeledField(
                label: 'Độ dày mục tiêu',
                suffix: '(mic)',
                icon: Icons.straighten_outlined,
                child: NumField(
                  initial: (i['targetThickness'] as num?) ?? 0,
                  integer: true,
                  suffix: 'mic',
                  onChanged: (v) => u('targetThickness', v.toInt()),
                ),
              ),
              if (((i['targetThickness'] as num?)?.toInt() ?? 0) > 0)
                LabeledField(
                  label: 'Tự động tối ưu',
                  child: Row(
                    children: [
                      Switch(
                        value: (i['autoOptimizeThickness'] as bool?) ?? false,
                        onChanged: (v) => u('autoOptimizeThickness', v),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Tìm mức thấp nhất thỏa '
                          '[${((i['targetThickness'] as num?)?.toInt() ?? 0) - 5}, '
                          '${((i['targetThickness'] as num?)?.toInt() ?? 0) + 5}] mic',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              if (((i['targetThickness'] as num?)?.toInt() ?? 0) > 0 &&
                  (i['autoOptimizeThickness'] as bool?) == true)
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 8),
                  child: FilledButton.icon(
                    onPressed: () async {
                      final target = (i['targetThickness'] as num?)?.toInt() ?? 0;
                      if (target <= 0) return;
                      // Build current layers
                      final layers = <Map<String, dynamic>>[];
                      for (final k in ['layer1Id', 'layer2Id', 'layer3Id', 'layer4Id', 'layer5Id']) {
                        final id = i[k] as String?;
                        if (id == null) continue;
                        final mat = s.materials.firstWhere(
                          (m) => m.id == id,
                          orElse: () => MaterialDef(
                            id: id, name: id, density: 0, thickness: 0,
                            pricePerKg: 0, isPETorPA: false, rollLength: 0, inkPricePerColor: 0,
                          ),
                        );
                        layers.add({
                          'id': k,
                          'materialId': mat.id,
                          'doDay': (i['micOverrides'] as Map?)?[k] as num? ?? mat.thickness,
                          'isLLDPE': mat.name.toLowerCase().contains('lldpe') ||
                              (mat.group?.toLowerCase().contains('lldpe') ?? false),
                        });
                      }
                      if (layers.isEmpty) return;
                      // Call JS engine via EngineService
                      final engine = EngineService.instance;
                      if (!engine.isReady) await engine.init();
                      final layersJson = jsonEncode(layers);
                      final matsJson = jsonEncode(s.materials.map((m) => m.toJson()).toList());
                      final code = 'globalThis.LTS.toiUuDoDay($target, JSON.parse(${jsonEncode(layersJson)}), JSON.parse(${jsonEncode(matsJson)}))';
                      final resultJson = engine.evaluateCode(code);
                      if (resultJson != null && !resultJson.isError) {
                        final result = jsonDecode(resultJson.stringResult) as Map<String, dynamic>;
                        final optimized = result['ketQua'] as List? ?? [];
                        final newOverrides = Map<String, dynamic>.from(
                            (i['micOverrides'] as Map?) ?? {});
                        // Build change summary
                        final changes = <String>[];
                        for (final kq in optimized) {
                          final layerId = kq['layerId'] as String;
                          final adjusted = (kq['adjustedThickness'] as num).toDouble();
                          final selectedMaterialId = kq['materialId'] as String?;
                          final mat = s.materials.firstWhere(
                            (m) => m.id == i[layerId],
                            orElse: () => MaterialDef(
                              id: '', name: '', density: 0, thickness: 0,
                              pricePerKg: 0, isPETorPA: false, rollLength: 0, inkPricePerColor: 0,
                            ),
                          );
                          final selectedMat = s.materials.firstWhere(
                            (m) => m.id == (selectedMaterialId ?? mat.id),
                            orElse: () => mat,
                          );
                          if (selectedMaterialId != null && selectedMaterialId != mat.id) {
                            u(layerId, selectedMaterialId);
                            changes.add('${mat.name}: ${selectedMat.name} ${selectedMat.thickness}');
                          }
                          if (adjusted != selectedMat.thickness) {
                            newOverrides[layerId] = adjusted;
                            changes.add('${selectedMat.name}: ${selectedMat.thickness}→$adjusted');
                          } else {
                            newOverrides.remove(layerId);
                          }
                        }
                        u('micOverrides', newOverrides);
                        final tongThucTe = (result['tongThucTe'] as num).toInt();
                        final datYeuCau = result['datYeuCau'] as bool? ?? false;
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                datYeuCau
                                    ? 'Đã tối ưu: $tongThucTe mic (thỏa [${target - 5}, ${target + 5}])\n${changes.join(', ')}'
                                    : (result['canhBao'] as String? ?? 'Không đạt yêu cầu'),
                              ),
                              duration: const Duration(seconds: 4),
                            ),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.auto_fix_high, size: 16),
                    label: const Text('Tính độ dày'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      textStyle: const TextStyle(fontSize: 12),
                    ),
                  ),
                ),
              _StructurePreview(
                materials: s.materials,
                input: i,
                targetThickness: (i['targetThickness'] as num?)?.toInt() ?? 0,
              ),
              const SizedBox(height: 8),
              _LayerPickerRow(
                label: 'Lớp 1 (In)',
                icon: Icons.palette_outlined,
                materials: s.materials,
                layerKey: 'layer1Id',
                disabled: false,
                input: i,
                onChanged: (v) => _onLayerChange('layer1Id', v),
                onMicOverride: _onMicOverride,
              ),
              _LayerPickerRow(
                label: 'Lớp 2',
                materials: s.materials,
                layerKey: 'layer2Id',
                disabled: i['layer1Id'] == null,
                input: i,
                onChanged: (v) => _onLayerChange('layer2Id', v),
                onMicOverride: _onMicOverride,
              ),
              _LayerPickerRow(
                label: 'Lớp 3',
                materials: s.materials,
                layerKey: 'layer3Id',
                disabled: i['layer2Id'] == null,
                input: i,
                onChanged: (v) => _onLayerChange('layer3Id', v),
                onMicOverride: _onMicOverride,
              ),
              _LayerPickerRow(
                label: 'Lớp 4',
                materials: s.materials,
                layerKey: 'layer4Id',
                disabled: i['layer3Id'] == null,
                input: i,
                onChanged: (v) => _onLayerChange('layer4Id', v),
                onMicOverride: _onMicOverride,
              ),
              _LayerPickerRow(
                label: 'Lớp 5',
                materials: s.materials,
                layerKey: 'layer5Id',
                disabled: i['layer4Id'] == null,
                input: i,
                onChanged: (v) => _onLayerChange('layer5Id', v),
                onMicOverride: _onMicOverride,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── 3. Kích thước & In ──────────────────────────────────────────
          SectionCard(
            title: 'Kích thước & In',
            icon: Icons.straighten_outlined,
            iconColor: AppColors.warning,
            children: [
              Row(children: [
                Expanded(
                  child: LabeledField(
                    label: 'Khổ trải',
                    suffix: '(m)',
                    child: NumField(
                      initial: (i['spreadWidth'] as num?) ?? 0,
                      suffix: 'm',
                      onChanged: (v) {
                        u('spreadWidth', v);
                        _autoUpdateCylLength(v, (i['numImages'] as num?)?.toInt() ?? 1);
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: LabeledField(
                    label: 'Bước cắt',
                    suffix: '(m)',
                    child: NumField(
                      initial: (i['cutStep'] as num?) ?? 0,
                      suffix: 'm',
                      onChanged: (v) {
                        u('cutStep', v);
                        _autoUpdateCylCircum(v);
                      },
                    ),
                  ),
                ),
              ]),
              Row(children: [
                Expanded(
                  child: LabeledField(
                    label: 'Số con hình',
                    child: NumField(
                      initial: (i['numImages'] as num?) ?? 1,
                      integer: true,
                      onChanged: (v) {
                        final vi = v.toInt().clamp(1, 99);
                        u('numImages', vi);
                        _autoUpdateCylLength((i['spreadWidth'] as num?)?.toDouble() ?? 0, vi);
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: LabeledField(
                    label: 'Số màu in',
                    child: DropdownField<int>(
                      hintText: 'Chọn số màu',
                      options: const [
                        (0, 'Không in'),
                        (1, '1 màu'),
                        (2, '2 màu'),
                        (3, '3 màu'),
                        (4, '4 màu'),
                        (5, '5 màu'),
                        (6, '6 màu'),
                        (7, '7 màu'),
                        (8, '8 màu'),
                      ],
                      selected: (i['numColors'] as num?)?.toInt(),
                      onChanged: (v) =>
                          u('numColors', v == 0 ? null : v),
                    ),
                  ),
                ),
              ]),
            ],
          ),
          const SizedBox(height: 12),
        ],

        // ── 4. Nâng cao (collapsible) ──────────────────────────────────────
        if (_showStructure) ...[
          Card(
            child: Column(
              children: [
                InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () =>
                      setState(() => _advancedOpen = !_advancedOpen),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                    child: Row(children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.muted.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.tune,
                            size: 18, color: AppColors.muted),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Tuỳ chỉnh nâng cao',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall),
                            Text('Phụ kiện · Trục in · Đóng gói · Thanh toán · Hoa hồng',
                                style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      ),
                      AnimatedRotation(
                        turns: _advancedOpen ? 0.5 : 0,
                        duration: const Duration(milliseconds: 200),
                        child: Icon(Icons.keyboard_arrow_down,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant),
                      ),
                    ]),
                  ),
                ),
                AnimatedSize(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeInOut,
                  child: _advancedOpen
                      ? Padding(
                          padding:
                              const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          child: _AdvancedSection(state: s),
                        )
                      : const SizedBox(width: double.infinity),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // ── 5. Thanh toán & Lợi nhuận (luôn hiện) ──────────────────────────
        SectionCard(
          title: 'Thanh toán & Lợi nhuận',
          icon: Icons.payments_outlined,
          iconColor: AppColors.danger,
          children: [
            LabeledField(
              label: 'Số ngày thanh toán',
              child: ChipSelect<int>(
                options: const [
                  (14, '14 ngày'),
                  (30, '30 ngày'),
                  (45, '45 ngày'),
                  (75, '75 ngày'),
                  (90, '90 ngày')
                ],
                selected: (i['paymentDays'] as num?)?.toInt() ?? 30,
                onChanged: (v) => u('paymentDays', v),
              ),
            ),
            LabeledField(
              label: 'Cột lợi nhuận',
              child: ChipSelect<int>(
                options: const [
                  (1, 'Cột 1 · thấp'),
                  (2, 'Cột 2 · cao'),
                ],
                selected: (i['profitColumn'] as num?)?.toInt() ?? 2,
                onChanged: (v) => u('profitColumn', v),
              ),
            ),
            _CommissionRow(state: s),
          ],
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  void _onLayerChange(String layerKey, String? value) {
    u(layerKey, value);
    final micOverrides = Map<String, dynamic>.from(
        (s.currentInput.raw['micOverrides'] as Map?) ?? {});
    micOverrides.remove(layerKey);
    if (value == null) {
      const keys = [
        'layer1Id',
        'layer2Id',
        'layer3Id',
        'layer4Id',
        'layer5Id'
      ];
      final idx = keys.indexOf(layerKey);
      for (int k = idx + 1; k < keys.length; k++) {
        u(keys[k], null);
        micOverrides.remove(keys[k]);
      }
    }
    u('micOverrides', micOverrides);
  }

  void _onMicOverride(String layerKey, double value) {
    final micOverrides = Map<String, dynamic>.from(
        (s.currentInput.raw['micOverrides'] as Map?) ?? {});
    micOverrides[layerKey] = value;
    u('micOverrides', micOverrides);
  }

  /// Tự động tính độ dài trục theo đúng logic web app (CuaHangTinhGia.ts):
  /// cylLength = max(0.7, spreadWidth × numImages + 0.1)
  void _autoUpdateCylLength(double spreadWidth, int numImages) {
    if (spreadWidth <= 0) return;
    final n = numImages > 0 ? numImages : 1;
    final raw = spreadWidth * n + 0.1;
    final cylLength = raw > 0.7 ? raw : 0.7;
    u('cylLength', cylLength);
  }

  /// Tự động tính chu vi trục theo đúng logic web app:
  /// cylCircum = cutStep × N (N là bội số nhỏ nhất sao cho cutStep × N ≥ 0.4)
  void _autoUpdateCylCircum(double cutStep) {
    if (cutStep <= 0) {
      u('cylCircum', 0);
      return;
    }
    int N = 1;
    while (cutStep * N < 0.4) {
      N++;
    }
    final cylCircum = cutStep * N;
    u('cylCircum', cylCircum);
  }
}

// ─── Structure Preview Bar ───────────────────────────────────────────────────
class _StructurePreview extends StatelessWidget {
  final List<MaterialDef> materials;
  final Map<String, dynamic> input;
  final int targetThickness;
  const _StructurePreview({
    required this.materials,
    required this.input,
    this.targetThickness = 0,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final layerKeys = ['layer1Id', 'layer2Id', 'layer3Id', 'layer4Id', 'layer5Id'];
    final layerIds = layerKeys
        .map((k) => input[k] as String?)
        .where((id) => id != null)
        .toList();

    if (layerIds.isEmpty) {
      return Container(
        height: 44,
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.4)),
        ),
        alignment: Alignment.center,
        child: Text('Chưa chọn lớp nào',
            style: TextStyle(
                fontSize: 12, color: scheme.onSurfaceVariant)),
      );
    }

    final layers = layerIds.map((id) {
      return materials.firstWhere((m) => m.id == id,
          orElse: () => MaterialDef(
            id: id!, name: id, density: 0, thickness: 0,
            pricePerKg: 0, isPETorPA: false, rollLength: 0, inkPricePerColor: 0,
          ));
    }).toList();

    // Thickness calculation
    final micOverrides = (input['micOverrides'] as Map?)?.cast<String, dynamic>() ?? {};
    int sumMic = 0;
    for (int idx = 0; idx < layerIds.length; idx++) {
      final key = layerKeys[idx];
      final override = (micOverrides[key] as num?)?.toInt();
      sumMic += override ?? layers[idx].thickness.toInt();
    }
    final glueMic = (layers.length - 1) * 3;
    final totalMic = sumMic + glueMic;
    final outOfRange = targetThickness > 0 &&
        (totalMic < targetThickness - 5 || totalMic > targetThickness + 5);

    final colors = [
      const Color(0xFF6366F1),
      const Color(0xFF0891B2),
      const Color(0xFF059669),
      const Color(0xFFD97706),
      const Color(0xFFDC2626),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Layer bars with glue indicators
        Row(
          children: layers.asMap().entries.expand((entry) {
            final idx = entry.key;
            final mat = entry.value;
            final color = colors[idx % colors.length];
            final micKey = layerKeys[idx];
            final override = (micOverrides[micKey] as num?)?.toInt();
            final mic = override ?? mat.thickness.toInt();
            return [
              if (idx > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Text('3μ',
                      style: TextStyle(
                          fontSize: 8,
                          color: scheme.onSurfaceVariant.withValues(alpha: 0.5))),
                ),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: color.withValues(alpha: 0.35)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        mat.name.split(' ').first,
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: color),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text('${mic}μ',
                          style: TextStyle(fontSize: 9.5, color: color)),
                    ],
                  ),
                ),
              ),
            ];
          }).toList(),
        ),
        const SizedBox(height: 6),
        // Thickness summary
        Text(
          'Tổng: $totalMic mic (vật liệu $sumMic + keo $glueMic)'
          '${targetThickness > 0 ? ' — Mục tiêu: $targetThickness mic (±5)' : ''}',
          style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant),
        ),
        // Validation warning
        if (outOfRange) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.08),
              border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.warning_amber_rounded,
                    size: 16, color: AppColors.danger),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Tổng độ dày $totalMic mic nằm ngoài khoảng '
                    '[${targetThickness - 5}, ${targetThickness + 5}]. '
                    'Vui lòng điều chỉnh lớp vật liệu.',
                    style: TextStyle(
                        fontSize: 11,
                        color: AppColors.danger,
                        fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
      ],
    );
  }
}

// ─── Layer picker row (compact, với disable khi chưa chọn lớp trước) ─────────
class _LayerPickerRow extends StatelessWidget {
  final String label;
  final IconData? icon;
  final List<MaterialDef> materials;
  final String layerKey;
  final bool disabled;
  final Map<String, dynamic> input;
  final ValueChanged<String?> onChanged;
  final void Function(String layerKey, double value)? onMicOverride;
  const _LayerPickerRow({
    required this.label,
    this.icon,
    required this.materials,
    required this.layerKey,
    required this.disabled,
    required this.input,
    required this.onChanged,
    this.onMicOverride,
  });

  @override
  Widget build(BuildContext context) {
    if (disabled) return const SizedBox.shrink();
    final selectedId = input[layerKey] as String?;
    final mat = selectedId != null
        ? materials.cast<MaterialDef?>().firstWhere((m) => m!.id == selectedId, orElse: () => null)
        : null;
    final micOverrides = (input['micOverrides'] as Map?)?.cast<String, dynamic>() ?? {};
    final currentMic = (micOverrides[layerKey] as num?)?.toDouble() ?? mat?.thickness ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaterialPickerField(
          label: label,
          icon: icon,
          materials: materials,
          value: selectedId,
          onChanged: onChanged,
        ),
        if (mat != null && mat.adjustableMic == true)
          Padding(
            padding: const EdgeInsets.only(left: 16, top: 4, bottom: 4),
            child: Row(
              children: [
                Icon(Icons.tune, size: 14, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 6),
                Text('Độ dày:',
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                const SizedBox(width: 8),
                SizedBox(
                  width: 100,
                  child: NumField(
                    initial: currentMic,
                    integer: true,
                    suffix: 'mic',
                    onChanged: (v) => onMicOverride?.call(layerKey, v),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// ─── Advanced section ─────────────────────────────────────────────────────────
class _AdvancedSection extends StatelessWidget {
  final AppState state;
  const _AdvancedSection({required this.state});

  Map<String, dynamic> get i => state.currentInput.raw;
  void u(String key, dynamic value) => state.updateInput(key, value);
  bool get _isMang => ((i['productType'] as String?) ?? 'tui') == 'mang';

  @override
  Widget build(BuildContext context) {
    final cylLength = (i['cylLength'] as num?)?.toDouble() ?? 0;
    final cylCircum = (i['cylCircum'] as num?)?.toDouble() ?? 0;
    final numColors = (i['numColors'] as num?)?.toInt() ?? 0;
    final cylUnitPrice = (i['cylUnitPrice'] as num?)?.toDouble() ?? 0;
    final cylArea = cylLength * cylCircum;
    final cylOneCost = cylArea * cylUnitPrice;
    final cylTotalCost = cylOneCost * numColors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Phủ mực & hiệu ứng
        _SubTitle('🖌️ Mực & Hiệu ứng'),
        LabeledField(
          label: 'Tỷ lệ phủ mực',
          suffix: '(%)',
          hint: '100% = phủ toàn bộ, 80% = phủ 80% diện tích',
          child: NumField(
            initial: _isMang
                ? ((i['coverageRatio'] as num?)?.toDouble() ?? 1) * 100
                : (((i['coverageRatio'] as num?)?.toDouble() ?? 1) == 1
                    ? 100
                    : ((i['coverageRatio'] as num?)?.toDouble() ?? 1) * 100),
            integer: true,
            suffix: '%',
            onChanged: (v) => u('coverageRatio', v == 0 ? 1.0 : v / 100.0),
          ),
        ),
        Wrap(
          spacing: 16,
          children: [
            CheckboxRow(
              label: 'Nhũ',
              value: (i['hasNhu'] as bool?) ?? false,
              onChanged: (v) => u('hasNhu', v),
            ),
            CheckboxRow(
              label: 'Phủ mờ',
              value: (i['hasMo'] as bool?) ?? false,
              onChanged: (v) => u('hasMo', v),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Phụ kiện (chỉ nhãn túi)
        if (!_isMang) ...[
          _SubTitle('🎀 Phụ kiện'),
          ToggleTile(
            title: 'Khoá zipper',
            subtitle: 'Cho túi có nắp đóng mở',
            icon: Icons.lock_outline,
            accent: AppColors.success,
            value: (i['hasZipper'] as bool?) ?? false,
            onChanged: (v) => u('hasZipper', v),
          ),
          ToggleTile(
            title: 'Băng keo',
            subtitle: 'Túi dán mép tự dính',
            icon: Icons.straighten,
            accent: AppColors.success,
            value: (i['hasTape'] as bool?) ?? false,
            onChanged: (v) => u('hasTape', v),
          ),
          ToggleTile(
            title: 'Quai xách',
            subtitle: 'Túi có quai',
            icon: Icons.shopping_bag_outlined,
            accent: AppColors.success,
            value: (i['hasHandle'] as bool?) ?? false,
            onChanged: (v) => u('hasHandle', v),
          ),
          const SizedBox(height: 8),
        ],

        // Trục in
        _SubTitle('🖨️ Trục in'),
        Row(children: [
          Expanded(
            child: LabeledField(
              label: 'Dài trục',
              suffix: '(m)',
              hintWidget: cylLength > 0 && cylLength < 0.7
                  ? const WarningText('Dưới tối thiểu 0.7m')
                  : cylLength > 1.25
                      ? const WarningText('Vượt tối đa 1.25m')
                      : null,
              child: NumField(
                initial: cylLength,
                suffix: 'm',
                onChanged: (v) => u('cylLength', v),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: LabeledField(
              label: 'Chu vi',
              suffix: '(m)',
              hintWidget: cylCircum > 0 && cylCircum < 0.4
                  ? const WarningText('Dưới tối thiểu 0.4m')
                  : cylCircum > 0.9
                      ? const WarningText('Vượt tối đa 0.9m')
                      : null,
              child: NumField(
                initial: cylCircum,
                suffix: 'm',
                onChanged: (v) => u('cylCircum', v),
              ),
            ),
          ),
        ]),
        LabeledField(
          label: 'Loại trục',
          child: ChipSelect<String>(
            options: const [
              ('A', 'A · 7.3tr'),
              ('B', 'B · 6.5tr'),
              ('custom', 'Tuỳ chỉnh'),
            ],
            selected: (i['cylType'] as String?) ?? 'A',
            onChanged: (v) => u('cylType', v),
          ),
        ),
        if ((i['cylType'] as String?) == 'custom')
          LabeledField(
            label: 'Đơn giá trục',
            suffix: '(đ/m²)',
            child: NumField(
              initial: cylUnitPrice,
              integer: true,
              suffix: 'đ/m²',
              onChanged: (v) => u('cylUnitPrice', v),
            ),
          ),
        // Hiển thị diện tích trục từ engine (cylArea = cylLength × cylCircum)
        if (cylLength > 0 && cylCircum > 0)
          InfoBox(
            text: 'DT: ${(cylLength * cylCircum).toStringAsFixed(4)} m²'
                ' · 1 trục: ${_fmt(cylOneCost)} đ'
                ' · Cả bộ ($numColors màu): ${_fmt(cylTotalCost)} đ',
            color: AppColors.muted,
            icon: Icons.album_outlined,
          ),

        ToggleTile(
          title: 'Bao trục',
          subtitle: 'Phân bổ chi phí bộ trục vào đơn giá (định mức 200.000 m²)',
          icon: Icons.album_outlined,
          accent: AppColors.success,
          value: (i['cylIncluded'] as bool?) ?? false,
          onChanged: (v) => u('cylIncluded', v),
        ),

        // Đóng gói
        _SubTitle('📦 Đóng gói & Vận chuyển'),
        if (_isMang)
          LabeledField(
            label: 'Đóng gói (đ/cuộn)',
            child: NumField(
              initial: (i['boxPrice'] as num?) ?? 0,
              integer: true,
              suffix: 'đ',
              onChanged: (v) => u('boxPrice', v),
            ),
          )
        else
          Row(children: [
            Expanded(
              child: LabeledField(
                label: 'Túi/thùng',
                child: NumField(
                  initial: (i['bagsPerBox'] as num?) ?? 0,
                  integer: true,
                  onChanged: (v) => u('bagsPerBox', v),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: LabeledField(
                label: 'Giá thùng (đ)',
                child: NumField(
                  initial: (i['boxPrice'] as num?) ?? 0,
                  integer: true,
                  suffix: 'đ',
                  onChanged: (v) => u('boxPrice', v),
                ),
              ),
            ),
          ]),
        Row(children: [
          Expanded(
            child: LabeledField(
              label: 'Vận chuyển (đ/km)',
              child: NumField(
                initial: (i['shippingPerKm'] as num?) ?? 0,
                integer: true,
                suffix: 'đ/km',
                onChanged: (v) => u('shippingPerKm', v),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: LabeledField(
              label: 'Khoảng cách (km)',
              child: NumField(
                initial: (i['shippingKm'] as num?) ?? 0,
                integer: true,
                suffix: 'km',
                onChanged: (v) => u('shippingKm', v),
              ),
            ),
          ),
        ]),
      ],
    );
  }

  String _fmt(double v) {
    return v.round().toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
  }
}

// ─── Commission row ───────────────────────────────────────────────────────────
class _CommissionRow extends StatefulWidget {
  final AppState state;
  const _CommissionRow({required this.state});

  @override
  State<_CommissionRow> createState() => _CommissionRowState();
}

class _CommissionRowState extends State<_CommissionRow> {
  AppState get s => widget.state;
  Map<String, dynamic> get i => s.currentInput.raw;
  void u(String key, dynamic value) => s.updateInput(key, value);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final unit = (i['commissionUnit'] as String?) ?? 'percent';
    final val = (i['commissionInputValue'] as num?)?.toDouble() ?? 0;
    final r = s.currentResult;
    final isMang = ((i['productType'] as String?) ?? 'tui') == 'mang';
    final unitLabel = isMang ? 'm²' : 'túi';

    // Commission hint giống web: hiện = X đ/túi hoặc = X%
    String? hintText;
    if (r != null && val > 0) {
      if (unit == 'percent') {
        final vndPerUnit = (val / 100) * r.costPerUnit;
        hintText = '= ${_vnd(vndPerUnit)} đ/$unitLabel';
      } else {
        final pct = r.costPerUnit > 0 ? (val / r.costPerUnit * 100) : 0.0;
        hintText = '= ${pct.toStringAsFixed(2)}% (trên giá vốn+LN)';
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LabeledField(
          label: 'Hoa hồng',
          child: Row(
            children: [
              Expanded(
                child: NumField(
                  initial: val,
                  suffix: unit == 'percent' ? '%' : 'đ',
                  onChanged: (v) {
                    u('commissionInputValue', v);
                    u('commissionRate', unit == 'percent' ? v / 100 : 0);
                    u('commissionFixedVND', unit == 'vnd' ? v : 0);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _UnitChip(
                      label: '%',
                      selected: unit == 'percent',
                      onTap: () {
                        u('commissionUnit', 'percent');
                        u('commissionRate', val / 100);
                        u('commissionFixedVND', 0);
                        setState(() {});
                      },
                    ),
                    _UnitChip(
                      label: 'VND',
                      selected: unit == 'vnd',
                      onTap: () {
                        u('commissionUnit', 'vnd');
                        u('commissionRate', 0);
                        u('commissionFixedVND', val);
                        setState(() {});
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (hintText != null)
          Padding(
            padding: const EdgeInsets.only(top: 4, left: 2),
            child: Text(hintText,
                style: TextStyle(
                    fontSize: 11.5,
                    color: AppColors.muted,
                    fontStyle: FontStyle.italic)),
          ),
      ],
    );
  }

  String _vnd(double v) =>
      v.round().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
}

class _UnitChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _UnitChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? scheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(label,
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : scheme.onSurfaceVariant)),
      ),
    );
  }
}

class _SubTitle extends StatelessWidget {
  final String text;
  const _SubTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, top: 4),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              fontSize: 12,
              letterSpacing: 0.3,
            ),
      ),
    );
  }
}





