// ═══════════════════════════════════════════════════════════════════════════
// quote_product_editor — editor quy cách túi (bagSpec) + bảng mức số lượng/giá
// báo của wizard "Tạo báo giá" (mirror ModuleBaoGia.tsx BuocChonSanPham:
// wiz-bag-spec + wiz-tier-table).
//
// Dùng cho cả tạo mới lẫn cập nhật báo giá. Dữ liệu lưu vào
// `quotation.inputValue.productBagSpecs` (bagSpec + tiers) để PDF/DOCX và LSX
// đọc lại được.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:lts_pricing/lib/format_structure.dart';
import 'package:lts_pricing/lib/quote_product_spec.dart';

import '../api/service_lts_client.dart';
import '../engine/models.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'form_widgets.dart';

/// 1 mức số lượng của 1 sản phẩm báo giá.
class QuoteTierRow {
  double quantity;
  double finalPrice; // giá chốt/đề xuất (tham khảo, chỉ đọc)
  double baoGia; // giá báo khách (sửa được)

  QuoteTierRow({
    required this.quantity,
    required this.finalPrice,
    required this.baoGia,
  });

  Map<String, dynamic> toJson() => {
        'quantity': quantity,
        'finalPrice': finalPrice,
        'baoGia': baoGia,
      };

  factory QuoteTierRow.fromJson(Map<String, dynamic> j) => QuoteTierRow(
        quantity: (j['quantity'] as num?)?.toDouble() ?? 0,
        finalPrice: (j['finalPrice'] as num?)?.toDouble() ?? 0,
        baoGia: (j['baoGia'] as num?)?.toDouble() ??
            (j['chotGia'] as num?)?.toDouble() ??
            0,
      );
}

/// 1 sản phẩm (pricing sheet) trong báo giá đang soạn.
class QuoteSheetDraft {
  final PricingSheetApi sheet;
  QuoteProductBagSpec bagSpec;
  List<QuoteTierRow> tiers;
  bool expanded;
  String structure;

  QuoteSheetDraft({
    required this.sheet,
    required this.bagSpec,
    required this.tiers,
    this.structure = '',
    this.expanded = false,
  });

  Map<String, dynamic> get input => sheet.inputValue;

  String get productName =>
      (input['productName'] as String?) ?? sheet.pricingSheetName ?? sheet.id;

  /// Dựng draft từ sheet + bagSpec đã lưu (nếu có) — mirror web
  /// buildWizardProductFromHistoryItem.
  factory QuoteSheetDraft.fromSheet(
    PricingSheetApi sheet, {
    Map<String, dynamic>? savedBagSpec,
    List<dynamic>? savedTiers,
    List<MaterialDef> materials = const [],
  }) {
    final spec = buildDefaultBagSpec(CalculateInput.fromJson(sheet.inputValue));
    if (savedBagSpec != null) {
      spec.mergeFromJson(savedBagSpec);
    }
    migrateOtherDescription(spec);
    final input = sheet.inputValue;
    final qty = (input['quantity'] as num?)?.toDouble() ?? 0;
    final enginePrice = (sheet.saleResult?['finalPrice'] as num?)?.toDouble() ??
        (sheet.masterResult?['finalPrice'] as num?)?.toDouble() ??
        (input['chotGia'] as num?)?.toDouble() ??
        0;
    List<QuoteTierRow> tiers;
    if (savedTiers != null && savedTiers.isNotEmpty) {
      tiers = savedTiers
          .whereType<Map>()
          .map((e) => QuoteTierRow.fromJson(e.cast<String, dynamic>()))
          .toList();
    } else {
      final baoGia = (input['baoGia'] as num?)?.toDouble() ?? enginePrice;
      tiers = [
        QuoteTierRow(
          quantity: qty,
          finalPrice: enginePrice,
          baoGia: baoGia,
        ),
      ];
    }
    final structure = (input['structure'] as String?) ??
        buildStructureFromLayers(
          materials.map((m) => m.toJson()).toList(),
          [
            input['layer1Id'] as String?,
            input['layer2Id'] as String?,
            input['layer3Id'] as String?,
            input['layer4Id'] as String?,
            input['layer5Id'] as String?,
          ],
        );
    return QuoteSheetDraft(
      sheet: sheet,
      bagSpec: spec,
      tiers: tiers,
      structure: structure,
    );
  }
}

