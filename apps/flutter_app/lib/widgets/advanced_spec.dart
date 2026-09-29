// ═══════════════════════════════════════════════════════════════════════════
// AdvancedSpecSection — Đặc tả kỹ thuật nâng cao (P4).
// Mirror `BangDacTaNangCao` + `BangDacTaNangCaoGhiDe` (ManHinhQuanLy.tsx):
//   • Bảng 1: Vật liệu + mực/DM/keo (lapDongVatLieuNangCao)
//   • Bảng 2: Thời gian SX × (NC + điện) — lọc cột theo quyền CPSX NC
//   • Cụm 3 dòng tổng + tỷ lệ LN + chênh lệch
// Công thức do engine bundle tính; Dart chỉ render + gửi ghi đè.
// Mobile: bấm ô để sửa qua bottom-sheet (thay click-inline web).
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
import 'lts/lts_toast.dart';

class AdvancedSpecSection extends StatefulWidget {
  final AppState state;
  final bool isSale;
  final bool duocSua; // theo quyền PRICING_SHEET_ADVISOR
  const AdvancedSpecSection(
      {super.key,
      required this.state,
      required this.isSale,
      this.duocSua = true});

  @override
  State<AdvancedSpecSection> createState() => _AdvancedSpecSectionState();
}

class _AdvancedSpecSectionState extends State<AdvancedSpecSection> {
  AppState get s => widget.state;
  bool get isSale => widget.isSale;

  Map<String, Map<String, dynamic>> get _current =>
      isSale ? s.saleOverrides : s.adminOverrides;

  double get _profitPct =>
      isSale ? s.saleProfitRatePct : s.adminProfitRatePct;

  void _setBang(OverrideTableRef next) {
    if (isSale) {
      s.setSaleOverrides(next);
    } else {
      s.setAdminOverrides(next);
    }
  }

  void _setOv(String rowKey, String field, dynamic value) {
    if (isSale) {
      s.setSaleOverride(rowKey, field, value);
    } else {
      s.setAdminOverride(rowKey, field, value);
    }
  }

