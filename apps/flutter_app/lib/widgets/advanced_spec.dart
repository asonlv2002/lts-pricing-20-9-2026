// ═══════════════════════════════════════════════════════════════════════════
// AdvancedSpecSection — Đặc tả kỹ thuật nâng cao (P4).
// Mirror `BangDacTaNangCao` + `BangDacTaNangCaoGhiDe` (ManHinhQuanLy.tsx):
//   • Bảng 1: Vật liệu + mực/DM/keo (lapDongVatLieuNangCao)
//   • Bảng 2: Thời gian SX × (NC + điện) — lọc cột theo quyền CPSX NC
//   • Cụm 3 dòng tổng + tỷ lệ LN + chênh lệch
// Công thức do engine bundle tính; Dart chỉ render + gửi ghi đè.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';

import 'package:lts_pricing/lib/engine_advanced.dart';
import 'package:lts_pricing/lib/pricing_display.dart';

import '../store/app_state.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import '../theme/lts_tokens.dart';
import 'expandable_table.dart';

class AdvancedSpecSection extends StatelessWidget {
  final AppState state;
  final bool isSale;
  const AdvancedSpecSection(
      {super.key, required this.state, required this.isSale});

  @override
  Widget build(BuildContext context) {
    final s = state;
    final r = s.currentResult;
    if (r == null) return const SizedBox.shrink();

    final input = (r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw;
    final meta = getPricingDisplayMeta(input);
    final uniRows = s.uniRowsChuan();
    if (uniRows.isEmpty) return const SizedBox.shrink();

    final activeOv = isSale ? s.saleOverrides : s.adminOverrides;
    // Mirror web BangDacTaNangCaoGhiDe: chỉ truyền activeOv, không truyền nguồn.
    const sourceOv = <String, Map<String, dynamic>>{};
    final profitPct = isSale ? s.saleProfitRatePct : s.adminProfitRatePct;

    // Cột Bảng 2 hiện theo quyền CPSX nâng cao (mirror web cotBang2TheoQuyen).
    final cot = s.cotBang2TheoQuyen;
    final hienBang2 = cot.coLuong || cot.coDien;

    List<dynamic> dongVatLieu;
    List<dynamic> dongNCD;
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
      final vlGoc = ea.lapDongVatLieuNangCao(
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
      final ncdGoc = ea.lapDongNhanCongDien(
          result: r, hangSo: s.hangSoNangCao);
      dongNCD = ea.lapDongNhanCongDien(
          result: r, hangSo: s.hangSoNangCao,
          overrides: activeOv.isEmpty ? null : activeOv);
      tongGoc = ea.tinhTongNangCao(vlGoc, ncdGoc);
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
        // ═══ Bảng 1: Vật liệu + mực/DM/keo ═══
        ExpandableTableCard(
          title: 'Bảng 1 — Vật liệu & mực/DM/keo',
          subtitle: 'Công đoạn · Khổ · Mét · CP vật liệu · Mực-DM-Keo',
          icon: Icons.inventory_2_outlined,
          iconColor: AppColors.accent,
          dense: true,
          columns: const [
            TableColumn('Công đoạn', minWidth: 95),
            TableColumn('Vật liệu', minWidth: 95),
            TableColumn('Khổ (m)', minWidth: 60, align: TextAlign.right),
            TableColumn('Thành phẩm', minWidth: 70, align: TextAlign.right),
            TableColumn('Phi hao', minWidth: 60, align: TextAlign.right),
            TableColumn('ĐV NVL', minWidth: 70, align: TextAlign.right),
            TableColumn('Giá NVL', minWidth: 65, align: TextAlign.right),
            TableColumn('CP VL (đ/m²)', minWidth: 70, align: TextAlign.right),
            TableColumn('TT CPNVL', minWidth: 80, align: TextAlign.right),
            TableColumn('Mực/DM/keo', minWidth: 75, align: TextAlign.right),
            TableColumn('TT mực', minWidth: 80, align: TextAlign.right),
          ],
          rows: [
            for (final row in dongVatLieu)
              _rowVatLieu((row as Map).cast<String, dynamic>()),
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
              for (final row in dongNCD)
                _rowNCD((row as Map).cast<String, dynamic>(), cot),
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
          highlight:
              ((tong['tongNhanCongDien'] as num?) ?? 0) !=
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
          pct: profitPct,
          ln: ln,
          onChanged: (v) => isSale
              ? s.setSaleProfitRatePct(v)
              : s.setAdminProfitRatePct(v),
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
              'CHÊNH LỆCH SO VỚI GIÁ GỐC: ${chenhLech > 0 ? '+' : ''}${Fmt.n(chenhLech)} Đ/${donVi.toUpperCase()}',
              style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: chenhLech > 0
                      ? AppColors.success
                      : AppColors.danger),
            ),
          ),
      ],
    );
  }

  List<TableCellData> _rowVatLieu(Map<String, dynamic> row) {
    // Highlight ghi đè theo tab đang xem (Sale → saleOverrides, Admin → adminOverrides).
    final ov = (isSale ? state.saleOverrides : state.adminOverrides)[
            row['rowKey']] ??
        const {};
    final coGhiDe = ov['cpMucKeoPerM2'] != null;
    final s = const TextStyle(fontSize: 11);
    final cpMuc = (row['cpMucKeo'] as num?)?.toDouble();
    return [
      TableCellData((row['congDoan'] as String?) ?? '',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      TableCellData((row['vatLieu'] as String?) ?? '—', style: s),
      TableCellData(_d(row['khoMang']), align: TextAlign.right, style: s),
      TableCellData(_d(row['thanhPham']), align: TextAlign.right, style: s),
      TableCellData(_d(row['phiHao']), align: TextAlign.right, style: s),
      TableCellData(_d(row['dauVaoNVL']), align: TextAlign.right, style: s),
      TableCellData(_d(row['giaNVL']), align: TextAlign.right, style: s),
      TableCellData(_d(row['cpVatLieu']), align: TextAlign.right, style: s),
      TableCellData(_d(row['thanhTienNVL']), align: TextAlign.right, style: s),
      TableCellData(cpMuc == null ? '—' : Fmt.d1(cpMuc),
          align: TextAlign.right,
          style: TextStyle(
              fontSize: 11,
              fontWeight: coGhiDe ? FontWeight.w700 : FontWeight.w400,
              color: coGhiDe ? AppColors.warning : null)),
      TableCellData(_d(row['thanhTienMucKeo']),
          align: TextAlign.right, style: s),
    ];
  }

  List<TableCellData> _rowNCD(
      Map<String, dynamic> row, ({bool coDien, bool coLuong, bool coThoiGian}) cot) {
    final s = const TextStyle(fontSize: 11);
    return [
      TableCellData((row['congDoan'] as String?) ?? '',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      if (cot.coThoiGian)
        TableCellData(_d(row['thoiGianPhut']),
            align: TextAlign.right, style: s),
      if (cot.coLuong) ...[
        TableCellData(_d(row['cpNhanCongPerPhut']),
            align: TextAlign.right, style: s),
        TableCellData(_d(row['thanhTienNhanCong']),
            align: TextAlign.right, style: s),
      ],
      if (cot.coDien) ...[
        TableCellData(_d(row['cpDienPerPhut']),
            align: TextAlign.right, style: s),
        TableCellData(_d(row['thanhTienDien']),
            align: TextAlign.right, style: s),
      ],
    ];
  }

  static double _tongNCD(List<dynamic> rows, String field) => rows.fold(
      0.0,
      (sum, r) =>
          sum + (((r as Map)[field] as num?)?.toDouble() ?? 0));

  static String _d(dynamic v) {
    if (v == null) return '—';
    return Fmt.d1((v as num).toDouble());
  }
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
        color: grand
            ? AppColors.accent.withValues(alpha: 0.08)
            : p.surface2,
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
  final double pct;
  final double ln;
  final ValueChanged<double> onChanged;
  const _ProfitRateRow(
      {required this.pct, required this.ln, required this.onChanged});

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