/// Editor quy cách túi + bảng giá cho 1 sản phẩm.
class QuoteProductEditor extends StatelessWidget {
  final QuoteSheetDraft draft;
  final VoidCallback onChanged;
  final List<MaterialDef> materials;
  final List<(String key, String label)> handleOptions;

  const QuoteProductEditor({
    super.key,
    required this.draft,
    required this.onChanged,
    this.materials = const [],
    this.handleOptions = const [],
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final spec = draft.bagSpec;
    final inp = draft.input;
    final isTui = (inp['productType'] ?? 'tui') != 'mang';
    final hasZipperInput = inp['hasZipper'] == true;
    final hasHandlePricing = inp['hasHandle'] == true;
    final spreadMm = ((inp['spreadWidth'] as num?)?.toDouble() ?? 0) * 1000;
    final cutMm = ((inp['cutStep'] as num?)?.toDouble() ?? 0) * 1000;
    final cylLength = (inp['cylLength'] as num?)?.toDouble() ?? 0;
    final cylCircum = (inp['cylCircum'] as num?)?.toDouble() ?? 0;
    final numColors = (inp['numColors'] as num?)?.toInt() ?? 0;

    final showSideSeal =
        shouldShowBagSpecField(spec.bagType, BagSpecConditionalField.sideSeal);
    final showGusset =
        shouldShowBagSpecField(spec.bagType, BagSpecConditionalField.gusset);
    final showBackSeal =
        shouldShowBagSpecField(spec.bagType, BagSpecConditionalField.backSeal);
    final showStandup = shouldShowBagSpecField(
        spec.bagType, BagSpecConditionalField.standupBottom);
    final showLid =
        shouldShowBagSpecField(spec.bagType, BagSpecConditionalField.lid);
    final showSong = shouldShowBagSpecField(
        spec.bagType, BagSpecConditionalField.songSieuAm);
    final backSealLabel = spec.bagType == 'xephong_lech'
        ? 'Lưng lệch (mm)'
        : 'Lưng giữa (mm)';

    void set(String field, Object value) {
      switch (field) {
        case 'widthMm':
          spec.widthMm = (value as num).toDouble();
          break;
        case 'lengthMm':
          spec.lengthMm = (value as num).toDouble();
          break;
        case 'sideSealMm':
          spec.sideSealMm = (value as num).toDouble();
          break;
        case 'gussetMm':
          spec.gussetMm = (value as num).toDouble();
          break;
        case 'backSealMm':
          spec.backSealMm = (value as num).toDouble();
          break;
        case 'standupBottomSideMm':
          spec.standupBottomSideMm = (value as num).toDouble();
          break;
        case 'lidMm':
          spec.lidMm = (value as num).toDouble();
          break;
        case 'songSieuAmMm':
          spec.songSieuAmMm = (value as num).toDouble();
          break;
        case 'hasSongSieuAm':
          spec.hasSongSieuAm = value == true;
          break;
        case 'zipperDistanceMm':
          spec.zipperDistanceMm = (value as num).toDouble();
          break;
        case 'hasHeadSeal':
          spec.hasHeadSeal = value == true;
          break;
        case 'headSealMm':
          spec.headSealMm = (value as num).toDouble();
          break;
        case 'hasBottomSeal':
          spec.hasBottomSeal = value == true;
          break;
        case 'bottomSealMm':
          spec.bottomSealMm = (value as num).toDouble();
          break;
        case 'hasTearNotch':
          spec.hasTearNotch = value == true;
          break;
        case 'tearNotchFromTopMm':
          spec.tearNotchFromTopMm = (value as num).toDouble();
          break;
        case 'hasHangHole':
          spec.hasHangHole = value == true;
          break;
        case 'hangHoleDescription':
          spec.hangHoleDescription = value.toString();
          break;
        case 'hasHandleHole':
          spec.hasHandleHole = value == true;
          break;
        case 'handleHoleDescription':
          spec.handleHoleDescription = value.toString();
          break;
        case 'hasHalfMoonBottom':
          spec.hasHalfMoonBottom = value == true;
          break;
        case 'hasCylinder':
          spec.hasCylinder = value == true;
          break;
        case 'cylinderQuantity':
          spec.cylinderQuantity = (value as num).toDouble();
          break;
        case 'cylinderUnitPrice':
          spec.cylinderUnitPrice = (value as num).toDouble();
          break;
        case 'cylinderNote':
          spec.cylinderNote = value.toString();
          break;
        case 'hasStructureBack':
          spec.hasStructureBack = value == true;
          if (!spec.hasStructureBack) {
            spec.structureBack = '';
            spec.structureSwapped = false;
          }
          break;
        case 'structureBack':
          spec.structureBack = value.toString();
          break;
        case 'structureSwapped':
          spec.structureSwapped = value == true;
          break;
        case 'bottomFollows':
          spec.bottomFollows = value.toString();
          break;
        case 'hasHandle':
          spec.hasHandle = value == true;
          break;
        case 'handleOptionKey':
          spec.handleOptionKey = value.toString();
          break;
        case 'includeBagInQuote':
          spec.includeBagInQuote = value == true;
          break;
        case 'includeCylinderInQuote':
          spec.includeCylinderInQuote = value == true;
          break;
        case 'rollLengthM':
          spec.rollLengthM = (value as num).toDouble();
          break;
        case 'chieuRaCuonMang':
          spec.chieuRaCuonMang = value.toString();
          break;
        case 'stageNotes':
          spec.stageNotes = value as List<LsxStageNote>;
          break;
        case 'stageDescriptions':
          spec.stageDescriptions = value as List<LsxStageNote>;
          break;
      }
      onChanged();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (isTui) ...[
          const _SubTitle('Quy cách túi'),
          Row(children: [
            Expanded(
              child: LabeledField(
                label: 'Loại túi',
                child: Text(
                  bagTypeLabelTuInput(spec.bagType, hasZipperInput) == ''
                      ? '—'
                      : bagTypeLabelTuInput(spec.bagType, hasZipperInput),
                  style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: p.text),
                ),
              ),
            ),
          ]),
          Row(children: [
            Expanded(
              child: LabeledField(
                label: 'Chiều rộng',
                suffix: '(mm)',
                child: NumField(
                  initial: spec.widthMm,
                  integer: true,
                  onChanged: (v) => set('widthMm', v),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: LabeledField(
                label: 'Chiều dài',
                suffix: '(mm)',
                child: NumField(
                  initial: spec.lengthMm,
                  integer: true,
                  onChanged: (v) => set('lengthMm', v),
                ),
              ),
            ),
          ]),
          if (showSideSeal)
            LabeledField(
              label: 'Hàn biên',
              suffix: '(mm)',
              child: NumField(
                initial: spec.sideSealMm,
                integer: true,
                onChanged: (v) => set('sideSealMm', v),
              ),
            ),
          if (showGusset)
            LabeledField(
              label: 'Hông',
              suffix: '(mm)',
              child: NumField(
                initial: spec.gussetMm,
                integer: true,
                onChanged: (v) => set('gussetMm', v),
              ),
            ),
          if (showBackSeal)
            LabeledField(
              label: backSealLabel,
              child: NumField(
                initial: spec.backSealMm,
                integer: true,
                onChanged: (v) => set('backSealMm', v),
              ),
            ),
          if (showStandup) ...[
            LabeledField(
              label: 'Đáy mỗi bên',
              suffix: '(mm)',
              child: NumField(
                initial: spec.standupBottomSideMm,
                integer: true,
                onChanged: (v) => set('standupBottomSideMm', v),
              ),
            ),
            _ReadRow(
              label: 'Đáy mở tổng',
              value: '${(spec.standupBottomSideMm * 2).round()} mm',
            ),
          ],
          if (showLid)
            LabeledField(
              label: 'Nắp',
              suffix: '(mm)',
              child: NumField(
                initial: spec.lidMm,
                integer: true,
                onChanged: (v) => set('lidMm', v),
              ),
            ),
          if (showSong) ...[
            _CheckRow(
              label: 'Từ đầu đến sóng siêu âm',
              value: spec.hasSongSieuAm,
              onChanged: (v) => set('hasSongSieuAm', v),
            ),
            if (spec.hasSongSieuAm)
              LabeledField(
                label: 'Sóng siêu âm',
                suffix: '(mm)',
                child: NumField(
                  initial: spec.songSieuAmMm,
                  integer: true,
                  onChanged: (v) => set('songSieuAmMm', v),
                ),
              ),
          ],
          if (hasZipperInput) ...[
            const _ReadRow(label: 'Zipper', value: '✓ Có zipper (từ tính giá)'),
            LabeledField(
              label: 'Tâm zipper cách đầu',
              suffix: '(mm)',
              child: NumField(
                initial: spec.zipperDistanceMm,
                integer: true,
                onChanged: (v) => set('zipperDistanceMm', v),
              ),
            ),
          ],
          if (hasHandlePricing)
            const _ReadRow(
              label: 'Quai',
              value: '✓ Có quai (từ tính giá)',
            )
          else ...[
            _CheckRow(
              label: 'Quai',
              value: spec.hasHandle,
              onChanged: (v) => set('hasHandle', v),
            ),
            if (spec.hasHandle && handleOptions.isNotEmpty)
              LabeledField(
                label: 'Loại quai',
                child: DropdownButtonFormField<String>(
                  initialValue: handleOptions
                          .any((o) => o.$1 == spec.handleOptionKey)
                      ? spec.handleOptionKey
                      : null,
                  isDense: true,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: [
                    for (final o in handleOptions)
                      DropdownMenuItem(
                          value: o.$1,
                          child: Text(o.$2,
                              style: const TextStyle(fontSize: 13))),
                  ],
                  onChanged: (v) {
                    if (v != null) set('handleOptionKey', v);
                  },
                ),
              ),
          ],
          Row(children: [
            Expanded(
              child: _CheckRow(
                label: 'Hàn đầu',
                value: spec.hasHeadSeal,
                onChanged: (v) => set('hasHeadSeal', v),
              ),
            ),
            if (spec.hasHeadSeal)
              Expanded(
                child: NumField(
                  initial: spec.headSealMm,
                  integer: true,
                  suffix: 'mm',
                  onChanged: (v) => set('headSealMm', v),
                ),
              ),
          ]),
          Row(children: [
            Expanded(
              child: _CheckRow(
                label: 'Hàn đáy',
                value: spec.hasBottomSeal,
                onChanged: (v) => set('hasBottomSeal', v),
              ),
            ),
            if (spec.hasBottomSeal)
              Expanded(
                child: NumField(
                  initial: spec.bottomSealMm,
                  integer: true,
                  suffix: 'mm',
                  onChanged: (v) => set('bottomSealMm', v),
                ),
              ),
          ]),
          _CheckRow(
            label: 'Nhấn xé "V"',
            value: spec.hasTearNotch,
            onChanged: (v) => set('hasTearNotch', v),
          ),
          if (spec.hasTearNotch)
            LabeledField(
              label: 'V cách đầu',
              suffix: '(mm)',
              child: NumField(
                initial: spec.tearNotchFromTopMm,
                integer: true,
                onChanged: (v) => set('tearNotchFromTopMm', v),
              ),
            ),
          _CheckRow(
            label: 'Đục lỗ treo',
            value: spec.hasHangHole,
            onChanged: (v) => set('hasHangHole', v),
          ),
          if (spec.hasHangHole)
            LabeledField(
              label: 'Mô tả lỗ treo',
              child: TxtField(
                initial: spec.hangHoleDescription,
                hintText: 'VD: Ø8mm cách đầu 10mm',
                onChanged: (v) => set('hangHoleDescription', v),
              ),
            ),
          _CheckRow(
            label: 'Đục lỗ quai xách',
            value: spec.hasHandleHole,
            onChanged: (v) => set('hasHandleHole', v),
          ),
          if (spec.hasHandleHole)
            LabeledField(
              label: 'Mô tả lỗ quai',
              child: TxtField(
                initial: spec.handleHoleDescription,
                hintText: 'VD: 3 lỗ tròn Ø8mm',
                onChanged: (v) => set('handleHoleDescription', v),
              ),
            ),
          _CheckRow(
            label: 'Đáy bán nguyệt',
            value: spec.hasHalfMoonBottom,
            onChanged: (v) => set('hasHalfMoonBottom', v),
          ),
          _CheckRow(
            label: 'Trục in',
            value: spec.hasCylinder,
            onChanged: (v) => set('hasCylinder', v),
          ),
          if (spec.hasCylinder) ...[
            _ReadRow(
              label: 'Kích thước',
              value: 'Dài ${(cylLength * 1000).round()}mm × '
                  'Chu vi ${(cylCircum * 1000).round()}mm',
            ),
            Row(children: [
              Expanded(
                child: LabeledField(
                  label: 'Số lượng',
                  child: NumField(
                    initial: spec.cylinderQuantity,
                    integer: true,
                    onChanged: (v) => set('cylinderQuantity', v),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: LabeledField(
                  label: 'Đơn giá',
                  suffix: '(đ)',
                  child: NumField(
                    initial: spec.cylinderUnitPrice,
                    integer: true,
                    onChanged: (v) => set('cylinderUnitPrice', v),
                  ),
                ),
              ),
            ]),
          ],
          _CheckRow(
            label: 'Chất liệu 2 mặt',
            value: spec.hasStructureBack,
            onChanged: (v) => set('hasStructureBack', v),
          ),
          if (spec.hasStructureBack) _buildStructureBack(context, set),
        ] else ...[
          LabeledField(
            label: 'Chiều dài cuộn',
            suffix: '(m/cuộn)',
            child: NumField(
              initial: spec.rollLengthM,
              integer: true,
              onChanged: (v) => set('rollLengthM', v),
            ),
          ),
          LabeledField(
            label: 'Chiều ra cuộn màng',
            child: TxtField(
              initial: spec.chieuRaCuonMang,
              hintText: 'Mặt in ra ngoài',
              onChanged: (v) => set('chieuRaCuonMang', v),
            ),
          ),
        ],
        if (spreadMm > 0 && cutMm > 0)
          _ReadRow(
            label: 'Khổ',
            value: 'Khổ trải ${spreadMm.round()} mm × '
                'Bước cắt ${cutMm.round()} mm',
          ),
        if (numColors > 0) _ReadRow(label: 'Số màu in', value: '$numColors màu'),

        // ── Mô tả đơn hàng ─────────────────────────────────────────────────
        const SizedBox(height: 4),
        const _SubTitle('Mô tả đơn hàng'),
        _CheckRow(
          label: isTui ? 'Có báo giá túi' : 'Có báo giá màng',
          value: spec.includeBagInQuote,
          onChanged: (v) => set('includeBagInQuote', v),
        ),
        StageNoteEditor(
          label: 'Mô tả khác',
          value: spec.stageDescriptions,
          placeholder: 'Nhập mô tả khác...',
          onChanged: (v) => set('stageDescriptions', v),
        ),
        StageNoteEditor(
          label: 'Ghi chú công đoạn',
          value: spec.stageNotes,
          placeholder: 'Nhập ghi chú...',
          onChanged: (v) => set('stageNotes', v),
        ),

        // ── Mô tả trục in ──────────────────────────────────────────────────
        const SizedBox(height: 4),
        const _SubTitle('Mô tả trục in'),
        _CheckRow(
          label: 'Có báo giá trục',
          value: spec.includeCylinderInQuote,
          onChanged: (v) => set('includeCylinderInQuote', v),
        ),
        LabeledField(
          label: 'Ghi chú trục in',
          child: TxtField(
            initial: spec.cylinderNote ?? '',
            hintText: 'Nhập ghi chú trục in...',
            onChanged: (v) => set('cylinderNote', v),
          ),
        ),

        // ── Bảng mức số lượng / giá báo ────────────────────────────────────
        const SizedBox(height: 4),
        const _SubTitle('Mức số lượng & giá báo'),
        _TierTable(draft: draft, onChanged: onChanged),
      ],
    );
  }

  Widget _buildStructureBack(
    BuildContext context,
    void Function(String, Object) set,
  ) {
    final p = LtsT.of(context);
    final spec = draft.bagSpec;
    final inp = draft.input;
    final hasAlt = (inp['layer2AltId'] as String?)?.isNotEmpty ?? false;
    final frontStructure = (inp['structure'] as String?) ?? '';

    if (hasAlt && materials.isNotEmpty) {
      final opts = generateStructureBackOptions(
        CalculateInput.fromJson(inp),
        spec.bagType,
        materials,
      );
      final selectedIdx = spec.structureBack.isEmpty
          ? -1
          : opts.indexWhere((o) =>
              o.structureBack == spec.structureBack &&
              o.structureSwapped == spec.structureSwapped &&
              o.bottomFollows == spec.bottomFollows);
      return LabeledField(
        label: 'Chọn mặt sau',
        child: DropdownButtonFormField<int>(
          initialValue: selectedIdx >= 0 ? selectedIdx : 0,
          isDense: true,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            isDense: true,
          ),
          items: [
            for (var i = 0; i < opts.length; i++)
              DropdownMenuItem(
                value: i,
                child: Text(opts[i].label,
                    style: const TextStyle(fontSize: 12)),
              ),
          ],
          onChanged: (i) {
            if (i == null) return;
            final o = opts[i];
            set('structureBack', o.structureBack);
            set('bottomFollows', o.bottomFollows);
            set('structureSwapped', o.structureSwapped);
          },
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LabeledField(
          label: 'Chất liệu mặt sau',
          child: TxtField(
            initial: spec.structureBack,
            hintText: 'Nhập chất liệu mặt sau',
            onChanged: (v) => set('structureBack', v),
          ),
        ),
        if (spec.structureBack.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: p.shellBg,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: p.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Mặt trước: ${boSoCauTruc(
                  spec.structureSwapped ? spec.structureBack : frontStructure,
                )}',
                    style: TextStyle(fontSize: 12, color: p.text)),
                const SizedBox(height: 2),
                Text('Mặt sau: ${boSoCauTruc(
                  spec.structureSwapped ? frontStructure : spec.structureBack,
                )}',
                    style: TextStyle(fontSize: 12, color: p.text)),
                if (spec.bagType == 'dayDung')
                  TextButton(
                    onPressed: () => set(
                        'bottomFollows',
                        spec.bottomFollows == 'front' ? 'back' : 'front'),
                    child: Text(
                      'Đáy theo mặt '
                      '${spec.bottomFollows == 'front' ? 'trước' : 'sau'} (đổi)',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ),
                TextButton(
                  onPressed: () => set('structureSwapped',
                      !spec.structureSwapped),
                  child: const Text('⇄ Đảo mặt trước / mặt sau',
                      style: TextStyle(fontSize: 11)),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _TierTable extends StatelessWidget {
  final QuoteSheetDraft draft;
  final VoidCallback onChanged;
  const _TierTable({required this.draft, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < draft.tiers.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: LabeledField(
                    label: 'Số lượng',
                    child: NumField(
                      initial: draft.tiers[i].quantity,
                      integer: true,
                      onChanged: (v) {
                        draft.tiers[i].quantity = v;
                        onChanged();
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: LabeledField(
                    label: 'Giá báo khách',
                    suffix: '(đ)',
                    child: NumField(
                      initial: draft.tiers[i].baoGia,
                      integer: true,
                      onChanged: (v) {
                        draft.tiers[i].baoGia = v;
                        onChanged();
                      },
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 18),
                    child: Text(
                      'Đề xuất: ${Fmt.n(draft.tiers[i].finalPrice)} đ',
                      style: TextStyle(fontSize: 11, color: p.muted),
                    ),
                  ),
                ),
                if (draft.tiers.length > 1)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: IconButton(
                      icon: Icon(Icons.close, size: 16, color: p.muted),
                      onPressed: () {
                        draft.tiers.removeAt(i);
                        onChanged();
                      },
                    ),
                  ),
              ],
            ),
          ),
        if (draft.tiers.isNotEmpty)
          for (final t in draft.tiers)
            if (t.baoGia > 0 && t.baoGia < t.finalPrice)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '⚠ Giá báo thấp hơn giá đề xuất '
                  '(${Fmt.n(t.finalPrice)} đ) ở mức SL ${Fmt.n(t.quantity)}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFFB45309)),
                ),
              ),
        TextButton.icon(
          onPressed: () {
            final last = draft.tiers.isNotEmpty
                ? draft.tiers.last
                : QuoteTierRow(quantity: 0, finalPrice: 0, baoGia: 0);
            draft.tiers.add(QuoteTierRow(
              quantity: 0,
              finalPrice: last.finalPrice,
              baoGia: last.baoGia,
            ));
            onChanged();
          },
          icon: const Icon(Icons.add, size: 16),
          label: const Text('Thêm mức số lượng',
              style: TextStyle(fontSize: 12)),
        ),
      ],
    );
  }
}

/// Editor nhiều dòng ghi chú/mô tả theo công đoạn (mirror StageNoteEditor).
class StageNoteEditor extends StatelessWidget {
  final String label;
  final List<LsxStageNote> value;
  final String placeholder;
  final ValueChanged<List<LsxStageNote>> onChanged;

  const StageNoteEditor({
    super.key,
    required this.label,
    required this.value,
    required this.placeholder,
    required this.onChanged,
  });

  static const _stages = <(LsxStageKey, String)>[
    (LsxStageKey.inCd, 'In'),
    (LsxStageKey.ghep, 'Ghép'),
    (LsxStageKey.chia, 'Chia'),
    (LsxStageKey.lamTui, 'Làm túi'),
  ];

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final rows = value.isEmpty
        ? [const LsxStageNote(stage: LsxStageKey.lamTui, text: '')]
        : value;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(),
              style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.42,
                  color: p.muted)),
          const SizedBox(height: 6),
          for (var i = 0; i < rows.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  SizedBox(
                    width: 96,
                    child: DropdownButtonFormField<LsxStageKey>(
                      initialValue: rows[i].stage,
                      isDense: true,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        isDense: true,
                        contentPadding:
                            EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                      ),
                      items: [
                        for (final s in _stages)
                          DropdownMenuItem(
                            value: s.$1,
                            child: Text(s.$2,
                                style: const TextStyle(fontSize: 12)),
                          ),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        final next = [...rows];
                        next[i] = LsxStageNote(stage: v, text: rows[i].text);
                        onChanged(next);
                      },
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: TxtField(
                      initial: rows[i].text,
                      hintText: placeholder,
                      onChanged: (v) {
                        final next = [...rows];
                        next[i] = LsxStageNote(stage: rows[i].stage, text: v);
                        onChanged(next);
                      },
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.delete_outline, size: 16, color: p.muted),
                    onPressed: () {
                      final next = [...rows]..removeAt(i);
                      onChanged(next.isEmpty
                          ? [const LsxStageNote(
                              stage: LsxStageKey.lamTui, text: '')]
                          : next);
                    },
                  ),
                ],
              ),
            ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => onChanged([
                ...rows,
                const LsxStageNote(stage: LsxStageKey.lamTui, text: ''),
              ]),
              icon: const Icon(Icons.add, size: 15),
              label: const Text('Thêm', style: TextStyle(fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubTitle extends StatelessWidget {
  final String text;
  const _SubTitle(this.text);
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(text,
          style: TextStyle(
              fontSize: 12.5, fontWeight: FontWeight.w800, color: p.text)),
    );
  }
}

class _ReadRow extends StatelessWidget {
  final String label;
  final String value;
  const _ReadRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label,
                style: TextStyle(fontSize: 12, color: p.muted)),
          ),
          Expanded(
            child: Text(value,
                style: TextStyle(fontSize: 12.5, color: p.text)),
          ),
        ],
      ),
    );
  }
}

class _CheckRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _CheckRow({
    required this.label,
    required this.value,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return InkWell(
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            Checkbox(
              value: value,
              onChanged: (v) => onChanged(v ?? false),
              visualDensity: VisualDensity.compact,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            Expanded(
              child: Text(label,
                  style: TextStyle(fontSize: 12.5, color: p.text)),
            ),
          ],
        ),
      ),
    );
  }
}