  /// Engine params cho đổi vật liệu dòng In (tính lại CPSX mực).
  Map<String, dynamic> get _engineParams {
    final r = s.currentResult;
    final inp = r == null
        ? <String, dynamic>{}
        : ((r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw);
    final isPrintFilm = inp['productType'] == 'mang' && inp['filmType'] == 'mangIn';
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

    final input = (r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw;
    final meta = getPricingDisplayMeta(input);
    final uniRows = s.uniRowsChuan();
    if (uniRows.isEmpty) return const SizedBox.shrink();

    final activeOv = _current;
    // Mirror web BangDacTaNangCaoGhiDe: chỉ truyền activeOv, không truyền nguồn.
    const sourceOv = <String, Map<String, dynamic>>{};
    final profitPct = _profitPct;

    // Cột Bảng 2 hiện theo quyền CPSX nâng cao (mirror web cotBang2TheoQuyen).
    final cot = s.cotBang2TheoQuyen;
    final hienBang2 = cot.coLuong || cot.coDien;

    List<dynamic> dongVatLieu;
    List<dynamic> dongVatLieuGoc;
    List<dynamic> dongNCD;
    List<dynamic> dongNCDGoc;
    Map<String, dynamic> tongGoc;
    Map<String, dynamic> tong;
    try {
      final ea = EngineAdvanced.instance;
      final uniChuanGoc = ea.chuanBiUniRowsNangCao(
          uniRows: uniRows, result: r, hangSo: s.hangSoNangCao);
      final uniChuanXuLy = ea.chuanBiUniRowsNangCao(
          uniRows: uniRows,
          result: r,
          hangSo: s.hangSoNangCao,
          sourceOv: sourceOv,
          activeOv: activeOv);
      dongVatLieuGoc = ea.lapDongVatLieuNangCao(
          result: r,
          uniRows: uniChuanGoc,
          hangSo: s.hangSoNangCao,
          materials: s.materials);
      dongVatLieu = ea.lapDongVatLieuNangCao(
          result: r,
          uniRows: uniChuanXuLy,
          hangSo: s.hangSoNangCao,
          materials: s.materials,
          overrides: activeOv.isEmpty ? null : activeOv);
      dongNCDGoc =
          ea.lapDongNhanCongDien(result: r, hangSo: s.hangSoNangCao);
      dongNCD = ea.lapDongNhanCongDien(
          result: r,
          hangSo: s.hangSoNangCao,
          overrides: activeOv.isEmpty ? null : activeOv);
      tongGoc = ea.tinhTongNangCao(dongVatLieuGoc, dongNCDGoc);
      tong = ea.tinhTongNangCao(dongVatLieu, dongNCD);
    } catch (_) {
      return const SizedBox.shrink();
    }

    final tongVatLieu = (tong['tongVatLieu'] as num?)?.toDouble() ?? 0;
    final tongNCD = (tong['tongNhanCongDien'] as num?)?.toDouble() ?? 0;
    final tongGiaThanh = (tong['tongGiaThanh'] as num?)?.toDouble() ?? 0;
    final tongGiaThanhGoc =
        (tongGoc['tongGiaThanh'] as num?)?.toDouble() ?? tongGiaThanh;
    final soLuong = (input['quantity'] as num?)?.toDouble() ?? 0;
    final donVi = meta.unit;
    final coThayDoi = activeOv.isNotEmpty || profitPct > 0;
    final ln = tongGiaThanh * (profitPct / 100);
    final chenhLech =
        soLuong > 0 ? (tongGiaThanh - tongGiaThanhGoc) / soLuong : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: [
          Text(isSale ? '💼 Thay đổi từ Sale' : '👑 Thay đổi từ Admin',
              style:
                  const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
          const Spacer(),
          if (!widget.duocSua)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
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
            ),
        ]),
        const SizedBox(height: 8),

        // ═══ Bảng 1: Vật liệu + mực/DM/keo ═══
        ExpandableTableCard(
          title: 'Bảng 1 — Vật liệu & mực/DM/keo',
          subtitle: 'Công đoạn · Khổ · Mét · CP vật liệu · Mực-DM-Keo-Khác',
          icon: Icons.inventory_2_outlined,
          iconColor: AppColors.accent,
          dense: true,
          columns: const [
            TableColumn('Công đoạn', minWidth: 95),
            TableColumn('Vật liệu', minWidth: 95),
            TableColumn('Độ dày (mic)', minWidth: 60, align: TextAlign.right),
            TableColumn('Khổ (m)', minWidth: 60, align: TextAlign.right),
            TableColumn('Thành phẩm', minWidth: 70, align: TextAlign.right),
            TableColumn('Phi hao', minWidth: 60, align: TextAlign.right),
            TableColumn('ĐV NVL', minWidth: 70, align: TextAlign.right),
            TableColumn('CP VL (đ/m²)', minWidth: 75, align: TextAlign.right),
            TableColumn('TT CPNVL', minWidth: 80, align: TextAlign.right),
            TableColumn('Giá mực, DM, keo, khác (đ/m²)', minWidth: 110, align: TextAlign.right),
            TableColumn('Thành tiền mực, DM, keo, khác', minWidth: 110, align: TextAlign.right),
          ],
          rows: [
            for (final row in dongVatLieu)
              _rowVatLieu((row as Map).cast<String, dynamic>(), dongVatLieuGoc),
          ],
        ),
        const SizedBox(height: 10),

        // ═══ Bảng 2: Nhân công + điện (cột theo quyền CPSX NC) ═══
        if (hienBang2) ...[
          ExpandableTableCard(
            title: 'Bảng 2 — Nhân công & điện',
            subtitle: 'Thời gian SX · CP nhân công · CP điện',
            icon: Icons.electric_bolt_outlined,
            iconColor: AppColors.info,
            dense: true,
            columns: [
              const TableColumn('Công đoạn', minWidth: 110),
              if (cot.coThoiGian)
                const TableColumn('Thời gian (phút)',
                    minWidth: 85, align: TextAlign.right),
              if (cot.coLuong) ...[
                const TableColumn('Giá NC (đ/phút)',
                    minWidth: 85, align: TextAlign.right),
                const TableColumn('TT nhân công',
                    minWidth: 85, align: TextAlign.right),
              ],
              if (cot.coDien) ...[
                const TableColumn('Giá điện (đ/phút)',
                    minWidth: 85, align: TextAlign.right),
                const TableColumn('TT điện',
                    minWidth: 80, align: TextAlign.right),
              ],
            ],
            rows: [
              for (var i = 0; i < dongNCD.length; i++)
                _rowNCD(
                    (dongNCD[i] as Map).cast<String, dynamic>(),
                    i < dongNCDGoc.length
                        ? (dongNCDGoc[i] as Map).cast<String, dynamic>()
                        : const {},
                    cot),
              // Dòng tổng nhân công / điện (mirror web total-row).
              [
                const TableCellData('Tổng nhân công / điện',
                    style: TextStyle(
                        fontSize: 11.5, fontWeight: FontWeight.w800)),
                if (cot.coThoiGian) const TableCellData(''),
                if (cot.coLuong) ...[
                  const TableCellData(''),
                  TableCellData(Fmt.n(_tongNCD(dongNCD, 'thanhTienNhanCong')),
                      align: TextAlign.right,
                      style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: AppColors.accent)),
                ],
                if (cot.coDien) ...[
                  const TableCellData(''),
                  TableCellData(Fmt.n(_tongNCD(dongNCD, 'thanhTienDien')),
                      align: TextAlign.right,
                      style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: AppColors.accent)),
                ],
              ],
            ],
          ),
          const SizedBox(height: 12),
        ],

