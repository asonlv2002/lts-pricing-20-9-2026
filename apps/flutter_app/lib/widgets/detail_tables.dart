// ═══════════════════════════════════════════════════════════════════════════
// DetailTables — Bảng chi tiết full-screen, hỗ trợ xoay ngang
// Mỗi tab BreakdownPanel có nút "📊 Xem bảng" mở popup landscape
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../engine/models.dart';
import '../theme/app_theme.dart';
import '../theme/format.dart';
import 'expandable_table.dart';

// ─── Nút "Xem bảng chi tiết" dùng chung ────────────────────────────────────
class DetailTableButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const DetailTableButton({super.key, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 18, bottom: 4),
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: const Icon(Icons.table_chart_outlined, size: 16),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: scheme.primary,
          side: BorderSide(color: scheme.primary.withValues(alpha: 0.5)),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ),
    );
  }
}

// ─── Full-screen landscape table dialog ─────────────────────────────────────
void showLandscapeTable(
  BuildContext context, {
  required String title,
  String? subtitle,
  IconData? icon,
  Color? iconColor,
  required List<TableColumn> columns,
  required List<List<TableCellData>> rows,
}) {
  // Ép xoay ngang ngay lập tức khi mở popup
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  Navigator.of(context).push(
    PageRouteBuilder(
      opaque: true,
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (_, __, ___) => _LandscapeTablePage(
        title: title,
        subtitle: subtitle,
        icon: icon,
        iconColor: iconColor,
        columns: columns,
        rows: rows,
      ),
      transitionsBuilder: (_, anim, __, child) =>
          FadeTransition(opacity: anim, child: child),
    ),
  ).then((_) {
    // Khôi phục về tất cả orientation khi đóng
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  });
}

