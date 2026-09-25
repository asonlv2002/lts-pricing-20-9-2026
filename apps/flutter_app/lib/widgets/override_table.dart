// ═══════════════════════════════════════════════════════════════════════════
// OverrideTableSection — bảng ghi đè Sale/Admin (P3).
// Mirror `BangGhiDe` (ManHinhQuanLy.tsx) + `xuLyDongGhiDe` (manager-calculation).
// Mobile: bảng cuộn ngang + bấm ô để sửa qua bottom-sheet (thay click-inline web).
// Công thức do engine bundle tính (EngineAdvanced.xuLyDongGhiDe) — Dart chỉ render.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import 'package:lts_pricing/lib/engine_advanced.dart';
import 'package:lts_pricing/lib/pricing_display.dart';

import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'expandable_table.dart';
import 'lts/lts_surfaces.dart';

class OverrideTableSection extends StatefulWidget {
  final AppState state;
  final bool isSale; // true = tab Sale, false = tab Admin
  const OverrideTableSection(
      {super.key, required this.state, required this.isSale});

  @override
  State<OverrideTableSection> createState() => _OverrideTableSectionState();
}

class _OverrideTableSectionState extends State<OverrideTableSection> {
  AppState get s => widget.state;

  Map<String, Map<String, dynamic>> get _current =>
      widget.isSale ? s.saleOverrides : s.adminOverrides;
  // Mirror web ManHinhQuanLy: cả bảng Sale lẫn Admin đều truyền ghiDeNguon={}.
  Map<String, Map<String, dynamic>> get _source => const {};

  double get _profitPct =>
      widget.isSale ? s.saleProfitRatePct : s.adminProfitRatePct;

