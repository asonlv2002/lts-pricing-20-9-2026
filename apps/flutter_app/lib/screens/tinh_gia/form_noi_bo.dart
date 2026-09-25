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

  @override
  void initState() {
    super.initState();
    // Fetch danh sách khách khi vào form — chỉ khi đã đăng nhập (online-only,
    // không cache LS theo lựa chọn scope). Post-frame để khỏi notify giữa build.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) s.taiDanhSachKhachHang();
    });
  }

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
              child: _KhachHangField(state: s),
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
              // Lớp 2 kép — mirror web "+ Thêm cấu trúc" (TheNhapLieu.tsx:1060-1186):
              // có layer2AltId → stack 2 cột VL ngoài/giữa; chưa có → picker thường + nút thêm.
              if ((i['layer2AltId'] as String?) != null)
                _Layer2KepSection(state: s, onLayerChange: _onLayerChange)
              else ...[
                _LayerPickerRow(
                  label: 'Lớp 2',
                  materials: s.materials,
                  layerKey: 'layer2Id',
                  disabled: i['layer1Id'] == null,
                  input: i,
                  onChanged: (v) => _onLayerChange('layer2Id', v),
                  onMicOverride: _onMicOverride,
                ),
                if (i['layer2Id'] != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2, bottom: 10),
                    child: OutlinedButton.icon(
                      onPressed: _themCauTrucLop2,
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Thêm cấu trúc'),
                    ),
                  ),
              ],
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

  static MaterialDef? _timVatLieu(List<MaterialDef> mats, String? id) {
    if (id == null || id.isEmpty) return null;
    for (final m in mats) {
      if (m.id == id) return m;
    }
    return null;
  }

  void _onLayerChange(String layerKey, String? value) {
    u(layerKey, value);
    final micOverrides = Map<String, dynamic>.from(
        (s.currentInput.raw['micOverrides'] as Map?) ?? {});
    micOverrides.remove(layerKey);
    // Mirror web xuLyDoiLop (TheNhapLieu.tsx:323-349): lớp 2 bị xoá, hoặc VL
    // mới khác độ dày với VL phụ đang ghép → bỏ cấu trúc phụ.
    if (layerKey == 'layer2Id') {
      final altId = s.currentInput.raw['layer2AltId'] as String?;
      if (altId != null || value == null) {
        final chinhMoi = _timVatLieu(s.materials, value);
        final phu = _timVatLieu(s.materials, altId);
        if (value == null ||
            chinhMoi == null ||
            phu == null ||
            chinhMoi.thickness != phu.thickness) {
          u('layer2AltId', null);
          u('layer2Lengths', null);
          u('layer2FrontPart', 'main');
          u('layer2PairingMode', 'bottom_to_bottom');
          micOverrides.remove('layer2AltId');
        }
      }
    }
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

  /// Mirror web nút "+ Thêm cấu trúc" (TheNhapLieu.tsx:1063-1081): VL phụ =
  /// VL đầu tiên cùng độ dày khác lớp 2; chia đều khổ trải (lưu MÉT).
  void _themCauTrucLop2() {
    final i = s.currentInput.raw;
    final chinhId = i['layer2Id'] as String?;
    if (chinhId == null) return;
    final chinh = _timVatLieu(s.materials, chinhId);
    MaterialDef? phu;
    for (final m in s.materials) {
      if (m.id != chinhId &&
          (chinh == null || m.thickness == chinh.thickness)) {
        phu = m;
        break;
      }
    }
    final sw = (i['spreadWidth'] as num?)?.toDouble() ?? 0;
    u('layer2AltId', phu?.id);
    u('layer2Lengths', {'mat1': sw / 2, 'mat2': sw / 2});
    u('layer2FrontPart', 'main');
    u('layer2PairingMode', 'bottom_to_bottom');
  }

  void _onMicOverride(String layerKey, double value) {
    final micOverrides = Map<String, dynamic>.from(
        (s.currentInput.raw['micOverrides'] as Map?) ?? {});
    micOverrides[layerKey] = value;
    u('micOverrides', micOverrides);
  }
}

