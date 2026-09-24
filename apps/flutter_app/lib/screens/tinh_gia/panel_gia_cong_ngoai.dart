// ═══════════════════════════════════════════════════════════════════════════
// panel_gia_cong_ngoai.dart — Chi tiết gia công ngoài (part of tinh_gia_screen).
// Mirror apps/web/src/components/PanelGiaCongNgoai.tsx.
// ═══════════════════════════════════════════════════════════════════════════
part of '../tinh_gia_screen.dart';

const _cdOptions = <(String, String)>[
  ('print', 'In'),
  ('matte', 'Lật mặt'),
  ('laminate', 'Ghép'),
  ('slit', 'Chia'),
  ('bag', 'Làm túi'),
  ('handle', 'Gắn quai'),
  ('pp_bag', 'Làm bao PP'),
];

const _stepLabel = <String, String>{
  'print': 'In',
  'matte': 'Lật mặt',
  'laminate': 'Ghép',
  'slit': 'Chia',
  'bag': 'Làm túi',
  'handle': 'Gắn quai',
  'pp_bag': 'Làm bao PP',
};

class PanelGiaCongNgoai extends StatelessWidget {
  final AppState state;
  const PanelGiaCongNgoai({super.key, required this.state});

  Map<String, dynamic> get i => state.currentInput.raw;

  Map<String, dynamic> get _out {
    final o = i['outsource'];
    if (o is Map) return Map<String, dynamic>.from(o);
    return <String, dynamic>{'steps': <String>[]};
  }

  void _patchOut(Map<String, dynamic> patch) {
    state.updateInput('outsource', {..._out, ...patch});
  }

  void _toggleStep(String key) {
    final steps = ((_out['steps'] as List?) ?? const [])
        .map((e) => e.toString())
        .toList();
    if (steps.contains(key)) {
      steps.remove(key);
    } else {
      steps.add(key);
    }
    _patchOut({'steps': steps});
  }

