// ═══════════════════════════════════════════════════════════════════════════
// Lệnh Sản Xuất (LSX) — danh sách + tạo từ history + xuất PDF
// ═══════════════════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../engine/models.dart';
import '../store/app_state.dart';
import '../theme/format.dart';
import 'tao_lsx_wizard.dart';

class LSXScreen extends StatefulWidget {
  const LSXScreen({super.key});

  @override
  State<LSXScreen> createState() => _LSXScreenState();
}

class _LSXScreenState extends State<LSXScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final approved = s.history.where((h) =>
        (h.quoteStatus == 'approved' || h.quoteStatus == 'completed') ||
        (h.chotGia != null && h.chotGia! > 0)).toList();

    final q = _query.trim().toLowerCase();
    final filtered = q.isEmpty
        ? s.productionOrders
        : s.productionOrders.where((o) {
            final cus = (o.snapshot['customer'] ?? '').toString().toLowerCase();
            final name =
                (o.snapshot['productName'] ?? '').toString().toLowerCase();
            return o.id.toLowerCase().contains(q) ||
                cus.contains(q) ||
                name.contains(q) ||
                o.status.toLowerCase().contains(q);
          }).toList();

    return Scaffold(
      body: s.productionOrders.isEmpty
          ? _Empty(approved: approved)
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: TextField(
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: 'Tìm số LSX, khách hàng, sản phẩm…',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () => setState(() => _query = ''),
                            ),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    onChanged: (v) => setState(() => _query = v),
                  ),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? Center(
                          child: Text(
                              q.isEmpty
                                  ? 'Không có LSX nào'
                                  : 'Không tìm thấy LSX phù hợp',
                              style: TextStyle(
                                  fontSize: 13,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant)),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (ctx, i) =>
                              _LSXCard(order: filtered[i]),
                        ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'lsx-fab-tao',
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => TaoLsxWizard(
                onSuccess: (order) {
                  // LSX list sẽ tự reload qua AppState.taiProductionOrdersTuServer
                  // được gọi bên trong wizard. Không cần làm gì thêm ở đây.
                },
              ),
            ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Tạo LSX'),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  final List<HistoryItem> approved;
  const _Empty({required this.approved});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.assignment_outlined,
              size: 72,
              color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(height: 12),
          Text('Chưa có Lệnh sản xuất',
              style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 4),
          Text(
              approved.isEmpty
                  ? 'Bắt đầu bằng cách lưu báo giá ở tab Tính giá'
                  : 'Có ${approved.length} báo giá có thể tạo LSX — bấm nút bên dưới',
              style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

class _LSXCard extends StatelessWidget {
  final ProductionOrder order;
  const _LSXCard({required this.order});

  static const _statusCfg = {
    'created': ('Mới tạo', Color(0xFF6B7280)),
    'in_production': ('Đang SX', Color(0xFFD97706)),
    'completed': ('Hoàn thành', Color(0xFF059669)),
    'cancelled': ('Đã huỷ', Color(0xFFDC2626)),
  };

  @override
  Widget build(BuildContext context) {
    final cfg = _statusCfg[order.status] ?? ('—', const Color(0xFF6B7280));
    final snap = order.snapshot;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                  child: Text(order.id,
                      style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 15))),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: cfg.$2.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                    border:
                        Border.all(color: cfg.$2.withValues(alpha: 0.3))),
                child: Text(cfg.$1,
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: cfg.$2)),
              ),
            ]),
            const SizedBox(height: 6),
            Text('${snap['customer'] ?? ''} — ${snap['productName'] ?? ''}'),
            const SizedBox(height: 4),
            Text('Tạo: ${Fmt.dateTime(order.createdAt)}',
                style: TextStyle(
                    fontSize: 11,
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 10),
            Row(children: [
              OutlinedButton.icon(
                onPressed: () => _exportPdf(context, order),
                icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                label: const Text('Xuất PDF'),
              ),
              const SizedBox(width: 8),
              IconButton(
                tooltip: 'Đổi trạng thái',
                onPressed: () => _showStatusDialog(context, order),
                icon: const Icon(Icons.swap_horiz),
              ),
              const Spacer(),
              IconButton(
                tooltip: 'Xoá',
                onPressed: () =>
                    context.read<AppState>().deleteProductionOrder(order.id),
                icon: const Icon(Icons.delete_outline),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  void _showStatusDialog(BuildContext context, ProductionOrder o) {
    showDialog(
      context: context,
      builder: (_) => SimpleDialog(
        title: const Text('Đổi trạng thái'),
        children: _statusCfg.entries
            .map((e) => SimpleDialogOption(
                  onPressed: () {
                    context
                        .read<AppState>()
                        .updateProductionOrder(o.id, o.copyWith(status: e.key));
                    Navigator.pop(context);
                  },
                  child: Row(children: [
                    Icon(Icons.circle, size: 12, color: e.value.$2),
                    const SizedBox(width: 8),
                    Text(e.value.$1),
                  ]),
                ))
            .toList(),
      ),
    );
  }
}

// ── PDF export ───────────────────────────────────────────────────────────────
Future<void> _exportPdf(BuildContext context, ProductionOrder order) async {
  final doc = pw.Document();
  final s = order.snapshot;
  final m = order.manual;

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(28),
      build: (ctx) => [
        pw.Container(
          padding: const pw.EdgeInsets.all(8),
          decoration: pw.BoxDecoration(border: pw.Border.all(width: 1)),
          child: pw.Row(children: [
            pw.Expanded(
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('CÔNG TY CP LAI TRƯỜNG SƠN',
                      style: pw.TextStyle(
                          fontSize: 12, fontWeight: pw.FontWeight.bold)),
                  pw.Text('LTS Pricing — Phần mềm báo giá bao bì',
                      style: const pw.TextStyle(fontSize: 9)),
                ],
              ),
            ),
            pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.end, children: [
              pw.Text('Ký mã hiệu: QT.ISO-22-BM02',
                  style: const pw.TextStyle(fontSize: 9)),
              pw.Text('Lần ban hành: 02 — 01/03/2025',
                  style: const pw.TextStyle(fontSize: 9)),
            ]),
          ]),
        ),
        pw.SizedBox(height: 8),
        pw.Center(
          child: pw.Text('LỆNH SẢN XUẤT',
              style: pw.TextStyle(
                  fontSize: 16, fontWeight: pw.FontWeight.bold)),
        ),
        pw.Center(
          child: pw.Text('Số: ${m['lsxNumber'] ?? order.id}',
              style: const pw.TextStyle(fontSize: 11)),
        ),
        pw.SizedBox(height: 12),

        pw.Text('I. THÔNG TIN SẢN PHẨM',
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
        pw.SizedBox(height: 4),
        pw.TableHelper.fromTextArray(
          cellStyle: const pw.TextStyle(fontSize: 9),
          headerStyle: pw.TextStyle(
              fontSize: 9, fontWeight: pw.FontWeight.bold),
          headerDecoration:
              const pw.BoxDecoration(color: PdfColors.grey200),
          columnWidths: const {
            0: pw.FlexColumnWidth(1.2),
            1: pw.FlexColumnWidth(2),
          },
          data: [
            ['Khách hàng', s['customer']?.toString() ?? ''],
            ['Tên sản phẩm', s['productName']?.toString() ?? ''],
            ['Cấu trúc', s['structure']?.toString() ?? ''],
            ['Loại SP', s['productType']?.toString() ?? ''],
            ['Khổ trải (m)', s['spreadWidth']?.toString() ?? ''],
            ['Bước cắt (m)', s['cutStep']?.toString() ?? ''],
            ['Số màu', s['numColors']?.toString() ?? ''],
            ['Số lượng', Fmt.n(s['quantity'] as num? ?? 0)],
          ],
        ),
        pw.SizedBox(height: 14),

        pw.Text('II. THÔNG TIN LỆNH',
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
        pw.SizedBox(height: 4),
        pw.TableHelper.fromTextArray(
          cellStyle: const pw.TextStyle(fontSize: 9),
          headerDecoration:
              const pw.BoxDecoration(color: PdfColors.grey200),
          columnWidths: const {
            0: pw.FlexColumnWidth(1.2),
            1: pw.FlexColumnWidth(2),
          },
          data: [
            ['Ngày phát hành', m['issuedDate']?.toString() ?? ''],
            ['Người lập', m['preparedBy']?.toString() ?? ''],
            ['Người duyệt', m['approvedBy']?.toString() ?? ''],
            ['Ghi chú', m['notes']?.toString() ?? ''],
          ],
        ),

        pw.SizedBox(height: 30),
        pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceAround, children: [
          pw.Column(children: [
            pw.Text('Người lập',
                style: pw.TextStyle(
                    fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 50),
            pw.Text(m['preparedBy']?.toString() ?? '',
                style: const pw.TextStyle(fontSize: 9)),
          ]),
          pw.Column(children: [
            pw.Text('Người duyệt',
                style: pw.TextStyle(
                    fontSize: 10, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 50),
            pw.Text(m['approvedBy']?.toString() ?? '',
                style: const pw.TextStyle(fontSize: 9)),
          ]),
        ]),
      ],
    ),
  );

  await Printing.layoutPdf(onLayout: (format) async => doc.save(),
      name: 'LSX_${order.id}.pdf');
}