class _LandscapeTablePage extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final List<TableColumn> columns;
  final List<List<TableCellData>> rows;

  const _LandscapeTablePage({
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    required this.columns,
    required this.rows,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Đóng',
        ),
        title: Row(children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: (iconColor ?? AppColors.seed).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 17, color: iconColor ?? AppColors.seed),
            ),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title,
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                if (subtitle != null)
                  Text(subtitle!,
                      style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ]),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
          child: Column(
            children: [
              Expanded(
                child: _TableContent(columns: columns, rows: rows),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Icon(Icons.info_outline,
                        size: 12, color: scheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      '${rows.length} dòng · ${columns.length} cột',
                      style: TextStyle(
                          fontSize: 11, color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TableContent extends StatelessWidget {
  final List<TableColumn> columns;
  final List<List<TableCellData>> rows;
  const _TableContent({required this.columns, required this.rows});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          border: Border.all(
              color: scheme.outlineVariant.withValues(alpha: 0.4)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Scrollbar(
          thumbVisibility: true,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              child: DataTable(
                headingRowHeight: 42,
                dataRowMinHeight: 36,
                dataRowMaxHeight: 44,
                columnSpacing: 20,
                horizontalMargin: 14,
                headingRowColor: WidgetStatePropertyAll(
                    scheme.primary.withValues(alpha: 0.09)),
                border: TableBorder(
                  horizontalInside: BorderSide(
                    color: scheme.outlineVariant.withValues(alpha: 0.25),
                    width: 0.5,
                  ),
                ),
                columns: [
                  for (final c in columns)
                    DataColumn(
                      label: ConstrainedBox(
                        constraints:
                            BoxConstraints(minWidth: c.minWidth ?? 0),
                        child: Text(
                          c.label,
                          textAlign: c.align,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 12.5),
                        ),
                      ),
                    ),
                ],
                rows: [
                  for (int ri = 0; ri < rows.length; ri++)
                    DataRow(
                      color: ri.isOdd
                          ? WidgetStatePropertyAll(
                              scheme.surfaceContainerHighest
                                  .withValues(alpha: 0.35))
                          : null,
                      cells: [
                        for (int ci = 0;
                            ci < rows[ri].length &&
                                ci < columns.length;
                            ci++)
                          DataCell(
                            ConstrainedBox(
                              constraints: BoxConstraints(
                                  minWidth: columns[ci].minWidth ?? 0),
                              child: Text(
                                rows[ri][ci].text,
                                textAlign: rows[ri][ci].align ??
                                    columns[ci].align,
                                style: rows[ri][ci].style ??
                                    const TextStyle(fontSize: 12.5),
                              ),
                            ),
                          ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Builders — tạo dữ liệu bảng từ CalculateResult cho từng tab
// ═══════════════════════════════════════════════════════════════════════════

/// Tab 0: Tổng quan — bảng cơ cấu giá + doanh thu
void showOverviewTable(BuildContext context, CalculateResult r) {
  final isMang = (r.raw['input'] as Map?)?['productType'] == 'mang';
  final ul = isMang ? 'm²' : 'cái';

  final rows = <List<TableCellData>>[
    _row('Giá vốn / $ul', Fmt.vnd(r.costPerUnit), normal: true),
    _row('Lợi nhuận / $ul', '+${Fmt.vnd(r.finalPrice - r.costPerUnit)}',
        color: AppColors.success),
    _row('Hoa hồng / $ul', Fmt.vnd(r.d('commissionPerUnit'))),
    if (r.d('cylAllocPerUnit') > 0)
      _row('Trục phân bổ / $ul', '+${Fmt.vnd(r.d('cylAllocPerUnit'))}',
          color: AppColors.warning),
    _row('GIÁ ĐỀ XUẤT / $ul', Fmt.vnd(r.finalPrice),
        bold: true, color: AppColors.success),
    _row('', '', divider: true),
    _row('Doanh thu', Fmt.vnd(r.revenue), bold: true),
    _row('Lợi nhuận tổng', Fmt.vnd(r.profitAmount),
        bold: true, color: AppColors.success),
    _row('Tỷ lệ LN', '${Fmt.pct(r.profitRate)}%',
        bold: true, color: AppColors.success),
    _row('', '', divider: true),
    _row('Lãi suất cơ sở', '${Fmt.pct(r.d('interestBase'))}%/năm'),
    _row('Lãi suất bổ sung', '${Fmt.pct(r.d('interestSpread'))}%/năm'),
    _row('Thời hạn thanh toán', '${r.d('paymentDays').round()} ngày'),
    _row('Lãi suất / $ul', Fmt.vnd(r.d('interestPerUnit'))),
    if (!isMang) ...[
      _row('', '', divider: true),
      _row('Số thùng', '${r.d('numBoxes').round()} thùng'),
      _row('Đóng gói / $ul', Fmt.vnd(r.d('packagingPerUnit'))),
      _row('Vận chuyển / $ul', Fmt.vnd(r.d('shippingPerUnit'))),
      _row('Tổng vận chuyển', Fmt.vnd(r.d('shippingTotal'))),
    ] else ...[
      _row('', '', divider: true),
      _row('Diện tích 1 cuộn', '${Fmt.d3(r.d('filmRollArea'))} m²'),
      _row('Giá 1 cuộn', Fmt.vnd(r.d('filmRollArea') * r.finalPrice)),
    ],
  ];

  showLandscapeTable(
    context,
    title: 'Bảng Tổng quan',
    subtitle: 'Cơ cấu giá · Doanh thu · Thanh toán',
    icon: Icons.account_balance_wallet_outlined,
    iconColor: AppColors.info,
    columns: const [
      TableColumn('Khoản mục', minWidth: 200),
      TableColumn('Giá trị', minWidth: 130, align: TextAlign.right),
    ],
    rows: rows,
  );
}

/// Tab 1: Chi phí — bảng từng khoản chi phí sản xuất
void showCostTable(BuildContext context, CalculateResult r) {
  final totalProd = r.d('totalProductionCost');
  final items = [
    ('🖨️ In ấn', r.d('printTotalCost')),
    ('🔗 Ghép màng (CPSX)', r.d('totalLamCost')),
    ('✂️ Cắt bao', r.d('cutTotalCost')),
    ('✨ Nhũ', r.d('nhuCost')),
    ('🌫️ Phủ mờ', r.d('moCost')),
    ('🔒 Zipper', r.d('zipperTotal')),
    ('📎 Băng keo', r.d('tapeTotal')),
    ('🛍️ Quai xách', r.d('handleTotal')),
    ('📦 Đóng gói', r.d('boxTotal')),
    ('🚚 Vận chuyển', r.d('shippingTotal')),
  ].where((x) => x.$2 > 0).toList();

  final rows = <List<TableCellData>>[
    for (final it in items)
      [
        TableCellData(it.$1),
        TableCellData(Fmt.vnd(it.$2), align: TextAlign.right),
        TableCellData(
          totalProd > 0
              ? '${(it.$2 / totalProd * 100).toStringAsFixed(1)}%'
              : '—',
          align: TextAlign.right,
          style:
              TextStyle(color: AppColors.muted, fontSize: 12),
        ),
      ],
    [
      TableCellData('TỔNG CPSX',
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
      TableCellData(Fmt.vnd(totalProd),
          align: TextAlign.right,
          style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13,
              color: AppColors.info)),
      TableCellData('100%',
          align: TextAlign.right,
          style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.info)),
    ],
    if (r.cylinderCost > 0) ...[
      [
        TableCellData('—— Trục in (riêng) ——',
            style: TextStyle(color: AppColors.muted, fontSize: 12)),
        TableCellData(''),
        TableCellData(''),
      ],
      [
        TableCellData('Tổng bộ trục'),
        TableCellData(Fmt.vnd(r.cylinderCost),
            align: TextAlign.right,
            style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.accent)),
        TableCellData('Tách riêng',
            align: TextAlign.right,
            style: TextStyle(color: AppColors.muted, fontSize: 11.5)),
      ],
      if (r.d('cylAllocPerUnit') > 0)
        [
          TableCellData('Phân bổ trục / đv (bao)'),
          TableCellData('+${Fmt.vnd(r.d('cylAllocPerUnit'))}',
              align: TextAlign.right,
              style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.warning)),
          TableCellData('Đã cộng vào giá',
              align: TextAlign.right,
              style: TextStyle(color: AppColors.muted, fontSize: 11.5)),
        ],
    ],
  ];

  showLandscapeTable(
    context,
    title: 'Bảng Chi phí',
    subtitle: 'Phân tích chi tiết từng khoản CPSX',
    icon: Icons.pie_chart_outline,
    iconColor: AppColors.info,
    columns: const [
      TableColumn('Khoản chi phí', minWidth: 180),
      TableColumn('Số tiền', minWidth: 130, align: TextAlign.right),
      TableColumn('Tỷ trọng', minWidth: 80, align: TextAlign.right),
    ],
    rows: rows,
  );
}

/// Tab 2: Sản xuất — bảng thông số kỹ thuật chi tiết
void showProductionTable(BuildContext context, CalculateResult r) {
  final isMang = (r.raw['input'] as Map?)?['productType'] == 'mang';
  final ul = isMang ? 'm²' : 'cái';
  final inp = r.raw['input'] as Map? ?? {};
  final spreadMm = ((inp['spreadWidth'] as num?) ?? 0) * 1000;
  final cutMm = ((inp['cutStep'] as num?) ?? 0) * 1000;
  final numColors = (inp['numColors'] as num?) ?? 0;
  final numImages = (inp['numImages'] as num?) ?? 1;

  final rows = <List<TableCellData>>[
    _row3('Khổ trải', '${spreadMm.toStringAsFixed(0)} mm', 'Kích thước'),
    _row3('Bước cắt', '${cutMm.toStringAsFixed(0)} mm', 'Kích thước'),
    _row3('Số con hình', '$numImages con', 'In ấn'),
    _row3('Số màu in', numColors == 0 ? 'Không in' : '$numColors màu', 'In ấn'),
    _row3('Tổng độ dày', '${r.d('totalThickness').toStringAsFixed(1)} mic', 'Vật liệu'),
    _row3('Định lượng (GSM)', '${r.d('totalGSM').toStringAsFixed(2)} g/m²', 'Vật liệu'),
    _row3('Diện tích 1 $ul', '${Fmt.d4(r.d('bagArea'))} m²', 'Kích thước'),
    _row3('Tổng diện tích', '${Fmt.d3(r.totalArea)} m²', 'Sản lượng', bold: true),
    _row3('Cân nặng tare', '${Fmt.d3(r.d('tareWeight'))} kg', 'Thông số'),
    _row3('', '', ''),
    _row3('Khổ giấy in', '${Fmt.d3(r.d('printNLWidth'))} m', 'In ấn'),
    _row3('Chiều dài in', '${Fmt.d3(r.d('printMeters'))} m', 'In ấn'),
    _row3('Phế hao in', '${Fmt.d3(r.d('printWaste'))} m', 'In ấn'),
    _row3('Chiều dài màng in', '${Fmt.d3(r.d('filmLength'))} m', 'In ấn'),
    _row3('CP mực ấn (CPSX)', Fmt.vnd(r.d('printCostCPSX')), 'Chi phí in'),
    _row3('CP vật liệu in', Fmt.vnd(r.d('printCostMaterial')), 'Chi phí in'),
    _row3('Tổng CP In', Fmt.vnd(r.d('printTotalCost')), 'Chi phí in', bold: true),
    _row3('', '', ''),
    _row3('Khổ cắt', '${Fmt.d3(r.d('cutWidth'))} m', 'Cắt'),
    _row3('Chiều dài cắt', '${Fmt.d3(r.d('cutMeters'))} m', 'Cắt'),
    _row3('Phế hao cắt', '${Fmt.d3(r.d('cutWaste'))} m', 'Cắt'),
    _row3('CP cắt/CPSX', Fmt.vnd(r.d('cutCostCPSX')), 'Chi phí cắt'),
    _row3('Tổng CP Cắt', Fmt.vnd(r.d('cutTotalCost')), 'Chi phí cắt', bold: true),
    _row3('', '', ''),
    _row3('Thời gian SX ước tính',
        '${r.d('productionDays').toStringAsFixed(1)} ngày', 'Tiến độ', bold: true),
  ];

  showLandscapeTable(
    context,
    title: 'Bảng Sản xuất',
    subtitle: 'Thông số kỹ thuật · Chi phí in · Cắt',
    icon: Icons.precision_manufacturing_outlined,
    iconColor: AppColors.warning,
    columns: const [
      TableColumn('Thông số', minWidth: 200),
      TableColumn('Giá trị', minWidth: 140, align: TextAlign.right),
      TableColumn('Nhóm', minWidth: 100),
    ],
    rows: rows,
  );
}

/// Tab 3: Trục in — bảng thông số trục chi tiết
void showCylinderTable(BuildContext context, CalculateResult r) {
  final inp = r.raw['input'] as Map? ?? {};
  final cylLength = r.d('cylLength');
  final cylCircum = r.d('cylCircum');
  final cylArea = r.d('cylArea');
  final cylCost = r.cylinderCost;
  final cylPerUnit = r.d('cylinderCostPerUnit');
  final cylAlloc = r.d('cylAllocPerUnit');
  final numColors = (inp['numColors'] as num?) ?? 0;
  final cylType = (inp['cylType'] as String?) ?? 'A';
  final cylIncluded = (inp['cylIncluded'] as bool?) ?? false;
  final unitPrice = r.d('cylUnitPrice');

  final oneTrucCost = numColors > 0 ? cylCost / numColors : cylCost;

  final rows = <List<TableCellData>>[
    _row3('Loại trục', 'Loại $cylType', 'Thông số'),
    _row3('Chiều dài trục', '${cylLength.toStringAsFixed(3)} m', 'Kích thước'),
    _row3('Chu vi trục', '${cylCircum.toStringAsFixed(3)} m', 'Kích thước'),
    _row3('Diện tích bề mặt', '${cylArea.toStringAsFixed(4)} m²', 'Kích thước'),
    _row3('Số màu in', '$numColors màu', 'In ấn'),
    _row3('Đơn giá 1 trục (m²)', Fmt.vnd(unitPrice), 'Đơn giá'),
    _row3('Chi phí 1 trục', Fmt.vnd(oneTrucCost), 'Chi phí', bold: true),
    _row3('Chi phí cả bộ trục ($numColors màu)', Fmt.vnd(cylCost),
        'Chi phí', bold: true),
    _row3('Chi phí / đv sản phẩm', Fmt.vnd(cylPerUnit), 'Phân bổ'),
    if (cylIncluded && cylAlloc > 0)
      _row3('Phân bổ vào giá / đv (bao trục)',
          '+${Fmt.vnd(cylAlloc)}', 'Phân bổ', bold: true),
    _row3('', '', ''),
    _row3(
        'Trạng thái bao trục',
        cylIncluded ? '✅ Đang BAO TRỤC' : '❌ Không bao — tách riêng',
        'Cài đặt'),
    if (cylIncluded)
      _row3('Định mức phân bổ', '200.000 m²', 'Cài đặt'),
  ];

  showLandscapeTable(
    context,
    title: 'Bảng Trục in',
    subtitle: 'Kích thước · Chi phí · Phân bổ',
    icon: Icons.album_outlined,
    iconColor: AppColors.accent,
    columns: const [
      TableColumn('Thông số', minWidth: 250),
      TableColumn('Giá trị', minWidth: 150, align: TextAlign.right),
      TableColumn('Nhóm', minWidth: 100),
    ],
    rows: rows,
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
List<TableCellData> _row(
  String label,
  String value, {
  bool bold = false,
  bool normal = false,
  bool divider = false,
  Color? color,
}) {
  if (divider) {
    return [
      TableCellData('─────────────────',
          style: TextStyle(color: Colors.grey.shade400, fontSize: 11)),
      TableCellData(''),
    ];
  }
  return [
    TableCellData(
      label,
      style: TextStyle(
        fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
        fontSize: bold ? 13 : 12.5,
      ),
    ),
    TableCellData(
      value,
      align: TextAlign.right,
      style: TextStyle(
        fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
        fontSize: bold ? 13 : 12.5,
        color: color,
      ),
    ),
  ];
}

List<TableCellData> _row3(
  String label,
  String value,
  String group, {
  bool bold = false,
}) =>
    [
      TableCellData(
        label,
        style: TextStyle(
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          fontSize: label.isEmpty ? 11 : 12.5,
        ),
      ),
      TableCellData(
        value,
        align: TextAlign.right,
        style: TextStyle(
          fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
          fontSize: 12.5,
        ),
      ),
      TableCellData(
        group,
        style: TextStyle(
          fontSize: 11,
          color: AppColors.muted,
          fontWeight: FontWeight.w500,
        ),
      ),
    ];