  void _setOv(String rowKey, String field, dynamic value) {
    if (widget.isSale) {
      s.setSaleOverride(rowKey, field, value);
    } else {
      s.setAdminOverride(rowKey, field, value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = s.currentResult;
    if (r == null) return const SizedBox.shrink();
    final p = LtsT.of(context);

    // uniRows chuẩn từ engine bundle (không ghi đè) → resolve với ghi đè hiện tại.
    final uniRows = s.uniRowsChuan();
    if (uniRows.isEmpty) return const SizedBox.shrink();

    Map<String, dynamic> resolved;
    try {
      resolved = EngineAdvanced.instance.xuLyDongGhiDe(
        uniRows,
        _source,
        _current,
      );
    } catch (_) {
      return const SizedBox.shrink();
    }
    final rows = (resolved['rows'] as List?) ?? const [];
    final tongCPSX = (resolved['totalCPSX'] as num?)?.toDouble() ?? 0;
    final tongCPVL = (resolved['totalCPVL'] as num?)?.toDouble() ?? 0;
    final cpMangIn = (resolved['printFilmCost'] as num?)?.toDouble() ?? 0;
    final tongGiaThanh = tongCPSX + tongCPVL + cpMangIn;

    final meta = getPricingDisplayMeta(
        (r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw);
    final giaGoc = s.ketQuaHienThi.finalPrice;
    final eff = s.tinhGiaHieuLuc(
      result: r,
      uniRows: uniRows,
      saleOv: widget.isSale ? _current : const {},
      adminOv: widget.isSale ? const {} : _current,
      salePct: widget.isSale ? _profitPct : 0,
      adminPct: widget.isSale ? 0 : _profitPct,
    );
    final giaSauGhiDe = eff == null
        ? giaGoc
        : ((eff['effCostPerUnit'] as num?)?.toDouble() ?? giaGoc) +
            (r.d('boxPerUnit') +
                r.d('shippingPerUnit') +
                r.d('interestPerUnit') +
                r.d('cylAllocPerUnit') +
                r.d('gcShippingPerUnit') +
                r.d('gcPackagingPerUnit') +
                r.d('gcOtherPerUnit'));
    final chenhLech = giaSauGhiDe - giaGoc;

    final coThayDoi = _current.isNotEmpty || _profitPct > 0;

    return LtsCard(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Text(widget.isSale ? '💼 Thay đổi từ Sale' : '👑 Thay đổi từ Admin',
                style: const TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 13.5)),
            const Spacer(),
            if (coThayDoi)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('Có thay đổi',
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.warning)),
              ),
          ]),
          const SizedBox(height: 4),
          Text('Bấm vào ô để sửa. Giá gốc: ${Fmt.n(giaGoc)} đ/${meta.unit}',
              style: TextStyle(fontSize: 11, color: p.muted)),
          const SizedBox(height: 10),
          ExpandableTableCard(
            title: 'Bảng ghi đè',
            subtitle: 'Công đoạn · Khổ · Mét · CPSX · Vật liệu',
            icon: Icons.edit_outlined,
            iconColor: AppColors.warning,
            dense: true,
            columns: const [
              TableColumn('Công đoạn', minWidth: 95),
              TableColumn('Vật liệu', minWidth: 80),
              TableColumn('Độ dày', minWidth: 55, align: TextAlign.right),
              TableColumn('Khổ (m)', minWidth: 60, align: TextAlign.right),
              TableColumn('TP (m)', minWidth: 60, align: TextAlign.right),
              TableColumn('Phi hao', minWidth: 55, align: TextAlign.right),
              TableColumn('ĐV NVL', minWidth: 60, align: TextAlign.right),
              TableColumn('CPSX', minWidth: 60, align: TextAlign.right),
              TableColumn('TT CPSX', minWidth: 75, align: TextAlign.right),
              TableColumn('Giá NVL', minWidth: 65, align: TextAlign.right),
              TableColumn('CP VL', minWidth: 65, align: TextAlign.right),
              TableColumn('TT CPVL', minWidth: 75, align: TextAlign.right),
            ],
            rows: [
              for (final row in rows)
                _buildRow(context, (row as Map).cast<String, dynamic>()),
              if (cpMangIn > 0)
                [
                  const TableCellData('CP thời gian in',
                      style: TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w700)),
                  for (var i = 0; i < 11; i++)
                    i == 10
                        ? TableCellData(Fmt.n(cpMangIn),
                            align: TextAlign.right,
                            style: const TextStyle(
                                fontSize: 11, fontWeight: FontWeight.w700))
                        : const TableCellData(''),
                ],
              [
                const TableCellData('TỔNG GIÁ THÀNH',
                    style: TextStyle(
                        fontSize: 11.5, fontWeight: FontWeight.w800)),
                for (var i = 0; i < 11; i++)
                  i == 10
                      ? TableCellData('${Fmt.n(tongGiaThanh)} đ',
                          align: TextAlign.right,
                          style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.info))
                      : const TableCellData(''),
              ],
            ],
          ),
          const SizedBox(height: 10),
          _ProfitRateRow(
            duocSua: true,
            pct: _profitPct,
            onChanged: (v) => widget.isSale
                ? s.setSaleProfitRatePct(v)
                : s.setAdminProfitRatePct(v),
            ln: tongGiaThanh * (_profitPct / 100),
          ),
          if (chenhLech.abs() > 0.5)
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: (chenhLech > 0 ? AppColors.success : AppColors.danger)
                    .withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: (chenhLech > 0
                            ? AppColors.success
                            : AppColors.danger)
                        .withValues(alpha: 0.3)),
              ),
              child: Text(
                'CHÊNH LỆCH SO VỚI GIÁ GỐC: ${chenhLech > 0 ? '+' : ''}${Fmt.n(chenhLech)} Đ/${meta.unit.toUpperCase()}',
                style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color:
                        chenhLech > 0 ? AppColors.success : AppColors.danger),
              ),
            ),
        ],
      ),
    );
  }

  List<TableCellData> _buildRow(
      BuildContext context, Map<String, dynamic> row) {
    final rowKey = (row['rowKey'] as String?) ?? '';
    final ov = _current[rowKey] ?? const {};
    final src = _source[rowKey] ?? const {};
    final stage = (row['stage'] as String?) ?? '';
    final mat = (row['mat'] as String?) ?? '';
    final width = (row['width'] as num?)?.toDouble() ?? 0;
    final meters = (row['meters'] as num?)?.toDouble() ?? 0;
    final waste = (row['waste'] as num?)?.toDouble() ?? 0;
    final inputVL = (row['inputVL'] as num?)?.toDouble() ?? 0;
    final cpsx = (row['cpsx'] as num?)?.toDouble() ?? 0;
    final costCPSX = (row['costCPSX'] as num?)?.toDouble() ?? 0;
    final matPrice = (row['matPrice'] as num?)?.toDouble();
    final costMat = (row['costMat'] as num?)?.toDouble();
    final materialDetails = (row['materialDetails'] as List?) ?? const [];

    final srcWidth = (row['srcWidth'] as num?)?.toDouble() ?? width;
    final srcMeters = (row['srcMeters'] as num?)?.toDouble() ?? meters;
    final srcWaste = (row['srcWaste'] as num?)?.toDouble() ?? waste;
    final srcCpsx = (row['srcCpsx'] as num?)?.toDouble() ?? cpsx;
    final srcMatPrice = (row['srcMatPrice'] as num?)?.toDouble() ?? matPrice;

    final s = const TextStyle(fontSize: 11);

    // Dòng tách chi tiết (ghép nhiều NVL) → tên "VL1 + VL2"
    final matLabel = materialDetails.isNotEmpty
        ? materialDetails
            .map((d) => ((d as Map)['name'] as String?) ?? '')
            .join(' + ')
        : mat;

    return [
      TableCellData(stage,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      TableCellData(matLabel, style: s),
      TableCellData('—',
          align: TextAlign.right, style: TextStyle(fontSize: 11)),
      _editCell(
        rowKey: rowKey,
        field: 'width',
        display: width,
        source: srcWidth,
        soLe: 3,
        ov: ov,
        src: src,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'meters',
        display: meters,
        source: srcMeters,
        soLe: 0,
        ov: ov,
        src: src,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'waste',
        display: waste,
        source: srcWaste,
        soLe: 0,
        ov: ov,
        src: src,
      ),
      TableCellData(Fmt.n(inputVL),
          align: TextAlign.right,
          style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.accent)),
      _editCell(
        rowKey: rowKey,
        field: 'cpsx',
        display: cpsx,
        source: srcCpsx,
        soLe: 0,
        ov: ov,
        src: src,
      ),
      TableCellData(Fmt.n(costCPSX), align: TextAlign.right, style: s),
      _editCell(
        rowKey: rowKey,
        field: 'rawMatPrice',
        display: srcMatPrice ?? 0,
        source: srcMatPrice ?? 0,
        soLe: 0,
        ov: ov,
        src: src,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'matPrice',
        display: matPrice ?? 0,
        source: matPrice ?? 0,
        soLe: 1,
        ov: ov,
        src: src,
        anKhiRong: matPrice == null,
      ),
      TableCellData(costMat != null ? Fmt.n(costMat) : '—',
          align: TextAlign.right, style: s),
    ];
  }

  TableCellData _editCell({
    required String rowKey,
    required String field,
    required double display,
    required double source,
    required int soLe,
    required Map<String, dynamic> ov,
    required Map<String, dynamic> src,
    bool anKhiRong = false,
  }) {
    final daGhiDe = ov[field] != null || src[field] != null;
    if (anKhiRong) {
      return const TableCellData('—',
          align: TextAlign.right, style: TextStyle(fontSize: 11));
    }
    return TableCellData(
      Fmt.d1(display),
      align: TextAlign.right,
      onTap: () => _suaO(
        rowKey: rowKey,
        field: field,
        hienTai: display,
        goc: source,
        soLe: soLe,
      ),
      style: TextStyle(
        fontSize: 11,
        fontWeight: daGhiDe ? FontWeight.w700 : FontWeight.w400,
        color: daGhiDe ? AppColors.warning : null,
        decoration: daGhiDe ? TextDecoration.underline : null,
      ),
    );
  }

  /// Bottom-sheet sửa 1 ô ghi đè (mobile thay click-inline web).
  /// Nhập rỗng hoặc = giá gốc → xoá ghi đè (mirror `OCoTheGhiDe.xacNhan`).
  /// Trả về: null = huỷ (đóng sheet), sentinel _xoaGhiDe = xoá, số = giá trị mới.
  static const _xoaGhiDe = -1.0; // sentinel "xoá ghi đè" (giá không bao giờ âm)

  Future<void> _suaO({
    required String rowKey,
    required String field,
    required double hienTai,
    required double goc,
    required int soLe,
  }) async {
    final ctrl = TextEditingController(
        text: hienTai == hienTai.roundToDouble()
            ? hienTai.round().toString()
            : hienTai.toString());
    final kq = await showModalBottomSheet<double?>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Sửa $field — $rowKey',
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text('Giá gốc: ${Fmt.d1(goc)}',
                style: TextStyle(fontSize: 11, color: LtsT.of(ctx).muted)),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              autofocus: true,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                  isDense: true, border: OutlineInputBorder()),
              onSubmitted: (v) => Navigator.pop(
                  ctx, double.tryParse(v.replaceAll(',', '.'))),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  // Sentinel phân biệt "xoá ghi đè" với đóng sheet (huỷ).
                  onPressed: () => Navigator.pop(ctx, _xoaGhiDe),
                  child: const Text('Xoá ghi đè'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: () => Navigator.pop(
                      ctx, double.tryParse(ctrl.text.replaceAll(',', '.'))),
                  child: const Text('Lưu'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
    if (kq == null) return; // đóng sheet ngoài = huỷ, giữ nguyên ghi đè
    if (kq == _xoaGhiDe) {
      if (_current[rowKey]?.containsKey(field) ?? false) {
        _setOv(rowKey, field, null);
      }
      return;
    }
    if ((kq - goc).abs() < 0.001 || kq < 0) {
      _setOv(rowKey, field, null);
    } else {
      _setOv(rowKey, field, kq);
    }
  }
}

