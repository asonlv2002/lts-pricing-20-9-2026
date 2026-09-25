// ═══════════════════════════════════════════════════════════════════════════
// MoqTables — port 2 bảng số lượng của ManHinhQuanLy.tsx:
//   • Bảng giá theo số lượng (MOQ)   — web:2224-2318 / 3032-3084
//   • Số lượng theo cuộn màng (Roll) — web:2320-2406 / 3086-3198
// Dùng EngineService.calculate với quantity khác (AppState.tinhTheoSoLuong).
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:convert';

import 'package:flutter/material.dart';

import 'package:lts_pricing/lib/pricing_display.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'expandable_table.dart';
import 'lts/lts_surfaces.dart';

// ─── Cache kết quả MOQ theo signature (tránh gọi engine lặp mỗi rebuild) ────
// Key gồm input + chữ ký vật liệu/hằng số (id + giá + độ dày) để không stale khi
// admin sửa giá NVL dù số lượng NVL không đổi. Cap 8 entry tránh phình vô hạn.
final Map<String, List<_MoqRow>> _moqCache = {};
final Map<String, List<_RollRow>> _rollCache = {};
const int _cacheCap = 8;

void _capCache<T>(Map<String, T> cache) {
  while (cache.length > _cacheCap) {
    cache.remove(cache.keys.first);
  }
}

class _MoqRow {
  final int qty;
  final CalculateResult res;
  final bool isCurrent;
  const _MoqRow(this.qty, this.res, this.isCurrent);
}

class _RollRow {
  final num levelVal;
  final double availableMeters;
  final double areaM2;
  final int estQty;
  final CalculateResult res;
  final bool isCurrent;
  final double selectedKg;
  const _RollRow({
    required this.levelVal,
    required this.availableMeters,
    required this.areaM2,
    required this.estQty,
    required this.res,
    required this.isCurrent,
    required this.selectedKg,
  });
}

// ─── Layer column model ─────────────────────────────────────────────────────
class _MatCol {
  final String type; // 'print' | 'lam'
  final int? layerNum;
  final String name; // tên gọn
  final String fullName;
  const _MatCol(this.type, this.layerNum, this.name, this.fullName);
  String get id => type == 'print' ? 'print' : 'lam-$layerNum';
}

List<_MatCol> _buildMatCols(CalculateResult r) {
  final cols = <_MatCol>[];
  final layers = (r.raw['layers'] as Map?)?.cast<String, dynamic>() ?? {};
  final print = (layers['print'] as Map?)?.cast<String, dynamic>();
  final printMat = (print?['material'] as Map?)?.cast<String, dynamic>();
  if (printMat != null) {
    final name = (printMat['name'] as String?) ?? '';
    cols.add(_MatCol('print', null, name.split(' ').first, name));
  }
  final lams = (layers['laminations'] as List?) ?? [];
  for (final lam in lams) {
    final lm = (lam as Map).cast<String, dynamic>();
    final mat = (lm['material'] as Map?)?.cast<String, dynamic>();
    final details = (lm['chiTietVatLieu'] as List?) ?? [];
    final String full;
    final String short;
    if (details.isNotEmpty) {
      final names = details
          .map((d) => (((d as Map)['ten'] as String?) ?? '').split(' ').first)
          .toList();
      final fullNames =
          details.map((d) => ((d as Map)['ten'] as String?) ?? '').toList();
      full = fullNames.join(' + ');
      short = names.join('+');
    } else {
      final name = (mat?['name'] as String?) ?? '';
      full = name;
      short = name.split(' ').first;
    }
    cols.add(_MatCol(
        'lam', (lm['layerNum'] as num?)?.toInt() ?? 0, short, full));
  }
  return cols;
}

Map<String, dynamic>? _getLayerData(CalculateResult r, _MatCol col) {
  final layers = (r.raw['layers'] as Map?)?.cast<String, dynamic>() ?? {};
  if (col.type == 'print') {
    return (layers['print'] as Map?)?.cast<String, dynamic>();
  }
  final lams = (layers['laminations'] as List?) ?? [];
  for (final lam in lams) {
    final lm = (lam as Map).cast<String, dynamic>();
    if ((lm['layerNum'] as num?)?.toInt() == col.layerNum) return lm;
  }
  return null;
}

double _calcKg(Map<String, dynamic>? layerMat, double meters, double width) {
  if (layerMat == null) return 0;
  final density =
      ((layerMat['matDoHienThi'] ?? layerMat['density']) as num?)?.toDouble() ??
          0;
  final thickness = (layerMat['thickness'] as num?)?.toDouble() ?? 0;
  return meters * width * thickness * density / 1000;
}

