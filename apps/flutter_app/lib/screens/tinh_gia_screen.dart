// ═══════════════════════════════════════════════════════════════════════════
// TinhGiaScreen — Redesign full mobile-first
// Flow: Thông tin cơ bản → Chọn loại → Cấu trúc lớp → Kích thước → Nâng cao
// Sticky bottom bar với nút Lưu + Reset
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
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

    // Mobile layout: kết quả ở trên (collapsed nếu chưa tính), form ở dưới
    return Stack(
      children: [
        SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 96),
          child: Column(
            children: [
              _ResultPanel(state: s),
              const SizedBox(height: 14),
              _InputForm(state: s),
            ],
          ),
        ),
        // Sticky bottom bar
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: _StickyBottomBar(state: s),
        ),
      ],
    );
  }
}

// ─── Sticky bottom action bar ────────────────────────────────────────────────
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
              label: const Text('Lưu báo giá'),
            ),
          ),
          const SizedBox(width: 10),
          OutlinedButton.icon(
            onPressed: () => state.setInput(CalculateInput.defaults()),
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Reset'),
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

  void _copyResult(BuildContext context, AppState state) async {
    final r = state.currentResult;
    if (r == null) return;
    final i = state.currentInput;
    final isMang = i.productType == 'mang';
    final unitLabel = isMang ? 'm²' : 'cái';
    final fmtPct = (double n) =>
        '${(n * 100).toStringAsFixed(2)}%';
    final fmtVnd = (double v) => v
        .round()
        .toString()
        .replaceAllMapped(
            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
    final text = [
      '${i.customer.isEmpty ? 'KH' : i.customer} — ${i.productName.isEmpty ? 'SP' : i.productName}',
      'Cấu trúc: ${r.structureText}',
      'SL: ${i.quantity} $unitLabel',
      'GIÁ ĐỀ XUẤT: ${fmtVnd(r.finalPrice)} đ/$unitLabel',
      'Giá vốn: ${fmtVnd(r.costPerUnit)} đ | LN: ${fmtPct(r.profitRate)}',
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
                    (null, '— Chọn loại túi —'),
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
                    (null, '— Chọn loại màng —'),
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
              _StructurePreview(materials: s.materials, input: i),
              const SizedBox(height: 8),
              _LayerPickerRow(
                label: 'Lớp 1 (In)',
                icon: Icons.palette_outlined,
                materials: s.materials,
                layerKey: 'layer1Id',
                disabled: false,
                input: i,
                onChanged: (v) => _onLayerChange('layer1Id', v),
              ),
              _LayerPickerRow(
                label: 'Lớp 2',
                materials: s.materials,
                layerKey: 'layer2Id',
                disabled: i['layer1Id'] == null,
                input: i,
                onChanged: (v) => _onLayerChange('layer2Id', v),
              ),
              _LayerPickerRow(
                label: 'Lớp 3',
                materials: s.materials,
                layerKey: 'layer3Id',
                disabled: i['layer2Id'] == null,
                input: i,
                onChanged: (v) => _onLayerChange('layer3Id', v),
              ),
              _LayerPickerRow(
                label: 'Lớp 4',
                materials: s.materials,
                layerKey: 'layer4Id',
                disabled: i['layer3Id'] == null,
                input: i,
                onChanged: (v) => _onLayerChange('layer4Id', v),
              ),
              _LayerPickerRow(
                label: 'Lớp 5',
                materials: s.materials,
                layerKey: 'layer5Id',
                disabled: i['layer4Id'] == null,
                input: i,
                onChanged: (v) => _onLayerChange('layer5Id', v),
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
                      onChanged: (v) => u('spreadWidth', v),
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
                      onChanged: (v) => u('cutStep', v),
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
                      onChanged: (v) =>
                          u('numImages', v.toInt().clamp(1, 99)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: LabeledField(
                    label: 'Số màu in',
                    child: DropdownField<int>(
                      hintText: '— Chọn số màu —',
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
            _CommissionRow(input: i, onUpdate: (key, val) => u(key, val)),
          ],
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  void _onLayerChange(String layerKey, String? value) {
    u(layerKey, value);
    // Cascade clear: nếu clear lớp N thì clear các lớp N+1 trở đi
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
      }
    }
  }
}

// ─── Structure Preview Bar ───────────────────────────────────────────────────
class _StructurePreview extends StatelessWidget {
  final List<MaterialDef> materials;
  final Map<String, dynamic> input;
  const _StructurePreview({required this.materials, required this.input});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final layerIds =
        ['layer1Id', 'layer2Id', 'layer3Id', 'layer4Id', 'layer5Id']
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

    final colors = [
      const Color(0xFF6366F1),
      const Color(0xFF0891B2),
      const Color(0xFF059669),
      const Color(0xFFD97706),
      const Color(0xFFDC2626),
    ];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: layers.asMap().entries.map((entry) {
          final idx = entry.key;
          final mat = entry.value;
          final color = colors[idx % colors.length];
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(left: idx == 0 ? 0 : 4),
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
                  Text(
                    '${mat.thickness.toInt()}μ',
                    style: TextStyle(fontSize: 9.5, color: color),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
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
  const _LayerPickerRow({
    required this.label,
    this.icon,
    required this.materials,
    required this.layerKey,
    required this.disabled,
    required this.input,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (disabled) return const SizedBox.shrink();
    return MaterialPickerField(
      label: label,
      icon: icon,
      materials: materials,
      value: input[layerKey] as String?,
      onChanged: onChanged,
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
        if (cylArea > 0)
          InfoBox(
            text: 'DT: ${cylArea.toStringAsFixed(4)} m²'
                ' · 1 trục: ${_fmt(cylOneCost)} đ'
                ' · Cả bộ ($numColors màu): ${_fmt(cylTotalCost)} đ',
            color: AppColors.muted,
            icon: Icons.album_outlined,
          ),
        const SizedBox(height: 10),
        ToggleTile(
          title: 'Bao trục',
          subtitle: 'Phân bổ chi phí trục vào đơn giá (định mức 200.000 m²)',
          icon: Icons.all_inclusive,
          value: (i['cylIncluded'] as bool?) ?? false,
          onChanged: (v) => u('cylIncluded', v),
        ),
        const SizedBox(height: 12),

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
class _CommissionRow extends StatelessWidget {
  final Map<String, dynamic> input;
  final void Function(String key, dynamic val) onUpdate;
  const _CommissionRow({required this.input, required this.onUpdate});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final unit = (input['commissionUnit'] as String?) ?? 'percent';
    final val = (input['commissionInputValue'] as num?)?.toDouble() ?? 0;

    return LabeledField(
      label: 'Hoa hồng',
      child: Row(
        children: [
          Expanded(
            child: NumField(
              initial: val,
              suffix: unit == 'percent' ? '%' : 'đ',
              onChanged: (v) {
                onUpdate('commissionInputValue', v);
                onUpdate('commissionRate', unit == 'percent' ? v / 100 : 0);
                onUpdate('commissionFixedVND', unit == 'vnd' ? v : 0);
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
                    onUpdate('commissionUnit', 'percent');
                    onUpdate('commissionRate', val / 100);
                    onUpdate('commissionFixedVND', 0);
                  },
                ),
                _UnitChip(
                  label: 'VND',
                  selected: unit == 'vnd',
                  onTap: () {
                    onUpdate('commissionUnit', 'vnd');
                    onUpdate('commissionRate', 0);
                    onUpdate('commissionFixedVND', val);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
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