// ─── Khách hàng — autocomplete + tạo nhanh (mirror web TheNhapLieu.tsx:188-291,
//     647-749). Chưa đăng nhập → nhập tự do như cũ; đã đăng nhập → gợi ý từ BE. ──
class _KhachHangField extends StatefulWidget {
  final AppState state;
  const _KhachHangField({required this.state});
  @override
  State<_KhachHangField> createState() => _KhachHangFieldState();
}

class _KhachHangFieldState extends State<_KhachHangField> {
  late final TextEditingController _c = TextEditingController(
      text: (widget.state.currentInput.raw['customer'] as String?) ?? '');
  final FocusNode _focus = FocusNode();
  bool _moGoiY = false;
  String _maKhachHang = '';
  String _loiTaoMoi = '';
  bool _dangTao = false;
  bool _moTaoMoi = false;

  AppState get s => widget.state;
  Map<String, dynamic> get i => s.currentInput.raw;
  void u(String key, dynamic value) => s.updateInput(key, value);

  static const _regexMaKhachHang = r'^[A-Z0-9_]+$';

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      if (!_focus.hasFocus && mounted) setState(() => _moGoiY = false);
    });
  }

  @override
  void didUpdateWidget(covariant _KhachHangField old) {
    super.didUpdateWidget(old);
    // Reset/history đổi customer ngoài field → sync text khi không đang gõ.
    final cur = (s.currentInput.raw['customer'] as String?) ?? '';
    if (!_moGoiY && cur != _c.text) {
      _c.text = cur;
      _c.selection = TextSelection.collapsed(offset: cur.length);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    _focus.dispose();
    super.dispose();
  }

  bool get _dangNhap => s.isAuthenticated;

  /// Gợi ý — mirror web `goiYKhachHang` (TheNhapLieu.tsx:188-196):
  /// admin thấy hết; sale/purchase chỉ khách mình phụ trách; bỏ dấu so khớp.
  List<KhachHang> get _goiY {
    if (!_dangNhap || !_moGoiY) return const [];
    final tuKhoa = boDau(_c.text.trim());
    if (tuKhoa.isEmpty) return const [];
    final laAdmin = s.laAdminTaiKhoan;
    return s.danhSachKhachHang
        .where((kh) =>
            (laAdmin || s.laNguoiPhuTrach(kh)) &&
            !kh.isLocked &&
            (kh.moiNhat?.status ?? 'active') != 'inactive')
        .where((kh) => boDau(
                '${kh.codeName} ${kh.moiNhat?.organizationName ?? ''} '
                '${kh.moiNhat?.contactName ?? ''} ${kh.moiNhat?.phoneNumber ?? ''}')
            .contains(tuKhoa))
        .take(6)
        .toList();
  }

  /// Sale chỉ được dùng khách mình phụ trách (hoặc khách vừa tạo) —
  /// mirror web `khachHopLe` (TheNhapLieu.tsx:201-210).
  bool get _khachHopLe {
    if (!_dangNhap || s.laAdminTaiKhoan) return true;
    if (s.vuaTaoKhachMoi) return true;
    final chuan = boDau(_tenNhap.trim());
    if (chuan.isEmpty) return false;
    return s.danhSachKhachHang.any((kh) =>
        s.laNguoiPhuTrach(kh) &&
        boDau((kh.moiNhat?.organizationName ?? '').trim()) == chuan);
  }

  /// Tên trùng KH có thật nhưng không do sale quản lý — mirror web 213-220.
  bool get _khachTonTaiNgoaiQuyen {
    if (!_dangNhap || s.laAdminTaiKhoan) return false;
    final chuan = boDau(_tenNhap.trim());
    if (chuan.isEmpty) return false;
    return s.danhSachKhachHang.any((kh) =>
        boDau((kh.moiNhat?.organizationName ?? '').trim()) == chuan &&
        !s.laNguoiPhuTrach(kh));
  }

  String get _tenNhap => (i['customer'] as String?) ?? '';

  String get _canhBaoMa {
    final ma = _maKhachHang.trim();
    if (ma.isEmpty) return '';
    if (!RegExp(_regexMaKhachHang).hasMatch(ma)) {
      return 'Mã khách hàng chỉ dùng chữ in hoa, số và dấu gạch dưới. Ví dụ hợp lệ: KH001, ACME_01';
    }
    return '';
  }

  void _chon(KhachHang kh) {
    final ten = (kh.moiNhat?.organizationName ?? '').trim();
    _c.text = ten;
    _c.selection = TextSelection.collapsed(offset: ten.length);
    u('customer', ten);
    setState(() {
      _moGoiY = false;
      _moTaoMoi = false;
      _loiTaoMoi = '';
    });
    _focus.unfocus();
  }

  void _toggleTaoMoi() {
    setState(() {
      _moTaoMoi = !_moTaoMoi;
      _loiTaoMoi = '';
    });
  }

  Future<void> _taoMoi() async {
    setState(() => _dangTao = true);
    try {
      final kh = await s.taoNhanhKhachHang(_c.text, _maKhachHang);
      final ten = (kh.moiNhat?.organizationName ?? '').trim();
      if (!mounted) return;
      _c.text = ten;
      _c.selection = TextSelection.collapsed(offset: ten.length);
      u('customer', ten);
      setState(() {
        _moTaoMoi = false;
        _maKhachHang = '';
        _moGoiY = false;
        _loiTaoMoi = '';
      });
      _focus.unfocus();
      LtsToast.show(context, 'Đã tạo khách hàng: $ten',
          type: LtsToastType.success, duration: const Duration(seconds: 3));
    } catch (e) {
      if (!mounted) return;
      setState(() =>
          _loiTaoMoi = e.toString().replaceFirst(RegExp(r'^Exception:\s*'), ''));
    } finally {
      if (mounted) setState(() => _dangTao = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final goiY = _goiY;
    // Panel "Khách mới" — mở bằng nút person_add (mobile-first; web tự mở
    // dropdown khi không có gợi ý — ở đây chủ động bấm để tránh nhầm typo).
    final hienTaoMoi =
        _dangNhap && _c.text.trim().isNotEmpty && _moTaoMoi;

    final canhBaoQuyen = (!_dangNhap || s.laAdminTaiKhoan)
        ? null
        : (_tenNhap.trim().isEmpty || _khachHopLe
            ? null
            : (_khachTonTaiNgoaiQuyen
                ? 'Khách hàng này không do bạn quản lý — không thể chọn. Bạn có thể tạo khách hàng mới với mã riêng.'
                : 'Vui lòng chọn khách hàng từ danh sách hoặc tạo mới.'));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _c,
          focusNode: _focus,
          decoration: InputDecoration(
            hintText: _dangNhap ? 'Gõ để tìm khách hàng…' : 'Tên khách hàng…',
            isDense: true,
            suffixIcon: (_dangNhap && _c.text.trim().isNotEmpty)
                ? IconButton(
                    icon: Icon(
                        _moTaoMoi ? Icons.close : Icons.person_add_alt_1,
                        size: 18),
                    tooltip: _moTaoMoi ? 'Đóng' : 'Tạo khách mới',
                    onPressed: _toggleTaoMoi,
                  )
                : null,
          ),
          onChanged: (v) {
            u('customer', v);
            s.vuaTaoKhachMoi = false;
            setState(() => _moGoiY = true);
          },
        ),
        if (s.dangTaiKhachHang && _dangNhap)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 2),
            child: Text('Đang tải danh sách khách hàng…',
                style: TextStyle(
                    fontSize: 11.5, color: scheme.onSurfaceVariant)),
          )
        else if (_dangNhap && s.loiKhachHang != null)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.cloud_off_outlined,
                    size: 14, color: scheme.onSurfaceVariant),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                      'Không tải được danh sách khách hàng — vẫn có thể nhập tay hoặc tạo khách mới.',
                      style: TextStyle(
                          fontSize: 11,
                          color: scheme.onSurfaceVariant,
                          height: 1.3)),
                ),
              ],
            ),
          ),
        if (canhBaoQuyen != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.warning_amber_rounded,
                    size: 14, color: scheme.error),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(canhBaoQuyen,
                      style: TextStyle(
                          fontSize: 11.5,
                          color: scheme.error,
                          height: 1.3)),
                ),
              ],
            ),
          ),
        if (goiY.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 6),
            decoration: BoxDecoration(
              border: Border.all(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(10),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (final kh in goiY)
                  InkWell(
                    onTap: () => _chon(kh),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: scheme.surfaceContainerHighest
                            .withValues(alpha: 0.15),
                        border: Border(
                          bottom: BorderSide(
                              color: scheme.outlineVariant
                                  .withValues(alpha: 0.5)),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(kh.moiNhat?.organizationName ?? kh.codeName,
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: 1),
                          Text(
                            '${kh.codeName} · '
                            '${kh.moiNhat?.contactName.isNotEmpty == true ? '${kh.moiNhat!.contactName} · ' : ''}'
                            '${kh.moiNhat?.phoneNumber ?? '—'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 11,
                                color: scheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        if (hienTaoMoi)
          Container(
            margin: const EdgeInsets.only(top: 6),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              border: Border.all(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(TextSpan(children: [
                  TextSpan(
                      text: 'Khách mới: ',
                      style: TextStyle(
                          fontSize: 12, color: scheme.onSurfaceVariant)),
                  TextSpan(
                      text: _c.text.trim(),
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700)),
                ])),
                const SizedBox(height: 8),
                TextField(
                  style: const TextStyle(fontSize: 13),
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    hintText: 'Mã KH (vd: KH001)',
                    isDense: true,
                  ),
                  onChanged: (v) =>
                      setState(() => _maKhachHang = v.toUpperCase()),
                ),
                if (_canhBaoMa.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(_canhBaoMa,
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.orange.shade800,
                            height: 1.3)),
                  ),
                if (_loiTaoMoi.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(_loiTaoMoi,
                        style: TextStyle(
                            fontSize: 11,
                            color: scheme.error,
                            height: 1.3)),
                  ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed:
                        (_dangTao || _maKhachHang.trim().isEmpty) ? null : _taoMoi,
                    child: Text(_dangTao ? 'Đang tạo...' : 'Tạo mới'),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
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
    // Lớp 2 kép — mirror web XemTruocCauTruc (TheNhapLieu.tsx:503-557):
    // hiển thị "Chính + Phụ", tổng mic dùng max(chính, phụ).
    final altId = input['layer2AltId'] as String?;
    final altMat = altId == null
        ? null
        : materials
            .cast<MaterialDef?>()
            .firstWhere((m) => m!.id == altId, orElse: () => null);
    final altOverride = (micOverrides['layer2AltId'] as num?)?.toInt();

    int micOf(int idx) {
      final key = layerKeys[idx];
      final override = (micOverrides[key] as num?)?.toInt();
      final micChinh = override ?? layers[idx].thickness.toInt();
      if (key == 'layer2Id' && altMat != null) {
        final micPhu = altOverride ?? altMat.thickness.toInt();
        return micChinh > micPhu ? micChinh : micPhu;
      }
      return micChinh;
    }

    int sumMic = 0;
    for (int idx = 0; idx < layerIds.length; idx++) {
      sumMic += micOf(idx);
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
            final laLop2Kep = micKey == 'layer2Id' && altMat != null;
            final mic = micOf(idx);
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
                        laLop2Kep
                            ? '${mat.name.split(' ').first} + ${altMat.name.split(' ').first}'
                            : mat.name.split(' ').first,
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

// ─── Lớp 2 kép — 2 vật liệu cùng lớp (mirror web TheNhapLieu.tsx:1084-1186) ──
class _Layer2KepSection extends StatelessWidget {
  final AppState state;
  final void Function(String layerKey, String? value) onLayerChange;
  const _Layer2KepSection({required this.state, required this.onLayerChange});

  Map<String, dynamic> get i => state.currentInput.raw;
  void u(String key, dynamic value) => state.updateInput(key, value);

  static MaterialDef? _tim(List<MaterialDef> mats, String? id) {
    if (id == null || id.isEmpty) return null;
    for (final m in mats) {
      if (m.id == id) return m;
    }
    return null;
  }

  Map<String, dynamic> get _lengths =>
      ((i['layer2Lengths'] as Map?) ?? const {}).cast<String, dynamic>();

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    final scheme = Theme.of(context).colorScheme;
    final kieuGhep = (i['layer2PairingMode'] as String?) ?? 'bottom_to_bottom';
    final ngoaiLaChinh = kieuGhep == 'bottom_to_bottom';
    final vatLieuNgoai = _tim(state.materials,
        ngoaiLaChinh ? i['layer2Id'] as String? : i['layer2AltId'] as String?);
    final vatLieuGiua = _tim(state.materials,
        ngoaiLaChinh ? i['layer2AltId'] as String? : i['layer2Id'] as String?);
    final lengths = _lengths;
    final khoNgoai = ((ngoaiLaChinh ? lengths['mat1'] : lengths['mat2'])
                as num?)
            ?.toDouble() ??
        0;
    final khoGiua = ((ngoaiLaChinh ? lengths['mat2'] : lengths['mat1'])
                as num?)
            ?.toDouble() ??
        0;
    final sw = (i['spreadWidth'] as num?)?.toDouble() ?? 0;

    void patchLength(String key, double v) {
      final cur = Map<String, dynamic>.from(_lengths);
      cur[key] = v;
      u('layer2Lengths', cur);
    }

    // Lọc VL cùng độ dày với phía còn lại (mirror web 1117-1118)
    List<MaterialDef> luaChonNgoai() {
      if (vatLieuGiua == null) return state.materials;
      return state.materials
          .where((m) =>
              (m.thickness == vatLieuGiua.thickness && m.id != vatLieuGiua.id) ||
              m.id == vatLieuNgoai?.id)
          .toList();
    }

    List<MaterialDef> luaChonGiua() {
      if (vatLieuNgoai == null) return state.materials;
      return state.materials
          .where((m) =>
              (m.thickness == vatLieuNgoai.thickness && m.id != vatLieuNgoai.id) ||
              m.id == vatLieuGiua?.id)
          .toList();
    }

    // Preview bố trí — port web layPhanBoLop2 (TheNhapLieu.tsx:371-416)
    List<(MaterialDef, double)> phanBo() {
      final chinh = _tim(state.materials, i['layer2Id'] as String?);
      final phu = _tim(state.materials, i['layer2AltId'] as String?);
      if (chinh == null || phu == null) return const [];
      final khoChinh = ((lengths['mat1'] as num?)?.toDouble() ?? 0);
      final khoPhu = ((lengths['mat2'] as num?)?.toDouble() ?? 0);
      final laHaiHinh = ((i['numImages'] as num?)?.toInt() ?? 1) >= 2;
      final meP = laHaiHinh ? 0.01 : 0.0;
      final raw = !laHaiHinh
          ? (kieuGhep == 'front_to_front'
              ? [(phu, khoPhu), (chinh, khoChinh)]
              : [(chinh, khoChinh), (phu, khoPhu)])
          : (kieuGhep == 'front_to_front'
              ? [
                  (phu, khoPhu + meP),
                  (chinh, khoChinh),
                  (chinh, khoChinh),
                  (phu, khoPhu + meP)
                ]
              : [
                  (chinh, khoChinh + meP),
                  (phu, khoPhu),
                  (phu, khoPhu),
                  (chinh, khoChinh + meP)
                ]);
      final out = <(MaterialDef, double)>[];
      for (final seg in raw) {
        if (out.isNotEmpty && out.last.$1.id == seg.$1.id) {
          final last = out.removeLast();
          out.add((last.$1, last.$2 + seg.$2));
        } else {
          out.add(seg);
        }
      }
      return out;
    }

    final tong = khoNgoai + khoGiua;
    final segments = phanBo();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text('Lớp 2 · cấu trúc kép',
              style: Theme.of(context)
                  .textTheme
                  .labelLarge
                  ?.copyWith(fontSize: 12.5)),
        ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _cellVatLieu(
                context,
                label: 'Vật liệu ngoài',
                selected: vatLieuNgoai,
                options: luaChonNgoai(),
                kho: khoNgoai,
                onChanged: (v) {
                  if (ngoaiLaChinh) {
                    onLayerChange('layer2Id', v);
                  } else {
                    u('layer2AltId', v);
                  }
                },
                onKho: (v) =>
                    patchLength(ngoaiLaChinh ? 'mat1' : 'mat2', v),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _cellVatLieu(
                context,
                label: 'Vật liệu giữa',
                selected: vatLieuGiua,
                options: luaChonGiua(),
                kho: khoGiua,
                onChanged: (v) {
                  if (ngoaiLaChinh) {
                    u('layer2AltId', v);
                  } else {
                    onLayerChange('layer2Id', v);
                  }
                },
                onKho: (v) =>
                    patchLength(ngoaiLaChinh ? 'mat2' : 'mat1', v),
              ),
            ),
          ],
        ),
        // Cảnh báo tổng chiều dài ≠ khổ trải (mirror web 1138-1147)
        if (sw > 0 && tong > 0 && tong < sw - 0.001)
          _canhBaoKho(context,
              'Tổng chiều dài lớp 2 (${tong.toStringAsFixed(3)}m) nhỏ hơn khổ trải (${sw.toStringAsFixed(3)}m). Vật liệu không phủ hết khổ.'),
        if (sw > 0 && tong > sw)
          _canhBaoKho(context,
              'Tổng chiều dài lớp 2 (${tong.toStringAsFixed(3)}m) vượt quá khổ trải (${sw.toStringAsFixed(3)}m). Vui lòng giảm chiều dài hoặc tăng khổ trải.'),
        // Preview bố trí + nút đảo kiểu ghép (mirror web 1152-1181)
        if (segments.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text('Preview bố trí lớp 2',
              style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  color: p.muted)),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 46,
                  decoration: BoxDecoration(
                    border: Border.all(color: scheme.outlineVariant),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Row(
                    children: [
                      for (final seg in segments)
                        Expanded(
                          // flex theo mm — luôn ≥ 1 (web dùng flex-grow thập phân,
                          // Flutter Expanded yêu cầu int > 0).
                          flex: ((seg.$2 * 1000).round().clamp(1, 100000)),
                          child: Container(
                            color: seg.$1.id == (i['layer2Id'] as String?)
                                ? scheme.primary.withValues(alpha: 0.10)
                                : Colors.orange.withValues(alpha: 0.12),
                            alignment: Alignment.center,
                            child: Text(
                              seg.$1.name.split(' ').first,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.outlined(
                tooltip: 'Đảo vật tư nằm giữa',
                icon: const Icon(Icons.swap_horiz, size: 18),
                onPressed: () => u('layer2PairingMode',
                    kieuGhep == 'bottom_to_bottom'
                        ? 'front_to_front'
                        : 'bottom_to_bottom'),
              ),
            ],
          ),
        ],
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () {
            u('layer2AltId', null);
            u('layer2Lengths', null);
            u('layer2FrontPart', 'main');
            u('layer2PairingMode', 'bottom_to_bottom');
          },
          child: const Text('Bỏ cấu trúc phụ'),
        ),
        const SizedBox(height: 10),
      ],
    );
  }

  Widget _cellVatLieu(
    BuildContext context, {
    required String label,
    required MaterialDef? selected,
    required List<MaterialDef> options,
    required double kho,
    required ValueChanged<String?> onChanged,
    required ValueChanged<double> onKho,
  }) {
    final p = LtsT.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: p.muted)),
        const SizedBox(height: 4),
        DropdownField<String>(
          options: [
            (null, '-- Chọn vật liệu --'),
            for (final m in options)
              (
                m.id,
                '${m.name} · '
                '${m.thickness == m.thickness.roundToDouble() ? m.thickness.toInt() : m.thickness}μ'
              ),
          ],
          selected: selected?.id,
          onChanged: onChanged,
        ),
        const SizedBox(height: 6),
        NumField(initial: kho, suffix: 'm', onChanged: onKho),
      ],
    );
  }

  Widget _canhBaoKho(BuildContext context, String text) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: scheme.error.withValues(alpha: 0.08),
          border: Border.all(color: scheme.error.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          children: [
            Icon(Icons.warning_amber_rounded,
                size: 15, color: scheme.error),
            const SizedBox(width: 8),
            Expanded(
              child: Text(text,
                  style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: scheme.error)),
            ),
          ],
        ),
      ),
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
  bool get _laMangIn =>
      _isMang && ((i['filmType'] as String?) ?? '') == 'mangIn';
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
          // Mirror web (TheNhapLieu.tsx:1258-1276): mặc định khóa 100%;
          // giá trị ≠100% (dữ liệu cũ) chỉ hiển thị, không cho sửa nữa.
          Builder(builder: (ctx) {
            final cov = (i['coverageRatio'] as num?)?.toDouble() ?? 1;
            final laMangIn =
                _isMang && ((i['filmType'] as String?) ?? '') == 'mangIn';
            return LabeledField(
              label: 'Tỷ lệ phủ mực',
              suffix: '(%)',
              hint: laMangIn ? 'Màng in mặc định tính 100%.' : null,
              child: cov == 1
                  ? DropdownField<String>(
                      options: const [('100', '100%')],
                      selected: '100',
                      enabled: false,
                      onChanged: (_) {},
                    )
                  : Text(
                      '${(cov * 100).round()}% (bảng cũ — giá tính giữ nguyên theo tỷ lệ này)',
                      style: TextStyle(
                          fontSize: 12.5,
                          color: Theme.of(ctx).colorScheme.onSurfaceVariant),
                    ),
            );
          }),
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
            // Mirror web (TheNhapLieu.tsx:1403-1408): giá thùng tự nhập
            // chỉ hiện khi chọn "Tự nhập".
            if (i['boxOptionKey'] == 'custom') ...[
              const SizedBox(width: 12),
              Expanded(
                child: LabeledField(
                  label: 'Giá thùng tự nhập (đ)',
                  child: NumField(
                    initial: (i['boxPrice'] as num?) ?? 0,
                    integer: true,
                    suffix: 'đ',
                    onChanged: (v) => u('boxPrice', v),
                  ),
                ),
              ),
            ],
          ]),
          // Mirror web (TheNhapLieu.tsx:1409-1411): hiển thị tare weight.
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'Khối lượng thùng: ${_fmt((i['boxWeight'] as num?) ?? 0)} gr/thùng',
              style: TextStyle(
                  fontSize: 11.5,
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ),
        ],
        // Mirror web (TheNhapLieu.tsx:1414-1432): màng in tính vận chuyển theo
        // định mức config — hiển thị kết quả thay vì input đ/km.
        if (_laMangIn)
          InfoBox(
            text: (state.currentResult == null)
                ? 'Chưa đủ dữ liệu để tính'
                : '${_fmt(state.currentResult!.d('shippingTotal'))} đ · '
                    '${state.currentResult!.d('shippingPerUnit').toStringAsFixed(1)} đ/m²',
            color: AppColors.muted,
            icon: Icons.local_shipping_outlined,
          )
        else
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
