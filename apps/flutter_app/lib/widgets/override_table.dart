// ═══════════════════════════════════════════════════════════════════════════
// OverrideTableSection — bảng ghi đè Sale/Admin (P3).
// Mirror `BangGhiDe` (ManHinhQuanLy.tsx) + `xuLyDongGhiDe` (manager-calculation).
// Mobile: bảng cuộn ngang + bấm ô để sửa qua bottom-sheet (thay click-inline web).
// Công thức do engine bundle tính (EngineAdvanced.xuLyDongGhiDe) — Dart chỉ render.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import 'package:lts_pricing/lib/engine_advanced.dart';
import 'package:lts_pricing/lib/override_helpers.dart';
import 'package:lts_pricing/lib/pricing_display.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'expandable_table.dart';
import 'lts/lts_surfaces.dart';
import 'lts/lts_toast.dart';

class OverrideTableSection extends StatefulWidget {
  final AppState state;
  final bool isSale; // true = tab Sale, false = tab Admin
  final bool duocSua; // theo quyền PRICING_SHEET_ADVISOR
  const OverrideTableSection(
      {super.key,
      required this.state,
      required this.isSale,
      this.duocSua = true});

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

  /// Tỷ lệ LN mặc định (tra bảng) — mirror web `defaultProfitRatePct`.
  double get _macDinhPct => widget.isSale
      ? s.saleTyLeLoiNhuanMacDinh
      : s.adminTyLeLoiNhuanMacDinh;

  void _setOv(String rowKey, String field, dynamic value) {
    if (widget.isSale) {
      s.setSaleOverride(rowKey, field, value);
    } else {
      s.setAdminOverride(rowKey, field, value);
    }
  }

  /// Thay cả bảng ghi đè (helper trả về bảng mới).
  void _setBang(OverrideTableRef next) {
    if (widget.isSale) {
      s.setSaleOverrides(next);
    } else {
      s.setAdminOverrides(next);
    }
  }

