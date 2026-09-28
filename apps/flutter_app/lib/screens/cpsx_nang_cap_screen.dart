// ═══════════════════════════════════════════════════════════════════════════
// CpsxNangCapScreen — trình sửa "CPSX nâng cao" (mirror web CpsxNangCapTrang +
// 4 editor Điện / Lương / Mực-DM-Keo / Thời gian).
// Công thức + normalize do engine bundle tính; Dart chỉ dựng UI + gọi.
// Ghi 4 key cpsxUpgrade* vào constants; lưu phiên bản qua nút ở PhienBan screen.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:lts_pricing/lib/engine_advanced.dart';

import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import '../widgets/khoi_phien_ban.dart';
import '../widgets/lts/lts_surfaces.dart';
import '../widgets/lts/lts_toast.dart';

class CpsxNangCapScreen extends StatefulWidget {
  const CpsxNangCapScreen({super.key});

  @override
  State<CpsxNangCapScreen> createState() => _CpsxNangCapScreenState();
}

class _CpsxNangCapScreenState extends State<CpsxNangCapScreen> {
  late Map<String, dynamic> _dien;
  late Map<String, dynamic> _luong;
  late Map<String, dynamic> _muc;
  late Map<String, dynamic> _thoiGian;
  bool _ready = false;

  AppState get s => context.read<AppState>();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_ready) return;
    final c = s.constants.raw;
    try {
      _dien = EngineAdvanced.instance
          .chuanHoaDien((c['cpsxUpgradeElectric'] as Map?)?.cast<String, dynamic>() ?? {});
      _luong = EngineAdvanced.instance
          .chuanHoaLuong((c['cpsxUpgradeLabor'] as Map?)?.cast<String, dynamic>() ?? {});
      _muc = EngineAdvanced.instance
          .chuanHoaMuc((c['cpsxUpgradeInk'] as Map?)?.cast<String, dynamic>() ?? {});
      _thoiGian = EngineAdvanced.instance.chuanHoaThoiGian(
          (c['cpsxUpgradeThoiGian'] as Map?)?.cast<String, dynamic>() ?? {});
    } catch (_) {
      _dien = {};
      _luong = {};
      _muc = {};
      _thoiGian = {};
    }
    _ready = true;
  }

  void _luu(String key, Map<String, dynamic> value) {
    final c = s.constants;
    s.setConstants(c.withField(key, value));
  }

  bool get _chiDoc {
    final u = s.nguoiDungHienTai;
    if (u == null) return false;
    // Có bất kỳ quyền EDIT CPSX nào → sửa được (mirror web coQuyen*).
    const editCodes = [
      'CPSX_UPGRADE_EDIT_ELECTRIC_TIME_FRAME',
      'CPSX_UPGRADE_EDIT_ELECTRIC_PER_MINUTE',
      'CPSX_UPGRADE_EDIT_LABOR_PRINT',
      'CPSX_UPGRADE_EDIT_LABOR_LAMINATE',
      'CPSX_UPGRADE_EDIT_LABOR_SLIT',
      'CPSX_UPGRADE_EDIT_LABOR_BAG',
      'CPSX_UPGRADE_EDIT_INK_OPP',
      'CPSX_UPGRADE_EDIT_INK_PET',
      'CPSX_UPGRADE_EDIT_INK_PE',
      'CPSX_UPGRADE_EDIT_SOLVENT',
      'CPSX_UPGRADE_EDIT_ADHESIVE',
      'CPSX_UPGRADE_EDIT_INK_RATE',
      'CPSX_UPGRADE_EDIT_ADHESIVE_RATE',
      'CPSX_UPGRADE_EDIT_TIME_PRINT',
      'CPSX_UPGRADE_EDIT_TIME_LAMINATE',
      'CPSX_UPGRADE_EDIT_TIME_SLIT',
      'CPSX_UPGRADE_EDIT_TIME_BAG',
    ];
    if (editCodes.any(u.coQuyen)) return false;
    return true;
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('CPSX nâng cao'),
        actions: [
          IconButton(
            tooltip: 'Lưu lên server',
            icon: const Icon(Icons.cloud_upload_outlined),
            onPressed: _luuLenServer,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
        children: [
          if (_chiDoc)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.muted.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(children: [
                Icon(Icons.visibility_outlined,
                    size: 16, color: LtsT.of(context).muted),
                const SizedBox(width: 8),
                Text('Chỉ xem — thiếu quyền CPSX nâng cao',
                    style: TextStyle(
                        fontSize: 12, color: LtsT.of(context).muted)),
              ]),
            ),
          _DienEditor(
            state: _dien,
            chiDoc: _chiDoc,
            onChanged: (v) => setState(() {
              _dien = v;
              _luu('cpsxUpgradeElectric', v);
            }),
          ),
          const SizedBox(height: 16),
          _LuongEditor(
            state: _luong,
            chiDoc: _chiDoc,
            onChanged: (v) => setState(() {
              _luong = v;
              _luu('cpsxUpgradeLabor', v);
            }),
          ),
          const SizedBox(height: 16),
          _MucEditor(
            state: _muc,
            chiDoc: _chiDoc,
            onChanged: (v) => setState(() {
              _muc = v;
              _luu('cpsxUpgradeInk', v);
            }),
          ),
          const SizedBox(height: 16),
          _ThoiGianEditor(
            state: _thoiGian,
            chiDoc: _chiDoc,
            onChanged: (v) => setState(() {
              _thoiGian = v;
              _luu('cpsxUpgradeThoiGian', v);
            }),
          ),
          const KhoiPhienBan(
            configName: 'PRODUCTION_UPGRADE',
            nhanScope: 'Sản xuất nâng cao (CPSX)',
          ),
        ],
      ),
    );
  }

  Future<void> _luuLenServer() async {
    try {
      await s.luuPhienBanCauHinh(
        configName: 'PRODUCTION_UPGRADE',
        name: 'CPSX nâng cao ${DateTime.now().toIso8601String().substring(0, 10)}',
        effectiveFrom: DateTime.now().toIso8601String().substring(0, 7),
      );
      if (!mounted) return;
      LtsToast.show(context, 'Đã lưu phiên bản CPSX nâng cao lên server.',
          type: LtsToastType.success);
    } catch (e) {
      if (!mounted) return;
      LtsToast.show(context, '$e', type: LtsToastType.error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ĐIỆN
// ═══════════════════════════════════════════════════════════════════════════
class _DienEditor extends StatelessWidget {
  final Map<String, dynamic> state;
  final bool chiDoc;
  final ValueChanged<Map<String, dynamic>> onChanged;
  const _DienEditor(
      {required this.state, required this.chiDoc, required this.onChanged});

  List<dynamic> get _slots => (state['slots'] as List?) ?? const [];
  Map<String, dynamic> get _machines =>
      (state['machines'] as Map?)?.cast<String, dynamic>() ?? {};

  static const _mayRows = [
    ('print', 'Máy in'),
    ('laminate', 'Máy ghép'),
    ('slit', 'Máy chia'),
    ('bag', 'Máy làm túi'),
  ];

  double get _tbCong {
    try {
      return EngineAdvanced.instance.tinhGiaDienTbCong(_slots);
    } catch (_) {
      return 0;
    }
  }

  double get _tbTrongSo {
    try {
      return EngineAdvanced.instance.tinhGiaDienTbTrongSo(_slots);
    } catch (_) {
      return 0;
    }
  }

  double? get _appliedPrice {
    final v = state['appliedPricePerKwh'];
    return v == null ? null : (v as num).toDouble();
  }

  void _suaSlot(int i, Map<String, dynamic> patch) {
    final next = _slots
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    next[i] = {...next[i], ...patch};
    final updated = EngineAdvanced.instance
        .dongBoGiaDangApSauSuaSlot({...state, 'slots': next});
    onChanged(updated);
  }

  void _themSlot() {
    final next = _slots
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    var maxId = 0;
    for (final sl in next) {
      final m = RegExp(r'^slot_(\d+)$').firstMatch('${sl['id']}');
      if (m != null) {
        final v = int.tryParse(m.group(1)!) ?? 0;
        if (v > maxId) maxId = v;
      }
    }
    next.add({
      'id': 'slot_${maxId + 1}',
      'label': 'Khung ${next.length + 1}',
      'start': '07:00',
      'end': '17:00',
      'hours': 10,
      'pricePerKwh': 4000,
    });
    onChanged(EngineAdvanced.instance
        .dongBoGiaDangApSauSuaSlot({...state, 'slots': next}));
  }

  void _xoaSlot(int i) {
    if (_slots.length <= 1) return;
    final next = _slots
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList()
      ..removeAt(i);
    onChanged(EngineAdvanced.instance
        .dongBoGiaDangApSauSuaSlot({...state, 'slots': next}));
  }

  void _apDung(String source, double price) {
    if (!price.isFinite || price < 0) return;
    onChanged({
      ...state,
      'appliedSource': source,
      'appliedPricePerKwh': price,
    });
  }

  void _suaMay(String key, Map<String, dynamic> patch) {
    final machines = _machines.map((k, v) => MapEntry(
        k, v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{}));
    final cur = machines[key] ?? {'powerKw': 0, 'efficiency': 0};
    machines[key] = {
      'powerKw': (patch['powerKw'] as num?) != null &&
              (patch['powerKw'] as num) > 0
          ? patch['powerKw']
          : cur['powerKw'],
      'efficiency': (patch['efficiency'] as num?) != null &&
              (patch['efficiency'] as num) > 0
          ? patch['efficiency']
          : cur['efficiency'],
    };
    onChanged({...state, 'machines': machines});
  }

  @override
  Widget build(BuildContext context) {
    final applied = _appliedPrice;
    final source = (state['appliedSource'] as String?) ?? 'average';

    return _Section(
      title: '1. Điện',
      children: [
        Text('Giá điện theo khung giờ',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        const _TableHead(['Khung giờ', 'Giờ', 'đ/kWh', '']),
        for (int i = 0; i < _slots.length; i++)
          _slotRow(context, i),
        const SizedBox(height: 8),
        if (!chiDoc)
          OutlinedButton.icon(
            onPressed: _themSlot,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Thêm khung giờ'),
          ),
        const SizedBox(height: 12),
        Text('Chọn giá áp dụng',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        _sourceRadio(
          label: 'Giá điện trung bình cộng',
          value: _tbCong,
          selected: (source == 'average'),
          onTap: chiDoc ? null : () => _apDung('average', _tbCong),
        ),
        _sourceRadio(
          label: 'Giá điện trung bình trọng số',
          value: _tbTrongSo,
          selected: (source == 'weighted'),
          onTap: chiDoc ? null : () => _apDung('weighted', _tbTrongSo),
        ),
        _SourceManual(
          value: applied ?? _tbCong,
          selected: source == 'manual',
          chiDoc: chiDoc,
          onApply: (v) => _apDung('manual', v),
        ),
        const SizedBox(height: 12),
        Text('Điện / phút theo máy',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        const _TableHead(['Máy', 'Công suất (kW)', 'Hiệu suất (%)', 'đ/phút']),
        for (final (key, label) in _mayRows) _mayRow(context, key, label, applied),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.info.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.info.withValues(alpha: 0.25)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Kết quả hiện tại',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 6),
              for (final (key, label) in _mayRows)
                _readonlyRow(context, key, label, applied),
            ],
          ),
        ),
      ],
    );
  }

  Widget _slotRow(BuildContext context, int i) {
    final sl = Map<String, dynamic>.from(_slots[i] as Map);
    final gio = EngineAdvanced.instance.tinhSoGioTuKhungGio(
        sl['start'] as String?, sl['end'] as String?);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Expanded(
          flex: 3,
          child: Row(children: [
            Expanded(
              child: _TxtInline(
                value: (sl['start'] ?? '').toString(),
                enabled: !chiDoc,
                hint: 'HH:MM',
                onChanged: (v) => _suaSlot(i, {
                  'start': EngineAdvanced.instance.dinhDangGioMask(v)
                }),
              ),
            ),
            const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4), child: Text('—')),
            Expanded(
              child: _TxtInline(
                value: (sl['end'] ?? '').toString(),
                enabled: !chiDoc,
                hint: 'HH:MM',
                onChanged: (v) => _suaSlot(i, {
                  'end': EngineAdvanced.instance.dinhDangGioMask(v)
                }),
              ),
            ),
          ]),
        ),
        const SizedBox(width: 6),
        Expanded(
          flex: 2,
          child: gio != null
              ? Text('${Fmt.d(gio)} giờ',
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontSize: 12.5))
              : _NumInline(
                  value: ((sl['hours'] as num?) ?? 0).toDouble(),
                  enabled: !chiDoc,
                  onChanged: (v) => _suaSlot(i, {'hours': v}),
                ),
        ),
        const SizedBox(width: 6),
        Expanded(
          flex: 2,
          child: _NumInline(
            value: ((sl['pricePerKwh'] as num?) ?? 0).toDouble(),
            enabled: !chiDoc,
            onChanged: (v) => _suaSlot(i, {'pricePerKwh': v}),
          ),
        ),
        SizedBox(
          width: 32,
          child: (!chiDoc && _slots.length > 1)
              ? IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: const Icon(Icons.close,
                      size: 18, color: AppColors.danger),
                  onPressed: () => _xoaSlot(i),
                )
              : const SizedBox.shrink(),
        ),
      ]),
    );
  }

  Widget _mayRow(
      BuildContext context, String key, String label, double? applied) {
    final m = (_machines[key] as Map?)?.cast<String, dynamic>() ??
        {'powerKw': 0, 'efficiency': 0};
    final powerKw = ((m['powerKw'] as num?) ?? 0).toDouble();
    final eff = ((m['efficiency'] as num?) ?? 0).toDouble();
    double? perMin;
    try {
      perMin = EngineAdvanced.instance.tinhDienMoiPhut(powerKw, eff, applied);
    } catch (_) {}
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Expanded(flex: 3, child: Text(label, style: const TextStyle(fontSize: 12.5))),
        const SizedBox(width: 6),
        Expanded(
          flex: 3,
          child: _NumInline(
            value: powerKw,
            enabled: !chiDoc,
            onChanged: (v) => _suaMay(key, {'powerKw': v}),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          flex: 3,
          child: _NumInline(
            value: eff * 100,
            enabled: !chiDoc,
            onChanged: (v) => _suaMay(key, {'efficiency': v / 100}),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          flex: 3,
          child: Text(perMin == null ? '—' : Fmt.n(perMin.round()),
              textAlign: TextAlign.right,
              style: const TextStyle(
                  fontSize: 12.5, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }

  Widget _readonlyRow(
      BuildContext context, String key, String label, double? applied) {
    final m = (_machines[key] as Map?)?.cast<String, dynamic>() ??
        {'powerKw': 0, 'efficiency': 0};
    double? perMin;
    try {
      perMin = EngineAdvanced.instance.tinhDienMoiPhut(
          ((m['powerKw'] as num?) ?? 0).toDouble(),
          ((m['efficiency'] as num?) ?? 0).toDouble(),
          applied);
    } catch (_) {}
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('Điện $label', style: const TextStyle(fontSize: 12.5)),
          Text(perMin == null ? '—' : '${Fmt.n(perMin.round())} đ/phút',
              style:
                  const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _sourceRadio({
    required String label,
    required double value,
    required bool selected,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 18, color: selected ? AppColors.accent : Colors.grey),
          const SizedBox(width: 8),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 12.5))),
          Text('${Fmt.n(value.round())} đ/kWh',
              style:
                  const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }
}

class _SourceManual extends StatelessWidget {
  final double value;
  final bool selected;
  final bool chiDoc;
  final ValueChanged<double> onApply;
  const _SourceManual({
    required this.value,
    required this.selected,
    required this.chiDoc,
    required this.onApply,
  });

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off,
          size: 18, color: selected ? AppColors.accent : Colors.grey),
      const SizedBox(width: 8),
      const Expanded(
          child: Text('Giá điện nhập tay', style: TextStyle(fontSize: 12.5))),
      SizedBox(
        width: 100,
        child: _NumInline(
          value: value,
          enabled: !chiDoc,
          onChanged: onApply,
        ),
      ),
      const SizedBox(width: 4),
      const Text('đ/kWh', style: TextStyle(fontSize: 12)),
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LƯƠNG
// ═══════════════════════════════════════════════════════════════════════════
class _LuongEditor extends StatelessWidget {
  final Map<String, dynamic> state;
  final bool chiDoc;
  final ValueChanged<Map<String, dynamic>> onChanged;
  const _LuongEditor(
      {required this.state, required this.chiDoc, required this.onChanged});

  static const _mayRows = [
    ('print', 'Máy in'),
    ('laminate', 'Máy ghép'),
    ('slit', 'Máy chia'),
    ('bag', 'Máy làm túi'),
  ];

  Map<String, dynamic> _cfg(String key) =>
      (state[key] as Map?)?.cast<String, dynamic>() ?? {};

  void _sua(String key, String field, Object? value) {
    final cur = _cfg(key);
    onChanged({
      ...state,
      key: {...cur, field: value},
    });
  }

  void _suaWage(String key, int idx, double v) {
    final cur = _cfg(key);
    final wages = ((cur['wages'] as List?) ?? const [])
        .map((e) => (e as num).toDouble())
        .toList();
    if (idx < wages.length) wages[idx] = v;
    _sua(key, 'wages', wages);
  }

  void _themWage(String key) {
    final cur = _cfg(key);
    final wages = ((cur['wages'] as List?) ?? const [])
        .map((e) => (e as num).toDouble())
        .toList()
      ..add(0);
    _sua(key, 'wages', wages);
  }

  void _xoaWage(String key, int idx) {
    final cur = _cfg(key);
    final wages = ((cur['wages'] as List?) ?? const [])
        .map((e) => (e as num).toDouble())
        .toList()
      ..removeAt(idx);
    _sua(key, 'wages', wages);
  }

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: '2. Tiền lương',
      children: [
        for (final (key, label) in _mayRows) ...[
          _mayCard(context, key, label),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  Widget _mayCard(BuildContext context, String key, String label) {
    final cur = _cfg(key);
    final wages = ((cur['wages'] as List?) ?? const [])
        .map((e) => (e as num).toDouble())
        .toList();
    final isTui = key == 'bag';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: LtsT.of(context).border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('Lương mỗi CN / ca (đ)',
              style: TextStyle(fontSize: 11, color: LtsT.of(context).muted)),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              for (int i = 0; i < wages.length; i++)
                SizedBox(
                  width: 110,
                  child: Row(children: [
                    Expanded(
                      child: _NumInline(
                        value: wages[i],
                        enabled: !chiDoc,
                        onChanged: (v) => _suaWage(key, i, v),
                      ),
                    ),
                    if (!chiDoc && wages.length > 1)
                      GestureDetector(
                        onTap: () => _xoaWage(key, i),
                        child: const Padding(
                          padding: EdgeInsets.only(left: 2),
                          child: Icon(Icons.close,
                              size: 14, color: AppColors.danger),
                        ),
                      ),
                  ]),
                ),
            ],
          ),
          if (!chiDoc)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () => _themWage(key),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Thêm CN'),
              ),
            ),
          const SizedBox(height: 6),
          _numField(context, key, cur, 'mealMorning', 'Cơm sáng/người'),
          _numField(context, key, cur, 'mealEvening', 'Cơm tối/người'),
          _numField(context, key, cur, 'otFactor', 'Hệ số tăng ca'),
          _numField(context, key, cur, 'hoursPerDay', 'Giờ máy/ngày'),
          _numField(context, key, cur, 'otHours', 'Giờ tăng ca'),
          _numField(context, key, cur, 'tyLeTangCa', 'Tỷ lệ CN tăng ca (0-1)'),
          if (!isTui) _numField(context, key, cur, 'machinesPerDay', 'Máy/ngày'),
          if (isTui) ...[
            _numField(context, key, cur, 'peoplePerShift', 'Người/ca'),
            _numField(context, key, cur, 'machinesPerDay', 'Máy/ngày'),
          ],
        ],
      ),
    );
  }

  Widget _numField(BuildContext context, String key, Map<String, dynamic> cur,
      String field, String label) {
    final v = cur[field];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Expanded(
            child: Text(label, style: const TextStyle(fontSize: 12.5))),
        SizedBox(
          width: 110,
          child: _NumInline(
            value: (v as num?)?.toDouble() ?? 0,
            enabled: !chiDoc,
            onChanged: (nv) => _sua(key, field, nv),
          ),
        ),
      ]),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MỰC · DUNG MÔI · KEO