        // ═══ Cụm 3 dòng tổng ═══
        _TotalRow(
          label: 'Tổng thành tiền CP Vật liệu',
          sub: '(nguyên vật liệu + dung môi + keo ghép + khác)',
          value: '${Fmt.n(tongVatLieu)} đ',
        ),
        _TotalRow(
          label: 'Tổng thành tiền chi phí Nhân công + điện',
          value: '${Fmt.n(tongNCD)} đ',
          highlight: ((tong['tongNhanCongDien'] as num?) ?? 0) !=
              ((tongGoc['tongNhanCongDien'] as num?) ?? 0),
        ),
        _TotalRow(
          label: 'Tổng giá thành sản xuất cơ bản',
          value: '${Fmt.n(tongGiaThanh)} đ',
          highlight: coThayDoi,
          grand: true,
        ),
        const SizedBox(height: 10),
        _ProfitRateRow(
          duocSua: widget.duocSua,
          pct: profitPct,
          macDinhPct: isSale
              ? s.saleTyLeLoiNhuanMacDinh
              : s.adminTyLeLoiNhuanMacDinh,
          ln: ln,
          onChanged: (v) =>
              isSale ? s.setSaleProfitRatePct(v) : s.setAdminProfitRatePct(v),
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
                  color:
                      (chenhLech > 0 ? AppColors.success : AppColors.danger)
                          .withValues(alpha: 0.3)),
            ),
            child: Text(
              'CHÊNH LỆCH SO VỚI GIÁ GỐC: ${chenhLech > 0 ? '+' : ''}${Fmt.n(chenhLech)} Đ/${donVi.toUpperCase()}',
              style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: chenhLech > 0
                      ? AppColors.success
                      : AppColors.danger),
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
              style: FilledButton.styleFrom(backgroundColor: AppColors.success),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _luuThayDoi() async {
    if (s.currentResult == null) return;
    await s.saveCurrentToHistory(force: true);
    if (!mounted) return;
    LtsToast.show(context, 'Đã lưu thay đổi', type: LtsToastType.success);
  }

  // ── Bảng 1 ────────────────────────────────────────────────────────────────
  List<TableCellData> _rowVatLieu(
      Map<String, dynamic> row, List<dynamic> dongGocList) {
    final rowKey = (row['rowKey'] as String?) ?? '';
    final chiTietIndex = (row['chiTietIndex'] as num?)?.toInt();
    final goc = _timDongGoc(dongGocList, rowKey, chiTietIndex);

    final ovDong = _current[rowKey];
    final ovChiTiet = chiTietIndex != null
        ? ((ovDong?['detailOverrides'] as Map?)?['$chiTietIndex'] as Map?)
            ?.cast<String, dynamic>()
        : null;

    final laSynthetic = rowKey == 'matte' || rowKey == 'chia';
    final laGc = row['isGiaCongNgoai'] == true;
    final suaT1 = widget.duocSua && !laSynthetic && !laGc;

    final vatLieu = (row['vatLieu'] as String?) ?? '—';
    final gocVatLieu = (goc?['vatLieu'] as String?) ?? vatLieu;

    final idHienLuc = (chiTietIndex != null
            ? (ovChiTiet?['materialId'] as String?)
            : (ovDong?['materialId'] as String?)) ??
        (row['materialId'] as String?);
    final matHienLuc = _timVatLieu(idHienLuc);
    final gocId = (goc?['materialId'] as String?) ?? (row['materialId'] as String?);

    final doDayGoc = (row['doDay'] as num?)?.toDouble() ?? matHienLuc?.thickness ?? 0;
    final doDayGhiDe = chiTietIndex != null
        ? (ovChiTiet?['doDay'] as num?)?.toDouble()
        : (ovDong?['doDay'] as num?)?.toDouble();
    final doDayHienThi = doDayGhiDe ?? doDayGoc;
    final daDoiDoDay = doDayGhiDe != null;

    // Giá NVL hiển thị phụ (ưu tiên ghi đè → row.giaNVL) — mirror web.
    final rawGiaNVLHienThi = (chiTietIndex != null
            ? (ovChiTiet?['rawMatPrice'] as num?)?.toDouble()
            : (ovDong?['rawMatPrice'] as num?)?.toDouble()) ??
        (row['giaNVL'] as num?)?.toDouble() ??
        0;
    // Giá NVL theo catalog (đ/kg) — dùng để quy đổi matPrice khi sửa độ dày.
    final rawMatPriceHienLuc = (chiTietIndex != null
            ? (ovChiTiet?['rawMatPrice'] as num?)?.toDouble()
            : (ovDong?['rawMatPrice'] as num?)?.toDouble()) ??
        (matHienLuc?.pricePerKg ?? 0);

    final cpVl = (row['cpVatLieu'] as num?)?.toDouble();
    final cpVlGhiDe = chiTietIndex != null
        ? (ovChiTiet?['matPrice'] as num?)?.toDouble()
        : (ovDong?['matPrice'] as num?)?.toDouble();
    final donViPhu = row['donViGiaNVL'] as String?; // 'kg' | 'm' | null
    final rawPhuGhiDe = chiTietIndex != null
        ? (ovChiTiet?['rawMatPrice'] as num?)?.toDouble()
        : (ovDong?['rawMatPrice'] as num?)?.toDouble();
    // Hiện giá phụ (đ/kg | đ/m) khi có giá NVL hiệu lực > 0.
    final hienPhu = rawGiaNVLHienThi > 0;

    final cpMuc = (row['cpMucKeo'] as num?)?.toDouble();
    final cpMucGhiDe = ovDong?['cpMucKeoPerM2'] as num?;
    final cpMucHienThi = cpMucGhiDe?.toDouble() ?? cpMuc;
    final daDoiMuc = cpMucGhiDe != null;
    // Dòng gia công (chỉ xem): chuỗi hiển thị sẵn (vd "2.000(GC)").
    final cpMucKeoText = row['cpMucKeoText'] as String?;

    const s11 = TextStyle(fontSize: 11);

    return [
      TableCellData((row['congDoan'] as String?) ?? '',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      _vatLieuCell(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        laSynthetic: laSynthetic,
        suaT1: suaT1,
        tenHienThi: _tenVatLieu(
            idHienLuc, (row['vatLieu'] as String?) ?? gocVatLieu),
        gocId: gocId,
        gocTen: gocVatLieu,
        daDoi: ovChiTiet?['materialId'] != null || ovDong?['materialId'] != null,
      ),
      laSynthetic
          ? _numCell('—', null)
          : _doDayCell(
              rowKey: rowKey,
              chiTietIndex: chiTietIndex,
              matIdHienLuc: idHienLuc,
              gocId: gocId,
              doDayHienThi: doDayHienThi,
              daDoi: daDoiDoDay,
              suaT1: suaT1,
              rawHienLuc: rawMatPriceHienLuc,
            ),
      _soCell(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        field: 'width',
        label: 'Khổ màng',
        text: (row['khoMangLabel'] as String?) ??
            Fmt.d3((row['khoMang'] as num?)?.toDouble() ?? 0),
        goc: (goc?['khoMang'] as num?)?.toDouble() ??
            (row['khoMang'] as num?)?.toDouble() ??
            0,
        hienTai: (row['khoMang'] as num?)?.toDouble() ?? 0,
        soLe: 3,
        ovDong: ovDong,
        ovChiTiet: ovChiTiet,
        choSua: suaT1 && row['khoMangLabel'] == null,
      ),
      _soCell(
        rowKey: rowKey,
        chiTietIndex: null,
        field: 'meters',
        label: 'Thành phẩm',
        text: (row['thanhPhamLabel'] as String?) ??
            Fmt.n((row['thanhPham'] as num?)?.toDouble() ?? 0),
        goc: (goc?['thanhPham'] as num?)?.toDouble() ??
            (row['thanhPham'] as num?)?.toDouble() ??
            0,
        hienTai: (row['thanhPham'] as num?)?.toDouble() ?? 0,
        soLe: 0,
        ovDong: ovDong,
        ovChiTiet: ovChiTiet,
        choSua: suaT1 && row['thanhPhamLabel'] == null,
      ),
      _soCell(
        rowKey: rowKey,
        chiTietIndex: null,
        field: 'waste',
        label: 'Phi hao',
        text: Fmt.n((row['phiHao'] as num?)?.toDouble() ?? 0),
        goc: (goc?['phiHao'] as num?)?.toDouble() ??
            (row['phiHao'] as num?)?.toDouble() ??
            0,
        hienTai: (row['phiHao'] as num?)?.toDouble() ?? 0,
        soLe: 0,
        ovDong: ovDong,
        ovChiTiet: ovChiTiet,
        choSua: suaT1,
      ),
      TableCellData(
        (row['dauVaoNvlLabel'] as String?) ??
            Fmt.n((row['dauVaoNVL'] as num?)?.toDouble() ?? 0),
        align: TextAlign.right,
        style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.accent),
      ),
      _cpVlCell(
        row: row,
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        laSynthetic: laSynthetic,
        laGc: laGc,
        suaT1: suaT1,
        cpVl: cpVl,
        cpVlGhiDe: cpVlGhiDe,
        donViPhu: donViPhu,
        rawHienLuc: rawGiaNVLHienThi,
        rawGhiDe: rawPhuGhiDe,
        hienPhu: hienPhu,
      ),
      _numCell(Fmt.n((row['thanhTienNVL'] as num?)?.toDouble() ?? 0), s11),
      // Dòng gia công: cho sửa giá GC (kể cả dòng Chia/Lật mặt synthetic).
      // cpMuc = 0 (vd chỉ gắn quai) → không ghi đè để tránh mất thành tiền khác.
      (widget.duocSua && laGc && cpMuc != null && cpMuc > 0)
          ? _soCell(
              rowKey: rowKey,
              chiTietIndex: null,
              field: 'cpMucKeoPerM2',
              label: 'Giá mực, DM, keo, khác',
              text: '${Fmt.d1(cpMucHienThi ?? 0)}(GC)',
              goc: (goc?['cpMucKeo'] as num?)?.toDouble() ?? 0,
              hienTai: cpMucHienThi ?? 0,
              soLe: 1,
              ovDong: ovDong,
              ovChiTiet: null,
              choSua: true,
              highlight: daDoiMuc,
            )
          : (cpMucKeoText != null)
          ? TableCellData(cpMucKeoText,
              align: TextAlign.right, style: s11)
          : (cpMuc != null && !laSynthetic)
          ? _soCell(
              rowKey: rowKey,
              chiTietIndex: null,
              field: 'cpMucKeoPerM2',
              label: 'Giá mực, DM, keo, khác',
              text: cpMucHienThi == null ? '—' : Fmt.d1(cpMucHienThi),
              goc: (goc?['cpMucKeo'] as num?)?.toDouble() ?? 0,
              hienTai: cpMucHienThi ?? 0,
              soLe: 1,
              ovDong: ovDong,
              ovChiTiet: null,
              choSua: suaT1,
              highlight: daDoiMuc,
            )
          : TableCellData(cpMuc == null ? '—' : Fmt.d1(cpMuc),
              align: TextAlign.right, style: s11),
      _numCell(Fmt.n((row['thanhTienMucKeo'] as num?)?.toDouble() ?? 0), s11),
    ];
  }

  Map<String, dynamic>? _timDongGoc(
      List<dynamic> list, String rowKey, int? chiTietIndex) {
    for (final d in list) {
      final m = (d as Map).cast<String, dynamic>();
      if (m['rowKey'] != rowKey) continue;
      final idx = (m['chiTietIndex'] as num?)?.toInt();
      if (chiTietIndex == null || idx == chiTietIndex) return m;
    }
    return null;
  }

  String _tenVatLieu(String? id, String tenDuPhong) {
    final m = _timVatLieu(id);
    return m?.name ?? tenDuPhong;
  }

  TableCellData _vatLieuCell({
    required String rowKey,
    required int? chiTietIndex,
    required bool laSynthetic,
    required bool suaT1,
    required String tenHienThi,
    required String? gocId,
    required String gocTen,
    required bool daDoi,
  }) {
    final style = TextStyle(
      fontSize: 11,
      fontWeight: daDoi ? FontWeight.w700 : FontWeight.w400,
      color: daDoi ? AppColors.warning : null,
      decoration: daDoi ? TextDecoration.underline : null,
    );
    if (laSynthetic || !suaT1) {
      return TableCellData(tenHienThi, style: style);
    }
    return TableCellData(
      '$tenHienThi ✎',
      style: style,
      onTap: () => _chonVatLieu(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        gocId: gocId,
        gocTen: gocTen,
      ),
    );
  }

  TableCellData _doDayCell({
    required String rowKey,
    required int? chiTietIndex,
    required String? matIdHienLuc,
    required String? gocId,
    required double doDayHienThi,
    required bool daDoi,
    required bool suaT1,
    required double rawHienLuc,
  }) {
    final mat = _timVatLieu(matIdHienLuc);
    if (mat == null) return _numCell('—', null);
    final style = TextStyle(
        fontSize: 11,
        fontWeight: daDoi ? FontWeight.w700 : FontWeight.w400,
        color: daDoi ? AppColors.warning : null,
        decoration: daDoi ? TextDecoration.underline : null);
    // Mirror web ODoDay: chỉ cho sửa tay khi pricePerM2 là giá suy từ công thức.
    // A2: PA (nhóm PA) được nhập độ dày tự do trong bảng Sale/Admin — như LLDPE.
    final giaM2Suy = mat.pricePerKg * mat.thickness * mat.density / 1000;
    final choSuaTay = (mat.adjustableMic == true || laNhomPA(mat)) &&
        (mat.pricePerM2 == null || (mat.pricePerM2! - giaM2Suy).abs() < 0.001);
    final bienThe = bienTheCungNhom(s.materials, mat);
    final choChon = !choSuaTay && bienThe.isNotEmpty;
    if (!suaT1 || (!choSuaTay && !choChon)) {
      return TableCellData(nhanDoDay(doDayHienThi),
          align: TextAlign.right,
          style: TextStyle(
              fontSize: 11,
              fontWeight: daDoi ? FontWeight.w700 : FontWeight.w400,
              color: daDoi ? AppColors.warning : null));
    }
    return TableCellData(
      '${nhanDoDay(doDayHienThi)} ✎',
      align: TextAlign.right,
      style: style,
      onTap: () => _suaDoDay(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        mat: mat,
        gocId: gocId,
        choSuaTay: choSuaTay,
        bienThe: bienThe,
        rawHienLuc: rawHienLuc,
      ),
    );
  }

  /// Ô số có thể sửa (mirror `OCoTheGhiDe` / `OChiTietCoTheGhiDe`).
  TableCellData _soCell({
    required String rowKey,
    required int? chiTietIndex,
    required String field,
    required String label,
    required String text,
    required double goc,
    required double hienTai,
    required int soLe,
    required Map<String, dynamic>? ovDong,
    required Map<String, dynamic>? ovChiTiet,
    required bool choSua,
    bool highlight = false,
  }) {
    final dynamic ovVal =
        chiTietIndex != null ? (ovChiTiet?[field]) : (ovDong?[field]);
    final daGhiDe = ovVal != null;
    final style = TextStyle(
      fontSize: 11,
      fontWeight: (daGhiDe || highlight) ? FontWeight.w700 : FontWeight.w400,
      color: (daGhiDe || highlight) ? AppColors.warning : null,
      decoration: (daGhiDe || highlight) ? TextDecoration.underline : null,
    );
    if (!choSua) {
      return TableCellData(text, align: TextAlign.right, style: style);
    }
    return TableCellData(
      '$text ✎',
      align: TextAlign.right,
      style: style,
      onTap: () => _suaSo(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        field: field,
        label: label,
        hienTai: hienTai,
        goc: goc,
        soLe: soLe,
      ),
    );
  }

  TableCellData _cpVlCell({
    required Map<String, dynamic> row,
    required String rowKey,
    required int? chiTietIndex,
    required bool laSynthetic,
    required bool laGc,
    required bool suaT1,
    required double? cpVl,
    required double? cpVlGhiDe,
    required String? donViPhu,
    required double rawHienLuc,
    required double? rawGhiDe,
    required bool hienPhu,
  }) {
    final coCp = cpVl != null;
    final daDoi = cpVlGhiDe != null || rawGhiDe != null;
    final style = TextStyle(
        fontSize: 11,
        fontWeight: daDoi ? FontWeight.w700 : FontWeight.w400,
        color: daDoi ? AppColors.warning : null,
        decoration: daDoi ? TextDecoration.underline : null);
    // Dòng gia công: chỉ hiện CP vật liệu + "(GC)", KHÔNG mở ngoặc giá NVL.
    if (laGc) {
      final cpVal = cpVlGhiDe ?? cpVl;
      final text = (coCp && (cpVal ?? 0) > 0)
          ? '${Fmt.d1(cpVal!)} (GC)'
          : (coCp ? '0,0 (GC)' : 'GC');
      if (coCp && widget.duocSua && !laSynthetic) {
        return TableCellData(
          '$text ✎',
          align: TextAlign.right,
          style: style,
          onTap: () => _suaCpVl(
            rowKey: rowKey,
            chiTietIndex: chiTietIndex,
            coCp: true,
            cpVl: cpVal,
            donViPhu: null,
            rawHien: 0,
            chiCp: true,
          ),
        );
      }
      return TableCellData(text, align: TextAlign.right, style: style);
    }
    if (!coCp && !hienPhu) {
      return const TableCellData('—',
          align: TextAlign.right, style: TextStyle(fontSize: 11));
    }
    final nhanDonViPhu = donViPhu == 'm' ? ' đ/m' : donViPhu == 'kg' ? '/kg' : '';
    final cpVal = cpVlGhiDe ?? cpVl;
    final buf = <String>[
      if (cpVal != null) Fmt.d1(cpVal),
      if (hienPhu)
        '(${Fmt.n(rawGhiDe ?? rawHienLuc)}$nhanDonViPhu)',
    ].join(' ');
    if (laSynthetic || !suaT1) {
      return TableCellData(buf, align: TextAlign.right, style: style);
    }
    return TableCellData(
      '$buf ✎',
      align: TextAlign.right,
      style: style,
      onTap: () => _suaCpVl(
        rowKey: rowKey,
        chiTietIndex: chiTietIndex,
        coCp: coCp,
        cpVl: cpVal,
        donViPhu: donViPhu,
        rawHien: rawHienLuc,
      ),
    );
  }

  TableCellData _numCell(String text, TextStyle? style) =>
      TableCellData(text, align: TextAlign.right, style: style ?? const TextStyle(fontSize: 11));

  List<TableCellData> _rowNCD(
      Map<String, dynamic> row,
      Map<String, dynamic> goc,
      ({bool coDien, bool coLuong, bool coThoiGian}) cot) {
    final rowKey = (row['rowKey'] as String?) ?? '';
    final ovDong = _current[rowKey];
    final laGc = row['isGiaCongNgoai'] == true;
    final suaTg = widget.duocSua && !laGc;
    const s11 = TextStyle(fontSize: 11);
    final tgGoc = (goc['thoiGianPhut'] as num?)?.toDouble() ??
        (row['thoiGianPhut'] as num?)?.toDouble() ??
        0;
    final tgHien = (row['thoiGianPhut'] as num?)?.toDouble() ?? 0;
    final daDoiTg = ovDong?['thoiGianPhut'] != null;

    return [
      TableCellData((row['congDoan'] as String?) ?? '',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      if (cot.coThoiGian)
        _soCell(
          rowKey: rowKey,
          chiTietIndex: null,
          field: 'thoiGianPhut',
          label: 'Thời gian SX',
          text: Fmt.n(tgHien),
          goc: tgGoc,
          hienTai: tgHien,
          soLe: 0,
          ovDong: ovDong,
          ovChiTiet: null,
          choSua: suaTg,
          highlight: daDoiTg,
        ),
      if (cot.coLuong) ...[
        TableCellData(Fmt.n((row['cpNhanCongPerPhut'] as num?)?.toDouble() ?? 0),
            align: TextAlign.right, style: s11),
        TableCellData(
            Fmt.n((row['thanhTienNhanCong'] as num?)?.toDouble() ?? 0),
            align: TextAlign.right,
            style: TextStyle(
                fontSize: 11,
                fontWeight: daDoiTg ? FontWeight.w700 : FontWeight.w400,
                color: daDoiTg ? AppColors.warning : null)),
      ],
      if (cot.coDien) ...[
        TableCellData(Fmt.n((row['cpDienPerPhut'] as num?)?.toDouble() ?? 0),
            align: TextAlign.right, style: s11),
        TableCellData(Fmt.n((row['thanhTienDien'] as num?)?.toDouble() ?? 0),
            align: TextAlign.right,
            style: TextStyle(
                fontSize: 11,
                fontWeight: daDoiTg ? FontWeight.w700 : FontWeight.w400,
                color: daDoiTg ? AppColors.warning : null)),
      ],
    ];
  }

  // ── Bottom sheets sửa ─────────────────────────────────────────────────────
  Future<void> _chonVatLieu({
    required String rowKey,
    required int? chiTietIndex,
    required String? gocId,
    required String gocTen,
  }) async {
    final options = s.materials.where((m) => m.id != gocId).toList();
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
                    title: Text('${_tenVatLieu(gocId, gocTen)} (gốc)'),
                    onTap: () => Navigator.pop(ctx, 'RESET'),
                  ),
                  for (final m in options)
                    ListTile(
                      dense: true,
                      title:
                          Text('${m.name} · ${nhanDoDay(m.thickness)}'),
                      subtitle: Text('${Fmt.n(m.pricePerKg.round())} đ/kg'),
                      onTap: () => Navigator.pop(ctx, m),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
    if (chon == null) return;
    final next = apDungVatLieuGhiDe(
      current: _current,
      rowKey: rowKey,
      chiTietIndex: chiTietIndex,
      giaTriGocId: gocId,
      mat: chon is MaterialDef ? chon : null,
      engineParams: _engineParams,
    );
    _setBang(next);
  }

  Future<void> _suaDoDay({
    required String rowKey,
    required int? chiTietIndex,
    required MaterialDef mat,
    required String? gocId,
    required bool choSuaTay,
    required List<MaterialDef> bienThe,
    required double rawHienLuc,
  }) async {
    if (choSuaTay) {
      final ctrl = TextEditingController(text: mat.thickness.round().toString());
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
              const Text('Sửa độ dày (mic)',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                autofocus: true,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    isDense: true, border: OutlineInputBorder()),
                onSubmitted: (v) => Navigator.pop(ctx, double.tryParse(v)),
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
      if (kq == null) return;
      if (kq < 0) {
        _ghiDoDay(rowKey, chiTietIndex, null, null);
        return;
      }
      final m2 = mat.density > 0
          ? rawHienLuc * kq * mat.density / 1000
          : null;
      _ghiDoDay(rowKey, chiTietIndex, kq, m2);
      return;
    }
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
    final next = apDungVatLieuGhiDe(
      current: _current,
      rowKey: rowKey,
      chiTietIndex: chiTietIndex,
      giaTriGocId: gocId,
      mat: chon,
      engineParams: _engineParams,
    );
    _setBang(next);
  }

  void _ghiDoDay(
      String rowKey, int? chiTietIndex, double? doDay, double? matPrice) {
    if (chiTietIndex != null) {
      var next = datGhiDeChiTiet(_current, rowKey, chiTietIndex, 'doDay', doDay);
      if (matPrice != null) {
        next = datGhiDeChiTiet(next, rowKey, chiTietIndex, 'matPrice', matPrice);
      }
      _setBang(next);
      return;
    }
    var next = ghiDeDong(_current, rowKey, 'doDay', doDay);
    if (matPrice != null) {
      next = ghiDeDong(next, rowKey, 'matPrice', matPrice);
    }
    _setBang(next);
  }

  Future<void> _suaSo({
    required String rowKey,
    required int? chiTietIndex,
    required String field,
    required String label,
    required double hienTai,
    required double goc,
    required int soLe,
  }) async {
    final ctrl = TextEditingController(
        text: hienTai == hienTai.roundToDouble()
            ? hienTai.round().toString()
            : hienTai.toString());
    final kq = await _sheetSo(
        ctrl: ctrl, title: '$label — $rowKey', goc: goc, soLe: soLe);
    if (kq == null) return;
    if (chiTietIndex != null) {
      if (kq == _xoaGhiDe) {
        _setBang(datGhiDeChiTiet(_current, rowKey, chiTietIndex, field, null));
        return;
      }
      final giaTri = ((kq - goc).abs() < 0.001 || kq < 0) ? null : kq;
      _setBang(datGhiDeChiTiet(_current, rowKey, chiTietIndex, field, giaTri));
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
    }
  }

  Future<void> _suaCpVl({
    required String rowKey,
    required int? chiTietIndex,
    required bool coCp,
    required double? cpVl,
    required String? donViPhu,
    required double rawHien,
    /// Dòng gia công: chỉ sửa CP vật liệu (đ/m²), không có giá NVL (đ/kg).
    bool chiCp = false,
  }) async {
    final ctrlCp = TextEditingController(
        text: cpVl == null ? '' : cpVl.toStringAsFixed(1));
    final ctrlRaw = TextEditingController(text: rawHien.round().toString());
    final nhanRaw = donViPhu == 'm' ? 'đ/m' : 'đ/kg';
    final kq = await showModalBottomSheet<String?>(
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
            Text('Sửa CP vật liệu — $rowKey',
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            if (coCp) ...[
              TextField(
                controller: ctrlCp,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                    isDense: true,
                    labelText: chiCp
                        ? 'CP vật liệu (đ/m²) — (GC)'
                        : 'CP vật liệu (đ/m²)',
                    border: const OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
            ],
            if (!chiCp)
              TextField(
                controller: ctrlRaw,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                    isDense: true,
                    labelText: 'Giá NVL ($nhanRaw)',
                    border: const OutlineInputBorder()),
              ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(ctx, 'RESET'),
                  child: const Text('Xoá ghi đè'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: () => Navigator.pop(ctx, 'SAVE'),
                  child: const Text('Lưu'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
    if (kq == null) return;
    if (kq == 'RESET') {
      if (chiTietIndex != null) {
        var next = datGhiDeChiTiet(_current, rowKey, chiTietIndex, 'matPrice', null);
        next = datGhiDeChiTiet(next, rowKey, chiTietIndex, 'rawMatPrice', null);
        _setBang(next);
      } else {
        var next = ghiDeDong(_current, rowKey, 'matPrice', null);
        next = ghiDeDong(next, rowKey, 'rawMatPrice', null);
        _setBang(next);
      }
      return;
    }
    final matPrice = coCp ? double.tryParse(ctrlCp.text.replaceAll(',', '.')) : null;
    final raw = chiCp ? null : double.tryParse(ctrlRaw.text.replaceAll(',', '.'));
    if (chiTietIndex != null) {
      var next = datGhiDeChiTiet(
          _current, rowKey, chiTietIndex, 'matPrice', matPrice);
      next = datGhiDeChiTiet(next, rowKey, chiTietIndex, 'rawMatPrice', raw);
      _setBang(next);
    } else {
      var next = ghiDeDong(_current, rowKey, 'matPrice', matPrice);
      next = ghiDeDong(next, rowKey, 'rawMatPrice', raw);
      _setBang(next);
    }
  }

  static const _xoaGhiDe = -1.0;

  Future<double?> _sheetSo({
    required TextEditingController ctrl,
    required String title,
    required double goc,
    required int soLe,
  }) {
    return showModalBottomSheet<double?>(
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
            Text(title,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
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
              onSubmitted: (v) =>
                  Navigator.pop(ctx, double.tryParse(v.replaceAll(',', '.'))),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton(
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
  }

  static double _tongNCD(List<dynamic> rows, String field) => rows.fold(
      0.0, (sum, r) => sum + (((r as Map)[field] as num?)?.toDouble() ?? 0));
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String? sub;
  final String value;
  final bool highlight;
  final bool grand;
  const _TotalRow({
    required this.label,
    this.sub,
    required this.value,
    this.highlight = false,
    this.grand = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = LtsT.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: grand ? AppColors.accent.withValues(alpha: 0.08) : p.surface2,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: grand ? AppColors.accent.withValues(alpha: 0.3) : p.border),
      ),
      child: Row(children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(
                      fontSize: grand ? 12.5 : 12,
                      fontWeight: grand ? FontWeight.w800 : FontWeight.w600,
                      color: p.text)),
              if (sub != null)
                Text(sub!, style: TextStyle(fontSize: 10.5, color: p.muted)),
            ],
          ),
        ),
        Text(value,
            style: TextStyle(
                fontSize: grand ? 14 : 13,
                fontWeight: FontWeight.w800,
                color: highlight ? AppColors.warning : AppColors.accent)),
      ]),
    );
  }
}

class _ProfitRateRow extends StatefulWidget {
  final bool duocSua;
  final double pct;
  final double macDinhPct;
  final double ln;
  final ValueChanged<double> onChanged;
  const _ProfitRateRow(
      {required this.duocSua,
      required this.pct,
      required this.macDinhPct,
      required this.ln,
      required this.onChanged});

  @override
  State<_ProfitRateRow> createState() => _ProfitRateRowState();
}

class _ProfitRateRowState extends State<_ProfitRateRow> {
  late final TextEditingController _ctrl;
  bool _dangGo = false;

  static String _hienThi(double pct) => pct > 0 ? pct.toString() : '0';

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: _hienThi(widget.pct));
  }

  @override
  void didUpdateWidget(covariant _ProfitRateRow old) {
    super.didUpdateWidget(old);
    // Mirror web useEffect: reset ô khi pct ngoài đổi, trừ lúc đang gõ.
    if (old.pct != widget.pct && !_dangGo) {
      _ctrl.text = _hienThi(widget.pct);
    }
  }

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
        if (widget.duocSua)
          SizedBox(
            width: 70,
            child: TextField(
              controller: _ctrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
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
          )
        else
          Text('${_hienThi(widget.pct)}%',
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        const Spacer(),
        Text('LN: ${Fmt.n(widget.ln)} đ',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}
