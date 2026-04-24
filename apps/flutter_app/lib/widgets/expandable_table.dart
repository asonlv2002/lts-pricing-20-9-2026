// ═══════════════════════════════════════════════════════════════════════════
// ExpandableTableCard — Card chứa DataTable scroll ngang được, có nút "phóng to"
// Bấm phóng to → mở Dialog full-screen, user tự xoay máy ngang xem.
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';

class TableColumn {
  final String label;
  final double? minWidth;
  final TextAlign align;
  const TableColumn(this.label,
      {this.minWidth, this.align = TextAlign.left});
}

class TableCellData {
  final String text;
  final TextStyle? style;
  final TextAlign? align;
  const TableCellData(this.text, {this.style, this.align});
}

class ExpandableTableCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final List<TableColumn> columns;
  final List<List<TableCellData>> rows;
  final bool dense;

  const ExpandableTableCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    required this.columns,
    required this.rows,
    this.dense = false,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Header(
              title: title,
              subtitle: subtitle,
              icon: icon,
              iconColor: iconColor,
              onExpand: () => _openFullScreen(context),
            ),
            const SizedBox(height: 8),
            _DataTableScroll(
                columns: columns, rows: rows, dense: dense),
          ],
        ),
      ),
    );
  }

  void _openFullScreen(BuildContext context) {
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: true,
        barrierColor: Colors.black54,
        transitionDuration: const Duration(milliseconds: 220),
        pageBuilder: (_, __, ___) => _FullScreenTableDialog(
          title: title,
          subtitle: subtitle,
          icon: icon,
          iconColor: iconColor,
          columns: columns,
          rows: rows,
          dense: dense,
        ),
        transitionsBuilder: (_, anim, __, child) =>
            FadeTransition(opacity: anim, child: child),
      ),
    ).then((_) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    });
  }
}

class _Header extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final VoidCallback onExpand;
  const _Header({
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    required this.onExpand,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        if (icon != null) ...[
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: (iconColor ?? scheme.primary).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child:
                Icon(icon, size: 16, color: iconColor ?? scheme.primary),
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
                      .titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700)),
              if (subtitle != null)
                Text(subtitle!,
                    style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        IconButton(
          tooltip: 'Phóng to (xoay ngang máy để xem rộng)',
          icon: const Icon(Icons.fullscreen_rounded, size: 22),
          onPressed: onExpand,
          visualDensity: VisualDensity.compact,
          style: IconButton.styleFrom(
            backgroundColor:
                scheme.surfaceContainerHighest.withValues(alpha: 0.5),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      ],
    );
  }
}

class _DataTableScroll extends StatelessWidget {
  final List<TableColumn> columns;
  final List<List<TableCellData>> rows;
  final bool dense;

  const _DataTableScroll({
    required this.columns,
    required this.rows,
    required this.dense,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          border: Border.all(
            color: scheme.outlineVariant.withValues(alpha: 0.4),
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Scrollbar(
          thumbVisibility: true,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowHeight: dense ? 36 : 44,
              dataRowMinHeight: dense ? 32 : 40,
              dataRowMaxHeight: dense ? 38 : 48,
              columnSpacing: 18,
              horizontalMargin: 12,
              headingRowColor: WidgetStatePropertyAll(
                scheme.primary.withValues(alpha: 0.08),
              ),
              border: TableBorder(
                horizontalInside: BorderSide(
                  color: scheme.outlineVariant.withValues(alpha: 0.3),
                  width: 0.5,
                ),
              ),
              columns: [
                for (final c in columns)
                  DataColumn(
                    label: ConstrainedBox(
                      constraints: BoxConstraints(
                        minWidth: c.minWidth ?? 0,
                      ),
                      child: Text(
                        c.label,
                        textAlign: c.align,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: dense ? 11 : 12,
                          color: scheme.onSurface,
                        ),
                      ),
                    ),
                  ),
              ],
              rows: [
                for (final r in rows)
                  DataRow(
                    cells: [
                      for (int i = 0; i < r.length && i < columns.length; i++)
                        DataCell(
                          ConstrainedBox(
                            constraints: BoxConstraints(
                              minWidth: columns[i].minWidth ?? 0,
                            ),
                            child: Text(
                              r[i].text,
                              textAlign: r[i].align ?? columns[i].align,
                              style: r[i].style ??
                                  TextStyle(
                                    fontSize: dense ? 11.5 : 12.5,
                                    color: scheme.onSurface,
                                  ),
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
    );
  }
}

class _FullScreenTableDialog extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final List<TableColumn> columns;
  final List<List<TableCellData>> rows;
  final bool dense;

  const _FullScreenTableDialog({
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    required this.columns,
    required this.rows,
    required this.dense,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: scheme.surface,
        title: Row(
          children: [
            if (icon != null) ...[
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: (iconColor ?? AppColors.seed)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon,
                    size: 18, color: iconColor ?? AppColors.seed),
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
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Đóng',
            icon: const Icon(Icons.close_rounded),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
          child: _DataTableScroll(
              columns: columns, rows: rows, dense: dense),
        ),
      ),
    );
  }
}