  /// Engine params cho đổi vật liệu dòng In (tính lại CPSX mực).
  Map<String, dynamic> get _engineParams {
    final r = s.currentResult;
    final inp = r == null
        ? <String, dynamic>{}
        : ((r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw);
    final isPrintFilm = inp['productType'] == 'mang' &&
        inp['filmType'] == 'mangIn';
    return {
      'numColors': (inp['numColors'] as num?)?.toInt() ?? 0,
      'coverageRatio': (inp['coverageRatio'] as num?)?.toDouble() ?? 1,
      'metallicSurcharge': (inp['metallicSurcharge'] as num?)?.toDouble() ?? 0,
      'laborCost': (s.constants.raw['laborCost'] as num?)?.toDouble() ?? 0,
      'isPrintFilm': isPrintFilm,
      'printFilmInkBOPP':
          (s.constants.raw['printFilmInkPriceBopp'] as num?)?.toDouble() ?? 150,
      'printFilmInkOther':
          (s.constants.raw['printFilmInkPricePerOther'] as num?)?.toDouble() ??
              (s.constants.raw['printFilmInkPriceOther'] as num?)?.toDouble() ??
              200,
    };
  }

  MaterialDef? _timVatLieu(String? id) {
    if (id == null || id.isEmpty) return null;
    for (final m in s.materials) {
      if (m.id == id) return m;
    }
    return null;
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
            if (!widget.duocSua)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: p.surface2,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: p.border),
                ),
                child: Text('Chỉ xem',
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: p.muted)),
              )
            else if (coThayDoi)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text('Có thay đổi',
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.warning)),
              ),
          ]),
          const SizedBox(height: 4),
          Text(
              widget.duocSua
                  ? 'Bấm vào ô để sửa. Giá gốc: ${Fmt.n(giaGoc)} đ/${meta.unit}'
                  : 'Chỉ xem — không có quyền sửa. Giá gốc: ${Fmt.n(giaGoc)} đ/${meta.unit}',
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
              TableColumn('Vật liệu', minWidth: 90),
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
                ..._buildRows(context, (row as Map).cast<String, dynamic>()),
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
                          style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.info))
                      : const TableCellData(''),
              ],
            ],
          ),
          const SizedBox(height: 10),
          _ProfitRateRow(
            duocSua: widget.duocSua,
            pct: _profitPct,
            macDinhPct: _macDinhPct,
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
          if (widget.duocSua) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.icon(
                onPressed: _luuThayDoi,
                icon: const Icon(Icons.save_outlined, size: 18),
                label: const Text('Lưu thay đổi'),
                style:
                    FilledButton.styleFrom(backgroundColor: AppColors.success),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _luuThayDoi() async {
    if (s.currentResult == null) return;
    await s.saveCurrentToHistory(force: true);
    if (!mounted) return;
    LtsToast.show(context, 'Đã lưu thay đổi', type: LtsToastType.success);
  }

  /// Tên VL hiển thị: ưu tiên id → catalog, fallback tên đã lưu.
  String _tenVatLieu(String? id, String tenDuPhong) {
    if (id != null && id.isNotEmpty) {
      final m = _timVatLieu(id);
      if (m != null) return m.name;
    }
    return tenDuPhong;
  }

  /// Dựng 1 hoặc nhiều dòng cho 1 uniRow (tách chi tiết ghép nhiều NVL —
  /// mirror web `flatMap` ManHinhQuanLy.tsx:620-747).
  List<List<TableCellData>> _buildRows(
      BuildContext context, Map<String, dynamic> row) {
    final rowKey = (row['rowKey'] as String?) ?? '';
    final materialDetails = (row['materialDetails'] as List?) ?? const [];

    if (materialDetails.length > 1) {
      final rows = <List<TableCellData>>[];
      for (var detailIdx = 0; detailIdx < materialDetails.length; detailIdx++) {
        rows.add(_buildDetailRow(
            context, row, rowKey, detailIdx,
            (materialDetails[detailIdx] as Map).cast<String, dynamic>()));
      }
      return rows;
    }
    return [_buildSingleRow(context, row, rowKey)];
  }

  List<TableCellData> _buildDetailRow(
    BuildContext context,
    Map<String, dynamic> row,
    String rowKey,
    int detailIdx,
    Map<String, dynamic> detail,
  ) {
    final ov = _current[rowKey] ?? const {};
    final detailOv = ((ov['detailOverrides'] as Map?)?['$detailIdx'] as Map?)
            ?.cast<String, dynamic>() ??
        const {};
    final stage = (row['stage'] as String?) ?? '';
    final width = (row['width'] as num?)?.toDouble() ?? 0;
    final meters = (row['meters'] as num?)?.toDouble() ?? 0;
    final waste = (row['waste'] as num?)?.toDouble() ?? 0;
    final inputVL = (row['inputVL'] as num?)?.toDouble() ?? 0;
    final cpsx = (row['cpsx'] as num?)?.toDouble() ?? 0;
    final costCPSX = (row['costCPSX'] as num?)?.toDouble() ?? 0;
    final costMat = (row['costMat'] as num?)?.toDouble();

    final srcMeters = (row['srcMeters'] as num?)?.toDouble() ?? meters;
    final srcWaste = (row['srcWaste'] as num?)?.toDouble() ?? waste;
    final srcCpsx = (row['srcCpsx'] as num?)?.toDouble() ?? cpsx;

    final matId = detailOv['materialId'] as String? ?? detail['materialId'] as String?;
    final matName = detailOv['materialName'] as String? ??
        (detail['name'] as String?) ??
        '';
    final matPriceGoc = (detail['matPrice'] as num?)?.toDouble() ?? 0;
    final matPrice = (detailOv['matPrice'] as num?)?.toDouble() ?? matPriceGoc;
    final rawGoc = _giaNVLGoc(matId, matName);
    final rawMatPrice =
        (detailOv['rawMatPrice'] as num?)?.toDouble() ?? rawGoc;

    const s = TextStyle(fontSize: 11);
    final daDoiVL = detailOv['materialId'] != null;

    return [
      TableCellData(stage,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      _vatLieuCell(
        rowKey: rowKey,
        chiTietIndex: detailIdx,
        giaTriGocId: detail['materialId'] as String?,
        giaTriGocTen: (detail['name'] as String?) ?? '',
        tenHienThi: _tenVatLieu(matId, matName),
        daDoi: daDoiVL,
      ),
      _doDayCell(
        rowKey: rowKey,
        chiTietIndex: detailIdx,
        matIdHienLuc: matId,
        giaTriGocId: detail['materialId'] as String?,
      ),
      _editCell(
        rowKey: rowKey,
        chiTietIndex: detailIdx,
        field: 'width',
        display: (detailOv['width'] as num?)?.toDouble() ??
            ((detail['width'] as num?)?.toDouble() ?? width),
        source: (detail['width'] as num?)?.toDouble() ?? width,
        soLe: 3,
        ov: detailOv,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'meters',
        display: meters,
        source: srcMeters,
        soLe: 0,
        ov: ov,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'waste',
        display: waste,
        source: srcWaste,
        soLe: 0,
        ov: ov,
      ),
      TableCellData(Fmt.n(inputVL),
          align: TextAlign.right,
          style: const TextStyle(
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
      ),
      TableCellData(Fmt.n(costCPSX), align: TextAlign.right, style: s),
      _editCell(
        rowKey: rowKey,
        chiTietIndex: detailIdx,
        field: 'rawMatPrice',
        display: rawMatPrice,
        source: rawGoc,
        soLe: 0,
        ov: detailOv,
      ),
      _editCell(
        rowKey: rowKey,
        chiTietIndex: detailIdx,
        field: 'matPrice',
        display: matPrice,
        source: matPriceGoc,
        soLe: 1,
        ov: detailOv,
      ),
      TableCellData(costMat != null ? Fmt.n(costMat) : '—',
          align: TextAlign.right, style: s),
    ];
  }

  List<TableCellData> _buildSingleRow(
      BuildContext context, Map<String, dynamic> row, String rowKey) {
    final ov = _current[rowKey] ?? const {};
    final stage = (row['stage'] as String?) ?? '';
    final mat = (row['mat'] as String?) ?? '';
    final materialId = row['materialId'] as String?;
    final width = (row['width'] as num?)?.toDouble() ?? 0;
    final meters = (row['meters'] as num?)?.toDouble() ?? 0;
    final waste = (row['waste'] as num?)?.toDouble() ?? 0;
    final inputVL = (row['inputVL'] as num?)?.toDouble() ?? 0;
    final cpsx = (row['cpsx'] as num?)?.toDouble() ?? 0;
    final costCPSX = (row['costCPSX'] as num?)?.toDouble() ?? 0;
    final matPrice = (row['matPrice'] as num?)?.toDouble();
    final costMat = (row['costMat'] as num?)?.toDouble();

    final srcWidth = (row['srcWidth'] as num?)?.toDouble() ?? width;
    final srcMeters = (row['srcMeters'] as num?)?.toDouble() ?? meters;
    final srcWaste = (row['srcWaste'] as num?)?.toDouble() ?? waste;
    final srcCpsx = (row['srcCpsx'] as num?)?.toDouble() ?? cpsx;
    final srcMatPrice = (row['srcMatPrice'] as num?)?.toDouble() ?? matPrice;

    const s = TextStyle(fontSize: 11);
    final matIdHienLuc = ov['materialId'] as String? ?? materialId;
    final matTenHienLuc = ov['mat'] as String? ?? mat;
    final daDoiVL = ov['materialId'] != null;
    final rawGoc = _giaNVLGoc(matIdHienLuc, matTenHienLuc);
    final rawMatPrice =
        (ov['rawMatPrice'] as num?)?.toDouble() ?? rawGoc;

    return [
      TableCellData(stage,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      _vatLieuCell(
        rowKey: rowKey,
        giaTriGocId: materialId,
        giaTriGocTen: mat,
        tenHienThi: _tenVatLieu(matIdHienLuc, matTenHienLuc),
        daDoi: daDoiVL,
      ),
      _doDayCell(
        rowKey: rowKey,
        matIdHienLuc: matIdHienLuc,
        giaTriGocId: materialId,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'width',
        display: width,
        source: srcWidth,
        soLe: 3,
        ov: ov,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'meters',
        display: meters,
        source: srcMeters,
        soLe: 0,
        ov: ov,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'waste',
        display: waste,
        source: srcWaste,
        soLe: 0,
        ov: ov,
      ),
      TableCellData(Fmt.n(inputVL),
          align: TextAlign.right,
          style: const TextStyle(
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
      ),
      TableCellData(Fmt.n(costCPSX), align: TextAlign.right, style: s),
      _editCell(
        rowKey: rowKey,
        field: 'rawMatPrice',
        display: rawMatPrice,
        source: rawGoc,
        soLe: 0,
        ov: ov,
      ),
      _editCell(
        rowKey: rowKey,
        field: 'matPrice',
        display: matPrice ?? 0,
        source: srcMatPrice ?? 0,
        soLe: 1,
        ov: ov,
        anKhiRong: matPrice == null,
      ),
      TableCellData(costMat != null ? Fmt.n(costMat) : '—',
          align: TextAlign.right, style: s),
    ];
  }

  /// Giá NVL gốc (đ/kg) — tra catalog, fallback heuristic tên (mirror web).
  double _giaNVLGoc(String? matId, String matName) {
    final m = matId != null ? _timVatLieu(matId) : null;
    if (m != null) return m.pricePerKg;
    for (final x in s.materials) {
      if (x.name == matName) return x.pricePerKg;
    }
    final u = matName.toUpperCase();
    if (u.contains('MPET')) return 55000;
    if (u.contains('PET')) return 45000;
    if (u.contains('LLDPE') || u == 'PE') return 40000;
    return 0;
  }

  TableCellData _vatLieuCell({
    required String rowKey,
    int? chiTietIndex,
    required String? giaTriGocId,
    required String giaTriGocTen,
    required String tenHienThi,
    required bool daDoi,
  }) {
    final style = TextStyle(
      fontSize: 11,
      fontWeight: daDoi ? FontWeight.w700 : FontWeight.w400,
      color: daDoi ? AppColors.warning : null,
      decoration: daDoi ? TextDecoration.underline : null,
    );
    if (!widget.duocSua || (giaTriGocId == null && chiTietIndex == null)) {
      return TableCellData(tenHienThi, style: style);
    }
    return TableCellData(
      '$tenHienThi ✎',
      style: style,
      onTap: () => _chonVatLieu(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        giaTriGocId: giaTriGocId,
        giaTriGocTen: giaTriGocTen,
      ),
    );
  }

  /// Ô độ dày: LLDPE/adjustableMic → nhập tay; VL có biến thể nhóm → chọn;
  /// còn lại read-only (mirror web ODoDay).
  TableCellData _doDayCell({
    required String rowKey,
    int? chiTietIndex,
    required String? matIdHienLuc,
    required String? giaTriGocId,
  }) {
    final mat = matIdHienLuc != null ? _timVatLieu(matIdHienLuc) : null;
    final ov = _current[rowKey] ?? const {};
    final detailOv = chiTietIndex != null
        ? ((ov['detailOverrides'] as Map?)?['$chiTietIndex'] as Map?)
                ?.cast<String, dynamic>() ??
            const {}
        : const {};
    final doDayOv = chiTietIndex != null
        ? (detailOv['doDay'] as num?)?.toDouble()
        : (ov['doDay'] as num?)?.toDouble();
    final doDayGoc = mat?.thickness ?? 0;
    final hienThi = doDayOv ?? doDayGoc;
    final daDoi = doDayOv != null;

    if (mat == null || !widget.duocSua) {
      return TableCellData(mat == null ? '—' : nhanDoDay(hienThi),
          align: TextAlign.right,
          style: TextStyle(
              fontSize: 11,
              fontWeight: daDoi ? FontWeight.w700 : FontWeight.w400,
              color: daDoi ? AppColors.warning : null));
    }
    final choSuaTay = mat.adjustableMic == true &&
        (mat.pricePerM2 == null ||
            (mat.pricePerM2! - (mat.pricePerKg * mat.thickness * mat.density / 1000))
                    .abs() <
                0.001);
    final bienThe = bienTheCungNhom(s.materials, mat);
    final choChon = !choSuaTay && bienThe.isNotEmpty;

    if (!choSuaTay && !choChon) {
      return TableCellData(nhanDoDay(hienThi),
          align: TextAlign.right, style: const TextStyle(fontSize: 11));
    }
    return TableCellData(
      '${nhanDoDay(hienThi)} ✎',
      align: TextAlign.right,
      style: TextStyle(
          fontSize: 11,
          fontWeight: daDoi ? FontWeight.w700 : FontWeight.w400,
          color: daDoi ? AppColors.warning : null,
          decoration: daDoi ? TextDecoration.underline : null),
      onTap: () => _suaDoDay(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        matIdHienLuc: matIdHienLuc,
        giaTriGocId: giaTriGocId,
        choSuaTay: choSuaTay,
        bienThe: bienThe,
      ),
    );
  }

  TableCellData _editCell({
    required String rowKey,
    int? chiTietIndex,
    required String field,
    required double display,
    required double source,
    required int soLe,
    required Map<String, dynamic> ov,
    bool anKhiRong = false,
  }) {
    final daGhiDe = ov[field] != null;
    if (anKhiRong) {
      return const TableCellData('—',
          align: TextAlign.right, style: TextStyle(fontSize: 11));
    }
    if (!widget.duocSua) {
      return TableCellData(
        Fmt.d1(display),
        align: TextAlign.right,
        style: TextStyle(
            fontSize: 11,
            fontWeight: daGhiDe ? FontWeight.w700 : FontWeight.w400,
            color: daGhiDe ? AppColors.warning : null),
      );
    }
    return TableCellData(
      Fmt.d1(display),
      align: TextAlign.right,
      onTap: () => _suaO(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
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

  /// Chọn vật liệu cho dòng/chi tiết — mirror `OChonVatLieuDong/ChiTiet`.
  Future<void> _chonVatLieu({
    required String rowKey,
    int? chiTietIndex,
    required String? giaTriGocId,
    required String giaTriGocTen,
  }) async {
    final options = s.materials.where((m) => m.id != giaTriGocId).toList();
    // Sentinel: 'RESET' = chọn VL gốc (xoá ghi đè); null = đóng sheet (huỷ).
    final chon = await showModalBottomSheet<Object?>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(14),
              child: Text('Chọn vật liệu — $rowKey',
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w800)),
            ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: [
                  ListTile(
                    dense: true,
                    title: Text('${_tenVatLieu(giaTriGocId, giaTriGocTen)} '
                        '(gốc)'),
                    onTap: () => Navigator.pop(ctx, 'RESET'),
                  ),
                  for (final m in options)
                    ListTile(
                      dense: true,
                      title: Text('${m.name} · ${nhanDoDay(m.thickness)}'),
                      subtitle: Text(
                          '${Fmt.n(m.pricePerKg.round())} đ/kg'),
                      onTap: () => Navigator.pop(ctx, m),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
    if (chon == null || !mounted) return;
    final next = apDungVatLieuGhiDe(
      current: _current,
      rowKey: rowKey,
      chiTietIndex: chiTietIndex,
      giaTriGocId: giaTriGocId,
      mat: chon is MaterialDef ? chon : null,
      engineParams: _engineParams,
    );
    _setBang(next);
  }

  /// Sửa độ dày — nhập tay (LLDPE) hoặc chọn biến thể nhóm.
  Future<void> _suaDoDay({
    required String rowKey,
    int? chiTietIndex,
    required String? matIdHienLuc,
    required String? giaTriGocId,
    required bool choSuaTay,
    required List<MaterialDef> bienThe,
  }) async {
    final mat = matIdHienLuc != null ? _timVatLieu(matIdHienLuc) : null;
    final doDayGoc = mat?.thickness ?? 0;
    double? chonDoDay;
    if (choSuaTay) {
      final ctrl = TextEditingController(text: doDayGoc.round().toString());
      chonDoDay = await showModalBottomSheet<double?>(
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
              const Text('Sửa độ dày (mic)',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                autofocus: true,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    isDense: true, border: OutlineInputBorder()),
                onSubmitted: (v) =>
                    Navigator.pop(ctx, double.tryParse(v)),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx, -1.0),
                    child: const Text('Xoá ghi đè'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () =>
                        Navigator.pop(ctx, double.tryParse(ctrl.text)),
                    child: const Text('Lưu'),
                  ),
                ),
              ]),
            ],
          ),
        ),
      );
      if (chonDoDay == null) return;
      if (chonDoDay < 0) {
        _ghiDoDay(rowKey, chiTietIndex, null, null, giaTriGocId);
        return;
      }
      final raw = _rawGiaNVLHienLuc(rowKey, chiTietIndex, matIdHienLuc);
      final m2 = mat != null
          ? raw * chonDoDay * mat.density / 1000
          : null;
      _ghiDoDay(rowKey, chiTietIndex, chonDoDay, m2, giaTriGocId);
      return;
    }
    // Chọn biến thể cùng nhóm khác độ dày.
    final chon = await showModalBottomSheet<MaterialDef?>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            for (final m in bienThe)
              ListTile(
                dense: true,
                title: Text('${m.name} · ${nhanDoDay(m.thickness)}'),
                subtitle: Text('${Fmt.n(m.pricePerKg.round())} đ/kg'),
                onTap: () => Navigator.pop(ctx, m),
              ),
          ],
        ),
      ),
    );
    if (chon == null || !mounted) return;
    // Đổi sang biến thể khác → áp dụng như đổi vật liệu.
    final next = apDungVatLieuGhiDe(
      current: _current,
      rowKey: rowKey,
      chiTietIndex: chiTietIndex,
      giaTriGocId: giaTriGocId,
      mat: chon,
      engineParams: _engineParams,
    );
    _setBang(next);
  }

  double _rawGiaNVLHienLuc(
      String rowKey, int? chiTietIndex, String? matId) {
    final ov = _current[rowKey] ?? const {};
    if (chiTietIndex != null) {
      final d = ((ov['detailOverrides'] as Map?)?['$chiTietIndex'] as Map?)
              ?.cast<String, dynamic>() ??
          const {};
      final v = (d['rawMatPrice'] as num?)?.toDouble();
      if (v != null) return v;
    } else {
      final v = (ov['rawMatPrice'] as num?)?.toDouble();
      if (v != null) return v;
    }
    return matId != null ? (_timVatLieu(matId)?.pricePerKg ?? 0) : 0;
  }

  void _ghiDoDay(String rowKey, int? chiTietIndex, double? doDay, double? matPrice,
      String? giaTriGocId) {
    if (chiTietIndex != null) {
      var next = datGhiDeChiTiet(_current, rowKey, chiTietIndex, 'doDay', doDay);
      next = datGhiDeChiTiet(
          next, rowKey, chiTietIndex, 'matPrice', matPrice);
      _setBang(next);
      return;
    }
    var next = ghiDeDong(_current, rowKey, 'doDay', doDay);
    next = ghiDeDong(next, rowKey, 'matPrice', matPrice);
    _setBang(next);
  }

  /// Bottom-sheet sửa 1 ô ghi đè (mobile thay click-inline web).
  /// Nhập rỗng hoặc = giá gốc → xoá ghi đè (mirror `OCoTheGhiDe.xacNhan`).
  /// Trả về: null = huỷ (đóng sheet), sentinel _xoaGhiDe = xoá, số = giá trị mới.
  static const _xoaGhiDe = -1.0; // sentinel "xoá ghi đè" (giá không bao giờ âm)

  Future<void> _suaO({
    required String rowKey,
    int? chiTietIndex,
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
    if (chiTietIndex != null) {
      if (kq == _xoaGhiDe) {
        _setBang(datGhiDeChiTiet(
            _current, rowKey, chiTietIndex, field, null));
        return;
      }
      final giaTri = ((kq - goc).abs() < 0.001 || kq < 0) ? null : kq;
      _setBang(datGhiDeChiTiet(
          _current, rowKey, chiTietIndex, field, giaTri));
      // rawMatPrice đổi → tính lại matPrice (mirror web onAfterSet).
      if (field == 'rawMatPrice' && giaTri != null) {
        final matId = _matIdChiTiet(rowKey, chiTietIndex);
        final mat = matId != null ? _timVatLieu(matId) : null;
        if (mat != null && mat.thickness > 0 && mat.density > 0) {
          final m2 = giaTri * mat.thickness * mat.density / 1000;
          _setBang(datGhiDeChiTiet(
              _current, rowKey, chiTietIndex, 'matPrice', m2));
        }
      }
      return;
    }
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
      if (field == 'rawMatPrice') {
        final matId = _current[rowKey]?['materialId'] as String?;
        final mat = matId != null ? _timVatLieu(matId) : null;
        if (mat != null && mat.thickness > 0 && mat.density > 0) {
          _setOv(rowKey, 'matPrice',
              kq * mat.thickness * mat.density / 1000);
        }
      }
    }
  }

  String? _matIdChiTiet(String rowKey, int chiTietIndex) {
    final ov = _current[rowKey];
    final d = ((ov?['detailOverrides'] as Map?)?['$chiTietIndex'] as Map?)
        ?.cast<String, dynamic>();
    return d?['materialId'] as String?;
  }
}

class _ProfitRateRow extends StatefulWidget {
  final bool duocSua;
  final double pct;
  final double macDinhPct;
  final ValueChanged<double> onChanged;
  final double ln;
  const _ProfitRateRow({
    required this.duocSua,
    required this.pct,
    required this.macDinhPct,
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
            decoration: InputDecoration(
              isDense: true,
              suffixText: '%',
              border: const OutlineInputBorder(),
              hintText: widget.macDinhPct.toString(),
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
