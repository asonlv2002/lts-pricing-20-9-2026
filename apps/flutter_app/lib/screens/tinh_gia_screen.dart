// ═══════════════════════════════════════════════════════════════════════════
// Tính giá — hero + breakdown + form đầy đủ (6 section)
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
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
    final twoCol = width >= 980;
    final s = context.watch<AppState>();

    final form = _InputForm(state: s);
    final result = _ResultPanel(state: s);

    if (twoCol) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: 7, child: SingleChildScrollView(child: form)),
            const SizedBox(width: 20),
            Expanded(flex: 5, child: SingleChildScrollView(child: result)),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          result,
          const SizedBox(height: 16),
          form,
        ],
      ),
    );
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
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.08),
              border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.error_outline, color: AppColors.danger, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text('Lỗi engine: ${state.lastError}',
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
        const SizedBox(height: 14),
        Row(
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
              onPressed: () {
                state.setInput(CalculateInput.defaults());
              },
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Reset'),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (state.currentResult != null)
          BreakdownPanel(result: state.currentResult!),
      ],
    );
  }
}

// ─── Input Form ──────────────────────────────────────────────────────────────
class _InputForm extends StatelessWidget {
  final AppState state;
  const _InputForm({required this.state});

  @override
  Widget build(BuildContext context) {
    final i = state.currentInput;
    final isMang = i.productType == 'mang';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── 1. Sản phẩm ─────────────────────────────────────────────────────
        SectionCard(
          title: 'Thông tin sản phẩm',
          subtitle: 'Khách hàng & loại sản phẩm',
          icon: Icons.description_outlined,
          iconColor: AppColors.info,
          children: [
            LabeledField(
              label: 'Khách hàng',
              icon: Icons.person_outline,
              child: TxtField(
                initial: i.customer,
                hintText: 'Tên khách hàng…',
                onChanged: (v) => state.updateInput('customer', v),
              ),
            ),
            LabeledField(
              label: 'Tên sản phẩm',
              icon: Icons.inventory_2_outlined,
              child: TxtField(
                initial: i.productName,
                hintText: 'VD: Túi gạo 5kg',
                onChanged: (v) => state.updateInput('productName', v),
              ),
            ),
            LabeledField(
              label: 'Loại sản phẩm',
              child: ChipSelect<String>(
                options: const [('tui', '🛍️ Túi'), ('mang', '📜 Màng')],
                selected: i.productType,
                onChanged: (v) => state.updateInput('productType', v),
              ),
            ),
            if (isMang)
              LabeledField(
                label: 'Chiều dài cuộn màng',
                suffix: '(m)',
                icon: Icons.straighten,
                child: NumField(
                  initial: (i.raw['filmRollLength'] as num?) ?? 6000,
                  integer: true,
                  suffix: 'm',
                  onChanged: (v) => state.updateInput('filmRollLength', v),
                ),
              ),
            LabeledField(
              label: isMang ? 'Số lượng' : 'Số lượng',
              suffix: isMang ? '(m²)' : '(cái)',
              icon: Icons.numbers,
              child: NumField(
                initial: i.quantity,
                integer: !isMang,
                suffix: isMang ? 'm²' : 'cái',
                onChanged: (v) => state.updateInput('quantity', v),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // ── 2. Cấu trúc lớp ─────────────────────────────────────────────────
        SectionCard(
          title: 'Cấu trúc lớp',
          subtitle: 'In → Ghép → … → Cắt (tối đa 5 lớp)',
          icon: Icons.layers_outlined,
          iconColor: AppColors.accent,
          children: [
            MaterialPickerField(
              label: 'Lớp 1 (In)',
              icon: Icons.palette_outlined,
              materials: state.materials,
              value: i.get<String>('layer1Id'),
              onChanged: (v) => state.updateInput('layer1Id', v),
            ),
            MaterialPickerField(
              label: 'Lớp 2',
              materials: state.materials,
              value: i.get<String>('layer2Id'),
              onChanged: (v) => state.updateInput('layer2Id', v),
            ),
            MaterialPickerField(
              label: 'Lớp 3',
              materials: state.materials,
              value: i.get<String>('layer3Id'),
              onChanged: (v) => state.updateInput('layer3Id', v),
            ),
            MaterialPickerField(
              label: 'Lớp 4',
              materials: state.materials,
              value: i.get<String>('layer4Id'),
              onChanged: (v) => state.updateInput('layer4Id', v),
            ),
            MaterialPickerField(
              label: 'Lớp 5',
              materials: state.materials,
              value: i.get<String>('layer5Id'),
              onChanged: (v) => state.updateInput('layer5Id', v),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // ── 3. Kích thước ───────────────────────────────────────────────────
        SectionCard(
          title: 'Kích thước & in',
          subtitle: 'Khổ trải, bước cắt, số màu, tỷ lệ phủ mực',
          icon: Icons.straighten_outlined,
          iconColor: AppColors.warning,
          children: [
            Row(children: [
              Expanded(
                child: LabeledField(
                  label: 'Khổ trải',
                  suffix: '(m)',
                  child: NumField(
                    initial: (i.raw['spreadWidth'] as num?) ?? 0,
                    suffix: 'm',
                    onChanged: (v) => state.updateInput('spreadWidth', v),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: LabeledField(
                  label: 'Bước cắt',
                  suffix: '(m)',
                  child: NumField(
                    initial: (i.raw['cutStep'] as num?) ?? 0,
                    suffix: 'm',
                    onChanged: (v) => state.updateInput('cutStep', v),
                  ),
                ),
              ),
            ]),
            Row(children: [
              Expanded(
                child: LabeledField(
                  label: 'Số con hình',
                  child: NumField(
                    initial: (i.raw['numImages'] as num?) ?? 1,
                    integer: true,
                    onChanged: (v) =>
                        state.updateInput('numImages', v.toInt().clamp(1, 99)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: LabeledField(
                  label: 'Số màu in',
                  child: NumField(
                    initial: (i.raw['numColors'] as num?) ?? 0,
                    integer: true,
                    onChanged: (v) => state.updateInput(
                        'numColors', v.toInt() == 0 ? null : v.toInt()),
                  ),
                ),
              ),
            ]),
            LabeledField(
              label: 'Tỷ lệ phủ mực',
              suffix: '(0 – 1)',
              hint: 'Ví dụ: 0.8 = phủ 80% diện tích in',
              child: NumField(
                initial: (i.raw['coverageRatio'] as num?) ?? 1,
                onChanged: (v) => state.updateInput('coverageRatio', v),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // ── 4. Phụ kiện ────────────────────────────────────────────────────
        SectionCard(
          title: 'Phụ kiện',
          subtitle: 'Khoá zipper, băng keo, quai xách',
          icon: Icons.extension_outlined,
          iconColor: AppColors.success,
          children: [
            ToggleTile(
              title: 'Khoá zipper',
              subtitle: 'Cho túi có nắp đóng mở',
              icon: Icons.lock_outline,
              accent: AppColors.success,
              value: i.raw['hasZipper'] as bool? ?? false,
              onChanged: (v) => state.updateInput('hasZipper', v),
            ),
            ToggleTile(
              title: 'Băng keo',
              subtitle: 'Túi dán mép tự dính',
              icon: Icons.straighten,
              accent: AppColors.success,
              value: i.raw['hasTape'] as bool? ?? false,
              onChanged: (v) => state.updateInput('hasTape', v),
            ),
            ToggleTile(
              title: 'Quai xách',
              subtitle: 'Túi có quai',
              icon: Icons.shopping_bag_outlined,
              accent: AppColors.success,
              value: i.raw['hasHandle'] as bool? ?? false,
              onChanged: (v) => state.updateInput('hasHandle', v),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // ── 5. Trục in ─────────────────────────────────────────────────────
        SectionCard(
          title: 'Trục in',
          subtitle: 'Loại trục & cách tính phí',
          icon: Icons.album_outlined,
          iconColor: AppColors.muted,
          children: [
            LabeledField(
              label: 'Loại trục',
              child: ChipSelect<String>(
                options: const [
                  ('A', 'A · 7.3tr'),
                  ('B', 'B · 6.5tr'),
                  ('custom', 'Tuỳ chỉnh'),
                ],
                selected: (i.raw['cylType'] as String?) ?? 'A',
                onChanged: (v) => state.updateInput('cylType', v),
              ),
            ),
            ToggleTile(
              title: 'Bao trục',
              subtitle: 'Phân bổ chi phí trục vào đơn giá',
              icon: Icons.all_inclusive,
              value: i.raw['cylIncluded'] as bool? ?? false,
              onChanged: (v) => state.updateInput('cylIncluded', v),
            ),
            if ((i.raw['cylType'] as String?) == 'custom') ...[
              Row(children: [
                Expanded(
                    child: LabeledField(
                  label: 'Chiều dài trục',
                  suffix: '(m)',
                  child: NumField(
                    initial: (i.raw['cylLength'] as num?) ?? 0,
                    suffix: 'm',
                    onChanged: (v) => state.updateInput('cylLength', v),
                  ),
                )),
                const SizedBox(width: 12),
                Expanded(
                    child: LabeledField(
                  label: 'Chu vi trục',
                  suffix: '(m)',
                  child: NumField(
                    initial: (i.raw['cylCircum'] as num?) ?? 0,
                    suffix: 'm',
                    onChanged: (v) => state.updateInput('cylCircum', v),
                  ),
                )),
              ]),
              LabeledField(
                label: 'Đơn giá trục',
                suffix: '(đ/m²)',
                child: NumField(
                  initial: (i.raw['cylUnitPrice'] as num?) ?? 0,
                  integer: true,
                  suffix: 'đ/m²',
                  onChanged: (v) => state.updateInput('cylUnitPrice', v),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 14),

        // ── 6. Thanh toán & lợi nhuận ───────────────────────────────────────
        SectionCard(
          title: 'Thanh toán & lợi nhuận',
          subtitle: 'Thời hạn, cột lợi nhuận, hoa hồng',
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
                selected: (i.raw['paymentDays'] as num?)?.toInt() ?? 30,
                onChanged: (v) => state.updateInput('paymentDays', v),
              ),
            ),
            LabeledField(
              label: 'Cột lợi nhuận',
              child: ChipSelect<int>(
                options: const [
                  (1, 'Cột 1 · thấp'),
                  (2, 'Cột 2 · cao'),
                ],
                selected: (i.raw['profitColumn'] as num?)?.toInt() ?? 2,
                onChanged: (v) => state.updateInput('profitColumn', v),
              ),
            ),
            Row(children: [
              Expanded(
                  child: LabeledField(
                label: 'Hoa hồng',
                suffix: '(%)',
                child: NumField(
                  initial: (i.raw['commissionRate'] as num?) ?? 0,
                  suffix: '%',
                  onChanged: (v) => state.updateInput('commissionRate', v),
                ),
              )),
              const SizedBox(width: 12),
              Expanded(
                  child: LabeledField(
                label: 'HH cố định',
                suffix: '(đ)',
                child: NumField(
                  initial: (i.raw['commissionFixedVND'] as num?) ?? 0,
                  integer: true,
                  suffix: 'đ',
                  onChanged: (v) =>
                      state.updateInput('commissionFixedVND', v),
                ),
              )),
            ]),
          ],
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}