// ═══════════════════════════════════════════════════════════════════════════
class _MucEditor extends StatelessWidget {
  final Map<String, dynamic> state;
  final bool chiDoc;
  final ValueChanged<Map<String, dynamic>> onChanged;
  const _MucEditor(
      {required this.state, required this.chiDoc, required this.onChanged});

  static const _bangMuc = [
    ('opp', 'Mực OPP'),
    ('pet', 'Mực PET'),
    ('pe', 'Mực PE'),
  ];

  Map<String, dynamic> _table(String key) =>
      (state[key] as Map?)?.cast<String, dynamic>() ?? {};

  List<dynamic> _rows(String key) => (_table(key)['rows'] as List?) ?? const [];

  void _suaRow(String key, int i, String field, Object? value) {
    final rows = _rows(key)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    if (i >= rows.length) return;
    rows[i][field] = value;
    onChanged({
      ...state,
      key: {..._table(key), 'rows': rows},
    });
  }

  void _themRow(String key) {
    final rows = _rows(key)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList()
      ..add({'ma': '', 'ten': '', 'dvt': 'kg', 'donGia': 0, 'slDung': 0});
    onChanged({
      ...state,
      key: {..._table(key), 'rows': rows},
    });
  }

  void _xoaRow(String key, int i) {
    final rows = _rows(key)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList()
      ..removeAt(i);
    onChanged({
      ...state,
      key: {..._table(key), 'rows': rows},
    });
  }