  @override
  Widget build(BuildContext context) {
    final out = _out;
    final steps = ((out['steps'] as List?) ?? const [])
        .map((e) => e.toString())
        .toList();

    return SectionCard(
      title: 'Chi tiết gia công ngoài',
      icon: Icons.build_outlined,
      iconColor: AppColors.danger,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final cd in _cdOptions)
              _CdChip(
                label: cd.$2,
                selected: steps.contains(cd.$1),
                onTap: () => _toggleStep(cd.$1),
              ),
          ],
        ),
        if (steps.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text('Chọn ít nhất 1 công đoạn',
                style: TextStyle(
                    fontSize: 11.5, color: AppColors.danger)),
          ),
        const SizedBox(height: 12),

        if (steps.contains('print')) _cdPrint(context, out),
        if (steps.contains('matte')) _cdMatte(context, out),
        if (steps.contains('laminate')) _cdLaminate(context, out),
        if (steps.contains('slit')) _cdSlit(context, out),
        if (steps.contains('bag')) _cdBag(context, out),
        if (steps.contains('handle')) _cdHandle(context, out),
        if (steps.contains('pp_bag')) _cdPpBag(context, out),
      ],
    );
  }

  // ── In ─────────────────────────────────────────────────────────────────────
  Widget _cdPrint(BuildContext context, Map<String, dynamic> out) {
    final cfg = _mapOr(out['print'], {'filmSource': 'lts'});
    return _CdSection(
      label: _stepLabel['print']!,
      filmSource: cfg['filmSource']?.toString() ?? 'lts',
      onFilmSource: (v) => _patchOut({
        'print': {...cfg, 'filmSource': v}
      }),
      children: [
        ..._fieldsTheoNguon(cfg, (next) => _patchOut({'print': next})),
        _phuPhiCd(cfg, (fees) => _patchOut({'print': {...cfg, ...fees}})),
      ],
    );
  }

  // ── Lật mặt ────────────────────────────────────────────────────────────────
  Widget _cdMatte(BuildContext context, Map<String, dynamic> out) {
    final cfg = _mapOr(out['matte'], {'filmSource': 'lts'});
    return _CdSection(
      label: '${_stepLabel['matte']!} (chỉ áp dụng khi tick "Phủ mờ")',
      children: [
        _row3([
          _num('Phi hao (%)', cfg['wastePct'], (v) => _patchOut({
                'matte': {...cfg, 'wastePct': v}
              })),
          _num('PH setup', cfg['wasteSetupM'], (v) => _patchOut({
                'matte': {...cfg, 'wasteSetupM': v}
              }), suffix: 'm'),
          _num('Giá GC lật mặt', cfg['gcPricePerM2'], (v) => _patchOut({
                'matte': {...cfg, 'gcPricePerM2': v}
              }), suffix: 'đ/m²'),
        ]),
        _phuPhiCd(cfg, (fees) => _patchOut({'matte': {...cfg, ...fees}})),
      ],
    );
  }

  // ── Ghép ───────────────────────────────────────────────────────────────────
  Widget _cdLaminate(BuildContext context, Map<String, dynamic> out) {
    final lam = _mapOr(out['laminate'], {});
    final layers = _mapOr(lam['layers'], {});
    final layerKeys = <(String, String, String)>[
      ('layer2', (i['layer2Id'] ?? '').toString(), 'Lớp 2'),
      ('layer3', (i['layer3Id'] ?? '').toString(), 'Lớp 3'),
      ('layer4', (i['layer4Id'] ?? '').toString(), 'Lớp 4'),
      ('layer5', (i['layer5Id'] ?? '').toString(), 'Lớp 5'),
    ].where((e) => e.$2.isNotEmpty).toList();

    return _CdSection(
      label: _stepLabel['laminate']!,
      children: [
        if (layerKeys.isEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('Chọn lớp 2+ ở cấu trúc để cấu hình ghép GC.',
                style: TextStyle(fontSize: 11.5, color: AppColors.muted)),
          ),
        for (final lk in layerKeys) ...[
          Builder(builder: (_) {
            final cfg = _mapOr(layers[lk.$1], {'filmSource': 'lts'});
            void patchLayer(Map<String, dynamic> next) => _patchOut({
                  'laminate': {
                    ...lam,
                    'layers': {...layers, lk.$1: next},
                  }
                });
            return Padding(
              padding: const EdgeInsets.only(left: 10, bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _NguonHeader(
                    label: lk.$3,
                    value: cfg['filmSource']?.toString() ?? 'lts',
                    onChanged: (v) => patchLayer({...cfg, 'filmSource': v}),
                  ),
                  ..._fieldsTheoNguon(cfg, patchLayer),
                ],
              ),
            );
          }),
        ],
        _phuPhiCd(lam, (fees) => _patchOut({
              'laminate': {...lam, 'layers': layers, ...fees}
            })),
      ],
    );
  }

  // ── Chia ───────────────────────────────────────────────────────────────────
  Widget _cdSlit(BuildContext context, Map<String, dynamic> out) {
    final cfg = _mapOr(out['slit'], {});
    return _CdSection(
      label: _stepLabel['slit']!,
      children: [
        _row3([
          _num('Phi hao (%)', cfg['wastePct'], (v) => _patchOut({
                'slit': {...cfg, 'wastePct': v}
              })),
          _num('PH setup', cfg['wasteSetupM'], (v) => _patchOut({
                'slit': {...cfg, 'wasteSetupM': v}
              }), suffix: 'm'),
          _num('Giá GC', cfg['gcPricePerM2'], (v) => _patchOut({
                'slit': {...cfg, 'gcPricePerM2': v}
              }), suffix: 'đ/m²'),
        ]),
        _phuPhiCd(cfg, (fees) => _patchOut({'slit': {...cfg, ...fees}})),
      ],
    );
  }

  // ── Làm túi ────────────────────────────────────────────────────────────────
  Widget _cdBag(BuildContext context, Map<String, dynamic> out) {
    final cfg = _mapOr(out['bag'], {});
    return _CdSection(
      label: _stepLabel['bag']!,
      children: [
        _row3([
          _num('Phi hao (%)', cfg['wastePct'], (v) => _patchOut({
                'bag': {...cfg, 'wastePct': v}
              })),
          _num('PH setup', cfg['wasteSetupM'], (v) => _patchOut({
                'bag': {...cfg, 'wasteSetupM': v}
              }), suffix: 'm'),
          _num('Giá GC', cfg['gcPricePerBag'], (v) => _patchOut({
                'bag': {...cfg, 'gcPricePerBag': v}
              }), suffix: 'đ/túi'),
        ]),
        if (i['hasZipper'] == true) ...[
          _dropdown(
            label: 'Zipper',
            value: cfg['zipperMode']?.toString() ?? 'excluded',
            options: const [
              ('included', 'GC đã gồm phí zipper'),
              ('excluded', 'GC chưa gồm — nhập giá zipper'),
            ],
            onChanged: (v) => _patchOut({
              'bag': {...cfg, 'zipperMode': v}
            }),
          ),
          if (cfg['zipperMode'] != 'included')
            _num('Giá zipper', cfg['zipperPricePerM'],
                (v) => _patchOut({
                      'bag': {
                        ...cfg,
                        'zipperMode': 'excluded',
                        'zipperPricePerM': v
                      }
                    }),
                suffix: 'VNĐ/m'),
        ],
        if (i['hasTape'] == true) ...[
          _dropdown(
            label: 'Băng keo',
            value: cfg['tapeMode']?.toString() ?? 'excluded',
            options: const [
              ('included', 'GC đã gồm phí băng keo'),
              ('excluded', 'GC chưa gồm — nhập giá băng keo'),
            ],
            onChanged: (v) => _patchOut({
              'bag': {...cfg, 'tapeMode': v}
            }),
          ),
          if (cfg['tapeMode'] != 'included')
            _num('Giá băng keo', cfg['tapePricePerM'],
                (v) => _patchOut({
                      'bag': {
                        ...cfg,
                        'tapeMode': 'excluded',
                        'tapePricePerM': v
                      }
                    }),
                suffix: 'VNĐ/m'),
        ],
        _phuPhiCd(cfg, (fees) => _patchOut({'bag': {...cfg, ...fees}})),
      ],
    );
  }

  // ── Gắn quai ───────────────────────────────────────────────────────────────
  Widget _cdHandle(BuildContext context, Map<String, dynamic> out) {
    final cfg = _mapOr(out['handle'], {});
    return _CdSection(
      label: _stepLabel['handle']!,
      children: [
        _row3([
          _num('Phi hao (%)', cfg['wastePct'], (v) => _patchOut({
                'handle': {...cfg, 'wastePct': v}
              })),
          _num('Giá GC / túi', cfg['gcPricePerBag'], (v) => _patchOut({
                'handle': {...cfg, 'gcPricePerBag': v}
              })),
          _num('Giá quai / túi', cfg['handleUnitPrice'], (v) => _patchOut({
                'handle': {...cfg, 'handleUnitPrice': v}
              })),
        ]),
        _phuPhiCd(cfg, (fees) => _patchOut({'handle': {...cfg, ...fees}})),
      ],
    );
  }

  // ── Bao PP ─────────────────────────────────────────────────────────────────
  Widget _cdPpBag(BuildContext context, Map<String, dynamic> out) {
    final cfg = _mapOr(out['pp_bag'], {'variant': 'pp'});
    return _CdSection(
      label: _stepLabel['pp_bag']!,
      children: [
        _dropdown(
          label: 'Biến thể',
          value: cfg['variant']?.toString() ?? 'pp',
          options: const [
            ('pp', 'Bao PP'),
            ('pp_pe', 'Bao PP lót PE'),
          ],
          onChanged: (v) => _patchOut({
            'pp_bag': {...cfg, 'variant': v}
          }),
        ),
        _row3([
          _num('Phi hao (%)', cfg['wastePct'], (v) => _patchOut({
                'pp_bag': {...cfg, 'wastePct': v}
              })),
          _num('PH setup', cfg['wasteSetupM'], (v) => _patchOut({
                'pp_bag': {...cfg, 'wasteSetupM': v}
              }), suffix: 'm'),
          _num('Giá GC / cái', cfg['gcPricePerUnit'], (v) => _patchOut({
                'pp_bag': {...cfg, 'gcPricePerUnit': v}
              })),
        ]),
        _num('Vật tư PP / cái', cfg['ppMaterialPricePerUnit'],
            (v) => _patchOut({
                  'pp_bag': {...cfg, 'ppMaterialPricePerUnit': v}
                })),
        _phuPhiCd(cfg, (fees) => _patchOut({'pp_bag': {...cfg, ...fees}})),
      ],
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  List<Widget> _fieldsTheoNguon(
      Map<String, dynamic> cfg, void Function(Map<String, dynamic>) onPatch) {
    if (cfg['filmSource'] == 'vendor') {
      return [
        _num('Giá mua màng', cfg['filmBuyPricePerM2'],
            (v) => onPatch({...cfg, 'filmBuyPricePerM2': v}),
            suffix: 'đ/m²'),
      ];
    }
    return [
      _row3([
        _num('Phi hao (%)', cfg['wastePct'],
            (v) => onPatch({...cfg, 'wastePct': v})),
        _num('PH setup', cfg['wasteSetupM'],
            (v) => onPatch({...cfg, 'wasteSetupM': v}), suffix: 'm'),
        _num('Giá GC', cfg['gcPricePerM2'],
            (v) => onPatch({...cfg, 'gcPricePerM2': v}), suffix: 'đ/m²'),
      ]),
    ];
  }

  Widget _phuPhiCd(
      Map<String, dynamic> cfg, void Function(Map<String, dynamic>) onFees) {
    return _row3([
      _num('Vận chuyển', cfg['shippingVnd'],
          (v) => onFees({'shippingVnd': v}), suffix: 'đ'),
      _num('Đóng gói', cfg['packagingVnd'],
          (v) => onFees({'packagingVnd': v}), suffix: 'đ'),
      _num('Phụ phí khác', cfg['otherVnd'],
          (v) => onFees({'otherVnd': v}), suffix: 'đ'),
    ]);
  }

  Widget _row3(List<Widget> children) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var k = 0; k < children.length; k++) ...[
              if (k > 0) const SizedBox(width: 8),
              Expanded(child: children[k]),
            ],
          ],
        ),
      );

  Widget _num(String label, dynamic value, ValueChanged<double> onChanged,
      {String? suffix}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: LabeledField(
        label: label,
        suffix: suffix == null ? null : '($suffix)',
        child: NumField(
          initial: ((value as num?) ?? 0).toDouble(),
          suffix: suffix,
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _dropdown({
    required String label,
    required String value,
    required List<(String, String)> options,
    required ValueChanged<String> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: LabeledField(
        label: label,
        child: DropdownField<String>(
          options: [for (final o in options) (o.$1, o.$2)],
          selected: value,
          onChanged: (v) => onChanged(v ?? options.first.$1),
        ),
      ),
    );
  }

  Map<String, dynamic> _mapOr(dynamic v, Map<String, dynamic> fallback) =>
      v is Map ? Map<String, dynamic>.from(v) : Map<String, dynamic>.from(fallback);
}

// ─── Chip công đoạn ───────────────────────────────────────────────────────────
class _CdChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _CdChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.danger.withValues(alpha: 0.06)
              : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
              color: selected
                  ? AppColors.danger.withValues(alpha: 0.45)
                  : Theme.of(context).colorScheme.outlineVariant),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              selected ? Icons.check_box : Icons.check_box_outline_blank,
              size: 16,
              color: selected
                  ? AppColors.danger
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 6),
            Text(label,
                style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

// ─── Section công đoạn ────────────────────────────────────────────────────────
class _CdSection extends StatelessWidget {
  final String label;
  final String? filmSource;
  final ValueChanged<String>? onFilmSource;
  final List<Widget> children;
  const _CdSection({
    required this.label,
    this.filmSource,
    this.onFilmSource,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (onFilmSource != null && filmSource != null)
            _NguonHeader(
                label: label, value: filmSource!, onChanged: onFilmSource!)
          else
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(label,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ...children,
        ],
      ),
    );
  }
}

// ─── Header công đoạn + chọn nguồn màng ───────────────────────────────────────
class _NguonHeader extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  const _NguonHeader(
      {required this.label, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 13)),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 170,
            child: DropdownField<String>(
              options: const [
                ('lts', 'Màng của LTS'),
                ('vendor', 'Màng bên gia công'),
              ],
              selected: value,
              onChanged: (v) => onChanged(v ?? 'lts'),
            ),
          ),
        ],
      ),
    );
  }
}
