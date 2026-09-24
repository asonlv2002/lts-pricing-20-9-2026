// ═══════════════════════════════════════════════════════════════════════════
// form_noi_bo.dart — Form nhập liệu chế độ Nội bộ (part of tinh_gia_screen).
// Tách từ tinh_gia_screen.dart để dễ bảo trì; dùng chung library private.
// ═══════════════════════════════════════════════════════════════════════════
part of '../tinh_gia_screen.dart';

// ─── Input Form — mobile scrollable ──────────────────────────────────────────
class _InputForm extends StatefulWidget {
  final AppState state;
  final String mode;
  const _InputForm({required this.state, required this.mode});

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

  bool get _laThuongMai => i['pricingMode'] == 'commercial';
  bool get _laMoTa => _laThuongMai && (i['commercialMode'] ?? 'form') == 'description';

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
              label: _laThuongMai ? 'Tên hàng' : 'Tên sản phẩm',
              icon: Icons.inventory_2_outlined,
              child: TxtField(
                initial: (i['productName'] as String?) ?? '',
                hintText: 'VD: Túi gạo 5kg',
                onChanged: (v) => u('productName', v),
              ),
            ),
            // Loại báo giá (chỉ thương mại)
            if (_laThuongMai)
              LabeledField(
                label: 'Loại báo giá',
                child: ChipSelect<String>(
                  options: const [
                    ('form', 'Nhập theo form tính giá'),
                    ('description', 'Mô tả khác'),
                  ],
                  selected: (i['commercialMode'] as String?) ?? 'form',
                  onChanged: (v) => u('commercialMode', v),
                ),
              ),
            // Mô tả tự do (thương mại — mô tả khác)
            if (_laMoTa)
              LabeledField(
                label: 'Mô tả báo giá thương mại',
                child: _MultilineField(
                  initial: (i['commercialDescription'] as String?) ?? '',
                  hintText: 'Mô tả sản phẩm, điều khoản, điều kiện giao hàng…',
                  onChanged: (v) => u('commercialDescription', v),
                ),
              ),
            // Nhóm khách + chạy lần đầu (không thương mại)
            if (!_laThuongMai) ...[
              LabeledField(
                label: 'Nhóm khách',
                child: ChipSelect<String>(
                  options: const [
                    ('normal', 'Khách thường'),
                    ('large', 'Khách lớn'),
                  ],
                  selected: (i['printFilmCustomerGroup'] as String?) ?? 'normal',
                  onChanged: (v) => u('printFilmCustomerGroup', v),
                ),
              ),
              CheckboxRow(
                label: 'Sản phẩm chạy lần đầu',
                value: (i['firstRun'] as bool?) ?? false,
                onChanged: (v) => u('firstRun', v),
              ),
            ],
            // Loại sản phẩm (ẩn khi mô tả tự do)
            if (!_laMoTa)
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
            if (!_laMoTa && _productType == 'tui')
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
                    ('cutSealNapKeo', 'Cut seal mở miệng có nắp keo'),
                  ],
                  selected: _bagType.isEmpty ? null : _bagType,
                  onChanged: (v) => u('bagType', v ?? ''),
                ),
              ),
            if (!_laMoTa && _productType == 'mang')
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
              label: _laMoTa
                  ? 'Số lượng'
                  : (_isMang ? 'Số lượng màng' : 'Số lượng'),
              icon: Icons.numbers,
              child: (_isMang && !_laMoTa)
                  ? _SoLuongMang(state: s)
                  : _SoLuongTui(state: s),
            ),
            if (!_laMoTa && _isMang)
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

        // ── 1b. Thu mua (thương mại) ──────────────────────────────────────
        if (_laThuongMai) ...[
          _ThuMuaSection(state: s, laMoTa: _laMoTa),
          const SizedBox(height: 12),
        ],

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
                      final target =
                          (i['targetThickness'] as num?)?.toInt() ?? 0;
                      if (target <= 0) return;
                      // Build current layers
                      final layers = <Map<String, dynamic>>[];
                      for (final k in [
                        'layer1Id',
                        'layer2Id',
                        'layer3Id',
                        'layer4Id',
                        'layer5Id'
                      ]) {
                        final id = i[k] as String?;
                        if (id == null) continue;
                        final mat = s.materials.firstWhere(
                          (m) => m.id == id,
                          orElse: () => MaterialDef(
                            id: id,
                            name: id,
                            density: 0,
                            thickness: 0,
                            pricePerKg: 0,
                            isPETorPA: false,
                            rollLength: 0,
                            inkPricePerColor: 0,
                          ),
                        );
                        layers.add({
                          'id': k,
                          'materialId': mat.id,
                          'doDay': (i['micOverrides'] as Map?)?[k] as num? ??
                              mat.thickness,
                          'isLLDPE': mat.name.toLowerCase().contains('lldpe') ||
                              (mat.group?.toLowerCase().contains('lldpe') ??
                                  false),
                        });
                      }
                      if (layers.isEmpty) return;
                      // Call JS engine via EngineService
                      final engine = EngineService.instance;
                      if (!engine.isReady) await engine.init();
                      final layersJson = jsonEncode(layers);
                      final matsJson = jsonEncode(
                          s.materials.map((m) => m.toJson()).toList());
                      final code =
                          'globalThis.LTS.toiUuDoDay($target, JSON.parse(${jsonEncode(layersJson)}), JSON.parse(${jsonEncode(matsJson)}))';
                      final resultJson = engine.evaluateCode(code);
                      if (resultJson != null && !resultJson.isError) {
                        final result = jsonDecode(resultJson.stringResult)
                            as Map<String, dynamic>;
                        final optimized = result['ketQua'] as List? ?? [];
                        final newOverrides = Map<String, dynamic>.from(
                            (i['micOverrides'] as Map?) ?? {});
                        // Build change summary
                        final changes = <String>[];
                        for (final kq in optimized) {
                          final layerId = kq['layerId'] as String;
                          final adjusted =
                              (kq['adjustedThickness'] as num).toDouble();
                          final selectedMaterialId =
                              kq['materialId'] as String?;
                          final mat = s.materials.firstWhere(
                            (m) => m.id == i[layerId],
                            orElse: () => MaterialDef(
                              id: '',
                              name: '',
                              density: 0,
                              thickness: 0,
                              pricePerKg: 0,
                              isPETorPA: false,
                              rollLength: 0,
                              inkPricePerColor: 0,
                            ),
                          );
                          final selectedMat = s.materials.firstWhere(
                            (m) => m.id == (selectedMaterialId ?? mat.id),
                            orElse: () => mat,
                          );
                          if (selectedMaterialId != null &&
                              selectedMaterialId != mat.id) {
                            u(layerId, selectedMaterialId);
                            changes.add(
                                '${mat.name}: ${selectedMat.name} ${selectedMat.thickness}');
                          }
                          if (adjusted != selectedMat.thickness) {
                            newOverrides[layerId] = adjusted;
                            changes.add(
                                '${selectedMat.name}: ${selectedMat.thickness}→$adjusted');
                          } else {
                            newOverrides.remove(layerId);
                          }
                        }
                        u('micOverrides', newOverrides);
                        final tongThucTe =
                            (result['tongThucTe'] as num).toInt();
                        final datYeuCau = result['datYeuCau'] as bool? ?? false;
                        if (context.mounted) {
                          LtsToast.show(
                            context,
                            datYeuCau
                                ? 'Đã tối ưu: $tongThucTe mic (thỏa [${target - 5}, ${target + 5}])\n${changes.join(', ')}'
                                : (result['canhBao'] as String? ??
                                    'Không đạt yêu cầu'),
                            type: datYeuCau
                                ? LtsToastType.success
                                : LtsToastType.warning,
                            duration: const Duration(seconds: 4),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.auto_fix_high, size: 16),
                    label: const Text('Tính độ dày'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
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
                      onChanged: (v) {
                        final vi = v.toInt().clamp(1, 99);
                        u('numImages', vi);
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
                      onChanged: (v) => u('numColors', v == 0 ? null : v),
                    ),
                  ),
                ),
              ]),
              // Có chia
              LabeledField(
                label: 'Có chia',
                child: CheckboxRow(
                  label: 'Chia khổ',
                  value: (i['hasDivide'] as bool?) ?? false,
                  onChanged: (v) => u('hasDivide', v),
                ),
              ),
              if ((i['hasDivide'] as bool?) == true)
                Row(children: [
                  Expanded(
                    child: LabeledField(
                      label: 'Số phần tử chia',
                      child: NumField(
                        initial: (i['divideElements'] as num?) ?? 1,
                        integer: true,
                        onChanged: (v) =>
                            u('divideElements', v.toInt().clamp(1, 999)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: LabeledField(
                      label: 'Khổ chia',
                      suffix: '(m)',
                      child: NumField(
                        initial: ((i['divideWidthMm'] as num?) ?? 0) / 1000,
                        suffix: 'm',
                        onChanged: (v) =>
                            u('divideWidthMm', (v * 1000).round()),
                      ),
                    ),
                  ),
                ]),
            ],
          ),
          const SizedBox(height: 12),
        ],

        // ── 3b. Gia công ngoài (chỉ chế độ Gia công) ──────────────────────
        if (_showStructure && widget.mode == 'outsource') ...[
          PanelGiaCongNgoai(state: s),
          const SizedBox(height: 12),
        ],

        // ── 4. Nâng cao (collapsible) ──────────────────────────────────────
        if (_showStructure) ...[
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: LtsAdvancedToggle(
              label: 'Tuỳ chỉnh nâng cao (Phụ kiện · Trục in · Đóng gói · Hoa hồng)',
              open: _advancedOpen,
              onTap: () => setState(() => _advancedOpen = !_advancedOpen),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            child: _advancedOpen
                ? Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: _AdvancedSection(state: s),
                  )
                : const SizedBox(width: double.infinity),
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
              child: _PaymentDaysField(state: s),
            ),
            LabeledField(
              label: 'Cột lợi nhuận',
              child: ChipSelect<int>(
                options: const [
                  (1, 'Cột 1 · thấp'),
                  (2, 'Cột 2 · cao'),
                ],
                selected: (i['profitColumn'] as num?)?.toInt() ?? 1,
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
      const keys = ['layer1Id', 'layer2Id', 'layer3Id', 'layer4Id', 'layer5Id'];
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
}

// ─── Số lượng túi (đơn giản) ─────────────────────────────────────────────────
class _SoLuongTui extends StatelessWidget {
  final AppState state;
  const _SoLuongTui({required this.state});
  @override
  Widget build(BuildContext context) {
    final i = state.currentInput.raw;
    return NumField(
      initial: (i['quantity'] as num?) ?? 0,
      integer: true,
      suffix: 'cái',
      onChanged: (v) => state.updateInput('quantity', v),
    );
  }
}

// ─── Số lượng màng: m²/mét + quy đổi cuộn (mirror web) ───────────────────────
class _SoLuongMang extends StatelessWidget {
  final AppState state;
  const _SoLuongMang({required this.state});
  @override
  Widget build(BuildContext context) {
    final i = state.currentInput.raw;
    final unit = (i['filmQuantityUnit'] as String?) ?? 'm2';
    final slGoc = ((i['filmInputQuantity'] as num?) ?? (i['quantity'] as num?) ?? 0)
        .toDouble();
    final sw = (i['spreadWidth'] as num?)?.toDouble() ?? 0;
    final dienTich = unit == 'meter' ? slGoc * sw : ((i['quantity'] as num?) ?? 0).toDouble();
    final rollLen = ((i['filmRollLength'] as num?) ?? 6000).toDouble();
    final soHinh = (i['numImages'] as num?)?.toInt() ?? 1;
    final soCuon = (rollLen > 0 && sw > 0)
        ? dienTich / (rollLen * sw * (soHinh > 0 ? soHinh : 1))
        : 0.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Expanded(
            child: NumField(
              initial: slGoc,
              suffix: unit == 'meter' ? 'm' : 'm²',
              onChanged: (v) => state.updateInput('filmInputQuantity', v),
            ),
          ),
          const SizedBox(width: 8),
          DropdownField<String>(
            options: const [(null, 'm²'), ('m2', 'm²'), ('meter', 'mét')],
            selected: unit,
            onChanged: (v) =>
                state.updateInput('filmQuantityUnit', v ?? 'm2'),
          ),
        ]),
        const SizedBox(height: 6),
        Text(
          'Quy đổi: ${_fmt(dienTich)} m²'
          '${soCuon > 0 ? ' · ≈ ${soCuon.toStringAsFixed(2)} cuộn' : ''}',
          style: TextStyle(
              fontSize: 11.5,
              color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      ],
    );
  }
}