class _ProfitRateRow extends StatefulWidget {
  final bool duocSua;
  final double pct;
  final ValueChanged<double> onChanged;
  final double ln;
  const _ProfitRateRow({
    required this.duocSua,
    required this.pct,
    required this.onChanged,
    required this.ln,
  });

  @override
  State<_ProfitRateRow> createState() => _ProfitRateRowState();
}

class _ProfitRateRowState extends State<_ProfitRateRow> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: _hienThi(widget.pct));
  }

  @override
  void didUpdateWidget(covariant _ProfitRateRow old) {
    super.didUpdateWidget(old);
    // Đồng bộ khi giá trị bên ngoài đổi (mirror web useEffect reset theo pct)
    // mà user không đang gõ dở.
    if (old.pct != widget.pct && !_dangGo) {
      _ctrl.text = _hienThi(widget.pct);
    }
  }

  bool _dangGo = false;

  static String _hienThi(double pct) => pct > 0 ? pct.toString() : '0';

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.25)),
      ),
      child: Row(children: [
        Text('Tỷ lệ LN:', style: TextStyle(fontSize: 12, color: p.muted)),
        const SizedBox(width: 8),
        SizedBox(
          width: 70,
          child: TextField(
            controller: _ctrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            decoration: const InputDecoration(
              isDense: true,
              suffixText: '%',
              border: OutlineInputBorder(),
            ),
            onTap: () => _dangGo = true,
            onChanged: (v) {
              _dangGo = true;
              widget.onChanged(double.tryParse(v) ?? 0);
            },
            onSubmitted: (v) {
              _dangGo = false;
              widget.onChanged(double.tryParse(v) ?? 0);
            },
            onTapOutside: (_) {
              _dangGo = false;
              FocusManager.instance.primaryFocus?.unfocus();
            },
          ),
        ),
        const Spacer(),
        Text('LN: ${Fmt.n(widget.ln)} đ',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}