double _calcKgForLayer(Map<String, dynamic>? layerData, double meters) {
  if (layerData == null) return 0;
  final details = (layerData['chiTietVatLieu'] as List?) ?? [];
  final materials = (layerData['materials'] as List?) ?? [];
  if (details.isNotEmpty && materials.isNotEmpty) {
    double sum = 0;
    for (final item in details) {
      final it = (item as Map).cast<String, dynamic>();
      final mat = materials
          .map((m) => (m as Map).cast<String, dynamic>())
          .where((m) => m['id'] == it['vatLieuId'])
          .cast<Map<String, dynamic>?>()
          .firstWhere((m) => true, orElse: () => null);
      sum += _calcKg(mat, meters, ((it['kho'] as num?) ?? 0).toDouble());
    }
    return sum;
  }
  final width = ((layerData['width'] as num?) ?? 0).toDouble();
  final mat = (layerData['material'] as Map?)?.cast<String, dynamic>();
  return _calcKg(mat, meters, width);
}

/// Mô tả chi tiết NVL 1 lớp — mirror `renderMaterialBreakdown` web (dedupe + cộng kho).
String _renderMaterialBreakdown(Map<String, dynamic>? layerData, double met) {
  final details = (layerData?['chiTietVatLieu'] as List?) ?? [];
  final materials = (layerData?['materials'] as List?) ?? [];
  if (details.isEmpty) return '';
  // Dedupe theo vatLieuId, cộng kho, giữ soLan entry đầu.
  final dedup = <String, Map<String, dynamic>>{};
  for (final item in details) {
    final it = (item as Map).cast<String, dynamic>();
    final id = (it['vatLieuId'] as String?) ?? '';
    if (dedup.containsKey(id)) {
      dedup[id]!['kho'] = ((dedup[id]!['kho'] as num?) ?? 0) + ((it['kho'] as num?) ?? 0);
    } else {
      dedup[id] = Map<String, dynamic>.of(it);
    }
  }
  final lines = <String>[];
  dedup.forEach((id, it) {
    final soLan = (it['soLan'] as num?)?.toInt() ?? 1;
    final kho = ((it['kho'] as num?) ?? 0).toDouble();
    final mat = materials
        .map((m) => (m as Map).cast<String, dynamic>())
        .cast<Map<String, dynamic>?>()
        .firstWhere((m) => m?['id'] == id, orElse: () => null);
    final kg = _calcKg(mat, met, kho);
    final ten = (it['ten'] as String?) ?? '';
    final metTxt = soLan > 1
        ? '${Fmt.n(met)}m × $soLan = ${Fmt.n(met * soLan)}m'
        : '${Fmt.n(met)}m';
    lines.add('$ten: $metTxt | ${Fmt.d1(kg)} kg');
  });
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MOQ theo số lượng
// ═══════════════════════════════════════════════════════════════════════════
class MoqTableSection extends StatelessWidget {
  final AppState state;
  const MoqTableSection({super.key, required this.state});

  static const _levels = [
    5000, 10000, 15000, 20000, 30000, 40000,
    50000, 70000, 100000, 150000, 200000,
  ];

  @override
  Widget build(BuildContext context) {
    final r = state.currentResult;
    if (r == null) return const SizedBox.shrink();
    final input = (r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw;
    final currentQty = (input['quantity'] as num?)?.toInt() ?? 0;

    final levels = [..._levels];
    if (currentQty > 0 && !levels.contains(currentQty)) {
      levels.add(currentQty);
      levels.sort();
    }

    final sig = _sig(state, 'moq');
    final rows = _moqCache[sig] ??
        (() {
          final computed = <_MoqRow>[];
          for (final qty in levels) {
            final res = state.tinhTheoSoLuongHienThi(state.currentInput, qty);
            if (res != null) {
              computed.add(_MoqRow(qty, res, qty == currentQty));
            }
          }
          _moqCache[sig] = computed;
          _capCache(_moqCache);
          return computed;
        })();

    final cols = _buildMatCols(r);

    return _MoqCard(
      title: 'Bảng giá theo số lượng (MOQ)',
      icon: Icons.inventory_2_outlined,
      hint:
          'So sánh giá khi thay đổi số lượng đặt hàng. Dòng tô sáng là số lượng hiện tại.',
      child: ExpandableTableCard(
        title: 'MOQ',
        subtitle: 'Số lượng · LN · Giá đề xuất · Vật liệu',
        icon: Icons.inventory_2_outlined,
        iconColor: AppColors.accent,
        dense: true,
        columns: [
          const TableColumn('Số lượng', minWidth: 70),
          const TableColumn('LN %', minWidth: 55, align: TextAlign.right),
          const TableColumn('Giá vốn+LN', minWidth: 75, align: TextAlign.right),
          const TableColumn('Giá đề xuất', minWidth: 80, align: TextAlign.right),
          const TableColumn('Tổng DT', minWidth: 65, align: TextAlign.right),
          for (final c in cols) TableColumn(c.name, minWidth: 110),
        ],
        rows: [
          for (final row in rows)
            [
              TableCellData(Fmt.n(row.qty),
                  style: TextStyle(
                      fontWeight:
                          row.isCurrent ? FontWeight.w800 : FontWeight.w400,
                      color: row.isCurrent ? AppColors.accent : null)),
              TableCellData(formatPercent(row.res.profitRate),
                  align: TextAlign.right),
              TableCellData(Fmt.d1(row.res.costPerUnit),
                  align: TextAlign.right),
              TableCellData(Fmt.n(row.res.finalPrice),
                  align: TextAlign.right,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: row.isCurrent ? AppColors.accent : null)),
              TableCellData('${(row.res.finalPrice * row.qty / 1000000).toStringAsFixed(2)}tr',
                  align: TextAlign.right),
              for (final c in cols)
                TableCellData(_layerCellText(row.res, c), style: const TextStyle(fontSize: 11)),
            ],
        ],
      ),
    );
  }

  static String _layerCellText(CalculateResult res, _MatCol col) {
    final data = _getLayerData(res, col);
    if (data == null) return '—';
    final meters =
        (((data['meters'] as num?) ?? 0) + ((data['waste'] as num?) ?? 0))
            .toDouble();
    final details = (data['chiTietVatLieu'] as List?) ?? [];
    if (details.isEmpty) {
      final kg = _calcKgForLayer(data, meters);
      return '${Fmt.n(meters)} m\n(${Fmt.d1(kg)} kg)';
    }
    return _renderMaterialBreakdown(data, meters);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Roll MOQ — số lượng theo cuộn màng
// ═══════════════════════════════════════════════════════════════════════════
class RollMoqSection extends StatefulWidget {
  final AppState state;
  const RollMoqSection({super.key, required this.state});

  @override
  State<RollMoqSection> createState() => _RollMoqSectionState();
}

class _RollMoqSectionState extends State<RollMoqSection> {
  String _selectedColId = '';

  @override
  Widget build(BuildContext context) {
    final r = widget.state.currentResult;
    if (r == null) return const SizedBox.shrink();
    final input = (r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw;
    final meta = getPricingDisplayMeta(input);
    final laMang = meta.isFilm;

    final rollOptions = _buildMatCols(r);
    if (rollOptions.isEmpty) return const SizedBox.shrink();
    final selectedCol = rollOptions.firstWhere(
      (c) => c.id == _selectedColId,
      orElse: () => rollOptions.first,
    );
    final selectedData = _getLayerData(r, selectedCol);
    final selectedMat =
        (selectedData?['material'] as Map?)?.cast<String, dynamic>();
    final selectedName = (selectedMat?['name'] as String?) ?? '';
    final isKgBase = !laMang &&
        selectedMat != null &&
        (selectedName.toUpperCase().contains('LLDPE') ||
            selectedName.toUpperCase() == 'PE');
    final rollLevels = isKgBase
        ? const [200, 300, 400, 500, 600, 700]
        : const [1, 2, 3, 4, 5, 6];
    final chieuDaiCuonMang =
        ((input['filmRollLength'] as num?)?.toDouble()) ?? 6000;
    final rollLen = laMang
        ? ((selectedMat?['rollLength'] as num?)?.toDouble() ?? chieuDaiCuonMang)
        : ((selectedMat?['rollLength'] as num?)?.toDouble() ?? 6000);
    final otherCols = rollOptions.where((c) => c.id != selectedCol.id).toList();

    final sig = _sig(widget.state, 'roll', '${selectedCol.id}|$rollLen|$isKgBase');
    final rows = selectedData == null || selectedMat == null
        ? <_RollRow>[]
        : _rollCache[sig] ??
            (() {
              final computed = <_RollRow>[];
              final totalSelectedMeters =
                  (((selectedData['meters'] as num?) ?? 0) +
                          ((selectedData['waste'] as num?) ?? 0))
                      .toDouble();
              final width = ((selectedData['width'] as num?) ?? 0).toDouble();
              final spreadWidth =
                  ((input['spreadWidth'] as num?) ?? 0).toDouble();
              final numImages =
                  ((input['numImages'] as num?) ?? 1).toInt().clamp(1, 999);
              for (final levelVal in rollLevels) {
                final availableMeters = laMang
                    ? levelVal * rollLen
                    : isKgBase
                        ? _getMetersFromKg(selectedMat, levelVal.toDouble(), width)
                        : levelVal * rollLen;
                final areaM2 = laMang
                    ? availableMeters * spreadWidth * numImages
                    : 0.0;
                final estQty = laMang
                    ? areaM2.round()
                    : _findEstQtyForMeters(widget.state, availableMeters,
                        selectedCol);
                if (estQty <= 0) continue;
                final res =
                    widget.state.tinhTheoSoLuong(widget.state.currentInput, estQty);
                if (res == null) continue;
                bool isCurrent = false;
                if (laMang) {
                  final rollArea = spreadWidth * rollLen;
                  final qty = (input['quantity'] as num?)?.toDouble() ?? 0;
                  isCurrent = rollArea > 0 && levelVal == (qty / rollArea).ceil();
                } else if (isKgBase) {
                  final currentKg = _calcKgForLayer(selectedData, totalSelectedMeters);
                  isCurrent =
                      (currentKg / 100).ceil() * 100 == levelVal;
                } else {
                  isCurrent = rollLen > 0 &&
                      levelVal == (totalSelectedMeters / rollLen).ceil();
                }
                computed.add(_RollRow(
                  levelVal: levelVal,
                  availableMeters: availableMeters,
                  areaM2: areaM2,
                  estQty: estQty,
                  res: res,
                  isCurrent: isCurrent,
                  selectedKg: _calcKgForLayer(selectedData, availableMeters),
                ));
              }
              _rollCache[sig] = computed;
              _capCache(_rollCache);
              return computed;
            })();

    return _MoqCard(
      title: 'Số lượng theo cuộn màng',
      icon: Icons.movie_outlined,
      hint: laMang
          ? 'Số lượng theo cuộn màng thành phẩm: SL = số cuộn × khổ TP × chiều dài cuộn TP.'
          : 'Số lượng tối ưu theo cuộn màng tiêu chuẩn của lớp in. Giúp đặt hàng khớp cuộn, giảm hao hụt.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('Lớp màng:', style: TextStyle(fontSize: 12, color: LtsT.of(context).muted)),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButton<String>(
                  value: selectedCol.id,
                  isExpanded: true,
                  isDense: true,
                  items: [
                    for (final c in rollOptions)
                      DropdownMenuItem(
                        value: c.id,
                        child: Text(
                          '${c.name} ${_colIsKg(c) ? '(KG)' : '(CUỘN)'}',
                          style: const TextStyle(fontSize: 12.5),
                        ),
                      ),
                  ],
                  onChanged: (v) => setState(() => _selectedColId = v ?? ''),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (rows.isEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Không có lớp màng phù hợp để tính MOQ cuộn',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: LtsT.of(context).muted)),
            )
          else
            ExpandableTableCard(
              title: 'MOQ cuộn',
              subtitle: laMang
                  ? 'Mét dài TP · Diện tích · Giá đề xuất'
                  : 'Chỉ số cuộn · SL · Vật liệu · Giá đề xuất',
              icon: Icons.movie_outlined,
              iconColor: AppColors.warning,
              dense: true,
              columns: [
                TableColumn(
                    isKgBase ? 'Khối lượng (kg)' : 'Chỉ số cuộn',
                    minWidth: 90),
                if (laMang) ...[
                  const TableColumn('Mét dài TP', minWidth: 75, align: TextAlign.right),
                  const TableColumn('Diện tích tính giá', minWidth: 90, align: TextAlign.right),
                ] else
                  TableColumn('SL ${meta.unit}', minWidth: 70, align: TextAlign.right),
                for (final c in otherCols) TableColumn(c.name, minWidth: 100),
                const TableColumn('Giá đề xuất', minWidth: 80, align: TextAlign.right),
                const TableColumn('Tổng DT', minWidth: 65, align: TextAlign.right),
              ],
              rows: [
                for (final row in rows)
                  [
                    TableCellData(
                      isKgBase
                          ? '${Fmt.n(row.levelVal)} kg\n(${Fmt.n(row.availableMeters)} m)'
                          : '${row.levelVal} cuộn\n(${Fmt.n(row.availableMeters)} m)',
                      style: TextStyle(
                          fontWeight:
                              row.isCurrent ? FontWeight.w800 : FontWeight.w400),
                    ),
                    if (laMang) ...[
                      TableCellData(Fmt.n(row.availableMeters),
                          align: TextAlign.right),
                      TableCellData(Fmt.n(row.areaM2),
                          align: TextAlign.right),
                    ] else
                      TableCellData(Fmt.n(row.estQty),
                          align: TextAlign.right),
                    for (final c in otherCols)
                      TableCellData(_rollLayerText(row.res, c),
                          style: const TextStyle(fontSize: 11)),
                    TableCellData(Fmt.n(row.res.finalPrice),
                        align: TextAlign.right,
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color:
                                row.isCurrent ? AppColors.accent : null)),
                    TableCellData(
                        '${(row.res.finalPrice * row.estQty / 1000000).toStringAsFixed(2)}tr',
                        align: TextAlign.right),
                  ],
              ],
            ),
        ],
      ),
    );
  }

  static bool _colIsKg(_MatCol c) {
    final u = c.fullName.toUpperCase();
    return u.contains('LLDPE') || u == 'PE';
  }

  static String _rollLayerText(CalculateResult res, _MatCol col) {
    final data = _getLayerData(res, col);
    if (data == null) return '—';
    final meters =
        (((data['meters'] as num?) ?? 0) + ((data['waste'] as num?) ?? 0))
            .toDouble();
    final details = (data['chiTietVatLieu'] as List?) ?? [];
    if (details.isEmpty) {
      final kg = _calcKgForLayer(data, meters);
      return '${Fmt.n(meters)} m\n(${Fmt.d1(kg)} kg)';
    }
    return _renderMaterialBreakdown(data, meters);
  }

  static double _getMetersFromKg(
      Map<String, dynamic> layerMat, double targetKg, double width) {
    if (width <= 0) return 0;
    final density =
        ((layerMat['matDoHienThi'] ?? layerMat['density']) as num?)?.toDouble() ??
            0;
    final thickness = (layerMat['thickness'] as num?)?.toDouble() ?? 0;
    if (density <= 0 || thickness <= 0) return 0;
    return targetKg * 1000 / (width * thickness * density);
  }

  /// Binary search SL sao cho mét lớp chọn ≈ targetMeters (mirror web).
  static int _findEstQtyForMeters(
      AppState state, double targetMeters, _MatCol col) {
    int low = 100;
    int high = 1000000;
    int bestQty = 0;
    while (low <= high) {
      final mid = ((low + high) / 2).floor();
      final res = state.tinhTheoSoLuong(state.currentInput, mid);
      if (res == null) return low;
      final data = _getLayerData(res, col);
      final currentMeters = data == null
          ? 0.0
          : (((data['meters'] as num?) ?? 0) +
                  ((data['waste'] as num?) ?? 0))
              .toDouble();
      if (currentMeters <= targetMeters) {
        bestQty = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return (bestQty / 100).floor() * 100;
  }
}

// ─── Shared: signature cache + card wrapper ─────────────────────────────────
String _sig(AppState state, String kind, [String extra = '']) {
  final inputSig = jsonEncode(state.currentInput.toJson());
  final matSig = state.materials
      .map((m) => '${m.id}:${m.pricePerKg}:${m.thickness}:${m.pricePerM2}')
      .join(',');
  final constSig = jsonEncode(state.constants.toJson());
  // cheDoNangCao + pin CPSX NC đổi → giá MOQ đổi (bảng đặc tả nâng cao).
  final ncSig = '${state.cheDoNangCao}|${state.loadedPinnedCpsxNangCao?.length ?? 0}';
  return '$kind|$ncSig|$matSig|$constSig|$extra|$inputSig';
}

class _MoqCard extends StatefulWidget {
  final String title;
  final IconData icon;
  final String hint;
  final Widget child;
  const _MoqCard({
    required this.title,
    required this.icon,
    required this.hint,
    required this.child,
  });

  @override
  State<_MoqCard> createState() => _MoqCardState();
}

class _MoqCardState extends State<_MoqCard> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return LtsCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => setState(() => _open = !_open),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              child: Row(children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8)),
                  child: Icon(widget.icon, size: 15, color: AppColors.accent),
                ),
                const SizedBox(width: 10),
                Expanded(
                    child: Text(widget.title,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 13.5))),
                AnimatedRotation(
                  turns: _open ? 0.5 : 0,
                  duration: const Duration(milliseconds: 200),
                  child: Icon(Icons.keyboard_arrow_down, color: p.muted, size: 20),
                ),
              ]),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeInOut,
            child: _open
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.info.withValues(alpha: 0.07),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: AppColors.info.withValues(alpha: 0.2)),
                          ),
                          child: Text(widget.hint,
                              style: TextStyle(
                                  fontSize: 11.5, color: p.muted, height: 1.4)),
                        ),
                        const SizedBox(height: 10),
                        widget.child,
                      ],
                    ),
                  )
                : const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }
}