// ─── Số ngày thanh toán: mốc chuẩn + customPaymentDays (mirror web) ─────────
class _PaymentDaysField extends StatelessWidget {
  final AppState state;
  const _PaymentDaysField({required this.state});
  @override
  Widget build(BuildContext context) {
    final i = state.currentInput.raw;
    final selected = (i['paymentDays'] as num?)?.toInt() ?? 30;
    final customs = ((state.constants.raw['customPaymentDays'] as List?) ?? const [])
        .map((e) => (e as num).toInt())
        .toList();
    final days = <int>{14, 30, 45, 75, 90, ...customs}.toList()..sort();
    return ChipSelect<int>(
      options: [for (final d in days) (d, '$d ngày')],
      selected: selected,
      onChanged: (v) => state.updateInput('paymentDays', v),
    );
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
    final layerKeys = [
      'layer1Id',
      'layer2Id',
      'layer3Id',
      'layer4Id',
      'layer5Id'
    ];
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
          border:
              Border.all(color: scheme.outlineVariant.withValues(alpha: 0.4)),
        ),
        alignment: Alignment.center,
        child: Text('Chưa chọn lớp nào',
            style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
      );
    }

    final layers = layerIds.map((id) {
      return materials.firstWhere((m) => m.id == id,
          orElse: () => MaterialDef(
                id: id!,
                name: id,
                density: 0,
                thickness: 0,
                pricePerKg: 0,
                isPETorPA: false,
                rollLength: 0,
                inkPricePerColor: 0,
              ));
    }).toList();

    // Thickness calculation
    final micOverrides =
        (input['micOverrides'] as Map?)?.cast<String, dynamic>() ?? {};
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
                          color:
                              scheme.onSurfaceVariant.withValues(alpha: 0.5))),
                ),
              Expanded(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
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
                      Text('$micμ',
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
              border:
                  Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
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
        ? materials
            .cast<MaterialDef?>()
            .firstWhere((m) => m!.id == selectedId, orElse: () => null)
        : null;
    final micOverrides =
        (input['micOverrides'] as Map?)?.cast<String, dynamic>() ?? {};
    final currentMic =
        (micOverrides[layerKey] as num?)?.toDouble() ?? mat?.thickness ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaterialPickerField(
          label: label,
          icon: icon,
          materials: materials,
          value: selectedId,
          onChanged: onChanged,
          theoNhom: true,
        ),
        if (mat != null && mat.adjustableMic == true)
          Padding(
            padding: const EdgeInsets.only(left: 16, top: 4, bottom: 4),
            child: Row(
              children: [
                Icon(Icons.tune,
                    size: 14, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 6),
                Text('Độ dày:',
                    style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurfaceVariant)),
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
  bool get _laThuongMai => i['pricingMode'] == 'commercial';

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
        // Phủ mực & hiệu ứng (không thương mại)
        if (!_laThuongMai) ...[
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
          // Phụ phí in tuỳ chọn (customPrintSurcharges)
          if (((state.constants.raw['customPrintSurcharges'] as List?) ?? const [])
              .isNotEmpty)
            Wrap(
              spacing: 16,
              children: [
                for (final opt
                    in (state.constants.raw['customPrintSurcharges'] as List))
                  if (opt is Map)
                    CheckboxRow(
                      label: '${opt['label']} '
                          '(${_fmt((opt['price'] as num?) ?? 0)}đ)',
                      value:
                          ((i['selectedPrintSurchargeKeys'] as List?) ?? const [])
                              .map((e) => e.toString())
                              .contains(opt['key']?.toString()),
                      onChanged: (v) {
                        final cur =
                            ((i['selectedPrintSurchargeKeys'] as List?) ??
                                    const [])
                                .map((e) => e.toString())
                                .toList();
                        final k = opt['key']?.toString() ?? '';
                        if (v) {
                          if (!cur.contains(k)) cur.add(k);
                        } else {
                          cur.remove(k);
                        }
                        u('selectedPrintSurchargeKeys', cur);
                      },
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
            // Loại quai (handleOptions)
            if ((i['hasHandle'] as bool?) == true &&
                (((state.constants.raw['handleOptions'] as List?) ?? const [])
                    .isNotEmpty))
              LabeledField(
                label: 'Loại quai',
                child: DropdownField<String>(
                  options: [
                    for (final o
                        in (state.constants.raw['handleOptions'] as List))
                      if (o is Map)
                        (o['key']?.toString(), o['label']?.toString() ?? ''),
                  ],
                  selected: i['handleOptionKey']?.toString(),
                  onChanged: (v) => u('handleOptionKey', v),
                ),
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
            child: DropdownField<String>(
              options: [
                (null, 'Trục A'),
                ('A', 'Trục A · 7.3tr'),
                ('B', 'Trục B · 6.5tr'),
                for (final c
                    in (state.constants.raw['customCylTypes'] as List?) ??
                        const [])
                  if (c is Map)
                    (c['key']?.toString(), c['label']?.toString() ?? ''),
                ('custom', 'Trục khác'),
              ],
              selected: (i['cylType'] as String?) ?? 'A',
              onChanged: (v) => u('cylType', v ?? 'A'),
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
            subtitle:
                'Phân bổ chi phí bộ trục vào đơn giá (định mức 200.000 m²)',
            icon: Icons.album_outlined,
            accent: AppColors.success,
            value: (i['cylIncluded'] as bool?) ?? false,
            onChanged: (v) => u('cylIncluded', v),
          ),
        ],

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
        else ...[
          if (((state.constants.raw['boxOptions'] as List?) ?? const []).isNotEmpty)
            LabeledField(
              label: 'Loại thùng',
              child: DropdownField<String>(
                options: [
                  (null, 'Chọn loại thùng'),
                  for (final o in (state.constants.raw['boxOptions'] as List))
                    if (o is Map)
                      (
                        o['key']?.toString(),
                        '${o['label']} / ${_fmt((o['price'] as num?) ?? 0)} đ'
                      ),
                  ('custom', 'Tự nhập'),
                ],
                selected: i['boxOptionKey']?.toString(),
                onChanged: (v) {
                  if (v == null || v == 'custom') {
                    u('boxOptionKey', v == 'custom' ? 'custom' : null);
                    return;
                  }
                  final opt = (state.constants.raw['boxOptions'] as List)
                      .firstWhere((o) => o is Map && o['key'] == v,
                          orElse: () => null);
                  if (opt is Map) {
                    u('boxOptionKey', opt['key']);
                    u('boxPrice', (opt['price'] as num?) ?? 0);
                    u('boxWeight', (opt['weight'] as num?) ?? 0);
                  }
                },
              ),
            ),
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
        ],
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

        // Phụ phí khác (chỉ thương mại form) — mirror TheNhapLieu commercialExtraFee
        if (_laThuongMai) ...[
          _SubTitle('💰 Phụ phí khác'),
          LabeledField(
            label: 'Phụ phí khác (VNĐ)',
            child: NumField(
              initial: (i['commercialExtraFee'] as num?) ?? 0,
              integer: true,
              suffix: 'đ',
              onChanged: (v) => u('commercialExtraFee', v),
            ),
          ),
        ],
      ],
    );
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
        hintText = '= ${_fmt(vndPerUnit)} đ/$unitLabel';
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
                  border: Border.all(
                      color: scheme.outlineVariant.withValues(alpha: 0.5)),
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