  @override
  Widget build(BuildContext context) {
    final solvent =
        (state['solventAdhesive'] as Map?)?.cast<String, dynamic>() ?? {};
    final dmRows = ((solvent['dungMoi'] as Map?)?['rows'] as List?) ?? const [];
    final keo = (solvent['keo'] as Map?)?.cast<String, dynamic>() ?? {};
    final keoRows = (keo['rows'] as List?) ?? const [];
    final dinhMucIn = (state['dinhMucIn'] as List?) ?? const [];
    final dinhMucGhep =
        (state['dinhMucGhep'] as Map?)?.cast<String, dynamic>() ?? {};

    return _Section(
      title: '3. Mực · Dung môi · Keo ghép',
      children: [
        for (final (key, label) in _bangMuc) ...[
          _bangMucWidget(context, key, label),
          const SizedBox(height: 12),
        ],
        Text('Dung môi (đ/kg)',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        const _TableHead(['Mã', 'Tên', 'đ/kg', '']),
        for (int i = 0; i < dmRows.length; i++)
          _solventRow(context, 'dungMoi', dmRows, i),
        const SizedBox(height: 12),
        Text('Keo ghép (đ/kg)', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        const _TableHead(['Mã', 'Tên', 'đ/kg', '']),
        for (int i = 0; i < keoRows.length; i++)
          _solventRow(context, 'keo', keoRows, i),
        const SizedBox(height: 12),
        Text('Định mức mực in (g/m²)',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        const _TableHead(['Số màu', 'ĐM mực', 'ĐM dung môi']),
        for (int i = 0; i < dinhMucIn.length; i++)
          _dinhMucInRow(context, i, dinhMucIn),
        const SizedBox(height: 12),
        Text('Định mức keo ghép (g/m²)',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        Row(children: [
          Expanded(
              child: Text('Keo khô',
                  style: TextStyle(fontSize: 12.5, color: LtsT.of(context).muted))),
          SizedBox(
            width: 110,
            child: _NumInline(
              value: ((dinhMucGhep['keoKhoG'] as num?) ?? 0).toDouble(),
              enabled: !chiDoc,
              onChanged: (v) => onChanged({
                ...state,
                'dinhMucGhep': {...dinhMucGhep, 'keoKhoG': v},
              }),
            ),
          ),
        ]),
        Row(children: [
          Expanded(
              child: Text('Dung môi pha keo',
                  style: TextStyle(fontSize: 12.5, color: LtsT.of(context).muted))),
          SizedBox(
            width: 110,
            child: _NumInline(
              value:
                  ((dinhMucGhep['dungMoiPhaKeoG'] as num?) ?? 0).toDouble(),
              enabled: !chiDoc,
              onChanged: (v) => onChanged({
                ...state,
                'dinhMucGhep': {...dinhMucGhep, 'dungMoiPhaKeoG': v},
              }),
            ),
          ),
        ]),
      ],
    );
  }

  Widget _bangMucWidget(BuildContext context, String key, String label) {
    final rows = _rows(key);
    double? tb;
    try {
      tb = EngineAdvanced.instance.tinhGiaMucTbTrongSo(_table(key));
    } catch (_) {}
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: LtsT.of(context).border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w800)),
            const Spacer(),
            if (tb != null)
              Text('TB trọng số: ${Fmt.n(tb.round())} đ/kg',
                  style: TextStyle(
                      fontSize: 11, color: LtsT.of(context).muted)),
          ]),
          const SizedBox(height: 6),
          const _TableHead(['Mã', 'Tên', 'đ/kg', 'SL dùng', '']),
          for (int i = 0; i < rows.length; i++)
            _mucRow(context, key, rows, i),
          if (!chiDoc)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () => _themRow(key),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Thêm dòng'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _mucRow(
      BuildContext context, String key, List<dynamic> rows, int i) {
    final r = Map<String, dynamic>.from(rows[i] as Map);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Expanded(
          flex: 2,
          child: _TxtInline(
            value: (r['ma'] ?? '').toString(),
            enabled: !chiDoc,
            onChanged: (v) => _suaRow(key, i, 'ma', v),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          flex: 4,
          child: _TxtInline(
            value: (r['ten'] ?? '').toString(),
            enabled: !chiDoc,
            onChanged: (v) => _suaRow(key, i, 'ten', v),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          flex: 2,
          child: _NumInline(
            value: ((r['donGia'] as num?) ?? 0).toDouble(),
            enabled: !chiDoc,
            onChanged: (v) => _suaRow(key, i, 'donGia', v),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          flex: 2,
          child: _NumInline(
            value: ((r['slDung'] as num?) ?? 0).toDouble(),
            enabled: !chiDoc,
            onChanged: (v) => _suaRow(key, i, 'slDung', v),
          ),
        ),
        SizedBox(
          width: 28,
          child: (!chiDoc)
              ? IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon:
                      const Icon(Icons.close, size: 16, color: AppColors.danger),
                  onPressed: () => _xoaRow(key, i),
                )
              : const SizedBox.shrink(),
        ),
      ]),
    );
  }

  void _suaSolvent(String table, int i, String field, Object? value) {
    final solvent =
        (state['solventAdhesive'] as Map?)?.cast<String, dynamic>() ?? {};
    final t = (solvent[table] as Map?)?.cast<String, dynamic>() ?? {};
    final rows =
        ((t['rows'] as List?) ?? const []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    if (i >= rows.length) return;
    rows[i][field] = value;
    onChanged({
      ...state,
      'solventAdhesive': {
        ...solvent,
        table: {...t, 'rows': rows},
      },
    });
  }

  Widget _solventRow(
      BuildContext context, String table, List<dynamic> rows, int i) {
    final r = Map<String, dynamic>.from(rows[i] as Map);
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Expanded(
          flex: 3,
          child: _TxtInline(
            value: (r['ma'] ?? '').toString(),
            enabled: !chiDoc,
            onChanged: (v) => _suaSolvent(table, i, 'ma', v),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          flex: 5,
          child: _TxtInline(
            value: (r['ten'] ?? '').toString(),
            enabled: !chiDoc,
            onChanged: (v) => _suaSolvent(table, i, 'ten', v),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          flex: 3,
          child: _NumInline(
            value: ((r['donGia'] as num?) ?? 0).toDouble(),
            enabled: !chiDoc,
            onChanged: (v) => _suaSolvent(table, i, 'donGia', v),
          ),
        ),
        const SizedBox(width: 28),
      ]),
    );
  }

  Widget _dinhMucInRow(BuildContext context, int i, List<dynamic> rows) {
    final r = Map<String, dynamic>.from(rows[i] as Map);
    void sua(String field, Object? v) {
      final next =
          rows.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      next[i][field] = v;
      onChanged({...state, 'dinhMucIn': next});
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Expanded(
          flex: 2,
          child: Text('${r['soMau']} màu',
              style: const TextStyle(fontSize: 12.5)),
        ),
        Expanded(
          flex: 3,
          child: _NumInline(
            value: ((r['dmMucG'] as num?) ?? 0).toDouble(),
            enabled: !chiDoc,
            onChanged: (v) => sua('dmMucG', v),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 3,
          child: _NumInline(
            value: ((r['dmDungMoiG'] as num?) ?? 0).toDouble(),
            enabled: !chiDoc,
            onChanged: (v) => sua('dmDungMoiG', v),
          ),
        ),
      ]),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. THỜI GIAN SẢN XUẤT
// ═══════════════════════════════════════════════════════════════════════════
class _ThoiGianEditor extends StatelessWidget {
  final Map<String, dynamic> state;
  final bool chiDoc;
  final ValueChanged<Map<String, dynamic>> onChanged;
  const _ThoiGianEditor(
      {required this.state, required this.chiDoc, required this.onChanged});

  Map<String, dynamic> _sub(String key) =>
      (state[key] as Map?)?.cast<String, dynamic>() ?? {};

  void _sua(String key, String field, Object? value) {
    onChanged({
      ...state,
      key: {..._sub(key), field: value},
    });
  }

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: '4. Thời gian sản xuất',
      children: [
        Text('Máy in', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        _num('print', 'mountMinutesPerColor', 'Lắp trục (phút/màu)'),
        _num('print', 'proofMinutes1to7', 'Duyệt mẫu 1-7 màu (phút)'),
        _num('print', 'proofMinutes8', 'Duyệt mẫu 8 màu (phút)'),
        _num('print', 'matteExtraMinutes', 'In phủ mờ thêm (phút)'),
        _num('print', 'avgSpeedMPerMin', 'Tốc độ TB (m/phút)'),
        const SizedBox(height: 12),
        Text('Máy ghép', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        _num('laminate', 'setupFirstMinutes', 'Setup đầu (phút)'),
        _num('laminate', 'setupNextMinutes', 'Setup kế (phút)'),
        _num('laminate', 'avgSpeedMPerMin', 'Tốc độ TB (m/phút)'),
        const SizedBox(height: 12),
        Text('Máy chia — bảng tốc độ',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        _ruleList(context, 'slit', 'rules', ['key', 'speedMPerMin']),
        const SizedBox(height: 12),
        Text('Máy làm túi — setup & tốc độ',
            style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        _ruleList(context, 'bag', 'setupRules', ['key']),
        _ruleList(context, 'bag', 'speedRules', ['key']),
      ],
    );
  }

  Widget _num(String key, String field, String label) {
    final cur = _sub(key);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Expanded(
            child: Text(label, style: const TextStyle(fontSize: 12.5))),
        SizedBox(
          width: 110,
          child: _NumInline(
            value: ((cur[field] as num?) ?? 0).toDouble(),
            enabled: !chiDoc,
            onChanged: (v) => _sua(key, field, v),
          ),
        ),
      ]),
    );
  }

  /// Editor đơn giản cho danh sách rule (chỉ sửa vài trường số/chuỗi chính).
  Widget _ruleList(BuildContext context, String key, String listKey,
      List<String> fields) {
    final cur = _sub(key);
    final rules =
        ((cur[listKey] as List?) ?? const []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    if (rules.isEmpty) {
      return Text('(chưa có rule)',
          style: TextStyle(fontSize: 12, color: LtsT.of(context).muted));
    }
    return Column(
      children: [
        for (int i = 0; i < rules.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(children: [
              for (final f in fields)
                Expanded(
                  flex: 3,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: _TxtInline(
                      value: '${rules[i][f] ?? ''}',
                      enabled: !chiDoc,
                      onChanged: (v) {
                        final next = rules
                            .map((e) => Map<String, dynamic>.from(e))
                            .toList();
                        final numV = double.tryParse(v);
                        next[i][f] = numV ?? v;
                        onChanged({
                          ...state,
                          key: {...cur, listKey: next},
                        });
                      },
                    ),
                  ),
                ),
            ]),
          ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Widget dùng chung
// ═══════════════════════════════════════════════════════════════════════════
class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return LtsCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title,
              style:
                  const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}

class _TableHead extends StatelessWidget {
  final List<String> cells;
  const _TableHead(this.cells);

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: p.border)),
      ),
      child: Row(
        children: [
          for (int i = 0; i < cells.length; i++)
            Expanded(
              flex: i == cells.length - 1 ? 1 : 3,
              child: Text(cells[i],
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: p.muted)),
            ),
        ],
      ),
    );
  }
}

class _TxtInline extends StatelessWidget {
  final String value;
  final bool enabled;
  final String? hint;
  final ValueChanged<String> onChanged;
  const _TxtInline({
    required this.value,
    required this.enabled,
    required this.onChanged,
    this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      initialValue: value,
      enabled: enabled,
      decoration: InputDecoration(
        isDense: true,
        border: const OutlineInputBorder(),
        hintText: hint,
        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      ),
      onChanged: onChanged,
    );
  }
}

class _NumInline extends StatelessWidget {
  final double value;
  final bool enabled;
  final ValueChanged<double> onChanged;
  const _NumInline({
    required this.value,
    required this.enabled,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      initialValue: value == value.roundToDouble()
          ? value.toInt().toString()
          : value.toString(),
      enabled: enabled,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textAlign: TextAlign.right,
      decoration: const InputDecoration(
        isDense: true,
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      ),
      onChanged: (v) => onChanged(double.tryParse(v) ?? 0),
    );
  }
}
