// ═══════════════════════════════════════════════════════════════════════════
// PricingPdf — xuất "Chi tiết giá bán" A4 (mirror web exportPricingDetailToA4).
// Dùng chung cho nút 👁 Xem (PdfPreview) + Chia sẻ PDF.
// ═══════════════════════════════════════════════════════════════════════════
import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import 'package:lts_pricing/lib/engine_advanced.dart';
import 'package:lts_pricing/lib/pricing_display.dart';

import '../store/app_state.dart';
import '../theme/format.dart';

class PricingPdf {
  PricingPdf._();

  static Future<Uint8List> build(AppState s) async {
    final r = s.currentResult;
    final doc = pw.Document();
    if (r == null) {
      doc.addPage(pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (_) => pw.Center(child: pw.Text('Chưa có kết quả tính giá')),
      ));
      return doc.save();
    }
    final input = (r.raw['input'] as Map?)?.cast<String, dynamic>() ?? r.raw;
    final meta = getPricingDisplayMeta(input);
    final qty = (input['quantity'] as num?)?.toDouble() ?? 0;
    // Giá đề xuất = giá hiệu lực (tab nâng cao lấy từ bảng đặc tả nâng cao).
    final giaDeXuat = s.giaDeXuatHienThi(s.ketQuaHienThi.finalPrice);
    final chotGia = s.currentChotGia;
    final hasChot = chotGia > 0;

    // Bảng đặc tả từ engine (uniRows + tổng).
    final lap = EngineAdvanced.instance.lapDongSanXuat(r, s.hangSoNangCao);
    final uniRows = (lap['uniRows'] as List?) ?? const [];
    final tongCPSX = (lap['totalCPSX'] as num?)?.toDouble() ?? 0;
    final tongCPVL = (lap['totalCPVL'] as num?)?.toDouble() ?? 0;
    final grand = (lap['grandTotal'] as num?)?.toDouble() ?? 0;

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
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
                    pw.Text(meta.exportTitle,
                        style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
              ),
              pw.Text('Ngày: ${_today()}',
                  style: const pw.TextStyle(fontSize: 9)),
            ]),
          ),
          pw.SizedBox(height: 10),
          pw.Text(meta.detailTitle,
              style: pw.TextStyle(
                  fontSize: 13, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),

          // Thông tin chung
          pw.TableHelper.fromTextArray(
            cellStyle: const pw.TextStyle(fontSize: 9),
            headerDecoration:
                const pw.BoxDecoration(color: PdfColors.grey200),
            columnWidths: const {
              0: pw.FlexColumnWidth(1.2),
              1: pw.FlexColumnWidth(2),
            },
            data: [
              ['Khách hàng', input['customer']?.toString() ?? '—'],
              ['Sản phẩm', input['productName']?.toString() ?? '—'],
              ['Cấu trúc', r.structureText],
              [meta.isFilm ? 'Diện tích' : 'Số lượng',
                  '${Fmt.n(qty)} ${meta.unit}'],
              ['Độ dày', '${r.d('totalThickness').toStringAsFixed(1)} mic'],
            ],
          ),
          pw.SizedBox(height: 12),

          // Bảng đặc tả
          pw.Text('ĐẶC TẢ KỸ THUẬT & NGUYÊN LIỆU',
              style: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold, fontSize: 10)),
          pw.SizedBox(height: 4),
          pw.TableHelper.fromTextArray(
            cellStyle: const pw.TextStyle(fontSize: 8),
            headerStyle:
                pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold),
            headerDecoration:
                const pw.BoxDecoration(color: PdfColors.grey200),
            data: [
              ['Công đoạn', 'Vật liệu', 'Khổ (m)', 'TP (m)', 'PH (m)',
                  'ĐV (m)', 'CPSX', 'TT CPSX', 'CP VL', 'TT CPVL'],
              ...uniRows.map((row) {
                final m = (row as Map).cast<String, dynamic>();
                final meters = (m['meters'] as num?)?.toDouble() ?? 0;
                final waste = (m['waste'] as num?)?.toDouble() ?? 0;
                final details = (m['materialDetails'] as List?) ?? const [];
                final matLabel = details.isNotEmpty
                    ? details
                        .map((d) => ((d as Map)['name'] as String?) ?? '')
                        .join(' + ')
                    : ((m['mat'] as String?) ?? '');
                return [
                  (m['stage'] as String?) ?? '',
                  matLabel,
                  Fmt.d1((m['width'] as num?)?.toDouble() ?? 0),
                  Fmt.n(meters),
                  Fmt.n(waste),
                  Fmt.n(meters + waste),
                  Fmt.n((m['cpsx'] as num?)?.toDouble() ?? 0),
                  Fmt.n((m['costCPSX'] as num?)?.toDouble() ?? 0),
                  m['matPrice'] == null ? '—' : Fmt.d1((m['matPrice'] as num).toDouble()),
                  m['costMat'] == null ? '—' : Fmt.n((m['costMat'] as num).toDouble()),
                ];
              }),
              ['TỔNG', '', '', '', '', '', '',
                  Fmt.n(tongCPSX), '', Fmt.n(tongCPVL)],
            ],
          ),
          pw.SizedBox(height: 10),
          pw.Align(
            alignment: pw.Alignment.centerRight,
            child: pw.Text(
              'TỔNG GIÁ THÀNH SẢN XUẤT CƠ BẢN: ${Fmt.n(grand)} đ',
              style: pw.TextStyle(
                  fontSize: 10, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.SizedBox(height: 12),

          // Chốt giá
          pw.Container(
            padding: const pw.EdgeInsets.all(8),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(width: 1),
              color: PdfColors.grey100,
            ),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                _line('Giá đề xuất / ${meta.unit}', '${Fmt.n(giaDeXuat)} đ'),
                if (hasChot)
                  _line('Giá chốt / ${meta.unit}', '${Fmt.n(chotGia)} đ',
                      bold: true),
                _line('Doanh thu (theo giá chốt)',
                    '${Fmt.n((hasChot ? chotGia : giaDeXuat) * qty)} đ'),
              ],
            ),
          ),
          pw.SizedBox(height: 24),
          pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
              children: [
                pw.Column(children: [
                  pw.Text('Người lập',
                      style: pw.TextStyle(
                          fontSize: 10, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 40),
                  pw.Text('', style: const pw.TextStyle(fontSize: 9)),
                ]),
                pw.Column(children: [
                  pw.Text('Giám đốc',
                      style: pw.TextStyle(
                          fontSize: 10, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 40),
                  pw.Text('', style: const pw.TextStyle(fontSize: 9)),
                ]),
              ]),
        ],
      ),
    );
    return doc.save();
  }

  static pw.Widget _line(String label, String value, {bool bold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: const pw.TextStyle(fontSize: 9)),
          pw.Text(value,
              style: pw.TextStyle(
                  fontSize: 9,
                  fontWeight:
                      bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
        ],
      ),
    );
  }

  static String _today() {
    final d = DateTime.now();
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  /// Xem trước A4 trong app.
  static Future<void> xemTruoc(AppState s) async {
    final bytes = await build(s);
    await Printing.layoutPdf(onLayout: (_) => bytes, name: 'BangTinhGia.pdf');
  }

  /// Chia sẻ PDF ra ngoài.
  static Future<void> chiaSe(AppState s) async {
    final bytes = await build(s);
    await Printing.sharePdf(bytes: bytes, filename: 'BangTinhGia.pdf');
  }
}
